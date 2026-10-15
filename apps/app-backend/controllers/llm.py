from typing import Optional
from database.llm_repo import llm_repo
from schemas.telemetry import LLMTracePayload


class LLMController:
    """Controller handling business logic, filtering, and pre-aggregations for LLM traces."""

    @staticmethod
    def ingest_llm_trace(payload: LLMTracePayload):
        """Stores LLM tracing record into ClickHouse or memory fallback."""
        record = llm_repo.insert_llm_trace(payload.model_dump())
        return {
            "status": "success",
            "message": "LLM trace stored in ClickHouse",
            "data": record,
        }

    @staticmethod
    def get_llm_traces(
        limit: int = 100,
        search: Optional[str] = None,
        status: Optional[str] = None,
        model: Optional[str] = None,
    ):
        """Queries LLM traces from ClickHouse with summary aggregates."""
        return llm_repo.get_llm_traces(
            limit=limit,
            search=search,
            status=status,
            model=model,
        )

    @staticmethod
    def get_llm_monitoring_data(
        model: Optional[str] = None,
        limit: int = 2000,
    ):
        """Calculates and aggregates all LLM metrics, KPIs, and chart series on the backend."""
        return llm_repo.get_llm_monitoring_data(
            model=model,
            limit=limit,
        )

    @staticmethod
    def clear_llm_traces():
        """Clears all LLM traces from ClickHouse and memory."""
        return llm_repo.clear_llm_traces()
