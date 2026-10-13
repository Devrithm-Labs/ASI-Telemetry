<<<<<<< HEAD
from typing import Any, Dict, Optional
from database import db
from schemas.telemetry import MetricPayload, LLMTracePayload
=======
from typing import Optional
from database import db
from schemas.telemetry import MetricPayload
>>>>>>> 8394fde (Updated code Login SignUp)


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

<<<<<<< HEAD
    @staticmethod
    def ingest_llm_trace(payload: LLMTracePayload):
        """Stores LLM tracing record into ClickHouse or memory fallback."""
        record = db.insert_llm_trace(payload.model_dump())
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
        return db.get_llm_traces(
            limit=limit,
            search=search,
            status=status,
            model=model,
        )

    @staticmethod
    def clear_llm_traces():
        """Clears all LLM traces from ClickHouse and memory."""
        return db.clear_llm_traces()

=======
>>>>>>> 8394fde (Updated code Login SignUp)

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
<<<<<<< HEAD
            "total_llm_records": len(db.llm_records),
        }

=======
        }
>>>>>>> 8394fde (Updated code Login SignUp)
