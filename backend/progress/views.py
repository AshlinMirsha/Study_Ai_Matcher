"""
progress app - Module 7: Progress Tracking & Module 10: Dashboard views.
"""
from datetime import timedelta
from django.db.models import Sum, Q
from django.utils import timezone
from rest_framework import generics, viewsets, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import StudyLog, CompletedTopic
from .serializers import StudyLogSerializer, CompletedTopicSerializer, DashboardSerializer
from matching.models import Match


class StudyLogViewSet(viewsets.ModelViewSet):
    """/api/progress/logs/ - CRUD for daily study session logs."""
    serializer_class = StudyLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return StudyLog.objects.filter(student=self.request.user)


class CompletedTopicViewSet(viewsets.ModelViewSet):
    """/api/progress/topics/ - CRUD for completed topics."""
    serializer_class = CompletedTopicSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CompletedTopic.objects.filter(student=self.request.user)


def _calculate_streaks(study_dates: set):
    """
    Given a set of `date` objects the student studied on, compute
    the current streak (consecutive days up to today/yesterday) and
    the longest streak ever achieved.
    """
    if not study_dates:
        return 0, 0

    sorted_dates = sorted(study_dates)
    longest = current_run = 1
    for i in range(1, len(sorted_dates)):
        if (sorted_dates[i] - sorted_dates[i - 1]).days == 1:
            current_run += 1
        else:
            current_run = 1
        longest = max(longest, current_run)

    today = timezone.localdate()
    current_streak = 0
    check_date = today if today in study_dates else today - timedelta(days=1)
    while check_date in study_dates:
        current_streak += 1
        check_date -= timedelta(days=1)

    return current_streak, longest


class DashboardView(APIView):
    """
    GET /api/progress/dashboard/
    Module 10: Dashboard - total study hours, topics completed,
    current streak, and match score summary.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        me = request.user
        logs = StudyLog.objects.filter(student=me)

        total_hours = float(logs.aggregate(total=Sum('hours'))['total'] or 0)
        topics_completed = CompletedTopic.objects.filter(student=me).count()

        study_dates = set(logs.values_list('date', flat=True))
        current_streak, longest_streak = _calculate_streaks(study_dates)

        # last 7 days of hours, for a simple weekly chart
        today = timezone.localdate()
        weekly_hours = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_hours = float(logs.filter(date=day).aggregate(total=Sum('hours'))['total'] or 0)
            weekly_hours.append({'date': day.isoformat(), 'hours': day_hours})

        my_matches = Match.objects.filter(Q(student1=me) | Q(student2=me))
        top_match_score = float(my_matches.order_by('-match_score').values_list('match_score', flat=True).first() or 0)
        active_matches = my_matches.filter(status='accepted').count()
        pending_matches = my_matches.filter(status__in=['suggested', 'pending']).count()

        data = {
            'total_study_hours': total_hours,
            'topics_completed': topics_completed,
            'current_streak': current_streak,
            'longest_streak': longest_streak,
            'weekly_hours': weekly_hours,
            'top_match_score': top_match_score,
            'active_matches': active_matches,
            'pending_matches': pending_matches,
        }
        return Response(DashboardSerializer(data).data)


class LeaderboardView(APIView):
    """
    GET /api/progress/leaderboard/
    Extra feature: ranks students by total study hours.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        rows = (
            StudyLog.objects.values('student_id', 'student__name', 'student__college')
            .annotate(total_hours=Sum('hours'))
            .order_by('-total_hours')[:50]
        )
        results = [
            {
                'rank': i + 1,
                'student_id': row['student_id'],
                'name': row['student__name'],
                'college': row['student__college'],
                'total_hours': float(row['total_hours'] or 0),
            }
            for i, row in enumerate(rows)
        ]
        return Response(results)
