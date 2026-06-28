"""
progress app - Module 7: Progress Tracking & Module 10: Dashboard data

Tables:
    StudyLog       - one entry per study session (date, hours, topic)
    CompletedTopic - topics a student has marked complete (per subject)
"""
from django.conf import settings
from django.db import models
from profiles.models import Subject


class StudyLog(models.Model):
    """A single logged study session - basis for daily/weekly hours and streaks."""
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='study_logs')
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True)
    date = models.DateField()
    hours = models.DecimalField(max_digits=4, decimal_places=1)
    notes = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.student.name} - {self.date} - {self.hours}h"


class CompletedTopic(models.Model):
    """A topic the student has marked as completed within a subject."""
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='completed_topics')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='completed_topics')
    topic_name = models.CharField(max_length=255)
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'subject', 'topic_name')
        ordering = ['-completed_at']

    def __str__(self):
        return f"{self.student.name} completed {self.topic_name} ({self.subject})"
