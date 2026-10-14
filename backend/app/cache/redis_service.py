import json
import logging
from typing import Dict, Any, List, Optional
import redis.asyncio as aioredis
from app.config import settings

logger = logging.getLogger(__name__)

class RedisService:
    def __init__(self):
        self.redis_client: Optional[aioredis.Redis] = None

    async def connect(self):
        try:
            self.redis_client = aioredis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
                max_connections=20
            )
            await self.redis_client.ping()
            logger.info("Connected successfully to Redis at %s", settings.redis_url)
        except Exception as e:
            logger.error("Failed to connect to Redis: %s", e)
            self.redis_client = None

    async def close(self):
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Redis connection closed")

    async def set_tag_value(self, tag_name: str, data: Dict[str, Any]):
        """Store the latest tag snapshot in Redis."""
        if not self.redis_client:
            return
        try:
            key = f"tag:current:{tag_name}"
            await self.redis_client.set(key, json.dumps(data), ex=86400)
            # Also maintain a set of active tag names
            await self.redis_client.sadd("active_tags", tag_name)
        except Exception as e:
            logger.warning("Error storing tag %s in Redis: %s", tag_name, e)

    async def get_tag_value(self, tag_name: str) -> Optional[Dict[str, Any]]:
        if not self.redis_client:
            return None
        try:
            val = await self.redis_client.get(f"tag:current:{tag_name}")
            return json.loads(val) if val else None
        except Exception:
            return None

    async def get_all_latest_values(self) -> Dict[str, Any]:
        """Fetch all latest cached tag values in a pipeline."""
        if not self.redis_client:
            return {}
        try:
            tag_names = await self.redis_client.smembers("active_tags")
            if not tag_names:
                return {}
            
            pipe = self.redis_client.pipeline()
            keys = [f"tag:current:{name}" for name in tag_names]
            for key in keys:
                pipe.get(key)
            
            results = await pipe.execute()
            data = {}
            for name, val in zip(tag_names, results):
                if val:
                    data[name] = json.loads(val)
            return data
        except Exception as e:
            logger.warning("Error retrieving bulk tag values from Redis: %s", e)
            return {}

    async def publish_live_frame(self, frame: Dict[str, Any]):
        """Publish real-time telemetry frame to Redis Pub/Sub."""
        if not self.redis_client:
            return
        try:
            await self.redis_client.publish(settings.redis_channel, json.dumps(frame))
        except Exception as e:
            logger.warning("Error publishing to Redis channel %s: %s", settings.redis_channel, e)

    async def publish_telemetry(self, frame: Dict[str, Any]):
        """Alias for publish_live_frame"""
        await self.publish_live_frame(frame)

    async def set_live_values(self, tag_dict: Dict[str, Dict[str, Any]]):
        """Bulk store live tag snapshots in Redis."""
        if not self.redis_client or not tag_dict:
            return
        try:
            pipe = self.redis_client.pipeline()
            for tag_name, val_obj in tag_dict.items():
                pipe.set(f"tag:current:{tag_name}", json.dumps(val_obj), ex=86400)
                pipe.sadd("active_tags", tag_name)
            await pipe.execute()
        except Exception as e:
            logger.warning("Error bulk storing tags in Redis: %s", e)

redis_service = RedisService()
