from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


class UserAdmin(BaseUserAdmin):
    model = User
    list_display = ('email', 'name', 'college', 'department', 'year_of_study', 'is_staff')
    list_filter = ('college', 'department', 'year_of_study', 'is_staff')
    search_fields = ('email', 'name', 'college')
    ordering = ('-created_at',)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('name', 'college', 'department', 'year_of_study')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'name', 'college', 'department', 'year_of_study', 'password1', 'password2'),
        }),
    )


admin.site.register(User, UserAdmin)
