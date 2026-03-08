from django.contrib import admin
from django.urls import path
from core.views import index, health, submit_score, leaderboard

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', index, name='index'),
    path('health/', health, name='health'),

    # ranking
    path('submit-score/', submit_score, name='submit_score'),
    path('leaderboard/', leaderboard, name='leaderboard'),
]
