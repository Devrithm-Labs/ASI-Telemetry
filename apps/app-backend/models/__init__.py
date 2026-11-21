import logging
from typing import Optional

from core.database import Base, DatabaseManager, db_connection
from models.api_key import ApiKeyModel
from models.llm import LLMTraceModel
from models.telemetry import TelemetryMetricModel
from models.user import OAuthSessionModel, RefreshTokenModel, UserModel

logger = logging.getLogger("backend.models")


def initialize_schema(conn: Optional[DatabaseManager] = None):
    """Initializes and creates all PostgreSQL tables via SQLAlchemy ORM."""
    target_conn = conn or db_connection
    if target_conn and target_conn.engine:
        try:
            Base.metadata.create_all(bind=target_conn.engine)
            logger.info("PostgreSQL SQLAlchemy schema initialized successfully.")
        except Exception as e:
            logger.warning(f"Error initializing PostgreSQL schema via SQLAlchemy: {e}")


__all__ = [
    "Base",
    "TelemetryMetricModel",
    "LLMTraceModel",
    "ApiKeyModel",
    "UserModel",
    "RefreshTokenModel",
    "OAuthSessionModel",
    "initialize_schema",
]
