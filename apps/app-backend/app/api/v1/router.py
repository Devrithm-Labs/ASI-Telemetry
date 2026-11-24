from fastapi import APIRouter

from app.api.v1.api_keys import router as api_keys_router
from app.api.v1.auth import router as auth_router
from app.api.v1.health import router as health_router
from app.api.v1.llm import router as llm_router
from app.api.v1.telemetry import router as telemetry_router
from app.api.v1.users import router as users_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(api_keys_router)
api_v1_router.include_router(telemetry_router)
api_v1_router.include_router(llm_router)
api_v1_router.include_router(health_router)

# Alias
router = api_v1_router

__all__ = [
    "api_v1_router",
    "router",
    "auth_router",
    "users_router",
    "api_keys_router",
    "telemetry_router",
    "llm_router",
    "health_router",
]
