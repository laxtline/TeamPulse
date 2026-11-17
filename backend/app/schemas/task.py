from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: Optional[str] = Field(default=None, max_length=5000)
    status: str = Field(default="backlog", pattern="^(backlog|todo|in_progress|review|done)$")
    priority: str = Field(default="medium", pattern="^(low|medium|high|urgent)$")
    assignee_id: Optional[uuid.UUID] = None
    reporter_id: Optional[uuid.UUID] = None
    story_points: Optional[int] = Field(default=None, ge=0, le=100)
    due_date: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=500)
    description: Optional[str] = Field(default=None, max_length=5000)
    status: Optional[str] = Field(default=None, pattern="^(backlog|todo|in_progress|review|done)$")
    priority: Optional[str] = Field(default=None, pattern="^(low|medium|high|urgent)$")
    assignee_id: Optional[uuid.UUID] = None
    story_points: Optional[int] = Field(default=None, ge=0, le=100)
    due_date: Optional[datetime] = None


class TaskMove(BaseModel):
    status: str = Field(pattern="^(backlog|todo|in_progress|review|done)$")
    position: float


class TaskAssign(BaseModel):
    assignee_id: Optional[uuid.UUID] = None


class TaskResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    description: Optional[str]
    status: str
    priority: str
    assignee_id: Optional[uuid.UUID]
    reporter_id: Optional[uuid.UUID]
    story_points: Optional[int]
    position: float
    due_date: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TaskDetailResponse(TaskResponse):
    assignee: Optional["UserBrief"] = None
    reporter: Optional["UserBrief"] = None
    comments: list["CommentResponse"] = []
    activities: list["ActivityResponse"] = []
    ai_priority: Optional["AIPriorityResponse"] = None


class UserBrief(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    avatar_url: Optional[str]

    class Config:
        from_attributes = True


class CommentResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    user_id: uuid.UUID
    user: UserBrief
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ActivityResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    user_id: uuid.UUID
    user: UserBrief
    action: str
    old_value: Optional[dict]
    new_value: Optional[dict]
    created_at: datetime

    class Config:
        from_attributes = True


class AIPriorityResponse(BaseModel):
    score: int = Field(ge=1, le=10)
    reasoning: str
    suggested_action: str = Field(pattern="^(Do now|Schedule this week|Delegate|Defer)$")

    class Config:
        from_attributes = True