from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.core.config import get_settings
from app.core.security import create_token_pair, verify_refresh_token
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    UserResponse,
    MeResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.services.auth import AuthService
from app.dependencies.auth import get_current_user, get_db
from app.dependencies.rate_limit import rate_limit

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["auth"])


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/"
    )


def clear_auth_cookies(response: Response):
    response.delete_cookie(key="access_token", path="/", httponly=True, secure=settings.ENVIRONMENT == "production", samesite="lax")
    response.delete_cookie(key="refresh_token", path="/", httponly=True, secure=settings.ENVIRONMENT == "production", samesite="lax")


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@rate_limit(max_requests=5, window_seconds=300, key_prefix="auth:register")
async def register(data: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    user = await auth_service.register(data)
    access_token, refresh_token = create_token_pair(str(user.id), None, "member")
    await auth_service._store_refresh_token(user.id, refresh_token)
    set_auth_cookies(response, access_token, refresh_token)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenResponse)
@rate_limit(max_requests=5, window_seconds=300, key_prefix="auth:login")
async def login(data: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    user, access_token, refresh_token = await auth_service.login(data)
    set_auth_cookies(response, access_token, refresh_token)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
@rate_limit(max_requests=10, window_seconds=60, key_prefix="auth:refresh")
async def refresh_token(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token not found")

    auth_service = AuthService(db)
    access_token, new_refresh_token = await auth_service.refresh(refresh_token)
    set_auth_cookies(response, access_token, new_refresh_token)
    return TokenResponse(access_token=access_token, refresh_token=new_refresh_token)


@router.post("/logout")
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        auth_service = AuthService(db)
        await auth_service.logout(refresh_token)
    clear_auth_cookies(response)
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=MeResponse)
async def get_me(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from app.models.team import TeamMember
    from sqlalchemy import select
    from app.schemas.auth import TeamBrief

    auth_service = AuthService(db)
    user = await auth_service.get_user(current_user.id)

    team_result = await db.execute(
        select(TeamMember)
        .where(TeamMember.user_id == current_user.id)
        .options(selectinload(TeamMember.team))
    )
    teams = []
    for member in team_result.scalars().all():
        teams.append(TeamBrief(
            id=member.team.id,
            name=member.team.name,
            slug=member.team.slug,
            role=member.role
        ))

    return MeResponse(
        user=UserResponse.model_validate(user),
        teams=teams
    )


@router.post("/forgot-password")
@rate_limit(max_requests=3, window_seconds=3600, key_prefix="auth:forgot")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    # In production, send reset email
    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password")
@rate_limit(max_requests=3, window_seconds=3600, key_prefix="auth:reset")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    # In production, verify token and reset password
    return {"message": "Password has been reset"}


@router.get("/oauth/{provider}")
async def oauth_callback(provider: str, code: str, db: AsyncSession = Depends(get_db)):
    if provider not in ("google", "github"):
        raise HTTPException(status_code=400, detail="Invalid provider")

    # In production, exchange code for tokens and get user info
    # This is a placeholder for the OAuth flow
    return {"message": f"OAuth {provider} callback - implement with Authlib"}


from sqlalchemy.orm import selectinload