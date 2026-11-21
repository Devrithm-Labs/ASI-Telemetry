"""Compatibility shim for telemetry router."""
from api.telemetry import router, router as telemetry_router

__all__ = ["router", "telemetry_router"]
