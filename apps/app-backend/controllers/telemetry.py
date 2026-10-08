from database import db
from schemas.telemetry import MetricPayload


class TelemetryController:
    """Controller handling business logic for telemetry data"""

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
    def get_history(limit: int = 50):
        """Returns recent telemetry records."""
        records = db.get_all_metrics(limit=limit)
        return {
            "count": len(records),
            "data": records,
        }

    @staticmethod
    def get_summary():
        """Returns aggregated telemetry KPIs."""
        return db.get_summary()

    @staticmethod
    def get_health():
        """Returns backend and ClickHouse connection status."""
        return {
            "status": "healthy",
            "clickhouse_connected": db.is_connected,
            "total_records": len(db.memory_records),
        }
