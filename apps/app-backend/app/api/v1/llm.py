from typing import Optional
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.deps import get_current_user, resolve_request_user_id
from app.schemas.llm import LLMTracePayload
from app.schemas.user import UserResponse
from app.services.llm import llm_service

logger = logging.getLogger("asi_telemetry.api.llm")
router = APIRouter(prefix="/llm", tags=["LLM Traces & Monitoring"])


@router.post("/traces", status_code=201)
def ingest_llm_trace(payload: LLMTracePayload, request: Request):
    """Ingests single or root LLM execution trace into PostgreSQL linked to user account."""
    payload_dict = payload.model_dump()
    user_id = resolve_request_user_id(request, payload_dict)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid API Key (X-API-Key header) or Bearer token.",
        )
    payload_dict["user_id"] = user_id
    try:
        record = llm_service.ingest_trace(payload_dict)
        return {
            "status": "success",
            "message": "LLM trace stored in PostgreSQL",
            "data": record,
        }
    except RuntimeError as e:
        logger.error(f"Database error in ingest_llm_trace: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is unavailable. Please check your PostgreSQL connection.",
        )


@router.get("/traces")
def get_llm_traces(
    page: int = 1,
    limit: int = 100,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    model: Optional[str] = None,
    trace_id: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user),
):
    """Retrieves LLM traces from PostgreSQL scoped to the authenticated user."""
    try:
        return llm_service.get_traces(
            page=page,
            limit=limit,
            search=search,
            status=status_filter,
            model=model,
            trace_id=trace_id,
            user_id=current_user.id,
        )
    except RuntimeError as e:
        logger.error(f"Database error in get_llm_traces: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is unavailable. Please check your PostgreSQL connection.",
        )


@router.get("/monitoring")
def get_llm_monitoring(
    time_range: str = "7d",
    model: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user),
):
    """Retrieves aggregated LLM monitoring data and KPIs scoped to the authenticated user."""
    try:
        return llm_service.get_monitoring_data(
            time_range=time_range,
            model=model,
            user_id=current_user.id,
        )
    except RuntimeError as e:
        logger.error(f"Database error in get_llm_monitoring: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is unavailable. Please check your PostgreSQL connection.",
        )


@router.delete("/traces")
def clear_llm_traces(
    current_user: UserResponse = Depends(get_current_user),
):
    """Clears all LLM traces scoped to the authenticated user."""
    try:
        return llm_service.clear_traces(user_id=current_user.id)
    except RuntimeError as e:
        logger.error(f"Database error in clear_llm_traces: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is unavailable. Please check your PostgreSQL connection.",
        )
