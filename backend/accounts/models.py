"""
accounts app - Module 1: User Registration & Authentication

Custom User model extends Django's AbstractUser with the fields
required by the project spec: College, Department, Year of study.
Email is used as the login identifier (instead of username).
"""
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    """Custom manager so we can create users/superusers with email login."""

    def create_user(self, email, name, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, name=name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('year_of_study', 0)
        extra_fields.setdefault('college', 'N/A')
        extra_fields.setdefault('department', 'N/A')
        return self.create_user(email, name, password, **extra_fields)


class User(AbstractUser):
    """
    Custom user model.

    Fields per spec:
      Name, Email, College, Department, Year of study
    """
    YEAR_CHOICES = [
        (1, '1st Year'),
        (2, '2nd Year'),
        (3, '3rd Year'),
        (4, '4th Year'),
        (5, 'Postgraduate'),
    ]

    username = None  # we log in with email instead
    email = models.EmailField(_('email address'), unique=True)
    name = models.CharField(max_length=150)
    college = models.CharField(max_length=255)
    department = models.CharField(max_length=150)
    year_of_study = models.PositiveSmallIntegerField(choices=YEAR_CHOICES, default=1)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name', 'college', 'department']

    objects = UserManager()

    class Meta:
        db_table = 'students'  # matches the spec's "Student" table
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} <{self.email}>"
