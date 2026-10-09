from typing import Optional
from database import db
from schemas.telemetry import MetricPayload


class TelemetryController:
    """Controller handling business logic and pre-aggregations for telemetry data."""

    @staticmethod
    def ingest_metric(payload: MetricPayload):
        """Processes and stores telemetry data from the SDK into ClickHouse."""
        record = db.insert_metric(payload.model_dump())
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
        """
        Unified endpoint that retrieves all dashboard data from ClickHouse in a single query
        filtered by date range (1h, 24h, 7d, 30d) and performs calculations.
        """
        
        data = db.get_dashboard_data(
            time_range=time_range,
            limit=limit,
            agent_name=agent_name,
            func_name=func_name,
        )
        
        return data

    @staticmethod
    def get_health():
        """Returns backend and ClickHouse connection status."""
        return {
            "status": "healthy",
            "clickhouse_connected": db.is_connected,
            "total_records": len(db.memory_records),
        }
