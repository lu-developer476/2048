# 2048 Cyberpunk Edition

![Python](https://img.shields.io/badge/Python-3.12.6-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-5.2.6-092E20?style=for-the-badge&logo=django&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-Markup-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-Styling-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Gunicorn](https://img.shields.io/badge/Gunicorn-23.0.0-499848?style=for-the-badge&logo=gunicorn&logoColor=white)
![WhiteNoise](https://img.shields.io/badge/WhiteNoise-6.9.0-444444?style=for-the-badge)
![python-dotenv](https://img.shields.io/badge/python--dotenv-1.0.1-ECD53F?style=for-the-badge)
![Render](https://img.shields.io/badge/Render-Deploy-46E3B7?style=for-the-badge&logo=render&logoColor=black)
![License](https://img.shields.io/badge/License-All%20Rights%20Reserved-red?style=for-the-badge)

2048 es una reinterpretación cyberpunk del clásico juego **2048**, inspirada en la estética de **Cyberpunk 2077**.

La aplicación combina un **frontend interactivo en JavaScript** con un **backend Django** que gestiona un sistema de **leaderboard online**, persistencia de partidas y métricas de sesión.

El proyecto está diseñado como un **juego web completo listo para producción**, desplegado en **Render** y estructurado con buenas prácticas de desarrollo backend + frontend.

------------------------------------------------------------------------

## Demo

Aplicación desplegada en Render:

https://your-app.onrender.com

------------------------------------------------------------------------

## Stack tecnológico

### Frontend

-   HTML5
-   CSS3
-   JavaScript vanilla
-   Web Audio API (sonido procedural)
-   Canvas Confetti (efectos visuales)

### Backend

- Python 3
- Django (REST endpoints para leaderboard)
- Gunicorn (servidor WSGI)
- WhiteNoise (serving de archivos estáticos en producción)

### Infraestructura

-   Render (hosting)
-   GitHub (repositorio)

------------------------------------------------------------------------

## Features

### Gameplay Mechanics

El juego mantiene la lógica clásica de **2048** con mejoras en la experiencia de usuario.

-   Movimiento con:
    -   teclado (Arrow Keys / WASD)
    -   botones en pantalla
    -   gestos táctiles en dispositivos móviles
-   Sistema de **score** y **best score**
-   **Undo** para deshacer el último movimiento
-   Persistencia automática de la partida
-   Animaciones de tiles
-   Efectos sonoros dinámicos
-   Efectos visuales al alcanzar 2048

### Advanced HUD

El HUD muestra información en tiempo real:

-   Score
-   Best Score
-   Moves
-   Game State
-   Session ID
-   Time Played
-   Level (basado en el tile máximo alcanzado)

### Global Leaderboard

Sistema de ranking global:

-   Guardado automático de puntajes al finalizar la partida
-   Top players global
-   Validación básica del backend
-   Prevención de duplicados

------------------------------------------------------------------------

El proyecto sigue una arquitectura Django clásica separando lógica de backend, frontend estático y templates.

## Arquitectura del proyecto

    project
    │
    ├── core
    │   ├── templates
    │   │   └── core
    │   │       └── index.html
    │   │
    │   ├── static
    │   │   └── core
    │   │       ├── css
    │   │       │   └── styles.css
    │   │       │
    │   │       ├── js
    │   │       │   └── game.js
    │   │       │
    │   │       └── favicon.png
    │   │
    │   ├── models.py
    │   ├── views.py
    │   └── urls.py
    │
    ├── game2048
    │   ├── settings.py
    │   ├── urls.py
    │   ├── wsgi.py
    │   └── asgi.py
    │
    ├── manage.py
    ├── requirements.txt
    ├── render.yaml
    └── README.md

------------------------------------------------------------------------

## REST API

El proyecto utiliza variables de entorno para configuración segura en producción.

### Healthcheck

`GET /health/`

Respuesta:

``` json
{
  "status": "ok",
  "game": "2048 Gamer Edition",
  "timestamp": "2026-03-07T00:00:00Z"
}
```

------------------------------------------------------------------------

### Enviar puntaje

`POST /submit-score/`

Payload:

``` json
{
  "name": "Player",
  "points": 5320,
  "moves": 142
}
```

Respuesta:

``` json
{
  "status": "ok",
  "id": 12
}
```

------------------------------------------------------------------------

### Leaderboard

`GET /leaderboard/`

Respuesta:

``` json
{
  "status": "ok",
  "results": [
    {
      "name": "Lucas",
      "points": 10420,
      "moves": 198
    }
  ]
}
```

------------------------------------------------------------------------

## Variables de entorno

Ejemplo en `.env.example`

``` env
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=.onrender.com,localhost
CSRF_TRUSTED_ORIGINS=https://*.onrender.com
PORT=8000
```

------------------------------------------------------------------------

## Instalación local

Clonar el repositorio

``` bash
git clone https://github.com/your-user/2048-gamer-edition.git
cd 2048-gamer-edition
```

Crear entorno virtual

``` bash
python -m venv .venv
```

Activar entorno

Linux / macOS

``` bash
source .venv/bin/activate
```

Windows

``` bash
.venv\Scripts\activate
```

Instalar dependencias

``` bash
pip install -r requirements.txt
```

Aplicar migraciones

``` bash
python manage.py migrate
```

Ejecutar servidor de desarrollo

``` bash
python manage.py runserver
```

Abrir en navegador

    http://127.0.0.1:8000

------------------------------------------------------------------------

## Deployment (Render)

1.  Subir el proyecto a GitHub.
2.  Crear un **Web Service** en Render.
3.  Conectar el repositorio.
4.  Usar el archivo `render.yaml` incluido o configurar manualmente.

### Build Command

``` bash
pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput
```

### Start Command

``` bash
gunicorn game2048.wsgi:application
```

------------------------------------------------------------------------

## Future Improvements

Posibles mejoras futuras:

-   leaderboard en tiempo real
-   autenticación de jugadores
-   ranking semanal
-   modo hardcore
-   skins de tablero
-   multiplayer asincrónico

------------------------------------------------------------------------
