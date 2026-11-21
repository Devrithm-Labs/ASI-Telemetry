"""Compatibility shim for database connection and manager."""
from core.database import (
    DatabaseManager,
    PostgresConnection,
    Base,
    db_connection,
    session_scope,
    get_db,
)

__all__ = [
    "DatabaseManager",
    "PostgresConnection",
    "Base",
    "db_connection",
    "session_scope",
    "get_db",
]
