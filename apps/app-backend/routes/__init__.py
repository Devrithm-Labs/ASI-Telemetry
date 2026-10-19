from routes.telemetry import router as telemetry_router
from routes.llm import router as llm_router
from routes.health import router as health_router
from routes.auth import router as auth_router
from routes.api_keys import router as api_keys_router

__all__ = ["telemetry_router", "llm_router", "health_router", "auth_router", "api_keys_router"]

