"""Compatibility shim for auth router."""
from api.auth import (
    router,
    router as auth_router,
    signup_endpoint,
    login_endpoint,
    current_user_endpoint,
    update_profile_endpoint,
    oauth_agent_init_endpoint,
    connect_portal_endpoint,
    oauth_callback_endpoint,
    oauth_agent_exchange_endpoint,
    refresh_tokens_endpoint,
    logout_endpoint,
)

__all__ = [
    "router",
    "auth_router",
    "signup_endpoint",
    "login_endpoint",
    "current_user_endpoint",
    "update_profile_endpoint",
    "oauth_agent_init_endpoint",
    "connect_portal_endpoint",
    "oauth_callback_endpoint",
    "oauth_agent_exchange_endpoint",
    "refresh_tokens_endpoint",
    "logout_endpoint",
]
