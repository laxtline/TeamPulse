# TeamPulse

**Real-time team collaboration platform with AI features.**

A Kanban board where a small team can create projects, add and move tasks, comment on them, and see each other's changes live. There's also a small AI service that writes a daily standup summary and suggests task priorities.

I built this as my main portfolio project to learn how real-time apps, authentication and deployment actually work. Almost everything runs on free tiers.

---

## Live Demo

| What | Link |
|------|------|
| **Frontend** | https://team-pulse-lilac.vercel.app |
| **Backend API (Swagger)** | https://teampulse-api-ep2v.onrender.com/docs |
| **AI Service (Swagger)** | https://teampulse-ai-trwr.onrender.com/docs |

**Demo login** (data is already seeded on the live site):

```
Email:    arjun@teampulse.ac
Password: Passcode@9938
```

You can also log in as `admin@teampulse.ac` with the same password to see the admin role.

> The backend runs on Render's free plan, so the first request after a break may take 30-50 seconds while the instance wakes up. After that it's normal speed.

---

## About the Project

TeamPulse is a small clone of tools like Trello or Jira, built to practise the parts that are hard to learn from tutorials:

- keeping multiple browsers in sync in real time
- auth that doesn't store tokens in localStorage
- splitting one app into a frontend, a backend and an AI service
- deploying all of it for free without a credit card

It's a student project, so the scope is a small team (4-5 users) rather than a company.

---

## Features

### Teams and projects
- Create a team, add members, admin and member roles
- Group work into projects inside a team
- Each project has its own board, analytics and settings

### Kanban board
- Drag and drop tasks between Todo, In Progress, Review and Done
- Change priority, assign a member, set a due date and story points
- Task detail page with description and threaded comments

### Real-time
- WebSocket connection per project
- Redis pub/sub so every connected client gets the change immediately
- No refresh needed when a teammate moves or edits a task

### AI
- **Standup summary** - short summary of what moved and what is pending
- **Priority suggestion** - suggests a priority from the task title and description
- Both live in a separate FastAPI service that talks to Groq (Llama 3.3 70B)

### Auth and account
- Email/password login and register
- Google and GitHub OAuth
- JWT stored in httpOnly cookies, with refresh token rotation
- Settings page: profile, password, notifications, theme (all saved in the database)

### UI
- Responsive layout, works on mobile
- Dark mode
- Simple charts for velocity and workload

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, TanStack Query, Zustand, dnd-kit, Recharts, NextAuth v5 |
| **Backend** | FastAPI, SQLAlchemy 2.0 (async), Alembic, PostgreSQL, Redis, JWT (httpOnly cookies) |
| **AI Service** | FastAPI, Groq (Llama 3.3 70B) |
| **Real-time** | WebSocket + Redis pub/sub |
| **Testing** | Vitest + Testing Library (unit), Playwright (e2e) |
| **Deployment** | Docker locally, Vercel + Render + Neon + Upstash in production |

---

## Folder Structure

```
teampulse/
├── frontend/                     # Next.js 14 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/           # login, register, forgot password
│   │   │   ├── (dashboard)/      # dashboard, teams, projects, task detail, settings
│   │   │   └── api/auth/         # NextAuth route handler
│   │   ├── components/
│   │   │   ├── ai/               # standup summary, priority indicator
│   │   │   ├── charts/           # velocity and workload charts
│   │   │   ├── kanban/           # board, columns, task modal
│   │   │   ├── layout/           # sidebar, header, protected route
│   │   │   ├── tasks/            # task card, activity log
│   │   │   ├── teams/            # team and member modals
│   │   │   └── ui/               # button, input, card, etc.
│   │   ├── hooks/                # custom hooks
│   │   ├── lib/                  # api client, auth config, helpers
│   │   ├── store/                # Zustand stores
│   │   ├── styles/
│   │   └── types/                # shared TypeScript types
│   ├── e2e/                      # Playwright tests
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── package.json
│
├── backend/                      # FastAPI application
│   ├── app/
│   │   ├── api/v1/               # auth, teams, projects, tasks, comments, ai, notifications, websocket
│   │   ├── core/                 # config, security, database, redis
│   │   ├── dependencies/         # db session, current user, rate limiting
│   │   ├── middleware/           # request logging, security headers
│   │   ├── models/               # SQLAlchemy models
│   │   ├── schemas/              # Pydantic schemas
│   │   ├── services/             # business logic
│   │   ├── tasks/                # background tasks
│   │   └── main.py               # app entry point
│   ├── alembic/                  # database migrations
│   ├── scripts/seed.py           # demo data
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── requirements.txt
│
├── ai-service/                   # AI microservice
│   ├── main.py                   # FastAPI endpoints
│   ├── groq_client.py            # Groq API wrapper
│   ├── prompts.py                # prompt templates
│   ├── schemas.py                # request/response models
│   ├── Dockerfile
│   └── Dockerfile.prod
│
├── docs/                         # project report, presentation, notes
├── docker-compose.yml            # local development stack
├── docker-compose.test.yml       # isolated test stack
├── docker-compose.prod.yml       # production images
├── DEPLOY.md                     # how I deployed it for free
├── .env.example
└── README.md
```

