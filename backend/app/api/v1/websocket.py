from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.services.websocket import manager, authenticate_websocket
from app.core.database import get_db
from app.models.user import User
from app.models.team import TeamMember
from sqlalchemy import select

router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/{team_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    team_id: uuid.UUID,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    try:
        user_id, authenticated_team_id, user_name = await authenticate_websocket(websocket, token)
    except Exception as e:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    if str(authenticated_team_id) != str(team_id):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    member_result = await db.execute(
        select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
    )
    if not member_result.scalar_one_or_none():
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

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