from django.test import TestCase
from django.urls import reverse

from .models import Score


class LeaderboardViewTests(TestCase):
    def test_leaderboard_empty_returns_ok(self):
        response = self.client.get(reverse('leaderboard'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json().get('status'), 'ok')
        self.assertEqual(response.json().get('results'), [])

    def test_submit_score_and_leaderboard(self):
        submit_response = self.client.post(
            reverse('submit_score'),
            data={'name': 'Player1', 'points': 128, 'moves': 22},
            content_type='application/json',
        )

        self.assertEqual(submit_response.status_code, 201)
        self.assertEqual(Score.objects.count(), 1)

        leaderboard_response = self.client.get(reverse('leaderboard'))
        payload = leaderboard_response.json()

        self.assertEqual(leaderboard_response.status_code, 200)
        self.assertEqual(payload.get('status'), 'ok')
        self.assertEqual(len(payload.get('results', [])), 1)
        self.assertEqual(payload['results'][0]['name'], 'Player1')

    def test_submit_score_requires_name(self):
        response = self.client.post(
            reverse('submit_score'),
            data={'name': '', 'points': 64, 'moves': 12},
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
