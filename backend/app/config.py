import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # General App Config
    app_name: str = "Yokogawa OpreX AHI & DBM Industrial Dashboard"
    env: str = "dev"
    api_prefix: str = "/api/v1"
    host: str = "0.0.0.0"
    port: int = 91
    cors_origins: str = "http://localhost:90,http://127.0.0.1:90,http://localhost:5173,http://127.0.0.1:5173,*"

    # PostgreSQL Database
    pg_host: str = "127.0.0.1"
    pg_port: int = 5432
    pg_user: str = "postgres"
    pg_password: str = "root"
    pg_database: str = "ahi_dbm"

    # Redis Cache & PubSub
    redis_url: str = "redis://127.0.0.1:6379/0"
    redis_channel: str = "ydash:stream"

    # Industrial Ingestion & Simulation
    enable_simulator: bool = True
    seed_initial_data: bool = False
    simulator_interval_sec: float = 1.0
    history_retention_days: int = 30
    default_downsample_points: int = 1200

    # Yokogawa OpreX AHI & DBM API settings
    ahi_api_endpoint: str = "https://api.yokogawa.cloud/oprex/ahi/v1"
    ahi_api_key: str = "demo-oprex-ahi-key"
    dbm_api_endpoint: str = "https://api.yokogawa.cloud/oprex/dbm/v1"
    
    # OPC UA Integration (Optional Direct Gateway)
    opcua_endpoint: str = "opc.tcp://127.0.0.1:4840/yokogawa/server"
    opcua_enabled: bool = False

    @property
    def async_db_url(self) -> str:
        return f"postgresql+asyncpg://{self.pg_user}:{self.pg_password}@{self.pg_host}:{self.pg_port}/{self.pg_database}"

    @property
    def sync_db_url(self) -> str:
        return f"postgresql://{self.pg_user}:{self.pg_password}@{self.pg_host}:{self.pg_port}/{self.pg_database}"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
