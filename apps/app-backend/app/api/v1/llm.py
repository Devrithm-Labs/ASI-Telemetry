from typing import Optional
from fastapi import APIRouter, Request

from app.api.deps import resolve_request_user_id
from app.schemas.llm import LLMTracePayload
from app.services.llm import llm_service

router = APIRouter(prefix="/llm", tags=["LLM Traces & Monitoring"])


@router.post("/traces", status_code=201)
def ingest_llm_trace(payload: LLMTracePayload, request: Request):
    """Ingests single or root LLM execution trace into PostgreSQL linked to user account."""
    payload_dict = payload.model_dump()
    user_id = resolve_request_user_id(request, payload_dict)
    if user_id:
        payload_dict["user_id"] = user_id
    record = llm_service.ingest_trace(payload_dict)
    return {
        "status": "success",
        "message": "LLM trace stored in PostgreSQL",
        "data": record,
    }


@router.get("/traces")
def get_llm_traces(
    request: Request,
    page: int = 1,
    limit: int = 100,
    search: Optional[str] = None,
    status: Optional[str] = None,
    model: Optional[str] = None,
    trace_id: Optional[str] = None,
):
    """Retrieves LLM traces from PostgreSQL scoped to the requesting user."""
    user_id = resolve_request_user_id(request)
    if not user_id:
        return {
            "traces": [],
            "total": 0,
            "stats": {
                "total_traces": 0,
                "total_tokens": 0,
                "total_cost_usd": 0.0,
                "avg_latency_ms": 0.0,
            },
        }

    return llm_service.get_traces(
        page=page,
        limit=limit,
        search=search,
        status=status,
        model=model,
        trace_id=trace_id,
        user_id=user_id,
    )


@router.get("/monitoring")
def get_llm_monitoring(
    request: Request,
    time_range: str = "7d",
    model: Optional[str] = None,
):
    """Retrieves aggregated LLM monitoring data and KPIs scoped to the requesting user."""
    user_id = resolve_request_user_id(request)
    if not user_id:
        return {
            "summary": {
                "totalCount": 0,
                "totalTokens": 0,
                "promptTokens": 0,
                "completionTokens": 0,
                "totalCost": 0.0,
                "avgLatency": 0.0,
                "errorRate": 0.0,
            },
            "models": {},
            "traces": [],
        }

    return llm_service.get_monitoring_data(
        time_range=time_range,
        model=model,
        user_id=user_id,
    )


@router.delete("/traces")
def clear_llm_traces(request: Request):
    """Clears all LLM traces scoped to the requesting user."""
    user_id = resolve_request_user_id(request)
    return llm_service.clear_traces(user_id=user_id)
