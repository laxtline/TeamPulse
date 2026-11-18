# TeamPulse

**Real-time team collaboration platform** with AI-powered insights — Kanban boards, live updates, and smart task prioritization.

Built as a full-stack application demonstrating modern web development practices, real-time architectures, and AI integration.

---

## 🎯 Project Overview

TeamPulse is a **real-time collaboration tool** designed for agile teams. It combines a responsive Kanban board with AI-powered features (standup summaries, task priority scoring) and real-time synchronization across team members via WebSockets.

**Purpose:** Demonstrate proficiency in full-stack development, real-time systems, authentication, and AI integration — built for academic/placement portfolio.

---

## 🛠 Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, TanStack Query, Zustand, dnd-kit, Recharts, NextAuth v5 |
| **Backend** | FastAPI (Python), SQLAlchemy 2.0 (async), Alembic, PostgreSQL, Redis, JWT (httpOnly cookies) |
| **AI Service** | FastAPI, Groq (Llama 3.3 70B) — standup summaries & task priority scoring |
| **Infrastructure** | Docker, Docker Compose, PostgreSQL, Redis (Upstash) |
| **Auth** | NextAuth v5 — Credentials + OAuth2 (Google, GitHub), JWT with refresh rotation |
| **Real-time** | WebSocket + Redis pub/sub for live Kanban updates |
| **Testing** | Pytest (backend), Vitest + Playwright (frontend) |

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **Teams & Roles** | Create teams, invite members, role-based access control (admin/member) |
| **Projects** | Organize work into projects within a team |
| **Kanban Board** | Drag-and-drop tasks across statuses with ordering, assignment, priorities |
| **Real-time Sync** | WebSocket + Redis pub/sub keeps all clients in sync instantly |
| **Task Collaboration** | Threaded comments, task detail views, due dates, story points |
| **AI Insights** | Daily standup summaries, AI task priority scoring, per-project analytics |
| **Secure Auth** | JWT in httpOnly cookies, refresh token rotation, OAuth2 (Google/GitHub) |
| **Analytics** | Project dashboards with velocity charts, workload distribution |
| **Responsive UI** | Mobile-friendly, dark mode, accessible components |

---

## 📁 Folder Structure

```
teampulse/
├── frontend/                    # Next.js 14 application
│   ├── src/
│   │   ├── app/                 # App Router pages & layouts
│   │   │   ├── (auth)/          # Login, Register, Forgot Password
│   │   │   ├── (dashboard)/     # Protected dashboard routes
│   │   │   └── api/auth/        # NextAuth route handler
│   │   ├── components/          # Reusable UI components
│   │   │   ├── ui/              # Base components (Button, Input, Card, etc.)
│   │   │   ├── layout/          # Sidebar, Header, ProtectedRoute
│   │   │   ├── tasks/           # Kanban board, Task cards, Activity log
│   │   │   ├── teams/           # Team management modals/tables
│   │   │   ├── charts/          # Velocity, Workload charts
│   │   │   └── ai/              # Standup summary, Priority indicator
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # Utilities, API client, Auth config
│   │   ├── store/               # Zustand state management
│   │   └── types/               # TypeScript type definitions
│   ├── Dockerfile / Dockerfile.prod
│   └── package.json
│
├── backend/                      # FastAPI application
│   ├── app/
│   │   ├── api/v1/              # REST endpoints (auth, teams, projects, tasks, ai)
│   │   ├── models/              # SQLAlchemy models (User, Team, Project, Task, etc.)
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── services/            # Business logic layer
│   │   ├── core/                # Config, security, database, redis
│   │   ├── middleware/          # Logging, security headers
│   │   └── main.py              # FastAPI app entry point
│   ├── alembic/                 # Database migrations
│   ├── scripts/                 # Seed script for demo data
│   ├── Dockerfile / Dockerfile.prod
│   └── requirements.txt
│
├── ai-service/                   # AI microservice (Groq/Llama)
│   ├── main.py                  # FastAPI endpoints
│   ├── groq_client.py           # Groq API wrapper
│   ├── prompts.py               # Prompt templates
│   └── Dockerfile / Dockerfile.prod
│
├── docker-compose.yml            # Local development stack
├── docker-compose.test.yml       # Isolated test stack
├── docker-compose.prod.yml       # Production images
├── .env.example                  # Environment template
└── README.md
```

