"""groups app - serializers for Module 6: Study Groups."""
from rest_framework import serializers
from .models import StudyGroup, GroupMembership, GroupDiscussion


class GroupDiscussionSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.name', read_only=True)

    class Meta:
        model = GroupDiscussion
        fields = ['id', 'group', 'author', 'author_name', 'content', 'attachment', 'created_at']
        read_only_fields = ['id', 'author', 'author_name', 'created_at']

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)


class GroupMembershipSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)

    class Meta:
        model = GroupMembership
        fields = ['id', 'student', 'student_name', 'role', 'joined_at']


class StudyGroupSerializer(serializers.ModelSerializer):
    creator_name = serializers.CharField(source='creator.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True, default='')
    member_count = serializers.IntegerField(read_only=True)
    is_member = serializers.SerializerMethodField()

    class Meta:
        model = StudyGroup
        fields = [
            'id', 'name', 'description', 'subject', 'subject_name', 'creator', 'creator_name',
            'max_members', 'member_count', 'is_private', 'is_member', 'created_at',
        ]
        read_only_fields = ['id', 'creator', 'creator_name', 'member_count', 'created_at']

    def get_is_member(self, obj):
        request = self.context.get('request')
        if not request:
            return False
        return obj.memberships.filter(student=request.user).exists()

    def create(self, validated_data):
        request = self.context['request']
        validated_data['creator'] = request.user
        group = super().create(validated_data)
        GroupMembership.objects.create(group=group, student=request.user, role='admin')
        return group
