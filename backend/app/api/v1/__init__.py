from app.api.v1 import auth, teams, projects, tasks, comments, ai, websocket
from fastapi import APIRouter

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(teams.router)
api_router.include_router(projects.router)
api_router.include_router(tasks.router)
api_router.include_router(tasks.direct_router)
api_router.include_router(comments.router)
api_router.include_router(ai.router)
api_router.include_router(websocket.router)


@api_router.get("/health")
async def health_check():
    return {"status": "ok", "service": "teampulse-backend"}