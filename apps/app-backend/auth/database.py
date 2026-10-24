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
    create_tokens_sql = """
    CREATE TABLE IF NOT EXISTS refresh_tokens (
        id String,
        user_id String,
        token_hash String,
        family_id String,
        created_at DateTime64(3, 'UTC'),
        expires_at DateTime64(3, 'UTC'),
        revoked_at Nullable(DateTime64(3, 'UTC')),
        replaced_by_hash Nullable(String)
    ) ENGINE = MergeTree()
    ORDER BY (token_hash, user_id);
    """
    try:
        db_connection.safe_command(create_table_sql)
        db_connection.safe_command(create_tokens_sql)
        logger.info("ClickHouse users and refresh_tokens tables initialized.")
    except Exception as e:
        logger.error(f"Failed to initialize ClickHouse auth tables: {e}")



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
        "google_id": None,
    }


# In-memory storage for refresh tokens: token_hash -> record
_memory_refresh_tokens: Dict[str, Dict[str, Any]] = {}
import threading
_tokens_lock = threading.Lock()


def insert_refresh_token(
    token_id: str,
    user_id: str,
    token_hash: str,
    family_id: str,
    expires_at: datetime,
) -> None:
    """Stores a hashed refresh token in ClickHouse or memory fallback."""
    now = datetime.now(timezone.utc)
    record = {
        "id": str(token_id),
        "user_id": str(user_id),
        "token_hash": str(token_hash),
        "family_id": str(family_id),
        "created_at": now,
        "expires_at": expires_at,
        "revoked_at": None,
        "replaced_by_hash": None,
    }

    with _tokens_lock:
        _memory_refresh_tokens[str(token_hash)] = dict(record)

    if db_connection.is_connected and db_connection.client:
        try:
            db_connection.safe_insert(
                "refresh_tokens",
                [[
                    record["id"],
                    record["user_id"],
                    record["token_hash"],
                    record["family_id"],
                    record["created_at"],
                    record["expires_at"],
                    None,
                    None,
                ]],
                column_names=[
                    "id", "user_id", "token_hash", "family_id",
                    "created_at", "expires_at", "revoked_at", "replaced_by_hash",
                ],
            )
        except Exception as e:
            logger.warning(f"ClickHouse insert error in insert_refresh_token: {e}")


def get_refresh_token_record(token_hash: str) -> Optional[Dict[str, Any]]:
    """Retrieves a refresh token record by its SHA-256 hash."""
    clean_hash = str(token_hash).strip()
    with _tokens_lock:
        if clean_hash in _memory_refresh_tokens:
            return dict(_memory_refresh_tokens[clean_hash])

    if db_connection.is_connected and db_connection.client:
        try:
            res = db_connection.safe_query(
                "SELECT id, user_id, token_hash, family_id, created_at, expires_at, revoked_at, replaced_by_hash "
                "FROM refresh_tokens WHERE token_hash = %(hash)s LIMIT 1",
                parameters={"hash": clean_hash},
            )
            if res.result_rows:
                row = res.result_rows[0]
                rec = {
                    "id": str(row[0]),
                    "user_id": str(row[1]),
                    "token_hash": str(row[2]),
                    "family_id": str(row[3]),
                    "created_at": row[4],
                    "expires_at": row[5],
                    "revoked_at": row[6],
                    "replaced_by_hash": str(row[7]) if row[7] else None,
                }
                with _tokens_lock:
                    _memory_refresh_tokens[clean_hash] = rec
                return rec
        except Exception as e:
            logger.warning(f"ClickHouse query error in get_refresh_token_record: {e}")

    return None


def revoke_refresh_token(token_hash: str, replaced_by_hash: Optional[str] = None) -> bool:
    """Marks an individual refresh token as revoked."""
    clean_hash = str(token_hash).strip()
    now = datetime.now(timezone.utc)
    found = False

    with _tokens_lock:
        if clean_hash in _memory_refresh_tokens:
            _memory_refresh_tokens[clean_hash]["revoked_at"] = now
            if replaced_by_hash:
                _memory_refresh_tokens[clean_hash]["replaced_by_hash"] = str(replaced_by_hash)
            found = True

    return found


def revoke_token_family(family_id: str) -> int:
    """Revokes all refresh tokens belonging to a family (triggered upon token reuse detection)."""
    clean_fam = str(family_id).strip()
    now = datetime.now(timezone.utc)
    count = 0

    with _tokens_lock:
        for rec in _memory_refresh_tokens.values():
            if rec.get("family_id") == clean_fam and not rec.get("revoked_at"):
                rec["revoked_at"] = now
                count += 1

    logger.warning("Revoked %d tokens in family %s due to reuse detection or session revocation", count, clean_fam)
    return count


def revoke_all_user_tokens(user_id: str) -> int:
    """Revokes all active refresh tokens for a user upon global logout."""
    clean_uid = str(user_id).strip()
    now = datetime.now(timezone.utc)
    count = 0

    with _tokens_lock:
        for rec in _memory_refresh_tokens.values():
            if str(rec.get("user_id")) == clean_uid and not rec.get("revoked_at"):
                rec["revoked_at"] = now
                count += 1

    return count


def get_or_create_google_user(google_id: str, email: str, name: str) -> Dict[str, Any]:
    """
    Finds or creates a user account securely verified by Google OpenID Connect.
    Prevents account collision while honoring existing user records.
    """
    clean_email = email.strip().lower()
    existing_user = get_user_by_email(clean_email)
    now = datetime.now(timezone.utc)

    if existing_user:
        # User already exists; update google_id linkage in memory
        existing_user["google_id"] = google_id
        if clean_email in _memory_users:
            _memory_users[clean_email]["google_id"] = google_id
        return existing_user

    # Create new OAuth user with unguessable random password hash
    import secrets
    from auth.security import hash_password
    import uuid

    new_id = str(uuid.uuid4())
    random_pw = secrets.token_hex(32)
    pw_hash = hash_password(random_pw)

    insert_user(
        user_id=new_id,
        name=name or clean_email.split("@")[0],
        email=clean_email,
        password_hash=pw_hash,
        created_at=now,
    )

    created = {
        "id": new_id,
        "name": name or clean_email.split("@")[0],
        "email": clean_email,
        "password_hash": pw_hash,
        "created_at": now.isoformat(),
        "google_id": google_id,
    }
    with _tokens_lock:
        _memory_users[new_id] = created
    return created

