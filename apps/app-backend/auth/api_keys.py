import logging
import secrets
import threading
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from config.database import db_connection
from auth.schemas import ApiKeyResponse, CreateApiKeyRequest

logger = logging.getLogger("backend.auth.api_keys")

# In-memory store and fast lookup cache
_memory_keys: Dict[str, Dict[str, Any]] = {}  # key_id -> record
_key_lookup_cache: Dict[str, Dict[str, Any]] = {}  # raw_key -> {"user_id": ..., "status": ..., "cached_at": ...}
_cache_lock = threading.Lock()
CACHE_TTL_SECONDS = 60


def generate_random_secret_key(environment: str = "production") -> str:
    """Generates a secure, random hexadecimal API key matching the asi_* standard."""
    env = environment.lower()
    prefix = "asi_live" if env == "production" else ("asi_stage" if env == "staging" else "asi_dev")
    token_hex = secrets.token_hex(16)  # 32 hex characters
    return f"{prefix}_{token_hex}"


def mask_key(full_key: str) -> str:
    """Creates a masked preview of an API key, e.g. asi_live_a1b2••••••••c3d4."""
    if len(full_key) <= 12:
        return full_key
    return f"{full_key[:10]}••••••••{full_key[-4:]}"


def create_api_key(user_id: str, payload: Optional[CreateApiKeyRequest] = None) -> ApiKeyResponse:
    """Creates a new API key for a user and stores it in ClickHouse."""
    p = payload or CreateApiKeyRequest()
    key_id = f"key_{int(time.time() * 1000)}"
    full_key = generate_random_secret_key(p.environment)
    key_prefix = mask_key(full_key)
    now = datetime.now(timezone.utc)
    env = (p.environment or "production").lower()
    perms = p.permissions if p.permissions else ["telemetry:write", "telemetry:read"]
    rate_limit = p.rate_limit or "25,000 req/min"
    expires = p.expires_at or "90 days"
    status = "active"

    if db_connection.is_connected and db_connection.client:
        try:
            db_connection.safe_insert(
                "api_keys",
                [[
                    key_id,
                    str(user_id),
                    p.name or f"{env.capitalize()} Key",
                    key_prefix,
                    full_key,
                    env,
                    perms,
                    rate_limit,
                    status,
                    now,
                    None,
                    expires,
                ]],
                column_names=[
                    "id", "user_id", "name", "key_prefix", "full_key",
                    "environment", "permissions", "rate_limit", "status",
                    "created_at", "last_used_at", "expires_at"
                ],
            )
        except Exception as e:
            logger.warning(f"Error inserting API key into ClickHouse: {e}")

    # Memory fallback / caching
    key_data = {
        "id": key_id,
        "user_id": str(user_id),
        "name": p.name or f"{env.capitalize()} Key",
        "key_prefix": key_prefix,
        "full_key": full_key,
        "environment": env,
        "permissions": perms,
        "rate_limit": rate_limit,
        "status": status,
        "created_at": now.isoformat(),
        "last_used_at": None,
        "expires_at": expires,
    }
    _memory_keys[key_id] = key_data

    with _cache_lock:
        _key_lookup_cache[full_key] = {
            "user_id": str(user_id),
            "status": status,
            "cached_at": time.time(),
        }

    return ApiKeyResponse(
        id=key_id,
        user_id=str(user_id),
        name=key_data["name"],
        key_prefix=key_prefix,
        full_key=full_key,
        environment=env,
        permissions=perms,
        rate_limit=rate_limit,
        status=status,
        created_at=now.isoformat(),
        last_used_at=None,
        expires_at=expires,
    )


