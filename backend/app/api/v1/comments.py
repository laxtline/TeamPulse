from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from app.schemas.comment import CommentCreate, CommentUpdate, CommentResponse
from app.services.comment import CommentService
from app.dependencies.auth import get_current_user, get_db
from app.models.user import User
from app.models.project import Project
from app.models.task import Task
from app.models.team import TeamMember
from app.services.websocket import manager

router = APIRouter(prefix="/tasks/{task_id}/comments", tags=["comments"])


async def _team_id_for_task(db: AsyncSession, task_id: uuid.UUID):
    """Comments are broadcast on the team channel, so walk task -> project."""
    result = await db.execute(
        select(Project.team_id)
        .join(Task, Task.project_id == Project.id)
        .where(Task.id == task_id)
    )
    return result.scalar_one_or_none()


def _actor(user: User) -> dict:
    return {"id": str(user.id), "name": user.full_name}


def _to_response(comment, user: User) -> CommentResponse:
    return CommentResponse(
        id=comment.id,
        task_id=comment.task_id,
        user_id=comment.user_id,
        user=user,
        content=comment.content,
        created_at=comment.created_at,
        updated_at=comment.updated_at
    )


@router.post("", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    task_id: uuid.UUID,
    data: CommentCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = CommentService(db)
    comment = await service.create_comment(task_id, current_user.id, data)
    response = _to_response(comment, current_user)

    team_id = await _team_id_for_task(db, task_id)
    if team_id:
        payload = response.model_dump(mode="json")
        payload["actor"] = _actor(current_user)
        background_tasks.add_task(manager.publish_event, team_id, "comment:created", payload)

    return response


@router.get("", response_model=list[CommentResponse])
async def list_comments(
    task_id: uuid.UUID,
    page: int = 1,
    size: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = CommentService(db)
    comments = await service.get_task_comments(task_id, current_user.id, page, size)

    result = []
    for c in comments:
        result.append(CommentResponse(
            id=c.id,
            task_id=c.task_id,
            user_id=c.user_id,
            user=c.user,
            content=c.content,
            created_at=c.created_at,
            updated_at=c.updated_at
        ))
    return result


@router.patch("/{comment_id}", response_model=CommentResponse)
async def update_comment(
    task_id: uuid.UUID,
    comment_id: uuid.UUID,
    data: CommentUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = CommentService(db)
    comment = await service.update_comment(comment_id, current_user.id, data)
    response = _to_response(comment, current_user)

    team_id = await _team_id_for_task(db, task_id)
    if team_id:
        payload = response.model_dump(mode="json")
        payload["actor"] = _actor(current_user)
        background_tasks.add_task(manager.publish_event, team_id, "comment:updated", payload)

    return response


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    task_id: uuid.UUID,
    comment_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = CommentService(db)
    # Get user role in team for permission check
    task_result = await db.execute(select(Task).where(Task.id == task_id))
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    member_result = await db.execute(
        select(TeamMember)
        .join(Project, Project.team_id == TeamMember.team_id)
        .where(Project.id == task.project_id, TeamMember.user_id == current_user.id)
    )
    member = member_result.scalar_one_or_none()
    user_role = member.role if member else "viewer"

    await service.delete_comment(comment_id, current_user.id, user_role)

    team_id = await _team_id_for_task(db, task_id)
    if team_id:
        background_tasks.add_task(
            manager.publish_event,
            team_id,
            "comment:deleted",
            {"comment_id": str(comment_id), "task_id": str(task_id), "user": _actor(current_user)},
        )
