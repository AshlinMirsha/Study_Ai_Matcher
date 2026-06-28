"""
profiles app - Module 2: Student Profile & Module 3: Availability

Tables:
    Subject              - master list of subjects (Subjects table in spec)
    StudentProfile        - subjects studying, skills, weak subjects,
                            preferred language, study goals, skill level
    Availability          - day/time slots a student is free to study
"""
from django.conf import settings
from django.db import models


class Subject(models.Model):
    """Subjects table: Subject ID, Subject Name."""
    name = models.CharField(max_length=120, unique=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class StudentProfile(models.Model):
    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('ta', 'Tamil'),
        ('hi', 'Hindi'),
        ('te', 'Telugu'),
        ('kn', 'Kannada'),
        ('ml', 'Malayalam'),
    ]
    SKILL_LEVEL_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile'
    )
    subjects = models.ManyToManyField(Subject, related_name='students', blank=True)
    weak_subjects = models.ManyToManyField(
        Subject, related_name='students_weak_in', blank=True
    )
    skills = models.CharField(
        max_length=500, blank=True,
        help_text='Comma-separated skills, e.g. "Python, Django, SQL"'
    )
    preferred_language = models.CharField(
        max_length=10, choices=LANGUAGE_CHOICES, default='en'
    )
    skill_level = models.CharField(
        max_length=20, choices=SKILL_LEVEL_CHOICES, default='beginner'
    )
    study_goals = models.TextField(
        blank=True, help_text='e.g. "Crack DSA interviews", "Finish Python course"'
    )
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Profile of {self.user.name}"

    def skills_list(self):
        return [s.strip() for s in self.skills.split(',') if s.strip()]


class Availability(models.Model):
    """
    Availability table: Student ID, Day, Time (+ time-block & hours
    per the spec's Morning/Afternoon/Evening/Weekend options).
    """
    DAY_CHOICES = [
        ('mon', 'Monday'), ('tue', 'Tuesday'), ('wed', 'Wednesday'),
        ('thu', 'Thursday'), ('fri', 'Friday'), ('sat', 'Saturday'), ('sun', 'Sunday'),
    ]
    BLOCK_CHOICES = [
        ('morning', 'Morning'),
        ('afternoon', 'Afternoon'),
        ('evening', 'Evening'),
        ('weekend', 'Weekend'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='availability_slots'
    )
    day = models.CharField(max_length=3, choices=DAY_CHOICES)
    time_block = models.CharField(max_length=10, choices=BLOCK_CHOICES)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    study_hours = models.DecimalField(
        max_digits=4, decimal_places=1, default=1.0,
        help_text='Number of study hours available in this slot'
    )

    class Meta:
        unique_together = ('user', 'day', 'time_block')
        ordering = ['day', 'time_block']

    def __str__(self):
        return f"{self.user.name} - {self.get_day_display()} {self.get_time_block_display()}"
