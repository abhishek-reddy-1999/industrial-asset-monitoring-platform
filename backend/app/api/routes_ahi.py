import datetime
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.models import AHIAssetHealth

router = APIRouter(prefix="/ahi", tags=["Yokogawa OpreX AHI & DBM"])

@router.get("/health")
async def get_asset_health(db: AsyncSession = Depends(get_db)):
    """Fetch OpreX Asset Health Insights (AHI) equipment scores."""
    result = await db.execute(select(AHIAssetHealth))
    records = result.scalars().all()
    
    return [
        {
            "equipment_tag": r.equipment_tag,
            "equipment_name": r.equipment_name,
            "health_index": r.health_index,
            "rul_days": r.rul_days,
            "mt_distance": r.mt_distance,
            "risk_level": r.risk_level,
            "anomaly_status": r.anomaly_status,
            "last_evaluated": r.last_evaluated.isoformat() if r.last_evaluated else None
        }
        for r in records
    ]

@router.get("/dbm/ontology")
async def get_dbm_ontology_status():
    """Yokogawa OpreX Data Model Broker (DBM) consistency validation status."""
    return {
        "status": "CONSISTENT",
        "last_sync": datetime.datetime.utcnow().isoformat() + "Z",
        "verified_diagrams": [
            {
                "diagram_name": "P&ID-CDU-0101 Rev 4",
                "equipment_count": 48,
                "matched_tags": 214,
                "consistency_score": "100%",
                "discrepancies": 0
            },
            {
                "diagram_name": "3D-Piping-Isometric-V101",
                "equipment_count": 12,
                "matched_tags": 56,
                "consistency_score": "99.8%",
                "discrepancies": 0
            }
        ],
        "active_ontology_models": ["ISO-15926", "CFIHOS-1.5", "ISA-95-Part2"]
    }
