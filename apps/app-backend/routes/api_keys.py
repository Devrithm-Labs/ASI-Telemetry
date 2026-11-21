"""Compatibility shim for api_keys router."""
from api.api_keys import router, router as api_keys_router

__all__ = ["router", "api_keys_router"]
