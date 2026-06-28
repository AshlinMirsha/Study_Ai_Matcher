from django.contrib import admin
from .models import Match


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ('student1', 'student2', 'match_score', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('student1__name', 'student2__name')
