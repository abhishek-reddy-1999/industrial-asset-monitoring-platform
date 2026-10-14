import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.models import AlarmEvent, AlarmRule

router = APIRouter(prefix="/alarms", tags=["Alarms & Events"])

@router.get("")
async def list_alarms(limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AlarmEvent).order_by(desc(AlarmEvent.triggered_at)).limit(limit))
    events = result.scalars().all()
    if not events:
        return []
    return [
        {
            "id": e.id,
            "tag_name": e.tag_name,
            "severity": e.severity,
            "message": e.message,
            "value": e.value,
            "status": e.status,
            "triggered_at": e.triggered_at.isoformat() + "Z",
            "cleared_at": e.cleared_at.isoformat() + "Z" if e.cleared_at else None
        }
        for e in events
    ]

@router.post("/{alarm_id}/ack")
async def acknowledge_alarm(alarm_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AlarmEvent).where(AlarmEvent.id == alarm_id))
    alarm = result.scalars().first()
    if alarm:
        alarm.status = "ACKNOWLEDGED"
        await db.commit()
    return {"status": "success", "message": f"Alarm {alarm_id} acknowledged"}
