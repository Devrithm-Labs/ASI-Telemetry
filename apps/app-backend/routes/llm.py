from typing import Optional
from fastapi import APIRouter, Request
from controllers.llm import LLMController
from schemas.llm import LLMTracePayload
from auth.dependencies import resolve_request_user_id

router = APIRouter(prefix="/api/llm", tags=["LLM Traces & Monitoring"])


@router.post("/traces", status_code=201)
def ingest_llm_trace(payload: LLMTracePayload, request: Request):
    """Ingests single or root LLM execution trace into ClickHouse linked to user account."""
    payload_dict = payload.model_dump()
    user_id = resolve_request_user_id(request, payload_dict)
    if user_id:
        payload_dict["user_id"] = user_id
    return LLMController.ingest_llm_trace(payload_dict)


@router.get("/traces")
def get_llm_traces(
    request: Request,
    limit: int = 100,
    search: Optional[str] = None,
    status: Optional[str] = None,
    model: Optional[str] = None,
):
    """Retrieves LLM traces from ClickHouse with user scoping and LangSmith-like filtering."""
    user_id = resolve_request_user_id(request)
    return LLMController.get_llm_traces(
        limit=limit,
        search=search,
        status=status,
        model=model,
        user_id=user_id,
    )


@router.get("/monitoring")
@router.get("/metrics")
def get_llm_monitoring(
    request: Request,
    time_range: str = "7d",
    model: Optional[str] = None,
    limit: int = 2000,
):
    """Calculates and aggregates all user-scoped LLM metrics, KPIs, and chart series."""
    user_id = resolve_request_user_id(request)
    return LLMController.get_llm_monitoring_data(
        time_range=time_range,
        model=model,
        limit=limit,
        user_id=user_id,
    )


@router.delete("/traces")
def clear_llm_traces(request: Request):
    """Clears all LLM traces stored for the requesting user."""
    user_id = resolve_request_user_id(request)
    return LLMController.clear_llm_traces(user_id=user_id)