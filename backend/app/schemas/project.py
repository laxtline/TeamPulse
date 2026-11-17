from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)
    key_prefix: str = Field(min_length=2, max_length=10, pattern="^[A-Z]+$")


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)


class ProjectResponse(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    name: str
    description: Optional[str]
    key_prefix: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectDetailResponse(ProjectResponse):
    task_counts: dict[str, int] = {}
    task_count: int = 0