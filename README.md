# TeamPulse

Real-time team collaboration platform with AI-powered insights — teams, projects, a drag-and-drop Kanban board, live updates, and Groq-backed standup summaries and priority scoring.

## Features

- **Teams & roles** — create teams, invite members, manage roles and permissions
- **Projects** — organize work into projects within a team
- **Kanban board** — drag-and-drop tasks across statuses with ordering and assignment
- **Real-time updates** — WebSocket + Redis pub/sub keeps every client in sync
- **Collaboration** — threaded comments on tasks, task detail views
- **AI insights** — standup summaries, AI task priority scoring, and per-project insights
- **Auth** — JWT in httpOnly cookies with refresh tokens, plus OAuth2 (Google, GitHub)
- **Analytics** — project dashboards and charts

## Architecture

TeamPulse is a three-service application behind a single Docker network:

```
                     ┌──────────────────┐
   Browser  ────────▶│  Frontend        │  Next.js 14 (App Router, TypeScript)
                     │  :3000           │
                     └────────┬─────────┘
                              │ REST + WebSocket
                     ┌────────▼─────────┐        ┌──────────────────┐
                     │  Backend         │───────▶│  AI Service      │  FastAPI + Groq
                     │  :8000           │        │  :8001           │  (standups, priority)
                     │  FastAPI         │        └──────────────────┘
                     └───┬──────────┬───┘
                         │          │
                ┌────────▼──┐   ┌───▼──────┐
                │PostgreSQL │   │  Redis   │
                │  :5432    │   │  :6379   │
                └───────────┘   └──────────┘
```

| Service | Stack | Port |
|---|---|---|
| `frontend/` | Next.js 14, React 18, TypeScript, Tailwind, TanStack Query, Zustand, dnd-kit, Recharts, NextAuth v5 | 3000 |
| `backend/` | FastAPI, SQLAlchemy 2.0 (async), Alembic, PostgreSQL, Redis, JWT | 8000 |
| `ai-service/` | FastAPI, Groq (Llama 3.3 70B) | 8001 |

## Project Structure

```
teampulse/
├── frontend/           # Next.js app (src/app, src/components, src/hooks, src/store)
├── backend/            # FastAPI app (app/api, app/models, app/services, alembic/) — see backend/README.md
├── ai-service/         # Groq-backed AI microservice
├── docker-compose.yml         # Local development stack
├── docker-compose.test.yml    # Isolated stack for integration tests
├── docker-compose.prod.yml    # Production images
└── .env.example               # Environment template for docker-compose
```

Each service also ships its own `.env.example` and `Dockerfile` / `Dockerfile.prod`.

## Quick Start (Docker)

```bash
# 1. Create your environment file
cp .env.example .env
#    then edit .env — at minimum set SECRET_KEY, NEXTAUTH_SECRET and GROQ_API_KEY

# 2. Build and start the full stack
docker compose up --build
```

## Demo Credentials

After running `docker compose up --build` and seeding the database (see below), you can log in with these pre-created accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@teampulse.ac` | `Passcode@9938` |
| Member | `arjun@teampulse.ac` | `Passcode@9938` |
| Member | `priya@teampulse.ac` | `Passcode@9938` |
| Member | `rohan@teampulse.ac` | `Passcode@9938` |

All four accounts use the same password: **`Passcode@9938`**

### Seeding Demo Data

The demo accounts, sample team, projects, and tasks are created by the seed script. After the containers are running:

```bash
# From the project root
docker compose run --rm --no-deps backend python scripts/seed.py
```

This creates:
- 4 users (1 admin + 3 members)
- 1 team: "Acme Corp"
- 3 projects with Kanban boards
- 26 sample tasks across different statuses

You can then log in at **http://localhost:3000** with any of the credentials above.

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API docs | http://localhost:8000/docs |
| AI service docs | http://localhost:8001/docs |

Postgres and Redis are started automatically with health checks; the backend waits for both before booting.

## Local Development (without Docker)

Start Postgres and Redis first (`docker compose up postgres redis`), then:

**Backend**

```bash
cd backend
pip install -r requirements-dev.txt
cp .env.example .env.local     # edit with your values
alembic upgrade head           # run migrations
python scripts/seed.py         # optional demo data
uvicorn app.main:app --reload
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

**AI service**

```bash
cd ai-service
pip install -r requirements.txt
cp .env.example .env           # set GROQ_API_KEY
uvicorn main:app --reload --port 8001
```

## Environment Variables

See [`.env.example`](.env.example) for the docker-compose variables, and each service's own `.env.example` for service-level settings.

Key variables:

| Variable | Purpose |
|---|---|
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | Database credentials |
| `SECRET_KEY` | Backend JWT signing key |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | Frontend session signing and base URL |
| `GROQ_API_KEY` / `GROQ_MODEL` | AI service credentials |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth (optional) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth (optional) |

> **Never commit real secrets.** `.env`, `.env.local` and `.env.production` are gitignored — only `.env.example` templates belong in the repository.

## API Overview

The backend exposes a versioned REST API under `/api/v1` plus a WebSocket endpoint:

- `POST /api/v1/auth/register`, `/login`, `/refresh`, `/logout`, `GET /me`
- `POST|GET /api/v1/teams`, `GET|PATCH|DELETE /api/v1/teams/{team_id}`, member management
- `/api/v1/teams/{team_id}/projects` and `/api/v1/projects/{project_id}`
- `/api/v1/projects/{project_id}/tasks`, `/api/v1/tasks/{task_id}` (move, assign, priority, comments)
- `/api/v1/ai/standup-summary`, `/api/v1/ai/task-priority`, `/api/v1/ai/insights/{project_id}`
- `WS /api/v1/ws/{team_id}?token=<access_token>`

Full endpoint list, request/response shapes, and backend conventions live in **[backend/README.md](backend/README.md)**.

## Testing

```bash
# Backend
cd backend && pytest

# Frontend unit tests
cd frontend && npm test

# Frontend end-to-end (Playwright)
cd frontend && npm run test:e2e

# Frontend type check + lint
cd frontend && npm run type-check && npm run lint

# Backend lint + type check
cd backend && ruff check . && mypy app
```

## Deployment

```bash
# Production images for backend and AI service
docker compose -f docker-compose.prod.yml up -d --build
```

## License

No license has been declared for this project yet.
