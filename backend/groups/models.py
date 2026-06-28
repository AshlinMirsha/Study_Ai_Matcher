"""
groups app - Module 6: Study Groups

Tables:
    StudyGroup        - a group with a subject focus, created by a student
    GroupMembership    - which students belong to which group
    GroupDiscussion    - posts/messages within a group's discussion board
"""
from django.conf import settings
from django.db import models
from profiles.models import Subject


class StudyGroup(models.Model):
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name='study_groups')
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_groups')
    max_members = models.PositiveSmallIntegerField(default=10)
    is_private = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def member_count(self):
        return self.memberships.count()

    def has_space(self):
        return self.member_count < self.max_members


class GroupMembership(models.Model):
    ROLE_CHOICES = [('admin', 'Admin'), ('member', 'Member')]

    group = models.ForeignKey(StudyGroup, on_delete=models.CASCADE, related_name='memberships')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='group_memberships')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('group', 'student')

    def __str__(self):
        return f"{self.student.name} in {self.group.name}"


class GroupDiscussion(models.Model):
    group = models.ForeignKey(StudyGroup, on_delete=models.CASCADE, related_name='discussions')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='group_posts')
    content = models.TextField()
    attachment = models.FileField(upload_to='group_files/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.author.name} in {self.group.name}: {self.content[:30]}"
