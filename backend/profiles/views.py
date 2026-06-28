"""profiles app - Module 2 & 3 views: Student Profile + Availability management."""
from rest_framework import generics, viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Subject, StudentProfile, Availability
from .serializers import SubjectSerializer, StudentProfileSerializer, AvailabilitySerializer


class SubjectViewSet(viewsets.ModelViewSet):
    """
    /api/profiles/subjects/  - list/create subjects (master list).
    Any authenticated student can list; creation is open so new
    subjects can be added on the fly when building a profile.
    """
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']


class MyProfileView(generics.RetrieveUpdateAPIView):
    """
    GET/PUT/PATCH /api/profiles/me/
    Fetch or update the logged-in student's own profile.
    Profile auto-creates on first access.
    """
    serializer_class = StudentProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, _ = StudentProfile.objects.get_or_create(user=self.request.user)
        return profile


class StudentProfileListView(generics.ListAPIView):
    """
    GET /api/profiles/students/
    Browse other students' profiles (for manual partner search,
    separate from the AI matching engine).
    """
    serializer_class = StudentProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['skill_level', 'preferred_language']
    search_fields = ['user__name', 'user__department']

    def get_queryset(self):
        return StudentProfile.objects.exclude(user=self.request.user).select_related('user')


class AvailabilityViewSet(viewsets.ModelViewSet):
    """
    /api/profiles/availability/
    Module 3: create/list/update/delete the logged-in student's
    weekly availability slots (Morning/Afternoon/Evening/Weekend + hours).
    """
    serializer_class = AvailabilitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Availability.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
