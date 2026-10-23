"""API client tests against a mocked backend (success and failure modes)."""

from __future__ import annotations

import httpx
import pytest

from api_client import (
    AuthenticationError,
    BackendHttpError,
    BackendResponseError,
    BackendUnavailableError,
)
from tests.conftest import KEY_A


async def test_health_success(api_client):
    health = await api_client.get_health()
    assert health.status == "healthy"
    assert health.clickhouse_connected is True


async def test_current_user_success(api_client):
    user = await api_client.get_current_user(KEY_A)
    assert user.id == "1"
    assert user.email == "alice@example.com"


async def test_monitoring_success_parses_summary(api_client):
    data = await api_client.get_llm_monitoring(KEY_A, time_range="7d")
    assert data.summary.totalTokens == 1111
    assert data.summary.errorCount == 1
    assert data.models == ["All Models", "gemini-3.8-flash"]


async def test_traces_success(api_client):
    data = await api_client.get_llm_traces(KEY_A, limit=5)
    assert data.total == 3
    assert data.traces[0].model == "gemini-3.8-flash"
    assert data.stats.total_traces == 3


async def test_dashboard_success(api_client):
    data = await api_client.get_dashboard(KEY_A, time_range="24h")
    assert data.summary.total_requests == 100
    assert [a.agent_name for a in data.applications] == ["assistant", "weather-agent"]


async def test_auth_header_sent(api_client, backend):
    await api_client.get_current_user(KEY_A)
    request = backend.requests[-1]
    assert request.headers["authorization"] == f"Bearer {KEY_A}"


async def test_invalid_key_returns_401(api_client):
    with pytest.raises(AuthenticationError):
        await api_client.get_current_user("asi_dev_" + "00" * 16)


async def test_timeout_maps_to_backend_unavailable(api_client, backend):
    backend.failure_mode = "timeout"
    with pytest.raises(BackendUnavailableError):
        await api_client.get_llm_monitoring(KEY_A)


async def test_connection_error_maps_to_backend_unavailable(api_client, backend):
    backend.failure_mode = "connect_error"
    with pytest.raises(BackendUnavailableError):
        await api_client.get_llm_monitoring(KEY_A)


async def test_malformed_json_maps_to_response_error(api_client, backend):
    backend.failure_mode = "malformed"
    with pytest.raises(BackendResponseError):
        await api_client.get_llm_monitoring(KEY_A)


async def test_schema_mismatch_maps_to_response_error(api_client, backend):
    backend.failure_mode = "bad_schema"
    with pytest.raises(BackendResponseError):
        await api_client.get_llm_monitoring(KEY_A)


async def test_other_http_error(api_client, backend):
    backend.failure_mode = None
    # Force a 404 by asking for an unknown path through the private helper.
    with pytest.raises(BackendHttpError) as excinfo:
        await api_client._get("/api/does-not-exist", api_key=KEY_A)
    assert excinfo.value.status_code == 404
