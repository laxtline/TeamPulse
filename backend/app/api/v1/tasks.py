from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from typing import Optional
from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskMove,
    TaskAssign,
    TaskResponse,
    TaskDetailResponse,
)
from app.schemas.ai import TaskPriorityRequest, TaskPriorityResponse
from app.services.task import TaskService
from app.services.ai import AIService
from app.dependencies.auth import get_current_user, get_db
from app.models.user import User

router = APIRouter(prefix="/projects/{project_id}/tasks", tags=["tasks"])


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    project_id: uuid.UUID,
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = TaskService(db)
    task = await service.create_task(project_id, current_user.id, data)
    return TaskResponse.model_validate(task)


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    project_id: uuid.UUID,
    status: Optional[str] = None,
    assignee_id: Optional[uuid.UUID] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = TaskService(db)
    tasks = await service.get_project_tasks(
        project_id, current_user.id,
        status=status, assignee_id=assignee_id,
        priority=priority, search=search
    )
    return [TaskResponse.model_validate(t) for t in tasks]


@router.get("/{task_id}", response_model=TaskDetailResponse)
async def get_task(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = TaskService(db)
    task = await service.get_task(task_id, current_user.id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if str(task.project_id) != str(project_id):
        raise HTTPException(status_code=404, detail="Task not found in this project")

    return _task_detail(task)


# The task page only knows the task id, so expose a flat lookup as well.
direct_router = APIRouter(prefix="/tasks", tags=["tasks"])


@direct_router.get("/{task_id}", response_model=TaskDetailResponse)
async def get_task_by_id(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = TaskService(db)
    task = await service.get_task(task_id, current_user.id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _task_detail(task)


def _task_detail(task) -> TaskDetailResponse:
    from app.schemas.task import UserBrief, CommentResponse, ActivityResponse

    assignee = None
    if task.assignee:
        assignee = UserBrief(
            id=task.assignee.id,
            email=task.assignee.email,
            full_name=task.assignee.full_name,
            avatar_url=task.assignee.avatar_url
        )

    reporter = None
    if task.reporter:
        reporter = UserBrief(
            id=task.reporter.id,
            email=task.reporter.email,
            full_name=task.reporter.full_name,
            avatar_url=task.reporter.avatar_url
        )

    comments = []
    for c in task.comments:
        comments.append(CommentResponse(
            id=c.id,
            task_id=c.task_id,
            user_id=c.user_id,
            user=UserBrief(
                id=c.user.id,
                email=c.user.email,
                full_name=c.user.full_name,
                avatar_url=c.user.avatar_url
            ),
            content=c.content,
            created_at=c.created_at,
            updated_at=c.updated_at
        ))

    activities = []
    for a in task.activities:
        activities.append(ActivityResponse(
            id=a.id,
            task_id=a.task_id,
            user_id=a.user_id,
            user=UserBrief(
                id=a.user.id,
                email=a.user.email,
                full_name=a.user.full_name,
                avatar_url=a.user.avatar_url
            ),
            action=a.action,
            old_value=a.old_value,
            new_value=a.new_value,
            created_at=a.created_at
        ))

    return TaskDetailResponse(
        id=task.id,
        project_id=task.project_id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        assignee_id=task.assignee_id,
        reporter_id=task.reporter_id,
        story_points=task.story_points,
        position=task.position,
        due_date=task.due_date,
        completed_at=task.completed_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
        assignee=assignee,
        reporter=reporter,
        comments=comments,
        activities=activities
    )


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = TaskService(db)
    task = await service.update_task(task_id, current_user.id, data)
    if str(task.project_id) != str(project_id):
        raise HTTPException(status_code=404, detail="Task not found in this project")
    return TaskResponse.model_validate(task)


@router.patch("/{task_id}/move", response_model=TaskResponse)
async def move_task(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    data: TaskMove,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = TaskService(db)
    task = await service.move_task(task_id, current_user.id, data)
    if str(task.project_id) != str(project_id):
        raise HTTPException(status_code=404, detail="Task not found in this project")

    from app.services.websocket import manager
    background_tasks.add_task(
        manager.publish_event,
        task.project_id,  # This should be team_id - we'll fix in service
        "task:moved",
        {
            "task_id": str(task.id),
            "old_status": data.status,  # We don't have old status here
            "new_status": task.status,
            "position": task.position,
            "user": {"id": str(current_user.id), "name": current_user.full_name}
        }
    )

    return TaskResponse.model_validate(task)


@router.patch("/{task_id}/assign", response_model=TaskResponse)
async def assign_task(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    data: TaskAssign,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = TaskService(db)
    task = await service.assign_task(task_id, current_user.id, data)
    if str(task.project_id) != str(project_id):
        raise HTTPException(status_code=404, detail="Task not found in this project")
    return TaskResponse.model_validate(task)


@router.post("/{task_id}/priority", response_model=TaskPriorityResponse)
async def get_task_priority(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = TaskService(db)
    task = await service.get_task(task_id, current_user.id)
    if not task or str(task.project_id) != str(project_id):
        raise HTTPException(status_code=404, detail="Task not found")

    ai_service = AIService()
    try:
        request = TaskPriorityRequest(
            task_title=task.title,
            task_description=task.description,
            due_date=task.due_date.isoformat() if task.due_date else None,
            assignee_workload=0,  # Could calculate from other tasks
            project_velocity=0.0  # Could calculate from completed tasks
        )
        response = await ai_service.score_task_priority(request)
    finally:
        await ai_service.close()

    return response


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = TaskService(db)
    task = await service.get_task(task_id, current_user.id)
    if not task or str(task.project_id) != str(project_id):
        raise HTTPException(status_code=404, detail="Task not found in this project")
    await service.delete_task(task_id, current_user.id)