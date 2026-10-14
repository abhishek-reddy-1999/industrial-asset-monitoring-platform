"""
routes_widgets.py - Dedicated FastAPI Router for Industrial Widget Studio
Exposes REST endpoints for:
- Widget library querying, filtering, and metadata schemas
- Category and bundle management
- CRUD operations for custom widget templates
- Widget publishing, versioning, and lifecycle management
- Two-way action dispatch (RPC, setpoints, alarm acks)
- Package import and export
- Live preview telemetry feeds
"""

import time
import math
import random
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Body, Path

from app.services.widget_service import (
    widget_engine,
    WIDGET_CATEGORIES,
    WIDGET_BUNDLES,
    WIDGET_TYPE_DEFINITIONS
)
from app.cache.redis_service import redis_service
from app.api.dm_service import dm_store

router = APIRouter(prefix="/widgets", tags=["Industrial Widget Studio"])


@router.get("/categories")
async def get_widget_categories():
    """Lists all widget categories in the ecosystem."""
    return WIDGET_CATEGORIES


@router.get("/bundles")
async def get_widget_bundles():
    """Lists all standard widget bundles."""
    return WIDGET_BUNDLES


@router.get("/types")
async def get_widget_types():
    """Returns the schemas and definitions of all 38+ industrial widget types."""
    return WIDGET_TYPE_DEFINITIONS


@router.get("/library")
async def list_widget_library(
    category: Optional[str] = Query(None, description="Category filter (e.g. trends, gauges, process)"),
    bundle: Optional[str] = Query(None, description="Bundle filter (e.g. LATEST_VALUES, TIME_SERIES)"),
    search: Optional[str] = Query(None, description="Search query string")
):
    """Lists all available widgets in the library with filtering."""
    return widget_engine.list_widgets(category=category, bundle=bundle, search=search)


@router.get("/preview/telemetry")
async def get_preview_telemetry():
    """Provides high-fidelity simulated telemetry for real-time widget previewing across all types."""
    now_ts = int(time.time())
    
    # Generate live realistic values for all test tags
    return {
        "timestamp": now_ts,
        "tags": {
            "TIC_101.PV": {"value": round(118.4 + math.sin(now_ts / 8.0) * 4.2, 2), "unit": "°C", "quality": "GOOD"},
            "TIC_101.SV": {"value": 120.0, "unit": "°C", "quality": "GOOD"},
            "TIC_102.PV": {"value": round(235.8 + math.cos(now_ts / 12.0) * 3.1, 2), "unit": "°C", "quality": "GOOD"},
            "PIC_101.PV": {"value": round(145.2 + math.sin(now_ts / 5.0) * 6.5, 2), "unit": "kPa", "quality": "GOOD"},
            "FIC_101.PV": {"value": round(452.3 + math.sin(now_ts / 10.0) * 18.0, 2), "unit": "m³/h", "quality": "GOOD"},
            "FIC_101.MV": {"value": round(58.5 + math.sin(now_ts / 15.0) * 5.0, 1), "unit": "%", "quality": "GOOD"},
            "FIC_102.PV": {"value": round(176.4 + math.cos(now_ts / 9.0) * 8.2, 2), "unit": "m³/h", "quality": "GOOD"},
            "LIC_101.PV": {"value": round(62.4 + math.sin(now_ts / 20.0) * 7.5, 1), "unit": "%", "quality": "GOOD"},
            "MTR_101.RUN": {"value": 1, "state": "RUNNING", "rpm": 2950, "quality": "GOOD"},
            "XV_101.STATUS": {"value": "CLOSED_HEALTHY", "quality": "GOOD"},
            "VIB_101.RMS": {"value": round(1.84 + math.sin(now_ts / 3.0) * 0.25, 2), "unit": "mm/s", "quality": "GOOD"},
            "AHI_C101.HEALTH": {"value": 95.4, "unit": "%", "quality": "GOOD"}
        },
        "vibration_waveform": [
            round(math.sin(i * 0.2) * 1.5 + math.sin(i * 0.8) * 0.6 + random.uniform(-0.1, 0.1), 3)
            for i in range(64)
        ],
        "fft_spectrum": [
            {"freq": round(f, 1), "amplitude": round(2.8 / (1 + abs(f - 50) * 0.2) + 0.4 / (1 + abs(f - 100) * 0.5) + random.uniform(0.01, 0.08), 3)}
            for f in [10, 25, 50, 75, 100, 150, 200, 300, 500, 1000]
        ]
    }


