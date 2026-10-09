import json
import logging
import math
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

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
        """Connects to ClickHouse and creates/updates table if needed."""
        try:
            self.client = clickhouse_connect.get_client(
                host=settings.CLICKHOUSE_HOST,
                port=settings.CLICKHOUSE_PORT,
                username=settings.CLICKHOUSE_USER,
                password=settings.CLICKHOUSE_PASSWORD,
                database=settings.CLICKHOUSE_DATABASE,
                secure=settings.CLICKHOUSE_SECURE,
                connect_timeout=5,
            )
            self._create_table()
            self._migrate_table()
            self.is_connected = True
            logger.info(f"Connected to ClickHouse at {settings.CLICKHOUSE_HOST}:{settings.CLICKHOUSE_PORT}")
        except Exception as e:
            self.is_connected = False
            self.client = None
            logger.warning(
                f"Could not connect to ClickHouse ({e}). Using in-memory fallback for now."
            )

    def _create_table(self):
        """Creates the telemetry_metrics table with response_time_ms."""
        query = """
        CREATE TABLE IF NOT EXISTS telemetry_metrics (
            id String,
            timestamp DateTime64(3, 'UTC'),
            agent_name LowCardinality(String),
            func_name LowCardinality(String),
            status LowCardinality(String),
            response_time_ms Float64,
            cpu_before Float64,
            cpu_after Float64,
            memory_before Float64,
            memory_after Float64,
            metadata String
        ) ENGINE = MergeTree()
        ORDER BY (timestamp, agent_name);
        """
        self.client.command(query)

    def _migrate_table(self):
        """Ensures table schema uses response_time_ms and drops legacy columns."""
        try:
            cols = [c[0] for c in self.client.query("DESCRIBE TABLE telemetry_metrics").result_rows]

            # 1. Add response_time_ms if not present
            if "response_time_ms" not in cols:
                self.client.command("ALTER TABLE telemetry_metrics ADD COLUMN IF NOT EXISTS response_time_ms Float64")
                if "latency_ms" in cols:
                    self.client.command("ALTER TABLE telemetry_metrics UPDATE response_time_ms = latency_ms WHERE response_time_ms = 0")

            # 2. Drop legacy columns
            for old_col in ["latency_ms", "request_count", "success_count", "error_count"]:
                if old_col in cols:
                    try:
                        self.client.command(f"ALTER TABLE telemetry_metrics DROP COLUMN IF EXISTS {old_col}")
                    except Exception:
                        pass
        except Exception as e:
            logger.debug(f"Column migration notice: {e}")

    def insert_metric(self, payload_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inserts an SDK telemetry record into ClickHouse with UTC timestamp.
        """
        dt_utc = datetime.now(timezone.utc)
        if payload_dict.get("timestamp"):
            try:
                dt_utc = datetime.fromisoformat(payload_dict["timestamp"].replace("Z", "+00:00"))
            except Exception:
                pass

        record_id = f"metric-{int(time.time() * 1000)}"

        resp_time = payload_dict.get("response_time_ms") or payload_dict.get("latency_ms") or 0.0
        cpu = payload_dict.get("cpu_after") or payload_dict.get("cpu_ms") or 0.0
        mem_after = payload_dict.get("memory_after") or payload_dict.get("memory_after_mb") or 0.0
        mem_before = payload_dict.get("memory_before") or payload_dict.get("memory_before_mb") or 0.0

        record = {
            "id": record_id,
            "timestamp": dt_utc.isoformat(),
            "agent_name": payload_dict.get("agent_name", "assistant"),
            "func_name": payload_dict.get("func_name", "handle_message"),
            "status": payload_dict.get("status", "success"),
            "response_time_ms": round(float(resp_time), 2),
            "cpu_before": round(float(mem_before), 2),
            "cpu_after": round(float(cpu), 2),
            "memory_before": round(float(mem_before), 2),
            "memory_after": round(float(mem_after), 2),
            "metadata": payload_dict.get("metadata") or {},
        }

        self.memory_records.append(record)
        if len(self.memory_records) > 500:
            self.memory_records.pop(0)

        if self.is_connected and self.client:
            try:
                row = [
                    record["id"],
                    dt_utc,
                    record["agent_name"],
                    record["func_name"],
                    record["status"],
                    record["response_time_ms"],
                    record["cpu_before"],
                    record["cpu_after"],
                    record["memory_before"],
                    record["memory_after"],
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
                        "response_time_ms",
                        "cpu_before",
                        "cpu_after",
                        "memory_before",
                        "memory_after",
                        "metadata",
                    ],
                )
            except Exception as e:
                logger.error(f"ClickHouse insert error: {e}")

        return record

    def _build_where_clause(
        self,
        agent_name: Optional[str] = None,
        func_name: Optional[str] = None,
        time_range: Optional[str] = None,
    ) -> str:
        clauses = []
        if agent_name and agent_name not in ("all-applications", "All Applications", "all"):
            safe_agent = "".join(c for c in agent_name if c.isalnum() or c in ("-", "_", "."))
            clauses.append(f"agent_name = '{safe_agent}'")
        if func_name and func_name not in ("all", "All Functions", "All"):
            safe_func = "".join(c for c in func_name if c.isalnum() or c in ("-", "_", "."))
            clauses.append(f"func_name = '{safe_func}'")

        if time_range == "1h":
            clauses.append("timestamp >= now() - INTERVAL 1 HOUR")
        elif time_range == "24h":
            clauses.append("timestamp >= now() - INTERVAL 24 HOUR")
        elif time_range == "7d":
            clauses.append("timestamp >= now() - INTERVAL 7 DAY")
        elif time_range == "30d":
            clauses.append("timestamp >= now() - INTERVAL 30 DAY")

        if clauses:
            return "WHERE " + " AND ".join(clauses)
        return ""

    def get_dashboard_data(
        self,
        time_range: str = "7d",
        limit: int = 500,
        agent_name: Optional[str] = None,
        func_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Retrieves telemetry records from ClickHouse in a single query filtered by
        date range (1h, 24h, 7d, 30d) and application/function, then performs all
        dashboard calculations (KPI summaries, quantiles, time-series, traces, discovery).
        """
        where_clause = self._build_where_clause(agent_name, func_name, time_range)
        records: List[Dict[str, Any]] = []

        if self.is_connected and self.client:
            try:
                safe_limit = max(1, min(int(limit), 2000))
                res = self.client.query(f"""
                    SELECT
                        id, toString(timestamp), agent_name, func_name,
                        status, response_time_ms, cpu_before, cpu_after,
                        memory_before, memory_after, metadata
                    FROM telemetry_metrics
                    {where_clause}
                    ORDER BY timestamp DESC
                    LIMIT {safe_limit}
                """)
                
                for row in res.result_rows:
                    meta = {}
                    try:
                        meta = json.loads(row[10]) if row[10] else {}
                    except Exception:
                        meta = {}

                    records.append({
                        "id": row[0],
                        "timestamp": row[1][:19] if row[1] else "",
                        "agent_name": row[2] or "assistant",
                        "func_name": row[3] or "handle_message",
                        "status": row[4] or "success",
                        "response_time_ms": float(row[5] or 0.0),
                        "cpu_before": float(row[6] or 0.0),
                        "cpu_after": float(row[7] or 0.0),
                        "memory_before": float(row[8] or 0.0),
                        "memory_after": float(row[9] or 0.0),
                        "metadata": meta,
                    })
            except Exception as e:
                logger.error(f"ClickHouse get_dashboard_data error: {e}")

        # In-memory fallback if ClickHouse is not connected or empty
        if not records and self.memory_records:
            filtered = self.memory_records
            if agent_name and agent_name not in ("all-applications", "All Applications", "all"):
                filtered = [r for r in filtered if r.get("agent_name") == agent_name]
            if func_name and func_name not in ("all", "All Functions", "All"):
                filtered = [r for r in filtered if r.get("func_name") == func_name]
            records = list(reversed(filtered))[:limit]

        # 1. Discover Applications & Respective Functions
        apps_map: Dict[str, set] = defaultdict(set)
        for r in records:
            apps_map[r["agent_name"]].add(r["func_name"])
        for r in self.memory_records:
            apps_map[r.get("agent_name", "assistant")].add(r.get("func_name", "handle_message"))

        if not apps_map:
            applications = [{"agent_name": "assistant", "functions": ["handle_message"]}]
        else:
            applications = [
                {"agent_name": k, "functions": sorted(list(v))}
                for k, v in sorted(apps_map.items())
            ]

        # 2. Compute Summary KPIs
        total = len(records)
        succ = sum(1 for r in records if r["status"] == "success")
        err = total - succ
        avg_resp = round(sum(r["response_time_ms"] for r in records) / total, 2) if total else 0.0
        latest = records[0] if records else {}

        summary = {
            "total_requests": total,
            "total_success": succ,
            "total_errors": err,
            "success_rate": round(succ / total * 100, 1) if total else 100.0,
            "error_rate": round(err / total * 100, 1) if total else 0.0,
            "avg_response_time_ms": avg_resp,
            "current_cpu": round(latest.get("cpu_after", 0.0), 1),
            "current_memory": round(latest.get("memory_after", 0.0), 1),
        }

        # 3. Compute Time-Series Buckets
        bucket_groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for r in reversed(records):
            ts = r["timestamp"]
            time_key = ts[11:16] + ":00" if len(ts) >= 16 else "now"
            bucket_groups[time_key].append(r)

        def calc_pct(arr: List[float], p: float) -> float:
            if not arr:
                return 0.0
            k = (len(arr) - 1) * p
            f, c = math.floor(k), math.ceil(k)
            return arr[f] if f == c else arr[f] * (c - k) + arr[c] * (k - f)

        req_data = []
        resp_data = []
        cpu_data = []
        err_data = []

        for time_key, items in bucket_groups.items():
            n = len(items)
            succ_cnt = sum(1 for i in items if i["status"] == "success")
            fail_cnt = n - succ_cnt
            times = sorted(i["response_time_ms"] for i in items)
            cpus = [i["cpu_after"] for i in items]
            mems = [i["memory_after"] for i in items]
            err_rate = round((fail_cnt / n * 100), 1) if n else 0.0

            req_data.append({
                "time": time_key,
                "total": n,
                "success": succ_cnt,
                "failure": fail_cnt,
            })

            resp_data.append({
                "time": time_key,
                "p50": round(calc_pct(times, 0.50)),
                "p90": round(calc_pct(times, 0.90)),
                "p95": round(calc_pct(times, 0.95)),
                "p99": round(calc_pct(times, 0.99)),
                "slaLimit": 300,
            })

            avg_cpu = sum(cpus) / n if n else 0.0
            avg_mem = sum(mems) / n if n else 0.0
            cpu_data.append({
                "time": time_key,
                "cpuPercent": round(avg_cpu),
                "memoryPercent": round(avg_mem),
                "coreLoad": round((avg_cpu / 100) * 4, 1),
            })

            err_data.append({
                "time": time_key,
                "errorRate": err_rate,
                "timeout": 0,
                "rateLimit": 0,
                "serverError": fail_cnt,
                "validationError": 0,
            })

        # 4. Format Traces (Top 50 latest)
        traces = []
        for r in records[:50]:
            resp_ms = r["response_time_ms"]
            is_ok = r["status"] == "success"
            traces.append({
                "id": r["id"],
                "name": r["func_name"],
                "service": r["agent_name"],
                "status": r["status"],
                "statusCode": 200 if is_ok else 500,
                "responseTimeMs": resp_ms,
                "latencyMs": resp_ms,
                "cpuPercent": r["cpu_after"],
                "tokens": 0,
                "model": "uAgent",
                "timestamp": r["timestamp"],
                "spans": [
                    {
                        "name": r["func_name"],
                        "durationMs": resp_ms,
                        "status": "ok" if is_ok else "error",
                    }
                ],
            })

        return {
            "summary": summary,
            "timeseries": {
                "requests": req_data,
                "response_time": resp_data,
                "cpu": cpu_data,
                "errors": err_data,
            },
            "traces": traces,
            "applications": applications,
        }


# Global database instance
db = ClickHouseDB()
