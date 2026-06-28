from django.urls import path
from .views import FindMatchesView, MyMatchesView, RespondToMatchView

urlpatterns = [
    path('find/', FindMatchesView.as_view(), name='find-matches'),
    path('my-matches/', MyMatchesView.as_view(), name='my-matches'),
    path('<int:pk>/respond/', RespondToMatchView.as_view(), name='respond-match'),
]
