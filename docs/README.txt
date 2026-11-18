================================================================================
TEAMPULSE - README (PLAIN TEXT VERSION)
================================================================================
Last updated : 18 November 2026
Repository   : https://github.com/laxtline/TeamPulse
Live (docs)  : https://teampulse.vercel.app
               https://teampulse-api.onrender.com
               Live status: NOT VERIFIED - please fill in

This is the plain-text companion to the GitHub README.md. Same information,
readable without a Markdown viewer.

--------------------------------------------------------------------------------
1. WHAT THIS IS
--------------------------------------------------------------------------------
TeamPulse is a full-stack team collaboration app. A team creates projects, puts
work on a Kanban board, discusses it in comments, and gets an AI-suggested
priority for each task.

Three deployable services:

  frontend     Next.js 14 (App Router) + TypeScript + Tailwind
  backend      FastAPI + SQLAlchemy 2.0 async + PostgreSQL + Redis
  ai-service   FastAPI + Groq (Llama 3.3 70B), with a local rule-based fallback

Two data services:

  PostgreSQL 16   primary store, 9 tables
  Redis 7         rate limiting and pub/sub capacity

--------------------------------------------------------------------------------
2. FEATURES
--------------------------------------------------------------------------------
Working:
  - Email + password registration and login
  - Google and GitHub OAuth via NextAuth
  - JWT access token (15 min) + rotating refresh token (7 days), httpOnly cookie
    with a Bearer fallback for cross-site hosting
  - Teams with four roles: owner, admin, member, viewer - enforced server-side
  - Invite an existing user, change roles, remove members
  - Projects with a unique short key per team
  - Tasks with title, description, status, priority, assignee, story points, due
    date, and float position
  - Kanban board with five columns and drag-and-drop; status and order persist
  - Comments with author-only edit and author/admin delete
  - Activity log recording action plus old and new values
  - AI priority score 1-10 with reason and recommended action, plus fallback
  - Profile update, password change, theme switching
  - Docker Compose dev stack and multi-stage production Dockerfiles

Partial or mocked (stated honestly):
  - Real-time: sockets connect and presence works, but task/comment changes are
    not broadcast, so two browsers do not sync
  - Dashboard velocity and workload charts use fixed sample data
  - Notification preferences are stored in the browser only
  - AI priority is displayed but not saved to the database
  - Assignee dropdown in the create-task dialog can be empty
  - Team settings save/delete and Delete Account buttons are not wired
  - Forgot/reset password does not send email

Broken:
  - POST /api/v1/ai/my-standup (date in body vs query, wrong model import, wrong
    service argument) - so the dashboard standup card fails
  - Project page links to /analytics and a team settings route that do not exist

Missing:
  - Dashboard layout: Sidebar, Navbar and ProtectedRoute exist but are not mounted
  - Backend tests (folders are empty), CI workflows (.github/workflows is empty),
    LICENSE

See remaining-tasks.txt for the prioritised fix list.

--------------------------------------------------------------------------------
3. QUICK START (LOCAL)
--------------------------------------------------------------------------------
Prerequisites: Python 3.11/3.12, Node 18/20, Docker (for Postgres + Redis), Git.

  git clone https://github.com/laxtline/TeamPulse.git
  cd TeamPulse/teampulse

  # 1. data services
  docker compose up -d postgres redis

  # 2. backend
  cd backend
  python -m venv .venv
  .\.venv\Scripts\Activate.ps1        # Windows
  # source .venv/bin/activate         # Linux/macOS
  pip install -r requirements.txt
  copy .env.example .env              # then edit DATABASE_URL / REDIS_URL
  alembic upgrade head
  python scripts/seed.py
  uvicorn app.main:app --reload --port 8000

  # 3. AI service (new terminal)
  cd ai-service
  python -m venv .venv
  .\.venv\Scripts\Activate.ps1
  pip install -r requirements.txt
  copy .env.example .env              # GROQ_API_KEY optional
  uvicorn main:app --reload --port 8001

  # 4. frontend (new terminal)
  cd frontend
  copy .env.local.example .env.local  # set NEXT_PUBLIC_API_URL
  npm install
  npm run dev

