"""Shared fixtures: a mocked ASI-Telemetry backend over httpx.MockTransport.

No network access and no production credentials are required to run the
test suite. The mock payloads mirror the real response shapes produced by
apps/app-backend (database/llm.py, database/telemetry.py, auth/).
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Dict, Optional

import httpx
import pytest

# Make the app-agent directory importable regardless of pytest invocation dir.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api_client import TelemetryApiClient  # noqa: E402
from handlers.chat import ChatProcessor  # noqa: E402
from services.account_link import AccountLinkStore  # noqa: E402
from services.telemetry import TelemetryService  # noqa: E402

KEY_A = "asi_dev_" + "a1" * 16
KEY_B = "asi_live_" + "b2" * 16
# Well-formed key that the backend does not recognize (-> HTTP 401).
UNKNOWN_KEY = "asi_dev_" + "0f" * 16

USER_A = {"id": "1", "name": "Alice", "email": "alice@example.com", "created_at": "2026-01-01T00:00:00"}
USER_B = {"id": "2", "name": "Bob", "email": "bob@example.com", "created_at": "2026-01-02T00:00:00"}

HEALTH = {
    "status": "healthy",
    "clickhouse_connected": True,
    "total_records": 120,
    "total_llm_records": 84,
}


def monitoring_payload(total_tokens: int, total_cost: float, traces: int, errors: int) -> Dict:
    prompt = int(total_tokens * 0.8)
    return {
        "summary": {
            "totalCount": traces,
            "errorCount": errors,
            "successCount": traces - errors,
            "successRate": round(((traces - errors) / traces) * 100, 1) if traces else 100.0,
            "totalTokens": total_tokens,
            "promptTokens": prompt,
            "completionTokens": total_tokens - prompt,
            "totalCost": total_cost,
            "avgLatencyMs": 320.5,
            "p99LatencyMs": 910.2,
        },
        "models": ["All Models", "gemini-3.8-flash"],
        "traceCountData": [],
    }


def traces_payload(trace_id: str, total: int) -> Dict:
    return {
        "traces": [
            {
                "id": f"trace-{trace_id}",
                "trace_id": trace_id,
                "name": "gemini_generate",
                "status": "success",
                "model": "gemini-3.8-flash",
                "input": "hello",
                "output": "hi",
                "latency_ms": 250.0,
                "prompt_tokens": 12,
                "completion_tokens": 30,
                "total_tokens": 42,
                "cost_usd": 0.00123,
                "start_time": "2026-10-20T10:00:00",
            }
        ],
        "total": total,
        "stats": {
            "total_traces": total,
            "total_tokens": total * 42,
            "total_cost_usd": total * 0.00123,
            "avg_latency_ms": 250.0,
        },
    }


def dashboard_payload(requests: int, errors: int) -> Dict:
    return {
        "summary": {
            "total_requests": requests,
            "total_success": requests - errors,
            "total_errors": errors,
            "success_rate": round(((requests - errors) / requests) * 100, 1) if requests else 100.0,
            "error_rate": round((errors / requests) * 100, 1) if requests else 0.0,
            "avg_response_time_ms": 210.4,
            "uptime": 98.7,
            "uptime_desc": "Percent of requests the agent replied to in the last 30 days.",
            "agent_address": "agent1qfakeaddress",
        },
        "timeseries": {"requests": [], "response_time": [], "errors": []},
        "traces": [],
        "applications": [
            {"agent_name": "assistant", "functions": ["chat"]},
            {"agent_name": "weather-agent", "functions": ["get_weather"]},
        ],
    }


class MockBackend:
    """Configurable in-memory stand-in for the FastAPI backend."""

    def __init__(self) -> None:
        self.requests: list[httpx.Request] = []
        self.users: Dict[str, Dict] = {KEY_A: USER_A, KEY_B: USER_B}
        self.monitoring: Dict[str, Dict] = {
            KEY_A: monitoring_payload(total_tokens=1111, total_cost=1.5, traces=10, errors=1),
            KEY_B: monitoring_payload(total_tokens=9999, total_cost=9.9, traces=50, errors=5),
        }
        self.traces: Dict[str, Dict] = {
            KEY_A: traces_payload("aaa", total=3),
            KEY_B: traces_payload("bbb", total=7),
        }
        self.dashboard: Dict[str, Dict] = {
            KEY_A: dashboard_payload(requests=100, errors=2),
            KEY_B: dashboard_payload(requests=500, errors=50),
        }
        self.failure_mode: Optional[str] = None  # None | timeout | connect_error | malformed | bad_schema | not_found

    def handle(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)

        if self.failure_mode == "timeout":
            raise httpx.ConnectTimeout("simulated timeout", request=request)
        if self.failure_mode == "connect_error":
            raise httpx.ConnectError("simulated connection refused", request=request)
        if self.failure_mode == "malformed":
            return httpx.Response(200, content=b"{not-json", headers={"content-type": "application/json"})
        if self.failure_mode == "bad_schema":
            return httpx.Response(200, json={"unexpected": True})

        path = request.url.path
        if path == "/api/health":
            return httpx.Response(200, json=HEALTH)

        auth = request.headers.get("authorization", "")
        key = auth[len("Bearer "):] if auth.startswith("Bearer ") else ""
        if key not in self.users:
            return httpx.Response(401, json={"detail": "Invalid or expired access token"})

        if path == "/api/auth/me":
            return httpx.Response(200, json=self.users[key])
        if path == "/api/llm/monitoring":
            return httpx.Response(200, json=self.monitoring[key])
        if path == "/api/llm/traces":
            return httpx.Response(200, json=self.traces[key])
        if path == "/api/dashboard":
            return httpx.Response(200, json=self.dashboard[key])
        return httpx.Response(404, json={"detail": "not found"})


@pytest.fixture()
def backend() -> MockBackend:
    return MockBackend()


@pytest.fixture()
async def api_client(backend: MockBackend):
    client = TelemetryApiClient(
        base_url="http://backend.test",
        timeout_seconds=5.0,
        transport=httpx.MockTransport(backend.handle),
    )
    yield client
    await client.aclose()


@pytest.fixture()
def links() -> AccountLinkStore:
    return AccountLinkStore()


@pytest.fixture()
def processor(api_client: TelemetryApiClient, links: AccountLinkStore) -> ChatProcessor:
    return ChatProcessor(TelemetryService(api_client), links)
