"""
groups app - Module 6: Study Groups views.

Endpoints:
    /api/groups/                       - list/create groups
    /api/groups/<id>/                  - retrieve/update/delete a group
    /api/groups/<id>/join/             - join a group
    /api/groups/<id>/leave/            - leave a group
    /api/groups/<id>/members/          - list members
    /api/groups/<id>/discussions/      - list/create discussion posts
    /api/groups/my-groups/             - groups the student belongs to
"""
from rest_framework import generics, viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import StudyGroup, GroupMembership, GroupDiscussion
from .serializers import StudyGroupSerializer, GroupMembershipSerializer, GroupDiscussionSerializer


class StudyGroupViewSet(viewsets.ModelViewSet):
    queryset = StudyGroup.objects.all().select_related('creator', 'subject')
    serializer_class = StudyGroupSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['subject', 'is_private']
    search_fields = ['name', 'description']

    @action(detail=False, methods=['get'], url_path='my-groups')
    def my_groups(self, request):
        groups = StudyGroup.objects.filter(memberships__student=request.user)
        serializer = self.get_serializer(groups, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        group = self.get_object()
        if not group.has_space():
            return Response({'detail': 'This group is full.'}, status=status.HTTP_400_BAD_REQUEST)
        membership, created = GroupMembership.objects.get_or_create(group=group, student=request.user)
        if not created:
            return Response({'detail': 'Already a member.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(GroupMembershipSerializer(membership).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        group = self.get_object()
        deleted, _ = GroupMembership.objects.filter(group=group, student=request.user).delete()
        if not deleted:
            return Response({'detail': 'You are not a member.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'detail': 'Left the group.'})

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        group = self.get_object()
        serializer = GroupMembershipSerializer(group.memberships.select_related('student'), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'])
    def discussions(self, request, pk=None):
        group = self.get_object()
        if request.method == 'POST':
            if not group.memberships.filter(student=request.user).exists():
                return Response({'detail': 'Join the group to post.'}, status=status.HTTP_403_FORBIDDEN)
            serializer = GroupDiscussionSerializer(data={**request.data, 'group': group.id}, context={'request': request})
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        posts = group.discussions.select_related('author')
        serializer = GroupDiscussionSerializer(posts, many=True, context={'request': request})
        return Response(serializer.data)
