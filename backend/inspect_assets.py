import asyncio
from app.db.database import AsyncSessionLocal
from app.db.models import AssetNode
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(AssetNode))
        nodes = res.scalars().all()
        for n in nodes:
            print(f"ID={n.id}, Name={n.name}, Level={n.level}, Path={repr(n.path)}")

if __name__ == "__main__":
    asyncio.run(main())
