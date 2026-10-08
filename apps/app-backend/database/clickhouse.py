import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List

import clickhouse_connect
from config import settings

logger = logging.getLogger("backend.clickhouse")
logging.basicConfig(level=logging.INFO)


class ClickHouseDB:
    def __init__(self):
        self.client = None
        self.is_connected = False
        # Memory fallback if ClickHouse is not currently running
        self.memory_records: List[Dict[str, Any]] = []

    def connect(self):
        """Connects to ClickHouse and creates table if needed."""
        try:
            self.client = clickhouse_connect.get_client(
                host=settings.CLICKHOUSE_HOST,
                port=settings.CLICKHOUSE_PORT,
                username=settings.CLICKHOUSE_USER,
                password=settings.CLICKHOUSE_PASSWORD,
                database=settings.CLICKHOUSE_DATABASE,
                secure=settings.CLICKHOUSE_SECURE,
                connect_timeout=3,
            )
            self._create_table()
            self.is_connected = True
            logger.info(f"Connected to ClickHouse at {settings.CLICKHOUSE_HOST}:{settings.CLICKHOUSE_PORT}")
        except Exception as e:
            self.is_connected = False
            self.client = None
            logger.warning(
                f"Could not connect to ClickHouse ({e}). Using in-memory fallback for now."
            )

    def _create_table(self):
        """Creates the telemetry_metrics table with timestamp in ClickHouse."""
        query = """
        CREATE TABLE IF NOT EXISTS telemetry_metrics (
            id String,
            timestamp DateTime64(3, 'UTC'),
            agent_name LowCardinality(String),
            func_name LowCardinality(String),
            status LowCardinality(String),
            latency_ms Float64,
            cpu_before Float64,
            cpu_after Float64,
            memory_before Float64,
            memory_after Float64,
            request_count UInt64,
            success_count UInt64,
            error_count UInt64,
            metadata String
        ) ENGINE = MergeTree()
        ORDER BY (timestamp, agent_name);
        """
        self.client.command(query)

    def insert_metric(self, payload_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inserts an SDK telemetry record into ClickHouse with UTC timestamp.
        """
        # Convert timestamp to datetime object
        dt_utc = datetime.now(timezone.utc)
        if payload_dict.get("timestamp"):
            try:
                dt_utc = datetime.fromisoformat(payload_dict["timestamp"].replace("Z", "+00:00"))
            except Exception:
                pass

        record_id = f"metric-{int(time.time() * 1000)}"

        record = {
            "id": record_id,
            "timestamp": dt_utc.isoformat(),
            "agent_name": payload_dict.get("agent_name", "assistant"),
            "func_name": payload_dict.get("func_name", "handle_message"),
            "status": payload_dict.get("status", "success"),
            "latency_ms": round(float(payload_dict.get("latency_ms", 0.0)), 2),
            "cpu_before": round(float(payload_dict.get("cpu_before", 0.0)), 2),
            "cpu_after": round(float(payload_dict.get("cpu_after", 0.0)), 2),
            "memory_before": round(float(payload_dict.get("memory_before", 0.0)), 2),
            "memory_after": round(float(payload_dict.get("memory_after", 0.0)), 2),
            "request_count": int(payload_dict.get("request_count", 1)),
            "success_count": int(payload_dict.get("success_count", 1)),
            "error_count": int(payload_dict.get("error_count", 0)),
            "metadata": payload_dict.get("metadata") or {},
        }

        # Keep in memory list for quick access
        self.memory_records.append(record)
        if len(self.memory_records) > 500:
            self.memory_records.pop(0)

        # Store in ClickHouse if connected
        if self.is_connected and self.client:
            try:
                row = [
                    record["id"],
                    dt_utc,
                    record["agent_name"],
                    record["func_name"],
                    record["status"],
                    record["latency_ms"],
                    record["cpu_before"],
                    record["cpu_after"],
                    record["memory_before"],
                    record["memory_after"],
                    record["request_count"],
                    record["success_count"],
                    record["error_count"],
                    json.dumps(record["metadata"]),
                ]
                self.client.insert(
                    "telemetry_metrics",
                    [row],
                    column_names=[
                        "id",
                        "timestamp",
                        "agent_name",
                        "func_name",
                        "status",
                        "latency_ms",
                        "cpu_before",
                        "cpu_after",
                        "memory_before",
                        "memory_after",
                        "request_count",
                        "success_count",
                        "error_count",
                        "metadata",
                    ],
                )
            except Exception as e:
                logger.error(f"ClickHouse insert error: {e}")

        return record

    def get_all_metrics(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetches the latest metrics."""
        if self.is_connected and self.client:
            try:
                res = self.client.query(f"""
                    SELECT
                        id, toString(timestamp), agent_name, func_name,
                        status, latency_ms, cpu_before, cpu_after,
                        memory_before, memory_after, request_count,
                        success_count, error_count, metadata
                    FROM telemetry_metrics
                    ORDER BY timestamp DESC
                    LIMIT {limit}
                """)
                results = []
                for row in reversed(res.result_rows):
                    meta = {}
                    try:
                        meta = json.loads(row[13]) if row[13] else {}
                    except Exception:
                        pass
                    results.append({
                        "id": row[0],
                        "timestamp": row[1],
                        "agent_name": row[2],
                        "func_name": row[3],
                        "status": row[4],
                        "latency_ms": row[5],
                        "cpu_before": row[6],
                        "cpu_after": row[7],
                        "memory_before": row[8],
                        "memory_after": row[9],
                        "request_count": row[10],
                        "success_count": row[11],
                        "error_count": row[12],
                        "metadata": meta,
                    })
                return results
            except Exception as e:
                logger.error(f"ClickHouse fetch error: {e}")

        return self.memory_records[-limit:]

    def get_summary(self) -> Dict[str, Any]:
        """Calculates basic summary KPIs."""
        if self.is_connected and self.client:
            try:
                res = self.client.query("""
                    SELECT
                        count() AS total_events,
                        max(request_count) AS max_req,
                        max(success_count) AS max_succ,
                        max(error_count) AS max_err,
                        round(avg(latency_ms), 2) AS avg_lat,
                        anyLast(cpu_after) AS last_cpu,
                        anyLast(memory_after) AS last_mem
                    FROM telemetry_metrics
                """)
                if res.result_rows and res.result_rows[0][0] > 0:
                    row = res.result_rows[0]
                    return {
                        "total_requests": row[1] or row[0],
                        "total_success": row[2] or 0,
                        "total_errors": row[3] or 0,
                        "avg_latency_ms": float(row[4] or 0.0),
                        "current_cpu": float(row[5] or 0.0),
                        "current_memory": float(row[6] or 0.0),
                    }
            except Exception as e:
                logger.error(f"ClickHouse summary error: {e}")

        # In-memory summary fallback
        total = len(self.memory_records)
        if total == 0:
            return {
                "total_requests": 0,
                "total_success": 0,
                "total_errors": 0,
                "avg_latency_ms": 0.0,
                "current_cpu": 0.0,
                "current_memory": 0.0,
            }

        succ = sum(1 for r in self.memory_records if r["status"] == "success")
        err = sum(1 for r in self.memory_records if r["status"] != "success")
        avg_lat = sum(r["latency_ms"] for r in self.memory_records) / total
        last = self.memory_records[-1]

        return {
            "total_requests": total,
            "total_success": succ,
            "total_errors": err,
            "avg_latency_ms": round(avg_lat, 2),
            "current_cpu": last["cpu_after"],
            "current_memory": last["memory_after"],
        }


# Global database instance
db = ClickHouseDB()
