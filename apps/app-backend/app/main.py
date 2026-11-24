from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.db.session import db_manager, initialize_schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager managing startup and shutdown."""
    setup_logging()
    # Connect to PostgreSQL and verify schema tables
    db_manager.connect()
    initialize_schema(db_manager)
    yield
    # Graceful shutdown
    db_manager.disconnect()


def create_app() -> FastAPI:
    """Factory creating and configuring the FastAPI application."""
    application = FastAPI(
        title="ASI-Telemetry Backend",
        description="Clean Architecture PostgreSQL Telemetry and Observability Backend for AI Agents with SQLAlchemy ORM",
        version="1.0.0",
        lifespan=lifespan,
    )

    # Allowed CORS Origins - restricted for production security
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
    ]
    if settings.FRONTEND_BASE_URL:
        allowed_origins.append(settings.FRONTEND_BASE_URL.rstrip("/"))

    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(set(allowed_origins)),
        allow_origin_regex=r"^https://.*\.vercel\.app$",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
    )

    # Mount v1 API router under /api/v1 and /api (for frontend & SDK backwards compatibility)
    application.include_router(api_v1_router, prefix="/api/v1")
    application.include_router(api_v1_router, prefix="/api")

    @application.get("/")
    def root():
        return {
            "status": "online",
            "message": "ASI-Telemetry Backend is running. Open /docs for Swagger UI.",
            "version": "1.0.0",
            "database_connected": db_manager.is_connected,
        }

    return application


app = create_app()

__all__ = ["app", "create_app"]
