from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from datetime import datetime, timezone
from app.schemas.ai import (
    StandupSummaryRequest,
    StandupSummaryResponse,
    TaskPriorityRequest,
    TaskPriorityResponse,
    ProjectInsightsRequest,
    ProjectInsightsResponse,
    ProjectSummaryRequest,
)
from app.services.ai import AIService
from app.services.task import TaskService
from app.services.activity import ActivityService
from app.dependencies.auth import get_current_user, get_db
from app.models.user import User
from app.models.task import Task
from app.models.project import Project

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
    project = await db.get(Project, project_id)

    status_counts: dict[str, int] = {}
    for task in tasks:
        status_counts[task.status] = status_counts.get(task.status, 0) + 1

    workload: dict[str, dict] = {}
    for task in tasks:
        name = task.assignee.full_name if task.assignee else "Unassigned"
        entry = workload.setdefault(name, {"user": name, "tasks": 0, "points": 0})
        entry["tasks"] += 1
        entry["points"] += task.story_points or 0

    now = datetime.now(timezone.utc)
    total_points = sum(task.story_points or 0 for task in tasks)
    done_points = sum(task.story_points or 0 for task in tasks if task.status == "done")
    overdue = sum(
        1
        for task in tasks
        if task.due_date and task.status != "done" and task.due_date < now
    )

    summary_request = ProjectSummaryRequest(
        project_name=project.name if project else "This project",
        total_tasks=len(tasks),
        status_counts=status_counts,
        total_points=total_points,
        done_points=done_points,
        overdue=overdue,
        workload=sorted(workload.values(), key=lambda item: item["tasks"], reverse=True),
    )

    ai_service = AIService()
    try:
        ai_summary = await ai_service.generate_project_summary(summary_request)
    finally:
        await ai_service.close()

    return ProjectInsightsResponse(
        velocity_trend=[
            {"status": name, "count": count} for name, count in status_counts.items()
        ],
        workload_distribution=list(workload.values()),
        ai_summary=ai_summary,
    )


@router.post("/my-standup", response_model=StandupSummaryResponse)
async def get_my_standup(
    date: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.models.comment import Activity
    from sqlalchemy import select

    activity_service = ActivityService(db)
    activities = await activity_service.get_user_activities(current_user.id, limit=50)

    formatted_activities = []
    for a in activities:
        new_value = a.new_value or {}
        old_value = a.old_value or {}
        formatted_activities.append({
            "action": a.action,
            "task_title": new_value.get("title") or old_value.get("title") or "Unknown",
            "task_status": new_value.get("status") or old_value.get("status") or "unknown",
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