---

## Setup and Run

### Requirements
- Docker and Docker Compose
- Optional: Node.js 18+ and Python 3.11+ if you want to run the frontend or backend outside Docker

### Steps

```bash
# 1. Clone
git clone https://github.com/laxtline/TeamPulse.git
cd TeamPulse/teampulse

# 2. Create the environment file
cp .env.example .env
```

Open `.env` and set at least:

```
SECRET_KEY=<any 32+ character random string>
NEXTAUTH_SECRET=<any 32+ character random string>
GROQ_API_KEY=<your Groq key>     # optional, only needed for the AI features
```

```bash
# 3. Build and start everything
docker compose up --build
```

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **Backend API (Swagger)** | http://localhost:8000/docs |
| **AI Service (Swagger)** | http://localhost:8001/docs |

### Seed the demo data

```bash
docker compose run --rm --no-deps backend python scripts/seed.py
```

This creates:
- 4 demo users (1 admin + 3 members)
- 1 team: Acme Corp
- 4 projects with Kanban boards
- around 26 sample tasks

---

## Demo Login Credentials

After seeding, log in at **http://localhost:3000**:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@teampulse.ac` | `Passcode@9938` |
| **Owner** | `arjun@teampulse.ac` | `Passcode@9938` |
| **Member** | `priya@teampulse.ac` | `Passcode@9938` |
| **Member** | `rohan@teampulse.ac` | `Passcode@9938` |

> All four accounts use the same password: `Passcode@9938`
> The live demo already has this data, so you can log in without seeding anything.

---

## OAuth Login (Optional)

Add these to `.env` if you want the Google and GitHub buttons to work:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

Callback URLs:

- Local: `http://localhost:3000/api/auth/callback/google` and `http://localhost:3000/api/auth/callback/github`
- Production: `https://team-pulse-lilac.vercel.app/api/auth/callback/google` and `.../github`

If you skip this, the email/password login still works fine.

---

## Testing

```bash
cd frontend

npm test              # Vitest unit tests
npm run test:e2e      # Playwright e2e (app needs to be running)
npm run type-check    # tsc --noEmit
npm run lint
```

What is covered:
- Unit tests for the API helper, utility functions and a couple of UI components
- End-to-end specs for login, the Kanban board and teams

**Backend tests are not written yet.** That's the next thing I want to add.

---

## Deployment

```
Vercel (frontend)  ->  Render (FastAPI backend)  ->  Neon (PostgreSQL)
                              |
                              +-> Upstash (Redis)

Render (AI service, Groq)
```

Everything uses free plans, no credit card:
- **Vercel** Hobby for the frontend
- **Render** Free for the backend and the AI service
- **Neon** Free for PostgreSQL
- **Upstash** Free for Redis

The exact environment variables and the order I deployed things in are written in `DEPLOY.md`.

---

## Known Limitations

I'd rather list these than pretend the project is perfect:

- The free Render instance sleeps after inactivity, so the first request can be slow.
- The AI features need a valid Groq key and quota. If either is missing, the UI shows a message instead of breaking.
- No backend unit tests yet.
- Real-time sync is designed for a small number of users, not a large team.
- Screenshots are not added to the README yet. The project report and presentation are in the `docs/` folder.

---

## What I Learned

- How JWT auth works properly, including refresh token rotation and why tokens should not sit in localStorage
- How WebSockets and Redis pub/sub keep several clients in sync
- Writing async SQLAlchemy queries and keeping the API layer separate from business logic
- Debugging real deployment issues: CORS, environment variables, cold starts, OAuth redirect URLs
- That most of the work in a full-stack app is the small things between the features

---

## License

This project is for **educational and portfolio purposes**. No licence is declared, but you're welcome to read it and learn from it.

---

## Author

**Suryakanta Pradhan**
Final year student, aspiring full-stack developer.

- GitHub: https://github.com/laxtline
- LinkedIn: https://www.linkedin.com/in/suryakanta-pradhan-b4179b27a/
- Email: laxtline@gmail.com

Built with Next.js 14, FastAPI, PostgreSQL, Redis and a lot of debugging.
