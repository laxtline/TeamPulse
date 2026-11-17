from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.services.websocket import manager, authenticate_websocket
from app.core.database import get_db
from app.models.team import TeamMember
from app.models.project import Project
from sqlalchemy import select

router = APIRouter(prefix="/ws", tags=["websocket"])


async def _is_member(db: AsyncSession, team_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    result = await db.execute(
        select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
    )
    return result.scalar_one_or_none() is not None


async def _serve(websocket: WebSocket, team_id: uuid.UUID, user_id: uuid.UUID, user_name: str):
    await manager.connect(websocket, team_id, user_id, user_name)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.handle_message(websocket, team_id, user_id, user_name, data)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        manager.disconnect(websocket, team_id, user_id, user_name)


# This has to come before "/{team_id}" or "projects" would be parsed as a team id.
@router.websocket("/projects/{project_id}")
async def websocket_project_endpoint(
    websocket: WebSocket,
    project_id: uuid.UUID,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    try:
        user_id, user_name = await authenticate_websocket(websocket, token)
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    project = await db.get(Project, project_id)
    if not project or not await _is_member(db, project.team_id, user_id):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await _serve(websocket, project.team_id, user_id, user_name)


@router.websocket("/{team_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    team_id: uuid.UUID,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    try:
        user_id, user_name = await authenticate_websocket(websocket, token)
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    if not await _is_member(db, team_id, user_id):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await _serve(websocket, team_id, user_id, user_name)
