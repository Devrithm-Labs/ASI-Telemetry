import json
import logging
import secrets
import threading
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from core.database import db_connection
from core.security import hash_token
from models.api_key import ApiKeyModel
from schemas.api_key import ApiKeyResponse, CreateApiKeyRequest

logger = logging.getLogger("backend.services.api_key")

_memory_keys: Dict[str, Dict[str, Any]] = {}
_key_lookup_cache: Dict[str, Dict[str, Any]] = {}
_cache_lock = threading.Lock()
CACHE_TTL_SECONDS = 60


def generate_random_secret_key(environment: str = "production") -> str:
    """Generates a secure, random hexadecimal API key matching the asi_* standard."""
    env = environment.lower()
    prefix = "asi_live" if env == "production" else ("asi_stage" if env == "staging" else "asi_dev")
    token_hex = secrets.token_hex(16)
    return f"{prefix}_{token_hex}"


def mask_key(full_key: str) -> str:
    """Creates a masked preview of an API key, e.g. asi_live_a1b2••••••••c3d4."""
    if len(full_key) <= 12:
        return full_key
    return f"{full_key[:10]}••••••••{full_key[-4:]}"


def create_api_key(user_id: str, payload: Optional[CreateApiKeyRequest] = None) -> ApiKeyResponse:
    """Creates a new API key for a user and stores it in PostgreSQL via SQLAlchemy."""
    p = payload or CreateApiKeyRequest()
    key_id = f"key_{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    full_key = generate_random_secret_key(p.environment)
    key_prefix = mask_key(full_key)
    now = datetime.now(timezone.utc)
    env = (p.environment or "production").lower()
    perms = p.permissions if p.permissions else ["telemetry:write", "telemetry:read"]
    rate_limit = p.rate_limit or "25,000 req/min"
    expires = p.expires_at or "90 days"
    status = "active"

    if db_connection.is_connected and db_connection.SessionFactory:
        try:
            with db_connection.session_scope() as session:
                if session:
                    key_model = ApiKeyModel(
                        id=key_id,
                        user_id=str(user_id),
                        name=p.name or f"{env.capitalize()} Key",
                        key_prefix=key_prefix,
                        full_key=full_key,
                        environment=env,
                        permissions=json.dumps(perms),
                        rate_limit=rate_limit,
                        status=status,
                        created_at=now,
                        last_used_at=None,
                        expires_at=expires,
                    )
                    session.add(key_model)
        except Exception as e:
            logger.warning(f"Error inserting API key into PostgreSQL: {e}")

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
    """Retrieves all API keys associated with a user from PostgreSQL or memory."""
    user_id_str = str(user_id)
    items: List[ApiKeyResponse] = []

    if db_connection.is_connected and db_connection.SessionFactory:
        try:
            with db_connection.session_scope() as session:
                if session:
                    records = session.query(ApiKeyModel).filter(
                        ApiKeyModel.user_id == user_id_str
                    ).order_by(ApiKeyModel.created_at.desc()).all()

                    for row in records:
                        created_at = row.created_at.isoformat() if row.created_at else ""
                        last_used = row.last_used_at.isoformat() if row.last_used_at else None
                        items.append(
                            ApiKeyResponse(
                                id=str(row.id),
                                user_id=str(row.user_id),
                                name=str(row.name),
                                key_prefix=str(row.key_prefix),
                                full_key=None,
                                environment=str(row.environment),
                                permissions=row.get_permissions_list(),
                                rate_limit=str(row.rate_limit),
                                status=str(row.status),
                                created_at=created_at,
                                last_used_at=last_used,
                                expires_at=str(row.expires_at) if row.expires_at else None,
                            )
                        )
            if items:
                return items
        except Exception as e:
            logger.warning(f"Error querying API keys from PostgreSQL: {e}")

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

    if db_connection.is_connected and db_connection.SessionFactory:
        try:
            with db_connection.session_scope() as session:
                if session:
                    session.query(ApiKeyModel).filter(
                        ApiKeyModel.id == key_id_str,
                        ApiKeyModel.user_id == user_id_str,
                    ).update({"status": "revoked"}, synchronize_session=False)
        except Exception as e:
            logger.warning(f"Error revoking API key in PostgreSQL: {e}")

    if key_id_str in _memory_keys and _memory_keys[key_id_str]["user_id"] == user_id_str:
        _memory_keys[key_id_str]["status"] = "revoked"
        full = _memory_keys[key_id_str].get("full_key")
        if full:
            with _cache_lock:
                _key_lookup_cache.pop(full, None)
        return True

    with _cache_lock:
        _key_lookup_cache.clear()

    return True


def resolve_api_key(raw_key: str) -> Optional[str]:
    """Validates an API key and returns the corresponding user_id."""
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

    if db_connection.is_connected and db_connection.SessionFactory:
        try:
            with db_connection.session_scope() as session:
                if session:
                    k_record = session.query(ApiKeyModel).filter(
                        ApiKeyModel.full_key == clean_key
                    ).first()
                    if k_record:
                        u_id, status = str(k_record.user_id), str(k_record.status)
                        with _cache_lock:
                            _key_lookup_cache[clean_key] = {
                                "user_id": u_id,
                                "status": status,
                                "cached_at": now,
                            }
                        if status == "active":
                            def _touch():
                                try:
                                    with db_connection.session_scope() as s:
                                        if s:
                                            s.query(ApiKeyModel).filter(
                                                ApiKeyModel.full_key == clean_key
                                            ).update(
                                                {"last_used_at": datetime.now(timezone.utc)},
                                                synchronize_session=False,
                                            )
                                except Exception:
                                    pass

                            threading.Thread(target=_touch, daemon=True).start()
                            return u_id
                        return None
        except Exception as e:
            logger.warning(f"Error verifying API key in PostgreSQL: {e}")

    for k in _memory_keys.values():
        if k.get("full_key") == clean_key and k.get("status") == "active":
            return k["user_id"]

    return None


# Compatibility aliases
hash_api_key = hash_token
resolve_user_id_from_api_key = resolve_api_key


def generate_api_key_pair(environment: str = "production"):
    secret = generate_random_secret_key(environment)
    return secret, hash_token(secret), mask_key(secret)

