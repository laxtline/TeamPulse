from typing import Optional
import uuid
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload
from app.models.comment import Comment
from app.models.project import Task
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentUpdate
from app.core.exceptions import NotFoundError, ForbiddenError
from app.services.activity import ActivityService


class CommentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.activity_service = ActivityService(db)

    async def create_comment(self, task_id: uuid.UUID, user_id: uuid.UUID, data: CommentCreate) -> Comment:
        task_result = await self.db.execute(select(Task).where(Task.id == task_id))
        task = task_result.scalar_one_or_none()
        if not task:
            raise NotFoundError("Task", task_id)

        if not await self._is_project_member(task.project_id, user_id):
            raise ForbiddenError("Not a project member")

        comment = Comment(task_id=task_id, user_id=user_id, content=data.content)
        self.db.add(comment)
        await self.db.flush()

        await self.activity_service.log(
            task_id=task_id,
            user_id=user_id,
            action="commented",
            new_value={"comment_id": str(comment.id), "content": data.content[:100]}
        )

        await self.db.commit()
        await self.db.refresh(comment)
        return comment

    async def get_task_comments(self, task_id: uuid.UUID, user_id: uuid.UUID, page: int = 1, size: int = 50) -> list[Comment]:
        task_result = await self.db.execute(select(Task).where(Task.id == task_id))
        task = task_result.scalar_one_or_none()
        if not task:
            raise NotFoundError("Task", task_id)

        if not await self._is_project_member(task.project_id, user_id):
            raise ForbiddenError("Not a project member")

        query = (
            select(Comment)
            .where(Comment.task_id == task_id)
            .options(joinedload(Comment.user))
            .order_by(Comment.created_at.desc())
            .offset((page - 1) * size)
            .limit(size)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_comment(self, comment_id: uuid.UUID, user_id: uuid.UUID, data: CommentUpdate) -> Comment:
        result = await self.db.execute(
            select(Comment).where(Comment.id == comment_id).options(joinedload(Comment.user))
        )
        comment = result.scalar_one_or_none()
        if not comment:
            raise NotFoundError("Comment", comment_id)

        if comment.user_id != user_id:
            raise ForbiddenError("Can only edit your own comments")

        old_content = comment.content
        comment.content = data.content
        comment.updated_at = datetime.now(timezone.utc)

        await self.activity_service.log(
            task_id=comment.task_id,
            user_id=user_id,
            action="commented",
            old_value={"comment_id": str(comment_id), "content": old_content[:100]},
            new_value={"comment_id": str(comment_id), "content": data.content[:100]}
        )

        await self.db.commit()
        await self.db.refresh(comment)
        return comment

    async def delete_comment(self, comment_id: uuid.UUID, user_id: uuid.UUID, user_role: str) -> bool:
        result = await self.db.execute(
            select(Comment).where(Comment.id == comment_id).options(joinedload(Comment.user))
        )
        comment = result.scalar_one_or_none()
        if not comment:
            raise NotFoundError("Comment", comment_id)

        if comment.user_id != user_id and user_role not in ("owner", "admin"):
            raise ForbiddenError("Can only delete your own comments")

        await self.activity_service.log(
            task_id=comment.task_id,
            user_id=user_id,
            action="commented",
            old_value={"comment_id": str(comment_id), "content": comment.content[:100]}
        )

        await self.db.delete(comment)
        await self.db.commit()
        return True

    async def _is_project_member(self, project_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        from app.models.project import Project
        from app.models.team import TeamMember
        result = await self.db.execute(
            select(TeamMember)
            .join(Project, Project.team_id == TeamMember.team_id)
            .where(Project.id == project_id, TeamMember.user_id == user_id)
        )
        return result.scalar_one_or_none() is not None