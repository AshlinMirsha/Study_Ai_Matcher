# Study AI Matcher — Backend

Django REST + JWT backend for the Study AI Matcher project. Built module-wise
as 8 Django apps, matching the project spec exactly.

## Modules

| App              | Covers |
|-------------------|--------|
| `accounts`        | Registration, login, JWT auth, custom User model (Name, Email, College, Department, Year) |
| `profiles`         | Student Profile (subjects, skills, weak subjects, language, goals) + Availability |
| `matching`         | AI Matching engine (rule-based weighted score + TF-IDF goal similarity via scikit-learn) |
| `chat`             | One-to-one chat — REST history/send + WebSocket live chat (Django Channels) + file/notes sharing |
| `groups`           | Study groups — create/join/leave/discussions |
| `progress`         | Study logs, completed topics, streaks, dashboard, leaderboard |
| `ai_assistant`     | AI study suggestions, chatbot, AI-generated quizzes (Gemini/OpenAI, with offline fallback) |
| `notifications`    | In-app notifications (new match, new message, etc.) |

## Setup

```bash
# 1. Create a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# edit .env: set DB_ENGINE=postgres and your DB creds, or leave as sqlite for a quick local run

# 4. Run migrations
python manage.py migrate

# 5. (Optional) seed demo data — 5 students with overlapping subjects/schedules
python manage.py seed_demo_data
# all demo accounts use password: Demo@1234

# 6. Create an admin user (optional, for /admin/)
python manage.py createsuperuser

# 7. Run the server
#    Plain Django dev server (HTTP only, no WebSocket chat):
python manage.py runserver

#    OR, to get WebSocket chat working, run via Daphne (ASGI):
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

The API is now at `http://localhost:8000/api/...` and the admin at
`http://localhost:8000/admin/`.

## Using PostgreSQL

Set in `.env`:
```
DB_ENGINE=postgres
DB_NAME=study_ai_matcher
DB_USER=postgres
DB_PASSWORD=<your password>
DB_HOST=localhost
DB_PORT=5432
```
Create the database first: `createdb study_ai_matcher` (or via `psql`/pgAdmin).

## Using Redis (required for chat in production / multi-process)

Install and run Redis, then in `.env`:
```
USE_REDIS=True
REDIS_URL=redis://127.0.0.1:6379/0
```
Without Redis, chat still works locally via Django's in-memory channel layer,
but that only works for a single server process — fine for development, not
for production with multiple workers.

## AI Suggestions / Chatbot / Quiz (Module 8)

Set one of these in `.env`:
```
AI_PROVIDER=gemini
GEMINI_API_KEY=your-key-here
```
or
```
AI_PROVIDER=openai
OPENAI_API_KEY=your-key-here
```
If left blank, these features still work using a built-in rule-based
fallback (no billing, more limited responses) — useful for development
and demos without needing an API key.

## API Overview

```
POST /api/auth/register/              Register a student
POST /api/auth/login/                 Get JWT access + refresh tokens
POST /api/auth/login/refresh/         Refresh access token
POST /api/auth/logout/                Blacklist refresh token
GET/PUT /api/auth/me/                 View/update own account

GET/PATCH /api/profiles/me/           View/update own profile
GET  /api/profiles/students/          Browse other students
GET/POST /api/profiles/subjects/      Subject list/create
GET/POST/PUT/DELETE /api/profiles/availability/   Manage availability slots

GET  /api/matching/find/              Run AI matching engine, get ranked suggestions
GET  /api/matching/my-matches/        List saved matches
POST /api/matching/<id>/respond/      Accept/reject a match

GET  /api/chat/conversations/                 List conversations
POST /api/chat/conversations/start/           Start/get a conversation with a partner
GET  /api/chat/conversations/<id>/messages/   Message history
POST /api/chat/conversations/<id>/messages/send/   Send message/file (REST fallback)
WS   ws://<host>/ws/chat/<conversation_id>/?token=<jwt>   Live chat

GET/POST /api/groups/                 List/create study groups
POST /api/groups/<id>/join/           Join a group
POST /api/groups/<id>/leave/          Leave a group
GET  /api/groups/<id>/members/        List members
GET/POST /api/groups/<id>/discussions/   Group discussion board
GET  /api/groups/my-groups/           Groups you belong to

GET/POST /api/progress/logs/          Study session logs
GET/POST /api/progress/topics/        Completed topics
GET  /api/progress/dashboard/         Dashboard summary (hours, streak, topics, match stats)
GET  /api/progress/leaderboard/       Study-hours leaderboard

GET  /api/ai/suggestions/             Saved suggestions
POST /api/ai/suggestions/generate/    Generate new AI suggestions
GET  /api/ai/chatbot/history/         Chatbot conversation history
POST /api/ai/chatbot/ask/             Ask the chatbot something
GET  /api/ai/quizzes/                 List past quizzes
POST /api/ai/quizzes/generate/        Generate a new AI quiz {topic, subject, num_questions}
GET  /api/ai/quizzes/<id>/            View a quiz
POST /api/ai/quizzes/<id>/submit/     Submit answers {answers: {question_id: "a"}}

GET  /api/notifications/                      List notifications
GET  /api/notifications/unread-count/         Unread count
POST /api/notifications/<id>/read/            Mark one read
POST /api/notifications/mark-all-read/        Mark all read
```

## How the AI Matching Engine works (`matching/engine.py`)

A weighted score (0–100) is computed per pair of students:

| Criterion        | Weight | Method |
|-------------------|--------|--------|
| Subject overlap    | 30 | Jaccard similarity of subject sets |
| Schedule overlap    | 20 | Overlap ratio of (day, time-block) availability slots |
| Skill level         | 15 | Exact match = full, 1 level apart = half, else 0 |
| Study goal similarity | 15 | TF-IDF vectorization + cosine similarity (scikit-learn) on free-text goals |
| Department          | 8  | Exact match |
| Year of study        | 7  | Exact = full, 1 year apart = half |
| Preferred language   | 5  | Exact match |

Matches below 30% are not surfaced. The breakdown is returned alongside the
total score so the frontend can show *why* two students matched (e.g. "92%
compatible — same subject, same schedule, similar goals").

## Tech versions used

Django 6.0, DRF 3.17, djangorestframework-simplejwt 5.5, Django Channels 4.3,
channels-redis 4.3, daphne 4.2, psycopg2-binary 2.9, scikit-learn (matching
engine), google-generativeai 0.8 (Gemini).
