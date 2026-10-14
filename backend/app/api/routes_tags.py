import io
import csv
import json
import datetime
from typing import List, Optional, Dict, Any, Union
from fastapi import APIRouter, Depends, Query, HTTPException, Body, Request
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.models import AssetNode, Tag, HistoricalPoint
from app.cache.redis_service import redis_service

router = APIRouter(prefix="/tags", tags=["Tags & Asset Tree"])

@router.get("/tree")
async def get_isa95_tree(db: AsyncSession = Depends(get_db)):
    """Fetch complete recursive ISA-95 asset tree with associated tags."""
    nodes_res = await db.execute(select(AssetNode).options(selectinload(AssetNode.tags)).order_by(AssetNode.id))
    all_nodes = nodes_res.scalars().all()
    
    # Map to nested tree
    node_map = {}
    root_nodes = []

    for n in all_nodes:
        node_map[n.id] = {
            "id": n.id,
            "name": n.name,
            "level": n.level,
            "path": n.path,
            "description": n.description,
            "parent_id": n.parent_id,
            "children": [],
            "tags": [
                {
                    "id": t.id,
                    "tag_name": t.tag_name,
                    "display_name": t.display_name,
                    "eng_units": t.eng_units,
                    "source_type": t.source_type,
                    "min_range": t.min_range,
                    "max_range": t.max_range,
                }
                for t in n.tags
            ]
        }

    for n in all_nodes:
        if n.parent_id is None:
            root_nodes.append(node_map[n.id])
        elif n.parent_id in node_map:
            node_map[n.parent_id]["children"].append(node_map[n.id])

    return root_nodes

@router.get("/list")
async def list_tags(
    search: Optional[str] = Query(None, description="Search term for tag name or description"),
    db: AsyncSession = Depends(get_db)
):
    """Flat list of all plant tags with current snapshot value from Redis."""
    query = select(Tag)
    if search:
        query = query.where(
            (Tag.tag_name.ilike(f"%{search}%")) | 
            (Tag.display_name.ilike(f"%{search}%"))
        )
    result = await db.execute(query.order_by(Tag.tag_name))
    tags = result.scalars().all()

    # Get cached values from Redis
    cached_values = await redis_service.get_all_latest_values()

    response = []
    for t in tags:
        cached = cached_values.get(t.tag_name, {})
        response.append({
            "id": t.id,
            "tag_name": t.tag_name,
            "display_name": t.display_name,
            "description": t.description,
            "eng_units": t.eng_units,
            "source_type": t.source_type,
            "min_range": t.min_range,
            "max_range": t.max_range,
            "current_value": cached.get("value"),
            "quality": cached.get("quality", "GOOD"),
            "timestamp": cached.get("timestamp")
        })

    return response

@router.get("/snapshot")
async def get_tag_snapshot():
    """Fetch current real-time snapshot of all tags directly from Redis cache."""
    return await redis_service.get_all_latest_values()

