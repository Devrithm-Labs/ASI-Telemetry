"""Account-linking store: associates ACP sender addresses with API keys.

Security model
--------------
- ACP/ASI:ONE identifies a chat participant only by their agent address
  (``agent1q...``). That address is *not* proof of an ASI-Telemetry account.
- The developer links their account by creating a dedicated API key in the
  ASI-Telemetry dashboard (or via ``POST /api/api-keys``) and sending it in
  chat using the ``link account <key>`` command.
- The agent validates the key against ``GET /api/auth/me`` *before* storing
  it, so an arbitrary string can never be treated as a credential.
- Bindings are kept **in memory only** (never written to disk, never logged),
  so a restart requires re-linking. This is an explicit security trade-off:
  no credential material persists on the agent host.
- Data access always happens by presenting the key to the backend, which
  scopes every query to the owning account server-side. The agent cannot
  cross account boundaries even if its own logic failed.
"""

from __future__ import annotations

import re
import threading
from typing import Dict, Optional

# Backend keys look like asi_live_<32 hex> / asi_dev_<32 hex> (see
# auth/api_keys.py). We only do cheap shape validation here; the backend is
# the authoritative validator via GET /api/auth/me.
_KEY_PATTERN = re.compile(r"^asi_[a-z0-9]+_[0-9a-fA-F]{16,64}$")

_SENDER_PATTERN = re.compile(r"^agent1[0-9a-z]{50,70}$")


class InvalidKeyFormatError(ValueError):
    """Raised when a supplied API key does not match the expected shape."""


def looks_like_api_key(candidate: str) -> bool:
    """Cheap, local shape check for an ASI-Telemetry API key."""
    return bool(candidate) and bool(_KEY_PATTERN.match(candidate.strip()))


def looks_like_agent_address(candidate: str) -> bool:
    """Cheap, local shape check for a Fetch.ai agent address."""
    return bool(candidate) and bool(_SENDER_PATTERN.match(candidate.strip()))


def redact_key(key: str) -> str:
    """Return a log-safe representation of a key (prefix + suffix only)."""
    if not key or len(key) <= 14:
        return "[redacted]"
    return f"{key[:8]}...{key[-4:]}"


class AccountLinkStore:
    """Thread-safe, in-memory mapping of sender address -> API key."""

    def __init__(self) -> None:
        self._bindings: Dict[str, str] = {}
        self._lock = threading.Lock()

    def link(self, sender: str, api_key: str) -> None:
        if not looks_like_api_key(api_key):
            raise InvalidKeyFormatError("The supplied API key has an invalid format.")
        with self._lock:
            self._bindings[sender] = api_key.strip()

    def unlink(self, sender: str) -> bool:
        with self._lock:
            return self._bindings.pop(sender, None) is not None

    def get_key(self, sender: str) -> Optional[str]:
        with self._lock:
            return self._bindings.get(sender)

    def is_linked(self, sender: str) -> bool:
        return self.get_key(sender) is not None

    def linked_count(self) -> int:
        with self._lock:
            return len(self._bindings)
