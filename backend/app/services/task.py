from typing import Optional
import uuid
from datetime import datetime, timezone
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload
from app.models.project import Project, Task
from app.models.team import TeamMember
from app.models.user import User
from app.models.comment import Comment, Activity
from app.schemas.task import TaskCreate, TaskUpdate, TaskMove, TaskAssign
from app.core.exceptions import NotFoundError, ForbiddenError, ValidationError
from app.services.activity import ActivityService


class TaskService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.activity_service = ActivityService(db)

    async def create_task(self, project_id: uuid.UUID, user_id: uuid.UUID, data: TaskCreate) -> Task:
        project = await self._get_project_with_permission(project_id, user_id, "member")
        if not project:
            raise ForbiddenError("Not authorized to create tasks in this project")

        max_pos = await self.db.execute(
            select(func.max(Task.position)).where(Task.project_id == project_id, Task.status == data.status)
        )
        max_position = max_pos.scalar() or 0.0

        task = Task(
            project_id=project_id,
            title=data.title,
            description=data.description,
            status=data.status,
            priority=data.priority,
            assignee_id=data.assignee_id,
            reporter_id=user_id,
            story_points=data.story_points,
            position=max_position + 1.0,
            due_date=data.due_date,
        )
        self.db.add(task)
        await self.db.flush()

        await self.activity_service.log(
            task_id=task.id,
            user_id=user_id,
            action="created",
            new_value={"title": task.title, "status": task.status, "priority": task.priority}
        )

        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def get_project_tasks(
        self,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
        status: Optional[str] = None,
        assignee_id: Optional[uuid.UUID] = None,
        priority: Optional[str] = None,
        search: Optional[str] = None,
    ) -> list[Task]:
        project = await self._get_project_with_permission(project_id, user_id, "viewer")
        if not project:
            raise ForbiddenError("Not authorized to view tasks in this project")

        query = select(Task).where(Task.project_id == project_id).options(
            joinedload(Task.assignee),
            joinedload(Task.reporter)
        )

        if status:
            query = query.where(Task.status == status)
        if assignee_id:
            query = query.where(Task.assignee_id == assignee_id)
        if priority:
            query = query.where(Task.priority == priority)
        if search:
            query = query.where(or_(
                Task.title.ilike(f"%{search}%"),
                Task.description.ilike(f"%{search}%")
            ))

        query = query.order_by(Task.status, Task.position)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_task(self, task_id: uuid.UUID, user_id: uuid.UUID) -> Task | None:
        result = await self.db.execute(
            select(Task)
            .where(Task.id == task_id)
            .options(
                joinedload(Task.assignee),
                joinedload(Task.reporter),
                selectinload(Task.comments).joinedload(Comment.user),
                selectinload(Task.activities).joinedload(Activity.user)
            )
        )
        task = result.scalar_one_or_none()
        if not task:
            return None
        if not await self._is_project_member(task.project_id, user_id):
            raise ForbiddenError("Not a project member")
        return task

    async def update_task(self, task_id: uuid.UUID, user_id: uuid.UUID, data: TaskUpdate) -> Task:
        task = await self.get_task(task_id, user_id)
        if not task:
            raise NotFoundError("Task", task_id)

        old_values = {}
        new_values = {}

        if data.title is not None and data.title != task.title:
            old_values["title"] = task.title
            new_values["title"] = data.title
            task.title = data.title

        if data.description is not None and data.description != task.description:
            old_values["description"] = task.description
            new_values["description"] = data.description
            task.description = data.description

        if data.status is not None and data.status != task.status:
            old_values["status"] = task.status
            new_values["status"] = data.status
            task.status = data.status
            if data.status == "done" and not task.completed_at:
                task.completed_at = datetime.now(timezone.utc)
            elif data.status != "done":
                task.completed_at = None

        if data.priority is not None and data.priority != task.priority:
            old_values["priority"] = task.priority
            new_values["priority"] = data.priority
            task.priority = data.priority

        if data.assignee_id is not None and data.assignee_id != task.assignee_id:
            old_values["assignee_id"] = str(task.assignee_id) if task.assignee_id else None
            new_values["assignee_id"] = str(data.assignee_id) if data.assignee_id else None
            task.assignee_id = data.assignee_id

        if data.story_points is not None and data.story_points != task.story_points:
            old_values["story_points"] = task.story_points
            new_values["story_points"] = data.story_points
            task.story_points = data.story_points

        if data.due_date is not None and data.due_date != task.due_date:
            old_values["due_date"] = task.due_date.isoformat() if task.due_date else None
            new_values["due_date"] = data.due_date.isoformat() if data.due_date else None
            task.due_date = data.due_date

        if old_values:
            await self.activity_service.log(
                task_id=task.id,
                user_id=user_id,
                action="updated",
                old_value=old_values,
                new_value=new_values
            )

        task.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def move_task(self, task_id: uuid.UUID, user_id: uuid.UUID, data: TaskMove) -> Task:
        task = await self.get_task(task_id, user_id)
        if not task:
            raise NotFoundError("Task", task_id)

        old_status = task.status
        old_position = task.position

        if data.status != task.status:
            max_pos = await self.db.execute(
                select(func.max(Task.position)).where(Task.project_id == task.project_id, Task.status == data.status)
            )
            max_position = max_pos.scalar() or 0.0
            task.position = max_position + 1.0
        else:
            task.position = data.position

        task.status = data.status
        if data.status == "done" and not task.completed_at:
            task.completed_at = datetime.now(timezone.utc)
        elif data.status != "done":
            task.completed_at = None

        task.updated_at = datetime.now(timezone.utc)

        await self.activity_service.log(
            task_id=task.id,
            user_id=user_id,
            action="moved",
            old_value={"status": old_status, "position": old_position},
            new_value={"status": task.status, "position": task.position}
        )

        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def assign_task(self, task_id: uuid.UUID, user_id: uuid.UUID, data: TaskAssign) -> Task:
        task = await self.get_task(task_id, user_id)
        if not task:
            raise NotFoundError("Task", task_id)

        if data.assignee_id:
            if not await self._is_project_member(task.project_id, data.assignee_id):
                raise ForbiddenError("Assignee must be a project member")

        old_assignee = task.assignee_id
        task.assignee_id = data.assignee_id
        task.updated_at = datetime.now(timezone.utc)

        await self.activity_service.log(
            task_id=task.id,
            user_id=user_id,
            action="assigned",
            old_value={"assignee_id": str(old_assignee) if old_assignee else None},
            new_value={"assignee_id": str(data.assignee_id) if data.assignee_id else None}
        )

        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def delete_task(self, task_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        task = await self.get_task(task_id, user_id)
        if not task:
            raise NotFoundError("Task", task_id)

        if not await self._can_manage_task(task.project_id, user_id):
            raise ForbiddenError("Not authorized to delete task")

        await self.activity_service.log(
            task_id=task.id,
            user_id=user_id,
            action="deleted",
            old_value={"title": task.title}
        )

        await self.db.delete(task)
        await self.db.commit()
        return True

    async def _get_project_with_permission(self, project_id: uuid.UUID, user_id: uuid.UUID, min_role: str) -> Project | None:
        result = await self.db.execute(
            select(Project)
            .join(TeamMember, Project.team_id == TeamMember.team_id)
            .where(Project.id == project_id, TeamMember.user_id == user_id)
        )
        project = result.scalar_one_or_none()
        if not project:
            return None

        member_result = await self.db.execute(
            select(TeamMember).where(TeamMember.team_id == project.team_id, TeamMember.user_id == user_id)
        )
        member = member_result.scalar_one_or_none()
        role_hierarchy = {"viewer": 0, "member": 1, "admin": 2, "owner": 3}
        if not member or role_hierarchy.get(member.role, 0) < role_hierarchy.get(min_role, 0):
            return None
        return project

    async def _is_project_member(self, project_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            select(TeamMember)
            .join(Project, Project.team_id == TeamMember.team_id)
            .where(Project.id == project_id, TeamMember.user_id == user_id)
        )
        return result.scalar_one_or_none() is not None

    async def _can_manage_task(self, project_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            select(TeamMember)
            .join(Project, Project.team_id == TeamMember.team_id)
            .where(Project.id == project_id, TeamMember.user_id == user_id)
        )
        member = result.scalar_one_or_none()
        return member and member.role in ("owner", "admin", "member")