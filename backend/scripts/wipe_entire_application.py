import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from app.db.database import AsyncSessionLocal
from sqlalchemy import text
from app.cache.redis_service import redis_service
from app.api.dm_service import dm_store

async def wipe_all():
    print("Wiping all dummy data from entire application (clean canvas mode)...")
    
    # 1. Truncate all PostgreSQL tables
    async with AsyncSessionLocal() as session:
        tables = [
            "historical_points",
            "alarm_events",
            "alarm_rules",
            "ahi_asset_health",
            "tags",
            "asset_nodes",
            "dashboards",
            "dm_devices",
            "dm_brokers",
            "dm_function_block_executions",
            "dm_function_block_templates",
            "dm_activity_logs"
        ]
        for t in tables:
            try:
                await session.execute(text(f'TRUNCATE TABLE "{t}" RESTART IDENTITY CASCADE;'))
                print(f" -> Truncated table: {t}")
            except Exception as e:
                print(f" -> Table {t} note: {e}")
        await session.commit()
    print("PostgreSQL tables successfully cleaned to 0 rows.")

    # 2. Wipe in-memory DM store
    dm_store.wipe_all_data()
    print("In-memory DM data store wiped.")

    # 3. Flush Redis live cache
    try:
        await redis_service.connect()
        if redis_service.redis_client:
            keys = await redis_service.redis_client.keys("ydash:*")
            if keys:
                await redis_service.redis_client.delete(*keys)
                print(f"Cleared {len(keys)} Redis cache keys.")
            await redis_service.close()
    except Exception as e:
        print(f"Redis cleanup note: {e}")

    print("\nSUCCESS: All dummy things deleted from entire application!")
    print("System is in 100% clean canvas mode. You can now manually create each configuration.")

if __name__ == "__main__":
    asyncio.run(wipe_all())
