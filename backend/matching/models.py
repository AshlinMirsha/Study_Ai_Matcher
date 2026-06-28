"""
matching app - Module 4: AI Matching

Tables:
    Match - Match ID, Student 1, Student 2, Match Score (+ breakdown
            fields so the frontend can show *why* two students matched).
"""
from django.conf import settings
from django.db import models


class Match(models.Model):
    STATUS_CHOICES = [
        ('suggested', 'Suggested'),   # AI suggested, not yet acted on
        ('accepted', 'Accepted'),     # both students agreed to study together
        ('rejected', 'Rejected'),
        ('pending', 'Pending'),       # one side accepted, waiting on the other
    ]

    student1 = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='matches_as_student1'
    )
    student2 = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='matches_as_student2'
    )
    match_score = models.FloatField(help_text='Overall compatibility score, 0-100')

    # Score breakdown - useful for showing "why" they matched, and for
    # debugging / tuning the matching algorithm later.
    subject_score = models.FloatField(default=0)
    department_score = models.FloatField(default=0)
    year_score = models.FloatField(default=0)
    schedule_score = models.FloatField(default=0)
    skill_level_score = models.FloatField(default=0)
    goal_score = models.FloatField(default=0)
    language_score = models.FloatField(default=0)

    common_subjects = models.CharField(max_length=500, blank=True)

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='suggested')
    student1_responded = models.BooleanField(default=False)
    student2_responded = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student1', 'student2')
        ordering = ['-match_score', '-created_at']

    def __str__(self):
        return f"{self.student1.name} <-> {self.student2.name} ({self.match_score:.0f}%)"

    def other(self, user):
        """Return the partner relative to `user`."""
        return self.student2 if self.student1_id == user.id else self.student1
