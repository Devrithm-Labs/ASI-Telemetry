from fastapi import APIRouter
from controllers.telemetry import TelemetryController
from schemas.telemetry import MetricPayload

router = APIRouter(prefix="/api", tags=["Telemetry"])


@router.post("/metrics", status_code=201)
@router.post("/telemetry", status_code=201)
def ingest_metrics(payload: MetricPayload):
    """Ingests SDK telemetry metrics and stores them into ClickHouse."""
    return TelemetryController.ingest_metric(payload)


@router.get("/metrics")
def get_metrics(limit: int = 50):
    """Returns recent telemetry events from ClickHouse."""
    return TelemetryController.get_history(limit=limit)


@router.get("/metrics/summary")
def get_metrics_summary():
    """Returns summarized KPIs (total requests, success, latency, resources)."""
    return TelemetryController.get_summary()


@router.get("/health")
def health_check():
    """Health check endpoint showing ClickHouse database status."""
    return TelemetryController.get_health()
