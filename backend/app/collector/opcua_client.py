import asyncio
import datetime
import logging
from typing import Dict, Any, List, Optional
from asyncua import Client, ua
from app.cache.redis_service import redis_service
from app.config import settings

logger = logging.getLogger(__name__)

class YokogawaSubHandler:
    """Subscription callback handler for incoming OPC UA data changes."""
    def __init__(self, node_tag_map: Dict[str, str]):
        self.node_tag_map = node_tag_map

    async def datachange_notification(self, node: ua.NodeId, val: Any, data: ua.DataValue):
        try:
            node_id_str = node.to_string()
            tag_name = self.node_tag_map.get(node_id_str, node_id_str)

            # Determine OPC UA Quality from StatusCode
            status_code = data.StatusCode
            if status_code.is_good():
                quality = "GOOD"
            elif status_code.is_uncertain():
                quality = "UNCERTAIN"
            else:
                quality = "BAD"

            # Use SourceTimestamp if present, fallback to ServerTimestamp or utcnow
            ts = data.SourceTimestamp or data.ServerTimestamp or datetime.datetime.utcnow()
            ts_iso = ts.isoformat() + "Z"
            ts_ms = int(ts.timestamp() * 1000)

            tag_payload = {
                "tag_name": tag_name,
                "value": float(val) if isinstance(val, (int, float)) else val,
                "quality": quality,
                "status_code": str(status_code),
                "timestamp": ts_iso,
                "ts_ms": ts_ms,
                "source": "OPC_UA"
            }

            # Update Redis cache
            await redis_service.set_tag_value(tag_name, tag_payload)

            # Broadcast frame
            await redis_service.publish_live_frame({
                "event": "telemetry_update",
                "timestamp": ts_iso,
                "tags": {tag_name: tag_payload}
            })
        except Exception as e:
            logger.error("Error processing OPC UA datachange notification: %s", e)


class YokogawaOpcUaManager:
    def __init__(self):
        self.client: Optional[Client] = None
        self.endpoint: str = settings.opcua_endpoint
        self.is_connected: bool = False
        self.reconnect_task: Optional[asyncio.Task] = None
        self.subscription = None
        self.monitored_nodes: Dict[str, str] = {}  # NodeId -> TagName

    async def start(self):
        if not settings.opcua_enabled:
            logger.info("OPC UA direct client disabled by configuration (simulator active).")
            return
        self.reconnect_task = asyncio.create_task(self._connection_loop())

    async def stop(self):
        if self.reconnect_task:
            self.reconnect_task.cancel()
        await self.disconnect()

    async def disconnect(self):
        if self.client:
            try:
                if self.subscription:
                    await self.subscription.delete()
                await self.client.disconnect()
                logger.info("Disconnected from Yokogawa OPC UA server.")
            except Exception as e:
                logger.warning("Error during OPC UA disconnect: %s", e)
            finally:
                self.client = None
                self.is_connected = False

    async def _connection_loop(self):
        while True:
            if not self.is_connected:
                try:
                    logger.info("Attempting connection to Yokogawa OPC UA at %s...", self.endpoint)
                    self.client = Client(url=self.endpoint, timeout=10)
                    await self.client.connect()
                    self.is_connected = True
                    logger.info("Successfully connected to Yokogawa OPC UA server at %s", self.endpoint)

                    # Initialize subscriptions if nodes configured
                    if self.monitored_nodes:
                        await self._setup_subscriptions()

                except Exception as e:
                    logger.warning("OPC UA connection to %s failed: %s. Retrying in 10s...", self.endpoint, e)
                    self.is_connected = False
                    await asyncio.sleep(10)
            else:
                await asyncio.sleep(5)

    async def _setup_subscriptions(self):
        try:
            handler = YokogawaSubHandler(self.monitored_nodes)
            self.subscription = await self.client.create_subscription(
                period=settings.opcua_default_sampling_interval_ms if hasattr(settings, 'opcua_default_sampling_interval_ms') else 1000,
                handler=handler
            )
            nodes = [self.client.get_node(node_id) for node_id in self.monitored_nodes.keys()]
            await self.subscription.subscribe_data_change(nodes)
            logger.info("Subscribed to %d Yokogawa OPC UA monitored items", len(nodes))
        except Exception as e:
            logger.error("Failed to establish OPC UA monitored items: %s", e)

    async def browse_address_space(self, start_node_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Browse the OPC UA hierarchy tree for tag discovery."""
        if not self.is_connected or not self.client:
            return []
        try:
            if start_node_id:
                node = self.client.get_node(start_node_id)
            else:
                node = self.client.get_objects_node()

            children = await node.get_children()
            results = []
            for child in children:
                browse_name = await child.read_browse_name()
                node_class = await child.read_node_class()
                results.append({
                    "node_id": child.node_id.to_string(),
                    "browse_name": browse_name.Name,
                    "node_class": str(node_class)
                })
            return results
        except Exception as e:
            logger.error("Error browsing OPC UA address space: %s", e)
            return []

opcua_manager = YokogawaOpcUaManager()
