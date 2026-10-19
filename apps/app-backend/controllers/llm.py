from typing import Optional
from database.llm import llm_repo
from schemas.telemetry import LLMTracePayload


class LLMController:
    """Controller handling business logic, filtering, and pre-aggregations for LLM traces."""

    @staticmethod
    def ingest_llm_trace(payload_data: dict):
        """Stores LLM tracing record into ClickHouse or memory fallback."""
        record = llm_repo.insert_llm_trace(payload_data)
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
        user_id: Optional[str] = None,
    ):
        """Queries LLM traces from ClickHouse with summary aggregates."""
        return llm_repo.get_llm_traces(
            limit=limit,
            search=search,
            status=status,
            model=model,
            user_id=user_id,
        )

    @staticmethod
    def get_llm_monitoring_data(
        time_range: str = "7d",
        model: Optional[str] = None,
        limit: int = 2000,
        user_id: Optional[str] = None,
    ):
        """Calculates and aggregates all LLM metrics, KPIs, and chart series on the backend."""
        return llm_repo.get_llm_monitoring_data(
            time_range=time_range,
            model=model,
            limit=limit,
            user_id=user_id,
        )

    @staticmethod
    def clear_llm_traces(user_id: Optional[str] = None):
        """Clears LLM traces from ClickHouse and memory for a user or globally."""
        return llm_repo.clear_llm_traces(user_id=user_id)
