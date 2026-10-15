from typing import Optional
from fastapi import APIRouter
from controllers.telemetry import TelemetryController
from controllers.llm import LLMController
from controllers.health import HealthController
from schemas.telemetry import MetricPayload, LLMTracePayload

router = APIRouter(prefix="/api", tags=["Telemetry"])


# --- SDK Telemetry Metrics ---

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


@router.delete("/traces")
def delete_traces(ids: Optional[str] = None):
    """Deletes specific traces by comma-separated IDs or clears all tool traces if ids parameter is omitted."""
    trace_ids = [i.strip() for i in ids.split(",") if i.strip()] if ids else None
    return TelemetryController.delete_traces(trace_ids)


@router.delete("/traces/{trace_id}")
def delete_single_trace(trace_id: str):
    """Deletes a single tool trace by trace ID."""
    return TelemetryController.delete_traces([trace_id])


# --- LLM Tracing & Monitoring ---

@router.post("/llm/traces", status_code=201)
def ingest_llm_trace(payload: LLMTracePayload):
    """Ingests single or root LLM execution trace into ClickHouse."""
    return LLMController.ingest_llm_trace(payload)


@router.get("/llm/traces")
def get_llm_traces(
    limit: int = 100,
    search: Optional[str] = None,
    status: Optional[str] = None,
    model: Optional[str] = None,
):
    """Retrieves LLM traces from ClickHouse with LangSmith-like filtering and summary stats."""
    return LLMController.get_llm_traces(
        limit=limit,
        search=search,
        status=status,
        model=model,
    )


@router.get("/llm/monitoring")
@router.get("/llm/metrics")
def get_llm_monitoring(
    model: Optional[str] = None,
    limit: int = 2000,
):
    """Calculates and aggregates all LLM metrics, KPIs, and chart series on the backend."""
    return LLMController.get_llm_monitoring_data(
        model=model,
        limit=limit,
    )


@router.delete("/llm/traces")
def clear_llm_traces():
    """Clears all LLM traces stored in ClickHouse and memory."""
    return LLMController.clear_llm_traces()


# --- System Health ---

@router.get("/health")
def health_check():
    """Health check endpoint showing ClickHouse database status."""
    return HealthController.get_health()
