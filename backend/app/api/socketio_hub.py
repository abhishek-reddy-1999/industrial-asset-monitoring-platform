import io
import csv
import json
import logging
import datetime
from typing import Dict, Any, Union, List
import socketio

from app.cache.redis_service import redis_service
from app.api.dm_service import dm_store

logger = logging.getLogger("ydash.socketio")

# Initialize ASGI Socket.IO Server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=False,
    engineio_logger=False
)

@sio.event
async def connect(sid, environ):
    logger.info("Socket.IO client connected: %s", sid)
    await sio.emit('connected', {
        'status': 'ONLINE',
        'sid': sid,
        'server': 'Yokogawa OpreX AHI & DBM Socket.IO Engine v2.0',
        'time': datetime.datetime.utcnow().isoformat() + 'Z'
    }, to=sid)

@sio.event
async def disconnect(sid):
    logger.info("Socket.IO client disconnected: %s", sid)

@sio.event
async def telemetry(sid, data):
    """
    Ingests live telemetry packet from Node-RED or IoT client via Socket.IO
    Supports:
    1. { "timestamp": "...", "tags": { "FIC_101.PV": 450.5, ... } }
    2. { "deviceid": "pump-p101a-hub-01", "discharge_pressure": 582.0, ... }
    """
    try:
        if isinstance(data, str):
            data = json.loads(data)

        updated_count = 0
        now_iso = data.get("timestamp") or (datetime.datetime.utcnow().isoformat() + "Z")

        # 1. Standard Tag Map ingestion
        if "tags" in data and isinstance(data["tags"], dict):
            tags_to_cache = {}
            for tag_name, val in data["tags"].items():
                try:
                    num_val = float(val) if val is not None else 0.0
                    tags_to_cache[tag_name] = {
                        "value": num_val,
                        "quality": "GOOD",
                        "timestamp": now_iso
                    }
                except (ValueError, TypeError):
                    pass

            if tags_to_cache:
                await redis_service.set_live_values(tags_to_cache)
                await redis_service.publish_telemetry({
                    "timestamp": now_iso,
                    "tags": {k: v["value"] for k, v in tags_to_cache.items()},
                    "quality": "GOOD"
                })
                updated_count += len(tags_to_cache)

        # 2. IoT Device / Equipment / Broker packet ingestion
        dev_id = str(data.get("deviceid") or data.get("device_id") or data.get("equipment") or data.get("equipment_id") or data.get("equipment_name") or data.get("asset_id") or data.get("asset") or "")
        if dev_id or any(k in data for k in ["PRESSURE", "temperature", "flow", "level", "vibration", "data", "telemetry", "tags"]):
            target_id = dev_id or (dm_store.devices[0].get("identifier", "dev-gateway") if dm_store.devices else "dev-gateway")
            # Ingest through DM Broker engine
            ingest_result = dm_store.ingest_device_telemetry(target_id, data)
            updated_count += ingest_result.get("attributes_updated", 0)

            # Dispatch Event Forwarding for updated equipment
            if ingest_result.get("updated_attrs"):
                from app.services.event_forwarder import event_forwarder
                forwarded_aids = set()
                for item in ingest_result["updated_attrs"]:
                    aid = item["asset_id"]
                    if aid not in forwarded_aids:
                        forwarded_aids.add(aid)
                        m_asset = next((a for a in dm_store.assets if a["id"] == aid), None)
                        if m_asset:
                            all_attrs = {at["name"]: at["value"] for at in m_asset.get("attributes", []) if at.get("value") is not None}
                            asyncio.create_task(
                                event_forwarder.forward_asset_event(
                                    asset_id=aid,
                                    asset_name=m_asset["name"],
                                    attributes=all_attrs,
                                    event_forwardings=dm_store.event_forwardings,
                                    log_event_fn=dm_store.log_event,
                                    only_if_changed=False
                                )
                            )

        # Acknowledge back to sender
        ack = {
            "status": "SUCCESS",
            "protocol": "SOCKET_IO",
            "updated_points": updated_count,
            "timestamp": now_iso
        }
        await sio.emit('telemetry_ack', ack, to=sid)
        return ack

    except Exception as e:
        logger.error("Socket.IO telemetry ingest error: %s", e)
        err_ack = {"status": "ERROR", "error": str(e)}
        await sio.emit('telemetry_ack', err_ack, to=sid)
        return err_ack

