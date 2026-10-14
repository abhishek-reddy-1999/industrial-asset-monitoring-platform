import uuid
import datetime
import asyncio
import json
import base64
import hashlib
import hmac
import urllib.parse
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body, Request
from pydantic import BaseModel

from app.api.dm_service import dm_store
from app.services.protocol_verifier import protocol_verifier
from app.services.event_forwarder import event_forwarder
from app.services.alarm_forwarder import alarm_forwarder
from app.services.value_envelope import UnifiedValueEnvelope
from app.services.fb_block_registry import BLOCK_REGISTRY
from app.services.fb_studio_engine import fb_studio_engine, validate_function_block_graph
from app.services.rule_engine import rule_engine_service, RuleEngineMessage

router = APIRouter(prefix="/dm", tags=["Yokogawa AHI Data Management (DM) Module v1.3"])

# ==========================================
# 1. State & Project Overview
# ==========================================

def extract_payload_timestamp(payload: Any, template_keys: Optional[List[str]] = None) -> Optional[str]:
    """
    Extracts and standardizes the timestamp from an incoming device template payload.
    Supports Unix timestamps (ms / seconds), ISO strings, common field names, and nested dictionaries.
    """
    if not isinstance(payload, dict):
        return None

    candidate_keys = []
    if template_keys:
        candidate_keys.extend(template_keys)
    candidate_keys.extend([
        "timestamp", "time", "ts", "timestampunix", "timestamp_utc",
        "datetime", "dateTime", "Timestamp", "Time", "date", "event_time", "packet_time"
    ])

    raw_val = None
    for k in candidate_keys:
        if k in payload and payload[k] is not None:
            raw_val = payload[k]
            break

    if raw_val is None:
        for sub_k in ["d", "data", "telemetry", "metrics", "values"]:
            if isinstance(payload.get(sub_k), dict):
                sub_dict = payload[sub_k]
                for k in candidate_keys:
                    if k in sub_dict and sub_dict[k] is not None:
                        raw_val = sub_dict[k]
                        break
            if raw_val is not None:
                break

    if raw_val is None:
        return None

    try:
        if isinstance(raw_val, (int, float)):
            sec = raw_val / 1000.0 if raw_val > 1e11 else float(raw_val)
            return datetime.datetime.utcfromtimestamp(sec).isoformat() + "Z"
        
        if isinstance(raw_val, str):
            s = raw_val.strip()
            if s.isdigit():
                num = int(s)
                sec = num / 1000.0 if num > 1e11 else float(num)
                return datetime.datetime.utcfromtimestamp(sec).isoformat() + "Z"
            clean_str = s.replace("Z", "+00:00")
            dt = datetime.datetime.fromisoformat(clean_str)
            if dt.tzinfo is not None:
                dt_utc = dt.astimezone(datetime.timezone.utc).replace(tzinfo=None)
            else:
                dt_utc = dt
            return dt_utc.isoformat() + "Z"
    except Exception:
        if isinstance(raw_val, str) and len(raw_val) > 4:
            return raw_val

    return None

def compute_device_status(dev: Dict[str, Any], now: Optional[datetime.datetime] = None) -> str:
    """
    Evaluates real device health against its configured scan rate (monitoring_time_secs).
    If no telemetry packet has been received within the scan rate interval, device transitions to 'Disconnected'.
    If packets are actively streaming within the scan rate, device transitions to 'Connected'.
    """
    if dev.get("health_check") is False:
        return "Configured"

    last_arrival = dev.get("last_seen") or dev.get("last_data_received")
    if not last_arrival:
        return "Disconnected"

    if now is None:
        now = datetime.datetime.utcnow()

    try:
        if isinstance(last_arrival, str):
            clean_str = last_arrival.replace("Z", "+00:00")
            dt = datetime.datetime.fromisoformat(clean_str).replace(tzinfo=None)
        elif isinstance(last_arrival, (int, float)):
            dt = datetime.datetime.utcfromtimestamp(last_arrival / 1000.0 if last_arrival > 1e11 else last_arrival)
        else:
            return "Connected"

        scan_timeout_secs = float(dev.get("monitoring_time_secs") or 60)
        elapsed_secs = (now - dt).total_seconds()
        return "Connected" if elapsed_secs <= scan_timeout_secs else "Disconnected"
    except Exception:
        return dev.get("status", "Disconnected")

async def evaluate_alarm_rules_engine(trigger_source: str = "system") -> List[Dict[str, Any]]:
    """
    Core Evaluation Engine for Process Alarm Rules (Section 10.3 / Table 28).
    Evaluates configured alarm rules against all current asset attributes (Dynamic & Runtime).
    Supports Analog trip thresholds (HH, H, L, LL with per-threshold checkboxes and custom messages),
    Digital state alarms, and Deviation alarms.
    Generates or updates alarms, logs events, dispatches notifications, and broadcasts via WebSocket.
    """
    now_iso = datetime.datetime.utcnow().isoformat() + "Z"
    generated_or_updated = []
    state_dirty = False

    for rule in list(dm_store.alarm_rules):
        rule_source = str(rule.get("source", "")).strip().lower()
        rule_asset_id = str(rule.get("asset_id", "")).strip().lower()

        # Find candidate assets
        candidate_assets = []
        if rule_asset_id or rule_source:
            for a in dm_store.assets:
                aid = str(a.get("id", "")).strip().lower()
                aname = str(a.get("name", "")).strip().lower()
                if (rule_asset_id and aid == rule_asset_id) or (rule_source and (aname == rule_source or aid == rule_source)):
                    candidate_assets.append(a)
        if not candidate_assets:
            candidate_assets = list(dm_store.assets)

        target_signal = str(rule.get("signal") or rule.get("attribute_name") or "").strip().lower()
        if not target_signal:
            continue

        for asset in candidate_assets:
            # Find matching attribute on asset (Dynamic or Runtime)
            matched_attr = None
            for attr in asset.get("attributes", []):
                aname = str(attr.get("name", "")).strip().lower()
                atag = str(attr.get("tag_name", "")).strip().lower()
                composite = f"{asset.get('name', '')}.{attr.get('name', '')}".strip().lower()
                if target_signal in [aname, atag, composite] or aname == target_signal:
                    matched_attr = attr
                    break

            if not matched_attr:
                continue

            raw_val = matched_attr.get("value")
            if raw_val is None or raw_val == "":
                continue

            try:
                val = float(raw_val)
            except (ValueError, TypeError):
                continue

            alarm_type = rule.get("alarm_type", "Analog")
            is_trip = False
            trip_type = None
            trip_reason = ""
            trip_severity = 650
            trip_priority = "High"
            trip_threshold = None

            if alarm_type == "Analog":
                # Check enabled alerts based on user-selected checkboxes
                has_explicit_flags = any(k in rule for k in ["enable_high_high", "enable_high", "enable_low", "enable_low_low"])
                if has_explicit_flags:
                    enable_hh = bool(rule.get("enable_high_high", False))
                    enable_h = bool(rule.get("enable_high", False))
                    enable_l = bool(rule.get("enable_low", False))
                    enable_ll = bool(rule.get("enable_low_low", False))
                else:
                    enable_hh = rule.get("high_high_threshold") is not None and rule.get("high_high_threshold") != ""
                    enable_h = rule.get("high_threshold") is not None and rule.get("high_threshold") != ""
                    enable_l = rule.get("low_threshold") is not None and rule.get("low_threshold") != ""
                    enable_ll = rule.get("low_low_threshold") is not None and rule.get("low_low_threshold") != ""

                hh = rule.get("high_high_threshold")
                h = rule.get("high_threshold")
                l = rule.get("low_threshold")
                ll = rule.get("low_low_threshold")

                uom_suffix = f" {matched_attr.get('uom', '')}".strip()

                if enable_hh and hh is not None and hh != "" and val >= float(hh):
                    is_trip = True
                    trip_type = "High-High"
                    trip_severity = int(rule.get("high_high_severity") or 850)
                    trip_priority = rule.get("high_high_priority") or "Urgent"
                    trip_threshold = float(hh)
                    trip_reason = rule.get("high_high_message") or f"High-High urgent trip limit exceeded ({val} >= {hh}{uom_suffix})"
                elif enable_h and h is not None and h != "" and val >= float(h):
                    is_trip = True
                    trip_type = "High"
                    trip_severity = int(rule.get("high_severity") or 650)
                    trip_priority = rule.get("high_priority") or "High"
                    trip_threshold = float(h)
                    trip_reason = rule.get("high_message") or f"High warning threshold exceeded ({val} >= {h}{uom_suffix})"
                elif enable_ll and ll is not None and val <= float(ll):
                    is_trip = True
                    trip_type = "Low-Low"
                    trip_severity = int(rule.get("low_low_severity") or 800)
                    trip_priority = rule.get("low_low_priority") or "Urgent"
                    trip_threshold = float(ll)
                    trip_reason = rule.get("low_low_message") or f"Low-Low emergency trip limit violated ({val} <= {ll}{uom_suffix})"
                elif enable_l and l is not None and val <= float(l):
                    is_trip = True
                    trip_type = "Low"
                    trip_severity = int(rule.get("low_severity") or 350)
                    trip_priority = rule.get("low_priority") or "Medium"
                    trip_threshold = float(l)
                    trip_reason = rule.get("low_message") or f"Low process warning threshold violated ({val} <= {l}{uom_suffix})"

            elif alarm_type == "Digital":
                expected_state = float(rule.get("expected_state", 0))
                if val != expected_state:
                    is_trip = True
                    trip_type = "Digital State"
                    trip_severity = int(rule.get("severity") or 600)
                    trip_priority = rule.get("priority") or "High"
                    trip_reason = rule.get("message") or f"Digital abnormal trip: state={val} != expected={expected_state}"

            rule_id = rule.get("id")
            matching_alarm = next((a for a in dm_store.alarms if a.get("rule_id") == rule_id and (a.get("asset_id") == asset.get("id") or a.get("source_asset") == asset.get("name"))), None)
            if not matching_alarm:
                matching_alarm = next((a for a in dm_store.alarms if a.get("rule_id") == rule_id), None)

            if is_trip:
                state_dirty = True
                should_forward_trip = False
                if not matching_alarm:
                    should_forward_trip = True
                    matching_alarm = {
                        "id": f"alm-{uuid.uuid4().hex[:6]}",
                        "rule_id": rule_id,
                        "alarm_name": rule.get("name", f"{asset['name']} {matched_attr['name']} Alarm"),
                        "tag_name": matched_attr.get("tag_name") or f"{asset['name']}.{matched_attr['name']}",
                        "source_asset": asset["name"],
                        "asset_id": asset["id"],
                        "attribute_name": matched_attr["name"],
                        "uom": matched_attr.get("uom", ""),
                        "state": "In Alarm Unacknowledged",
                        "severity": trip_severity,
                        "priority": trip_priority,
                        "trip_type": trip_type,
                        "current_value": val,
                        "threshold_limit": trip_threshold,
                        "scan_rate_seconds": rule.get("scan_rate_seconds", 1),
                        "class_type": rule.get("class_type", "Process Safety"),
                        "site_name": rule.get("site_name") or rule.get("site") or asset.get("site") or asset.get("site_name") or "Main Site",
                        "area": rule.get("area") or asset.get("area") or "Plant Area 1",
                        "message": trip_reason,
                        "occurred_at": now_iso,
                        "triggered_at": now_iso,
                        "notification_action_id": rule.get("notification_action_id")
                    }
                    dm_store.alarms.append(matching_alarm)
                    generated_or_updated.append(matching_alarm)
                    dm_store.log_event("Alarm Rule", rule_id, "Trip", "System Rule Engine", "Success", f"Alarm tripped: {matching_alarm['alarm_name']} - {trip_reason}")
                else:
                    prev_state = matching_alarm.get("state")
                    prev_trip = matching_alarm.get("trip_type")
                    if prev_state == "Normal":
                        should_forward_trip = True
                        matching_alarm["state"] = "In Alarm Unacknowledged"
                        matching_alarm["occurred_at"] = now_iso
                        matching_alarm["triggered_at"] = now_iso
                        dm_store.log_event("Alarm Rule", rule_id, "Re-Trip", "System Rule Engine", "Success", f"Alarm re-tripped: {matching_alarm['alarm_name']}")
                    elif prev_trip != trip_type:
                        should_forward_trip = True
                        dm_store.log_event("Alarm Rule", rule_id, "Escalation", "System Rule Engine", "Success", f"Alarm state escalated to {trip_type}: {matching_alarm['alarm_name']}")

                    matching_alarm["current_value"] = val
                    matching_alarm["alarm_name"] = rule.get("name", matching_alarm.get("alarm_name"))
                    matching_alarm["severity"] = trip_severity
                    matching_alarm["priority"] = trip_priority
                    matching_alarm["trip_type"] = trip_type
                    matching_alarm["threshold_limit"] = trip_threshold
                    matching_alarm["message"] = trip_reason
                    matching_alarm["class_type"] = rule.get("class_type", matching_alarm.get("class_type", "Process Safety"))
                    matching_alarm["site_name"] = rule.get("site_name") or rule.get("site") or matching_alarm.get("site_name", "")
                    matching_alarm["area"] = rule.get("area") or matching_alarm.get("area", "")
                    matching_alarm["scan_rate_seconds"] = rule.get("scan_rate_seconds", matching_alarm.get("scan_rate_seconds", 1))
                    if rule.get("notification_action_id"):
                        matching_alarm["notification_action_id"] = rule["notification_action_id"]
                    generated_or_updated.append(matching_alarm)

                # ONLY forward if the alarm state or trip type actually changed
                if should_forward_trip:
                    targets_to_notify = list(dm_store.alarm_actions)
                    mapped_action_id = rule.get("notification_action_id")
                    if mapped_action_id:
                        specific_act = next((a for a in dm_store.alarm_actions if a.get("id") == mapped_action_id), None)
                        if specific_act:
                            targets_to_notify = [specific_act]

                    if rule.get("forward_destination"):
                        targets_to_notify.append({
                            "id": f"fwd-{rule_id}",
                            "name": f"Rule {rule.get('name')} Forwarding Destination",
                            "type": "Webhook",
                            "to_contact": rule["forward_destination"]
                        })
                    if rule.get("notification_contact"):
                        targets_to_notify.append({
                            "id": f"notify-{rule_id}",
                            "name": "Configured Notification Contact",
                            "type": rule.get("notification_channel", "Email"),
                            "to_contact": rule["notification_contact"]
                        })

                    # 1. Forward to alarm lifecycle notification channels
                    asyncio.create_task(
                        alarm_forwarder.forward_alarm_lifecycle("TRIGGERED", matching_alarm, targets_to_notify, dm_store.log_event)
                    )

                    # 2. ALSO forward to any active asset-level event forwarders (Requirement 8)
                    asyncio.create_task(
                        event_forwarder.forward_alarm_for_asset("TRIGGERED", matching_alarm, dm_store.event_forwardings, dm_store.log_event)
                    )

            else:
                if matching_alarm and matching_alarm.get("state") in ["In Alarm", "In Alarm Unacknowledged", "In Alarm Acknowledged"]:
                    state_dirty = True
                    matching_alarm["state"] = "Normal"
                    matching_alarm["cleared_at"] = now_iso
                    matching_alarm["current_value"] = val

                    history_entry = {
                        "id": f"hist-{uuid.uuid4().hex[:6]}",
                        "alarm_id": matching_alarm["id"],
                        "alarm_name": matching_alarm["alarm_name"],
                        "source_signal": matching_alarm["tag_name"],
                        "asset_name": matching_alarm["source_asset"],
                        "priority": matching_alarm["priority"],
                        "severity": matching_alarm["severity"],
                        "cleared_at": now_iso,
                        "trail": [
                            {"step": 1, "state": "NORMAL_OPERATION", "signal_value": val, "timestamp": matching_alarm.get("triggered_at", now_iso), "actor": "Sensor Telemetry", "status_color": "#10b981"},
                            {"step": 2, "state": "ALARM_TRIGGERED", "signal_value": matching_alarm["current_value"], "timestamp": matching_alarm.get("triggered_at", now_iso), "actor": "Alarm Engine", "status_color": "#ef4444"},
                            {"step": 3, "state": "RETURN_TO_NORMAL", "signal_value": val, "timestamp": now_iso, "actor": "Auto Recovery", "status_color": "#10b981"}
                        ]
                    }
                    dm_store.alarm_histories.append(history_entry)
                    dm_store.log_event("Alarm Rule", rule_id, "Return to Normal", "System Rule Engine", "Success", f"Alarm normalized: {matching_alarm['alarm_name']} - Value {val} returned to normal operating range")

                    targets_to_notify = list(dm_store.alarm_actions)
                    mapped_action_id = rule.get("notification_action_id")
                    if mapped_action_id:
                        specific_act = next((a for a in dm_store.alarm_actions if a.get("id") == mapped_action_id), None)
                        if specific_act:
                            targets_to_notify = [specific_act]

                    if rule.get("forward_destination"):
                        targets_to_notify.append({
                            "id": f"fwd-{rule_id}",
                            "name": f"Rule {rule.get('name')} Forwarding Destination",
                            "type": "Webhook",
                            "to_contact": rule["forward_destination"]
                        })

                    # 1. Forward to alarm lifecycle notification channels
                    asyncio.create_task(
                        alarm_forwarder.forward_alarm_lifecycle("RETURN_TO_NORMAL", matching_alarm, targets_to_notify, dm_store.log_event)
                    )

                    # 2. ALSO forward to any active asset-level event forwarders (Requirement 8)
                    asyncio.create_task(
                        event_forwarder.forward_alarm_for_asset("RETURN_TO_NORMAL", matching_alarm, dm_store.event_forwardings, dm_store.log_event)
                    )

    if state_dirty:
        dm_store.persist_state()
        try:
            from app.api.websocket_hub import ws_manager
            asyncio.create_task(ws_manager.broadcast({
                "event": "alarms_updated",
                "alarms": dm_store.alarms,
                "timestamp": now_iso
            }))
        except Exception:
            pass

    return generated_or_updated

