from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class CommentUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class CommentResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    user_id: uuid.UUID
    user: "UserBrief"
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserBrief(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    avatar_url: Optional[str]

    class Config:
        from_attributes = True