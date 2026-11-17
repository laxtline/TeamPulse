from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.schemas.team import (
    TeamCreate,
    TeamUpdate,
    TeamResponse,
    TeamDetailResponse,
    TeamMemberCreate,
    TeamMemberUpdate,
    TeamMemberResponse,
)
from app.services.team import TeamService
from app.dependencies.auth import get_current_user, get_db
from app.models.user import User

router = APIRouter(prefix="/teams", tags=["teams"])


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(data: TeamCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    service = TeamService(db)
    team = await service.create_team(current_user.id, data)
    return TeamResponse.model_validate(team)


@router.get("", response_model=list[TeamResponse])
async def list_teams(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    service = TeamService(db)
    teams = await service.get_user_teams(current_user.id)
    return [TeamResponse.model_validate(t) for t in teams]


@router.get("/{team_id}", response_model=TeamDetailResponse)
async def get_team(team_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    service = TeamService(db)
    team = await service.get_team(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    member_result = await db.execute(
        select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == current_user.id)
    )
    if not member_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a team member")

    members = []
    for member in team.members:
        members.append(TeamMemberResponse(
            id=member.id,
            team_id=member.team_id,
            user_id=member.user_id,
            user_email=member.user.email,
            user_full_name=member.user.full_name,
            user_avatar_url=member.user.avatar_url,
            role=member.role,
            joined_at=member.joined_at
        ))

    from app.schemas.team import ProjectBrief
    projects = [ProjectBrief(id=p.id, name=p.name, key_prefix=p.key_prefix) for p in team.projects]

    return TeamDetailResponse(
        id=team.id,
        name=team.name,
        slug=team.slug,
        description=team.description,
        owner_id=team.owner_id,
        created_at=team.created_at,
        updated_at=team.updated_at,
        members=members,
        projects=projects
    )


@router.patch("/{team_id}", response_model=TeamResponse)
async def update_team(team_id: uuid.UUID, data: TeamUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    service = TeamService(db)
    team = await service.update_team(team_id, current_user.id, data)
    return TeamResponse.model_validate(team)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(team_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    service = TeamService(db)
    await service.delete_team(team_id, current_user.id)


@router.post("/{team_id}/members", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
async def invite_member(team_id: uuid.UUID, data: TeamMemberCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    service = TeamService(db)
    member = await service.invite_member(team_id, current_user.id, data)

    user_result = await db.execute(select(User).where(User.id == member.user_id))
    user = user_result.scalar_one()

    return TeamMemberResponse(
        id=member.id,
        team_id=member.team_id,
        user_id=member.user_id,
        user_email=user.email,
        user_full_name=user.full_name,
        user_avatar_url=user.avatar_url,
        role=member.role,
        joined_at=member.joined_at
    )


@router.patch("/{team_id}/members/{user_id}", response_model=TeamMemberResponse)
async def update_member_role(team_id: uuid.UUID, user_id: uuid.UUID, data: TeamMemberUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    service = TeamService(db)
    member = await service.update_member_role(team_id, current_user.id, user_id, data)

    user_result = await db.execute(select(User).where(User.id == member.user_id))
    user = user_result.scalar_one()

    return TeamMemberResponse(
        id=member.id,
        team_id=member.team_id,
        user_id=member.user_id,
        user_email=user.email,
        user_full_name=user.full_name,
        user_avatar_url=user.avatar_url,
        role=member.role,
        joined_at=member.joined_at
    )


@router.delete("/{team_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(team_id: uuid.UUID, user_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    service = TeamService(db)
    await service.remove_member(team_id, current_user.id, user_id)


from sqlalchemy import select
from app.models.team import TeamMember
from app.models.user import User
from sqlalchemy.orm import selectinload