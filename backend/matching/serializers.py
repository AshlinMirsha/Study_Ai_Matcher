"""matching app - serializers for Module 4: AI Matching."""
from rest_framework import serializers
from .models import Match


class MatchPartnerSerializer(serializers.Serializer):
    """Lightweight nested representation of the matched partner."""
    id = serializers.IntegerField()
    name = serializers.CharField()
    email = serializers.EmailField()
    department = serializers.CharField()
    year_of_study = serializers.IntegerField()
    skill_level = serializers.CharField(default='')
    preferred_language = serializers.CharField(default='')


class MatchSerializer(serializers.ModelSerializer):
    partner = serializers.SerializerMethodField()
    breakdown = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = [
            'id', 'partner', 'match_score', 'breakdown', 'common_subjects',
            'status', 'student1_responded', 'student2_responded', 'created_at',
        ]

    def get_partner(self, obj):
        request = self.context['request']
        other = obj.other(request.user)
        profile = getattr(other, 'profile', None)
        return MatchPartnerSerializer({
            'id': other.id,
            'name': other.name,
            'email': other.email,
            'department': other.department,
            'year_of_study': other.year_of_study,
            'skill_level': profile.skill_level if profile else '',
            'preferred_language': profile.preferred_language if profile else '',
        }).data

    def get_breakdown(self, obj):
        return {
            'subject': obj.subject_score,
            'schedule': obj.schedule_score,
            'skill_level': obj.skill_level_score,
            'goal': obj.goal_score,
            'department': obj.department_score,
            'year': obj.year_score,
            'language': obj.language_score,
        }


class MatchActionSerializer(serializers.Serializer):
    """For accept/reject actions on a suggested match."""
    action = serializers.ChoiceField(choices=['accept', 'reject'])
