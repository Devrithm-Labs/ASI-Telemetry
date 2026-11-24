import json
import logging
import secrets
import threading
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.security import hash_token
from app.models.api_key import ApiKeyModel
from app.repositories.api_key import ApiKeyRepository, api_key_repo
from app.schemas.api_key import ApiKeyResponse, CreateApiKeyRequest

logger = logging.getLogger("asi_telemetry.service.api_key")

_key_lookup_cache: Dict[str, Dict[str, Any]] = {}
_cache_lock = threading.Lock()
CACHE_TTL_SECONDS = 60


def generate_random_secret_key(environment: str = "production") -> str:
    """Generates a secure, random hexadecimal API key matching the asi_* standard."""
    env = environment.lower()
    prefix = (
        "asi_live"
        if env == "production"
        else ("asi_stage" if env == "staging" else "asi_dev")
    )
    token_hex = secrets.token_hex(16)
    return f"{prefix}_{token_hex}"


def mask_key(full_key: str) -> str:
    """Creates a masked preview of an API key, e.g. asi_live_a1b2••••••••c3d4."""
    if len(full_key) <= 12:
        return full_key
    return f"{full_key[:10]}••••••••{full_key[-4:]}"


class ApiKeyService:
    """Service handling API Key generation, listing, verification, and revocation."""

    def __init__(self, repo: ApiKeyRepository = api_key_repo):
        self.repo = repo

    def create_api_key(
        self, user_id: str, payload: Optional[CreateApiKeyRequest] = None
    ) -> ApiKeyResponse:
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

        model = ApiKeyModel(
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
        self.repo.create(model)

        with _cache_lock:
            _key_lookup_cache[full_key] = {
                "user_id": str(user_id),
                "status": status,
                "cached_at": time.time(),
            }

        return ApiKeyResponse(
            id=key_id,
            user_id=str(user_id),
            name=model.name,
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

    def list_api_keys(self, user_id: str) -> List[ApiKeyResponse]:
        models = self.repo.list_by_user(user_id)
        res: List[ApiKeyResponse] = []
        for m in models:
            created_at_str = (
                m.created_at.isoformat()
                if hasattr(m.created_at, "isoformat")
                else str(m.created_at)
            )
            last_used_str = (
                m.last_used_at.isoformat()
                if m.last_used_at and hasattr(m.last_used_at, "isoformat")
                else (str(m.last_used_at) if m.last_used_at else None)
            )
            res.append(
                ApiKeyResponse(
                    id=m.id,
                    user_id=m.user_id,
                    name=m.name,
                    key_prefix=m.key_prefix,
                    full_key=None,  # Never expose full secret on list
                    environment=m.environment,
                    permissions=m.get_permissions_list(),
                    rate_limit=m.rate_limit,
                    status=m.status,
                    created_at=created_at_str,
                    last_used_at=last_used_str,
                    expires_at=m.expires_at,
                )
            )
        return res

    def revoke_api_key(self, key_id: str, user_id: str) -> bool:
        success = self.repo.revoke(key_id, user_id)
        with _cache_lock:
            for k in list(_key_lookup_cache.keys()):
                if _key_lookup_cache[k].get("user_id") == str(user_id):
                    _key_lookup_cache.pop(k, None)
        return success

    def resolve_api_key(self, token_str: str) -> Optional[str]:
        """Validates an API key and returns owner's user_id if active."""
        if not token_str or not token_str.startswith("asi_"):
            return None

        now = time.time()
        with _cache_lock:
            cached = _key_lookup_cache.get(token_str)
            if cached and (now - cached.get("cached_at", 0) < CACHE_TTL_SECONDS):
                if cached.get("status") == "active":
                    return cached.get("user_id")
                return None

        model = self.repo.get_by_full_key(token_str)
        if model and model.status == "active":
            with _cache_lock:
                _key_lookup_cache[token_str] = {
                    "user_id": str(model.user_id),
                    "status": model.status,
                    "cached_at": now,
                }
            self.repo.update_last_used(model.id)
            return str(model.user_id)

        with _cache_lock:
            _key_lookup_cache[token_str] = {
                "user_id": None,
                "status": "revoked",
                "cached_at": now,
            }
        return None


api_key_service = ApiKeyService()
# Function aliases for backward-compatibility
create_api_key = api_key_service.create_api_key
list_api_keys = api_key_service.list_api_keys
revoke_api_key = api_key_service.revoke_api_key
resolve_api_key = api_key_service.resolve_api_key