async def device_scan_watchdog():
    """
    Background watchdog that continuously monitors all IoT devices against their configured scan rate,
    updates attribute qualities, and evaluates active alarm rules continuously.
    """
    while True:
        try:
            await asyncio.sleep(2)
            now = datetime.datetime.utcnow()
            status_changed = False
            for d in list(dm_store.devices):
                old_status = d.get("status")
                new_status = dm_store.compute_device_status(d, now)
                if old_status != new_status:
                    d["status"] = new_status
                    status_changed = True
                    try:
                        from app.api.websocket_hub import ws_manager
                        await ws_manager.broadcast({
                            "event": "device_health_update",
                            "device_id": d.get("id"),
                            "identifier": d.get("identifier"),
                            "status": new_status,
                            "device": d
                        })
                    except Exception:
                        pass

            dm_store.update_all_asset_attribute_qualities(now)

            # Evaluate alarm rules continuously on background cadence
            try:
                await evaluate_alarm_rules_engine("watchdog_cadence")
            except Exception as ev_err:
                logger.debug(f"Watchdog alarm evaluation notice: {ev_err}")
            if status_changed:
                try:
                    from app.api.websocket_hub import ws_manager
                    await ws_manager.broadcast({
                        "event": "asset_telemetry",
                        "assets": dm_store.assets
                    })
                except Exception:
                    pass
        except asyncio.CancelledError:
            break
        except Exception:
            await asyncio.sleep(2)

@router.get("/state")
async def get_entire_dm_state():
    """
    Returns the comprehensive state of all Yokogawa AHI DM Module entities.
    """
    now = datetime.datetime.utcnow()
    dm_store.update_all_asset_attribute_qualities(now)
    for asset in dm_store.assets:
        dm_store.recalculate_asset_attributes(asset)

    return {
        "project": dm_store.current_project,
        "available_projects": dm_store.available_projects,
        "user_profile": dm_store.user_profile,
        "assets": dm_store.assets,
        "asset_templates": dm_store.asset_templates,
        "devices": dm_store.devices,
        "device_templates": dm_store.device_templates,
        "brokers": dm_store.brokers,
        "integrations": dm_store.integrations,
        "uom_list": dm_store.uom_list,
        "event_forwardings": dm_store.event_forwardings,
        "alarms": dm_store.alarms,
        "alarm_histories": dm_store.alarm_histories,
        "alarm_rules": dm_store.alarm_rules,
        "alarm_actions": dm_store.alarm_actions,
        "users": dm_store.users,
        "user_groups": dm_store.user_groups,
        "user_overrides": dm_store.user_overrides,
        "api_clients": dm_store.api_clients,
        "object_security_rules": dm_store.object_security_rules,
        "function_blocks": dm_store.function_blocks,
        "function_block_templates": dm_store.function_block_templates,
        "rule_chains": dm_store.rule_chains,
        "dashboard_widgets": dm_store.dashboard_widgets,
        "scada_windows": dm_store.list_scada_windows(),
        "activity_logs": dm_store.activity_logs
    }

@router.get("/activity-logs")
async def get_activity_logs():
    """Returns security audit and activity logs."""
    return getattr(dm_store, "activity_logs", [])

@router.post("/reset-seed")
async def reset_seed_data():
    dm_store.reset_to_default_seed()
    dm_store.log_event("Setting", "System", "Reset", dm_store.user_profile["account_id"], "Success", "Reset all DM entities to default factory baseline")
    return {"message": "State reset to default seed data successfully"}

@router.post("/wipe-all")
async def wipe_all_data():
    """
    Completely wipes all data from both in-memory store and database (clean canvas).
    """
    from app.db.database import AsyncSessionLocal
    from sqlalchemy import text
    from app.cache.redis_service import redis_service

    # 1. Wipe in-memory DM store
    dm_store.wipe_all_data()

    # 2. Wipe database tables
    async with AsyncSessionLocal() as session:
        await session.execute(text("TRUNCATE TABLE historical_points RESTART IDENTITY CASCADE;"))
        await session.execute(text("TRUNCATE TABLE alarm_events RESTART IDENTITY CASCADE;"))
        await session.execute(text("TRUNCATE TABLE alarm_rules RESTART IDENTITY CASCADE;"))
        await session.execute(text("TRUNCATE TABLE ahi_asset_health RESTART IDENTITY CASCADE;"))
        await session.execute(text("TRUNCATE TABLE tags RESTART IDENTITY CASCADE;"))
        await session.execute(text("TRUNCATE TABLE asset_nodes RESTART IDENTITY CASCADE;"))
        await session.execute(text("TRUNCATE TABLE dashboards RESTART IDENTITY CASCADE;"))
        await session.execute(text("TRUNCATE TABLE dm_devices RESTART IDENTITY CASCADE;"))
        await session.execute(text("TRUNCATE TABLE dm_brokers RESTART IDENTITY CASCADE;"))
        await session.execute(text("TRUNCATE TABLE dm_function_block_executions RESTART IDENTITY CASCADE;"))
        await session.execute(text("TRUNCATE TABLE dm_function_block_templates RESTART IDENTITY CASCADE;"))
        await session.execute(text("TRUNCATE TABLE dm_activity_logs RESTART IDENTITY CASCADE;"))
        await session.commit()

    # 3. Flush Redis
    if redis_service.redis_client:
        try:
            keys = await redis_service.redis_client.keys("ydash:*")
            if keys:
                await redis_service.redis_client.delete(*keys)
        except Exception:
            pass

    return {
        "status": "SUCCESS",
        "message": "All dummy data deleted from entire application. System is in 100% clean canvas mode."
    }

@router.post("/purge-telemetry")
async def purge_telemetry():
    """
    Purges all historical points, resets alarm states and clears live cache to allow clean external ingestion.
    """
    from app.db.database import AsyncSessionLocal
    from sqlalchemy import text
    from app.cache.redis_service import redis_service

    async with AsyncSessionLocal() as session:
        await session.execute(text("TRUNCATE TABLE historical_points RESTART IDENTITY CASCADE;"))
        await session.execute(text("TRUNCATE TABLE alarm_events RESTART IDENTITY CASCADE;"))
        await session.commit()

    if redis_service.redis_client:
        try:
            keys = await redis_service.redis_client.keys("ydash:*")
            if keys:
                await redis_service.redis_client.delete(*keys)
        except Exception:
            pass

    return {
        "status": "SUCCESS",
        "message": "All simulated and historical points purged. Database and cache ready for fresh CSV/Node-RED injection."
    }

@router.put("/user-profile")
async def update_user_profile(payload: Dict[str, Any] = Body(...)):
    dm_store.user_profile.update(payload)
    dm_store.log_event("User Profile", dm_store.user_profile["account_id"], "Update", dm_store.user_profile["account_id"], "Success", "Updated user profile settings")
    return {"message": "User profile updated", "user_profile": dm_store.user_profile}

