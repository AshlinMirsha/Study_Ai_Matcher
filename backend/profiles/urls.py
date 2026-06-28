from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubjectViewSet, MyProfileView, StudentProfileListView, AvailabilityViewSet

router = DefaultRouter()
router.register('subjects', SubjectViewSet, basename='subject')
router.register('availability', AvailabilityViewSet, basename='availability')

urlpatterns = [
    path('me/', MyProfileView.as_view(), name='my-profile'),
    path('students/', StudentProfileListView.as_view(), name='student-list'),
    path('', include(router.urls)),
]
