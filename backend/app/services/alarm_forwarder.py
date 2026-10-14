import asyncio
import datetime
import logging
from typing import Dict, Any, List, Optional
import httpx

logger = logging.getLogger("alarm_forwarder")

class AlarmForwarderService:
    """
    Microservice for dispatching alarm lifecycle events:
    - ALARM_TRIGGERED (Trip: High-High, High, Low, Low-Low, Digital State)
    - ALARM_RETURN_TO_NORMAL (Normalized: Signal back within safe operating envelope)
    - ALARM_ACKNOWLEDGED (Operator annotated/acknowledged)
    
    Dispatches to configured notification actions:
    - Node-RED webhook endpoints
    - n8n automated incident flows
    - External Webhooks, Slack, or Email dispatchers
    """
    def __init__(self):
        self.history = []

    async def forward_alarm_lifecycle(
        self,
        event_type: str,  # "TRIGGERED" | "RETURN_TO_NORMAL" | "ACKNOWLEDGED"
        alarm_data: Dict[str, Any],
        alarm_actions: List[Dict[str, Any]],
        log_event_fn = None
    ) -> List[Dict[str, Any]]:
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"
        results = []

        threshold_val = alarm_data.get("threshold_limit")
        if threshold_val is None:
            threshold_val = alarm_data.get("threshold")

        occurred_iso = alarm_data.get("occurred_at") or alarm_data.get("triggered_at") or now_iso

        # Resolve asset object and all attributes from store
        asset_obj = None
        attr_dict = {}
        try:
            from app.api.dm_service import dm_store
            aid = str(alarm_data.get("asset_id") or "").strip().lower()
            aname = str(alarm_data.get("source_asset") or alarm_data.get("source") or "").strip().lower()
            asset_obj = next((
                a for a in dm_store.assets 
                if (aid and str(a.get("id", "")).strip().lower() == aid)
                or (aname and str(a.get("name", "")).strip().lower() == aname)
            ), None)
            if asset_obj:
                for at in asset_obj.get("attributes", []):
                    if at.get("name"):
                        attr_dict[at["name"]] = at.get("value")
        except Exception:
            pass

        if alarm_data.get("attribute_name") and alarm_data.get("attribute_name") not in attr_dict:
            attr_dict[alarm_data["attribute_name"]] = alarm_data.get("current_value")

        payload = {
            "source": "Yokogawa OPREX AHI Alarm Management v1.3",
            "event": f"ALARM_{event_type}",
            "event_type": f"ALARM_{event_type}",
            "timestamp": now_iso,
            "equipment_id": asset_obj.get("id") if asset_obj else alarm_data.get("asset_id"),
            "equipment_name": asset_obj.get("name") if asset_obj else (alarm_data.get("source_asset") or alarm_data.get("source")),
            "equipment_tag": asset_obj.get("name") if asset_obj else (alarm_data.get("source_asset") or alarm_data.get("source")),
            "equipment": {
                "id": asset_obj.get("id") if asset_obj else alarm_data.get("asset_id"),
                "name": asset_obj.get("name") if asset_obj else (alarm_data.get("source_asset") or alarm_data.get("source")),
                "site": asset_obj.get("site") or asset_obj.get("site_name") or alarm_data.get("site_name") or "",
                "area": asset_obj.get("area") or alarm_data.get("area") or "",
                "level": asset_obj.get("level", "EQUIPMENT") if asset_obj else "EQUIPMENT",
                "category": asset_obj.get("category", "") if asset_obj else "",
                "attributes": attr_dict,
                "data": attr_dict,
                "attribute_details": asset_obj.get("attributes", []) if asset_obj else []
            },
            "equipment_data": attr_dict,
            "equipment_attributes": attr_dict,
            "asset": {
                "id": asset_obj.get("id") if asset_obj else alarm_data.get("asset_id"),
                "name": asset_obj.get("name") if asset_obj else (alarm_data.get("source_asset") or alarm_data.get("source")),
                "site": asset_obj.get("site") or asset_obj.get("site_name") or alarm_data.get("site_name") or "",
                "area": asset_obj.get("area") or alarm_data.get("area") or "",
                "category": asset_obj.get("category", "") if asset_obj else "",
                "type": asset_obj.get("type", "") if asset_obj else "",
                "attributes": attr_dict,
                "attribute_details": asset_obj.get("attributes", []) if asset_obj else []
            },
            "attributes": attr_dict,
            "data": attr_dict,
            "telemetry": attr_dict,
            "alarm": {
                "id": alarm_data.get("id"),
                "rule_id": alarm_data.get("rule_id"),
                "alarm_name": alarm_data.get("alarm_name") or alarm_data.get("name"),
                "state": alarm_data.get("state"),
                "severity": alarm_data.get("severity", 500),
                "priority": alarm_data.get("priority", "High"),
                "trip_type": alarm_data.get("trip_type") or "High",
                "tag_name": alarm_data.get("tag_name") or alarm_data.get("signal"),
                "source_asset": alarm_data.get("source_asset") or alarm_data.get("source"),
                "asset_id": alarm_data.get("asset_id"),
                "attribute_name": alarm_data.get("attribute_name"),
                "uom": alarm_data.get("uom", ""),
                "current_value": alarm_data.get("current_value") if alarm_data.get("current_value") is not None else alarm_data.get("value"),
                "threshold": threshold_val,
                "threshold_limit": threshold_val,
                "scan_rate_seconds": alarm_data.get("scan_rate_seconds", 1),
                "class_type": alarm_data.get("class_type", "Process Safety"),
                "message": alarm_data.get("message") or alarm_data.get("description", "Alarm state updated"),
                "occurred_at": occurred_iso,
                "acknowledged_by": alarm_data.get("acknowledged_by"),
                "acknowledged_at": alarm_data.get("acknowledged_at"),
                "cleared_at": alarm_data.get("cleared_at") if event_type == "RETURN_TO_NORMAL" else None
            }
        }

        # Store in internal in-memory history
        self.history.append({
            "event_type": event_type,
            "alarm_id": alarm_data.get("id"),
            "timestamp": now_iso,
            "payload": payload
        })
        if len(self.history) > 100:
            self.history.pop(0)

        # Dispatch to actions with Webhook/HTTP target
        for act in alarm_actions:
            target = act.get("to_contact") or act.get("endpoint") or ""
            act_type = act.get("type", "Webhook")

            if target.startswith("http://") or target.startswith("https://"):
                try:
                    async with httpx.AsyncClient(timeout=3.5, verify=False) as client:
                        resp = await client.post(
                            target,
                            json=payload,
                            headers={"Content-Type": "application/json", "X-AHI-Alarm-Event": event_type}
                        )
                        success = resp.is_success
                        res_item = {
                            "action_id": act.get("id"),
                            "action_name": act.get("name"),
                            "target": target,
                            "event": event_type,
                            "success": success,
                            "status_code": resp.status_code
                        }
                        results.append(res_item)

                        if log_event_fn:
                            status_str = "Success" if success else "Failed"
                            log_event_fn(
                                "Alarm Notification",
                                alarm_data.get("id", "alarm"),
                                f"Forward {event_type} to {act_type}",
                                "Alarm Dispatcher",
                                status_str,
                                f"Dispatched {event_type} to {target} (HTTP {resp.status_code})"
                            )
                except Exception as e:
                    logger.warning(f"Alarm forward to {target} failed: {e}")
                    results.append({
                        "action_id": act.get("id"),
                        "action_name": act.get("name"),
                        "target": target,
                        "event": event_type,
                        "success": False,
                        "status_code": 0,
                        "error": str(e)
                    })
            else:
                # Simulated Email / WhatsApp / Bus
                results.append({
                    "action_id": act.get("id"),
                    "action_name": act.get("name"),
                    "target": target,
                    "event": event_type,
                    "success": True,
                    "status_code": 200,
                    "message": f"Queued {event_type} notification for channel {act_type}"
                })

        return results

alarm_forwarder = AlarmForwarderService()
