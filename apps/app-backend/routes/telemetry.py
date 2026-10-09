from fastapi import APIRouter
from controllers.telemetry import TelemetryController
from schemas.telemetry import MetricPayload

router = APIRouter(prefix="/api", tags=["Telemetry"])


@router.post("/metrics", status_code=201)
@router.post("/telemetry", status_code=201)
def ingest_metrics(payload: MetricPayload):
    """Ingests SDK telemetry metrics and stores them into ClickHouse."""
    return TelemetryController.ingest_metric(payload)


@router.get("/dashboard")
def get_dashboard_data(
    time_range: str = "7d",
    limit: int = 500,
    agent_name: str = None,
    func_name: str = None,
):
    """Unified endpoint returning pre-calculated summary KPIs, time-series, traces, and application metadata."""
    return TelemetryController.get_dashboard_payload(
        time_range=time_range,
        limit=limit,
        agent_name=agent_name,
        func_name=func_name,
    )


@router.get("/health")
def health_check():
    """Health check endpoint showing ClickHouse database status."""
    return TelemetryController.get_health()
