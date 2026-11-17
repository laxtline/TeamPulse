from typing import Optional
from fastapi import Depends, HTTPException, status, Request, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.core.database import get_db
from app.core.security import verify_access_token
from app.models.user import User
from app.services.auth import AuthService
from sqlalchemy import select


async def get_current_user(
    request: Request,
    access_token: Optional[str] = Cookie(None, alias="access_token"),
    db: AsyncSession = Depends(get_db)
) -> User:
    # OAuth logins keep their tokens inside the NextAuth session, so also accept
    # a normal Authorization header. Cookie still wins when both are present.
    if not access_token:
        header = request.headers.get("Authorization", "")
        if header.lower().startswith("bearer "):
            access_token = header[7:].strip()

    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    try:
        payload = verify_access_token(access_token)
        user_id = uuid.UUID(payload["sub"])
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    auth_service = AuthService(db)
    user = await auth_service.get_user(user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    request.state.user = user
    request.state.team_id = uuid.UUID(payload["team_id"]) if payload.get("team_id") else None
    request.state.role = payload.get("role", "member")

    return user


async def get_optional_user(
    request: Request,
    access_token: Optional[str] = Cookie(None, alias="access_token"),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    if not access_token:
        return None
    try:
        return await get_current_user(request, access_token, db)
    except HTTPException:
        return None


def require_role(*allowed_roles: str):
    async def role_checker(request: Request) -> User:
        user = getattr(request.state, "user", None)
        role = getattr(request.state, "role", None)
        if not user or role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return user
    return role_checker


def get_team_id(request: Request) -> uuid.UUID:
    team_id = getattr(request.state, "team_id", None)
    if not team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team context required"
        )
    return team_id