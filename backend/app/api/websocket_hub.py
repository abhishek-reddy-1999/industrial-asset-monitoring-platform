import asyncio
import json
import logging
from typing import Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.cache.redis_service import redis_service
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["WebSocket Stream"])

class WebSocketConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.listener_task: asyncio.Task = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info("WebSocket client connected. Total clients: %d", len(self.active_connections))
        
        # Send initial full snapshot immediately
        snapshot = await redis_service.get_all_latest_values()
        if snapshot:
            await websocket.send_json({
                "event": "snapshot",
                "tags": snapshot
            })

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info("WebSocket client disconnected. Total clients: %d", len(self.active_connections))

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return
        dead_connections = []
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)
        for dc in dead_connections:
            self.active_connections.discard(dc)

    async def start_redis_listener(self):
        """Subscribe to Redis channel ydash:stream and fan out to all active WebSockets."""
        while True:
            try:
                if redis_service.redis_client:
                    pubsub = redis_service.redis_client.pubsub()
                    await pubsub.subscribe(settings.redis_channel)
                    logger.info("Subscribed to Redis channel %s for live telemetry dispatch", settings.redis_channel)
                    async for message in pubsub.listen():
                        if message["type"] == "message":
                            try:
                                data = json.loads(message["data"])
                                await self.broadcast(data)
                                try:
                                    from app.api.routes_scada import scada_ws_manager
                                    if "tags" in data:
                                        await scada_ws_manager.broadcast_tag_updates(data["tags"])
                                    elif isinstance(data, dict):
                                        await scada_ws_manager.broadcast_tag_updates(data)
                                except Exception:
                                    pass
                                try:
                                    from app.api.socketio_hub import broadcast_socketio_telemetry
                                    await broadcast_socketio_telemetry(data)
                                except Exception:
                                    pass
                            except Exception as e:
                                logger.warning("Error parsing/broadcasting redis frame: %s", e)
                else:
                    await asyncio.sleep(2)
            except Exception as e:
                logger.error("Redis PubSub listener error: %s. Reconnecting in 3s...", e)
                await asyncio.sleep(3)

ws_manager = WebSocketConnectionManager()

@router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection open and receive any client filter messages
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("action") == "ping":
                    await websocket.send_json({"event": "pong"})
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning("WebSocket exception: %s", e)
        ws_manager.disconnect(websocket)
