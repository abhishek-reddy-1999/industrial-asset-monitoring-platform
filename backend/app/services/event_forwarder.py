import asyncio
import datetime
import logging
from typing import Dict, Any, List, Optional
import httpx

logger = logging.getLogger("event_forwarder")

class EventForwarderService:
    """
    Microservice for forwarding asset telemetry and events to external platforms:
    - Node-RED flows (HTTP In endpoint)
    - n8n automated workflows (Webhook trigger)
    - Custom REST Webhooks / Event Hubs
    """
    def __init__(self):
        self.stats = {
            "total_dispatched": 0,
            "total_success": 0,
            "total_failed": 0,
            "last_dispatch_at": None,
            "last_destination": None,
            "last_status_code": None
        }
        self._last_forwarded_asset_state: Dict[str, Any] = {}

    async def forward_asset_event(
        self,
        asset_id: str,
        asset_name: str,
        attributes: Dict[str, Any],
        event_forwardings: List[Dict[str, Any]],
        log_event_fn = None,
        only_if_changed: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Scans active event forwardings and dispatches to matching endpoints.
        Only dispatches if attributes have changed or only_if_changed is False.
        """
        results = []
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"

        # Check if values actually changed
        if only_if_changed and str(asset_id) in self._last_forwarded_asset_state:
            last_attrs = self._last_forwarded_asset_state[str(asset_id)]
            if last_attrs == attributes:
                # No change in values, skip redundant forwarding
                return []

        self._last_forwarded_asset_state[str(asset_id)] = dict(attributes)

        # Resolve full asset/equipment details from store
        asset_obj = None
        try:
            from app.api.dm_service import dm_store
            aid_str = str(asset_id).strip().lower()
            aname_str = str(asset_name).strip().lower()
            asset_obj = next((
                a for a in dm_store.assets 
                if (aid_str and str(a.get("id", "")).strip().lower() == aid_str)
                or (aname_str and str(a.get("name", "")).strip().lower() == aname_str)
            ), None)
        except Exception:
            pass

        site_val = (asset_obj.get("site") or asset_obj.get("site_name") or "") if asset_obj else ""
        area_val = (asset_obj.get("area") or "") if asset_obj else ""
        level_val = (asset_obj.get("level") or "EQUIPMENT") if asset_obj else "EQUIPMENT"
        tag_val = (asset_obj.get("tag") or asset_obj.get("equipment_tag") or asset_name) if asset_obj else asset_name
        path_val = (asset_obj.get("path") or "") if asset_obj else ""
        category_val = (asset_obj.get("category") or "") if asset_obj else ""

        equipment_obj = {
            "id": asset_id,
            "equipment_id": asset_id,
            "name": asset_name,
            "equipment_name": asset_name,
            "tag": tag_val,
            "equipment_tag": tag_val,
            "level": level_val,
            "site": site_val,
            "area": area_val,
            "path": path_val,
            "category": category_val,
            "attributes": attributes,
            "data": attributes,
            "telemetry": attributes,
            "attribute_details": asset_obj.get("attributes", []) if asset_obj else []
        }

        for ef in event_forwardings:
            if not ef.get("active", False):
                continue

            # Check scope: Extract all valid identifiers from scope dictionaries or strings
            scope = ef.get("scope") or ef.get("selectedAssetIds") or []
            if scope:
                scope_keys = set()
                for s in scope:
                    if isinstance(s, dict):
                        for k in ["asset_id", "asset_name", "id", "name", "equipment_id", "equipment_name", "equipment_tag", "tag"]:
                            v = s.get(k)
                            if v:
                                scope_keys.add(str(v).strip().lower())
                    elif isinstance(s, str):
                        scope_keys.add(s.strip().lower())

                if scope_keys:
                    aid_lower = str(asset_id).strip().lower()
                    aname_lower = str(asset_name).strip().lower()
                    atag_lower = str(tag_val).strip().lower()
                    if aid_lower not in scope_keys and aname_lower not in scope_keys and atag_lower not in scope_keys:
                        continue

            destination_type = ef.get("event_type") or ef.get("destination_type", "Webhook")
            endpoint = ef.get("endpoint") or ef.get("connection_string") or ""

            # Standardized industrial payload with Equipment data & Asset data
            payload = {
                "source": "Yokogawa OPREX AHI Event Forwarding v1.3",
                "event_type": "EQUIPMENT_DATA_UPDATED",
                "event": "EQUIPMENT_TELEMETRY",
                "timestamp": now_iso,
                # Equipment top-level fields
                "equipment_id": asset_id,
                "equipment_name": asset_name,
                "equipment_tag": tag_val,
                "equipment": equipment_obj,
                "equipment_data": attributes,
                "equipment_attributes": attributes,
                # Asset top-level fields
                "asset_id": asset_id,
                "asset_name": asset_name,
                "asset": {
                    "id": asset_id,
                    "name": asset_name,
                    "level": level_val,
                    "site": site_val,
                    "area": area_val,
                    "attributes": attributes,
                    "data": attributes,
                    "attribute_details": asset_obj.get("attributes", []) if asset_obj else []
                },
                # Flat attributes / data / telemetry
                "attributes": attributes,
                "data": attributes,
                "telemetry": attributes,
                "payload": attributes
            }
            if not ef.get("simplified_payload", True):
                payload["metadata"] = {
                    "rule_id": ef.get("id"),
                    "rule_name": ef.get("name"),
                    "forwarder_tier": "Microservices Ingestion Gateway",
                    "equipment_level": level_val
                }

            # Dispatch if endpoint is an HTTP URL
            if endpoint.startswith("http://") or endpoint.startswith("https://"):
                dispatch_res = await self._send_http(endpoint, payload, ef.get("name", "Forwarding Rule"))
                results.append(dispatch_res)

                if log_event_fn:
                    status_text = "Success" if dispatch_res["success"] else "Failed"
                    log_event_fn(
                        "Event Forwarding",
                        ef.get("id", "ef"),
                        f"Forward to {destination_type}",
                        "Event Dispatcher",
                        status_text,
                        f"Forwarded asset {asset_name} data to {endpoint} (HTTP {dispatch_res.get('status_code', 'ERR')})"
                    )
            else:
                # Simulates broker or queue push for Azure Event Hub / RabbitMQ
                self.stats["total_dispatched"] += 1
                self.stats["total_success"] += 1
                self.stats["last_dispatch_at"] = now_iso
                self.stats["last_destination"] = endpoint or destination_type
                results.append({
                    "success": True,
                    "destination": endpoint or destination_type,
                    "protocol": destination_type,
                    "status_code": 200,
                    "message": f"Queued to {destination_type} bus"
                })

        return results

    async def forward_alarm_for_asset(
        self,
        event_type: str,
        alarm_data: Dict[str, Any],
        event_forwardings: List[Dict[str, Any]],
        log_event_fn = None
    ) -> List[Dict[str, Any]]:
        """
        Forwards alarm state changes (ALARM_TRIGGERED / ALARM_RETURN_TO_NORMAL)
        to any active event forwardings scoped to this asset or global scope,
        including all live asset telemetry attributes.
        """
        results = []
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"
        asset_id = str(alarm_data.get("asset_id") or "").strip().lower()
        asset_name = str(alarm_data.get("source_asset") or "").strip().lower()

        # Resolve asset object and all attributes from store
        asset_obj = None
        attr_dict = {}
        try:
            from app.api.dm_service import dm_store
            asset_obj = next((
                a for a in dm_store.assets 
                if (asset_id and str(a.get("id", "")).strip().lower() == asset_id)
                or (asset_name and str(a.get("name", "")).strip().lower() == asset_name)
            ), None)
            if asset_obj:
                for at in asset_obj.get("attributes", []):
                    if at.get("name"):
                        attr_dict[at["name"]] = at.get("value")
        except Exception:
            pass

        # Ensure the alarming attribute itself is also included
        if alarm_data.get("attribute_name") and alarm_data.get("attribute_name") not in attr_dict:
            attr_dict[alarm_data["attribute_name"]] = alarm_data.get("current_value")

        threshold_val = alarm_data.get("threshold_limit")
        if threshold_val is None:
            threshold_val = alarm_data.get("threshold")

        for ef in event_forwardings:
            if not ef.get("active", False):
                continue

            scope = ef.get("scope") or ef.get("selectedAssetIds") or []
            if scope:
                scope_keys = set()
                for s in scope:
                    if isinstance(s, dict):
                        for k in ["asset_id", "asset_name", "id", "name"]:
                            v = s.get(k)
                            if v:
                                scope_keys.add(str(v).strip().lower())
                    elif isinstance(s, str):
                        scope_keys.add(s.strip().lower())

                if scope_keys:
                    if asset_id not in scope_keys and asset_name not in scope_keys:
                        continue

            destination_type = ef.get("event_type") or ef.get("destination_type", "Webhook")
            endpoint = ef.get("endpoint") or ef.get("connection_string") or ""

            payload = {
                "source": "Yokogawa OPREX AHI Event Forwarding v1.3",
                "event_type": f"ALARM_{event_type}",
                "event": f"ALARM_{event_type}",
                "timestamp": now_iso,
                "equipment_id": asset_obj.get("id") if asset_obj else alarm_data.get("asset_id"),
                "equipment_name": asset_obj.get("name") if asset_obj else alarm_data.get("source_asset"),
                "equipment_tag": asset_obj.get("name") if asset_obj else alarm_data.get("source_asset"),
                "equipment": {
                    "id": asset_obj.get("id") if asset_obj else alarm_data.get("asset_id"),
                    "name": asset_obj.get("name") if asset_obj else alarm_data.get("source_asset"),
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
                    "name": asset_obj.get("name") if asset_obj else alarm_data.get("source_asset"),
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
                    "attribute_name": alarm_data.get("attribute_name"),
                    "uom": alarm_data.get("uom", ""),
                    "current_value": alarm_data.get("current_value") if alarm_data.get("current_value") is not None else alarm_data.get("value"),
                    "threshold": threshold_val,
                    "threshold_limit": threshold_val,
                    "scan_rate_seconds": alarm_data.get("scan_rate_seconds", 1),
                    "class_type": alarm_data.get("class_type", "Process Safety"),
                    "message": alarm_data.get("message") or "Alarm state updated",
                    "occurred_at": alarm_data.get("occurred_at") or alarm_data.get("triggered_at") or now_iso,
                    "cleared_at": alarm_data.get("cleared_at") if event_type == "RETURN_TO_NORMAL" else None
                }
            }

            if endpoint.startswith("http://") or endpoint.startswith("https://"):
                dispatch_res = await self._send_http(endpoint, payload, ef.get("name", "Forwarding Rule"))
                results.append(dispatch_res)
                if log_event_fn:
                    status_text = "Success" if dispatch_res["success"] else "Failed"
                    log_event_fn(
                        "Event Forwarding",
                        ef.get("id", "ef"),
                        f"Forward ALARM_{event_type} to {destination_type}",
                        "Alarm/Asset Dispatcher",
                        status_text,
                        f"Dispatched ALARM_{event_type} for asset {alarm_data.get('source_asset')} to {endpoint} (HTTP {dispatch_res.get('status_code', 'ERR')})"
                    )

        return results

    async def _send_http(self, url: str, payload: Dict[str, Any], rule_name: str) -> Dict[str, Any]:
        """
        Dispatches HTTP POST to target (Node-RED / n8n / Webhook) with a 3.5s timeout.
        """
        self.stats["total_dispatched"] += 1
        self.stats["last_destination"] = url
        self.stats["last_dispatch_at"] = datetime.datetime.utcnow().isoformat() + "Z"

        try:
            async with httpx.AsyncClient(timeout=3.5, verify=False) as client:
                resp = await client.post(
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json", "X-AHI-Forwarder": "Yokogawa-DM-1.3"}
                )
                status_code = resp.status_code
                self.stats["last_status_code"] = status_code

                if resp.is_success:
                    self.stats["total_success"] += 1
                    return {
                        "success": True,
                        "destination": url,
                        "status_code": status_code,
                        "message": f"Delivered to {url} (HTTP {status_code})"
                    }
                else:
                    self.stats["total_failed"] += 1
                    return {
                        "success": False,
                        "destination": url,
                        "status_code": status_code,
                        "message": f"Received HTTP {status_code} from {url}"
                    }
        except Exception as e:
            self.stats["total_failed"] += 1
            self.stats["last_status_code"] = 0
            logger.warning(f"Event forward HTTP dispatch failed for {url}: {e}")
            return {
                "success": False,
                "destination": url,
                "status_code": 0,
                "error": str(e),
                "message": f"Connection error: {str(e)}"
            }

    async def test_ping(self, target_url: str, sample_payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Tests forwarding connectivity to a Node-RED or n8n endpoint.
        """
        if not sample_payload:
            sample_payload = {
                "source": "Yokogawa OPREX AHI Telemetry Ping",
                "test": True,
                "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                "asset": "Centrifugal Feed Pump P-101A",
                "metrics": {
                    "discharge_pressure": 595.2,
                    "bearing_temp": 64.5,
                    "vibration_rms": 2.45
                }
            }
        return await self._send_http(target_url, sample_payload, "Test Ping")

event_forwarder = EventForwarderService()