Open http://localhost:3000 and log in:

  arjun@teampulse.ac  / Passcode@9938
  priya@teampulse.ac  / Passcode@9938
  rohan@teampulse.ac  / Passcode@9938
  admin@teampulse.ac  / Passcode@9938

One-command alternative (everything in Docker):
  docker compose up --build
  docker compose exec backend alembic upgrade head
  docker compose exec backend python scripts/seed.py

Full detail: setup-guide.txt (English) and locall_run.txt (Hinglish).

--------------------------------------------------------------------------------
4. PORTS
--------------------------------------------------------------------------------
  3000  frontend        http://localhost:3000
  8000  backend API     http://localhost:8000/docs
  8001  AI service      http://localhost:8001/docs
  5432  PostgreSQL
  6379  Redis

--------------------------------------------------------------------------------
5. PROJECT LAYOUT
--------------------------------------------------------------------------------
  teampulse/
    backend/          FastAPI app, models, services, schemas, alembic, scripts
    frontend/         Next.js app, components, hooks, lib, store, types
    ai-service/       FastAPI AI microservice
    docs/             this documentation set (16 files)
    docker-compose.yml, docker-compose.prod.yml, docker-compose.test.yml
    DEPLOY.md         deployment guide
    README.md         GitHub README
    PROJECT_GUIDE.txt  full project guide (also in docs/)

  backend/app/
    api/v1/           routers: auth, users, teams, projects, tasks, ai, ws
    services/         business logic and authorization
    models/           SQLAlchemy ORM tables
    schemas/          Pydantic request/response contracts
    core/             config, security, database session, dependencies
    db/               base and session factory

  frontend/src/
    app/              routes (App Router)
    components/       ui primitives, layout, board, task, team
    lib/              api client, auth helpers, utils
    hooks/            TanStack Query hooks, WebSocket hook
    store/            Zustand stores
    types/            shared types

--------------------------------------------------------------------------------
6. ENVIRONMENT VARIABLES (NAMES ONLY)
--------------------------------------------------------------------------------
  backend/.env
    ENVIRONMENT, DEBUG, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS, DATABASE_URL, REDIS_URL, AI_SERVICE_URL,
    CORS_ORIGINS, FRONTEND_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
    GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET

  ai-service/.env
    GROQ_API_KEY, GROQ_MODEL, ALLOWED_ORIGINS, PORT, REQUEST_TIMEOUT_SECONDS

  frontend/.env.local
    NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL, NEXT_PUBLIC_APP_URL, NEXTAUTH_URL,
    NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET

Rules: DATABASE_URL needs postgresql+asyncpg:// and ssl=require (not sslmode) in
production. NEXT_PUBLIC_* values are compiled at build time, so changing one
requires a redeploy. Never commit .env files.

--------------------------------------------------------------------------------
7. API OVERVIEW
--------------------------------------------------------------------------------
Base path /api/v1. About 31 REST routes plus 2 WebSocket routes. Full interactive
docs at /docs.

  POST   /auth/register              POST   /auth/login
  POST   /auth/logout                POST   /auth/refresh
  POST   /auth/oauth/callback        GET    /auth/me
  GET    /users/me                   PATCH  /users/me
  POST   /users/me/change-password
  POST   /teams                      GET    /teams
  GET    /teams/{id}                 PATCH  /teams/{id}
  DELETE /teams/{id}
  POST   /teams/{id}/members         GET    /teams/{id}/members
  PATCH  /teams/{id}/members/{uid}   DELETE /teams/{id}/members/{uid}
  POST   /projects                   GET    /projects
  GET    /projects/{id}              PATCH  /projects/{id}
  DELETE /projects/{id}
  POST   /tasks                      GET    /tasks
  GET    /tasks/{id}                 PATCH  /tasks/{id}
  DELETE /tasks/{id}                 PATCH  /tasks/{id}/move
  GET    /tasks/{id}/comments        POST   /tasks/{id}/comments
  PATCH  /comments/{id}              DELETE /comments/{id}
  GET    /tasks/{id}/activities
  POST   /ai/priority                POST   /ai/my-standup   (broken)
  GET    /ai/project-insights        (stub)
  WS     /ws/projects/{id}           WS     /ws/notifications

