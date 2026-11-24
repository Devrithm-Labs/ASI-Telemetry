from typing import Any, Dict, List, Optional

from app.repositories.telemetry import TelemetryRepository, telemetry_repo


class TelemetryService:
    """Business logic for SDK telemetry ingestion, dashboards, and agent KPIs."""

    def __init__(self, repo: TelemetryRepository = telemetry_repo):
        self.repo = repo

    def ingest_metric(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return self.repo.insert_metric(payload)

    def ingest_batch(self, payloads: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return self.repo.insert_metrics_batch(payloads)

    def get_dashboard_data(
        self,
        time_range: str = "7d",
        limit: int = 500,
        agent_name: Optional[str] = None,
        func_name: Optional[str] = None,
        user_id: Optional[str] = None,
        hours: Optional[int] = None,
        agent_address: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self.repo.get_dashboard_data(
            time_range=time_range,
            limit=limit,
            agent_name=agent_name,
            func_name=func_name,
            user_id=user_id,
            hours=hours,
            agent_address=agent_address,
        )

    def get_traces(
        self,
        page: int = 1,
        limit: int = 50,
        status: Optional[str] = None,
        func_name: Optional[str] = None,
        agent_name: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self.repo.get_traces(
            page=page,
            limit=limit,
            status=status,
            func_name=func_name,
            agent_name=agent_name,
            user_id=user_id,
        )

    def delete_traces(
        self,
        trace_ids: Optional[List[str]] = None,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self.repo.delete_traces(trace_ids=trace_ids, user_id=user_id)

    def get_agent_summary(
        self, agent_address: Optional[str] = None, user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        return self.repo.get_agent_summary(
            agent_address=agent_address, user_id=user_id
        )

    def count_metrics(self, user_id: Optional[str] = None) -> int:
        return self.repo.count_metrics(user_id=user_id)


telemetry_service = TelemetryService()
