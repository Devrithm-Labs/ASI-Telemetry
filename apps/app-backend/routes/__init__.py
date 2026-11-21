"""Backwards-compatibility shim for routes."""
from api import (
    telemetry_router,
    llm_router,
    health_router,
    auth_router,
    api_keys_router,
)

__all__ = [
    "telemetry_router",
    "llm_router",
    "health_router",
    "auth_router",
    "api_keys_router",
]