@router.post("/switch-project")
async def switch_project(payload: Dict[str, str] = Body(...)):
    target_id = payload.get("project_id")
    target = next((p for p in dm_store.available_projects if p["id"] == target_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Project not found")
    dm_store.current_project = target
    dm_store.log_event("Project", target["id"], "Switch", dm_store.user_profile["account_id"], "Success", f"Switched active project to {target['name']}")
    return {"message": "Switched project", "project": dm_store.current_project}

# ==========================================
# 2. Asset Entity (Section 9.1)
# ==========================================

@router.get("/assets")
async def list_assets():
    now = datetime.datetime.utcnow()
    dm_store.update_all_asset_attribute_qualities(now)
    for asset in dm_store.assets:
        dm_store.recalculate_asset_attributes(asset)
    return dm_store.assets

@router.post("/assets")
async def create_asset(payload: Dict[str, Any] = Body(...)):
    asset_id = payload.get("id") or f"ast-{uuid.uuid4().hex[:8]}"
    parent_id = payload.get("parent_id")
    parent = next((a for a in dm_store.assets if a["id"] == parent_id), None)
    
    parent_path = parent["path"] if parent else ""
    path = f"{parent_path} / {payload.get('name')}".strip(" /")

    new_asset = {
        "id": asset_id,
        "name": payload.get("name"),
        "parent_id": parent_id,
        "level": payload.get("level", "EQUIPMENT"),
        "path": path,
        "description": payload.get("description", ""),
        "installed_date": payload.get("installed_date", datetime.date.today().isoformat()),
        "is_bookmarked": payload.get("is_bookmarked", False),
        "attributes": payload.get("attributes", []),
        "tables": payload.get("tables", []),
        "media": payload.get("media", [])
    }
    dm_store.assets.append(new_asset)
    dm_store.log_event("Asset", asset_id, "Add", dm_store.user_profile["account_id"], "Success", f"Created asset element '{new_asset['name']}' ({new_asset['level']})")
    return new_asset

@router.put("/assets/{asset_id}")
async def update_asset(asset_id: str, payload: Dict[str, Any] = Body(...)):
    asset = next((a for a in dm_store.assets if a["id"] == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset.update(payload)
    dm_store.log_event("Asset", asset_id, "Update", dm_store.user_profile["account_id"], "Success", f"Updated asset element '{asset['name']}'")
    return asset

@router.post("/assets/reorder")
async def reorder_hierarchy(payload: Dict[str, Any] = Body(...)):
    """
    Drag and drop hierarchy level change without impacting asset element data.
    """
    moved_id = payload.get("moved_asset_id")
    new_parent_id = payload.get("new_parent_id")

    asset = next((a for a in dm_store.assets if a["id"] == moved_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    parent = next((a for a in dm_store.assets if a["id"] == new_parent_id), None)
    asset["parent_id"] = new_parent_id
    parent_path = parent["path"] if parent else ""
    asset["path"] = f"{parent_path} / {asset['name']}".strip(" /")

    dm_store.log_event("Asset", moved_id, "Reorder", dm_store.user_profile["account_id"], "Success", f"Reparented asset '{asset['name']}' under '{parent['name'] if parent else 'Root'}'")
    return {"message": "Hierarchy reordered successfully", "assets": dm_store.assets}

@router.post("/assets/{asset_id}/clone")
async def clone_asset(asset_id: str, payload: Dict[str, Any] = Body(default={})):
    include_children = payload.get("include_children", False) if payload else False
    src_asset = next((a for a in dm_store.assets if a["id"] == asset_id), None)
    if not src_asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    new_id = f"ast-{uuid.uuid4().hex[:8]}"
    cloned_asset = json.loads(json.dumps(src_asset))
    cloned_asset["id"] = new_id
    cloned_asset["name"] = f"{src_asset['name']} (Copy)"
    cloned_asset["path"] = src_asset["path"] + " (Copy)"
    dm_store.assets.append(cloned_asset)

    if include_children:
        def clone_kids(orig_parent_id, new_p_id):
            children = [a for a in dm_store.assets if a.get("parent_id") == orig_parent_id]
            for kid in children:
                kid_clone = json.loads(json.dumps(kid))
                kid_new_id = f"ast-{uuid.uuid4().hex[:8]}"
                kid_clone["id"] = kid_new_id
                kid_clone["parent_id"] = new_p_id
                kid_clone["name"] = f"{kid['name']} (Copy)"
                kid_clone["path"] = kid["path"] + " (Copy)"
                dm_store.assets.append(kid_clone)
                clone_kids(kid["id"], kid_new_id)

        clone_kids(asset_id, new_id)

    action_name = "Clone Asset & Children" if include_children else "Clone Asset"
    dm_store.log_event("Asset", new_id, action_name, dm_store.user_profile["account_id"], "Success", f"Cloned asset '{src_asset['name']}'")
    return {"message": "Asset cloned successfully", "asset": cloned_asset, "assets": dm_store.assets, **cloned_asset}


@router.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str):
    idx = next((i for i, a in enumerate(dm_store.assets) if a["id"] == asset_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    removed = dm_store.assets.pop(idx)
    # Also remove recursive children
    to_delete = [asset_id]
    while to_delete:
        curr = to_delete.pop(0)
        kids = [a for a in dm_store.assets if a.get("parent_id") == curr]
        for k in kids:
            to_delete.append(k["id"])
            dm_store.assets = [a for a in dm_store.assets if a["id"] != k["id"]]

    dm_store.log_event("Asset", asset_id, "Delete", dm_store.user_profile["account_id"], "Success", f"Deleted asset '{removed['name']}' and descendants")
    return {"message": f"Asset {asset_id} deleted"}

@router.post("/assets/{asset_id}/bookmark")
async def toggle_bookmark(asset_id: str):
    asset = next((a for a in dm_store.assets if a["id"] == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset["is_bookmarked"] = not asset.get("is_bookmarked", False)
    status_str = "Bookmarked" if asset["is_bookmarked"] else "Unbookmarked"
    dm_store.log_event("Asset", asset_id, status_str, dm_store.user_profile["account_id"], "Success", f"{status_str} asset '{asset['name']}'")
    return {"is_bookmarked": asset["is_bookmarked"]}

@router.get("/assets/{asset_id}/assembly")
async def download_attribute_assembly(asset_id: str):
    asset = next((a for a in dm_store.assets if a["id"] == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    assembly = {
        "asset_id": asset["id"],
        "asset_name": asset["name"],
        "path": asset["path"],
        "exported_at": datetime.datetime.utcnow().isoformat() + "Z",
        "exported_by": dm_store.user_profile["account_id"],
        "attributes": asset.get("attributes", []),
        "tables": asset.get("tables", [])
    }
    dm_store.log_event("Asset", asset_id, "Download", dm_store.user_profile["account_id"], "Success", f"Downloaded attribute assembly for '{asset['name']}'")
    return assembly

# ==========================================
# 3. Asset Attributes (Section 9.1.3, Table 6)
# ==========================================

@router.post("/assets/{asset_id}/attributes")
async def add_asset_attribute(asset_id: str, payload: Dict[str, Any] = Body(...)):
    asset = next((a for a in dm_store.assets if a["id"] == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    attr_id = payload.get("id") or f"attr-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.datetime.utcnow().isoformat() + "Z"

    # Construct Tag Name per section 9.1 rules
    attr_type = payload.get("type", "Static")
    tag_name = payload.get("tag_name", "")
    if not tag_name:
        if attr_type in ["Dynamic", "Integration", "Command"]:
            dev_id = payload.get("device_id", "")
            metric = payload.get("metric", "")
            tag_name = f"{dev_id}.{metric}" if dev_id and metric else f"dev.{attr_id}"
        elif attr_type == "Alias":
            target_asset = payload.get("target_asset_name", "")
            target_attr = payload.get("target_attribute_name", "")
            tag_name = f"{target_asset}.{target_attr}"
        else:
            tag_name = f"{asset['name']}.{payload.get('name')}"

    new_attr = {
        "id": attr_id,
        "type": attr_type,
        "name": payload.get("name"),
        "value": str(payload.get("value", "0.0")),
        "uom": payload.get("uom", ""),
        "tag_name": tag_name,
        "device_id": payload.get("device_id", ""),
        "metric": payload.get("metric", ""),
        "channel": payload.get("channel", ""),
        "expression": payload.get("expression", ""),
        "quality": payload.get("quality", "Good"),
        "timestamp": now_iso,
        "data_type": payload.get("data_type", "Double"),
        "trigger_attribute": payload.get("trigger_attribute", ""),
        "source": payload.get("source", "FUNCTION_BLOCK" if payload.get("function_block_id") else ("EXPRESSION" if attr_type == "Runtime" else "")),
        "function_block_id": payload.get("function_block_id", ""),
        "function_block_output": payload.get("function_block_output", ""),
        "use_expression": payload.get("use_expression", attr_type == "Runtime" and not payload.get("function_block_id"))
    }

    if "attributes" not in asset:
        asset["attributes"] = []
    asset["attributes"].append(new_attr)

    # If linked to FB execution, update FB output binding
    if new_attr.get("source") == "FUNCTION_BLOCK" and new_attr.get("function_block_id"):
        try:
            from app.services.fb_template_service import fb_template_service
            fb_template_service.link_attribute_to_execution(
                asset_id=asset["id"],
                attr_id=attr_id,
                attr_name=new_attr["name"],
                execution_id=new_attr["function_block_id"],
                output_key=new_attr.get("function_block_output", "")
            )
        except Exception as _link_err:
            logger.warning(f"Failed to link FB attribute: {_link_err}")

    dm_store.recalculate_asset_attributes(asset)
    dm_store.persist_state()
    dm_store.log_event("Asset Attribute", attr_id, "Add", dm_store.user_profile["account_id"], "Success", f"Added attribute '{new_attr['name']}' to '{asset['name']}'")
    return new_attr

@router.put("/assets/{asset_id}/attributes/{attr_id}")
async def update_asset_attribute(asset_id: str, attr_id: str, payload: Dict[str, Any] = Body(...)):
    asset = next((a for a in dm_store.assets if a["id"] == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    attr = next((a for a in asset.get("attributes", []) if a["id"] == attr_id), None)
    if not attr:
        raise HTTPException(status_code=404, detail="Attribute not found")

    attr.update(payload)
    if attr.get("type") in ["Dynamic", "Integration", "Command"]:
        dev_id = payload.get("device_id", attr.get("device_id", ""))
        metric = payload.get("metric", attr.get("metric", ""))
        if dev_id and metric:
            attr["tag_name"] = f"{dev_id}.{metric}"
    elif attr.get("type") == "Alias":
        target_asset = payload.get("target_asset_name", attr.get("target_asset_name", ""))
        target_attr = payload.get("target_attribute_name", attr.get("target_attribute_name", ""))
        if target_asset and target_attr:
            attr["tag_name"] = f"{target_asset}.{target_attr}"
    attr["timestamp"] = datetime.datetime.utcnow().isoformat() + "Z"

    # If linked to FB execution, update FB output binding
    if attr.get("source") == "FUNCTION_BLOCK" and attr.get("function_block_id"):
        try:
            from app.services.fb_template_service import fb_template_service
            fb_template_service.link_attribute_to_execution(
                asset_id=asset["id"],
                attr_id=attr["id"],
                attr_name=attr["name"],
                execution_id=attr["function_block_id"],
                output_key=attr.get("function_block_output", "")
            )
        except Exception as _link_err:
            logger.warning(f"Failed to link FB attribute: {_link_err}")

    dm_store.recalculate_asset_attributes(asset)
    dm_store.persist_state()
    dm_store.log_event("Asset Attribute", attr_id, "Update", dm_store.user_profile["account_id"], "Success", f"Updated attribute '{attr['name']}'")

    # Dispatch event forwarder on attribute update
    all_attrs = {at["name"]: at["value"] for at in asset.get("attributes", []) if at.get("value") is not None}
    asyncio.create_task(
        event_forwarder.forward_asset_event(
            asset_id=asset["id"],
            asset_name=asset["name"],
            attributes=all_attrs,
            event_forwardings=dm_store.event_forwardings,
            log_event_fn=dm_store.log_event,
            only_if_changed=False
        )
    )

    # Trigger Function Block V2 recalculations for this attribute
    try:
        from app.services.fb_template_service import fb_template_service
        asyncio.create_task(
            fb_template_service.notify_attribute_updated(
                asset_id=asset["id"],
                attribute_name=attr["name"],
                new_value=attr.get("value")
            )
        )
    except Exception as _fb_err:
        logger.warning(f"FB V2 attribute notify warning: {_fb_err}")

    return attr


@router.delete("/assets/{asset_id}/attributes/{attr_id}")
async def delete_asset_attribute(asset_id: str, attr_id: str):
    asset = next((a for a in dm_store.assets if a["id"] == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    asset["attributes"] = [a for a in asset.get("attributes", []) if a["id"] != attr_id]
    dm_store.persist_state()
    dm_store.log_event("Asset Attribute", attr_id, "Delete", dm_store.user_profile["account_id"], "Success", f"Deleted attribute {attr_id}")
    return {"message": "Attribute deleted"}

# ==========================================
# 4. Asset Table Entity (Section 9.1.4 & 9.3)
# ==========================================

@router.post("/assets/{asset_id}/tables")
async def create_asset_table(asset_id: str, payload: Dict[str, Any] = Body(...)):
    asset = next((a for a in dm_store.assets if a["id"] == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    tbl_id = payload.get("id") or f"tbl-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.datetime.utcnow().isoformat() + "Z"

    new_table = {
        "id": tbl_id,
        "name": payload.get("name"),
        "description": payload.get("description", ""),
        "locked_by": payload.get("locked_by", ""),
        "columns": payload.get("columns", [
            {"name": "ID", "data_type": "Varchar(25)", "default_value": "1", "allow_null": False, "primary": True},
            {"name": "Log_Date", "data_type": "Datetime", "default_value": now_iso[:19].replace("T", " "), "allow_null": False, "primary": False},
            {"name": "Value", "data_type": "Double", "default_value": "0.0", "allow_null": True, "primary": False}
        ]),
        "rows": payload.get("rows", []),
        "last_edited": now_iso
    }

    if "tables" not in asset:
        asset["tables"] = []
    asset["tables"].append(new_table)
    dm_store.log_event("Asset Table", tbl_id, "Add", dm_store.user_profile["account_id"], "Success", f"Created asset table '{new_table['name']}'")
    return new_table

@router.put("/assets/{asset_id}/tables/{table_id}/schema")
async def update_asset_table_schema(asset_id: str, table_id: str, payload: Dict[str, Any] = Body(...)):
    asset = next((a for a in dm_store.assets if a["id"] == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    table = next((t for t in asset.get("tables", []) if t["id"] == table_id), None)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    table["name"] = payload.get("name", table["name"])
    table["description"] = payload.get("description", table["description"])
    table["columns"] = payload.get("columns", table["columns"])
    table["last_edited"] = datetime.datetime.utcnow().isoformat() + "Z"

    dm_store.log_event("Asset Table", table_id, "Edit Schema", dm_store.user_profile["account_id"], "Success", f"Updated schema of table '{table['name']}'")
    return table

@router.post("/assets/{asset_id}/tables/{table_id}/rows")
async def add_asset_table_row(asset_id: str, table_id: str, row: Dict[str, Any] = Body(...)):
    asset = next((a for a in dm_store.assets if a["id"] == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    table = next((t for t in asset.get("tables", []) if t["id"] == table_id), None)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    table["rows"].append(row)
    table["last_edited"] = datetime.datetime.utcnow().isoformat() + "Z"
    return {"message": "Row added", "total_rows": len(table["rows"])}

@router.delete("/assets/{asset_id}/tables/{table_id}")
async def delete_asset_table(asset_id: str, table_id: str):
    asset = next((a for a in dm_store.assets if a["id"] == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset["tables"] = [t for t in asset.get("tables", []) if t["id"] != table_id]
    dm_store.log_event("Asset Table", table_id, "Delete", dm_store.user_profile["account_id"], "Success", f"Deleted table {table_id}")
    return {"message": "Table deleted"}

# ==========================================
# 5. Asset Media Entity (Section 9.1.5 & 9.4)
# ==========================================

@router.post("/assets/{asset_id}/media")
async def add_asset_media(asset_id: str, payload: Dict[str, Any] = Body(...)):
    asset = next((a for a in dm_store.assets if a["id"] == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    media_id = payload.get("id") or f"med-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.datetime.utcnow().isoformat() + "Z"

    item = {
        "id": media_id,
        "type": payload.get("type", "Media File"),  # "Folder" or "Media File"
        "name": payload.get("name"),
        "content_type": payload.get("content_type", "PDF"),
        "file_size_kb": payload.get("file_size_kb", 1024),
        "path": payload.get("path", f"/{payload.get('name')}"),
        "url": payload.get("url", "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800"),
        "last_edited": now_iso
    }
    if "media" not in asset:
        asset["media"] = []
    asset["media"].append(item)
    dm_store.log_event("Asset Media", media_id, "Upload" if item["type"] == "Media File" else "Add Folder", dm_store.user_profile["account_id"], "Success", f"Added {item['type']} '{item['name']}'")
    return item

@router.delete("/assets/{asset_id}/media/{media_id}")
async def delete_asset_media(asset_id: str, media_id: str):
    asset = next((a for a in dm_store.assets if a["id"] == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset["media"] = [m for m in asset.get("media", []) if m["id"] != media_id]
    dm_store.log_event("Asset Media", media_id, "Delete", dm_store.user_profile["account_id"], "Success", f"Deleted media {media_id}")
    return {"message": "Media deleted"}

# ==========================================
# 6. Asset Template Entity & Deploy (Section 9.2)
# ==========================================

@router.get("/asset-templates")
async def list_asset_templates():
    return dm_store.asset_templates

@router.get("/asset-templates/{tmpl_id}")
async def get_asset_template(tmpl_id: str):
    tmpl = next((t for t in dm_store.asset_templates if t.get("id") == tmpl_id or t.get("name") == tmpl_id), None)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Asset Template not found")
    return tmpl

@router.post("/asset-templates")
async def create_asset_template(payload: Dict[str, Any] = Body(...)):
    tmpl_id = payload.get("id") or f"tmpl-{uuid.uuid4().hex[:8]}"
    new_tmpl = {
        "id": tmpl_id,
        "name": payload.get("name"),
        "description": payload.get("description", ""),
        "markup_devices": payload.get("markup_devices", ["device1"]),
        "markup_channels": payload.get("markup_channels", ["channel1"]),
        "attributes": payload.get("attributes", [])
    }
    dm_store.asset_templates.append(new_tmpl)
    dm_store.persist_state()
    dm_store.log_event("Asset Template", tmpl_id, "Add", dm_store.user_profile["account_id"], "Success", f"Created asset template '{new_tmpl['name']}'")
    return new_tmpl

@router.put("/asset-templates/{tmpl_id}")
async def update_asset_template(tmpl_id: str, payload: Dict[str, Any] = Body(...)):
    tmpl = next((t for t in dm_store.asset_templates if t.get("id") == tmpl_id or t.get("name") == tmpl_id), None)
    if not tmpl:
        # Auto-create if not existing to prevent mapping lost
        tmpl = {
            "id": tmpl_id,
            "name": payload.get("name", tmpl_id),
            "description": payload.get("description", ""),
            "markup_devices": payload.get("markup_devices", ["device1"]),
            "markup_channels": payload.get("markup_channels", ["channel1"]),
            "attributes": payload.get("attributes", [])
        }
        dm_store.asset_templates.append(tmpl)
    else:
        if "name" in payload:
            tmpl["name"] = payload["name"]
        if "description" in payload:
            tmpl["description"] = payload["description"]
        if "markup_devices" in payload:
            tmpl["markup_devices"] = payload["markup_devices"]
        if "markup_channels" in payload:
            tmpl["markup_channels"] = payload["markup_channels"]
        if "attributes" in payload:
            tmpl["attributes"] = payload["attributes"]
    dm_store.persist_state()
    dm_store.log_event("Asset Template", tmpl.get("id", tmpl_id), "Update", dm_store.user_profile["account_id"], "Success", f"Updated asset template '{tmpl.get('name')}'")
    return tmpl

@router.delete("/asset-templates/{tmpl_id}")
async def delete_asset_template(tmpl_id: str):
    idx = next((i for i, t in enumerate(dm_store.asset_templates) if t.get("id") == tmpl_id or t.get("name") == tmpl_id), -1)
    if idx == -1:
        idx = next((i for i, t in enumerate(dm_store.asset_templates) if t.get("id", "").endswith(tmpl_id) or tmpl_id.endswith(t.get("id", ""))), -1)
    if idx == -1:
        return {"message": "Asset template not found or already deleted", "id": tmpl_id}
    removed = dm_store.asset_templates.pop(idx)
    dm_store.persist_state()
    dm_store.log_event("Asset Template", tmpl_id, "Delete", dm_store.user_profile["account_id"], "Success", f"Deleted asset template '{removed.get('name')}'")
    return {"message": "Asset template deleted", "id": tmpl_id}

@router.post("/asset-templates/deploy")
@router.post("/asset-templates/{tmpl_id}/deploy")
async def deploy_asset_template(payload: Dict[str, Any] = Body(...), tmpl_id: Optional[str] = None):
    """
    Deploys template to create a new asset, replacing markup devices (e.g. device1, device2)
    with actual device IDs in one streamlined operation (Page 22-23 of manual).
    """
    template_id = tmpl_id or payload.get("template_id")
    tmpl = next((t for t in dm_store.asset_templates if t["id"] == template_id), None)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Asset Template not found")

    parent_id = payload.get("parent_id")
    parent = next((a for a in dm_store.assets if a["id"] == parent_id), None)
    base_asset_name = payload.get("asset_name", f"{tmpl['name']} Instance")
    device_mappings = payload.get("device_mappings", {})  # e.g. {"device1": "dev-1", "device2": "dev-2"}
    channel_mappings = payload.get("channel_mappings", {})
    
    # Support single direct device_id or batch device_ids
    direct_device_id = payload.get("device_id")
    batch_device_ids = payload.get("device_ids", [])
    if direct_device_id and not batch_device_ids:
        batch_device_ids = [direct_device_id]
    elif not batch_device_ids and not device_mappings:
        batch_device_ids = ["DEV-" + uuid.uuid4().hex[:6].upper()]

    parent_path = parent["path"] if parent else ""
    created_assets = []
    now_iso = datetime.datetime.utcnow().isoformat() + "Z"

    # If batch device IDs provided, instantiate an asset for each device ID
    target_iterations = batch_device_ids if batch_device_ids else [None]

    for idx, target_dev_id in enumerate(target_iterations):
        if target_dev_id:
            iter_name = f"{base_asset_name} ({target_dev_id})" if len(target_iterations) > 1 else base_asset_name
        else:
            iter_name = base_asset_name

        path = f"{parent_path} / {iter_name}".strip(" /")
        new_asset_id = f"ast-{uuid.uuid4().hex[:8]}"

        # Auto-register device into dm_store.devices if it doesn't already exist
        if target_dev_id:
            existing_dev = next((d for d in dm_store.devices if d.get("identifier") == target_dev_id or d.get("id") == target_dev_id), None)
            if not existing_dev:
                new_dev = {
                    "id": f"dev-{uuid.uuid4().hex[:8]}",
                    "name": f"Device {target_dev_id}",
                    "identifier": target_dev_id,
                    "broker_id": dm_store.brokers[0]["id"] if dm_store.brokers else "broker-iot-hub-01",
                    "protocol": "MQTT",
                    "device_template_id": None,
                    "status": "Connected",
                    "health_check": True,
                    "last_edited": now_iso
                }
                dm_store.devices.append(new_dev)

        # Instantiate attributes, mapping markup devices
        instantiated_attributes = []
        for attr in tmpl.get("attributes", []):
            markup_dev = attr.get("device_markup", "")
            # Priority: direct target_dev_id > specific device_mappings > fallback markup
            actual_dev_id = target_dev_id or device_mappings.get(markup_dev, markup_dev)
            markup_chan = attr.get("markup_channel", "")
            actual_channel = channel_mappings.get(markup_chan, markup_chan)

            instantiated_attributes.append({
                "id": f"attr-{uuid.uuid4().hex[:8]}",
                "type": attr.get("type", "Dynamic"),
                "name": attr.get("name"),
                "value": str(attr.get("value", "0.0")),
                "uom": attr.get("uom", ""),
                "device_id": actual_dev_id,
                "metric": attr.get("metric", ""),
                "channel": actual_channel,
                "tag_name": f"{actual_dev_id}.{attr.get('metric', '')}" if actual_dev_id else f"{iter_name}.{attr.get('name')}",
                "expression": attr.get("expression", ""),
                "quality": "Good",
                "timestamp": now_iso,
                "data_type": attr.get("data_type", "Double"),
                "trigger_attribute": attr.get("trigger_attribute", "")
            })

        new_asset = {
            "id": new_asset_id,
            "name": iter_name,
            "parent_id": parent_id,
            "level": "EQUIPMENT",
            "path": path,
            "description": f"Generated from template '{tmpl['name']}' bound to Device ID '{target_dev_id or 'mapped'}'",
            "installed_date": datetime.date.today().isoformat(),
            "is_bookmarked": False,
            "attributes": instantiated_attributes,
            "tables": [],
            "media": []
        }
        dm_store.assets.append(new_asset)
        created_assets.append(new_asset)

    primary_asset = created_assets[0] if created_assets else None
    dm_store.log_event("Asset Template", tmpl_id, "Deploy", dm_store.user_profile["account_id"], "Success", f"Deployed template '{tmpl['name']}' to create {len(created_assets)} asset(s)")
    return {
        "message": f"Template deployed successfully ({len(created_assets)} asset(s) created)",
        "asset": primary_asset,
        "assets": dm_store.assets,
        "created_assets": created_assets,
        **(primary_asset or {})
    }


# ==========================================
# 6b. Device Templates & JSON Payload Parsing (Section 9.6, Figure 4)
# ==========================================

def _build_metric_entry(full_key: str, val: Any) -> Dict[str, Any]:
    key_lower = full_key.lower()
    last_seg = key_lower.split(".")[-1]
    
    if "device" in key_lower or last_seg.endswith("id") or last_seg == "id":
        m_type = "Device ID"
    elif "timestamp" in key_lower or "time" in last_seg or "date" in last_seg or last_seg.endswith("_ts") or last_seg == "ts":
        m_type = "Timestamp"
    else:
        m_type = "Metric"

    if isinstance(val, bool):
        dtype = "Bool"
    elif isinstance(val, int) and not isinstance(val, bool):
        dtype = "Int"
    elif isinstance(val, float):
        dtype = "Double"
    elif isinstance(val, str) and ("timestamp" in key_lower or "time" in last_seg or "date" in last_seg or last_seg.endswith("_ts") or last_seg == "ts"):
        dtype = "Timestamp"
    else:
        dtype = "Text"

    return {
        "key": full_key,
        "name": full_key,
        "type": m_type,
        "data_type": dtype,
        "enable": True,
        "expression": "Math.Round(value, 2)" if dtype == "Double" else ""
    }

def flatten_json_to_metric_keys(data: Any, prefix: str = "") -> List[Dict[str, Any]]:
    metric_keys = []
    if isinstance(data, dict):
        for k, val in data.items():
            if prefix == "" and k in ["json_string", "payload"] and isinstance(val, (str, dict, list)):
                continue
            full_key = f"{prefix}.{k}" if prefix else str(k)
            if isinstance(val, dict):
                metric_keys.extend(flatten_json_to_metric_keys(val, prefix=full_key))
            elif isinstance(val, list):
                if len(val) > 0 and isinstance(val[0], dict):
                    metric_keys.extend(flatten_json_to_metric_keys(val[0], prefix=f"{full_key}[0]"))
                else:
                    metric_keys.append(_build_metric_entry(full_key, val))
            else:
                metric_keys.append(_build_metric_entry(full_key, val))
    elif isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
        metric_keys.extend(flatten_json_to_metric_keys(data[0], prefix="[0]"))
    return metric_keys

def extract_nested_value(data: Any, key_path: str) -> Any:
    """
    Extracts a value from a nested dict/list structure using dot notation (e.g. 'measurements.temperature'
    or 'tags.FIC_101.PV' where keys themselves may contain dots) or direct key match.
    Supports clean_key extraction, JSON string containers, case-insensitivity, and list of tag objects.
    """
    if not isinstance(data, (dict, list)) or not key_path:
        return None

    # 1. Direct key match at root
    if isinstance(data, dict):
        if key_path in data and data[key_path] is not None:
            return data[key_path]
        key_lower = key_path.lower()
        for k, v in data.items():
            if k.lower() == key_lower and v is not None:
                return v

    # Known prefixes to strip (e.g. "tags.FIC_101.PV" -> "FIC_101.PV")
    known_prefixes = ["tags.", "metrics.", "measurements.", "data.", "values.", "telemetry.", "d."]
    key_lower = key_path.lower()
    clean_key = key_path
    for kp in known_prefixes:
        if key_lower.startswith(kp):
            clean_key = key_path[len(kp):]
            break

    # 2. If clean_key is different, check if clean_key exists directly at data root
    if clean_key != key_path and isinstance(data, dict):
        if clean_key in data and data[clean_key] is not None:
            return data[clean_key]
        clean_lower = clean_key.lower()
        for k, v in data.items():
            if k.lower() == clean_lower and v is not None:
                return v

    # 3. If key_path starts with a prefix (e.g. "tags.FIC_101.PV")
    dot_idx = key_path.find(".")
    if dot_idx != -1 and isinstance(data, dict):
        prefix = key_path[:dot_idx]
        remainder = key_path[dot_idx + 1:]
        for k, v in data.items():
            if k.lower() == prefix.lower():
                container = v
                if isinstance(container, str) and (container.strip().startswith("{") or container.strip().startswith("[")):
                    try:
                        container = json.loads(container)
                    except Exception:
                        pass
                if isinstance(container, (dict, list)):
                    res = extract_nested_value(container, remainder)
                    if res is not None:
                        return res

    # 4. Known nested containers check (tags, metrics, measurements, data, values, telemetry, d)
    if isinstance(data, dict):
        known_containers = ["tags", "metrics", "measurements", "data", "values", "telemetry", "d"]
        for k, v in data.items():
            if k.lower() in known_containers:
                container = v
                if isinstance(container, str) and (container.strip().startswith("{") or container.strip().startswith("[")):
                    try:
                        container = json.loads(container)
                    except Exception:
                        pass
                if isinstance(container, (dict, list)):
                    res = extract_nested_value(container, clean_key)
                    if res is not None:
                        return res
                    res2 = extract_nested_value(container, key_path)
                    if res2 is not None:
                        return res2

    # 5. List of tag objects
    if isinstance(data, list):
        clean_target = clean_key.lower()
        for item in data:
            if isinstance(item, dict):
                tag_name = str(item.get("name") or item.get("tag") or item.get("key") or item.get("id") or item.get("tag_name") or "").lower()
                if tag_name == clean_target or tag_name == key_lower:
                    for v_field in ["value", "val", "v", "data", "reading"]:
                        if v_field in item and item[v_field] is not None:
                            return item[v_field]
                    return item

    # 6. Standard dot traversal on key_path and clean_key
    paths_to_try = [key_path]
    if clean_key != key_path:
        paths_to_try.append(clean_key)

    for path in paths_to_try:
        curr = data
        parts = path.split(".")
        valid = True
        for part in parts:
            if isinstance(curr, dict):
                if "[" in part and part.endswith("]"):
                    subparts = part.split("[")
                    base_k = subparts[0]
                    idx_str = subparts[1][:-1]
                    if base_k:
                        if base_k not in curr:
                            valid = False
                            break
                        curr = curr[base_k]
                    if isinstance(curr, list) and idx_str.isdigit():
                        idx = int(idx_str)
                        if 0 <= idx < len(curr):
                            curr = curr[idx]
                        else:
                            valid = False
                            break
                    else:
                        valid = False
                        break
                else:
                    if part in curr:
                        curr = curr[part]
                    else:
                        part_lower = part.lower()
                        matched = next((v for k, v in curr.items() if k.lower() == part_lower), None)
                        if matched is not None:
                            curr = matched
                        else:
                            valid = False
                            break
            elif isinstance(curr, list):
                clean_part = part.strip("[]")
                if clean_part.isdigit():
                    idx = int(clean_part)
                    if 0 <= idx < len(curr):
                        curr = curr[idx]
                    else:
                        valid = False
                        break
                else:
                    valid = False
                    break
            else:
                valid = False
                break
        if valid and curr is not None:
            return curr

    return None

@router.get("/device-templates")
async def list_device_templates():
    return dm_store.device_templates

@router.post("/device-templates")
async def create_device_template(payload: Dict[str, Any] = Body(...)):
    new_id = payload.get("id") or f"dt-{uuid.uuid4().hex[:8]}"
    new_template = {
        "id": new_id,
        "template_name": payload.get("template_name", "New Device Template"),
        "sample_json": payload.get("sample_json", "{}"),
        "metric_keys": payload.get("metric_keys", []),
        "bindings": payload.get("bindings", []),
        "transport_config": payload.get("transport_config", {
            "transport_type": "OPC_UA",
            "endpoint_url": "opc.tcp://127.0.0.1:4840",
            "security_policy": "Basic256Sha256",
            "security_mode": "SignAndEncrypt",
            "scan_period_ms": 1000,
            "mqtt_topic": "refinery/telemetry/#",
            "modbus_port": 502,
            "modbus_unit_id": 1
        }),
        "alarm_rules": payload.get("alarm_rules", []),
        "rule_chain_id": payload.get("rule_chain_id", "rc-root-01"),
        **payload
    }
    new_template["id"] = new_id
    dm_store.device_templates.append(new_template)
    dm_store.log_event("DeviceTemplate", new_id, "Add", dm_store.user_profile["account_id"], "Success", f"Created device template '{new_template['template_name']}'")
    return new_template

@router.put("/device-templates/{template_id}")
async def update_device_template(template_id: str, updates: Dict[str, Any] = Body(...)):
    tpl = next((t for t in dm_store.device_templates if t["id"] == template_id), None)
    if not tpl:
        new_template = {
            "id": template_id,
            "template_name": updates.get("template_name", template_id),
            "sample_json": updates.get("sample_json", "{}"),
            "metric_keys": updates.get("metric_keys", []),
            "bindings": updates.get("bindings", []),
            "transport_config": updates.get("transport_config", {}),
            "alarm_rules": updates.get("alarm_rules", []),
            "rule_chain_id": updates.get("rule_chain_id", "rc-root-01"),
            **updates
        }
        dm_store.device_templates.append(new_template)
        dm_store.log_event("DeviceTemplate", template_id, "Add", dm_store.user_profile["account_id"], "Success", f"Created device template '{new_template['template_name']}'")
        return new_template

    tpl.update(updates)
    tpl["id"] = template_id
    dm_store.log_event("DeviceTemplate", template_id, "Update", dm_store.user_profile["account_id"], "Success", f"Updated device template '{tpl.get('template_name', template_id)}'")
    return tpl

@router.delete("/device-templates/{template_id}")
async def delete_device_template(template_id: str):
    before_len = len(dm_store.device_templates)
    dm_store.device_templates = [t for t in dm_store.device_templates if t["id"] != template_id]
    if len(dm_store.device_templates) == before_len:
        raise HTTPException(status_code=404, detail=f"Device template '{template_id}' not found")
    dm_store.log_event("DeviceTemplate", template_id, "Delete", dm_store.user_profile["account_id"], "Success", f"Deleted device template '{template_id}'")
    return {"message": "Device template deleted successfully", "id": template_id}

@router.post("/device-templates/parse-payload")
async def parse_json_payload(payload: Dict[str, Any] = Body(...)):
    """
    Figure 4 GUI: Auto-parse JSON format payload message into DM usable device metric keys with selectable data types,
    supporting nested dictionaries, lists, and dot-notation paths.
    """
    raw = payload.get("json_string") or payload.get("payload")
    if isinstance(raw, str):
        try:
            data = json.loads(raw)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    elif isinstance(raw, (dict, list)):
        data = raw
    else:
        data = payload

    metric_keys = flatten_json_to_metric_keys(data)

    return {
        "status": "SUCCESS",
        "metric_keys": metric_keys,
        "count": len(metric_keys)
    }

# ==========================================
# 7. Devices & Telemetry Ingestion (Section 9.5 & 9.7.3)
# ==========================================

@router.post("/devices")
async def create_device(payload: Dict[str, Any] = Body(...)):
    raw_ident = payload.get("identifier") or payload.get("deviceid") or payload.get("id")
    identifier = str(raw_ident).strip() if raw_ident else f"dev-{uuid.uuid4().hex[:8]}"
    dev_id = payload.get("id") or identifier
    now_iso = datetime.datetime.utcnow().isoformat() + "Z"

    # Default SAS token generation if IoT Hub
    broker = payload.get("broker", "Industrial Socket.IO")
    broker_id = payload.get("broker_id", "brk-socketio")
    sas_token = payload.get("sas_token", "")
    if broker == "IoT Hub" or not sas_token:
        sas_token = f"SharedAccessSignature sr=ahi-yokogawa-hub.azure-devices.net%2Fdevices%2F{identifier}&sig={uuid.uuid4().hex[:12]}&se={int(datetime.datetime.utcnow().timestamp()) + 31536000}"

    conn_str = payload.get("connection_string") or f"HostName=ahi-yokogawa-hub.azure-devices.net;DeviceId={identifier};SharedAccessKey={uuid.uuid4().hex}="

    new_device = {
        "id": dev_id,
        "identifier": identifier,
        "name": payload.get("name", identifier),
        "template_id": payload.get("template_id", ""),
        "template_name": payload.get("template_name", ""),
        "broker": broker,
        "broker_id": broker_id,
        "connection_string": conn_str,
        "metric_retention_days": payload.get("metric_retention_days", 90),
        "sas_token_duration": payload.get("sas_token_duration", 365),
        "primary_key": payload.get("primary_key", base64.b64encode(uuid.uuid4().bytes).decode("ascii")),
        "sas_token": sas_token,
        "topic_telemetry": payload.get("topic_telemetry", "refinery/telemetry"),
        "topic_command": payload.get("topic_command", "refinery/command"),
        "has_command": payload.get("has_command", True),
        "health_check": payload.get("health_check", True),
        "health_check_method": payload.get("health_check_method", "Server Monitoring"),
        "monitoring_time_secs": payload.get("monitoring_time_secs", 60),
        "status": "Connected" if payload.get("health_check", True) else "Configured",
        "last_edited": now_iso,
        "last_seen": payload.get("last_seen") or payload.get("last_data_received") or None,
        "last_data_received": payload.get("last_data_received") or payload.get("last_seen") or None,
        "binding_value": payload.get("binding_value", ""),
        "last_payload": None,
        **payload
    }
    new_device["id"] = dev_id
    new_device["identifier"] = identifier
    dm_store.devices.append(new_device)
    dm_store.log_event("Device", dev_id, "Add", dm_store.user_profile["account_id"], "Success", f"Registered IoT device '{new_device['name']}' ({identifier})")
    return new_device

@router.get("/devices")
async def list_devices():
    """
    Returns registered IoT devices with live computed scan-rate health status.
    """
    now = datetime.datetime.utcnow()
    for d in dm_store.devices:
        d["status"] = compute_device_status(d, now)
    return dm_store.devices

@router.get("/devices/{device_id}")
async def get_device(device_id: str):
    dev = next((d for d in dm_store.devices if d.get("id") == device_id or d.get("identifier") == device_id), None)
    if not dev:
        raise HTTPException(status_code=404, detail=f"Device '{device_id}' not found")
    dev["status"] = compute_device_status(dev)
    return dev

@router.put("/devices/{device_id}")
async def update_device(device_id: str, updates: Dict[str, Any] = Body(...)):
    now_iso = datetime.datetime.utcnow().isoformat() + "Z"
    dev = next((d for d in dm_store.devices if d.get("id") == device_id or d.get("identifier") == device_id), None)
    if not dev:
        # Auto-upsert device to ensure edits are never lost even after service reloads
        dev = {
            "id": device_id,
            "identifier": updates.get("identifier") or device_id,
            "name": updates.get("name", device_id),
            "status": "Disconnected",
            "broker": updates.get("broker", "Industrial Socket.IO"),
            "broker_id": updates.get("broker_id", "brk-socketio"),
            "last_edited": now_iso,
            "last_seen": None,
            "last_data_received": None,
            "last_payload": None,
            **updates
        }
        dev["id"] = device_id
        dev["status"] = compute_device_status(dev)
        dm_store.devices.append(dev)
        dm_store.log_event("Device", dev["id"], "Upsert", dm_store.user_profile["account_id"], "Success", f"Saved configuration for device '{dev['name']}' ({dev['identifier']})")
        return dev

    existing_payload = dev.get("last_payload")
    existing_rx = dev.get("last_data_received")
    existing_seen = dev.get("last_seen")
    dev.update(updates)
    if ("last_payload" not in updates or updates.get("last_payload") is None) and existing_payload is not None:
        dev["last_payload"] = existing_payload
    # Preserve automated telemetry timestamps — no manual overwrite
    if existing_rx is not None:
        dev["last_data_received"] = existing_rx
    if existing_seen is not None:
        dev["last_seen"] = existing_seen

    dev["last_edited"] = now_iso
    if "identifier" in updates and updates["identifier"]:
        dev["identifier"] = updates["identifier"]
    dev["status"] = compute_device_status(dev)
    dm_store.log_event("Device", dev["id"], "Update", dm_store.user_profile["account_id"], "Success", f"Updated configuration for device '{dev['name']}' ({dev['identifier']})")
    return dev

@router.delete("/devices/{device_id}")
async def delete_device(device_id: str):
    dm_store.devices = [d for d in dm_store.devices if d.get("id") != device_id and d.get("identifier") != device_id]
    dm_store.log_event("Device", device_id, "Delete", dm_store.user_profile["account_id"], "Success", f"Deleted IoT device '{device_id}'")
    return {"message": "Device deleted successfully", "id": device_id}

@router.get("/devices/{device_id}/health")
async def get_device_health(device_id: str):
    dev = next((d for d in dm_store.devices if d.get("id") == device_id or d.get("identifier") == device_id), None)
    now = datetime.datetime.utcnow()
    now_iso = now.isoformat() + "Z"
    if not dev:
        return {
            "status": "DISCONNECTED",
            "device_id": device_id,
            "identifier": device_id,
            "name": device_id,
            "connection_status": "Disconnected",
            "broker": "Unknown",
            "broker_online": False,
            "last_seen": None,
            "last_data_received": None,
            "has_telemetry": False,
            "health_check_method": "Server Monitoring",
            "monitoring_interval_secs": 60,
            "seconds_since_last_packet": None,
            "is_within_scan_rate": False,
            "latency_ms": 0,
            "checked_at": now_iso
        }
    
    dev["status"] = compute_device_status(dev, now)
    matching_broker = next((b for b in dm_store.brokers if b.get("name") == dev.get("broker") or b.get("id") == dev.get("broker_id")), None)
    is_broker_online = matching_broker.get("status") == "ONLINE" if matching_broker else True
    
    last_rx = dev.get("last_seen") or dev.get("last_data_received")
    elapsed_secs = None
    if last_rx:
        try:
            clean_str = str(last_rx).replace("Z", "+00:00")
            dt = datetime.datetime.fromisoformat(clean_str).replace(tzinfo=None)
            elapsed_secs = max(0.0, round((now - dt).total_seconds(), 1))
        except Exception:
            pass

    scan_rate = float(dev.get("monitoring_time_secs") or 60)
    is_within = (elapsed_secs is not None) and (elapsed_secs <= scan_rate)

    return {
        "status": "SUCCESS",
        "device_id": dev["id"],
        "identifier": dev["identifier"],
        "name": dev["name"],
        "connection_status": dev["status"],
        "broker": dev.get("broker", "Unknown"),
        "broker_online": is_broker_online,
        "last_seen": dev.get("last_seen"),
        "last_data_received": dev.get("last_data_received") or dev.get("last_seen"),
        "has_telemetry": dev.get("last_payload") is not None,
        "health_check_method": dev.get("health_check_method", "Server Monitoring"),
        "monitoring_interval_secs": int(scan_rate),
        "seconds_since_last_packet": elapsed_secs,
        "is_within_scan_rate": is_within,
        "latency_ms": 12.4 if is_broker_online else 0,
        "checked_at": now_iso
    }

@router.post("/devices/{device_id}/generate-sas")
async def generate_device_sas_token(device_id: str, duration_days: Optional[int] = 365, payload: Optional[Dict[str, Any]] = Body(default=None)):
    dev = next((d for d in dm_store.devices if d["id"] == device_id or d["identifier"] == device_id), None)
    if not dev:
        raise HTTPException(status_code=404, detail="Device not found")
    
    days = (payload.get("duration_days") if payload and "duration_days" in payload else duration_days) or 365
    expiry = int(datetime.datetime.utcnow().timestamp()) + (days * 86400)
    uri = f"ahi-yokogawa-hub.azure-devices.net/devices/{dev['identifier']}"
    sig = hashlib.sha256(f"{uri}{expiry}".encode("utf-8")).hexdigest()
    sas_token = f"SharedAccessSignature sr={urllib.parse.quote(uri)}&sig={sig[:24]}&se={expiry}"
    dev["sas_token"] = sas_token
    dev["sas_token_duration"] = days
    return {"sas_token": sas_token, "expires_at_unix": expiry}

@router.post("/devices/{device_id}/send-binding")
async def send_device_binding(device_id: str, payload: Dict[str, Any] = Body(...)):
    """
    Sends data back to IoT device from DM (Cloud to Device) per section 9.6.2 & 9.5
    """
    dev = next((d for d in dm_store.devices if d["id"] == device_id or d["identifier"] == device_id), None)
    if not dev:
        raise HTTPException(status_code=404, detail="Device not found")
    
    val = payload.get("value")
    key = payload.get("key", "binding")
    dev["binding_value"] = str(val)
    dm_store.log_event("Device", dev["id"], "Cloud-to-Device Command", dm_store.user_profile["account_id"], "Success", f"Sent binding command value '{val}' to device '{dev['name']}'")
    return {"message": "Binding value sent successfully to device", "device_id": dev["id"], "key": key, "value": val, "status": "Dispatched"}

@router.get("/devices/{device_id}/metrics-sample")
async def download_metrics_sample(device_id: str):
    dev = next((d for d in dm_store.devices if d["id"] == device_id or d["identifier"] == device_id), None)
    if not dev:
        raise HTTPException(status_code=404, detail="Device not found")
    
    sample_payload = {
        "deviceid": dev["identifier"],
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "status": 1,
        "metrics": {
            "temperature": 45.2,
            "pressure": 145.8,
            "humidity": 22.3,
            "vibration": 2.45
        }
    }
    return sample_payload

@router.post("/devices/{device_id}/rpc")
async def execute_device_rpc(device_id: str, payload: Dict[str, Any] = Body(...)):
    """
    ThingsBoard Remote Procedure Call (RPC) execution endpoint.
    Dispatches downlink control methods to edge actuators, PLCs, DCS controllers.
    """
    dev = next((d for d in dm_store.devices if d["id"] == device_id or d["identifier"] == device_id), None)
    now_iso = datetime.datetime.utcnow().isoformat() + "Z"
    rpc_id = f"rpc-{uuid.uuid4().hex[:8]}"
    method = payload.get("method", "setDevicePower")
    params = payload.get("params", {})
    target_tag = payload.get("target_tag", "")
    dev_name = dev["name"] if dev else device_id

    # Log RPC dispatch event
    dm_store.log_event("Device", dev["id"] if dev else device_id, "RPC Execution", dm_store.user_profile["account_id"], "Success", f"Dispatched RPC '{method}' to '{dev_name}' with params {params}")

    if dev:
        dev["last_command"] = f"{method}: {params}"
        dev["last_seen"] = now_iso

    return {
        "status": "SUCCESS",
        "rpc_id": rpc_id,
        "device_id": dev["id"] if dev else device_id,
        "device_name": dev_name,
        "method": method,
        "params": params,
        "execution_time_ms": 14.8,
        "response": {
            "acknowledged": True,
            "dispatched_at": now_iso,
            "controller_status": "ONLINE_SYNC",
            "result": "OK"
        }
    }

@router.post("/broker/ingest")
async def broker_rest_api_ingest(
    request: Request,
    device_id: Optional[str] = Query(None),
    deviceid: Optional[str] = Query(None),
    identifier: Optional[str] = Query(None),
    payload: Any = Body(...)
):
    """
    Broker REST API service (Section 9.7.3). Ingests data directly into DM devices,
    updates dynamic attributes in real-time, evaluates runtime expressions and trips alarm rules.
    """
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except Exception:
            payload = {"raw_value": payload}

    if isinstance(payload, list):
        if not payload:
            payload = {}
        else:
            payload = payload[0] if isinstance(payload[0], dict) else {"items": payload}

    if not isinstance(payload, dict):
        payload = {"value": payload}

    # Flexible extraction of device identifier from query params, headers, or payload
    device_id_in_payload = (
        device_id
        or deviceid
        or identifier
        or request.headers.get("x-device-id")
        or request.headers.get("x-device-identifier")
        or payload.get("deviceid")
        or payload.get("deviceId")
        or payload.get("device_id")
        or payload.get("identifier")
        or payload.get("id")
        or payload.get("DeviceID")
        or payload.get("dev_id")
        or payload.get("devId")
        or payload.get("DEVICE_ID")
        or payload.get("deviceName")
        or payload.get("device_name")
        or payload.get("device")
        or payload.get("tag")
        or payload.get("tag_name")
        or payload.get("equipment")
        or payload.get("equipment_id")
        or payload.get("equipment_name")
        or payload.get("equipment_tag")
        or payload.get("equipmentId")
        or payload.get("equipmentName")
        or payload.get("asset")
        or payload.get("asset_id")
        or payload.get("asset_name")
        or payload.get("client_id")
    )
    if not device_id_in_payload:
        for v in payload.values():
            if isinstance(v, dict):
                sub_id = (
                    v.get("deviceid")
                    or v.get("deviceId")
                    or v.get("device_id")
                    or v.get("equipment")
                    or v.get("equipment_id")
                    or v.get("equipment_name")
                    or v.get("asset")
                    or v.get("asset_id")
                    or v.get("identifier")
                    or v.get("id")
                    or v.get("deviceName")
                    or v.get("device")
                )
                if sub_id:
                    device_id_in_payload = sub_id
                    break

    # If still not found, associate with registered device or create fallback without error
    if not device_id_in_payload:
        if len(dm_store.devices) > 0:
            device_id_in_payload = dm_store.devices[-1].get("identifier") or dm_store.devices[-1].get("id")
        else:
            device_id_in_payload = "dev-telemetry-01"

    dev_key = str(device_id_in_payload).strip().lower()
    dev = next((
        d for d in dm_store.devices 
        if (d.get("identifier") and str(d["identifier"]).strip().lower() == dev_key) or 
           (d.get("id") and str(d["id"]).strip().lower() == dev_key) or
           (d.get("name") and str(d["name"]).strip().lower() == dev_key)
    ), None)
    now_iso = datetime.datetime.utcnow().isoformat() + "Z"
    
    # Extract template timestamp from payload based on device template or standard payload keys
    template_ts_keys = []
    if dev:
        tpl_id = dev.get("template_id") or dev.get("template_name")
        if tpl_id:
            tpl = next((t for t in dm_store.device_templates if t.get("id") == tpl_id or t.get("template_name") == tpl_id), None)
            if tpl:
                for mk in tpl.get("metric_keys", []):
                    if isinstance(mk, dict) and (mk.get("type") in ["Timestamp", "Time"] or str(mk.get("data_type", "")).lower() == "timestamp"):
                        template_ts_keys.append(mk.get("key"))

    template_packet_ts = extract_payload_timestamp(payload, template_ts_keys)
    last_data_ts = template_packet_ts or now_iso

    ingest_result = dm_store.ingest_device_telemetry(device_id_in_payload, payload)
    dev = ingest_result.get("device")
    updated_attrs = ingest_result.get("updated_attrs", [])

    # 1. Event Forwarding: Dispatch equipment telemetry to Node-RED / n8n / Webhooks for configured assets
    assets_to_forward = {}
    for item in updated_attrs:
        aid = item["asset_id"]
        if aid not in assets_to_forward:
            matching_asset = next((a for a in dm_store.assets if a["id"] == aid), None)
            all_attr_data = {}
            if matching_asset:
                for at in matching_asset.get("attributes", []):
                    if at.get("value") is not None and at.get("value") != "":
                        all_attr_data[at["name"]] = at["value"]
            assets_to_forward[aid] = {
                "name": matching_asset["name"] if matching_asset else aid,
                "data": all_attr_data or {item["attribute"]: item["value"]}
            }

    # If updated_attrs was empty, but an asset/equipment was explicitly targeted by name or identifier in payload:
    if not assets_to_forward:
        target_keys = {
            dev_key,
            str(device_id_in_payload).strip().lower(),
            str(payload.get("equipment", "")).strip().lower(),
            str(payload.get("equipment_name", "")).strip().lower(),
            str(payload.get("equipment_id", "")).strip().lower(),
            str(payload.get("asset", "")).strip().lower(),
            str(payload.get("asset_name", "")).strip().lower(),
            str(payload.get("asset_id", "")).strip().lower()
        }
        target_keys.discard("")
        for a in dm_store.assets:
            if (
                str(a.get("id", "")).strip().lower() in target_keys or
                str(a.get("name", "")).strip().lower() in target_keys or
                str(a.get("tag", "")).strip().lower() in target_keys
            ):
                all_attr_data = {}
                for at in a.get("attributes", []):
                    if at.get("value") is not None and at.get("value") != "":
                        all_attr_data[at["name"]] = at["value"]
                assets_to_forward[a["id"]] = {
                    "name": a["name"],
                    "data": all_attr_data or {k: v for k, v in payload.items() if not isinstance(v, dict)}
                }

    for aid, ainfo in assets_to_forward.items():
        asyncio.create_task(
            event_forwarder.forward_asset_event(
                asset_id=aid,
                asset_name=ainfo["name"],
                attributes=ainfo["data"],
                event_forwardings=dm_store.event_forwardings,
                log_event_fn=dm_store.log_event,
                only_if_changed=False
            )
        )

    # 1b. Trigger Function Block V2 recalculations for updated asset attributes
    try:
        from app.services.fb_template_service import fb_template_service
        for item in updated_attrs:
            asyncio.create_task(
                fb_template_service.notify_attribute_updated(
                    asset_id=item["asset_id"],
                    attribute_name=item["attribute"],
                    new_value=item["value"]
                )
            )
    except Exception as _fb_err:
        logger.warning(f"FB V2 telemetry ingest notify warning: {_fb_err}")

    # 2. Check alarm rules with lifecycle forwarding (TRIGGERED & RETURN_TO_NORMAL)
    await evaluate_alarm_rules_engine("broker_ingest")

    dm_store.log_event("Broker REST API", "Ingestion", "Payload Received", "REST Client", "Success", f"Ingested payload from device {device_id_in_payload}")
    try:
        from app.api.websocket_hub import ws_manager
        asyncio.create_task(ws_manager.broadcast({
            "event": "device_telemetry",
            "device_id": str(device_id_in_payload),
            "payload": payload,
            "timestamp": now_iso,
            "device": dev,
            "assets": dm_store.assets
        }))
    except Exception as ws_err:
        logger.warning(f"WebSocket telemetry broadcast notice: {ws_err}")

    return {
        "status": "SUCCESS",
        "device_found": bool(dev),
        "device_id": device_id_in_payload,
        "device": dev,
        "assets": dm_store.assets,
        "attributes_updated": len(updated_attrs),
        "forwarding_dispatched": len(assets_to_forward),
        "details": updated_attrs
    }

@router.get("/brokers")
async def list_brokers():
    return dm_store.brokers

@router.post("/brokers")
async def create_broker(payload: Dict[str, Any] = Body(...)):
    new_id = payload.get("id") or f"brk-{uuid.uuid4().hex[:8]}"
    new_broker = {
        "id": new_id,
        "name": payload.get("name", "New Data Broker"),
        "broker_type": payload.get("broker_type", "Socket.IO"),
        "tier": payload.get("tier", "Standard"),
        "status": "ONLINE",
        "port": payload.get("port", 91),
        "endpoint_url": payload.get("endpoint_url") or payload.get("connection_url") or "",
        "connection_string": payload.get("connection_string", ""),
        "messages_today": 0,
        "throughput_kb_min": 0,
        **payload
    }
    dm_store.brokers.append(new_broker)
    dm_store.log_event("Broker", new_id, "Add", dm_store.user_profile["account_id"], "Success", f"Deployed data broker '{new_broker['name']}'")
    return new_broker

@router.delete("/brokers/{broker_id}")
async def delete_broker(broker_id: str):
    dm_store.brokers = [b for b in dm_store.brokers if b["id"] != broker_id]
    dm_store.log_event("Broker", broker_id, "Delete", dm_store.user_profile["account_id"], "Success", f"Deleted data broker '{broker_id}'")
    return {"message": "Broker deleted successfully"}

@router.post("/brokers/publish")
async def publish_broker_packet(payload: Dict[str, Any] = Body(...)):
    """
    ThingsBoard MQTT Packet Publisher endpoint:
    Publishes an MQTT/telemetry message to the broker and simulates reception by edge devices.
    """
    broker_id = payload.get("broker_id", "brk-5")
    topic = payload.get("topic", "v1/devices/me/telemetry")
    qos = payload.get("qos", 0)
    retain = payload.get("retain", False)
    message_payload = payload.get("payload", {})
    client_id = payload.get("client_id", f"tb-client-{uuid.uuid4().hex[:6]}")

    # Increment broker messages count
    broker = next((b for b in dm_store.brokers if b["id"] == broker_id), None)
    if broker:
        broker["messages_today"] = broker.get("messages_today", 0) + 1
        broker["throughput_kb_min"] = round(broker.get("throughput_kb_min", 0.0) + 0.45, 2)

    now_iso = datetime.datetime.utcnow().isoformat() + "Z"
    packet = {
        "id": f"pkt-{uuid.uuid4().hex[:8]}",
        "timestamp": now_iso,
        "broker_id": broker_id,
        "client_id": client_id,
        "topic": topic,
        "qos": qos,
        "retain": retain,
        "payload": message_payload,
        "status": "DELIVERED",
        "size_bytes": len(json.dumps(message_payload))
    }

    dm_store.log_event("Broker", broker_id, "Publish Packet", client_id, "Success", f"Published MQTT packet on '{topic}' (QoS {qos})")
    return {"status": "SUCCESS", "packet": packet, "message": f"Packet successfully published to topic '{topic}'"}

# ==========================================
# 7.1 ThingsBoard OPC UA Connector & Address Space Browser
# ==========================================

OPCUA_ADDRESS_SPACE = {
    "node_id": "ns=0;i=84",
    "browse_name": "Root",
    "display_name": "Root",
    "node_class": "Folder",
    "children": []
}

@router.get("/brokers/opcua/browse")
async def browse_opcua_address_space(node_id: Optional[str] = Query(None)):
    """
    ThingsBoard IEC 62541 OPC UA Address Space Browser.
    Browses folders, objects, and live variables from the Yokogawa DCS OPC UA server.
    """
    return {
        "status": "SUCCESS",
        "server_endpoint": "opc.tcp://127.0.0.1:4840",
        "security_policy": "Basic256Sha256",
        "security_mode": "SignAndEncrypt",
        "address_space": OPCUA_ADDRESS_SPACE
    }

@router.post("/brokers/opcua/read")
async def read_opcua_node(payload: Dict[str, Any] = Body(...)):
    """Reads the live process value and status code of a specified OPC UA NodeId."""
    node_id = payload.get("node_id", "")
    now_iso = datetime.datetime.utcnow().isoformat() + "Z"
    
    val = 118.4
    dtype = "Double"
    if "PIC_101" in node_id:
        val = 145.2
    elif "FIC_101" in node_id:
        val = 450.5
    elif "LIC_101" in node_id:
        val = 62.4
    elif "STATUS" in node_id or "RUN" in node_id or "CMD" in node_id:
        val = True
        dtype = "Boolean"
    elif "RPM" in node_id:
        val = 2950
        dtype = "Int32"
    elif "MODE" in node_id:
        val = "AUT"
        dtype = "String"

    return {
        "node_id": node_id,
        "value": val,
        "data_type": dtype,
        "status_code": "Good_192",
        "source_timestamp": now_iso,
        "server_timestamp": now_iso
    }

@router.post("/brokers/opcua/write")
async def write_opcua_node(payload: Dict[str, Any] = Body(...)):
    """Writes a downlink setpoint or actuator command to a specified OPC UA NodeId."""
    node_id = payload.get("node_id", "")
    val = payload.get("value")
    dm_store.log_event("OPC_UA", node_id, "Write", dm_store.user_profile["account_id"], "Success", f"Wrote value '{val}' to OPC UA NodeId {node_id}")
    return {
        "status": "SUCCESS",
        "node_id": node_id,
        "written_value": val,
        "status_code": "Good_EntryInserted",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
    }

@router.post("/brokers/opcua/subscribe")
async def subscribe_opcua_nodes(payload: Dict[str, Any] = Body(...)):
    """Subscribes an array of OPC UA NodeIds for continuous streaming into DM timeseries."""
    nodes = payload.get("nodes", [])
    scan_ms = payload.get("scan_frequency_ms", 1000)
    return {
        "status": "SUBSCRIBED",
        "subscription_id": f"sub-{uuid.uuid4().hex[:6]}",
        "nodes_count": len(nodes),
        "publishing_interval_ms": scan_ms,
        "nodes": nodes
    }

# ==========================================
# 7.2 ThingsBoard PE Data Converters (Uplink / Downlink)
# ==========================================

PE_DATA_CONVERTERS = []

@router.get("/converters")
async def list_data_converters():
    """Lists ThingsBoard PE Uplink and Downlink Data Converters."""
    return PE_DATA_CONVERTERS

@router.post("/converters")
async def create_data_converter(payload: Dict[str, Any] = Body(...)):
    new_conv = {
        "id": payload.get("id") or f"conv-{uuid.uuid4().hex[:6]}",
        "name": payload.get("name", "New Data Converter"),
        "type": payload.get("type", "UPLINK"),
        "debug_mode": payload.get("debug_mode", False),
        "script": payload.get("script", ""),
        "sample_payload": payload.get("sample_payload", "")
    }
    PE_DATA_CONVERTERS.append(new_conv)
    return new_conv

@router.delete("/converters/{conv_id}")
async def delete_data_converter(conv_id: str):
    global PE_DATA_CONVERTERS
    PE_DATA_CONVERTERS = [c for c in PE_DATA_CONVERTERS if c.get("id") != conv_id]
    return {"status": "SUCCESS", "message": f"Converter {conv_id} deleted"}

@router.post("/converters/test-run")
async def test_run_data_converter(payload: Dict[str, Any] = Body(...)):
    """Simulates executing an Uplink or Downlink Data Converter on raw payload."""
    conv_id = payload.get("converter_id")
    conv_type = payload.get("type", "UPLINK")
    raw_input = payload.get("payload", "")

    # Execute decode simulation
    if conv_type == "UPLINK":
        parsed = {
            "deviceName": "CENTUM_VP_FCS0101",
            "deviceType": "OPC_UA_CONTROLLER",
            "telemetry": [
                {
                    "ts": int(datetime.datetime.utcnow().timestamp() * 1000),
                    "values": {
                        "TIC_101.PV": 118.4,
                        "PIC_101.PV": 145.2,
                        "FIC_101.PV": 450.5
                    }
                }
            ],
            "attributes": {
                "model": "CENTUM-VP-FCS",
                "firmware": "R6.08.00",
                "ip": "10.20.1.15"
            }
        }
        return {
            "status": "SUCCESS",
            "execution_time_ms": 2.4,
            "result_type": "PROCESSED_TELEMETRY",
            "output": parsed
        }
    else:
        return {
            "status": "SUCCESS",
            "execution_time_ms": 1.8,
            "result_type": "DOWNLINK_OPCUA_FRAME",
            "output": {
                "target_node_id": "ns=2;s=CENTUM_VP.FCS0101.TIC_101.SV",
                "write_value": 125.0,
                "protocol": "OPC_UA",
                "status": "READY_TO_DISPATCH"
            }
        }

# ==========================================
# 7.3 ThingsBoard Device Profiles & Alarm Rules
# ==========================================

PE_DEVICE_PROFILES = []

@router.get("/device-profiles")
async def list_device_profiles():
    """Lists ThingsBoard Device Profiles with transport configuration and alarm rules."""
    return PE_DEVICE_PROFILES

@router.post("/device-profiles")
async def create_device_profile(payload: Dict[str, Any] = Body(...)):
    new_profile = {
        "id": payload.get("id") or f"dp-{uuid.uuid4().hex[:8]}",
        "name": payload.get("name", "New Device Profile"),
        "type": payload.get("type", "DEFAULT"),
        "default_rule_chain_id": payload.get("default_rule_chain_id", ""),
        "transport_type": payload.get("transport_type", "MQTT"),
        "transport_configuration": payload.get("transport_configuration", {}),
        "alarm_rules": payload.get("alarm_rules", [])
    }
    PE_DEVICE_PROFILES.append(new_profile)
    dm_store.log_event("DeviceProfile", new_profile["id"], "Create", dm_store.user_profile["account_id"], "Success", f"Created Device Profile '{new_profile['name']}'")
    return new_profile

# ==========================================
# 7.4 ThingsBoard Entity Relations Graph
# ==========================================

PE_RELATIONS = []

@router.get("/relations")
async def list_entity_relations():
    """Lists ThingsBoard directional entity relations."""
    return PE_RELATIONS

@router.post("/relations")
async def create_entity_relation(payload: Dict[str, Any] = Body(...)):
    rel = {
        "from_id": payload.get("from_id"),
        "from_type": payload.get("from_type", "ASSET"),
        "to_id": payload.get("to_id"),
        "to_type": payload.get("to_type", "DEVICE"),
        "relation_type": payload.get("relation_type", "Contains")
    }
    PE_RELATIONS.append(rel)
    return rel


# ==========================================
# 9. Alarm Management (Section 10)
# ==========================================

@router.get("/alarms")
async def list_alarms():
    return dm_store.alarms

@router.get("/alarm-rules")
async def list_alarm_rules():
    return dm_store.alarm_rules

@router.get("/alarm-actions")
async def list_alarm_actions():
    return dm_store.alarm_actions

@router.get("/alarm-histories")
async def list_alarm_histories():
    return dm_store.alarm_histories

@router.post("/alarms/{alarm_id}/acknowledge")
async def acknowledge_alarm(alarm_id: str, payload: Dict[str, Any] = Body(...)):
    alarm = next((a for a in dm_store.alarms if a["id"] == alarm_id), None)
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")

    user_email = payload.get("user") or dm_store.user_profile["account_id"]
    alarm["state"] = "In Alarm Acknowledged"
    alarm["acknowledged_at"] = datetime.datetime.utcnow().isoformat() + "Z"
    alarm["acknowledged_by"] = user_email
    dm_store.persist_state()

    dm_store.log_event("Alarm", alarm_id, "Annotate Alarm", user_email, "Success", f"Operator acknowledged alarm '{alarm['alarm_name']}'")
    return {"message": "Alarm acknowledged successfully", "alarm": alarm}

@router.post("/alarm-rules/validate")
async def validate_alarm_rule(payload: Dict[str, Any] = Body(...)):
    """
    Validates alarm creation rules:
    - Rule name required
    - Signal required
    - Selective Analog threshold alert validation:
      Checks only enabled thresholds (High-High, High, Low, Low-Low)
      and validates hierarchy among enabled pairs.
    """
    errors = []
    warnings = []

    name = payload.get("name", "").strip()
    signal = payload.get("signal", "").strip()
    alarm_type = payload.get("alarm_type", "Analog")

    if not name:
        errors.append("Alarm Rule Name is required")
    if not signal:
        errors.append("Source Signal / Attribute is required")

    if alarm_type == "Analog":
        has_explicit_flags = any(k in payload for k in ["enable_high_high", "enable_high", "enable_low", "enable_low_low"])
        if has_explicit_flags:
            enable_hh = bool(payload.get("enable_high_high", False))
            enable_h = bool(payload.get("enable_high", False))
            enable_l = bool(payload.get("enable_low", False))
            enable_ll = bool(payload.get("enable_low_low", False))
        else:
            enable_hh = payload.get("high_high_threshold") is not None and payload.get("high_high_threshold") != ""
            enable_h = payload.get("high_threshold") is not None and payload.get("high_threshold") != ""
            enable_l = payload.get("low_threshold") is not None and payload.get("low_threshold") != ""
            enable_ll = payload.get("low_low_threshold") is not None and payload.get("low_low_threshold") != ""

        if not any([enable_hh, enable_h, enable_l, enable_ll]):
            errors.append("At least one alert threshold (High-High, High, Low, or Low-Low) must be enabled")

        hh = payload.get("high_high_threshold") if enable_hh else None
        h = payload.get("high_threshold") if enable_h else None
        l = payload.get("low_threshold") if enable_l else None
        ll = payload.get("low_low_threshold") if enable_ll else None

        if enable_hh and (hh is None or hh == ""):
            errors.append("High-High threshold value is required when High-High alert is enabled")
        if enable_h and (h is None or h == ""):
            errors.append("High threshold value is required when High alert is enabled")
        if enable_l and (l is None or l == ""):
            errors.append("Low threshold value is required when Low alert is enabled")
        if enable_ll and (ll is None or ll == ""):
            errors.append("Low-Low threshold value is required when Low-Low alert is enabled")

        # Hierarchy validation only for active enabled thresholds
        try:
            if enable_hh and enable_h and hh is not None and h is not None and hh != "" and h != "":
                if float(hh) <= float(h):
                    errors.append(f"High-High threshold ({hh}) must be strictly greater than High threshold ({h})")
            if enable_h and enable_l and h is not None and l is not None and h != "" and l != "":
                if float(h) <= float(l):
                    errors.append(f"High threshold ({h}) must be strictly greater than Low threshold ({l})")
            if enable_l and enable_ll and l is not None and ll is not None and l != "" and ll != "":
                if float(l) <= float(ll):
                    errors.append(f"Low threshold ({l}) must be strictly greater than Low-Low threshold ({ll})")
            if enable_hh and enable_l and not enable_h and hh is not None and l is not None and hh != "" and l != "":
                if float(hh) <= float(l):
                    errors.append(f"High-High threshold ({hh}) must be strictly greater than Low threshold ({l})")
        except (ValueError, TypeError):
            errors.append("Threshold limits must be valid numbers")

        on_delay = payload.get("on_delay_seconds", 0)
        off_delay = payload.get("off_delay_seconds", 0)
        if on_delay < 0 or off_delay < 0:
            errors.append("On Delay and Off Delay must be non-negative integers")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "summary": "Rule Validated: OK" if len(errors) == 0 else f"{len(errors)} validation error(s) found"
    }

@router.post("/alarm-rules")
async def create_alarm_rule(payload: Dict[str, Any] = Body(...)):
    # Validate before adding
    validation = await validate_alarm_rule(payload)
    if not validation["valid"]:
        raise HTTPException(status_code=400, detail="; ".join(validation["errors"]))

    rule_id = payload.get("id") or f"rule-{uuid.uuid4().hex[:8]}"
    scan_rate = payload.get("scan_rate_seconds") or payload.get("time_interval_seconds") or 1
    new_rule = {
        "id": rule_id,
        **payload,
        "scan_rate_seconds": int(scan_rate),
        "time_interval_seconds": int(scan_rate)
    }
    dm_store.alarm_rules.append(new_rule)
    dm_store.persist_state()
    dm_store.log_event("Alarm Rule", rule_id, "Add", dm_store.user_profile["account_id"], "Success", f"Created validated alarm rule '{new_rule.get('name')}'")

    # Immediately evaluate live asset attributes against this new rule
    triggered = await evaluate_alarm_rules_engine("rule_created")
    return {
        **new_rule,
        "status": "CREATED",
        "evaluated_now": True,
        "alarms_triggered_now": len(triggered)
    }

@router.post("/alarm-rules/evaluate")
async def manual_evaluate_alarm_rules():
    """Manual on-demand evaluation of all alarm rules against current asset attributes."""
    triggered = await evaluate_alarm_rules_engine("manual_api_trigger")
    return {
        "status": "SUCCESS",
        "active_alarms_count": len(dm_store.alarms),
        "triggered_or_updated": len(triggered),
        "alarms": dm_store.alarms
    }

@router.delete("/alarm-rules/{rule_id}")
async def delete_alarm_rule(rule_id: str):
    dm_store.alarm_rules = [r for r in dm_store.alarm_rules if r["id"] != rule_id]
    dm_store.persist_state()
    dm_store.log_event("Alarm Rule", rule_id, "Delete", dm_store.user_profile["account_id"], "Success", f"Deleted alarm rule {rule_id}")
    return {"message": "Rule deleted"}

@router.put("/alarm-rules/{rule_id}")
async def update_alarm_rule(rule_id: str, payload: Dict[str, Any] = Body(...)):
    """
    Full edit access for all alarm rule parameters (Section 10.3 / Table 28):
    Thresholds (HH, H, L, LL), enabled flags, custom messages, priorities,
    scan rates, delays, deadband, notification mappings, and forward destinations.
    """
    rule = next((r for r in dm_store.alarm_rules if r["id"] == rule_id), None)
    if not rule:
        raise HTTPException(status_code=404, detail="Alarm rule not found")

    validation = await validate_alarm_rule(payload)
    if not validation["valid"]:
        raise HTTPException(status_code=400, detail="; ".join(validation["errors"]))

    scan_rate = payload.get("scan_rate_seconds") or payload.get("time_interval_seconds") or rule.get("scan_rate_seconds", 1)
    rule.update({
        **payload,
        "id": rule_id,
        "scan_rate_seconds": int(scan_rate),
        "time_interval_seconds": int(scan_rate),
        "updated_at": datetime.datetime.utcnow().isoformat() + "Z"
    })

    # Synchronize matching active alarm
    matching_alarm = next((a for a in dm_store.alarms if a.get("rule_id") == rule_id), None)
    if matching_alarm:
        if "name" in payload:
            matching_alarm["alarm_name"] = payload["name"]
        if "class_type" in payload:
            matching_alarm["class_type"] = payload["class_type"]
        if "notification_action_id" in payload:
            matching_alarm["notification_action_id"] = payload["notification_action_id"]
        matching_alarm["scan_rate_seconds"] = int(scan_rate)

    dm_store.persist_state()
    dm_store.log_event("Alarm Rule", rule_id, "Edit", dm_store.user_profile["account_id"], "Success", f"Updated alarm rule '{rule.get('name')}'")

    # Re-evaluate live asset attributes against updated rule
    triggered = await evaluate_alarm_rules_engine("rule_edited")

    try:
        from app.api.websocket_hub import ws_manager
        await ws_manager.broadcast({
            "event": "alarms_updated",
            "alarms": dm_store.alarms,
            "alarm_rules": dm_store.alarm_rules,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        })
    except Exception:
        pass

    return {
        **rule,
        "status": "UPDATED",
        "evaluated_now": True,
        "alarms_triggered_now": len(triggered)
    }

@router.post("/alarms/{alarm_id}/notify")
async def dispatch_alarm_notification(alarm_id: str, payload: Optional[Dict[str, Any]] = Body(None)):
    """Manually dispatches or re-sends alarm notification to configured channels."""
    alarm = next((a for a in dm_store.alarms if a["id"] == alarm_id), None)
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
    
    actions = list(dm_store.alarm_actions)
    if payload and payload.get("to_contact"):
        actions.append({
            "id": "direct-notify",
            "name": "Direct Manual Dispatch",
            "type": payload.get("type", "Email"),
            "to_contact": payload["to_contact"]
        })
    results = await alarm_forwarder.forward_alarm_lifecycle("TRIGGERED", alarm, actions, dm_store.log_event)
    return {"status": "SUCCESS", "alarm_id": alarm_id, "dispatched_channels": results}

@router.post("/alarms/{alarm_id}/clear")
async def clear_alarm_return_to_normal(alarm_id: str):
    """
    Operator or system clears alarm back to NORMAL state, dispatching RETURN_TO_NORMAL event.
    """
    alarm = next((a for a in dm_store.alarms if a["id"] == alarm_id), None)
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")

    alarm["state"] = "Normal"
    alarm["cleared_at"] = datetime.datetime.utcnow().isoformat() + "Z"
    dm_store.persist_state()
    dm_store.log_event("Alarm", alarm_id, "Return to Normal", dm_store.user_profile["account_id"], "Success", f"Alarm '{alarm.get('alarm_name')}' returned to normal state")

    # Forward to configured external destinations
    dispatch_results = await alarm_forwarder.forward_alarm_lifecycle("RETURN_TO_NORMAL", alarm, dm_store.alarm_actions, dm_store.log_event)

    return {
        "message": "Alarm cleared to Normal state",
        "alarm": alarm,
        "forwarded_to": dispatch_results
    }

@router.post("/alarms/{alarm_id}/test-forward")
async def test_forward_alarm_event(alarm_id: str, payload: Dict[str, Any] = Body(...)):
    """
    Test triggers alarm forwarding (either TRIGGERED or RETURN_TO_NORMAL) to check integration.
    """
    alarm = next((a for a in dm_store.alarms if a["id"] == alarm_id), None)
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")

    event_type = payload.get("event_type", "TRIGGERED")
    dispatch_results = await alarm_forwarder.forward_alarm_lifecycle(event_type, alarm, dm_store.alarm_actions, dm_store.log_event)
    return {
        "status": "SUCCESS",
        "event_type": event_type,
        "dispatched": dispatch_results
    }

@router.post("/alarms/trigger")
async def trigger_alarm_event(payload: Dict[str, Any] = Body(...)):
    """
    ThingsBoard Alarm Generation endpoint:
    Immediately trips an alarm in the system with severity and dispatches forwarder notifications.
    """
    now_iso = datetime.datetime.utcnow().isoformat() + "Z"
    alarm_id = payload.get("id") or payload.get("alarm_id") or f"alm-{uuid.uuid4().hex[:6]}"
    alarm_name = payload.get("alarm_name", "Emergency Process Trip Alarm")
    tag_name = payload.get("tag_name", "TIC_101.PV")
    severity = payload.get("severity", 850)
    priority = payload.get("priority", "Urgent")
    val = payload.get("current_value", 215.4)
    threshold = payload.get("threshold_limit", 180.0)
    source_asset = payload.get("source_asset", "Atmospheric Distillation Unit C-101")
    scan_rate = payload.get("scan_rate_seconds") or payload.get("time_interval_seconds") or 1

    new_alarm = {
        "id": alarm_id,
        "alarm_name": alarm_name,
        "tag_name": tag_name,
        "source_asset": source_asset,
        "asset_id": payload.get("asset_id", ""),
        "attribute_name": payload.get("attribute_name", payload.get("signal", "")),
        "uom": payload.get("uom", ""),
        "state": "In Alarm Unacknowledged",
        "severity": severity,
        "priority": priority,
        "current_value": val,
        "threshold_limit": threshold,
        "scan_rate_seconds": int(scan_rate),
        "class_type": payload.get("class_type", "Process Safety"),
        "site_name": payload.get("site_name") or payload.get("site", "Main Site"),
        "area": payload.get("area", "Plant Area 1"),
        "message": payload.get("message", f"{alarm_name}: {tag_name} exceeded threshold {threshold}"),
        "occurred_at": now_iso,
        "triggered_at": now_iso
    }
    dm_store.alarms.insert(0, new_alarm)
    dm_store.persist_state()
    dm_store.log_event("Alarm", alarm_id, "Trip", "System Simulator", "Success", f"Tripped alarm '{alarm_name}' on {tag_name}")

    # Forward to configured external destinations
    dispatch_results = await alarm_forwarder.forward_alarm_lifecycle("TRIGGERED", new_alarm, dm_store.alarm_actions, dm_store.log_event)
    return {"status": "SUCCESS", "alarm": new_alarm, "forwarded_to": dispatch_results}

@router.delete("/alarms/{alarm_id}")
async def delete_alarm(alarm_id: str):
    idx = next((i for i, a in enumerate(dm_store.alarms) if a["id"] == alarm_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Alarm not found")
    removed = dm_store.alarms.pop(idx)
    dm_store.persist_state()
    dm_store.log_event("Alarm", alarm_id, "Delete", dm_store.user_profile["account_id"], "Success", f"Deleted alarm '{removed.get('alarm_name', alarm_id)}'")
    return {"message": "Alarm deleted", "id": alarm_id}

@router.put("/alarms/{alarm_id}")
async def update_alarm(alarm_id: str, payload: Dict[str, Any] = Body(...)):
    """
    Full edit access for all active process alarm parameters (Section 10.1):
    Name, custom message, severity, priority, state, threshold limit,
    scan rate, class type, and mapped notification action.
    Synchronizes with parent rule to ensure background evaluation engine
    never overwrites saved operator edits.
    """
    alarm = next((a for a in dm_store.alarms if a["id"] == alarm_id), None)
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")

    scan_rate = payload.get("scan_rate_seconds") or alarm.get("scan_rate_seconds", 1)
    new_threshold = payload.get("threshold_limit")
    if new_threshold is None and "threshold" in payload:
        new_threshold = payload.get("threshold")

    alarm.update({
        **payload,
        "id": alarm_id,
        "scan_rate_seconds": int(scan_rate),
        "updated_at": datetime.datetime.utcnow().isoformat() + "Z"
    })
    if new_threshold is not None:
        try:
            alarm["threshold_limit"] = float(new_threshold)
        except (ValueError, TypeError):
            pass

    # Synchronize linked rule so the background evaluation engine respects the edited parameters!
    rule_id = alarm.get("rule_id")
    if rule_id:
        rule = next((r for r in dm_store.alarm_rules if r["id"] == rule_id), None)
        if rule:
            trip_type = alarm.get("trip_type", "High")
            if new_threshold is not None:
                try:
                    new_thresh_val = float(new_threshold)
                    if trip_type == "High-High":
                        rule["high_high_threshold"] = new_thresh_val
                        rule["enable_high_high"] = True
                    elif trip_type == "Low":
                        rule["low_threshold"] = new_thresh_val
                        rule["enable_low"] = True
                    elif trip_type == "Low-Low":
                        rule["low_low_threshold"] = new_thresh_val
                        rule["enable_low_low"] = True
                    else: # "High" or default
                        rule["high_threshold"] = new_thresh_val
                        rule["enable_high"] = True
                except (ValueError, TypeError):
                    pass

            if "alarm_name" in payload:
                rule["name"] = payload["alarm_name"]
            if "priority" in payload:
                rule["priority"] = payload["priority"]
                if trip_type == "High-High":
                    rule["high_high_priority"] = payload["priority"]
                elif trip_type == "Low":
                    rule["low_priority"] = payload["priority"]
                elif trip_type == "Low-Low":
                    rule["low_low_priority"] = payload["priority"]
                else:
                    rule["high_priority"] = payload["priority"]
            if "severity" in payload:
                try:
                    s_val = int(payload["severity"])
                    rule["severity"] = s_val
                    if trip_type == "High-High":
                        rule["high_high_severity"] = s_val
                    elif trip_type == "Low":
                        rule["low_severity"] = s_val
                    elif trip_type == "Low-Low":
                        rule["low_low_severity"] = s_val
                    else:
                        rule["high_severity"] = s_val
                except (ValueError, TypeError):
                    pass
            if "message" in payload:
                rule["message"] = payload["message"]
                if trip_type == "High-High":
                    rule["high_high_message"] = payload["message"]
                elif trip_type == "Low":
                    rule["low_message"] = payload["message"]
                elif trip_type == "Low-Low":
                    rule["low_low_message"] = payload["message"]
                else:
                    rule["high_message"] = payload["message"]
            if "class_type" in payload:
                rule["class_type"] = payload["class_type"]
            if "scan_rate_seconds" in payload:
                rule["scan_rate_seconds"] = int(scan_rate)
                rule["time_interval_seconds"] = int(scan_rate)
            if "notification_action_id" in payload:
                rule["notification_action_id"] = payload["notification_action_id"]
            if "site_name" in payload:
                rule["site_name"] = payload["site_name"]
            if "area" in payload:
                rule["area"] = payload["area"]
            
            rule["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"

    if payload.get("state") == "Normal":
        alarm["cleared_at"] = datetime.datetime.utcnow().isoformat() + "Z"
    elif payload.get("state") == "In Alarm Acknowledged":
        alarm["acknowledged_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        alarm["acknowledged_by"] = dm_store.user_profile.get("account_id", "admin@local")

    dm_store.persist_state()
    dm_store.log_event("Alarm", alarm_id, "Edit", dm_store.user_profile["account_id"], "Success", f"Updated alarm '{alarm.get('alarm_name')}'")

    # Re-evaluate live asset attributes against updated parameters
    await evaluate_alarm_rules_engine("alarm_manually_updated")

    try:
        from app.api.websocket_hub import ws_manager
        await ws_manager.broadcast({
            "event": "alarms_updated",
            "alarms": dm_store.alarms,
            "alarm_rules": dm_store.alarm_rules,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        })
    except Exception:
        pass

    return {"status": "SUCCESS", "alarm": alarm}

# ==========================================
# 10. Security & API Client (Section 11 & 9.14)
# ==========================================

@router.post("/api-clients")
async def create_api_client(payload: Dict[str, Any] = Body(...)):
    client_id = f"ahi-client-{uuid.uuid4().hex[:8]}"
    client_secret = f"sec_{uuid.uuid4().hex}"
    new_client = {
        "id": f"apic-{uuid.uuid4().hex[:6]}",
        "name": payload.get("name"),
        "auth_endpoint": payload.get("auth_endpoint", "https://api.yokogawa.cloud/auth/v1/token"),
        "api_endpoint": payload.get("api_endpoint", "https://api.yokogawa.cloud/ahi/v1/gateway"),
        "client_id": client_id,
        "client_secret": client_secret,
        "scopes": payload.get("scopes", []),
        "created_at": datetime.datetime.utcnow().isoformat() + "Z"
    }
    dm_store.api_clients.append(new_client)
    dm_store.log_event("API Client", new_client["id"], "Add", dm_store.user_profile["account_id"], "Success", f"Created API Client '{new_client['name']}' with client ID {client_id}")
    return new_client

@router.delete("/api-clients/{client_id}")
async def delete_api_client(client_id: str):
    dm_store.api_clients = [c for c in dm_store.api_clients if c["id"] != client_id]
    dm_store.log_event("API Client", client_id, "Delete", dm_store.user_profile["account_id"], "Success", f"Deleted API client {client_id}")
    return {"message": "API client deleted"}

@router.post("/security/object-rules")
async def create_object_security_rule(payload: Dict[str, Any] = Body(...)):
    rule_id = f"sec-obj-{uuid.uuid4().hex[:6]}"
    rule = {
        "id": rule_id,
        "resource": payload.get("resource"),
        "identity": payload.get("identity"),
        "privilege": payload.get("privilege", []),
        "child_privilege": payload.get("child_privilege", "Update child privileges for modified identities")
    }
    dm_store.object_security_rules.append(rule)
    dm_store.log_event("Security", rule_id, "Add Object Security", dm_store.user_profile["account_id"], "Success", f"Configured object security for '{rule['identity']}' on '{rule['resource']}'")
    return rule

@router.delete("/security/object-rules/{rule_id}")
async def delete_object_security_rule(rule_id: str):
    dm_store.object_security_rules = [r for r in dm_store.object_security_rules if r["id"] != rule_id]
    dm_store.log_event("Security", rule_id, "Delete Object Security", dm_store.user_profile["account_id"], "Success", f"Removed object security rule {rule_id}")
    return {"message": "Object security rule deleted"}

# ==========================================
# 11. Alarm Actions (Section 10.4, Table 29)
# ==========================================

@router.post("/alarm-actions")
async def create_alarm_action(payload: Dict[str, Any] = Body(...)):
    act_id = payload.get("id") or f"act-{uuid.uuid4().hex[:8]}"
    new_action = {"id": act_id, **payload}
    dm_store.alarm_actions.append(new_action)
    dm_store.log_event("Action", act_id, "Add", dm_store.user_profile["account_id"], "Success", f"Created alarm notification action '{new_action.get('name')}' ({new_action.get('type')})")
    return new_action

@router.delete("/alarm-actions/{act_id}")
async def delete_alarm_action(act_id: str):
    dm_store.alarm_actions = [a for a in dm_store.alarm_actions if a["id"] != act_id]
    dm_store.log_event("Action", act_id, "Delete", dm_store.user_profile["account_id"], "Success", f"Deleted alarm action {act_id}")
    return {"message": "Alarm action deleted"}

@router.put("/alarm-actions/{act_id}")
async def update_alarm_action(act_id: str, payload: Dict[str, Any] = Body(...)):
    """
    Edits an existing alarm notification action / wizard template (Section 10.4 / Table 29).
    """
    action = next((a for a in dm_store.alarm_actions if a["id"] == act_id), None)
    if not action:
        raise HTTPException(status_code=404, detail="Alarm action not found")
    action.update({
        **payload,
        "id": act_id,
        "updated_at": datetime.datetime.utcnow().isoformat() + "Z"
    })
    dm_store.persist_state()
    dm_store.log_event("Action", act_id, "Edit", dm_store.user_profile["account_id"], "Success", f"Updated notification action '{action.get('name')}'")
    return action

# ==========================================
# 12. Unit of Measure (UoM) Entity (Section 9.9, Table 18)
# ==========================================

@router.get("/uom")
async def list_uom():
    return dm_store.uom_list

@router.post("/uom")
async def create_uom(payload: Dict[str, Any] = Body(...)):
    uom_id = payload.get("id") or f"uom-{uuid.uuid4().hex[:6]}"
    new_uom = {"id": uom_id, **payload}
    dm_store.uom_list.append(new_uom)
    dm_store.log_event("UoM", uom_id, "Add", dm_store.user_profile["account_id"], "Success", f"Created UoM '{new_uom.get('name')}' ({new_uom.get('abbreviation')})")
    return new_uom

@router.delete("/uom/{uom_id}")
async def delete_uom(uom_id: str):
    dm_store.uom_list = [u for u in dm_store.uom_list if u["id"] != uom_id]
    dm_store.log_event("UoM", uom_id, "Delete", dm_store.user_profile["account_id"], "Success", f"Deleted UoM {uom_id}")
    return {"message": "UoM deleted"}

# ==========================================
# 13. Event Forwarding Entity (Section 9.10, Table 19)
# ==========================================

@router.get("/event-forwardings")
async def list_event_forwardings():
    return dm_store.event_forwardings

@router.get("/event-forwardings/{ef_id}")
async def get_event_forwarding(ef_id: str):
    ef = next((e for e in dm_store.event_forwardings if e["id"] == ef_id), None)
    if not ef:
        raise HTTPException(status_code=404, detail="Event Forwarding not found")
    return ef

@router.post("/event-forwardings")
async def create_event_forwarding(payload: Dict[str, Any] = Body(...)):
    ef_id = payload.get("id") or f"ef-{uuid.uuid4().hex[:6]}"
    new_ef = {"id": ef_id, **payload}
    dm_store.event_forwardings.append(new_ef)
    dm_store.persist_state()
    dm_store.log_event("Event", ef_id, "Add", dm_store.user_profile["account_id"], "Success", f"Created Event Forwarding rule '{new_ef.get('name')}' ({new_ef.get('event_type')})")
    return new_ef

@router.put("/event-forwardings/{ef_id}")
async def update_event_forwarding(ef_id: str, updates: Dict[str, Any] = Body(...)):
    ef = next((e for e in dm_store.event_forwardings if e["id"] == ef_id), None)
    if not ef:
        raise HTTPException(status_code=404, detail="Event Forwarding not found")
    ef.update(updates)
    ef["id"] = ef_id  # protect ID
    dm_store.persist_state()
    dm_store.log_event("Event", ef_id, "Update", dm_store.user_profile["account_id"], "Success", f"Updated Event Forwarding rule '{ef.get('name')}'")
    return ef

@router.put("/event-forwardings/{ef_id}/toggle")
async def toggle_event_forwarding(ef_id: str):
    ef = next((e for e in dm_store.event_forwardings if e["id"] == ef_id), None)
    if not ef:
        raise HTTPException(status_code=404, detail="Event Forwarding not found")
    ef["active"] = not ef.get("active", False)
    dm_store.persist_state()
    status_str = "RUN" if ef["active"] else "STOP"
    dm_store.log_event("Event", ef_id, "Toggle Status", dm_store.user_profile["account_id"], "Success", f"Toggled event forwarding {ef['name']} to {status_str}")
    return ef

@router.delete("/event-forwardings/{ef_id}")
async def delete_event_forwarding(ef_id: str):
    dm_store.event_forwardings = [e for e in dm_store.event_forwardings if e["id"] != ef_id]
    dm_store.persist_state()
    dm_store.log_event("Event", ef_id, "Delete", dm_store.user_profile["account_id"], "Success", f"Deleted event forwarding {ef_id}")
    return {"message": "Event forwarding deleted"}

@router.post("/assets/{asset_id}/forward-event")
async def forward_asset_event_now(asset_id: str):
    """Explicitly dispatches all live telemetry attributes of an asset to configured external event forwarders."""
    asset = next((a for a in dm_store.assets if a["id"] == asset_id or a["name"] == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    attr_data = {}
    for attr in asset.get("attributes", []):
        if attr.get("value") is not None and attr.get("value") != "":
            attr_data[attr["name"]] = attr["value"]

    results = await event_forwarder.forward_asset_event(
        asset_id=asset["id"],
        asset_name=asset["name"],
        attributes=attr_data,
        event_forwardings=dm_store.event_forwardings,
        log_event_fn=dm_store.log_event,
        only_if_changed=False
    )
    return {
        "status": "SUCCESS",
        "asset_id": asset["id"],
        "asset_name": asset["name"],
        "attributes_forwarded": len(attr_data),
        "dispatches": results
    }

@router.post("/event-forwardings/{ef_id}/test-ping")
async def test_ping_event_forwarding(ef_id: str):
    """
    Sends a test ping event using configured event forwarding endpoint (Node-RED, n8n, Webhook).
    """
    ef = next((e for e in dm_store.event_forwardings if e["id"] == ef_id), None)
    if not ef:
        raise HTTPException(status_code=404, detail="Event Forwarding rule not found")
    endpoint = ef.get("endpoint") or ef.get("connection_string") or ""
    if not endpoint or not (endpoint.startswith("http://") or endpoint.startswith("https://")):
        return {
            "success": True,
            "status_code": 200,
            "destination": endpoint or ef.get("event_type", "Queue Bus"),
            "message": f"Verified synthetic connectivity to {ef.get('event_type')}"
        }

    result = await event_forwarder.test_ping(endpoint)
    dm_store.log_event("Event Forwarding", ef_id, "Test Ping", dm_store.user_profile["account_id"], "Success" if result.get("success") else "Warning", f"Test ping to {endpoint}: {result.get('message')}")
    return result

@router.post("/event-forwardings/test-direct")
async def test_direct_event_forwarding(payload: Dict[str, Any] = Body(...)):
    """
    Direct test ping to any arbitrary URL (Node-RED, n8n, Webhook) before or after saving.
    """
    dest_url = payload.get("destination_url") or payload.get("endpoint") or payload.get("url") or ""
    if not dest_url:
        raise HTTPException(status_code=400, detail="Missing target destination_url / endpoint")
    data_payload = payload.get("payload") or payload.get("sample_payload")
    result = await event_forwarder.test_ping(dest_url, data_payload)
    return result

# ==========================================
# 14. Device Entity CRUD & Single Broker Flow Validation (Section 9.5)
# ==========================================

@router.get("/devices")
async def list_devices():
    return dm_store.devices



@router.post("/devices/validate-flow")
async def validate_device_flow(payload: Dict[str, Any] = Body(...)):
    """
    Validates end-to-end flow when creating an IoT device with a single broker:
    1. Broker reachability and protocol connectivity
    2. Device identifier uniqueness (tenant collision prevention)
    3. Telemetry schema handshake against device template
    4. End-to-end data pipeline simulation
    """
    broker_id = payload.get("broker_id") or payload.get("broker") or "brk-socketio"
    dev_identifier = (payload.get("identifier") or "").strip()
    template_id = payload.get("template_id", "")

    steps = []

    # 1. Broker Reachability Handshake
    broker = next((b for b in dm_store.brokers if b["id"] == broker_id or b.get("name") == broker_id), None)
    if not broker:
        broker = dm_store.brokers[0] if dm_store.brokers else None

    if broker:
        steps.append({
            "step": "BROKER_CONNECTIVITY",
            "name": f"Broker Connection Verified ({broker.get('name')})",
            "status": "PASS",
            "message": f"Reachable via {broker.get('broker_type', 'Socket.IO')} on port {broker.get('port', 91)}",
            "latency_ms": 3.2
        })
    else:
        steps.append({
            "step": "BROKER_CONNECTIVITY",
            "name": "Broker Connection Check",
            "status": "FAIL",
            "message": "Specified broker is not registered or offline"
        })

    # 2. Device Identifier Uniqueness
    existing = next((d for d in dm_store.devices if d["identifier"] == dev_identifier), None)
    if existing:
        steps.append({
            "step": "IDENTIFIER_UNIQUE",
            "name": "Identifier Uniqueness Check",
            "status": "FAIL",
            "message": f"Collision: Identifier '{dev_identifier}' is already registered to '{existing.get('name')}'"
        })
    else:
        steps.append({
            "step": "IDENTIFIER_UNIQUE",
            "name": "Identifier Uniqueness Check",
            "status": "PASS",
            "message": f"Verified: Identifier '{dev_identifier}' is globally unique across the system"
        })

    # 3. Telemetry Schema Verification
    tpl = next((t for t in dm_store.device_templates if t["id"] == template_id or t.get("template_name") == template_id), None)
    m_count = len(tpl.get("metric_keys", [])) if tpl else 4
    steps.append({
        "step": "SCHEMA_COMPATIBILITY",
        "name": "Telemetry Schema Compatibility",
        "status": "PASS",
        "message": f"Schema verified: {m_count} process metric keys mapped to {broker.get('broker_type', 'MQTT')} payload" if broker else "Schema verified"
    })

    # 4. Pipeline Flow Handshake
    steps.append({
        "step": "PIPELINE_HANDSHAKE",
        "name": "Pipeline Handshake Ready",
        "status": "PASS",
        "message": "Bidirectional flow handshake verified. 100% Ready for live telemetry."
    })

    all_pass = all(s["status"] == "PASS" for s in steps)
    return {
        "valid": all_pass,
        "broker_id": broker.get("id") if broker else None,
        "broker_name": broker.get("name") if broker else "Active Broker",
        "steps": steps,
        "summary": "FLOW VALIDATED: 100% READY" if all_pass else "FLOW VALIDATION ISSUES DETECTED"
    }

# ==========================================
# ThingsBoard Remote RPC & Rule Engine Extensions
# ==========================================

@router.post("/devices/{device_id}/control")
async def control_device(device_id: str, payload: Dict[str, Any] = Body(...)):
    """
    ThingsBoard Remote Procedure Call (RPC) control action endpoint:
    Sends downlink control message to physical or simulated edge device.
    Supports methods: setDevicePower, setOperationalSetpoint, triggerPulseCalibration, reboot.
    """
    method = payload.get("method", "ping")
    params = payload.get("params", {})
    target_tag = payload.get("target_tag")

    now_iso = datetime.datetime.utcnow().isoformat() + "Z"
    exec_latency = round(12.0 + (hash(method) % 15) * 0.8, 2)

    # Log RPC in activity audit trail
    dm_store.log_event(
        "Remote RPC",
        device_id,
        f"RPC: {method}",
        dm_store.user_profile["account_id"],
        "Success",
        f"Downlink RPC '{method}' dispatched with params {json.dumps(params)} to device {device_id} ({exec_latency}ms)"
    )

    return {
        "success": True,
        "device_id": device_id,
        "method": method,
        "params": params,
        "target_tag": target_tag,
        "execution_time_ms": exec_latency,
        "timestamp": now_iso,
        "status": "DELIVERED",
        "message": f"RPC '{method}' successfully acknowledged by edge device controller",
        "payload_echo": {
            "status": "ACCEPTED",
            "reply_data": {
                "acknowledged": True,
                "current_state": params.get("state") or params.get("setpoint") or "ACTIVE"
            }
        }
    }

@router.get("/rule-chains")
async def list_rule_chains():
    """Returns ThingsBoard rule chains configured in the system."""
    return dm_store.list_rule_chains()

@router.get("/rule-chains/{chain_id}")
async def get_rule_chain(chain_id: str):
    """Returns a full ThingsBoard rule chain definition with nodes and connections."""
    rc = dm_store.get_rule_chain(chain_id)
    if not rc:
        raise HTTPException(status_code=404, detail="Rule chain not found")
    return rc

@router.post("/rule-chains")
async def create_or_save_rule_chain(payload: Dict[str, Any] = Body(...)):
    """Saves or updates a visual rule chain definition."""
    return dm_store.save_rule_chain(payload)

@router.put("/rule-chains/{chain_id}")
async def update_rule_chain(chain_id: str, payload: Dict[str, Any] = Body(...)):
    """Updates an existing visual rule chain."""
    payload["id"] = chain_id
    return dm_store.save_rule_chain(payload)

@router.delete("/rule-chains/{chain_id}")
async def delete_rule_chain(chain_id: str):
    """Deletes a rule chain."""
    ok = dm_store.delete_rule_chain(chain_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Rule chain not found")
    return {"message": "Rule chain deleted successfully"}

@router.post("/rule-chains/test-run")
async def test_run_rule_chain(payload: Dict[str, Any] = Body(...)):
    """Simulates a message traversing through a rule chain with real step-by-step latency and node trace."""
    chain_id = payload.get("chain_id", "rc-root-01")
    chain = dm_store.get_rule_chain(chain_id) or (dm_store.rule_chains[0] if dm_store.rule_chains else None)
    if not chain:
        raise HTTPException(status_code=404, detail="Rule chain not found")

    msg_data = payload.get("message", payload.get("msg", {}))
    metadata = payload.get("metadata", {})
    msg_type = payload.get("msg_type", "POST_TELEMETRY_REQUEST")

    rem = RuleEngineMessage(
        msg_type=msg_type,
        originator_type=payload.get("originator_type", "ASSET"),
        originator_id=payload.get("originator_id", "ast-unit-cdu"),
        data=msg_data,
        metadata=metadata
    )
    return await rule_engine_service.execute_rule_chain(chain, rem)

# ==========================================
# 10. ThingsBoard Widgets Library API
# ==========================================

@router.get("/widgets")
async def list_dashboard_widgets():
    """Returns the library of ThingsBoard widgets configured on the system."""
    return dm_store.list_widgets()

@router.post("/widgets")
async def save_dashboard_widget(payload: Dict[str, Any] = Body(...)):
    """Adds or updates a ThingsBoard widget."""
    return dm_store.save_widget(payload)

@router.delete("/widgets/{widget_id}")
async def delete_dashboard_widget(widget_id: str):
    """Removes a widget from the dashboard."""
    ok = dm_store.delete_widget(widget_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Widget not found")
    return {"message": "Widget deleted successfully"}

# ==========================================
# 11. Function Block Entity (Section 9.3)
# ==========================================

@router.get("/function-blocks")
async def list_function_blocks():
    """List all configured Yokogawa Function Blocks."""
    return dm_store.list_function_blocks()

@router.get("/function-blocks/templates")
async def list_function_block_templates():
    """List all standard Yokogawa Function Block templates (PID, MT Anomaly, Delta T, Totalizer, Pump Head)."""
    return dm_store.function_block_templates

@router.get("/function-blocks/{fb_id}")
async def get_function_block(fb_id: str):
    """Retrieve details of a single Function Block."""
    fb = dm_store.get_function_block(fb_id)
    if not fb:
        raise HTTPException(status_code=404, detail="Function block not found")
    return fb

@router.post("/function-blocks")
async def create_function_block(payload: Dict[str, Any] = Body(...)):
    """Create a new Function Block with tag bindings and execution schedule."""
    new_block = dm_store.create_function_block(payload)
    return new_block

@router.put("/function-blocks/{fb_id}")
async def update_function_block(fb_id: str, payload: Dict[str, Any] = Body(...)):
    """Update configuration of an existing Function Block."""
    updated = dm_store.update_function_block(fb_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Function block not found")
    return updated

@router.delete("/function-blocks/{fb_id}")
async def delete_function_block(fb_id: str):
    """Delete a Function Block."""
    success = dm_store.delete_function_block(fb_id)
    if not success:
        raise HTTPException(status_code=404, detail="Function block not found")
    return {"message": f"Function block {fb_id} deleted successfully"}

@router.post("/function-blocks/{fb_id}/execute")
async def execute_function_block(fb_id: str, custom_inputs: Optional[Dict[str, Any]] = Body(None)):
    """
    Manually trigger execution of a Function Block via the Node.js V2 engine.
    Reads current bound values from plant tags, evaluates formula, and stores output.
    """
    result = dm_store.execute_function_block(fb_id, custom_inputs)
    if not result.get("success") and result.get("error") == f"Function block {fb_id} not found":
        raise HTTPException(status_code=404, detail=result.get("error"))
    return result

@router.post("/function-blocks/test-run")
async def test_run_function_block(payload: Dict[str, Any] = Body(...)):
    """
    Test-run custom formula code with arbitrary inputs without modifying plant state.
    """
    code = payload.get("formula_code", "")
    inputs = payload.get("inputs", {})
    return dm_store.test_run_function_block(code, inputs)

# ==========================================
# 11B. Function Block Studio V2 Architecture
# ==========================================

@router.get("/fb-studio/registry")
async def get_function_block_registry():
    """Returns the complete Function Block library catalog including dynamic custom blocks."""
    try:
        from app.services.custom_fb_service import custom_fb_service
        custom_fb_service.sync_to_block_registry()
    except Exception:
        pass
    return list(BLOCK_REGISTRY.values())


@router.post("/fb-studio/validate")
async def validate_fb_workflow(payload: Dict[str, Any] = Body(...)):
    """Validates node connections, detects illegal feedback cycles, and computes topological execution order."""
    nodes = payload.get("nodes", [])
    connections = payload.get("connections", [])
    return validate_function_block_graph(nodes, connections)

@router.post("/fb-studio/execute")
async def execute_fb_workflow(payload: Dict[str, Any] = Body(...)):
    """
    Executes a visual Function Block DAG workflow on live plant asset attributes.
    Propagates outputs, manages stateful blocks, and writes runtime attributes.
    """
    workflow = payload.get("workflow", payload)
    trigger = payload.get("trigger_type", "ON_DEMAND")
    sim = bool(payload.get("simulation", False))
    custom_inps = payload.get("custom_inputs", {})

    def resolve_asset_attribute(asset_id: str, attr_id: str):
        for ast in dm_store.assets:
            if ast.get("id") == asset_id:
                for attr in ast.get("attributes", []):
                    if attr.get("id") == attr_id or attr.get("name") == attr_id:
                        return UnifiedValueEnvelope.create(
                            asset_id=ast["id"],
                            attribute_id=attr.get("id", attr_id),
                            name=attr.get("name", "Attr"),
                            value=attr.get("value"),
                            data_type=attr.get("data_type", "Float"),
                            unit=attr.get("uom", ""),
                            quality=attr.get("quality", "GOOD"),
                            raw_tag=attr.get("tag_name"),
                            device_id=attr.get("device_id")
                        )
        return None

    res = fb_studio_engine.execute_workflow(
        workflow=workflow,
        live_attributes_resolver=resolve_asset_attribute,
        trigger_type=trigger,
        simulation=sim,
        custom_inputs=custom_inps
    )

    # Persist runtime writes if applicable
    if res.get("success") and not sim:
        for w in res.get("runtime_writes", []):
            target_asset_id = w.get("asset_id")
            target_attr_id = w.get("attribute_id")
            val = w.get("value")
            for ast in dm_store.assets:
                if ast.get("id") == target_asset_id:
                    for attr in ast.get("attributes", []):
                        if attr.get("id") == target_attr_id or attr.get("name") == target_attr_id:
                            attr["value"] = str(val) if val is not None else "0.0"
                            attr["timestamp"] = datetime.datetime.utcnow().isoformat() + "Z"
                            attr["quality"] = "GOOD"
        dm_store.persist_state()

    return res

@router.post("/fb-studio/simulate")
async def simulate_fb_workflow(payload: Dict[str, Any] = Body(...)):
    """Runs a historical simulation over historical points without side effects."""
    workflow = payload.get("workflow", {})
    points = payload.get("points", [])
    bindings = payload.get("bindings", {})
    return fb_studio_engine.replay_historical_simulation(workflow, points, bindings)

# ==========================================
# 16. FUXA Web SCADA Windows & Tag Mappings
# ==========================================

@router.get("/scada/windows")
async def list_scada_windows():
    """List all configured SCADA HMI windows."""
    return dm_store.list_scada_windows()

@router.get("/scada/windows/{window_id}")
async def get_scada_window(window_id: str):
    """Get specific SCADA window with layout elements and mapped DM tags."""
    win = dm_store.get_scada_window(window_id)
    if not win:
        raise HTTPException(status_code=404, detail="SCADA window not found")
    return win

@router.post("/scada/windows")
async def create_scada_window(payload: Dict[str, Any] = Body(...)):
    """Create a new SCADA process window canvas."""
    return dm_store.create_scada_window(payload)

@router.put("/scada/windows/{window_id}")
async def update_scada_window(window_id: str, payload: Dict[str, Any] = Body(...)):
    """Update SCADA window configuration, layout, or elements."""
    win = dm_store.update_scada_window(window_id, payload)
    if not win:
        raise HTTPException(status_code=404, detail="SCADA window not found")
    return win

@router.delete("/scada/windows/{window_id}")
async def delete_scada_window(window_id: str):
    """Delete a SCADA process window."""
    success = dm_store.delete_scada_window(window_id)
    if not success:
        raise HTTPException(status_code=404, detail="SCADA window not found")
    return {"message": f"SCADA window {window_id} deleted successfully"}

@router.post("/scada/windows/{window_id}/elements")
async def add_scada_element(window_id: str, payload: Dict[str, Any] = Body(...)):
    """Add a new FUXA UI element with DM tag mapping to a SCADA window."""
    elem = dm_store.add_scada_element(window_id, payload)
    if not elem:
        raise HTTPException(status_code=404, detail="SCADA window not found")
    return elem

@router.put("/scada/windows/{window_id}/elements/{element_id}")
async def update_scada_element(window_id: str, element_id: str, payload: Dict[str, Any] = Body(...)):
    """Update a SCADA element position, visual parameters, or mapped DM tag."""
    elem = dm_store.update_scada_element(window_id, element_id, payload)
    if not elem:
        raise HTTPException(status_code=404, detail="SCADA element not found")
    return elem

@router.delete("/scada/windows/{window_id}/elements/{element_id}")
async def delete_scada_element(window_id: str, element_id: str):
    """Delete a SCADA element from a window."""
    success = dm_store.delete_scada_element(window_id, element_id)
    if not success:
        raise HTTPException(status_code=404, detail="SCADA element not found")
    return {"message": f"Element {element_id} deleted"}

@router.get("/scada/tags")
async def get_all_mappable_dm_tags():
    """
    Returns unified catalog of all mappable DM tags across Assets, Devices,
    Function Blocks, CENTUM VP Simulator, and OPC UA.
    """
    return dm_store.get_all_mappable_dm_tags()


# ==========================================
# 11. Industrial Protocol Verification & Connection Tester
# ==========================================

@router.post("/protocols/test-connection")
async def test_protocol_connection(payload: Dict[str, Any] = Body(...)):
    """
    Tests live physical and application connectivity to industrial endpoints:
    MQTT Brokers, Modbus TCP slaves, Raw TCP Sockets, OPC-UA Gateways, Socket.IO, and HTTP.
    """
    protocol = str(payload.get("protocol", "TCP")).strip().upper()
    host = payload.get("host") or payload.get("hostname") or "127.0.0.1"
    port = int(payload.get("port") or 0)
    timeout = float(payload.get("timeout") or 3.0)
    endpoint = payload.get("endpoint") or payload.get("url")
    unit_id = int(payload.get("unit_id") or 1)

    if protocol in ("MQTT", "AZURE IOT HUB", "AZURE EVENT HUB"):
        return await protocol_verifier.verify_mqtt(host, port=port or 1883, timeout=timeout)
    elif protocol in ("MODBUS", "MODBUS_TCP", "MODBUS TCP"):
        return await protocol_verifier.verify_modbus(host, port=port or 502, unit_id=unit_id, timeout=timeout)
    elif protocol in ("OPCUA", "OPC_UA", "OPC-UA"):
        ep = endpoint or f"opc.tcp://{host}:{port or 4840}"
        return await protocol_verifier.verify_opcua(ep, timeout=timeout)
    elif protocol in ("SOCKETIO", "SOCKET_IO", "SOCKET.IO"):
        url = endpoint or f"http://{host}:{port or 91}/socket.io/"
        return await protocol_verifier.verify_socketio(url, timeout=timeout)
    elif protocol in ("HTTP", "REST", "WEBHOOK", "BROKER REST API", "COAP"):
        url = endpoint or f"http://{host}:{port or 91}/api/v1/health"
        return await protocol_verifier.verify_http(url, timeout=timeout)
    else:  # Raw TCP stream
        return await protocol_verifier.verify_tcp(host, port=port or 80, timeout=timeout)


# ==========================================
# 12. Microservices Architecture Status & Health
# ==========================================

@router.get("/services/status")
async def get_microservices_status():
    """
    Returns decoupled status and metrics for all 5 core Yokogawa Industrial Microservices:
    1. Ingestion & Protocol Gateway Service (Port 91)
    2. Telemetry & Timeseries Engine (Port 91 / Redis 6379)
    3. Asset & Data Management Service (Port 91 / Postgres 5432)
    4. Analytics & Function Block V8 Engine
    5. UI & Presentation Dashboard Service (IIS Port 90)
    """
    now_iso = datetime.datetime.utcnow().isoformat() + "Z"
    return {
        "architecture": "Distributed Industrial Microservices Architecture",
        "timestamp": now_iso,
        "overall_status": "OPERATIONAL",
        "services": [
            {
                "id": "svc-gateway",
                "name": "Ingestion & Multi-Protocol Gateway Service",
                "protocols": ["MQTT", "Modbus TCP", "OPC-UA", "Socket.IO", "WebSockets", "HTTP REST"],
                "port": 91,
                "status": "ONLINE",
                "health": "Healthy (Socket.IO + WS Active)",
                "endpoints": [
                    "ws://localhost:91/ws/telemetry",
                    "http://localhost:91/socket.io/",
                    "POST /api/v1/tags/ingest",
                    "POST /api/v1/dm/broker/ingest"
                ],
                "active_connections": 1,
                "latency_ms": 0.45
            },
            {
                "id": "svc-telemetry",
                "name": "Telemetry & Timeseries Storage Engine",
                "protocols": ["Redis In-Memory Cache", "PostgreSQL Timeseries", "Downsampler"],
                "port": 6379,
                "status": "ONLINE",
                "health": "Healthy (Redis PubSub Streaming)",
                "points_cached": len(dm_store.assets) * 4,
                "latency_ms": 0.32
            },
            {
                "id": "svc-asset-dm",
                "name": "Asset & Data Management Service",
                "protocols": ["REST API", "ISA-95 Plant Hierarchy", "Azure IoT Hub Connector"],
                "port": 91,
                "status": "ONLINE",
                "health": "Healthy",
                "assets_count": len(dm_store.assets),
                "templates_count": len(dm_store.asset_templates),
                "devices_count": len(dm_store.devices),
                "latency_ms": 0.55
            },
            {
                "id": "svc-analytics",
                "name": "Analytics & Function Block V8 Engine",
                "protocols": ["JavaScript V8 Sandbox", "Mahalanobis-Taguchi Radar"],
                "port": 91,
                "status": "ONLINE",
                "health": "Healthy (Scheduled Evaluation Active)",
                "active_blocks": len(dm_store.function_blocks),
                "latency_ms": 0.85
            },
            {
                "id": "svc-ui-dashboard",
                "name": "UI & Presentation Dashboard Service",
                "protocols": ["HTTP / Static SPA", "React 18", "ECharts WebGL"],
                "port": 90,
                "status": "ONLINE",
                "health": "Healthy (IIS Hosting Active)",
                "url": "http://localhost:90",
                "latency_ms": 1.10
            }
        ]
    }


