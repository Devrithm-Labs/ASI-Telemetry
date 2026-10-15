from config.database import db_connection


class HealthController:
    """Controller handling health checks and service connectivity status."""

    @staticmethod
    def get_health():
        """Returns backend and ClickHouse connection status."""
        return {
            "status": "healthy",
            "clickhouse_connected": db_connection.is_connected,
            "total_records": len(db_connection.memory_records),
            "total_llm_records": len(db_connection.llm_records),
        }
