from typing import Optional
from fastapi import APIRouter, Request
from controllers.telemetry import TelemetryController
from schemas.telemetry import MetricPayload
from auth.dependencies import resolve_request_user_id

router = APIRouter(prefix="/api", tags=["Telemetry"])


@router.post("/metrics", status_code=201)
@router.post("/telemetry", status_code=201)
def ingest_metrics(payload: MetricPayload, request: Request):
    """Ingests SDK telemetry metrics and stores them into ClickHouse linked to user account."""
    payload_dict = payload.model_dump()
    user_id = resolve_request_user_id(request, payload_dict)
    if user_id:
        payload_dict["user_id"] = user_id
    return TelemetryController.ingest_metric(payload_dict)


@router.get("/dashboard")
def get_dashboard_data(
    request: Request,
    time_range: str = "7d",
    limit: int = 500,
    agent_name: str = None,
    func_name: str = None,
):
    """Unified endpoint returning pre-calculated summary KPIs, time-series, traces, and application metadata for user."""
    user_id = resolve_request_user_id(request)
    if not user_id:
        return {
            "summary": {
                "totalRequests": 0,
                "errorCount": 0,
                "successCount": 0,
                "avgResponseTimeMs": 0.0,
                "p95ResponseTimeMs": 0.0,
                "totalCostUsd": 0.0,
                "successRate": 100.0,
            },
            "recentTraces": [],
            "applications": [],
            "timeSeries": [],
        }

    return TelemetryController.get_dashboard_payload(
        time_range=time_range,
        limit=limit,
        agent_name=agent_name,
        func_name=func_name,
        user_id=user_id,
    )


@router.delete("/traces")
def delete_traces(request: Request, ids: Optional[str] = None):
    """Deletes specific traces by comma-separated IDs or clears all tool traces for the user."""
    user_id = resolve_request_user_id(request)
    trace_ids = [i.strip() for i in ids.split(",") if i.strip()] if ids else None
    return TelemetryController.delete_traces(trace_ids, user_id=user_id)


@router.delete("/traces/{trace_id}")
def delete_single_trace(trace_id: str, request: Request):
    """Deletes a single tool trace by trace ID."""
    user_id = resolve_request_user_id(request)
    return TelemetryController.delete_traces([trace_id], user_id=user_id)
