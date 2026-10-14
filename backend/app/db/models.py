import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, Index, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.db.database import Base

class AssetNode(Base):
    __tablename__ = "asset_nodes"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("asset_nodes.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(100), nullable=False)
    level = Column(String(50), nullable=False)  # ENTERPRISE, SITE, AREA, UNIT, EQUIPMENT
    path = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)

    parent = relationship("AssetNode", remote_side=[id], backref="children")
    tags = relationship("Tag", back_populates="asset", cascade="all, delete-orphan")

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("asset_nodes.id", ondelete="CASCADE"), nullable=True)
    tag_name = Column(String(100), nullable=False, unique=True, index=True)  # e.g. TIC_101.PV
    display_name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    eng_units = Column(String(50), nullable=True)  # °C, kPa, m3/h, %, mm/s
    data_type = Column(String(30), default="Float")  # Float, Boolean, Integer, String
    min_range = Column(Float, default=0.0)
    max_range = Column(Float, default=100.0)
    source_type = Column(String(50), default="CENTUM_VP")  # CENTUM_VP, EXAQUANTUM, AHI_ANOMALY, DBM_ONTOLOGY, OPC_UA
    scan_rate_ms = Column(Integer, default=1000)
    is_active = Column(Boolean, default=True)

    asset = relationship("AssetNode", back_populates="tags")

class HistoricalPoint(Base):
    __tablename__ = "historical_points"

    id = Column(Integer, primary_key=True, index=True)
    tag_name = Column(String(100), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    value = Column(Float, nullable=True)
    quality = Column(String(20), default="GOOD")  # GOOD, BAD, UNCERTAIN

    __table_args__ = (
        Index("idx_tag_timestamp", "tag_name", "timestamp"),
    )

class Dashboard(Base):
    __tablename__ = "dashboards"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), default="Process Monitoring")
    time_range = Column(String(50), default="now-15m")  # e.g. now-15m, now-1h, now-24h
    refresh_interval = Column(String(20), default="1s")  # 1s, 5s, 10s, 30s, off
    layout = Column(Text, nullable=False)  # JSON serialized layout & panel configs
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class AlarmRule(Base):
    __tablename__ = "alarm_rules"

    id = Column(Integer, primary_key=True, index=True)
    tag_name = Column(String(100), nullable=False)
    condition = Column(String(20), nullable=False)  # GT (>), LT (<), GTE, LTE, EQ
    threshold = Column(Float, nullable=False)
    severity = Column(String(20), default="WARNING")  # INFO, WARNING, CRITICAL, EMERGENCY
    message = Column(String(255), nullable=False)
    enabled = Column(Boolean, default=True)

class AlarmEvent(Base):
    __tablename__ = "alarm_events"

    id = Column(Integer, primary_key=True, index=True)
    tag_name = Column(String(100), nullable=False, index=True)
    severity = Column(String(20), nullable=False)
    message = Column(String(255), nullable=False)
    value = Column(Float, nullable=False)
    status = Column(String(20), default="ACTIVE")  # ACTIVE, ACKNOWLEDGED, CLEARED
    triggered_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    cleared_at = Column(DateTime, nullable=True)

class AHIAssetHealth(Base):
    __tablename__ = "ahi_asset_health"

    id = Column(Integer, primary_key=True, index=True)
    equipment_tag = Column(String(100), nullable=False, unique=True, index=True)
    equipment_name = Column(String(150), nullable=False)
    health_index = Column(Float, default=95.0)  # 0 to 100%
    rul_days = Column(Integer, default=320)  # Remaining Useful Life
    mt_distance = Column(Float, default=1.12)  # Mahalanobis-Taguchi distance
    risk_level = Column(String(30), default="NORMAL")  # NORMAL, WATCH, CRITICAL
    anomaly_status = Column(String(50), default="Optimal Operational Envelope")
    last_evaluated = Column(DateTime, default=datetime.datetime.utcnow)

