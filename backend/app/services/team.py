from typing import Optional
import uuid
import slugify
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.team import Team, TeamMember
from app.models.user import User
from app.models.project import Project
from app.schemas.team import TeamCreate, TeamUpdate, TeamMemberCreate, TeamMemberUpdate
from app.core.exceptions import NotFoundError, ForbiddenError, ValidationError


class TeamService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _generate_slug(self, name: str) -> str:
        base = slugify.slugify(name.lower())
        return base[:100]

    async def create_team(self, owner_id: uuid.UUID, data: TeamCreate) -> Team:
        slug = self._generate_slug(data.name)
        existing = await self.db.execute(select(Team).where(Team.slug == slug))
        if existing.scalar_one_or_none():
            slug = f"{slug}-{uuid.uuid4().hex[:6]}"

        team = Team(
            name=data.name,
            slug=slug,
            description=data.description,
            owner_id=owner_id,
        )
        self.db.add(team)
        await self.db.flush()

        member = TeamMember(team_id=team.id, user_id=owner_id, role="owner")
        self.db.add(member)
        await self.db.commit()
        await self.db.refresh(team)
        return team

    async def get_user_teams(self, user_id: uuid.UUID) -> list[Team]:
        result = await self.db.execute(
            select(Team)
            .join(TeamMember, Team.id == TeamMember.team_id)
            .where(TeamMember.user_id == user_id)
            .options(selectinload(Team.members).selectinload(TeamMember.user))
        )
        return list(result.scalars().all())

    async def get_team(self, team_id: uuid.UUID) -> Team | None:
        result = await self.db.execute(
            select(Team)
            .where(Team.id == team_id)
            .options(
                selectinload(Team.members).selectinload(TeamMember.user),
                selectinload(Team.projects)
            )
        )
        return result.scalar_one_or_none()

    async def update_team(self, team_id: uuid.UUID, user_id: uuid.UUID, data: TeamUpdate) -> Team:
        team = await self.get_team(team_id)
        if not team:
            raise NotFoundError("Team", team_id)

        if not await self._is_owner_or_admin(team_id, user_id):
            raise ForbiddenError("Only owner or admin can update team")

        if data.name is not None:
            team.name = data.name
        if data.description is not None:
            team.description = data.description
        team.updated_at = func.now()

        await self.db.commit()
        await self.db.refresh(team)
        return team

    async def delete_team(self, team_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        team = await self.get_team(team_id)
        if not team:
            raise NotFoundError("Team", team_id)

        if team.owner_id != user_id:
            raise ForbiddenError("Only owner can delete team")

        await self.db.delete(team)
        await self.db.commit()
        return True

    async def invite_member(self, team_id: uuid.UUID, user_id: uuid.UUID, data: TeamMemberCreate) -> TeamMember:
        team = await self.get_team(team_id)
        if not team:
            raise NotFoundError("Team", team_id)

        if not await self._is_owner_or_admin(team_id, user_id):
            raise ForbiddenError("Only owner or admin can invite members")

        user_result = await self.db.execute(select(User).where(User.email == data.email))
        user = user_result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User", data.email)

        existing = await self.db.execute(
            select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user.id)
        )
        if existing.scalar_one_or_none():
            raise ValidationError("User is already a member")

        if user.id == user_id:
            raise ValidationError("Cannot invite yourself")

        member = TeamMember(team_id=team_id, user_id=user.id, role=data.role)
        self.db.add(member)
        await self.db.commit()
        await self.db.refresh(member)
        return member

    async def update_member_role(self, team_id: uuid.UUID, user_id: uuid.UUID, target_user_id: uuid.UUID, data: TeamMemberUpdate) -> TeamMember:
        team = await self.get_team(team_id)
        if not team:
            raise NotFoundError("Team", team_id)

        if not await self._is_owner_or_admin(team_id, user_id):
            raise ForbiddenError("Only owner or admin can update roles")

        if target_user_id == team.owner_id:
            raise ForbiddenError("Cannot change owner's role")

        if data.role == "owner":
            raise ForbiddenError("Cannot assign owner role")

        member_result = await self.db.execute(
            select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == target_user_id)
        )
        member = member_result.scalar_one_or_none()
        if not member:
            raise NotFoundError("Team member", target_user_id)

        if user_id != team.owner_id and member.role == "admin":
            raise ForbiddenError("Only owner can modify admin roles")

        member.role = data.role
        await self.db.commit()
        await self.db.refresh(member)
        return member

    async def remove_member(self, team_id: uuid.UUID, user_id: uuid.UUID, target_user_id: uuid.UUID) -> bool:
        team = await self.get_team(team_id)
        if not team:
            raise NotFoundError("Team", team_id)

        if not await self._is_owner_or_admin(team_id, user_id):
            raise ForbiddenError("Only owner or admin can remove members")

        if target_user_id == team.owner_id:
            raise ForbiddenError("Cannot remove owner")

        if target_user_id == user_id and team.owner_id != user_id:
            raise ForbiddenError("Cannot remove yourself unless you are owner")

        member_result = await self.db.execute(
            select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == target_user_id)
        )
        member = member_result.scalar_one_or_none()
        if not member:
            raise NotFoundError("Team member", target_user_id)

        await self.db.delete(member)
        await self.db.commit()
        return True

    async def _is_owner_or_admin(self, team_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
        )
        member = result.scalar_one_or_none()
        if not member:
            return False
        return member.role in ("owner", "admin")

    async def get_member_role(self, team_id: uuid.UUID, user_id: uuid.UUID) -> str | None:
        result = await self.db.execute(
            select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
        )
        member = result.scalar_one_or_none()
        return member.role if member else None