@sio.event
async def csv_row(sid, data):
    """
    Ingests a single CSV row object or delimited string from Node-RED via Socket.IO
    """
    try:
        row_obj = {}
        if isinstance(data, dict):
            row_obj = data
        elif isinstance(data, str):
            # Parse comma delimited
            parts = [p.strip() for p in data.split(',')]
            if len(parts) >= 2:
                row_obj = {f"col_{i}": v for i, v in enumerate(parts)}

        tags = {}
        ts = row_obj.pop("timestamp", None) or (datetime.datetime.utcnow().isoformat() + "Z")
        dev_id = row_obj.pop("deviceid", None) or row_obj.pop("device_id", None)

        for k, v in row_obj.items():
            try:
                tags[k] = float(v)
            except (ValueError, TypeError):
                pass

        if dev_id:
            dm_store.ingest_device_telemetry(str(dev_id), tags)

        if tags:
            tag_cache = {k: {"value": v, "quality": "GOOD", "timestamp": ts} for k, v in tags.items()}
            await redis_service.set_live_values(tag_cache)
            await redis_service.publish_telemetry({
                "timestamp": ts,
                "tags": tags,
                "quality": "GOOD"
            })

        ack = {"status": "SUCCESS", "protocol": "SOCKET_IO", "tags_updated": len(tags)}
        await sio.emit('csv_ack', ack, to=sid)
        return ack
    except Exception as e:
        err = {"status": "ERROR", "error": str(e)}
        await sio.emit('csv_ack', err, to=sid)
        return err

@sio.event
async def csv_bulk(sid, data):
    """
    Ingests complete multi-row CSV payload via Socket.IO
    """
    try:
        csv_text = data if isinstance(data, str) else data.get("csv", "")
        f = io.StringIO(csv_text)
        reader = csv.DictReader(f)
        row_count = 0
        point_count = 0

        latest_tags = {}
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"

        for row in reader:
            row_count += 1
            ts = row.get("timestamp") or row.get("Timestamp_UTC") or now_iso
            dev_id = row.get("deviceid")

            # Check if Yokogawa single tag format
            if "TagName" in row and "Value" in row:
                tname = row["TagName"]
                try:
                    val = float(row["Value"])
                    latest_tags[tname] = val
                    point_count += 1
                except ValueError:
                    pass
            else:
                # Multi-column format
                dev_attrs = {}
                for col_name, val_str in row.items():
                    if col_name.lower() in ("timestamp", "timestamp_utc", "deviceid", "quality"):
                        continue
                    try:
                        val = float(val_str)
                        latest_tags[col_name] = val
                        dev_attrs[col_name] = val
                        point_count += 1
                    except (ValueError, TypeError):
                        pass
                if dev_id and dev_attrs:
                    dm_store.ingest_device_telemetry(dev_id, dev_attrs)

        if latest_tags:
            tag_cache = {k: {"value": v, "quality": "GOOD", "timestamp": now_iso} for k, v in latest_tags.items()}
            await redis_service.set_live_values(tag_cache)
            await redis_service.publish_telemetry({
                "timestamp": now_iso,
                "tags": latest_tags,
                "quality": "GOOD"
            })

        ack = {
            "status": "SUCCESS",
            "protocol": "SOCKET_IO",
            "rows_processed": row_count,
            "points_ingested": point_count
        }
        await sio.emit('csv_ack', ack, to=sid)
        return ack
    except Exception as e:
        err = {"status": "ERROR", "error": str(e)}
        await sio.emit('csv_ack', err, to=sid)
        return err

async def broadcast_socketio_telemetry(data: Dict[str, Any]):
    """Broadcasts outgoing telemetry packets to all connected Socket.IO clients"""
    try:
        await sio.emit('telemetry', data)
    except Exception:
        pass
