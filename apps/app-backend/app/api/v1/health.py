from fastapi import APIRouter

from app.db.session import db_manager
from app.schemas.telemetry import HealthResponse
from app.services.llm import llm_service
from app.services.telemetry import telemetry_service

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def health_check():
    """Healthcheck endpoint returning database and record metrics."""
    db_ok = db_manager.check_connection()
    total_metrics = telemetry_service.count_metrics()
    total_traces = llm_service.count_traces()

    return HealthResponse(
        status="healthy" if db_ok or db_manager.is_connected else "degraded",
        database_connected=db_ok or db_manager.is_connected,
        database_type="postgresql",
        postgres_connected=db_ok or db_manager.is_connected,
        total_records=total_metrics,
        total_llm_records=total_traces,
    )
