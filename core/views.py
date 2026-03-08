import json

from django.db import OperationalError, ProgrammingError
from django.http import JsonResponse
from django.shortcuts import render
from django.utils.timezone import now
from django.views.decorators.csrf import csrf_exempt

from .models import Score


def index(request):
    return render(request, 'core/index.html')


def health(request):
    return JsonResponse({
        'status': 'ok',
        'game': '2048 Gamer Edition',
        'timestamp': now().isoformat(),
    })


@csrf_exempt
def submit_score(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)

    try:
        data = json.loads(request.body)

        name = str(data.get('name', '')).strip()
        points = int(data.get('points', 0))
        moves = int(data.get('moves', 0))

        if not name:
            return JsonResponse({'error': 'El nombre es obligatorio'}, status=400)

        if len(name) > 30:
            return JsonResponse({'error': 'El nombre no puede superar los 30 caracteres'}, status=400)

        if points < 0 or moves < 0:
            return JsonResponse({'error': 'Los valores no pueden ser negativos'}, status=400)

        try:
            score = Score.objects.create(
                name=name,
                points=points,
                moves=moves,
            )
        except (OperationalError, ProgrammingError):
            return JsonResponse({
                'error': 'Ranking online no disponible temporalmente'
            }, status=503)

        return JsonResponse({
            'status': 'ok',
            'id': score.id,
            'name': score.name,
            'points': score.points,
            'moves': score.moves,
        }, status=201)

    except (json.JSONDecodeError, TypeError, ValueError):
        return JsonResponse({'error': 'Datos inválidos'}, status=400)


def leaderboard(request):
    try:
        top_scores = Score.objects.all()[:10]

        data = [
            {
                'name': score.name,
                'points': score.points,
                'moves': score.moves,
                'created_at': score.created_at.isoformat(),
            }
            for score in top_scores
        ]
    except (OperationalError, ProgrammingError):
        data = []

    return JsonResponse({
        'status': 'ok',
        'results': data,
    })
