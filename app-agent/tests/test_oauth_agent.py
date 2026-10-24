"""Automated tests for Agent OAuth connection, auto-refresh, and security boundaries.

Covers:
- Initiating OAuth without pasting credentials in chat
- Exchanging single-use handoff code
- Authenticated requests using application tokens
- Automatic access token renewal on 401
- HTTP 403 handling (treated as Forbidden, not expired session)
- No credential leakage in chat responses or logs
- Unlink / Logout revocation
"""

import pytest
from unittest.mock import AsyncMock, MagicMock

from api_client import (
    AuthenticationError,
    AuthorizationError,
    UserProfile,
    MonitoringResponse,
    MonitoringSummary,
)
from handlers.chat import ChatProcessor
from services.account_link import AccountLinkStore
from services.telemetry import TelemetryService


SENDER = "agent1qtestsessionsender99999999999999999999999999999999999999999"


@pytest.fixture
def mock_client():
    client = MagicMock()
    return client


@pytest.fixture
def service(mock_client):
    return TelemetryService(mock_client)


@pytest.fixture
def links():
    return AccountLinkStore()


@pytest.fixture
def processor(service, links):
    return ChatProcessor(service, links)


@pytest.mark.asyncio
async def test_connect_returns_authorization_url_without_asking_for_keys(processor, service):
    service.init_oauth = AsyncMock(
        return_value={
            "session_id": "sess_abc123",
            "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=test&state=sess_abc123.xyz",
            "state": "sess_abc123.xyz",
            "expires_in_seconds": 600,
            "sender_address": SENDER,
        }
    )

    reply = await processor.process("connect my account", SENDER)

    assert "https://accounts.google.com" in reply
    assert "You will not need to share an API key in this chat" in reply
    assert "AUTH-" in reply
    assert processor._links.get_pending_session(SENDER) == "sess_abc123"


@pytest.mark.asyncio
async def test_handoff_code_completes_linking(processor, service):
    processor._links.set_pending_session(SENDER, "sess_abc123")

    fake_access_token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c3JfMSJ9.signature12345678901234567890"
    fake_refresh_token = "asi_rf_secret_refresh_token_1234567890"
    service.exchange_oauth = AsyncMock(
        return_value={
            "access_token": fake_access_token,
            "refresh_token": fake_refresh_token,
            "token_type": "bearer",
            "expires_in": 900,
            "user": {
                "id": "usr_1",
                "email": "developer@example.com",
            },
        }
    )

    reply = await processor.process("AUTH-A1B2C3D4", SENDER)

    assert "connected successfully" in reply
    assert "d***@example.com" in reply
    # Secrets should NEVER appear in plain text in chat
    assert fake_access_token not in reply
    assert fake_refresh_token not in reply

    # Active token should be stored in link store
    assert processor._links.get_key(SENDER) == fake_access_token
    assert processor._links.get_refresh_token(SENDER) == fake_refresh_token


@pytest.mark.asyncio
async def test_automatic_token_renewal_on_401(processor, service):
    old_access = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJvbGQifQ.signature12345678901234567890"
    new_access = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJuZXcifQ.signature09876543210987654321"
    refresh_token = "asi_rf_valid_refresh_token_1234567890"

    processor._links.link(SENDER, old_access, refresh_token=refresh_token, user_email="dev@example.com")

    # First call with old_access raises AuthenticationError (expired)
    # Retry call with new_access succeeds
    call_count = 0

    async def mock_token_usage(token, time_range):
        nonlocal call_count
        call_count += 1
        if token == old_access:
            raise AuthenticationError("Token expired")
        return MonitoringResponse(
            summary=MonitoringSummary(
                totalTokens=5000,
                promptTokens=2000,
                completionTokens=3000,
                totalCost=0.0125,
                totalCount=10,
                successCount=10,
                errorCount=0,
                successRate=100.0,
                avgLatencyMs=120.0,
                p99LatencyMs=250.0,
            ),
            timeRange=time_range,
        )

    service.token_usage = AsyncMock(side_effect=mock_token_usage)
    service.refresh_tokens = AsyncMock(
        return_value={
            "access_token": new_access,
            "refresh_token": "asi_rf_new_rotated_token_1234567890",
            "token_type": "bearer",
            "expires_in": 900,
            "user": {"email": "dev@example.com"},
        }
    )


    reply = await processor.process("token usage", SENDER)

    # Auto-refresh occurred and query succeeded
    assert "Token usage" in reply
    assert "5,000" in reply
    assert call_count == 2
    # Verify link store updated to new token
    assert processor._links.get_key(SENDER) == new_access


@pytest.mark.asyncio
async def test_authorization_error_403_does_not_trigger_refresh(processor, service):
    token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c3IifQ.signature12345678901234567890"
    processor._links.link(SENDER, token, refresh_token="asi_rf_abc", user_email="dev@example.com")

    service.token_usage = AsyncMock(side_effect=AuthorizationError("Forbidden: Insufficient privileges"))
    service.refresh_tokens = AsyncMock()

    reply = await processor.process("token usage", SENDER)

    assert "forbidden (403)" in reply.lower()
    # Refresh must NOT be triggered on 403
    service.refresh_tokens.assert_not_called()


@pytest.mark.asyncio
async def test_failed_refresh_requires_reconnection(processor, service):
    token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c3IifQ.signature12345678901234567890"
    processor._links.link(SENDER, token, refresh_token="asi_rf_revoked", user_email="dev@example.com")

    service.token_usage = AsyncMock(side_effect=AuthenticationError("Token expired"))
    service.refresh_tokens = AsyncMock(side_effect=AuthenticationError("Refresh token revoked"))

    reply = await processor.process("token usage", SENDER)

    assert "rejected" in reply.lower() or "reconnect" in reply.lower()
    # Session must be unlinked
    assert processor._links.get_key(SENDER) is None


@pytest.mark.asyncio
async def test_unlink_revokes_backend_session(processor, service):
    token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c3IifQ.signature12345678901234567890"
    refresh_token = "asi_rf_logout_test_1234567890"
    processor._links.link(SENDER, token, refresh_token=refresh_token, user_email="dev@example.com")

    service.logout = AsyncMock(return_value={"status": "success"})

    reply = await processor.process("unlink", SENDER)

    assert "unlinked" in reply.lower()
    assert "revoked" in reply.lower()
    service.logout.assert_called_once_with(refresh_token)
    assert processor._links.get_key(SENDER) is None
