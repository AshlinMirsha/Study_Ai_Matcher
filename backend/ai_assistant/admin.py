from django.contrib import admin
from .models import StudySuggestion, ChatbotMessage, Quiz, QuizQuestion

admin.site.register(StudySuggestion)
admin.site.register(ChatbotMessage)
admin.site.register(Quiz)
admin.site.register(QuizQuestion)
