"""
chat app - WebSocket consumer for real-time one-to-one chat.

URL pattern (see routing.py):  ws/chat/<conversation_id>/?token=<JWT access token>

Client flow:
    1. Connect to ws://<host>/ws/chat/<conversation_id>/?token=<jwt>
    2. Send JSON: {"type": "message", "content": "hello!"}
    3. Receive JSON: {"type": "message", "id": .., "sender_id": .., "sender_name": ..,
                       "content": .., "created_at": ..}
    4. Typing indicator: send {"type": "typing"} to notify the partner.
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'

        self.user = await self._authenticate()
        if self.user is None:
            await self.close(code=4001)  # custom code: auth failed
            return

        allowed = await self._user_in_conversation()
        if not allowed:
            await self.close(code=4003)  # custom code: forbidden
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        msg_type = data.get('type', 'message')

        if msg_type == 'typing':
            await self.channel_layer.group_send(
                self.room_group_name,
                {'type': 'typing_event', 'sender_id': self.user.id, 'sender_name': self.user.name}
            )
            return

        if msg_type in ('webrtc_offer', 'webrtc_answer', 'webrtc_ice_candidate'):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'webrtc_signal',
                    'sender_id': self.user.id,
                    'signal_type': msg_type,
                    'sdp': data.get('sdp'),
                    'candidate': data.get('candidate'),
                }
            )
            return

        if msg_type == 'message':
            content = (data.get('content') or '').strip()
            if not content:
                return
            message = await self._save_message(content)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'id': message.id,
                    'sender_id': self.user.id,
                    'sender_name': self.user.name,
                    'content': message.content,
                    'created_at': message.created_at.isoformat(),
                }
            )

    # --- group event handlers -> sent down to this socket -------------
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'id': event['id'],
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
            'content': event['content'],
            'created_at': event['created_at'],
            'is_mine': event['sender_id'] == self.user.id,
        }))

    async def typing_event(self, event):
        if event['sender_id'] == self.user.id:
            return  # don't echo back to the typist
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
        }))

    async def webrtc_signal(self, event):
        if event['sender_id'] == self.user.id:
            return
        await self.send(text_data=json.dumps({
            'type': event['signal_type'],
            'sender_id': event['sender_id'],
            'sdp': event.get('sdp'),
            'candidate': event.get('candidate'),
        }))

    # --- helpers --------------------------------------------------------
    @database_sync_to_async
    def _authenticate(self):
        """Auth via JWT passed as ?token=... query param (WS can't send headers easily)."""
        query_string = self.scope.get('query_string', b'').decode()
        params = dict(p.split('=') for p in query_string.split('&') if '=' in p)
        token = params.get('token')
        if not token:
            return None
        try:
            access = AccessToken(token)
            user = User.objects.get(id=access['user_id'])
            return user
        except (TokenError, User.DoesNotExist, KeyError):
            return None

    @database_sync_to_async
    def _user_in_conversation(self):
        from .models import Conversation
        try:
            convo = Conversation.objects.get(id=self.conversation_id)
        except Conversation.DoesNotExist:
            return False
        return self.user.id in (convo.student1_id, convo.student2_id)

    @database_sync_to_async
    def _save_message(self, content):
        from .models import Conversation, Message
        from notifications.utils import notify
        convo = Conversation.objects.get(id=self.conversation_id)
        message = Message.objects.create(
            conversation=convo, sender=self.user, content=content, message_type='text'
        )
        partner = convo.other(self.user)
        notify(
            partner, 'message', f'New message from {self.user.name}',
            body=content[:100], link=f'/chat/{convo.id}'
        )
        return message
