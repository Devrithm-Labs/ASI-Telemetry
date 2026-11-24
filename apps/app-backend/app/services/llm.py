from typing import Any, Dict, List, Optional

from app.repositories.llm import LLMRepository, llm_repo


class LLMService:
    """Business logic for LLM tracing, monitoring KPIs, and trace search."""

    def __init__(self, repo: LLMRepository = llm_repo):
        self.repo = repo

    def ingest_trace(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return self.repo.insert_llm_trace(payload)

    def get_traces(
        self,
        page: int = 1,
        limit: int = 50,
        run_type: Optional[str] = None,
        status: Optional[str] = None,
        model: Optional[str] = None,
        search: Optional[str] = None,
        trace_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self.repo.get_llm_traces(
            page=page,
            limit=limit,
            run_type=run_type,
            status=status,
            model=model,
            search=search,
            trace_id=trace_id,
            user_id=user_id,
        )

    def get_monitoring_data(
        self,
        user_id: Optional[str] = None,
        time_range: str = "24h",
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self.repo.get_llm_monitoring_data(
            user_id=user_id, time_range=time_range, model=model
        )

    def clear_traces(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        return self.repo.clear_llm_traces(user_id=user_id)

    def count_traces(self, user_id: Optional[str] = None) -> int:
        return self.repo.count_traces(user_id=user_id)


llm_service = LLMService()
