import json
import logging
import math
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from config.database import ClickHouseConnection, db_connection

logger = logging.getLogger("backend.clickhouse.telemetry")


class TelemetryRepository:
    """Repository handling SDK telemetry metrics, dashboard time-series, and trace operations."""

    def __init__(self, conn: ClickHouseConnection = db_connection):
        self.conn = conn

    def insert_metric(self, payload_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Inserts an SDK telemetry record into ClickHouse with UTC timestamp."""
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

        self.conn.memory_records.append(record)
        if len(self.conn.memory_records) > 500:
            self.conn.memory_records.pop(0)

        if self.conn.is_connected and self.conn.client:
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
                self.conn.safe_insert(
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
        """Retrieves and computes unified dashboard telemetry data."""
        where_clause = self._build_where_clause(agent_name, func_name, time_range)
        records: List[Dict[str, Any]] = []

        if self.conn.is_connected and self.conn.client:
            try:
                safe_limit = max(1, min(int(limit), 2000))
                res = self.conn.safe_query(f"""
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

        # 1. Discover Applications & Respective Functions across entire fleet
        apps_map: Dict[str, set] = defaultdict(set)
        if self.conn.is_connected and self.conn.client:
            try:
                all_apps_res = self.conn.safe_query("SELECT DISTINCT agent_name, func_name FROM telemetry_metrics")
                for row in all_apps_res.result_rows:
                    if row[0]:
                        apps_map[row[0]].add(row[1] or "default")
            except Exception as e:
                logger.warning(f"Error discovering all applications: {e}")

        if not self.conn.is_connected:
            for r in self.conn.memory_records:
                if r.get("agent_name"):
                    apps_map[r["agent_name"]].add(r.get("func_name", "default"))

        applications = [
            {"agent_name": k, "functions": sorted(list(v))}
            for k, v in sorted(apps_map.items())
        ]

        # 2. Compute Summary KPIs
        total = len(records)
        succ = sum(1 for r in records if r["status"] == "success")
        err = total - succ
        avg_resp = round(sum(r["response_time_ms"] for r in records) / total, 2) if total else 0.0

        if self.conn.is_connected and self.conn.client:
            try:
                kpi_res = self.conn.safe_query(f"""
                    SELECT
                        count(*),
                        countIf(status = 'success'),
                        avg(response_time_ms)
                    FROM telemetry_metrics
                    {where_clause}
                """)
                if kpi_res.result_rows and kpi_res.result_rows[0][0] is not None:
                    row = kpi_res.result_rows[0]
                    db_total = int(row[0] or 0)
                    if db_total > 0:
                        total = db_total
                        succ = int(row[1] or 0)
                        err = total - succ
                        avg_resp = round(float(row[2] or 0.0), 2)
            except Exception as e:
                logger.warning(f"Error querying exact ClickHouse KPIs: {e}")

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
        chrono_records = sorted(records, key=lambda r: r["timestamp"])
        for r in chrono_records:
            ts = r["timestamp"]
            if time_range == "1h":
                time_key = ts[11:16] if len(ts) >= 16 else "now"
            elif time_range == "24h":
                time_key = (ts[11:13] + ":00") if len(ts) >= 13 else "now"
            elif time_range == "7d":
                time_key = (ts[5:13] + ":00") if len(ts) >= 13 else "now"
            elif time_range == "30d":
                time_key = ts[5:10] if len(ts) >= 10 else "now"
            else:
                time_key = ts[5:16] if len(ts) >= 16 else "now"
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

            c_timeout = 0
            c_ratelimit = 0
            c_server = 0
            c_validation = 0
            for i in items:
                if i["status"] != "success":
                    meta = i.get("metadata") or {}
                    status_code = meta.get("status_code") or meta.get("statusCode") or 500
                    err_str = str(meta.get("error") or meta.get("message") or i.get("status") or "").lower()
                    if status_code == 429 or "rate" in err_str or "429" in err_str:
                        c_ratelimit += 1
                    elif status_code == 504 or "timeout" in err_str or "timed out" in err_str or "504" in err_str:
                        c_timeout += 1
                    elif status_code in (400, 422) or "validation" in err_str or "schema" in err_str:
                        c_validation += 1
                    else:
                        c_server += 1

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
                "timeout": c_timeout,
                "rateLimit": c_ratelimit,
                "serverError": c_server,
                "validationError": c_validation,
            })

        # 4. Format Traces
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

    def delete_traces(self, trace_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        """Deletes specific telemetry traces by ID or truncates telemetry_metrics table."""
        if not trace_ids:
            self.conn.memory_records.clear()
            if self.conn.is_connected and self.conn.client:
                try:
                    self.conn.safe_command("TRUNCATE TABLE IF EXISTS telemetry_metrics")
                except Exception as e:
                    logger.error(f"Error truncating telemetry_metrics: {e}")
                    return {"status": "error", "message": str(e)}
            return {"status": "success", "message": "All tracing data cleared successfully"}
        else:
            ids_set = set(trace_ids)
            self.conn.memory_records = [r for r in self.conn.memory_records if r.get("id") not in ids_set]
            if self.conn.is_connected and self.conn.client:
                try:
                    safe_ids = ["'" + "".join(c for c in tid if c.isalnum() or c in ("-", "_", ".")) + "'" for tid in trace_ids]
                    if safe_ids:
                        in_clause = ", ".join(safe_ids)
                        self.conn.safe_command(f"DELETE FROM telemetry_metrics WHERE id IN ({in_clause})")
                except Exception as e:
                    logger.error(f"Error deleting traces from ClickHouse: {e}")
                    return {"status": "error", "message": str(e)}
            return {"status": "success", "message": f"{len(trace_ids)} trace(s) deleted successfully"}


# Default repository instance
telemetry_repo = TelemetryRepository()
