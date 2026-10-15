from typing import Optional
from fastapi import APIRouter
from controllers.llm import LLMController
from schemas.llm import LLMTracePayload

router = APIRouter(prefix="/api/llm", tags=["LLM Traces & Monitoring"])


@router.post("/traces", status_code=201)
def ingest_llm_trace(payload: LLMTracePayload):
    """Ingests single or root LLM execution trace into ClickHouse."""
    return LLMController.ingest_llm_trace(payload)


@router.get("/traces")
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


@router.get("/monitoring")
@router.get("/metrics")
def get_llm_monitoring(
    time_range: str = "7d",
    model: Optional[str] = None,
    limit: int = 2000,
):
    """Calculates and aggregates all LLM metrics, KPIs, and chart series on the backend."""
    return LLMController.get_llm_monitoring_data(
        time_range=time_range,
        model=model,
        limit=limit,
    )



@router.delete("/traces")
def clear_llm_traces():
    """Clears all LLM traces stored in ClickHouse and memory."""
    return LLMController.clear_llm_traces()
