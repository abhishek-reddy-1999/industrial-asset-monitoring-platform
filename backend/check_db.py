import asyncio
from app.db.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"))
        tables = [r[0] for r in res.fetchall()]
        print("--- Table Counts ---")
        for t in tables:
            try:
                cnt = await session.execute(text(f'SELECT count(*) FROM "{t}";'))
                print(f"{t}: {cnt.scalar()} rows")
            except Exception as e:
                print(f"{t}: error {e}")

if __name__ == "__main__":
    asyncio.run(check())
