from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StudySuggestionViewSet, GenerateSuggestionsView,
    ChatbotHistoryView, ChatbotAskView,
    QuizListView, QuizDetailView, GenerateQuizView, SubmitQuizView, GenerateFileQuizView,
)

router = DefaultRouter()
router.register('suggestions', StudySuggestionViewSet, basename='suggestion')

urlpatterns = [
    path('suggestions/generate/', GenerateSuggestionsView.as_view(), name='generate-suggestions'),
    path('chatbot/history/', ChatbotHistoryView.as_view(), name='chatbot-history'),
    path('chatbot/ask/', ChatbotAskView.as_view(), name='chatbot-ask'),
    path('quizzes/', QuizListView.as_view(), name='quiz-list'),
    path('quizzes/generate/', GenerateQuizView.as_view(), name='quiz-generate'),
    path('quizzes/generate-from-file/', GenerateFileQuizView.as_view(), name='quiz-generate-from-file'),
    path('quizzes/<int:pk>/', QuizDetailView.as_view(), name='quiz-detail'),
    path('quizzes/<int:pk>/submit/', SubmitQuizView.as_view(), name='quiz-submit'),
    path('', include(router.urls)),
]
