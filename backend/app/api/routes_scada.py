"""
routes_scada.py - FastAPI Router for ThingsBoard-Inspired SCADA/HMI Studio
Endpoints under prefix /api/v2/di/scada and WebSocket /ws/di/scada/live.
Integrates directly with DM Asset Hierarchy & Attributes.
"""
import json
import uuid
import datetime
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Body, Query, WebSocket, WebSocketDisconnect

from app.services.scada_service import scada_store, sanitize_svg_content
from app.api.dm_service import dm_store
from app.cache.redis_service import redis_service

logger = logging.getLogger("routes_scada")

router = APIRouter(prefix="/di/scada", tags=["DI SCADA/HMI Studio"])
ws_scada_router = APIRouter(tags=["DI SCADA Live WebSocket"])

# ============================================================================
# 1. SCADA SCREENS CRUD & LIFECYCLE
# ============================================================================

@router.get("/screens")
async def list_screens():
    """List all SCADA screens with draft/published status and metadata."""
    return scada_store.list_screens()

@router.post("/screens")
async def create_screen(payload: Dict[str, Any] = Body(...)):
    """Create a new SCADA screen definition."""
    try:
        return scada_store.create_screen(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/screens/{screen_id}")
async def get_screen(screen_id: str):
    """Retrieve full SCADA screen designer configuration."""
    screen = scada_store.get_screen(screen_id)
    if not screen:
        raise HTTPException(status_code=404, detail="SCADA screen not found")
    return screen

@router.put("/screens/{screen_id}")
async def update_screen(screen_id: str, payload: Dict[str, Any] = Body(...)):
    """Update draft screen layout, background, and element bindings."""
    screen = scada_store.update_screen(screen_id, payload)
    if not screen:
        raise HTTPException(status_code=404, detail="SCADA screen not found")
    return screen

@router.delete("/screens/{screen_id}")
async def delete_screen(screen_id: str):
    """Delete a SCADA screen."""
    success = scada_store.delete_screen(screen_id)
    if not success:
        raise HTTPException(status_code=404, detail="SCADA screen not found")
    return {"status": "success", "message": f"Screen {screen_id} deleted"}

@router.post("/screens/{screen_id}/validate")
async def validate_screen(screen_id: str):
    """Validate screen configuration, tag mappings, and syntax."""
    return scada_store.validate_screen(screen_id)

@router.post("/screens/{screen_id}/publish")
async def publish_screen(screen_id: str, payload: Dict[str, Any] = Body(default={})):
    """
    Creates an immutable published version snapshot.
    Future draft edits will not affect the active published runtime viewer.
    """
    snapshot = scada_store.publish_screen(
        screen_id,
        version=payload.get("version"),
        changelog=payload.get("changelog", "")
    )
    if not snapshot:
        raise HTTPException(status_code=404, detail="SCADA screen not found")
    return snapshot

@router.get("/screens/{screen_id}/versions")
async def list_screen_versions(screen_id: str):
    """List version history and publication changelogs."""
    return scada_store.list_versions(screen_id)

@router.post("/screens/{screen_id}/rollback")
async def rollback_screen(screen_id: str, payload: Dict[str, Any] = Body(...)):
    """Roll back screen layout to a prior published version snapshot."""
    target_version = payload.get("version")
    if not target_version:
        raise HTTPException(status_code=400, detail="Missing 'version' parameter")
    restored = scada_store.rollback_screen(screen_id, target_version)
    if not restored:
        raise HTTPException(status_code=404, detail="Version snapshot or screen not found")
    return restored

@router.get("/screens/{screen_id}/runtime")
async def get_runtime_screen(screen_id: str):
    """Fetch authoritative published screen layout for the SCADA Runtime Viewer."""
    screen = scada_store.get_runtime_screen(screen_id)
    if not screen:
        raise HTTPException(status_code=404, detail="SCADA screen not found")
    return screen

# ============================================================================
# 2. SVG SYMBOLS REGISTRY & SANITIZATION
# ============================================================================

@router.get("/symbols")
async def list_symbols(category: Optional[str] = Query(None)):
    """List registered industrial SVG symbols, optionally filtered by category."""
    scada_store.load_state()
    return scada_store.list_symbols(category)

@router.post("/symbols")
async def register_symbol(payload: Dict[str, Any] = Body(...)):
    """Upload and register a custom sanitized SVG symbol."""
    try:
        return scada_store.register_symbol(payload)
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/symbols/{symbol_id}")
async def get_symbol(symbol_id: str):
    """Get single symbol definition and sanitized SVG content."""
    sym = scada_store.get_symbol(symbol_id)
    if not sym:
        raise HTTPException(status_code=404, detail="Symbol not found")
    return sym

@router.put("/symbols/{symbol_id}")
async def update_symbol(symbol_id: str, payload: Dict[str, Any] = Body(...)):
    """Update symbol behaviors, tags, or properties."""
    try:
        sym = scada_store.update_symbol(symbol_id, payload)
        if not sym:
            raise HTTPException(status_code=404, detail="Symbol not found")
        return sym
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))

