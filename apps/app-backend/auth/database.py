"""Compatibility shim for auth database."""
import logging
from typing import Any, Dict, Optional
from core.database import db_connection
from models import initialize_schema, UserModel
from services.auth_service import email_exists

logger = logging.getLogger("backend.auth.database")


def initialize_auth_database() -> None:
    """Initializes authentication tables in PostgreSQL via SQLAlchemy ORM."""
    if db_connection.is_connected and db_connection.engine:
        try:
            initialize_schema(db_connection)
            logger.info("PostgreSQL auth tables initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize PostgreSQL auth tables: {e}")
    else:
        logger.warning("PostgreSQL not connected during auth init; in-memory auth fallback active.")


__all__ = [
    "initialize_auth_database",
    "email_exists",
]
