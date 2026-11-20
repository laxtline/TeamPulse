# TeamPulse

A real-time team collaboration app: teams create projects, every project has a Kanban board, and
tasks move across five columns. Two people can have the same board open and see each other's
changes without refreshing. A small AI service writes the daily standup and scores how urgent a
task is.

I built this as my main project while learning full-stack development. Tutorials usually
stop at CRUD, so I wanted the parts they skip: authentication that survives a page reload, keeping
several browsers in sync, splitting one product into separately deployable services, and running
all of it on free tiers without a credit card.

**Live links**

- Frontend (Vercel): <https://team-pulse-lilac.vercel.app>
- API (Render): <https://teampulse-api-ep2v.onrender.com/health>
- AI service (Render): <https://teampulse-ai-trwr.onrender.com/health>
- Repository: <https://github.com/laxtline/TeamPulse>

---

## Table of contents

1. [Tech stack](#tech-stack)
2. [Key features](#key-features)
3. [Folder structure](#folder-structure)
4. [What each file does](#what-each-file-does)
5. [How the board stays in sync](#how-the-board-stays-in-sync)
6. [Setup and run](#setup-and-run)
7. [Demo login](#demo-login)
8. [Screenshots](#screenshots)
9. [Deployment](#deployment)
10. [What I learned](#what-i-learned)
11. [Known limitations](#known-limitations)
12. [Contact](#contact)

---

## Tech stack

| Area | What I used | Why |
|------|-------------|-----|
| Frontend | Next.js 14 (App Router), React 18, TypeScript | File-based routing, server components, one deploy on Vercel, and types on every API payload |
| Styling | Tailwind CSS | Dark mode is one class on `<html>`, and no separate CSS files to keep in sync |
| Server state | TanStack Query | Caching, refetching and loading states instead of hand-written `useEffect` fetches |
| Client state | Zustand | Two small stores (team data, UI state) without Redux boilerplate |
| Drag and drop | dnd-kit | Accessible drag and drop with real keyboard support |
| Charts | Recharts | Velocity and workload charts in very little code |
| Auth (frontend) | NextAuth v5 (Auth.js) | Google and GitHub OAuth, with tokens in an encrypted session cookie |
| Backend | FastAPI, SQLAlchemy 2.0 (async), asyncpg, Alembic | Async by default, automatic validation, and OpenAPI docs for free |
| Database | PostgreSQL 16 on Neon | Relational data with real constraints; the free tier does not expire |
| Cache and bus | Redis on Upstash | WebSocket fan-out between server instances, plus a sliding-window rate limiter |
| AI | Groq API through a small FastAPI service | Fast inference on a free tier; the model name is an environment variable |
| Realtime | WebSocket + Redis pub/sub | One socket per open board, so a change reaches every browser in the team |
| Auth (backend) | JWT access + refresh tokens, bcrypt | Short-lived access tokens, rotating refresh tokens, hashed at rest |
| Testing | Vitest + Testing Library, Playwright | Fast unit tests plus three real browser flows |
| Containers | Docker, Docker Compose | The same image locally and on Render; one command starts everything |
| Hosting | Vercel, Render, Neon, Upstash | The combination that works without a card on file |

Three deployable services (`frontend`, `backend`, `ai-service`) and two managed ones (Postgres,
Redis). Nothing talks to the database except the backend, and nothing talks to Groq except the AI
service, so each secret lives in exactly one place.

---

## Key features

- **Teams and roles** — create a team, invite somebody by email, change their role, remove them.
  Roles live on the membership, so the same person can be owner in one team and member in another.
- **Projects inside a team** — a name, a description and a short key prefix, with per-status task
  counts on the cards.
- **Kanban board with real ordering** — five columns (backlog, todo, in progress, review, done),
  drag between columns, reorder inside a column, keyboard dragging included.
- **Live updates** — a drag, a create, an update, a comment or a presence change is published to
  every browser that has the board open.
- **Task detail** — description, priority, assignee, story points, due date, threaded comments and
  a full activity log ("Priya moved this from Todo to In Progress").
- **AI standup and priority** — a daily standup summary from yesterday's activity, a 1–10 priority
  score with reasoning and a suggested action, and a one-paragraph project summary.
- **Analytics** — tasks completed per week and open tasks per member, plus the AI summary.
- **Secure sessions** — bcrypt passwords, 15-minute access tokens, 7-day refresh tokens rotated on
  every use and stored only as a SHA-256 hash. Nothing in `localStorage`.
- **Three ways to log in** — email and password, Google, GitHub. All three end in the same local
  token pair, so the rest of the app does not care which one was used.
- **Settings that persist** — name, avatar, bio, theme and seven notification toggles, all stored on
  the user row rather than in the browser.
- **Free-tier survival** — retries for a cold API, an AI service with deterministic fallbacks, and a
  scheduled ping so the free instance does not fall asleep before a demo.

---

## Folder structure

```
teampulse/
│
├── frontend/                        Next.js 14 application
│   ├── src/
│   │   ├── app/                     routes (App Router)
│   │   │   ├── (auth)/              login, register, forgot-password
│   │   │   ├── (dashboard)/         every protected page
│   │   │   │   ├── dashboard/       my tasks, my teams, standup card
│   │   │   │   ├── teams/           team list, team detail, project pages
│   │   │   │   ├── tasks/[taskId]/  task detail, comments, activity
│   │   │   │   └── settings/        profile, password, notifications, theme
│   │   │   ├── api/auth/            NextAuth catch-all route
│   │   │   ├── layout.tsx           html, body, fonts, providers
│   │   │   └── providers.tsx        session, theme and QueryClient
│   │   ├── components/
│   │   │   ├── ui/                  Button, Input, Modal, Card, Badge, Tabs, Toaster
│   │   │   ├── layout/              Sidebar, Navbar, PageHeader, ThemeSync
│   │   │   ├── kanban/              Board, Column, Card, TaskModal
│   │   │   ├── tasks/               header, comments, activity, priority badge
│   │   │   ├── teams/               team card, invite modal, member table
│   │   │   ├── charts/              velocity and workload
│   │   │   └── ai/                  standup card, priority indicator
│   │   ├── hooks/                   useAuth, useWebSocket, useDebounce, useOptimisticUpdate
│   │   ├── lib/                     axios client, NextAuth config, utils, validations
│   │   ├── store/                   Zustand: team data, UI state
│   │   └── types/                   shared types + NextAuth augmentation
│   ├── e2e/                         Playwright: auth, kanban, teams
│   ├── next.config.js               CSP, security headers, /api/backend rewrite
│   └── package.json
│
├── backend/                         FastAPI application
│   ├── app/
│   │   ├── api/v1/                  auth, teams, projects, tasks, comments, ai,
│   │   │                            notifications, websocket, diagnostics
│   │   ├── core/                    config, database, security, redis, exceptions
│   │   ├── dependencies/            current user, db session, pagination, rate limit
│   │   ├── middleware/              request logging, security headers
│   │   ├── models/                  SQLAlchemy tables (11 tables in total)
│   │   ├── schemas/                 Pydantic request/response models
│   │   ├── services/                business rules, one module per domain
│   │   └── main.py                  app factory, lifespan, routers, health checks
│   ├── alembic/                     4 migrations
│   ├── scripts/seed.py              demo data
│   ├── tests/                       pytest folders (scaffolded, empty for now)
│   └── Dockerfile.prod
│
├── ai-service/                      small FastAPI service for Groq
│   ├── main.py                      endpoints + deterministic fallbacks
│   ├── groq_client.py               one thin async client
│   ├── prompts.py                   system prompts
│   └── schemas.py                   request/response models
│
├── docs/                            guides as PDFs, plus the study documents
├── .github/workflows/keepalive.yml  ping every 10 minutes so the free API stays awake
├── docker-compose.yml               local five-service stack
├── docker-compose.test.yml          isolated stack for tests
├── docker-compose.prod.yml          production images
├── .env.example                     every variable, with placeholder values
└── README.md
```

**The backend is layered, and every request walks the same path**: middleware → router →
dependency (who is calling?) → service (what are the rules?) → model (SQL) → schema (the JSON that
leaves). Routers stay thin on purpose, which is why a route file is readable in one sitting and all
the decisions live in `services/`.

**The frontend follows the App Router rules**: `page.tsx` is a URL, `layout.tsx` wraps everything
below it, `route.ts` is an API endpoint instead of a page, `(folder)` groups files without adding a
URL segment, and `[param]` is a dynamic segment. Once those five rules are clear, the folder stops
looking random.

---

## What each file does

The files below are the ones worth opening first. Line counts are from the real files.

| File | Description |
|------|-------------|
| `backend/app/main.py` | Creates the FastAPI app: CORS, middleware, lifespan startup, routers and three health endpoints. 119 lines. |
| `backend/app/core/config.py` | One `Settings` class that reads and validates every environment variable, cached once per process. 120 lines. |
| `backend/app/core/database.py` | Builds the async engine, rewrites provider URLs for asyncpg, and adds missing columns at boot. 132 lines. |
| `backend/app/core/security.py` | bcrypt hashing and JWTs, each token carrying a `type` claim so a refresh token cannot be used as an access token. 67 lines. |
| `backend/app/dependencies/auth.py` | Answers "who is calling?" from either the httpOnly cookie or an `Authorization: Bearer` header. 87 lines. |
| `backend/app/services/auth.py` | Register, verify password, issue and rotate tokens, store hashes, link OAuth accounts. 229 lines. |
| `backend/app/services/task.py` | Task rules: create with `max(position) + 1`, move, assign, write activity, publish the event. 286 lines. |
| `backend/app/services/websocket.py` | Connection registry, presence, the Redis `psubscribe` loop and `publish_event`. 154 lines. |
| `backend/app/api/v1/auth.py` | The auth routes and the cookie helpers, including the per-email login rate limit. 240 lines. |
| `backend/app/api/v1/tasks.py` | Task routes: list, create, get, update, move, assign, AI priority, delete. 317 lines. |
| `backend/app/models/task.py` | `Task`, `TaskActivity`, `AIPriorityScore`. Status and priority are plain strings on purpose (a native enum broke task creation). 99 lines. |
| `backend/scripts/seed.py` | Creates the four demo users, Acme Corp, three projects and 26 tasks. Safe to re-run. 218 lines. |
| `frontend/src/lib/api.ts` | One axios instance: Bearer token, 401 refresh, `X-Skip-Auth-Refresh`, and every endpoint helper. 264 lines. |
| `frontend/src/lib/auth.ts` | NextAuth config: credentials, Google, GitHub (with the issuer fix), callbacks and refresh dedupe. 327 lines. |
| `frontend/src/hooks/useWebSocket.ts` | Socket lifecycle, event map, reconnect with backoff, ping and presence. 170 lines. |
| `frontend/src/components/kanban/KanbanBoard.tsx` | Board state, drag handling, optimistic moves and the socket subscription. 144 lines. |
| `frontend/src/components/kanban/TaskModal.tsx` | One form for create and edit, with one submit handler that decides which call to make. 252 lines. |
| `frontend/src/app/(dashboard)/settings/page.tsx` | Four tabs, each a separate mutation, all written to the database. 629 lines. |
| `frontend/src/app/(dashboard)/teams/[teamId]/projects/[projectId]/page.tsx` | The board page: resolves the project and tasks once, then hands them to the board. 128 lines. |
| `ai-service/main.py` | The AI endpoints, each with a deterministic fallback so a Groq failure never reaches the UI. 255 lines. |
| `ai-service/groq_client.py` | The only file that knows Groq exists; the model comes from `GROQ_MODEL`. 71 lines. |

Rough sizes: about 4,300 lines of Python in `backend/app`, 7,600 lines of TypeScript in
`frontend/src`, and 405 lines in the AI service. The root of the repository holds 162 tracked
files in total.

---

## How the board stays in sync

The interesting part of the app is that a drag in one browser reaches every other browser without a
refresh. It happens in six steps:

1. dnd-kit reports the new status and the target index. `KanbanBoard` updates its local state
   immediately, so the card follows the finger.
2. It sends `PATCH /projects/{id}/tasks/{taskId}/move` with just `{ status, position }`.
3. The service validates the change, sets `position` to `max + 1` when the column changed (or the
   value the client computed when it did not), sets or clears `completed_at`, and writes an activity
   row.
4. It publishes `task:moved` to the Redis channel `team:<teamId>`.
5. Every backend instance subscribed to `team:*` forwards the event to its own sockets, and
   `useWebSocket` calls the matching callback.
6. Other browsers apply the change and re-sort the column. The author's browser ignores its own
   event, because it already applied the change locally.

If the request fails, `useOptimisticUpdate` puts the card back and a toast explains why. The
interface feels instant, and the database stays the source of truth.

Two details that matter: positions are floats, so a new card is one `INSERT` with
`max(position) + 1` and nothing has to be renumbered; and WebSocket rooms are keyed by team, so a
user who belongs to two teams does not receive the other team's events.

Authentication for the socket works like it does for REST: the token arrives as a query parameter,
because a browser WebSocket cannot send custom headers on the handshake. The API verifies the JWT
and checks team membership **before** accepting the socket, so an unauthorised client never learns
whether the project exists.

---

## Setup and run

You need Docker Desktop, or Python 3.11+ and Node.js 18+ if you prefer to run the services directly.

**Option 1 — the whole stack with Docker (recommended)**

```bash
git clone https://github.com/laxtline/TeamPulse.git
cd TeamPulse/teampulse
cp .env.example .env
# edit .env: set SECRET_KEY and NEXTAUTH_SECRET (32+ chars each),
# and GROQ_API_KEY if you want real AI answers instead of the fallbacks
docker compose up --build
```

| Service | Local URL |
|---------|-----------|
| Frontend | <http://localhost:3000> |
| Backend API (Swagger) | <http://localhost:8000/docs> |
| AI service (Swagger) | <http://localhost:8001/docs> |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |

Then load the demo data once the containers are healthy:

```bash
docker compose run --rm --no-deps backend python scripts/seed.py
```

The seed creates four users, the team Acme Corp, three projects and 26 tasks, and it checks what
already exists first, so running it twice is harmless.

**Option 2 — without Docker**

```bash
# terminal 1: just the infrastructure
docker compose up postgres redis

# terminal 2: backend
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# terminal 3: frontend
cd frontend
npm install
npm run dev
```

**Tests and checks**

| Command | What it runs | State |
|---------|--------------|-------|
| `cd frontend && npm test` | Vitest: `api.test.ts`, `utils.test.ts`, `Button.test.tsx`, `Card.test.tsx` | Passing |
| `cd frontend && npm run test:e2e` | Playwright: `auth.spec.ts`, `kanban.spec.ts`, `teams.spec.ts` | Needs the app running |
| `cd frontend && npm run type-check` | `tsc --noEmit` | Passing |
| `cd frontend && npm run lint` | ESLint with the Next.js rules | Passing |
| `cd backend && python -m py_compile app\main.py` | Syntax check | Passing |
| `cd backend && pytest` | Backend tests | **Not written yet** — the folders exist, the tests do not |

I would rather write that down than pretend the suite is complete. Backend tests are the first item
on the list below.

---

## Demo login

The live site is already seeded, so these work right now at
<https://team-pulse-lilac.vercel.app>. The same accounts exist locally after you run the seed
script.

| Role | Email | Password | What it can do |
|------|-------|----------|----------------|
| Platform admin | `admin@teampulse.ac` | `Passcode@9938` | Everything, including admin-only actions |
| Team owner (Acme Corp) | `arjun@teampulse.ac` | `Passcode@9938` | Manage the team, its projects and members |
| Team admin | `priya@teampulse.ac` | `Passcode@9938` | Invite and remove members, manage projects |
| Team member | `rohan@teampulse.ac` | `Passcode@9938` | Work on tasks, comment, move cards |

All four use the same password: `Passcode@9938`. It is a demo account on seeded data, not a real
user, so please do not put anything private in it.

To see the real-time part properly, open the same board in two browsers (or one normal window and
one private window), log in as two different people, and drag a card in one. The other updates
without a refresh, and the presence dot next to the avatar changes as the second person joins.

**OAuth login (optional)**

Google and GitHub login work on the live site. Locally they need your own OAuth apps, because the
callback URLs point at `localhost:3000`:

- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- GitHub: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

Google is in Testing mode, so add your Gmail under **OAuth consent screen → Test users**. GitHub
allows one callback URL per app, so create a second app for localhost instead of editing the
production one. The backend never sees either secret: only NextAuth talks to the provider, and it
sends the verified profile to `/api/v1/auth/oauth/{provider}`.

---

## Screenshots

I have not checked screenshots into the repository, because they go stale after every design change
and this is a small project. The live site is the honest version of a screenshot:

| What to look at | Where |
|-----------------|-------|
| Login, including both OAuth buttons | <https://team-pulse-lilac.vercel.app/login> |
| Dashboard with my tasks and the AI standup card | <https://team-pulse-lilac.vercel.app/dashboard> |
| Kanban board with drag and drop | Teams → Acme Corp → Website Redesign |
| Task detail with comments and activity | Click any card |
| Analytics | Project → Analytics |
| Settings and dark mode | Settings, then the theme toggle in the navbar |

If you want images in the README, put them in `docs/screenshots/` and replace this table with
`![Dashboard](docs/screenshots/dashboard.png)` style links. That folder is intentionally empty right
now, so there are no broken image links on GitHub.

---

## Deployment

The app runs on four free services. No credit card, and every piece has a documented free limit.

```
Browser
   │
   ├──▶ Vercel (Next.js frontend, Hobby)  ──HTTPS + Bearer token──▶  Render (FastAPI API, Docker)
   │                                                                      │        │
   │                                                                      │        └──HTTPS──▶ Render (AI service) ──▶ Groq
   │                                                                      │
   └──▶ wss:// ───────────────────────────────────────────────────────▶  │
                                                                          ├──▶ Neon (PostgreSQL 16)
                                                                          └──▶ Upstash (Redis)
```

| Piece | Host and plan | Notes |
|-------|---------------|-------|
| Frontend | Vercel Hobby | Builds on every push to `master`; `NEXT_PUBLIC_*` values are baked in at build time |
| API | Render Free, Docker | Root directory `backend`, Dockerfile `./Dockerfile.prod`, health check `/health`, auto-deploy **off** |
| AI service | Render Free, Docker | Root directory `ai-service`; separate service so a Groq problem cannot take the API down |
| Database | Neon Free | Postgres 16, direct (non-pooler) connection string |
| Redis | Upstash Free | `rediss://` URL, used for pub/sub and rate limiting |

**Backend environment variables (Render → teampulse-api)**

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | the Neon direct URL, including `?sslmode=require` |
| `REDIS_URL` | the Upstash `rediss://` URL |
| `SECRET_KEY` | 64 random hex characters |
| `ENVIRONMENT` | `production` |
| `DEBUG` | `false` |
| `FRONTEND_URL` | `https://team-pulse-lilac.vercel.app` |
| `CORS_ORIGINS` | `["https://team-pulse-lilac.vercel.app"]` |
| `AI_SERVICE_URL` | the AI service URL, public or private |

**Frontend environment variables (Vercel)**

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://teampulse-api-ep2v.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | `wss://teampulse-api-ep2v.onrender.com` |
| `BACKEND_INTERNAL_URL` | `https://teampulse-api-ep2v.onrender.com` |
| `NEXTAUTH_URL` | `https://team-pulse-lilac.vercel.app` |
| `NEXTAUTH_SECRET` | 64 hex chars, different from `SECRET_KEY` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | from Google Cloud |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | from the GitHub OAuth app |

**AI service environment variables (Render → teampulse-ai)**

| Variable | Value |
|----------|-------|
| `GROQ_API_KEY` | a free key from <https://console.groq.com> |
| `GROQ_MODEL` | optional; defaults to `openai/gpt-oss-120b` |

**OAuth callback URLs**

| Provider | Callback |
|----------|----------|
| Google | `https://team-pulse-lilac.vercel.app/api/auth/callback/google` |
| GitHub | `https://team-pulse-lilac.vercel.app/api/auth/callback/github` |

**Seeding production.** The free Render instance has no shell, so the seed runs from a laptop
against Neon:

```powershell
docker compose build backend
docker compose run --rm --no-deps -e "DATABASE_URL=<neon-url>" `
  backend python scripts/seed.py
```

That backtick is PowerShell's line continuation. In bash it is a backslash.

**Cold starts, and the ping that prevents them.** Render stops a free web service after 15 minutes
without traffic, and waking it takes 30–60 seconds. Three things deal with that: the NextAuth
callbacks retry once with a 25-second timeout, the AI service answers from a deterministic fallback
if Groq is slow, and `.github/workflows/keepalive.yml` pings `/health` every 10 minutes. Render
gives 750 instance hours per workspace per month, and one always-on service uses about 730, so the
ping is enabled only for the API, not the AI service.

**What to redeploy after a change**

| You changed | What to do |
|-------------|------------|
| Frontend code | `git push` — Vercel builds automatically |
| Backend code | `git push`, then Render → teampulse-api → Manual Deploy |
| A Render variable | Edit it, then Manual Deploy (variables are not hot-reloaded) |
| A Vercel variable | Edit it, then Deployments → Redeploy (they are baked in at build time) |
| The AI service | Same as the backend, on teampulse-ai |

**Checking it after a deploy, in this order:** `/health` (process is alive) → `/health/ready`
(Postgres and Redis are reachable) → `/docs` returns 404 (correct, because `DEBUG=false`) → log in
with a demo account → open a board and drag a card → reload and confirm the move persisted → open
DevTools → Network → WS and look for `101 Switching Protocols`.

The full runbook, with every click, every real error and the twenty fixes made during deployment,
is in **`docs/deployment-steps.pdf`** (14 pages).

---

## What I learned

- **A column that does not exist is a bug waiting to happen.** Task creation returned 503 because
  the model declared a native Postgres enum while the table had a `VARCHAR`. The fix was to store
  status as a plain string and keep the enum in Python — and to read the server log instead of
  guessing from the HTTP code.
- **`create_all()` never alters an existing table.** Adding `bio` and `theme` broke every request on
  the deployed database while local development was fine. Now `database.py` applies the two additive
  columns at boot, because the free instance has no shell to run Alembic in.
- **Cookies do not cross sites.** A cookie set by `onrender.com` is not sent to `vercel.app`, so
  OAuth logins looked successful and then had no session. Supporting `Authorization: Bearer` as a
  second path, in the same dependency, fixed it without touching a single route.
- **Refresh rotation needs a queue.** The backend revokes a refresh token as soon as it issues a new
  one, so two tabs refreshing at the same moment signed the user out. One shared refresh promise in
  `lib/api.ts` and a `refreshesInFlight` map in `lib/auth.ts` fixed it.
- **Free tiers have behaviour you have to design around.** Cold starts, PgBouncer and cached
  prepared statements, idle Redis subscriptions dropping, and rate limiting keyed per IP behind a
  proxy that makes every visitor the same IP. None of that appears in a tutorial.
- **Optimistic UI is a promise, not a trick.** The card moves first and the server confirms; if it
  fails, the change has to be rolled back visibly, otherwise the user believes something was saved
  when it was not.

---

## Known limitations

- **No backend tests yet.** The pytest folders are scaffolded and empty. Frontend coverage is four
  unit test files and three Playwright flows, not a full suite.
- **Password reset is a stub.** `/auth/forgot-password` and `/auth/reset-password` return success
  without sending an email. There is no email provider wired up.
- **Invitations are direct.** A member is added by email immediately; there is no accept or decline
  step and no invitation token.
- **No pagination.** Task and comment lists return everything. Fine at 26 seeded tasks, not fine at
  26,000.
- **No file attachments.** Avatars are URLs, not uploads, so there is no upload path to secure.
- **Search is a title filter**, not Postgres full-text search.
- **Logs only, no metrics.** No Sentry, no tracing, no alerting.
- **Two temporary debug endpoints are still in the repository**
  (`backend/app/api/v1/diagnostics.py` and `frontend/src/app/api/debug/`). They are harmless, and
  they are first on the list to delete.
- **The free API sleeps.** A demo after a quiet hour starts with a 30–60 second wait, which is the
  host, not the code.

None of these are hidden. A short honest list is worth more than a claim that everything is
finished, and it is also the roadmap: backend tests, real email, invitation tokens, pagination.

---

## Contact

- **Email:** suryakant321pradhan@gmail.com
- **Location:** Bhubaneswar, Odisha, India
- **GitHub:** [laxtline](https://github.com/laxtline)
- **LinkedIn:** [Suryakanta Pradhan](https://www.linkedin.com/in/suryakanta-pradhan-b4179b27a/)
- **Instagram:** [@surya.pradhan\_](https://www.instagram.com/surya.pradhan_/)

---

© 2025–2026 Suryakanta Pradhan. Built for learning and a placement portfolio.