--------------------------------------------------------------------------------
8. DATABASE
--------------------------------------------------------------------------------
9 tables: users, oauth_accounts, refresh_tokens, teams, team_members, projects,
tasks, comments, activities. Enums for role, task status and priority. Foreign
keys with explicit delete behaviour, 19 indexes and constraints, one Alembic
migration.

--------------------------------------------------------------------------------
9. TESTING
--------------------------------------------------------------------------------
  cd frontend
  npm run lint
  npm test            # Vitest
  npm run test:e2e    # Playwright (npx playwright install first)

Backend tests: folders exist but are empty. Nothing to run yet.

--------------------------------------------------------------------------------
10. DEPLOYMENT (SUMMARY)
--------------------------------------------------------------------------------
  Frontend  Vercel     root directory frontend
  Backend   Render     root directory backend, health check /health
  AI        Render     root directory ai-service
  Database  Neon       postgres, +asyncpg driver
  Redis     Upstash    rediss:// TLS
  Uptime    cron-job.org pings both /health endpoints every 10 minutes

After a change: git push, and both Vercel and Render redeploy automatically.
Migrations are a release step, not automatic.

Full steps: deploy-free-guide.txt, deployment-files.txt, DEPLOY.md.

--------------------------------------------------------------------------------
11. TROUBLESHOOTING (TOP FIVE)
--------------------------------------------------------------------------------
  CORS error        CORS_ORIGINS must exactly match the frontend origin
  401 loop          NEXT_PUBLIC_API_URL wrong or backend down
  asyncpg ssl error use ?ssl=require, not ?sslmode=require
  ModuleNotFound    start uvicorn from backend/ so "app" is importable
  WS 403 / closes   use wss:// on https and pass the access token

More: setup-guide.txt section 12, deploy-free-guide.txt section 12.

--------------------------------------------------------------------------------
12. DOCUMENTATION INDEX (docs/ folder)
--------------------------------------------------------------------------------
  PROJECT_GUIDE.txt        the full guide: every folder and file explained
  project-overview.txt     two-page summary
  project-spec.txt         requirements, architecture, data model, API
  setup-guide.txt          zero to running, English
  locall_run.txt           zero to running, Hinglish
  deploy-free-guide.txt    free-tier deployment, step by step
  deployment-files.txt     every deployment file and env var name
  user-guide.txt           how to use the app
  git-guide.txt            git and GitHub for a fresher
  interview-prep.txt       interview questions and answers
  resume-bullets.txt       resume bullets and ATS notes
  viva-script.txt          spoken viva script and demo order
  remaining-tasks.txt      prioritised backlog + roadmap/placement analysis
  README.txt               this file
  ClientHub_Presentation.pptx   slide deck
  ClientHub_Project_Report.docx project report

Naming note: the .pptx and .docx files carry the ClientHub name because that was
the requested filename. The product inside them is TeamPulse.

--------------------------------------------------------------------------------
13. SECURITY NOTES
--------------------------------------------------------------------------------
  - Passwords are bcrypt-hashed; never returned by any endpoint.
  - Refresh tokens are stored hashed and rotated on use.
  - Authorization is enforced in the service layer.
  - Secrets are environment variables; .env is gitignored.
  - Demo accounts with a published password exist for the seeded database.
    Change or delete them before sharing a public deployment.
  - Do not put confidential information in task descriptions: prompts are sent to
    a third-party model provider.

--------------------------------------------------------------------------------
14. LICENCE
--------------------------------------------------------------------------------
NOT FOUND - please fill in. The repository has no LICENSE file, which means all
rights are reserved by default. Adding MIT is the usual choice for a portfolio
project.

--------------------------------------------------------------------------------
15. AUTHOR
--------------------------------------------------------------------------------
  Name  : NOT FOUND - please fill in
  Role  : MCA fresher, targeting service companies and product/GCC roles
  Repo  : https://github.com/laxtline/TeamPulse
================================================================================
