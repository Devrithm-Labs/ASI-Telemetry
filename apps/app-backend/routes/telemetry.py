from typing import Optional
from fastapi import APIRouter
from controllers.telemetry import TelemetryController
from schemas.telemetry import MetricPayload, LLMTracePayload

router = APIRouter(prefix="/api", tags=["Telemetry"])


@router.post("/metrics", status_code=201)
@router.post("/telemetry", status_code=201)
def ingest_metrics(payload: MetricPayload):
    """Ingests SDK telemetry metrics and stores them into ClickHouse."""
    return TelemetryController.ingest_metric(payload)


@router.post("/llm/traces", status_code=201)
def ingest_llm_trace(payload: LLMTracePayload):
    """Ingests single or root LLM execution trace into ClickHouse."""
    return TelemetryController.ingest_llm_trace(payload)


@router.get("/llm/traces")
def get_llm_traces(
    limit: int = 100,
    search: Optional[str] = None,
    status: Optional[str] = None,
    model: Optional[str] = None,
):
    """Retrieves LLM traces from ClickHouse with LangSmith-like filtering and summary stats."""
    return TelemetryController.get_llm_traces(
        limit=limit,
        search=search,
        status=status,
        model=model,
    )


@router.delete("/llm/traces")
def clear_llm_traces():
    """Clears all LLM traces stored in ClickHouse and memory."""
    return TelemetryController.clear_llm_traces()


@router.delete("/traces")
def delete_traces(ids: Optional[str] = None):
    """Deletes specific traces by comma-separated IDs or clears all tool traces if ids parameter is omitted."""
    trace_ids = [i.strip() for i in ids.split(",") if i.strip()] if ids else None
    return TelemetryController.delete_traces(trace_ids)


@router.delete("/traces/{trace_id}")
def delete_single_trace(trace_id: str):
    """Deletes a single tool trace by trace ID."""
    return TelemetryController.delete_traces([trace_id])


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
