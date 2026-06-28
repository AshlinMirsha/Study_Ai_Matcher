"""
matching app - Module 4: AI Matching views.

Endpoints:
    GET  /api/matching/find/        - run the AI engine and return ranked candidate matches
    GET  /api/matching/my-matches/  - list saved/accepted matches for the logged-in student
    POST /api/matching/<id>/respond/ - accept or reject a suggested match
"""
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from profiles.models import StudentProfile, Availability
from .models import Match
from .serializers import MatchSerializer, MatchActionSerializer
from .engine import score_pair
from notifications.utils import notify

User = get_user_model()

MIN_SCORE_TO_SUGGEST = 30  # ignore very poor matches


def _build_profile_dict(user):
    profile, _ = StudentProfile.objects.get_or_create(user=user)
    availability = set(
        Availability.objects.filter(user=user).values_list('day', 'time_block')
    )
    return {
        'user': user,
        'subjects': set(profile.subjects.values_list('id', flat=True)),
        'department': user.department,
        'year_of_study': user.year_of_study,
        'skill_level': profile.skill_level,
        'preferred_language': profile.preferred_language,
        'study_goals': profile.study_goals,
        'availability': availability,
    }


class FindMatchesView(APIView):
    """
    GET /api/matching/find/
    Runs the AI matching engine for the logged-in student against every
    other student, persists/updates Match rows, and returns the ranked
    list of suggestions (highest compatibility first).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        me = request.user
        my_data = _build_profile_dict(me)

        others = User.objects.exclude(id=me.id)
        results = []

        for other in others:
            other_data = _build_profile_dict(other)
            result = score_pair(my_data, other_data)
            if result['score'] < MIN_SCORE_TO_SUGGEST:
                continue

            from profiles.models import Subject
            common_names = ', '.join(
                Subject.objects.filter(id__in=result['common_subjects']).values_list('name', flat=True)
            )

            student1, student2 = (me, other) if me.id < other.id else (other, me)
            match, created = Match.objects.update_or_create(
                student1=student1, student2=student2,
                defaults={
                    'match_score': result['score'],
                    'subject_score': result['breakdown']['subject'],
                    'schedule_score': result['breakdown']['schedule'],
                    'skill_level_score': result['breakdown']['skill_level'],
                    'goal_score': result['breakdown']['goal'],
                    'department_score': result['breakdown']['department'],
                    'year_score': result['breakdown']['year'],
                    'language_score': result['breakdown']['language'],
                    'common_subjects': common_names,
                }
            )
            if created and result['score'] >= 70:
                notify(
                    other, 'new_match', 'New study partner found!',
                    body=f"{me.name} is a {result['score']:.0f}% match with you.",
                    link=f'/matches'
                )
            results.append(match)

        results.sort(key=lambda m: m.match_score, reverse=True)
        serializer = MatchSerializer(results, many=True, context={'request': request})
        return Response(serializer.data)


class MyMatchesView(generics.ListAPIView):
    """
    GET /api/matching/my-matches/?status=accepted
    Lists matches the student is involved in, optionally filtered by status.
    """
    serializer_class = MatchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        me = self.request.user
        qs = Match.objects.filter(Q(student1=me) | Q(student2=me))
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class RespondToMatchView(APIView):
    """
    POST /api/matching/<id>/respond/  body: {"action": "accept" | "reject"}
    Records the logged-in student's response to a suggested match.
    Match becomes 'accepted' only once both sides accept.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        me = request.user
        match = get_object_or_404(Match, pk=pk)
        if me.id not in (match.student1_id, match.student2_id):
            return Response({'detail': 'Not your match.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = MatchActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data['action']

        if action == 'reject':
            match.status = 'rejected'
        else:
            if match.student1_id == me.id:
                match.student1_responded = True
            else:
                match.student2_responded = True
            if match.student1_responded and match.student2_responded:
                match.status = 'accepted'
            else:
                match.status = 'pending'
        match.save()

        return Response(MatchSerializer(match, context={'request': request}).data)
