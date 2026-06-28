"""
chat app - Module 5: REST endpoints for Chat / Notes / File Sharing.

Real-time delivery happens over WebSockets (see consumers.py + routing.py).
These REST endpoints handle conversation listing, history, and
fallback message/file sending (also usable by non-WS clients, and
required for file uploads since WS isn't great for binary uploads).
"""
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer

User = get_user_model()


class ConversationListView(generics.ListAPIView):
    """GET /api/chat/conversations/ - all conversations for the logged-in student."""
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        me = self.request.user
        return Conversation.objects.filter(
            Q(student1=me) | Q(student2=me)
        ).order_by('-created_at')


class StartConversationView(APIView):
    """
    POST /api/chat/conversations/start/  body: {"partner_id": <id>}
    Gets or creates a conversation with the given partner (typically
    called after a match is accepted) and returns it.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        partner_id = request.data.get('partner_id')
        partner = get_object_or_404(User, pk=partner_id)
        if partner.id == request.user.id:
            return Response({'detail': 'Cannot start a conversation with yourself.'}, status=400)
        convo = Conversation.get_or_create_between(request.user, partner)
        return Response(ConversationSerializer(convo, context={'request': request}).data)


class MessageListView(generics.ListAPIView):
    """GET /api/chat/conversations/<id>/messages/ - message history (marks partner messages read)."""
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        convo = get_object_or_404(Conversation, pk=self.kwargs['pk'])
        me = self.request.user
        if me.id not in (convo.student1_id, convo.student2_id):
            return Message.objects.none()
        convo.messages.filter(is_read=False).exclude(sender=me).update(is_read=True)
        return convo.messages.all()


class SendMessageView(generics.CreateAPIView):
    """
    POST /api/chat/conversations/<id>/messages/send/
    REST fallback for sending a message and/or file (multipart upload).
    The WebSocket consumer is the primary path for live text chat;
    this exists so file/note uploads and non-WS clients still work.
    """
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        convo = get_object_or_404(Conversation, pk=self.kwargs['pk'])
        if self.request.user.id not in (convo.student1_id, convo.student2_id):
            raise PermissionDenied('Not a participant in this conversation.')
        serializer.save(conversation=convo)
