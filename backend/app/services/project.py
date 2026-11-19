from typing import Optional
import uuid
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.project import Project
from app.models.task import Task
from app.models.team import TeamMember
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.core.exceptions import NotFoundError, ForbiddenError, ValidationError


class ProjectService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_project(self, team_id: uuid.UUID, user_id: uuid.UUID, data: ProjectCreate) -> Project:
        if not await self._is_team_member(team_id, user_id):
            raise ForbiddenError("Not a team member")

        project = Project(
            team_id=team_id,
            name=data.name,
            description=data.description,
            key_prefix=data.key_prefix.upper(),
        )
        self.db.add(project)
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def get_team_projects(self, team_id: uuid.UUID, user_id: uuid.UUID) -> list[Project]:
        if not await self._is_team_member(team_id, user_id):
            raise ForbiddenError("Not a team member")

        result = await self.db.execute(
            select(Project)
            .where(Project.team_id == team_id)
            .options(selectinload(Project.tasks))
            .order_by(Project.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_project(self, project_id: uuid.UUID, user_id: uuid.UUID) -> Project | None:
        result = await self.db.execute(
            select(Project)
            .where(Project.id == project_id)
            .options(selectinload(Project.tasks))
        )
        project = result.scalar_one_or_none()
        if not project:
            return None
        if not await self._is_team_member(project.team_id, user_id):
            raise ForbiddenError("Not a team member")
        return project

    async def get_project_detail(self, project_id: uuid.UUID, user_id: uuid.UUID) -> Project | None:
        result = await self.db.execute(
            select(Project)
            .where(Project.id == project_id)
            .options(selectinload(Project.tasks))
        )
        project = result.scalar_one_or_none()
        if not project:
            return None
        if not await self._is_team_member(project.team_id, user_id):
            raise ForbiddenError("Not a team member")

        task_counts = await self.db.execute(
            select(Task.status, func.count(Task.id))
            .where(Task.project_id == project_id)
            .group_by(Task.status)
        )
        project.task_counts = dict(task_counts.all())
        project.task_count = sum(project.task_counts.values())
        return project

    async def update_project(self, project_id: uuid.UUID, user_id: uuid.UUID, data: ProjectUpdate) -> Project:
        project = await self.get_project(project_id, user_id)
        if not project:
            raise NotFoundError("Project", project_id)

        if not await self._can_manage_project(project.team_id, user_id):
            raise ForbiddenError("Not authorized to update project")

        if data.name is not None:
            project.name = data.name
        if data.description is not None:
            project.description = data.description
        project.updated_at = func.now()

        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def delete_project(self, project_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        project = await self.get_project(project_id, user_id)
        if not project:
            raise NotFoundError("Project", project_id)

        if not await self._can_manage_project(project.team_id, user_id):
            raise ForbiddenError("Not authorized to delete project")

        await self.db.delete(project)
        await self.db.commit()
        return True

    async def _is_team_member(self, team_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
        )
        return result.scalar_one_or_none() is not None

    async def _can_manage_project(self, team_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
        )
        member = result.scalar_one_or_none()
        return member and member.role in ("owner", "admin", "member")