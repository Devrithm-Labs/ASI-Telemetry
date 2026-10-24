import logging
import secrets
import threading
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import HTTPException, status
from auth.api_keys import create_api_key
from auth.schemas import CreateApiKeyRequest
from auth.service import find_user_by_id

logger = logging.getLogger("backend.auth.agent_linking")

# In-memory store for short-lived, single-use pairing tokens
# token -> { "user_id": str, "expires_at": float, "created_at": float }
_link_tokens: Dict[str, Dict[str, Any]] = {}
_tokens_lock = threading.Lock()

TOKEN_TTL_SECONDS = 300  # 5 minutes


def _prune_expired_tokens() -> None:
    """Removes expired pairing tokens from memory."""
    now = time.time()
    expired = [k for k, v in _link_tokens.items() if v.get("expires_at", 0) < now]
    for k in expired:
        _link_tokens.pop(k, None)


def create_agent_link_token(user_id: str) -> Dict[str, Any]:
    """
    Generates a secure, short-lived, single-use pairing token for the user.
    The user can paste this token into the ASI:One chatbot without exposing their permanent API key.
    """
    with _tokens_lock:
        _prune_expired_tokens()
        # Clean, human-friendly code format: ASI-PAIR-XXXXXX (6 hex digits)
        token = f"ASI-PAIR-{secrets.token_hex(3).upper()}"
        expires_at = time.time() + TOKEN_TTL_SECONDS

        _link_tokens[token] = {
            "user_id": str(user_id),
            "expires_at": expires_at,
            "created_at": time.time(),
        }

    logger.info("Generated agent link token %s for user %s (valid for %ds)", token, user_id, TOKEN_TTL_SECONDS)
    return {
        "token": token,
        "expires_in_seconds": TOKEN_TTL_SECONDS,
        "expires_at": datetime.fromtimestamp(expires_at, tz=timezone.utc).isoformat(),
        "instruction": f"In ASI:One chatbot, send: link {token}",
    }


def verify_agent_link_token(token: str, sender_address: str) -> Dict[str, Any]:
    """
    Verifies the pairing token provided by the agent.
    If valid:
    1. Immediately burns the pairing token (single-use).
    2. Proactively provisions a dedicated agent API key for this user/agent.
    3. Returns the scoped session token directly to the agent.
    """
    cleaned_token = (token or "").strip().upper()
    if not cleaned_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A pairing token must be provided.",
        )

    with _tokens_lock:
        _prune_expired_tokens()
        record = _link_tokens.pop(cleaned_token, None)

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or already-used pairing token. Please generate a new code in your dashboard.",
        )

    if time.time() > record.get("expires_at", 0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This pairing token has expired. Please generate a fresh code in your dashboard.",
        )

    user_id = record["user_id"]
    user = find_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The user associated with this pairing token no longer exists.",
        )

    # Provision a dedicated scoped API key for this ASI:One agent link
    sender_short = sender_address[:14] if sender_address else "chat"
    key_resp = create_api_key(
        user_id=user.id,
        payload=CreateApiKeyRequest(
            name=f"ASI:One Agent ({sender_short})",
            environment="production",
            permissions=["telemetry:read"],
            expires_at="365 days",
        ),
    )

    logger.info(
        "Successfully verified pairing token for user %s (%s). Bound to sender %s",
        user.id,
        user.email,
        sender_address,
    )

    return {
        "status": "success",
        "message": f"Account successfully linked to {user.name or user.email}",
        "user": {
            "id": user.id,
            "name": user.name or "",
            "email": user.email,
        },
        "session_token": key_resp.full_key or "",
        "sender_address": sender_address,
    }