@router.post("/ingest")
async def ingest_telemetry_batch(
    payload: Union[Dict[str, Any], List[Dict[str, Any]]] = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Ingest live plant tag telemetry into Redis live cache and Timeseries database.
    Accepts:
      - Key-value tag map: {"FIC_101.PV": 452.3, "TIC_101.PV": 118.4}
      - Wrapped payload: {"timestamp": "2026-10-06T04:45:00Z", "tags": {...}}
      - List of points: [{"tag_name": "FIC_101.PV", "value": 452.3, "quality": "GOOD"}]
    """
    now_dt = datetime.datetime.utcnow()
    now_iso = now_dt.isoformat() + "Z"
    tag_updates = []

    if isinstance(payload, list):
        for item in payload:
            if isinstance(item, dict) and "tag_name" in item:
                tag_name = str(item["tag_name"]).strip()
                val = float(item.get("value", 0.0))
                q = str(item.get("quality", "GOOD")).upper()
                ts_str = item.get("timestamp")
                ts_dt = datetime.datetime.fromisoformat(ts_str.replace("Z", "+00:00")).replace(tzinfo=None) if ts_str else now_dt
                tag_updates.append((tag_name, val, q, ts_dt))
    elif isinstance(payload, dict):
        ts_str = payload.get("timestamp")
        ts_dt = datetime.datetime.fromisoformat(ts_str.replace("Z", "+00:00")).replace(tzinfo=None) if ts_str else now_dt
        tags_dict = payload.get("tags") if isinstance(payload.get("tags"), dict) else payload
        for k, v in tags_dict.items():
            if k in ["timestamp", "quality", "device_id", "deviceid"]:
                continue
            try:
                if isinstance(v, dict):
                    val = float(v.get("value", 0.0))
                    q = str(v.get("quality", "GOOD")).upper()
                else:
                    val = float(v)
                    q = "GOOD"
                tag_updates.append((k.strip(), val, q, ts_dt))
            except (ValueError, TypeError):
                continue

    if not tag_updates:
        raise HTTPException(status_code=400, detail="No valid tag updates found in payload")

    live_frame = {}
    db_points = []
    for tag_name, val, q, ts in tag_updates:
        data = {
            "value": val,
            "quality": q,
            "timestamp": ts.isoformat() + "Z"
        }
        await redis_service.set_tag_value(tag_name, data)
        live_frame[tag_name] = data
        db_points.append(HistoricalPoint(tag_name=tag_name, timestamp=ts, value=val, quality=q))

    # Broadcast to WebSocket subscribers
    await redis_service.publish_live_frame(live_frame)

    if db_points:
        db.add_all(db_points)
        await db.commit()

    # Update matching equipment/asset attributes in dm_store and dispatch event forwarding
    try:
        import asyncio
        from app.api.dm_service import dm_store
        from app.services.event_forwarder import event_forwarder

        assets_to_forward = {}
        for tag_name, val, q, ts in tag_updates:
            clean_tag = tag_name.replace("tags.", "").strip().lower()
            full_tag = f"tags.{clean_tag}"
            for asset in dm_store.assets:
                for attr in asset.get("attributes", []):
                    attr_metric = str(attr.get("metric", "")).strip().lower()
                    attr_tag = str(attr.get("tag_name", "")).strip().lower()
                    attr_name = str(attr.get("name", "")).strip().lower()
                    if attr_metric in (clean_tag, full_tag) or attr_tag in (clean_tag, full_tag) or attr_name == clean_tag:
                        attr["value"] = str(val)
                        attr["timestamp"] = ts.isoformat() + "Z"
                        attr["quality"] = "Good"
                        if asset["id"] not in assets_to_forward:
                            assets_to_forward[asset["id"]] = asset

        for aid, a in assets_to_forward.items():
            dm_store.recalculate_asset_attributes(a)
            all_attrs = {at["name"]: at["value"] for at in a.get("attributes", []) if at.get("value") is not None}
            asyncio.create_task(
                event_forwarder.forward_asset_event(
                    asset_id=aid,
                    asset_name=a["name"],
                    attributes=all_attrs,
                    event_forwardings=dm_store.event_forwardings,
                    log_event_fn=dm_store.log_event,
                    only_if_changed=False
                )
            )
            # Automatic trigger for Custom Function Blocks & Rule Chains (Part 5.2 & Part 7)
            try:
                from app.services.custom_fb_service import custom_fb_service
                for attr_k, attr_v in all_attrs.items():
                    asyncio.create_task(custom_fb_service.execute_on_attribute_change(aid, attr_k, attr_v))
            except Exception:
                pass


        if assets_to_forward:
            dm_store.persist_state()
    except Exception:
        pass

    return {
        "status": "SUCCESS",
        "tags_updated": len(tag_updates),
        "tags": [t[0] for t in tag_updates],
        "timestamp": now_iso
    }

@router.post("/ingest-csv")
async def ingest_csv_data(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Ingest CSV plant data. Supports:
    1. Multi-column format:
       timestamp,FIC_101.PV,TIC_101.PV,LIC_101.PV,...
       2026-10-06T04:00:00Z,450.2,118.2,60.5
    2. Single-tag rows:
       timestamp,tag_name,value,quality
       2026-10-06T04:00:00Z,FIC_101.PV,450.2,GOOD
    Accepts raw CSV in body or JSON {"csv_data": "..."}.
    """
    body_bytes = await request.body()
    body_text = body_bytes.decode("utf-8", errors="replace").strip()
    
    if body_text.startswith("{") and "csv_data" in body_text:
        try:
            body_text = json.loads(body_text).get("csv_data", "")
        except Exception:
            pass

    if not body_text:
        raise HTTPException(status_code=400, detail="Empty CSV body")

    reader = csv.reader(io.StringIO(body_text))
    rows = list(reader)
    if not rows or len(rows) < 2:
        raise HTTPException(status_code=400, detail="CSV must contain a header and at least one data row")

    header = [h.strip() for h in rows[0]]
    now_dt = datetime.datetime.utcnow()
    
    db_points = []
    live_frame = {}
    tags_seen = set()

    is_standard_row_format = len(header) >= 3 and any(h.lower() in ["tag_name", "tag", "tagname"] for h in header)
    
    if is_standard_row_format:
        ts_idx = next((i for i, h in enumerate(header) if "time" in h.lower()), 0)
        tag_idx = next((i for i, h in enumerate(header) if "tag" in h.lower()), 1)
        val_idx = next((i for i, h in enumerate(header) if "val" in h.lower()), 2)
        q_idx = next((i for i, h in enumerate(header) if "qual" in h.lower()), -1)

        for row in rows[1:]:
            if len(row) <= max(ts_idx, tag_idx, val_idx):
                continue
            try:
                tag_name = row[tag_idx].strip()
                val = float(row[val_idx].strip())
                q = row[q_idx].strip().upper() if q_idx != -1 and len(row) > q_idx else "GOOD"
                ts_str = row[ts_idx].strip()
                ts_dt = datetime.datetime.fromisoformat(ts_str.replace("Z", "+00:00")).replace(tzinfo=None) if ts_str else now_dt
                
                tags_seen.add(tag_name)
                data = {"value": val, "quality": q, "timestamp": ts_dt.isoformat() + "Z"}
                await redis_service.set_tag_value(tag_name, data)
                live_frame[tag_name] = data
                db_points.append(HistoricalPoint(tag_name=tag_name, timestamp=ts_dt, value=val, quality=q))
            except Exception:
                continue
    else:
        ts_col_idx = 0
        if header[0].lower() in ["timestamp", "time", "date", "datetime"]:
            tag_columns = [(i, h) for i, h in enumerate(header) if i > 0]
        else:
            tag_columns = list(enumerate(header))

        for row in rows[1:]:
            if not row:
                continue
            ts_str = row[ts_col_idx].strip() if ts_col_idx < len(row) else ""
            try:
                ts_dt = datetime.datetime.fromisoformat(ts_str.replace("Z", "+00:00")).replace(tzinfo=None) if ts_str else now_dt
            except Exception:
                ts_dt = now_dt

            for col_idx, tag_name in tag_columns:
                if col_idx < len(row) and row[col_idx].strip():
                    try:
                        val = float(row[col_idx].strip())
                        tags_seen.add(tag_name)
                        data = {"value": val, "quality": "GOOD", "timestamp": ts_dt.isoformat() + "Z"}
                        await redis_service.set_tag_value(tag_name, data)
                        live_frame[tag_name] = data
                        db_points.append(HistoricalPoint(tag_name=tag_name, timestamp=ts_dt, value=val, quality="GOOD"))
                    except ValueError:
                        continue

    if live_frame:
        await redis_service.publish_live_frame(live_frame)

    if db_points:
        db.add_all(db_points)
        await db.commit()

    return {
        "status": "SUCCESS",
        "rows_processed": len(rows) - 1,
        "points_ingested": len(db_points),
        "tags": list(tags_seen)
    }
