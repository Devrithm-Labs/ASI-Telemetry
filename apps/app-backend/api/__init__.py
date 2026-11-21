from fastapi import APIRouter

from api.telemetry import router as telemetry_router
from api.llm import router as llm_router
from api.health import router as health_router
from api.auth import router as auth_router
from api.api_keys import router as api_keys_router

# Aggregated router for modular mounting
api_router = APIRouter()
api_router.include_router(telemetry_router)
api_router.include_router(llm_router)
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(api_keys_router)

__all__ = [
    "api_router",
    "telemetry_router",
    "llm_router",
    "health_router",
    "auth_router",
    "api_keys_router",
]
