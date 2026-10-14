import os
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
from app.config import settings
from app.db.database import engine
from app.db.seed_data import init_and_seed_db
from app.cache.redis_service import redis_service
from app.collector.simulator import plant_simulator
from app.api.routes_dashboards import router as dashboards_router
from app.api.routes_tags import router as tags_router
from app.api.routes_query import router as query_router
from app.api.routes_ahi import router as ahi_router
from app.api.routes_alarms import router as alarms_router
from app.api.routes_opcua import router as opcua_router
from app.api.routes_dm import router as dm_router
from app.api.routes_scada import router as scada_router, ws_scada_router
from app.api.routes_custom_fb import router as custom_fb_router
from app.api.routes_fb_v2 import router as fb_v2_router
from app.api.routes_rule_chains_v2 import router as rule_chains_v2_router
from app.api.routes_thingsboard import router as tb_core_router, telemetry_plugin_router as tb_telemetry_router, device_ingest_router as tb_device_router
from app.api.routes_widgets import router as widgets_router
from app.api.websocket_hub import router as ws_router, ws_manager
from app.collector.opcua_client import opcua_manager
from app.services.fb_engine import fb_scheduler


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ydash")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Yokogawa Industrial Data Platform...")
    
    # 1. Connect Redis
    await redis_service.connect()

    # 2. Initialize Database & Seed Baseline
    try:
        await init_and_seed_db()
    except Exception as e:
        logger.error("DB Initialization error: %s", e)

    # 3. Start Redis listener for WebSocket streaming
    redis_task = asyncio.create_task(ws_manager.start_redis_listener())

    # 4. Start Plant Simulator if enabled
    if settings.enable_simulator:
        await plant_simulator.start()

    # 5. Start OPC UA Manager
    await opcua_manager.start()

    # 6. Start Yokogawa AHI Function Block V2 Scheduler
    fb_scheduler.start()

    # 7. Start IoT Device Scan Rate Health Watchdog
    from app.api.routes_dm import device_scan_watchdog
    watchdog_task = asyncio.create_task(device_scan_watchdog())

    yield

    logger.info("Shutting down Yokogawa Industrial Data Platform...")
    watchdog_task.cancel()
    await fb_scheduler.stop()
    await opcua_manager.stop()
    if settings.enable_simulator:
        await plant_simulator.stop()
    redis_task.cancel()
    await redis_service.close()
    await engine.dispose()

import socketio
from app.api.socketio_hub import sio

fastapi_app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Grafana-like Industrial UI & Gateway for Yokogawa CENTUM VP, OpreX AHI & Data Model Broker",
    lifespan=lifespan
)

# CORS configuration
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if "*" not in origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
fastapi_app.include_router(dashboards_router, prefix=settings.api_prefix)
fastapi_app.include_router(tags_router, prefix=settings.api_prefix)
fastapi_app.include_router(query_router, prefix=settings.api_prefix)
fastapi_app.include_router(ahi_router, prefix=settings.api_prefix)
fastapi_app.include_router(alarms_router, prefix=settings.api_prefix)
fastapi_app.include_router(opcua_router, prefix=settings.api_prefix)
fastapi_app.include_router(dm_router, prefix=settings.api_prefix)
fastapi_app.include_router(scada_router, prefix="/api/v2")
fastapi_app.include_router(scada_router, prefix="/api/v1")
fastapi_app.include_router(custom_fb_router, prefix="/api/v2")
fastapi_app.include_router(custom_fb_router, prefix="/api/v1")
fastapi_app.include_router(fb_v2_router, prefix="/api/v2")
fastapi_app.include_router(fb_v2_router, prefix="/api/v1")
fastapi_app.include_router(fb_v2_router, prefix="/api/v1/dm")
fastapi_app.include_router(rule_chains_v2_router, prefix="/api/v2")
fastapi_app.include_router(rule_chains_v2_router, prefix="/api/v1")
fastapi_app.include_router(rule_chains_v2_router, prefix="/api/v1/dm")
fastapi_app.include_router(tb_core_router, prefix="/api/v1")
fastapi_app.include_router(tb_core_router, prefix="/api")
fastapi_app.include_router(tb_telemetry_router, prefix="/api")
fastapi_app.include_router(tb_telemetry_router, prefix="/api/v1")
fastapi_app.include_router(tb_device_router, prefix="/api")
fastapi_app.include_router(tb_device_router, prefix="/api/v1")
fastapi_app.include_router(widgets_router, prefix=settings.api_prefix)
fastapi_app.include_router(widgets_router, prefix="/api")
fastapi_app.include_router(ws_router)
fastapi_app.include_router(ws_scada_router)


@fastapi_app.get("/health")
@fastapi_app.get("/api/v1/health")
async def health_check():
    return {
        "status": "HEALTHY",
        "service": settings.app_name,
        "database": "PostgreSQL 5432 (ahi_dbm)",
        "redis": f"Redis 127.0.0.1:6379 ({'CONNECTED' if redis_service.redis_client else 'DISCONNECTED'})",
        "simulator": "RUNNING" if plant_simulator.running else "STOPPED",
        "socketio": "RUNNING (v2.0 ASGI Ingestion Engine)"
    }

# Frontend Static Files Mount
base_dir = os.path.dirname(os.path.abspath(__file__))
dist_path = os.path.abspath(os.path.join(base_dir, "..", "..", "frontend", "dist"))

if os.path.exists(dist_path):
    assets_path = os.path.join(dist_path, "assets")
    if os.path.exists(assets_path):
        fastapi_app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

    @fastapi_app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("ws/") or full_path.startswith("socket.io/"):
            raise HTTPException(status_code=404)
        target_file = os.path.join(dist_path, full_path)
        if os.path.exists(target_file) and os.path.isfile(target_file):
            return FileResponse(target_file)
        return FileResponse(os.path.join(dist_path, "index.html"))

# Wrap FastAPI with Socket.IO ASGI Gateway App
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path="socket.io")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.port, reload=False)
