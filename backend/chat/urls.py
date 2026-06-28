from django.urls import path
from .views import ConversationListView, StartConversationView, MessageListView, SendMessageView

urlpatterns = [
    path('conversations/', ConversationListView.as_view(), name='conversation-list'),
    path('conversations/start/', StartConversationView.as_view(), name='conversation-start'),
    path('conversations/<int:pk>/messages/', MessageListView.as_view(), name='message-list'),
    path('conversations/<int:pk>/messages/send/', SendMessageView.as_view(), name='message-send'),
]
