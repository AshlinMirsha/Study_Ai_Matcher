"""profiles app - serializers for Module 2 (Student Profile) & Module 3 (Availability)."""
from rest_framework import serializers
from .models import Subject, StudentProfile, Availability


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'name']


class AvailabilitySerializer(serializers.ModelSerializer):
    day_display = serializers.CharField(source='get_day_display', read_only=True)
    time_block_display = serializers.CharField(source='get_time_block_display', read_only=True)

    class Meta:
        model = Availability
        fields = [
            'id', 'day', 'day_display', 'time_block', 'time_block_display',
            'start_time', 'end_time', 'study_hours',
        ]

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class StudentProfileSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='user.name', read_only=True)
    student_email = serializers.CharField(source='user.email', read_only=True)
    department = serializers.CharField(source='user.department', read_only=True)
    year_of_study = serializers.IntegerField(source='user.year_of_study', read_only=True)

    subjects = SubjectSerializer(many=True, read_only=True)
    weak_subjects = SubjectSerializer(many=True, read_only=True)
    subject_ids = serializers.PrimaryKeyRelatedField(
        queryset=Subject.objects.all(), many=True, write_only=True,
        source='subjects', required=False
    )
    weak_subject_ids = serializers.PrimaryKeyRelatedField(
        queryset=Subject.objects.all(), many=True, write_only=True,
        source='weak_subjects', required=False
    )
    availability_slots = AvailabilitySerializer(
        many=True, read_only=True, source='user.availability_slots'
    )
    skills_list = serializers.SerializerMethodField()

    def get_skills_list(self, obj):
        return obj.skills_list()

    class Meta:
        model = StudentProfile
        fields = [
            'id', 'student_name', 'student_email', 'department', 'year_of_study',
            'subjects', 'subject_ids', 'weak_subjects', 'weak_subject_ids',
            'skills', 'skills_list', 'preferred_language', 'skill_level',
            'study_goals', 'bio', 'avatar', 'availability_slots',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
