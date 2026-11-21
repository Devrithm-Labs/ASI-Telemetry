"""Compatibility shim for health router."""
from api.health import router, router as health_router

__all__ = ["router", "health_router"]
