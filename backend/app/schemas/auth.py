from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
import uuid


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    full_name: str = Field(min_length=1, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UpdateProfileRequest(BaseModel):
    # Optional so the appearance tab can save just the theme without resending
    # the whole profile.
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    avatar_url: Optional[str] = None
    bio: Optional[str] = Field(default=None, max_length=1000)
    theme: Optional[str] = Field(default=None, pattern="^(light|dark|system)$")


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=100)


class OAuthLoginRequest(BaseModel):
    """Profile handed over by NextAuth after the provider login completes."""

    provider: str
    provider_user_id: str
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    avatar_url: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    avatar_url: Optional[str]
    bio: Optional[str]
    theme: str = "system"
    role: str
    is_active: bool
    email_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class MeResponse(BaseModel):
    user: UserResponse
    teams: list["TeamBrief"] = []
    oauth_providers: list[str] = []


class TeamBrief(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    role: str

    class Config:
        from_attributes = True


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=100)