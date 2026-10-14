"""
Unified Value Envelope & Quality Model for Yokogawa Industrial Data Platform.
Supports: STATIC, DYNAMIC, RUNTIME, ALIAS, INTEGRATION, COMMAND.
Data Qualities: GOOD, BAD, UNCERTAIN, STALE, MISSING.
"""
import datetime
from typing import Any, Dict, Optional, Literal
from pydantic import BaseModel, Field

QualityState = Literal["GOOD", "BAD", "UNCERTAIN", "STALE", "MISSING"]
AttributeType = Literal["STATIC", "DYNAMIC", "RUNTIME", "ALIAS", "INTEGRATION", "COMMAND"]

class UnifiedValueEnvelope(BaseModel):
    asset_id: str = Field(..., description="Stable asset identifier")
    attribute_id: str = Field(..., description="Stable attribute identifier")
    name: str = Field(..., description="Attribute name")
    value: Any = Field(None, description="Current value (numeric, string, bool, dict)")
    data_type: str = Field("float", description="Data type: float, int, string, boolean, json")
    unit: str = Field("", description="Engineering unit of measurement")
    quality: QualityState = Field("GOOD", description="Industrial data quality state")
    source_timestamp: str = Field(..., description="Source measurement ISO timestamp (UTC)")
    ingestion_timestamp: str = Field(..., description="Ingestion into platform ISO timestamp (UTC)")
    attribute_type: AttributeType = Field("DYNAMIC", description="Conceptual attribute origin")
    raw_tag: Optional[str] = Field(None, description="Underlying DCS/device tag name")
    device_id: Optional[str] = Field(None, description="Source device ID if dynamic")

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump()

    @classmethod
    def create(
        cls,
        asset_id: str,
        attribute_id: str,
        name: str,
        value: Any,
        data_type: str = "float",
        unit: str = "",
        quality: QualityState = "GOOD",
        source_ts: Optional[datetime.datetime] = None,
        attr_type: AttributeType = "DYNAMIC",
        raw_tag: Optional[str] = None,
        device_id: Optional[str] = None
    ) -> "UnifiedValueEnvelope":
        now = datetime.datetime.utcnow()
        s_ts = (source_ts or now).isoformat() + "Z"
        i_ts = now.isoformat() + "Z"
        
        # Cast value safely if float
        norm_val = value
        if data_type.lower() in ["float", "double"] and value is not None:
            try:
                norm_val = float(value)
            except (ValueError, TypeError):
                pass
        elif data_type.lower() in ["int", "integer"] and value is not None:
            try:
                norm_val = int(value)
            except (ValueError, TypeError):
                pass

        return cls(
            asset_id=asset_id,
            attribute_id=attribute_id,
            name=name,
            value=norm_val,
            data_type=data_type,
            unit=unit,
            quality=quality,
            source_timestamp=s_ts,
            ingestion_timestamp=i_ts,
            attribute_type=attr_type,
            raw_tag=raw_tag,
            device_id=device_id
        )

def assess_quality(
    value: Any,
    last_update_ts: Optional[str],
    scan_rate_ms: int = 1000,
    min_range: Optional[float] = None,
    max_range: Optional[float] = None
) -> QualityState:
    """
    Evaluates data quality based on freshness, sensor range, and nullability.
    """
    if value is None:
        return "MISSING"

    # Range validation for numeric values
    if isinstance(value, (int, float)):
        if min_range is not None and value < min_range:
            return "BAD"
        if max_range is not None and value > max_range:
            return "BAD"

    # Freshness evaluation (stale if older than 3x scan rate or > 30s)
    if last_update_ts:
        try:
            clean_ts = last_update_ts.replace("Z", "+00:00")
            dt = datetime.datetime.fromisoformat(clean_ts)
            if dt.tzinfo:
                now = datetime.datetime.now(datetime.timezone.utc)
                age_ms = (now - dt).total_seconds() * 1000
            else:
                now = datetime.datetime.utcnow()
                age_ms = (now - dt).total_seconds() * 1000

            max_allowed_ms = max(scan_rate_ms * 3, 10000)
            if age_ms > max_allowed_ms:
                return "STALE"
        except Exception:
            pass

    return "GOOD"
