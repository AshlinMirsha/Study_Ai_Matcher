from django.contrib import admin
from .models import Subject, StudentProfile, Availability

admin.site.register(Subject)
admin.site.register(Availability)


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'skill_level', 'preferred_language')
    search_fields = ('user__name', 'user__email')
    filter_horizontal = ('subjects', 'weak_subjects')
