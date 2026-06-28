"""
notifications app - Module 9: Notifications

Covers: upcoming study session reminders, "time to study" reminders,
and "new study partner found" alerts.
"""
from django.conf import settings
from django.db import models


class Notification(models.Model):
    TYPE_CHOICES = [
        ('session_reminder', 'Upcoming Study Session'),
        ('study_reminder', 'Reminder to Study'),
        ('new_match', 'New Study Partner Found'),
        ('group_activity', 'Group Activity'),
        ('message', 'New Message'),
        ('system', 'System'),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications'
    )
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=150)
    body = models.CharField(max_length=300, blank=True)
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=255, blank=True, help_text='Frontend route to navigate to, e.g. /matches/12')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notification_type}] {self.title} -> {self.recipient.name}"
