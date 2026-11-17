import json
import asyncio
from typing import Dict, Set, Optional
import uuid
from fastapi import WebSocket, WebSocketDisconnect
from app.core.redis import get_redis
from app.core.security import verify_access_token
from app.core.exceptions import ValidationError


class ConnectionManager:
    def __init__(self):
        self.team_rooms: Dict[uuid.UUID, Set[WebSocket]] = {}
        self.user_connections: Dict[uuid.UUID, Set[WebSocket]] = {}
        self.user_presence: Dict[uuid.UUID, str] = {}
        self._pubsub_task: Optional[asyncio.Task] = None
        self._redis = None

    async def initialize(self):
        self._redis = await get_redis()
        self._pubsub_task = asyncio.create_task(self._listen_redis())

    async def shutdown(self):
        if self._pubsub_task:
            self._pubsub_task.cancel()
            try:
                await self._pubsub_task
            except asyncio.CancelledError:
                pass
        for connections in self.team_rooms.values():
            for ws in connections:
                await ws.close()
        self.team_rooms.clear()
        self.user_connections.clear()

    async def connect(self, websocket: WebSocket, team_id: uuid.UUID, user_id: uuid.UUID, user_name: str):
        await websocket.accept()

        if team_id not in self.team_rooms:
            self.team_rooms[team_id] = set()
        self.team_rooms[team_id].add(websocket)

        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(websocket)

        self.user_presence[user_id] = "online"
        await self._broadcast_presence(team_id, user_id, user_name, "online")

        await self._send_personal(websocket, {"event": "connected", "data": {"team_id": str(team_id)}})

    def disconnect(self, websocket: WebSocket, team_id: uuid.UUID, user_id: uuid.UUID, user_name: str):
        if team_id in self.team_rooms:
            self.team_rooms[team_id].discard(websocket)
            if not self.team_rooms[team_id]:
                del self.team_rooms[team_id]

        if user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
                self.user_presence.pop(user_id, None)
                asyncio.create_task(self._broadcast_presence(team_id, user_id, user_name, "offline"))

    async def broadcast_to_team(self, team_id: uuid.UUID, event: str, data: dict):
        message = json.dumps({"event": event, "data": data})
        if team_id in self.team_rooms:
            disconnected = set()
            for ws in self.team_rooms[team_id]:
                try:
                    await ws.send_text(message)
                except Exception:
                    disconnected.add(ws)
            for ws in disconnected:
                self.team_rooms[team_id].discard(ws)

    async def _send_personal(self, websocket: WebSocket, message: dict):
        try:
            await websocket.send_text(json.dumps(message))
        except Exception:
            pass

    async def handle_message(self, websocket: WebSocket, team_id: uuid.UUID, user_id: uuid.UUID, user_name: str, message: dict):
        event = message.get("event")
        data = message.get("data", {})

        if event == "ping":
            await self._send_personal(websocket, {"event": "pong", "data": {"timestamp": data.get("timestamp")}})
        elif event == "presence:set":
            status = data.get("status", "online")
            if status in ("online", "away", "busy"):
                self.user_presence[user_id] = status
                await self._broadcast_presence(team_id, user_id, user_name, status)

    async def _broadcast_presence(self, team_id: uuid.UUID, user_id: uuid.UUID, user_name: str, status: str):
        await self.broadcast_to_team(team_id, "presence:update", {
            "user_id": str(user_id),
            "user_name": user_name,
            "status": status
        })

    async def _listen_redis(self):
        if not self._redis:
            return
        pubsub = self._redis.pubsub()
        await pubsub.psubscribe("team:*")
        try:
            async for message in pubsub.listen():
                if message["type"] == "pmessage":
                    channel = message["channel"]
                    team_id_str = channel.decode() if isinstance(channel, bytes) else channel
                    team_id_str = team_id_str.replace("team:", "")
                    try:
                        team_id = uuid.UUID(team_id_str)
                        data = json.loads(message["data"])
                        await self.broadcast_to_team(team_id, data["event"], data["data"])
                    except Exception:
                        pass
        except asyncio.CancelledError:
            pass
        finally:
            await pubsub.unsubscribe("team:*")
            await pubsub.close()

    async def publish_event(self, team_id: uuid.UUID, event: str, data: dict):
        if self._redis:
            channel = f"team:{team_id}"
            message = json.dumps({"event": event, "data": data})
            await self._redis.publish(channel, message)


manager = ConnectionManager()


async def authenticate_websocket(websocket: WebSocket, token: str) -> tuple[uuid.UUID, uuid.UUID, str]:
    try:
        payload = verify_access_token(token)
        user_id = uuid.UUID(payload["sub"])
        team_id = uuid.UUID(payload["team_id"]) if payload.get("team_id") else None
        user_name = payload.get("full_name", "Unknown")
        if not team_id:
            raise ValidationError("Team ID required in token")
        return user_id, team_id, user_name
    except Exception as e:
        raise ValidationError(f"Invalid token: {str(e)}")