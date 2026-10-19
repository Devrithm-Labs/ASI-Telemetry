import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from config.database import db_connection

logger = logging.getLogger("backend.auth.database")

# In-memory fallback if ClickHouse is temporarily offline
_memory_users: Dict[str, Dict[str, Any]] = {}


def initialize_auth_database() -> None:
    """Initializes the users table in ClickHouse."""
    if not db_connection.is_connected or not db_connection.client:
        logger.warning("ClickHouse not connected during auth init; in-memory auth fallback active.")
        return

    create_table_sql = """
    CREATE TABLE IF NOT EXISTS users (
        id String,
        name String,
        email String,
        password_hash String,
        created_at DateTime64(3, 'UTC')
    ) ENGINE = MergeTree()
    ORDER BY (email, id);
    """
    try:
        db_connection.safe_command(create_table_sql)
        logger.info("ClickHouse users table initialized.")
    except Exception as e:
        logger.error(f"Failed to initialize ClickHouse users table: {e}")


def email_exists(email: str) -> bool:
    """Checks whether an account with the given email already exists."""
    clean_email = email.strip().lower()
    if db_connection.is_connected and db_connection.client:
        try:
            res = db_connection.safe_query(
                "SELECT count(*) FROM users WHERE lower(email) = %(email)s",
                parameters={"email": clean_email},
            )
            return bool(res.result_rows and res.result_rows[0][0] > 0)
        except Exception as e:
            logger.warning(f"ClickHouse query error in email_exists: {e}")

    # Fallback to in-memory store
    return any(u["email"].lower() == clean_email for u in _memory_users.values())


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Retrieves a user record by email address."""
    clean_email = email.strip().lower()
    if db_connection.is_connected and db_connection.client:
        try:
            res = db_connection.safe_query(
                "SELECT id, name, email, password_hash, created_at FROM users WHERE lower(email) = %(email)s LIMIT 1",
                parameters={"email": clean_email},
            )
            if res.result_rows:
                row = res.result_rows[0]
                created_at = row[4].isoformat() if hasattr(row[4], "isoformat") else str(row[4])
                return {
                    "id": str(row[0]),
                    "name": str(row[1]),
                    "email": str(row[2]),
                    "password_hash": str(row[3]),
                    "created_at": created_at,
                }
        except Exception as e:
            logger.warning(f"ClickHouse query error in get_user_by_email: {e}")

    # Fallback to in-memory store
    for u in _memory_users.values():
        if u["email"].lower() == clean_email:
            return dict(u)
    return None


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a user record by ID."""
    clean_id = str(user_id)
    if db_connection.is_connected and db_connection.client:
        try:
            res = db_connection.safe_query(
                "SELECT id, name, email, password_hash, created_at FROM users WHERE id = %(id)s LIMIT 1",
                parameters={"id": clean_id},
            )
            if res.result_rows:
                row = res.result_rows[0]
                created_at = row[4].isoformat() if hasattr(row[4], "isoformat") else str(row[4])
                return {
                    "id": str(row[0]),
                    "name": str(row[1]),
                    "email": str(row[2]),
                    "password_hash": str(row[3]),
                    "created_at": created_at,
                }
        except Exception as e:
            logger.warning(f"ClickHouse query error in get_user_by_id: {e}")

    # Fallback to in-memory store
    if clean_id in _memory_users:
        return dict(_memory_users[clean_id])
    return None


def insert_user(user_id: str, name: str, email: str, password_hash: str, created_at: Optional[datetime] = None) -> None:
    """Inserts a new user record into ClickHouse or memory fallback."""
    clean_id = str(user_id)
    clean_email = email.strip().lower()
    dt = created_at if isinstance(created_at, datetime) else datetime.now(timezone.utc)

    if db_connection.is_connected and db_connection.client:
        try:
            db_connection.safe_insert(
                "users",
                [[clean_id, name, clean_email, password_hash, dt]],
                column_names=["id", "name", "email", "password_hash", "created_at"],
            )
            return
        except Exception as e:
            logger.warning(f"ClickHouse insert error in insert_user: {e}")

    # Fallback to in-memory store
    _memory_users[clean_id] = {
        "id": clean_id,
        "name": name,
        "email": clean_email,
        "password_hash": password_hash,
        "created_at": dt.isoformat(),
    }
