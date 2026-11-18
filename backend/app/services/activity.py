import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.comment import Activity


class ActivityService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(
        self,
        task_id: uuid.UUID,
        user_id: uuid.UUID,
        action: str,
        old_value: Optional[dict] = None,
        new_value: Optional[dict] = None,
    ) -> Activity:
        activity = Activity(
            task_id=task_id,
            user_id=user_id,
            action=action,
            old_value=old_value,
            new_value=new_value,
        )
        self.db.add(activity)
        await self.db.flush()
        return activity

    async def get_task_activities(self, task_id: uuid.UUID, limit: int = 100) -> list[Activity]:
        from sqlalchemy import select
        from sqlalchemy.orm import joinedload
        query = (
            select(Activity)
            .where(Activity.task_id == task_id)
            .options(joinedload(Activity.user))
            .order_by(Activity.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_user_activities(self, user_id: uuid.UUID, limit: int = 50) -> list[Activity]:
        from sqlalchemy import select
        from sqlalchemy.orm import joinedload
        query = (
            select(Activity)
            .where(Activity.user_id == user_id)
            .options(joinedload(Activity.user))
            .order_by(Activity.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())