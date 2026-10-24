"""Deterministic intent parsing for incoming chat messages.

No LLM is involved: requests are matched with explicit keywords and regular
expressions. This keeps behaviour predictable, testable, and free of any
model dependency. Anything that does not match a supported intent is
returned as ``UNSUPPORTED`` and answered with a help message.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class IntentName(str, Enum):
    WELCOME = "welcome"
    HELP = "help"
    CONNECT = "connect"
    LINK = "link"
    UNLINK = "unlink"
    LOGOUT = "logout"
    OVERVIEW = "overview"
    TOKEN_USAGE = "token_usage"
    COST_SUMMARY = "cost_summary"
    APPLICATIONS = "applications"
    ERRORS_PERFORMANCE = "errors_performance"
    TRACES = "traces"
    DIAGNOSE = "diagnose"
    APPROVE_PR = "approve_pr"
    UNSUPPORTED = "unsupported"


@dataclass(frozen=True)
class Intent:
    name: IntentName
    time_range: Optional[str] = None
    limit: Optional[int] = None
    model: Optional[str] = None
    api_key: Optional[str] = None
    handoff_code: Optional[str] = None
    error_id: Optional[str] = None


# Backend API keys: asi_<env>_<hex> (see apps/app-backend/auth/api_keys.py).
_API_KEY_RE = re.compile(r"\b(asi_[a-z0-9]+_[0-9a-fA-F]{16,64})\b")

# Single-use OAuth handoff codes (e.g. AUTH-A1B2C3D4 or AUTH-1234567890abcdef)
_HANDOFF_CODE_RE = re.compile(r"\b(AUTH-[0-9a-zA-Z]{6,32})\b", re.IGNORECASE)

# Explicit durations such as "last 24 hours", "past 3 days", "last 1h".
_DURATION_RE = re.compile(
    r"\b(?:last|past|over)\s+(\d+)\s*(h|hr|hrs|hour|hours|d|day|days|w|week|weeks|mo|month|months)\b",
    re.IGNORECASE,
)
_BARE_DURATION_RE = re.compile(r"\b(\d{1,3})\s*(h|hr|hours?|d|days?)\b", re.IGNORECASE)

_LIMIT_RE = re.compile(r"\b(?:last|show|recent)\s+(\d{1,2})\s+(?:most\s+)?traces?\b", re.IGNORECASE)
_MODEL_RE = re.compile(r"\bmodel\s+(?:named\s+)?([a-zA-Z0-9][a-zA-Z0-9._/-]{2,60})\b", re.IGNORECASE)

_GREETING_START_RE = re.compile(
    r"^(?:hi|hello|hey|yo|namaste|good (?:morning|evening|afternoon))\b", re.IGNORECASE
)
_HELP_RE = re.compile(r"\b(help|capabilities|commands|options)\b", re.IGNORECASE)
_CONNECT_WORDS = (
    "connect account",
    "connect my account",
    "connect asi",
    "oauth",
    "google sign in",
    "google login",
    "sign in with google",
    "connect",
)
_APPROVE_PR_WORDS = (
    "approve pr",
    "confirm pr",
    "open pr",
    "create pr",
    "yes open pr",
    "yes create pr",
    "open pull request",
    "create pull request",
    "proceed with pr",
    "submit pr",
)
_DIAGNOSE_WORDS = (
    "diagnose",
    "investigate",
    "why did it fail",
    "debug error",
    "inspect error",
    "analyze error",
    "check error",
    "troubleshoot",
    "what went wrong",
)
_LOGOUT_WORDS = ("logout", "revoke session", "revoke token", "log out")
_UNLINK_WORDS = ("unlink", "un-link", "disconnect account", "remove account", "disconnect")
_OVERVIEW_WORDS = ("overview", "who am i", "account status", "account summary", "my account", "health check")
_APPLICATION_WORDS = ("project", "projects", "application", "applications", "apps", "my agents", "agent list")
_ERROR_WORDS = ("error", "errors", "error rate", "latency", "performance", "reliability", "success rate", "p99")
_TRACE_WORDS = ("trace", "traces", "recent traces", "last traces", "execution history")
_COST_WORDS = ("cost", "costs", "spend", "spending", "spent", "bill", "billing", "expense", "expenses")
_TOKEN_WORDS = ("token", "tokens", "token usage", "tokens used", "usage", "quota", "consumption")


def _contains_any(text: str, words) -> bool:  # noqa: ANN001
    return any(word in text for word in words)


def parse_time_range(text: str) -> Optional[str]:
    """Extract a backend-supported time range, or None when not specified."""
    lowered = text.lower()

    if "all time" in lowered or "overall" in lowered or "to date" in lowered:
        return "all"
    if "last hour" in lowered or "past hour" in lowered or "this hour" in lowered:
        return "1h"
    if "last 24" in lowered or "past 24" in lowered or "today" in lowered:
        return "24h"
    if "this week" in lowered:
        return "7d"
    if "this month" in lowered:
        return "30d"

    match = _DURATION_RE.search(text) or _BARE_DURATION_RE.search(text)
    if match:
        amount = int(match.group(1))
        unit = match.group(2).lower()
        if unit.startswith("h"):
            hours = amount
        elif unit.startswith("d"):
            hours = amount * 24
        elif unit.startswith("w"):
            hours = amount * 24 * 7
        else:  # months
            hours = amount * 24 * 30
        if hours <= 2:
            return "1h"
        if hours <= 24:
            return "24h"
        if hours <= 24 * 7:
            return "7d"
        if hours <= 24 * 30:
            return "30d"
        return "all"
    return None


def _parse_limit(text: str) -> Optional[int]:
    match = _LIMIT_RE.search(text)
    if match:
        return max(1, min(int(match.group(1)), 10))
    return None


def _parse_model(text: str) -> Optional[str]:
    match = _MODEL_RE.search(text)
    if match:
        candidate = match.group(1).strip(".,!?")
        if candidate.lower() not in ("used", "the", "a"):
            return candidate
    return None


def parse_intent(text: str) -> Intent:
    """Classify a chat message into a supported intent."""
    raw = (text or "").strip()
    if not raw:
        return Intent(IntentName.UNSUPPORTED)

    lowered = raw.lower()

    # OAuth handoff code received from user: "AUTH-12345678" or "code AUTH-..."
    handoff_match = _HANDOFF_CODE_RE.search(raw)
    if handoff_match:
        return Intent(IntentName.LINK, handoff_code=handoff_match.group(1).upper())

    # Explicit GitHub pull request approval: "approve pr", "confirm pr"
    if _contains_any(lowered, _APPROVE_PR_WORDS):
        return Intent(IntentName.APPROVE_PR)

    # Runtime error diagnosis: "diagnose error", "why did it fail"
    if _contains_any(lowered, _DIAGNOSE_WORDS):
        return Intent(IntentName.DIAGNOSE)

    # Session revocation: "logout", "revoke session"
    if _contains_any(lowered, _LOGOUT_WORDS):
        return Intent(IntentName.LOGOUT)

    # Legacy account linking: "link account asi_dev_..." (key captured from raw text).
    key_match = _API_KEY_RE.search(raw)
    if key_match and "unlink" not in lowered and "link" in lowered:
        return Intent(IntentName.LINK, api_key=key_match.group(1))

    # OAuth Connect intent: "connect my account", "login", "authenticate"
    # or "link account" without a key
    if _contains_any(lowered, _CONNECT_WORDS) or lowered in ("link", "link account", "connect"):
        return Intent(IntentName.CONNECT)

    if _contains_any(lowered, _UNLINK_WORDS):
        return Intent(IntentName.UNLINK)

    if _HELP_RE.search(lowered) or lowered in ("?", "what can you do", "what can you do?"):
        return Intent(IntentName.HELP)

    # Greetings are only treated as such when the message is short; a longer
    # message starting with "hi" should fall through to real intent parsing.
    if _GREETING_START_RE.match(lowered) and len(lowered.split()) <= 4:
        return Intent(IntentName.WELCOME)

    time_range = parse_time_range(raw)
    model = _parse_model(raw)

    if _contains_any(lowered, _TRACE_WORDS):
        return Intent(IntentName.TRACES, time_range=time_range, limit=_parse_limit(raw), model=model)

    # Cost check precedes token checks so "how much did I spend on tokens"
    # maps to the cost summary (which includes token totals anyway).
    if _contains_any(lowered, _COST_WORDS):
        return Intent(IntentName.COST_SUMMARY, time_range=time_range, model=model)

    if _contains_any(lowered, _TOKEN_WORDS):
        return Intent(IntentName.TOKEN_USAGE, time_range=time_range, model=model)

    if _contains_any(lowered, _ERROR_WORDS):
        return Intent(IntentName.ERRORS_PERFORMANCE, time_range=time_range, model=model)

    if _contains_any(lowered, _APPLICATION_WORDS):
        return Intent(IntentName.APPLICATIONS, time_range=time_range)

    if _contains_any(lowered, _OVERVIEW_WORDS) or lowered in ("status", "health"):
        return Intent(IntentName.OVERVIEW, time_range=time_range)

    return Intent(IntentName.UNSUPPORTED)

