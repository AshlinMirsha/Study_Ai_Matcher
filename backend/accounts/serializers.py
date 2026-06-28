"""
accounts app - serializers for registration, login, and JWT token claims.
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """Handles Module 1: User Registration."""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, label='Confirm password')

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'college', 'department',
                  'year_of_study', 'password', 'password2']

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password2': "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    """Read-only representation of the logged-in user."""

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'college', 'department',
                  'year_of_study', 'date_joined']
        read_only_fields = fields


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT serializer: login with email + password, and embed
    a few useful, non-sensitive claims in the access token.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['name'] = user.name
        token['email'] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data
