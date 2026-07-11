from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudyLogViewSet, CompletedTopicViewSet, DashboardView, LeaderboardView, StudyScheduleViewSet

router = DefaultRouter()
router.register('logs', StudyLogViewSet, basename='study-log')
router.register('topics', CompletedTopicViewSet, basename='completed-topic')
router.register('schedules', StudyScheduleViewSet, basename='study-schedule')

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('leaderboard/', LeaderboardView.as_view(), name='leaderboard'),
    path('', include(router.urls)),
]
