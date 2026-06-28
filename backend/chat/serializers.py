"""chat app - serializers for Module 5: Chat, Notes & File Sharing."""
from rest_framework import serializers
from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.name', read_only=True)
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender', 'sender_name', 'is_mine',
            'message_type', 'content', 'attachment', 'attachment_name',
            'is_read', 'created_at',
        ]
        read_only_fields = ['id', 'sender', 'sender_name', 'is_mine', 'is_read', 'created_at']
        extra_kwargs = {'conversation': {'required': False}}

    def get_is_mine(self, obj):
        request = self.context.get('request')
        return bool(request and obj.sender_id == request.user.id)

    def create(self, validated_data):
        validated_data['sender'] = self.context['request'].user
        if validated_data.get('attachment') and not validated_data.get('attachment_name'):
            validated_data['attachment_name'] = validated_data['attachment'].name
            validated_data['message_type'] = 'file'
        return super().create(validated_data)


class ConversationSerializer(serializers.ModelSerializer):
    partner_id = serializers.SerializerMethodField()
    partner_name = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'partner_id', 'partner_name', 'last_message', 'unread_count', 'created_at']

    def get_partner(self, obj):
        return obj.other(self.context['request'].user)

    def get_partner_id(self, obj):
        return self.get_partner(obj).id

    def get_partner_name(self, obj):
        return self.get_partner(obj).name

    def get_last_message(self, obj):
        last = obj.messages.order_by('-created_at').first()
        return MessageSerializer(last, context=self.context).data if last else None

    def get_unread_count(self, obj):
        request = self.context['request']
        return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
