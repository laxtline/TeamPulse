from pydantic import BaseModel
from typing import Optional
import uuid


class NotificationPreferenceResponse(BaseModel):
    user_id: uuid.UUID
    email_enabled: bool
    push_enabled: bool
    task_assigned: bool
    task_updated: bool
    comments: bool
    mentions: bool
    weekly_digest: bool

    class Config:
        from_attributes = True


class NotificationPreferenceUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    task_assigned: Optional[bool] = None
    task_updated: Optional[bool] = None
    comments: Optional[bool] = None
    mentions: Optional[bool] = None
    weekly_digest: Optional[bool] = None