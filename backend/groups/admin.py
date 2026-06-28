from django.contrib import admin
from .models import StudyGroup, GroupMembership, GroupDiscussion

admin.site.register(StudyGroup)
admin.site.register(GroupMembership)
admin.site.register(GroupDiscussion)