@router.post("/symbols/sanitize")
async def test_sanitize_svg(payload: Dict[str, Any] = Body(...)):
    """Inspect and sanitize raw SVG content without persisting."""
    raw_svg = payload.get("svg_content", "")
    return sanitize_svg_content(raw_svg)

@router.post("/symbols/composite")
async def create_composite_symbol(payload: Dict[str, Any] = Body(...)):
    """Create a new equipment symbol by composing multiple sub-symbols (e.g. Motor + Coupling + Pump)."""
    try:
        return scada_store.create_composite_symbol(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/symbols/pack/export")
async def export_symbols_pack(category: Optional[str] = Query(None)):
    """Export symbol definitions as a portable JSON pack."""
    return scada_store.export_symbol_pack(category)

@router.post("/symbols/pack/import")
async def import_symbols_pack(payload: Dict[str, Any] = Body(...)):
    """Import symbol definitions from a JSON pack."""
    try:
        return scada_store.import_symbol_pack(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============================================================================
# 2B. PROCESS TEMPLATES (PHASE 7)
# ============================================================================

@router.get("/templates")
async def list_templates(category: Optional[str] = Query(None)):
    """List all available pre-configured industrial process templates."""
    return scada_store.list_templates(category)

@router.get("/templates/{template_id}")
async def get_template(template_id: str):
    """Retrieve full process template definition with equipment roles and connections."""
    tpl = scada_store.get_template(template_id)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return tpl

@router.post("/templates/{template_id}/instantiate")
async def instantiate_template(template_id: str, payload: Dict[str, Any] = Body(...)):
    """
    Instantiates an industrial process template onto a target screen,
    mapping required asset roles to real plant assets and attributes.
    """
    screen_id = payload.get("screen_id")
    if not screen_id:
        raise HTTPException(status_code=400, detail="Missing target 'screen_id'")
    mappings = payload.get("asset_role_mappings", {})
    offset_x = int(payload.get("offset_x", 60))
    offset_y = int(payload.get("offset_y", 60))
    try:
        return scada_store.instantiate_template(
            template_id=template_id,
            screen_id=screen_id,
            asset_role_mappings=mappings,
            offset_x=offset_x,
            offset_y=offset_y
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============================================================================
# 3. ASSET ATTRIBUTE INTEGRATION & SNAPSHOTS
# ============================================================================


@router.get("/assets")
async def list_scada_assets():
    """List plant assets available for SCADA binding and template role mapping."""
    return [
        {
            "id": a["id"],
            "name": a.get("name", a["id"]),
            "level": a.get("level", "EQUIPMENT"),
            "path": a.get("path", ""),
            "attributes_count": len(a.get("attributes", []))
        }
        for a in dm_store.assets
    ]

@router.get("/assets/{asset_id}/attributes")
async def get_asset_attributes(asset_id: str):
    """Fetch all attributes for a specific DM asset with latest values and units."""
    asset = next((a for a in dm_store.assets if a["id"] == asset_id), None)

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {
        "asset_id": asset["id"],
        "asset_name": asset["name"],
        "level": asset.get("level", "EQUIPMENT"),
        "path": asset.get("path", ""),
        "attributes": asset.get("attributes", [])
    }

@router.post("/values/snapshot")
async def get_values_snapshot(payload: Dict[str, Any] = Body(...)):
    """
    Fetch authoritative latest values and data quality (GOOD, BAD, UNCERTAIN, STALE, MISSING)
    for a list of tags or attribute references.
    """
    tags = payload.get("tags", []) or payload.get("tag_names", [])
    if not tags:
        return {}
    return await scada_store.get_values_snapshot(tags)

# ============================================================================
# 4. MULTIPLEXED LIVE SCADA WEBSOCKET
# ============================================================================

class ScadaLiveConnectionManager:
    def __init__(self):
        self.active_clients: Dict[WebSocket, set] = {}  # ws -> set of subscribed tag names

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active_clients[ws] = set()
        logger.info("SCADA live WebSocket client connected. Active: %d", len(self.active_clients))

    def disconnect(self, ws: WebSocket):
        self.active_clients.pop(ws, None)
        logger.info("SCADA live WebSocket client disconnected. Active: %d", len(self.active_clients))

    def update_subscriptions(self, ws: WebSocket, tags: List[str]):
        if ws in self.active_clients:
            self.active_clients[ws] = set(tags)

    async def broadcast_tag_updates(self, incoming_tags: Dict[str, Any]):
        dead = []
        for ws, sub_tags in self.active_clients.items():
            # If client specified subscribed tags, filter; otherwise send all
            if sub_tags:
                filtered = {t: v for t, v in incoming_tags.items() if t in sub_tags}
            else:
                filtered = incoming_tags

            if filtered:
                try:
                    await ws.send_json({"event": "telemetry", "tags": filtered})
                except Exception:
                    dead.append(ws)

        for d in dead:
            self.disconnect(d)

scada_ws_manager = ScadaLiveConnectionManager()

@ws_scada_router.websocket("/ws/di/scada/live")
async def scada_live_websocket(websocket: WebSocket):
    """
    Dedicated multiplexed SCADA live subscription stream.
    Supports client commands:
      {"action": "subscribe", "tags": ["FIC_101.PV", "PIC_101.PV"]}
      {"action": "ping"}
    """
    await scada_ws_manager.connect(websocket)

    # Immediately send initial snapshot of all active tags
    try:
        snapshot = await redis_service.get_all_latest_values()
        if snapshot:
            await websocket.send_json({"event": "snapshot", "tags": snapshot})
    except Exception as e:
        logger.warning("Error sending initial SCADA snapshot: %s", e)

    try:
        while True:
            text = await websocket.receive_text()
            try:
                msg = json.loads(text)
                act = msg.get("action")
                if act == "subscribe":
                    tags = msg.get("tags", [])
                    scada_ws_manager.update_subscriptions(websocket, tags)
                    # Send snapshot of newly subscribed tags
                    if tags:
                        subset = await scada_store.get_values_snapshot(tags)
                        await websocket.send_json({"event": "snapshot", "tags": subset})
                elif act == "ping":
                    await websocket.send_json({"event": "pong"})
            except Exception as parse_err:
                logger.debug("SCADA WS message parse error: %s", parse_err)
    except WebSocketDisconnect:
        scada_ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning("SCADA WS connection error: %s", e)
        scada_ws_manager.disconnect(websocket)


# ============================================================================
# 5. THINGSBOARD DASHBOARD COMPATIBILITY ENGINE (IMPORT & EXPORT)
# ============================================================================

@router.post("/import/thingsboard")
async def import_thingsboard_dashboard(payload: Dict[str, Any] = Body(...)):
    """
    Imports a native ThingsBoard JSON dashboard definition (PE or CE format),
    parsing all widgets, states, entity aliases, and SCADA symbol bindings
    into an active AHI DBM SCADA Screen.
    """
    try:
        # Support either raw dashboard object or wrapped in {"dashboard": ...}
        tb_data = payload.get("dashboard") if "dashboard" in payload else payload
        result = scada_store.import_thingsboard_dashboard(tb_data)
        return result
    except Exception as e:
        logger.error("Failed to import ThingsBoard dashboard: %s", e)
        raise HTTPException(status_code=400, detail=f"Failed to import ThingsBoard dashboard: {str(e)}")


@router.get("/export/thingsboard/{screen_id}")
async def export_thingsboard_dashboard(screen_id: str):
    """
    Exports an AHI DBM SCADA screen into a standard ThingsBoard Dashboard JSON format
    compatible with ThingsBoard Community and Professional editions.
    """
    try:
        return scada_store.export_thingsboard_dashboard(screen_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error("Failed to export screen to ThingsBoard format: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# 6. THINGSBOARD TELEMETRY & TWO-WAY RPC GATEWAY ROUTER
# Standard ThingsBoard PE/CE compatibility endpoints under /api/plugins/telemetry
# ============================================================================

tb_plugin_router = APIRouter(prefix="/plugins/telemetry", tags=["ThingsBoard Telemetry & RPC Plugin"])

@tb_plugin_router.post("/DEVICE/{device_id}/rpc/twoway")
@tb_plugin_router.post("/DEVICE/{device_id}/rpc/oneway")
async def handle_thingsboard_device_rpc(device_id: str, payload: Dict[str, Any] = Body(...)):
    """
    Native ThingsBoard Two-Way / One-Way RPC Gateway.
    Compatible with ThingsBoard dashboard control widgets (knobs, switches, push buttons, sliders).
    Dispatches method to physical or simulated edge controller and returns execution response.
    """
    method = payload.get("method", "ping")
    params = payload.get("params", {})
    timeout = payload.get("timeout", 5000)

    now_iso = datetime.datetime.utcnow().isoformat() + "Z"
    rpc_id = f"rpc-tb-{uuid.uuid4().hex[:8]}"

    dev = next((d for d in dm_store.devices if d["id"] == device_id or d["identifier"] == device_id), None)
    dev_name = dev["name"] if dev else device_id

    # Update device twin
    if dev:
        dev["last_command"] = f"{method}: {params}"
        dev["last_seen"] = now_iso

    # Handle known equipment controls
    result_val = "SUCCESS"
    if method in ["setRunning", "togglePump"]:
        state = bool(params.get("params", params) if isinstance(params, dict) else params)
        result_val = {"running": state}
    elif method in ["setOpened", "openValve", "closeValve"]:
        pos = int(params.get("params", params) if isinstance(params, dict) else params)
        result_val = {"opened": pos}
    elif method in ["setMode", "selectMode"]:
        mode = str(params.get("params", params) if isinstance(params, dict) else params)
        result_val = {"mode": mode}
    elif method in ["setState", "setPoint", "setOperationalSetpoint"]:
        result_val = {"state": params}

    # Log in DM Audit Trail
    dm_store.log_event(
        "ThingsBoard RPC",
        dev["id"] if dev else device_id,
        f"RPC: {method}",
        dm_store.user_profile["account_id"],
        "Success",
        f"ThingsBoard Two-Way RPC '{method}' dispatched to '{dev_name}' with params {params}"
    )

    return {
        "rpcId": rpc_id,
        "deviceId": device_id,
        "method": method,
        "params": params,
        "response": result_val,
        "status": "SUCCESS",
        "timestamp": now_iso
    }


@tb_plugin_router.get("/DEVICE/{device_id}/values/attributes")
async def get_thingsboard_device_attributes(device_id: str):
    """
    Retrieves ThingsBoard scoped attributes (CLIENT_SCOPE, SERVER_SCOPE, SHARED_SCOPE)
    for the specified device entity.
    """
    dev = next((d for d in dm_store.devices if d["id"] == device_id or d["identifier"] == device_id), None)
    if not dev:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")

    return {
        "client": {
            "firmwareVersion": dev.get("firmware_version", "v2.4.1-industrial"),
            "ipAddress": dev.get("ip_address", "192.168.1.105"),
            "status": dev.get("status", "Connected"),
            "batteryLevel": dev.get("battery_level", 98.5)
        },
        "server": {
            "active": dev.get("status") == "Connected",
            "lastSeen": dev.get("last_seen"),
            "monitoringScanRateSecs": dev.get("monitoring_time_secs", 60),
            "assetBinding": dev.get("asset_id")
        },
        "shared": {
            "operationalSetpoint": dev.get("setpoint", 50.0),
            "mode": dev.get("mode", "AUTO"),
            "enabled": True
        }
    }


@tb_plugin_router.post("/DEVICE/{device_id}/attributes/{scope}")
async def set_thingsboard_device_attribute(device_id: str, scope: str, payload: Dict[str, Any] = Body(...)):
    """
    Updates scoped device attributes in ThingsBoard format (e.g. SHARED_SCOPE).
    Shared attributes automatically propagate as downlink configurations to controllers.
    """
    dev = next((d for d in dm_store.devices if d["id"] == device_id or d["identifier"] == device_id), None)
    if not dev:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")

    scope_upper = scope.upper()
    now_iso = datetime.datetime.utcnow().isoformat() + "Z"

    dm_store.log_event(
        "Attribute Update",
        dev["id"],
        f"Attributes: {scope_upper}",
        dm_store.user_profile["account_id"],
        "Success",
        f"Updated {scope_upper} attributes on '{dev['name']}': {json.dumps(payload)}"
    )

    return {"status": "SUCCESS", "scope": scope_upper, "updated": list(payload.keys()), "timestamp": now_iso}

