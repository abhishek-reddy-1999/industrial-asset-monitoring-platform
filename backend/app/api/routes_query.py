import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.models import HistoricalPoint, Tag
from app.services.downsampler import lttb_downsample
from app.cache.redis_service import redis_service

router = APIRouter(prefix="/query", tags=["Time-Series Query Engine"])

def parse_relative_time(expr: str) -> datetime.datetime:
    now = datetime.datetime.utcnow()
    if expr == "now":
        return now
    if expr.startswith("now-"):
        unit = expr[-1]
        val = int(expr[4:-1])
        if unit == "m":
            return now - datetime.timedelta(minutes=val)
        elif unit == "h":
            return now - datetime.timedelta(hours=val)
        elif unit == "d":
            return now - datetime.timedelta(days=val)
        elif unit == "s":
            return now - datetime.timedelta(seconds=val)
    try:
        return datetime.datetime.fromisoformat(expr.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return now - datetime.timedelta(minutes=15)

@router.get("/timeseries")
async def query_timeseries(
    tags: str = Query(..., description="Comma-separated list of tag names (e.g. TIC_101.PV,PIC_101.PV)"),
    time_from: str = Query("now-15m", description="Start time (e.g. now-15m or ISO format)"),
    time_to: str = Query("now", description="End time (e.g. now or ISO format)"),
    max_points: int = Query(1200, description="Max downsampled points to return per series"),
    db: AsyncSession = Depends(get_db)
):
    tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    if not tag_list:
        raise HTTPException(status_code=400, detail="No tags specified")

    start_dt = parse_relative_time(time_from)
    end_dt = parse_relative_time(time_to)

    # Fetch tag metadata for engineering units
    tag_meta_res = await db.execute(select(Tag).where(Tag.tag_name.in_(tag_list)))
    tag_meta_map = {t.tag_name: t for t in tag_meta_res.scalars().all()}

    series_data = []

    for tag_name in tag_list:
        meta = tag_meta_map.get(tag_name)
        units = meta.eng_units if meta else ""
        display_name = meta.display_name if meta else tag_name

        query = (
            select(HistoricalPoint)
            .where(
                and_(
                    HistoricalPoint.tag_name == tag_name,
                    HistoricalPoint.timestamp >= start_dt,
                    HistoricalPoint.timestamp <= end_dt
                )
            )
            .order_by(HistoricalPoint.timestamp.asc())
        )
        result = await db.execute(query)
        points = result.scalars().all()

        formatted_points = [
            {
                "timestamp": p.timestamp.isoformat() + "Z",
                "ts_ms": int(p.timestamp.timestamp() * 1000),
                "value": p.value,
                "quality": p.quality
            }
            for p in points
        ]

        # Apply LTTB downsampling if points exceed limit
        if len(formatted_points) > max_points:
            downsampled = lttb_downsample(formatted_points, max_points)
        else:
            downsampled = formatted_points

        values_only = [p["value"] for p in formatted_points if p["value"] is not None]
        stats = {
            "min": round(min(values_only), 2) if values_only else 0,
            "max": round(max(values_only), 2) if values_only else 0,
            "avg": round(sum(values_only) / len(values_only), 2) if values_only else 0,
            "last": round(values_only[-1], 2) if values_only else 0,
            "count": len(formatted_points)
        }

        series_data.append({
            "tag_name": tag_name,
            "display_name": display_name,
            "eng_units": units,
            "stats": stats,
            "datapoints": downsampled
        })

    return {
        "from": start_dt.isoformat() + "Z",
        "to": end_dt.isoformat() + "Z",
        "series": series_data
    }

from fastapi.responses import PlainTextResponse

@router.get("/export", response_class=PlainTextResponse)
async def export_timeseries_csv(
    tags: str = Query(..., description="Comma-separated tag list"),
    time_from: str = Query("now-1h"),
    time_to: str = Query("now"),
    db: AsyncSession = Depends(get_db)
):
    tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    start_dt = parse_relative_time(time_from)
    end_dt = parse_relative_time(time_to)

    query = (
        select(HistoricalPoint)
        .where(
            and_(
                HistoricalPoint.tag_name.in_(tag_list),
                HistoricalPoint.timestamp >= start_dt,
                HistoricalPoint.timestamp <= end_dt
            )
        )
        .order_by(HistoricalPoint.timestamp.asc())
    )
    result = await db.execute(query)
    points = result.scalars().all()

    csv_lines = ["Timestamp_UTC,TagName,Value,Quality"]
    for p in points:
        val_str = str(p.value) if p.value is not None else ""
        csv_lines.append(f"{p.timestamp.isoformat()}Z,{p.tag_name},{val_str},{p.quality}")

    return "\n".join(csv_lines)