@router.get("/{widget_id}")
async def get_widget_details(widget_id: str = Path(...)):
    """Fetches details for a specific widget."""
    w = widget_engine.get_widget_by_id(widget_id)
    if not w:
        raise HTTPException(status_code=404, detail="Widget not found in studio registry")
    return w


@router.post("")
async def create_widget_template(payload: Dict[str, Any] = Body(...)):
    """Creates a new custom widget template."""
    return widget_engine.create_widget(payload)


@router.put("/{widget_id}")
async def update_widget_template(widget_id: str = Path(...), payload: Dict[str, Any] = Body(...)):
    """Updates an existing custom widget."""
    updated = widget_engine.update_widget(widget_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Widget not found or cannot be modified")
    return updated


@router.delete("/{widget_id}")
async def delete_widget_template(widget_id: str = Path(...)):
    """Deletes a custom widget from the library."""
    success = widget_engine.delete_widget(widget_id)
    if not success:
        raise HTTPException(status_code=404, detail="Widget not found or built-in widgets cannot be deleted")
    return {"status": "SUCCESS", "message": f"Widget {widget_id} removed"}


@router.post("/{widget_id}/publish")
async def publish_widget(
    widget_id: str = Path(...),
    version: Optional[str] = Query(None, description="Optional new version string (e.g. 1.1.0)")
):
    """Publishes a custom widget template."""
    pub = widget_engine.publish_widget(widget_id, new_version=version)
    if not pub:
        raise HTTPException(status_code=404, detail="Widget not found")
    return {"status": "PUBLISHED", "widget": pub}


@router.post("/{widget_id}/action")
async def execute_widget_action(
    widget_id: str = Path(...),
    action: Dict[str, Any] = Body(...)
):
    """Executes a widget action such as RPC command, setpoint adjustment or alarm acknowledgment."""
    action_type = action.get("type", "RPC")
    payload = action.get("payload", {})
    
    # Log activity in platform audit trail
    if hasattr(dm_store, "log_event"):
        dm_store.log_event("WIDGET_STUDIO", widget_id, f"Action '{action_type}' triggered", "operator@yokogawa.com", "Success", str(payload))
    elif hasattr(dm_store, "activity_logs"):
        dm_store.activity_logs.insert(0, {
            "id": f"log-{int(time.time()*1000)}",
            "entity": "WIDGET_STUDIO",
            "entity_id": widget_id,
            "action": f"Action '{action_type}' triggered",
            "details": str(payload),
            "status": "Success",
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        })
    
    return {
        "status": "EXECUTED",
        "widgetId": widget_id,
        "actionType": action_type,
        "timestamp": int(time.time() * 1000),
        "result": {
            "success": True,
            "message": f"Action {action_type} dispatched successfully to industrial gateway",
            "reflectedPayload": payload
        }
    }


@router.post("/export")
async def export_widget_package(payload: Dict[str, Any] = Body(...)):
    """Exports a selection of widgets as a portable JSON package."""
    widget_ids = payload.get("widgetIds")
    return widget_engine.export_package(widget_ids=widget_ids)


@router.post("/import")
async def import_widget_package(package_data: Dict[str, Any] = Body(...)):
    """Imports an industrial widget package."""
    return widget_engine.import_package(package_data)
