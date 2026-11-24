from typing import Optional
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.deps import get_current_user, resolve_request_user_id
from app.schemas.telemetry import MetricPayload
from app.schemas.user import UserResponse
from app.services.telemetry import telemetry_service

logger = logging.getLogger("asi_telemetry.api.telemetry")
router = APIRouter(tags=["Telemetry"])


@router.post("/metrics", status_code=201)
@router.post("/telemetry", status_code=201)
def ingest_metrics(payload: MetricPayload, request: Request):
    """Ingests SDK telemetry metrics and stores them into PostgreSQL linked to user account."""
    payload_dict = payload.model_dump()
    user_id = resolve_request_user_id(request, payload_dict)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid API Key (X-API-Key header) or Bearer token.",
        )
    payload_dict["user_id"] = user_id
    try:
        record = telemetry_service.ingest_metric(payload_dict)
        return {
            "status": "success",
            "message": "Telemetry metric stored in PostgreSQL",
            "data": record,
        }
    except RuntimeError as e:
        logger.error(f"Database error in ingest_metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is unavailable. Please check your PostgreSQL connection.",
        )


@router.get("/dashboard")
def get_dashboard_data(
    time_range: str = "7d",
    limit: int = 500,
    agent_name: Optional[str] = None,
    func_name: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user),
):
    """Unified endpoint returning pre-calculated summary KPIs, time-series, traces, and application metadata for authenticated user."""
    try:
        return telemetry_service.get_dashboard_data(
            time_range=time_range,
            limit=limit,
            agent_name=agent_name,
            func_name=func_name,
            user_id=current_user.id,
        )
    except RuntimeError as e:
        logger.error(f"Database error in get_dashboard_data: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is unavailable. Please check your PostgreSQL connection.",
        )


@router.get("/traces")
def get_traces(
    page: int = 1,
    limit: int = 50,
    status_filter: Optional[str] = None,
    func_name: Optional[str] = None,
    agent_name: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user),
):
    """Fetches paginated telemetry traces for authenticated user."""
    try:
        return telemetry_service.get_traces(
            page=page,
            limit=limit,
            status=status_filter,
            func_name=func_name,
            agent_name=agent_name,
            user_id=current_user.id,
        )
    except RuntimeError as e:
        logger.error(f"Database error in get_traces: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is unavailable. Please check your PostgreSQL connection.",
        )


@router.delete("/traces")
def delete_traces(
    ids: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user),
):
    """Deletes specific traces by comma-separated IDs or clears all tool traces for the user."""
    trace_ids = [i.strip() for i in ids.split(",") if i.strip()] if ids else None
    try:
        return telemetry_service.delete_traces(trace_ids=trace_ids, user_id=current_user.id)
    except RuntimeError as e:
        logger.error(f"Database error in delete_traces: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is unavailable. Please check your PostgreSQL connection.",
        )


@router.delete("/traces/{trace_id}")
def delete_single_trace(
    trace_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    """Deletes a single tool trace by trace ID for authenticated user."""
    try:
        return telemetry_service.delete_traces(trace_ids=[trace_id], user_id=current_user.id)
    except RuntimeError as e:
        logger.error(f"Database error in delete_single_trace: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is unavailable. Please check your PostgreSQL connection.",
        )


@router.get("/agents/{agent_address}/summary")
def get_agent_summary(
    agent_address: str,
    current_user: UserResponse = Depends(get_current_user),
):
    """Returns summary KPIs for a specific agent for authenticated user."""
    try:
        return telemetry_service.get_agent_summary(agent_address=agent_address, user_id=current_user.id)
    except RuntimeError as e:
        logger.error(f"Database error in get_agent_summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is unavailable. Please check your PostgreSQL connection.",
        )
