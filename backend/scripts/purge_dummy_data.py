import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from app.db.database import AsyncSessionLocal
from sqlalchemy import text
from app.cache.redis_service import redis_service

async def purge():
    print("Purging dummy simulated data...")
    # 1. Truncate historical points & alarm events
    async with AsyncSessionLocal() as session:
        await session.execute(text("TRUNCATE TABLE historical_points RESTART IDENTITY CASCADE;"))
        await session.execute(text("TRUNCATE TABLE alarm_events RESTART IDENTITY CASCADE;"))
        await session.commit()
    print("PostgreSQL tables truncated: historical_points (0 rows), alarm_events (0 rows).")

    # 2. Flush Redis live cache
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

    print("SUCCESS: All dummy data purged! Ready for clean CSV/Node-RED injection.")

if __name__ == "__main__":
    asyncio.run(purge())