def list_api_keys(user_id: str) -> List[ApiKeyResponse]:
    """Retrieves all API keys associated with a user."""
    user_id_str = str(user_id)
    items: List[ApiKeyResponse] = []

    if db_connection.is_connected and db_connection.client:
        try:
            sql = """
            SELECT id, user_id, name, key_prefix, environment, permissions,
                   rate_limit, status, created_at, last_used_at, expires_at
            FROM api_keys
            WHERE user_id = %(user_id)s
            ORDER BY created_at DESC
            """
            res = db_connection.safe_query(sql, parameters={"user_id": user_id_str})
            for row in res.result_rows:
                created_at = row[8].isoformat() if hasattr(row[8], "isoformat") else str(row[8])
                last_used = row[9].isoformat() if hasattr(row[9], "isoformat") and row[9] else (str(row[9]) if row[9] else None)
                items.append(
                    ApiKeyResponse(
                        id=str(row[0]),
                        user_id=str(row[1]),
                        name=str(row[2]),
                        key_prefix=str(row[3]),
                        full_key=None,  # Do not expose full key on listing
                        environment=str(row[4]),
                        permissions=list(row[5]) if row[5] else [],
                        rate_limit=str(row[6]),
                        status=str(row[7]),
                        created_at=created_at,
                        last_used_at=last_used,
                        expires_at=str(row[10]) if row[10] else None,
                    )
                )
            if items:
                return items
        except Exception as e:
            logger.warning(f"Error querying API keys from ClickHouse: {e}")

    # Fallback to memory
    for k in _memory_keys.values():
        if k["user_id"] == user_id_str:
            items.append(
                ApiKeyResponse(
                    id=k["id"],
                    user_id=k["user_id"],
                    name=k["name"],
                    key_prefix=k["key_prefix"],
                    full_key=None,
                    environment=k["environment"],
                    permissions=k.get("permissions", []),
                    rate_limit=k.get("rate_limit", "25,000 req/min"),
                    status=k.get("status", "active"),
                    created_at=k["created_at"],
                    last_used_at=k.get("last_used_at"),
                    expires_at=k.get("expires_at"),
                )
            )
    return items


def revoke_api_key(user_id: str, key_id: str) -> bool:
    """Revokes an API key belonging to a user."""
    user_id_str = str(user_id)
    key_id_str = str(key_id)

    if db_connection.is_connected and db_connection.client:
        try:
            db_connection.safe_command(
                f"ALTER TABLE api_keys UPDATE status = 'revoked' WHERE id = '{key_id_str}' AND user_id = '{user_id_str}'"
            )
        except Exception as e:
            logger.warning(f"Error revoking API key in ClickHouse: {e}")

    if key_id_str in _memory_keys and _memory_keys[key_id_str]["user_id"] == user_id_str:
        _memory_keys[key_id_str]["status"] = "revoked"
        full = _memory_keys[key_id_str].get("full_key")
        if full:
            with _cache_lock:
                _key_lookup_cache.pop(full, None)
        return True

    # Evict cache entries
    with _cache_lock:
        _key_lookup_cache.clear()

    return True


def resolve_api_key(raw_key: str) -> Optional[str]:
    """
    Validates an API key and returns the corresponding user_id.
    Includes in-memory caching to avoid database overhead on high-throughput telemetry.
    """
    if not raw_key or not isinstance(raw_key, str):
        return None

    clean_key = raw_key.strip()
    if clean_key.startswith("Bearer "):
        clean_key = clean_key.replace("Bearer ", "").strip()

    now = time.time()
    with _cache_lock:
        cached = _key_lookup_cache.get(clean_key)
        if cached and (now - cached["cached_at"]) < CACHE_TTL_SECONDS:
            if cached.get("status") == "active":
                return cached.get("user_id")
            return None

    if db_connection.is_connected and db_connection.client:
        try:
            sql = """
            SELECT user_id, status FROM api_keys
            WHERE full_key = %(key)s
            LIMIT 1
            """
            res = db_connection.safe_query(sql, parameters={"key": clean_key})
            if res.result_rows:
                u_id, status = str(res.result_rows[0][0]), str(res.result_rows[0][1])
                with _cache_lock:
                    _key_lookup_cache[clean_key] = {
                        "user_id": u_id,
                        "status": status,
                        "cached_at": now,
                    }
                if status == "active":
                    # Asynchronously touch last_used_at
                    def _touch():
                        try:
                            db_connection.safe_command(
                                f"ALTER TABLE api_keys UPDATE last_used_at = now() WHERE full_key = '{clean_key}'"
                            )
                        except Exception:
                            pass
                    threading.Thread(target=_touch, daemon=True).start()
                    return u_id
                return None
        except Exception as e:
            logger.warning(f"Error verifying API key in ClickHouse: {e}")

    # Fallback to memory
    for k in _memory_keys.values():
        if k.get("full_key") == clean_key and k.get("status") == "active":
            return k["user_id"]

    return None
