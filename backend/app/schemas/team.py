from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class TeamCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)


class TeamUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)


class TeamResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: Optional[str]
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TeamMemberCreate(BaseModel):
    email: str
    role: str = Field(default="member", pattern="^(admin|member|viewer)$")


class TeamMemberUpdate(BaseModel):
    role: str = Field(pattern="^(admin|member|viewer)$")


class TeamMemberResponse(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    user_id: uuid.UUID
    user_email: str
    user_full_name: str
    user_avatar_url: Optional[str]
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True


class TeamDetailResponse(TeamResponse):
    members: list[TeamMemberResponse] = []
    projects: list["ProjectBrief"] = []


class ProjectBrief(BaseModel):
    id: uuid.UUID
    name: str
    key_prefix: str
    task_count: int = 0

    class Config:
        from_attributes = True