"""
chat app - Module 5: One-to-one Chat, Notes & File Sharing.

Tables:
    Conversation - a chat thread between exactly two students
    Message      - individual chat messages (text and/or attached file)
"""
from django.conf import settings
from django.db import models


class Conversation(models.Model):
    student1 = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='conversations_as_student1'
    )
    student2 = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='conversations_as_student2'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student1', 'student2')

    def __str__(self):
        return f"Conversation({self.student1.name} <-> {self.student2.name})"

    def other(self, user):
        return self.student2 if self.student1_id == user.id else self.student1

    @classmethod
    def get_or_create_between(cls, user_a, user_b):
        s1, s2 = (user_a, user_b) if user_a.id < user_b.id else (user_b, user_a)
        convo, _ = cls.objects.get_or_create(student1=s1, student2=s2)
        return convo


class Message(models.Model):
    MESSAGE_TYPE_CHOICES = [
        ('text', 'Text'),
        ('file', 'File'),
        ('note', 'Note'),
    ]

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPE_CHOICES, default='text')
    content = models.TextField(blank=True)
    attachment = models.FileField(upload_to='chat_files/', blank=True, null=True)
    attachment_name = models.CharField(max_length=255, blank=True)

    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.name}: {self.content[:30]}"
