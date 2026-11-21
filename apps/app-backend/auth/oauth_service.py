"""Compatibility shim for OAuth service."""
from services.oauth_service import (
    create_agent_oauth_session,
    handle_google_oauth_callback,
    exchange_agent_oauth_session,
    refresh_application_tokens,
    logout_session,
    get_oauth_session,
    _oauth_sessions,
)

__all__ = [
    "create_agent_oauth_session",
    "handle_google_oauth_callback",
    "exchange_agent_oauth_session",
    "refresh_application_tokens",
    "logout_session",
    "get_oauth_session",
    "_oauth_sessions",
]