---

## 🚀 Setup & Run Instructions

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local frontend dev)
- Python 3.11+ (for local backend dev)

### Quick Start (Docker — Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/laxtline/TeamPulse.git
cd TeamPulse/teampulse

# 2. Create environment file from template
cp .env.example .env
# Edit .env — at minimum set:
#   SECRET_KEY=your-32-char-secret
#   NEXTAUTH_SECRET=your-32-char-secret
#   GROQ_API_KEY=your-groq-key (optional, for AI features)

# 3. Build and start all services
docker compose up --build
```

| Service | Local URL |
|---------|-----------|
| **Frontend** | http://localhost:3000 |
| **Backend API (Swagger)** | http://localhost:8000/docs |
| **AI Service (Swagger)** | http://localhost:8001/docs |

### Seed Demo Data (Optional)
```bash
# After containers are running, run the seed script
docker compose run --rm --no-deps backend python scripts/seed.py
```

This creates:
- 4 demo users (1 admin + 3 members)
- 1 team: "Acme Corp"
- 3 projects with Kanban boards
- 26 sample tasks across statuses

---

## 🔐 Demo Login Credentials

After seeding, use these credentials to log in at **http://localhost:3000**:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@teampulse.ac` | `Passcode@9938` |
| **Member** | `arjun@teampulse.ac` | `Passcode@9938` |
| **Member** | `priya@teampulse.ac` | `Passcode@9938` |
| **Member** | `rohan@teampulse.ac` | `Passcode@9938` |

> **Note:** All accounts use the same password: `Passcode@9938`

### OAuth Login (Optional)
Configure in `.env` to enable:
- **Google OAuth** — `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **GitHub OAuth** — `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

---

## 🌐 Live Demo / Screenshots

### Live Deployment
| Environment | URL |
|-------------|-----|
| **Frontend (Vercel)** | [https://team-pulse-lilac.vercel.app](https://team-pulse-lilac.vercel.app) |
| **Backend API (Render)** | [https://teampulse-api-ep2v.onrender.com](https://teampulse-api-ep2v.onrender.com) |
| **AI Service (Render)** | [https://teampulse-ai-trwr.onrender.com](https://teampulse-ai-trwr.onrender.com) |

> **Demo Login:** `arjun@teampulse.ac` / `Passcode@9938`

### Screenshots

| View | Preview |
|------|---------|
| **Login Page** | ![Login](docs/screenshots/login.png) |
| **Dashboard** | ![Dashboard](docs/screenshots/dashboard.png) |
| **Kanban Board** | ![Kanban](docs/screenshots/kanban.png) |
| **Task Detail** | ![Task Detail](docs/screenshots/task-detail.png) |
| **AI Standup Summary** | ![AI Standup](docs/screenshots/ai-standup.png) |
| **Analytics** | ![Analytics](docs/screenshots/analytics.png) |
| **Team Management** | ![Teams](docs/screenshots/teams.png) |

> **To add screenshots:** Place images in `docs/screenshots/` and update the table above.

---

## 🧪 Testing

```bash
# Backend tests
cd backend && pytest

# Frontend unit tests
cd frontend && npm test

# Frontend E2E tests (Playwright)
cd frontend && npm run test:e2e

# Type checking & linting
cd frontend && npm run type-check && npm run lint
cd backend && ruff check . && mypy app
```

---

## 📦 Deployment Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Vercel    │────▶│   Render    │────▶│    Neon     │
│  (Frontend) │     │  (Backend)  │     │ (PostgreSQL)│
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Upstash   │
                    │   (Redis)   │
                    └─────────────┘
```

**Free-tier friendly:** Vercel (Hobby) + Render (Free) + Neon (Free) + Upstash (Free)

---

## 📄 License

This project is for **educational and portfolio purposes**. No license declared — feel free to reference for learning.

---

## 👨‍💻 Author

**Surya** — Final Year Student / Aspiring Full-Stack Developer  
[GitHub](https://github.com/laxtline) • [LinkedIn](https://linkedin.com/in/your-profile) • [Email](mailto:your.email@example.com)

---

> **Built with:** Next.js 14, FastAPI, PostgreSQL, Redis, Groq AI, Docker  
> **Status:** Actively maintained for placement portfolio