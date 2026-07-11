"""progress app - serializers for Module 7: Progress Tracking."""
from rest_framework import serializers
from .models import StudyLog, CompletedTopic, StudySchedule


class StudyLogSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True, default='')

    class Meta:
        model = StudyLog
        fields = ['id', 'subject', 'subject_name', 'date', 'hours', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        validated_data['student'] = self.context['request'].user
        return super().create(validated_data)


class CompletedTopicSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)

    class Meta:
        model = CompletedTopic
        fields = ['id', 'subject', 'subject_name', 'topic_name', 'completed_at']
        read_only_fields = ['id', 'completed_at']

    def create(self, validated_data):
        validated_data['student'] = self.context['request'].user
        return super().create(validated_data)


class DashboardSerializer(serializers.Serializer):
    """Module 10: Dashboard summary data."""
    total_study_hours = serializers.FloatField()
    topics_completed = serializers.IntegerField()
    current_streak = serializers.IntegerField()
    longest_streak = serializers.IntegerField()
    weekly_hours = serializers.ListField(child=serializers.DictField())
    top_match_score = serializers.FloatField()
    active_matches = serializers.IntegerField()
    pending_matches = serializers.IntegerField()

class StudyScheduleSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True, default='')

    class Meta:
        model = StudySchedule
        fields = ['id', 'subject', 'subject_name', 'day_of_week', 'start_time', 'end_time', 'expected_grade', 'notes']
        read_only_fields = ['id']

    def create(self, validated_data):
        validated_data['student'] = self.context['request'].user
        return super().create(validated_data)
