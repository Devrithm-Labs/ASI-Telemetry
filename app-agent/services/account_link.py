"""Account-linking store: associates ACP sender addresses with credentials and sessions.

Security model
--------------
- ACP/ASI:ONE identifies a chat participant by their agent address (``agent1q...``).
- The developer links their account securely via Google OAuth 2.0 PKCE, or legacy API key.
- Bindings (access token, refresh token, user profile) are kept IN-MEMORY ONLY
  (never written to disk, never logged).
- Access tokens expire every 15 minutes and are automatically renewed via rotating refresh tokens.
"""

from __future__ import annotations

import re
import threading
from typing import Any, Dict, Optional

# Backend keys: asi_live_<hex> / asi_dev_<hex>
_KEY_PATTERN = re.compile(r"^asi_[a-z0-9]+_[0-9a-fA-F]{16,64}$")

# JWT access tokens: ey...
_JWT_PATTERN = re.compile(r"^ey[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$")

# Fetch.ai sender address
_SENDER_PATTERN = re.compile(r"^agent1[0-9a-z]{50,70}$")


class InvalidKeyFormatError(ValueError):
    """Raised when a supplied API key or token does not match the expected shape."""


def looks_like_api_key(candidate: str) -> bool:
    """Cheap, local shape check for an ASI-Telemetry API key or JWT access token."""
    if not candidate:
        return False
    cand = candidate.strip()
    return bool(_KEY_PATTERN.match(cand)) or bool(_JWT_PATTERN.match(cand))


def looks_like_agent_address(candidate: str) -> bool:
    """Cheap, local shape check for a Fetch.ai agent address."""
    return bool(candidate) and bool(_SENDER_PATTERN.match(candidate.strip()))


def redact_key(key: str) -> str:
    """Return a log-safe representation of a key or token."""
    if not key or len(key) <= 14:
        return "[redacted]"
    return f"{key[:8]}...{key[-4:]}"


class AccountLinkStore:
    """Thread-safe, in-memory mapping of sender address -> session credentials."""

    def __init__(self) -> None:
        # sender -> { "access_token": str, "refresh_token": Optional[str], "user": Optional[dict] }
        self._bindings: Dict[str, Dict[str, Any]] = {}
        # sender -> session_id (pending OAuth session)
        self._pending_sessions: Dict[str, str] = {}
        self._lock = threading.Lock()

    def link(
        self,
        sender: str,
        credential: Optional[str] = None,
        refresh_token: Optional[str] = None,
        user_info: Optional[Dict[str, Any]] = None,
        user_email: Optional[str] = None,
        key: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        """Links a sender address to an access token or API key."""
        raw_cred = credential if credential is not None else key
        clean_cred = (raw_cred or "").strip()
        if not looks_like_api_key(clean_cred):
            raise InvalidKeyFormatError("The supplied credential has an invalid format.")


        info = user_info or {}
        if user_email and "email" not in info:
            info["email"] = user_email

        with self._lock:
            self._bindings[sender] = {
                "access_token": clean_cred,
                "refresh_token": refresh_token.strip() if refresh_token else None,
                "user": user_info or {},
            }
            # Clear pending session if present
            self._pending_sessions.pop(sender, None)

    def update_tokens(self, sender: str, access_token: str, refresh_token: str) -> None:
        """Updates rotated access and refresh tokens for a sender."""
        with self._lock:
            if sender in self._bindings:
                self._bindings[sender]["access_token"] = access_token.strip()
                self._bindings[sender]["refresh_token"] = refresh_token.strip()

    def unlink(self, sender: str) -> bool:
        """Unlinks a sender address and drops all stored credentials."""
        with self._lock:
            self._pending_sessions.pop(sender, None)
            return self._bindings.pop(sender, None) is not None

    def get_key(self, sender: str) -> Optional[str]:
        """Returns the active access token or API key for the sender."""
        with self._lock:
            record = self._bindings.get(sender)
            if record:
                return record.get("access_token")
            return None

    def get_refresh_token(self, sender: str) -> Optional[str]:
        """Returns the active refresh token for the sender, if available."""
        with self._lock:
            record = self._bindings.get(sender)
            if record:
                return record.get("refresh_token")
            return None

    def get_user_info(self, sender: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            record = self._bindings.get(sender)
            if record:
                return record.get("user")
            return None

    def set_pending_session(self, sender: str, session_id: str) -> None:
        with self._lock:
            self._pending_sessions[sender] = session_id

    def get_pending_session(self, sender: str) -> Optional[str]:
        with self._lock:
            return self._pending_sessions.get(sender)

    def is_linked(self, sender: str) -> bool:
        return self.get_key(sender) is not None

    def linked_count(self) -> int:
        with self._lock:
            return len(self._bindings)
