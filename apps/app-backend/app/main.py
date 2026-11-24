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

    # Enable CORS
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
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
        }

    return application


app = create_app()

__all__ = ["app", "create_app"]
