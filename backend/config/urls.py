"""
URL configuration for the Study AI Matcher project.

All module APIs are namespaced under /api/<module>/ :
    /api/auth/           - accounts: registration, login, JWT, profile
    /api/profiles/        - student profile, subjects, availability
    /api/matching/        - AI matching engine
    /api/chat/            - one-to-one chat (REST; WS at /ws/chat/<id>/)
    /api/groups/          - study groups
    /api/progress/        - study logs, dashboard, leaderboard
    /api/ai/              - AI suggestions, chatbot, quizzes
    /api/notifications/   - notifications
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse

urlpatterns = [
    path('', lambda request: HttpResponse("Welcome to Study AI Matcher!")),
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/profiles/', include('profiles.urls')),
    path('api/matching/', include('matching.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/groups/', include('groups.urls')),
    path('api/progress/', include('progress.urls')),
    path('api/ai/', include('ai_assistant.urls')),
    path('api/notifications/', include('notifications.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
