from typing import Optional, List
from database.telemetry import telemetry_repo
from schemas.telemetry import MetricPayload


class TelemetryController:
    """Controller handling business logic and pre-aggregations for SDK telemetry metrics."""

    @staticmethod
    def ingest_metric(payload: MetricPayload):
        """Processes and stores telemetry data from the SDK into ClickHouse."""
        record = telemetry_repo.insert_metric(payload.model_dump())
        return {
            "status": "success",
            "message": "Telemetry metric stored in ClickHouse",
            "data": record,
        }

    @staticmethod
    def get_dashboard_payload(
        time_range: str = "7d",
        limit: int = 500,
        agent_name: Optional[str] = None,
        func_name: Optional[str] = None,
    ):
        """Unified endpoint retrieving dashboard data and time-series from ClickHouse."""
        return telemetry_repo.get_dashboard_data(
            time_range=time_range,
            limit=limit,
            agent_name=agent_name,
            func_name=func_name,
        )

    @staticmethod
    def delete_traces(trace_ids: Optional[List[str]] = None):
        """Clears all or deletes specific tool/telemetry traces from ClickHouse and memory."""
        return telemetry_repo.delete_traces(trace_ids)
