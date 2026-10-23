"""Async HTTP client for the existing ASI-Telemetry FastAPI backend.

This client is intentionally thin: it calls the backend endpoints that
already exist and already perform all aggregation and per-account
authorization. The agent never talks to ClickHouse directly and never
re-implements analytics.

Endpoints used (see apps/app-backend/routes/):

- ``GET /api/auth/me``            -> linked account identity (Bearer key)
- ``GET /api/health``             -> backend / database status
- ``GET /api/llm/monitoring``     -> token usage, estimated cost, KPIs
- ``GET /api/llm/traces``         -> recent LLM execution traces
- ``GET /api/dashboard``          -> tool/application-level summaries

Authentication: the backend resolves the requesting account from
``Authorization: Bearer <asi_... API key>`` via
``auth.dependencies.resolve_request_user_id``, so every response is already
scoped to the account that owns the presented key.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import httpx
from pydantic import BaseModel, ConfigDict, Field

logger = logging.getLogger("asi_telemetry.agent.api_client")


class TelemetryApiError(Exception):
    """Base error for backend communication failures."""


class BackendUnavailableError(TelemetryApiError):
    """The backend could not be reached (timeout, connection error)."""


class AuthenticationError(TelemetryApiError):
    """The backend rejected the supplied account credential (401/403)."""


class BackendHttpError(TelemetryApiError):
    """The backend answered with an unexpected non-success status code."""

    def __init__(self, status_code: int, detail: str = ""):
        self.status_code = status_code
        super().__init__(f"Backend returned HTTP {status_code}. {detail}".strip())


class BackendResponseError(TelemetryApiError):
    """The backend response did not match the expected schema."""


# ---------------------------------------------------------------------------
# Response schemas (lenient: unknown fields are tolerated, missing critical
# fields are rejected so malformed responses surface as safe errors).
# ---------------------------------------------------------------------------


class UserProfile(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    name: str = ""
    email: str = ""


class HealthStatus(BaseModel):
    model_config = ConfigDict(extra="allow")

    status: str = "unknown"
    clickhouse_connected: bool = False


class MonitoringSummary(BaseModel):
    model_config = ConfigDict(extra="allow")

    totalCount: int = 0
    errorCount: int = 0
    successCount: int = 0
    successRate: float = 0.0
    totalTokens: int = 0
    promptTokens: int = 0
    completionTokens: int = 0
    totalCost: float = 0.0
    avgLatencyMs: float = 0.0
    p99LatencyMs: float = 0.0


class MonitoringResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    summary: MonitoringSummary
    models: List[str] = Field(default_factory=list)


class TraceItem(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: Optional[str] = None
    trace_id: Optional[str] = None
    name: str = ""
    status: str = ""
    model: str = ""
    input: str = ""
    output: Optional[str] = None
    error: Optional[str] = None
    latency_ms: float = 0.0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost_usd: float = 0.0
    start_time: Optional[str] = None


class TraceStats(BaseModel):
    model_config = ConfigDict(extra="allow")

    total_traces: int = 0
    total_tokens: int = 0
    total_cost_usd: float = 0.0
    avg_latency_ms: float = 0.0


class TracesResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    traces: List[TraceItem] = Field(default_factory=list)
    total: int = 0
    stats: TraceStats = Field(default_factory=TraceStats)


class DashboardSummary(BaseModel):
    model_config = ConfigDict(extra="allow")

    total_requests: int = 0
    total_success: int = 0
    total_errors: int = 0
    success_rate: float = 0.0
    error_rate: float = 0.0
    avg_response_time_ms: float = 0.0
    uptime: float = 0.0


class ApplicationInfo(BaseModel):
    model_config = ConfigDict(extra="allow")

    agent_name: str = ""
    functions: List[str] = Field(default_factory=list)


class DashboardResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    summary: DashboardSummary
    applications: List[ApplicationInfo] = Field(default_factory=list)


class TelemetryApiClient:
    """Async client for the ASI-Telemetry backend."""

    def __init__(
        self,
        base_url: str,
        timeout_seconds: float = 10.0,
        transport: Optional[httpx.AsyncBaseTransport] = None,
    ):
        self._base_url = base_url.rstrip("/")
        self._timeout = httpx.Timeout(timeout_seconds)
        # ``transport`` is injectable so tests can run against a mock
        # backend without any network access.
        self._client = httpx.AsyncClient(timeout=self._timeout, transport=transport)

    async def aclose(self) -> None:
        await self._client.aclose()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _get(self, path: str, api_key: Optional[str], params: Optional[Dict[str, Any]] = None) -> Any:
        headers: Dict[str, str] = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        url = f"{self._base_url}{path}"
        try:
            response = await self._client.get(url, params=params, headers=headers)
        except httpx.TimeoutException as exc:
            logger.warning("Backend request timed out: %s", path)
            raise BackendUnavailableError(f"Request to {path} timed out") from exc
        except httpx.HTTPError as exc:
            logger.warning("Backend request failed: %s (%s)", path, type(exc).__name__)
            raise BackendUnavailableError(f"Could not reach backend at {path}") from exc

        if response.status_code in (401, 403):
            raise AuthenticationError(
                "The linked API key was rejected by the backend. It may be revoked or expired."
            )
        if response.status_code >= 400:
            raise BackendHttpError(response.status_code)

        try:
            return response.json()
        except ValueError as exc:
            logger.warning("Backend returned non-JSON response for %s", path)
            raise BackendResponseError(f"Backend returned invalid JSON for {path}") from exc

    @staticmethod
    def _validate(payload: Any, model_cls):  # noqa: ANN401
        try:
            return model_cls.model_validate(payload)
        except Exception as exc:  # pydantic.ValidationError
            logger.warning("Backend response failed schema validation: %s", model_cls.__name__)
            raise BackendResponseError(
                f"Backend response did not match the expected {model_cls.__name__} schema"
            ) from exc

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def get_health(self) -> HealthStatus:
        payload = await self._get("/api/health", api_key=None)
        return self._validate(payload, HealthStatus)

    async def get_current_user(self, api_key: str) -> UserProfile:
        payload = await self._get("/api/auth/me", api_key=api_key)
        return self._validate(payload, UserProfile)

    async def get_llm_monitoring(
        self,
        api_key: str,
        time_range: str = "7d",
        model: Optional[str] = None,
    ) -> MonitoringResponse:
        params: Dict[str, Any] = {"time_range": time_range}
        if model:
            params["model"] = model
        payload = await self._get("/api/llm/monitoring", api_key=api_key, params=params)
        return self._validate(payload, MonitoringResponse)

    async def get_llm_traces(
        self,
        api_key: str,
        limit: int = 5,
        status: Optional[str] = None,
        model: Optional[str] = None,
    ) -> TracesResponse:
        params: Dict[str, Any] = {"limit": limit}
        if status:
            params["status"] = status
        if model:
            params["model"] = model
        payload = await self._get("/api/llm/traces", api_key=api_key, params=params)
        return self._validate(payload, TracesResponse)

    async def get_dashboard(
        self,
        api_key: str,
        time_range: str = "7d",
        agent_name: Optional[str] = None,
    ) -> DashboardResponse:
        params: Dict[str, Any] = {"time_range": time_range}
        if agent_name:
            params["agent_name"] = agent_name
        payload = await self._get("/api/dashboard", api_key=api_key, params=params)
        return self._validate(payload, DashboardResponse)
