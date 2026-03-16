from collections import defaultdict
from datetime import UTC, datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["chat"])


class PresenceHub:
    def __init__(self) -> None:
        self.connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, room: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections[room].add(websocket)

    def disconnect(self, room: str, websocket: WebSocket) -> None:
        self.connections[room].discard(websocket)

    def online_count(self, room: str) -> int:
        return len(self.connections[room])

    async def broadcast(self, room: str, payload: dict) -> None:
        for conn in list(self.connections[room]):
            await conn.send_json(payload)


hub = PresenceHub()


@router.websocket("/ws/chat/{room}")
async def chat_socket(websocket: WebSocket, room: str) -> None:
    await hub.connect(room, websocket)
    await hub.broadcast(room, {"kind": "presence", "online": hub.online_count(room)})

    try:
        while True:
            text = await websocket.receive_text()
            if hub.online_count(room) < 2:
                await websocket.send_json({
                    "kind": "system",
                    "message": "Le chat devient actif a partir de 2 utilisateurs connectes.",
                })
                continue

            await hub.broadcast(
                room,
                {
                    "kind": "message",
                    "body": text,
                    "created_at": datetime.now(UTC).isoformat(),
                },
            )
    except WebSocketDisconnect:
        hub.disconnect(room, websocket)
        await hub.broadcast(room, {"kind": "presence", "online": hub.online_count(room)})
