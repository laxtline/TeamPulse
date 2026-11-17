from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.schemas.ai import (
    StandupSummaryRequest,
    StandupSummaryResponse,
    TaskPriorityRequest,
    TaskPriorityResponse,
    ProjectInsightsRequest,
    ProjectInsightsResponse,
)
from app.services.ai import AIService
from app.services.task import TaskService
from app.services.activity import ActivityService
from app.dependencies.auth import get_current_user, get_db
from app.models.user import User
from app.models.project import Task

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/standup-summary", response_model=StandupSummaryResponse)
async def generate_standup_summary(
    request: StandupSummaryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ai_service = AIService()
    try:
        response = await ai_service.generate_standup_summary(request)
    finally:
        await ai_service.close()
    return response


@router.post("/task-priority", response_model=TaskPriorityResponse)
async def score_task_priority(
    request: TaskPriorityRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ai_service = AIService()
    try:
        response = await ai_service.score_task_priority(request)
    finally:
        await ai_service.close()
    return response


@router.get("/insights/{project_id}", response_model=ProjectInsightsResponse)
async def get_project_insights(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    task_service = TaskService(db)
    tasks = await task_service.get_project_tasks(project_id, current_user.id)

    ai_service = AIService()
    try:
        response = await ai_service.get_project_insights(str(project_id))
    finally:
        await ai_service.close()

    return ProjectInsightsResponse(**response)


@router.post("/my-standup", response_model=StandupSummaryResponse)
async def get_my_standup(
    date: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.models.activity import Activity
    from sqlalchemy import select

    activity_service = ActivityService(db)
    activities = await activity_service.get_task_activities(current_user.id, limit=50)

    formatted_activities = []
    for a in activities:
        formatted_activities.append({
            "action": a.action,
            "task_title": a.new_value.get("title") if a.new_value else a.old_value.get("title") if a.old_value else "Unknown",
            "task_status": a.new_value.get("status") if a.new_value else "unknown",
            "timestamp": a.created_at.strftime("%H:%M"),
            "user_name": a.user.full_name if a.user else "Unknown"
        })

    ai_service = AIService()
    try:
        request = StandupSummaryRequest(
            user_name=current_user.full_name,
            activities=formatted_activities,
            date=date
        )
        response = await ai_service.generate_standup_summary(request)
    finally:
        await ai_service.close()

    return response