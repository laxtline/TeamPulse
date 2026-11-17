# TeamPulse Backend

FastAPI backend for TeamPulse - Real-time team collaboration platform with AI insights.

## Tech Stack

- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with SQLAlchemy 2.0 (async)
- **Migrations**: Alembic
- **Cache/PubSub**: Redis
- **Auth**: JWT (httpOnly cookies) + OAuth2 (Google, GitHub)
- **Real-time**: WebSockets + Redis pub/sub
- **AI**: Groq Llama 3.3 70B (separate microservice)
- **Testing**: pytest + TestClient
- **Linting**: Ruff + MyPy

## Quick Start

```bash
# Install dependencies
pip install -r requirements-dev.txt

# Set up environment
cp .env.example .env.local
# Edit .env.local with your values

# Run migrations
alembic upgrade head

# Seed demo data
python scripts/seed.py

# Start development server
uvicorn app.main:app --reload
```

## Project Structure

```
backend/
├── app/
│   ├── api/v1/           # API routes
│   ├── core/             # Config, database, security, exceptions
│   ├── models/           # SQLAlchemy models
│   ├── schemas/          # Pydantic schemas
│   ├── services/         # Business logic
│   ├── websocket/        # WebSocket handling
│   ├── tasks/            # Background tasks
│   ├── dependencies/     # FastAPI dependencies
│   ├── middleware/       # Custom middleware
│   └── main.py           # App entry point
├── alembic/              # Database migrations
├── tests/                # Tests
├── scripts/              # Utility scripts
└── requirements*.txt     # Dependencies
```

## API Endpoints

### Auth
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user

### Teams
- `POST /api/v1/teams` - Create team
- `GET /api/v1/teams` - List user's teams
- `GET /api/v1/teams/{team_id}` - Get team details
- `PATCH /api/v1/teams/{team_id}` - Update team
- `DELETE /api/v1/teams/{team_id}` - Delete team
- `POST /api/v1/teams/{team_id}/members` - Invite member
- `PATCH /api/v1/teams/{team_id}/members/{user_id}` - Update member role
- `DELETE /api/v1/teams/{team_id}/members/{user_id}` - Remove member

### Projects
- `POST /api/v1/teams/{team_id}/projects` - Create project
- `GET /api/v1/teams/{team_id}/projects` - List projects
- `GET /api/v1/projects/{project_id}` - Get project details
- `PATCH /api/v1/projects/{project_id}` - Update project
- `DELETE /api/v1/projects/{project_id}` - Archive project

### Tasks
- `POST /api/v1/projects/{project_id}/tasks` - Create task
- `GET /api/v1/projects/{project_id}/tasks` - List tasks (with filters)
- `GET /api/v1/tasks/{task_id}` - Get task details
- `PATCH /api/v1/tasks/{task_id}` - Update task
- `PATCH /api/v1/tasks/{task_id}/move` - Move task (status + position)
- `PATCH /api/v1/tasks/{task_id}/assign` - Assign task
- `POST /api/v1/tasks/{task_id}/priority` - Get AI priority score
- `DELETE /api/v1/tasks/{task_id}` - Delete task

### Comments
- `POST /api/v1/tasks/{task_id}/comments` - Add comment
- `GET /api/v1/tasks/{task_id}/comments` - List comments
- `PATCH /api/v1/comments/{comment_id}` - Edit comment
- `DELETE /api/v1/comments/{comment_id}` - Delete comment

### AI
- `POST /api/v1/ai/standup-summary` - Generate standup summary
- `POST /api/v1/ai/task-priority` - Score task priority
- `GET /api/v1/ai/insights/{project_id}` - Project AI insights

### WebSocket
- `WS /api/v1/ws/{team_id}?token=<access_token>` - Real-time updates

## Environment Variables

See `.env.example` for all required variables.

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=term-missing
```

## Linting & Type Checking

```bash
# Lint
ruff check .

# Type check
mypy app

# Fix linting issues
ruff check . --fix
```

## Deployment

```bash
# Build production image
docker build -f Dockerfile.prod -t teampulse-backend .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```