# ==========================================
# Yokogawa Data Management (DM) Models
# ==========================================

class FunctionBlockTemplate(Base):
    __tablename__ = "dm_function_block_templates"

    id = Column(Integer, primary_key=True, index=True)
    template_code = Column(String(50), unique=True, nullable=False)
    name = Column(String(150), nullable=False)
    category = Column(String(50), default="Analytics")  # Analytics, Calculation, Conversion, Anomaly
    description = Column(Text, nullable=True)
    inputs_schema = Column(Text, nullable=False)   # JSON: array of {name, type, unit, default}
    outputs_schema = Column(Text, nullable=False)  # JSON: array of {name, type, unit}
    formula_code = Column(Text, nullable=False)    # Python or JS logic
    version = Column(String(20), default="v2.0")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class FunctionBlockExecution(Base):
    __tablename__ = "dm_function_block_executions"

    id = Column(Integer, primary_key=True, index=True)
    execution_name = Column(String(150), nullable=False)
    template_id = Column(Integer, ForeignKey("dm_function_block_templates.id", ondelete="CASCADE"), nullable=False)
    asset_id = Column(Integer, ForeignKey("asset_nodes.id", ondelete="SET NULL"), nullable=True)
    target_tag = Column(String(100), nullable=False)
    schedule_interval = Column(String(30), default="1s")  # 1s, 5s, 10s, 1m, 5m, on_change
    status = Column(String(30), default="ACTIVE")          # ACTIVE, PAUSED, ERROR
    last_run_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_execution_ms = Column(Float, default=12.4)
    last_output_value = Column(Float, nullable=True)
    input_bindings = Column(Text, nullable=False)          # JSON: { input_name: tag_name }
    execution_log = Column(Text, nullable=True)

    template = relationship("FunctionBlockTemplate")
    asset = relationship("AssetNode")

class Device(Base):
    __tablename__ = "dm_devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), unique=True, nullable=False)
    name = Column(String(150), nullable=False)
    model = Column(String(100), nullable=False)            # e.g. Yokogawa EJX110A, YTA610, AXF050, PRM Gateway
    device_type = Column(String(50), default="Transmitter") # Transmitter, Flowmeter, Valve, Gateway, Analyzer
    protocol = Column(String(50), default="HART")          # HART, WirelessHART, Foundation Fieldbus, Modbus TCP, OPC UA
    ip_address = Column(String(50), nullable=True)
    status = Column(String(30), default="ONLINE")          # ONLINE, OFFLINE, MAINTENANCE, WARNING
    firmware_version = Column(String(50), default="FW-4.2.1")
    battery_level = Column(Integer, default=100)           # Percentage (for wireless)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)
    asset_id = Column(Integer, ForeignKey("asset_nodes.id", ondelete="SET NULL"), nullable=True)

    asset = relationship("AssetNode")

class BrokerConfig(Base):
    __tablename__ = "dm_brokers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    broker_type = Column(String(50), nullable=False)       # DBM_ONTOLOGY, OPC_UA, MQTT, REDIS_STREAM, REST_INGEST
    endpoint_url = Column(String(255), nullable=False)
    port = Column(Integer, nullable=False)
    topic_or_path = Column(String(255), default="/")
    status = Column(String(30), default="CONNECTED")       # CONNECTED, DISCONNECTED, RECONNECTING
    messages_per_sec = Column(Float, default=120.0)
    total_messages = Column(Integer, default=450200)
    last_sync = Column(DateTime, default=datetime.datetime.utcnow)

class ActivityLog(Base):
    __tablename__ = "dm_activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    category = Column(String(50), default="ASSET")         # ASSET, BLOCK, DEVICE, BROKER, ALARM, SECURITY
    action = Column(String(100), nullable=False)
    user = Column(String(100), default="engineer@yokogawa.com")
    details = Column(Text, nullable=True)
    status = Column(String(30), default="SUCCESS")         # SUCCESS, WARNING, FAILURE

