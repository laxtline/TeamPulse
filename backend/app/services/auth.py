from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
import hashlib
import secrets
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.user import User, OAuthAccount
from app.models.refresh_token import RefreshToken
from app.core.security import (
    verify_password,
    get_password_hash,
    create_token_pair,
    verify_refresh_token,
)
from app.core.exceptions import NotFoundError, ValidationError
from app.schemas.auth import RegisterRequest, LoginRequest


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, data: RegisterRequest) -> User:
        existing = await self.db.execute(select(User).where(User.email == data.email))
        if existing.scalar_one_or_none():
            raise ValidationError("Email already registered")

        user = User(
            email=data.email,
            password_hash=get_password_hash(data.password),
            full_name=data.full_name,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def login(self, data: LoginRequest) -> tuple[User, str, str]:
        result = await self.db.execute(select(User).where(User.email == data.email))
        user = result.scalar_one_or_none()

        if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
            raise ValidationError("Invalid email or password")

        if not user.is_active:
            raise ValidationError("Account is deactivated")

        access_token, refresh_token = create_token_pair(
            str(user.id), None, "member"
        )
        await self._store_refresh_token(user.id, refresh_token)

        return user, access_token, refresh_token

    async def refresh(self, refresh_token: str) -> tuple[str, str]:
        try:
            payload = verify_refresh_token(refresh_token)
        except Exception:
            raise ValidationError("Invalid refresh token")

        user_id = uuid.UUID(payload["sub"])

        result = await self.db.execute(
            select(RefreshToken).where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked == False,
                RefreshToken.expires_at > datetime.now(timezone.utc)
            )
        )
        stored = result.scalar_one_or_none()

        if not stored or not verify_password(refresh_token, stored.token_hash):
            raise ValidationError("Invalid or expired refresh token")

        stored.revoked = True
        await self.db.flush()

        user_result = await self.db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user or not user.is_active:
            raise ValidationError("User not found or inactive")

        access_token, new_refresh_token = create_token_pair(
            str(user.id), payload.get("team_id"), payload.get("role", "member")
        )
        await self._store_refresh_token(user.id, new_refresh_token)

        return access_token, new_refresh_token

    async def logout(self, refresh_token: str) -> bool:
        try:
            payload = verify_refresh_token(refresh_token)
        except Exception:
            return True

        user_id = uuid.UUID(payload["sub"])
        result = await self.db.execute(
            select(RefreshToken).where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked == False
            )
        )
        for token in result.scalars().all():
            token.revoked = True
        await self.db.commit()
        return True

    async def get_user(self, user_id: uuid.UUID) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def update_user(self, user_id: uuid.UUID, **kwargs) -> User:
        user = await self.get_user(user_id)
        if not user:
            raise NotFoundError("User", user_id)
        for key, value in kwargs.items():
            if hasattr(user, key) and value is not None:
                setattr(user, key, value)
        user.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def link_oauth_account(
        self,
        user_id: uuid.UUID,
        provider: str,
        provider_user_id: str,
        access_token: str | None = None,
        refresh_token: str | None = None,
        expires_at: datetime | None = None,
    ) -> OAuthAccount:
        existing = await self.db.execute(
            select(OAuthAccount).where(
                OAuthAccount.provider == provider,
                OAuthAccount.provider_user_id == provider_user_id
            )
        )
        if existing.scalar_one_or_none():
            raise ValidationError("OAuth account already linked")

        oauth = OAuthAccount(
            user_id=user_id,
            provider=provider,
            provider_user_id=provider_user_id,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
        )
        self.db.add(oauth)
        await self.db.commit()
        await self.db.refresh(oauth)
        return oauth

    async def find_or_create_oauth_user(
        self,
        provider: str,
        provider_user_id: str,
        email: str,
        full_name: str,
        avatar_url: str | None = None,
        access_token: str | None = None,
        refresh_token: str | None = None,
        expires_at: datetime | None = None,
    ) -> User:
        oauth_result = await self.db.execute(
            select(OAuthAccount).where(
                OAuthAccount.provider == provider,
                OAuthAccount.provider_user_id == provider_user_id
            )
        )
        oauth = oauth_result.scalar_one_or_none()

        if oauth:
            user_result = await self.db.execute(select(User).where(User.id == oauth.user_id))
            user = user_result.scalar_one_or_none()
            if user:
                return user

        user_result = await self.db.execute(select(User).where(User.email == email))
        user = user_result.scalar_one_or_none()

        if user:
            await self.link_oauth_account(
                user.id, provider, provider_user_id, access_token, refresh_token, expires_at
            )
            return user

        user = User(
            email=email,
            full_name=full_name,
            avatar_url=avatar_url,
            email_verified=True,
        )
        self.db.add(user)
        await self.db.flush()
        await self.link_oauth_account(
            user.id, provider, provider_user_id, access_token, refresh_token, expires_at
        )
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def _store_refresh_token(self, user_id: uuid.UUID, refresh_token: str):
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)

        token = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.db.add(token)
        await self.db.flush()

    async def cleanup_expired_tokens(self):
        await self.db.execute(
            delete(RefreshToken).where(
                RefreshToken.expires_at < datetime.now(timezone.utc)
            )
        )
        await self.db.commit()