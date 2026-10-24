"""Read-only telemetry capabilities backed by the existing backend.

Each capability maps 1:1 onto an existing, account-scoped backend endpoint.
No analytics are computed here beyond trivial formatting of values the
backend already aggregated (see apps/app-backend/database/llm.py and
apps/app-backend/database/telemetry.py).

Cost note: ``cost_usd`` / ``totalCost`` values originate from telemetry
records ingested from the SDK. They are *estimates derived from telemetry*,
not confirmed billing figures, and are always labeled as such in responses.
"""

from __future__ import annotations

from typing import Tuple

from api_client import (
    DashboardResponse,
    MonitoringResponse,
    TelemetryApiClient,
    TracesResponse,
    UserProfile,
)

# Time ranges understood by the backend's LLM monitoring + dashboard
# endpoints (see database/llm.py). "all" disables the time window.
SUPPORTED_TIME_RANGES = ("1h", "24h", "7d", "30d", "all")


def normalize_time_range(raw: str | None) -> str:
    """Map a candidate time range onto a backend-supported value."""
    if not raw:
        return "7d"
    value = raw.strip().lower()
    if value in ("1d", "24h"):
        return "24h"
    if value in SUPPORTED_TIME_RANGES:
        return value
    if value == "all":
        return "all"
    return "7d"


class TelemetryService:
    """Facade over the backend client for the agent's read-only capabilities."""

    def __init__(self, client: TelemetryApiClient):
        self._client = client

    async def validate_api_key(self, api_key: str) -> UserProfile:
        """Validate a candidate API key against the backend identity endpoint."""
        return await self._client.get_current_user(api_key)

    async def verify_pairing_token(self, token: str, sender_address: str) -> Tuple[UserProfile, str]:
        """Verify temporary pairing token with backend, returning user profile and session token."""
        result = await self._client.verify_agent_link(token, sender_address)
        user = UserProfile(
            id=result["user"]["id"],
            name=result["user"].get("name", ""),
            email=result["user"].get("email", ""),
        )
        session_token = result.get("session_token", "")
        return user, session_token


    async def account_overview(self, api_key: str) -> Tuple[UserProfile, "object"]:
        """Return the linked account's identity and the backend health status."""
        user = await self._client.get_current_user(api_key)
        health = await self._client.get_health()
        return user, health

    async def token_usage(self, api_key: str, time_range: str = "7d") -> MonitoringResponse:
        return await self._client.get_llm_monitoring(api_key, time_range=normalize_time_range(time_range))

    async def cost_summary(self, api_key: str, time_range: str = "7d") -> MonitoringResponse:
        return await self._client.get_llm_monitoring(api_key, time_range=normalize_time_range(time_range))

    async def error_performance(self, api_key: str, time_range: str = "7d") -> Tuple[MonitoringResponse, DashboardResponse]:
        normalized = normalize_time_range(time_range)
        monitoring = await self._client.get_llm_monitoring(api_key, time_range=normalized)
        dashboard = await self._client.get_dashboard(api_key, time_range=normalized)
        return monitoring, dashboard

    async def application_summaries(self, api_key: str, time_range: str = "7d") -> DashboardResponse:
        return await self._client.get_dashboard(api_key, time_range=normalize_time_range(time_range))

    async def recent_traces(self, api_key: str, limit: int = 5) -> TracesResponse:
        safe_limit = max(1, min(int(limit), 10))
        return await self._client.get_llm_traces(api_key, limit=safe_limit)
