from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectDetailResponse,
)
from app.services.project import ProjectService
from app.dependencies.auth import get_current_user, get_db
from app.models.user import User

router = APIRouter(prefix="/teams/{team_id}/projects", tags=["projects"])


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    team_id: uuid.UUID,
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = ProjectService(db)
    project = await service.create_project(team_id, current_user.id, data)
    return ProjectResponse.model_validate(project)


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    team_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = ProjectService(db)
    projects = await service.get_team_projects(team_id, current_user.id)
    return [ProjectResponse.model_validate(p) for p in projects]


@router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project(
    team_id: uuid.UUID,
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = ProjectService(db)
    project = await service.get_project_detail(project_id, current_user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if str(project.team_id) != str(team_id):
        raise HTTPException(status_code=404, detail="Project not found in this team")
    return ProjectDetailResponse.model_validate(project)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    team_id: uuid.UUID,
    project_id: uuid.UUID,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = ProjectService(db)
    project = await service.update_project(project_id, current_user.id, data)
    if str(project.team_id) != str(team_id):
        raise HTTPException(status_code=404, detail="Project not found in this team")
    return ProjectResponse.model_validate(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    team_id: uuid.UUID,
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = ProjectService(db)
    project = await service.get_project(project_id, current_user.id)
    if not project or str(project.team_id) != str(team_id):
        raise HTTPException(status_code=404, detail="Project not found in this team")
    await service.delete_project(project_id, current_user.id)