import json
import logging
import math
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
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
        meta = payload_dict.get("metadata") or {}
        if payload_dict.get("agent_address"):
            meta["agent_address"] = payload_dict["agent_address"]
        user_id = str(payload_dict.get("user_id") or "")

        record = {
            "id": record_id,
            "timestamp": dt_utc.isoformat(),
            "agent_name": payload_dict.get("agent_name", "assistant"),
            "func_name": payload_dict.get("func_name", "handle_message"),
            "status": payload_dict.get("status", "success"),
            "response_time_ms": round(float(resp_time), 2),
            "memory_before": 0.0,
            "memory_after": 0.0,
            "metadata": meta,
            "user_id": user_id,
        }

        self.conn.memory_records.append(record)
        if len(self.conn.memory_records) > 500:
            self.conn.memory_records.pop(0)

        if self.conn.is_connected and self.conn.client:
            try:
                addr_val = meta.get("agent_address") or ""
                hdl_val = meta.get("agent_handle") or ""
                row = [
                    record["id"],
                    dt_utc,
                    record["agent_name"],
                    record["func_name"],
                    record["status"],
                    record["response_time_ms"],
                    record["memory_before"],
                    record["memory_after"],
                    json.dumps(record["metadata"]),
                    addr_val,
                    hdl_val,
                    user_id,
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
                        "memory_before",
                        "memory_after",
                        "metadata",
                        "agent_address",
                        "agent_handle",
                        "user_id",
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
        user_id: Optional[str] = None,
    ) -> str:
        clauses = []
        if user_id:
            safe_uid = "".join(c for c in user_id if c.isalnum() or c in ("-", "_", "."))
            clauses.append(f"user_id = '{safe_uid}'")
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
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Retrieves and computes unified dashboard telemetry data."""
        where_clause = self._build_where_clause(agent_name, func_name, time_range, user_id=user_id)
        safe_uid = "".join(c for c in user_id if c.isalnum() or c in ("-", "_", ".")) if user_id else None
        records: List[Dict[str, Any]] = []

        if self.conn.is_connected and self.conn.client:
            try:
                safe_limit = max(1, min(int(limit), 2000))
                res = self.conn.safe_query(f"""
                    SELECT
                        id, toString(timestamp), agent_name, func_name,
                        status, response_time_ms,
                        memory_before, memory_after, metadata
                    FROM telemetry_metrics
                    {where_clause}
                    ORDER BY timestamp DESC
                    LIMIT {safe_limit}
                """)

                for row in res.result_rows:
                    meta = {}
                    try:
                        meta = json.loads(row[8]) if row[8] else {}
                    except Exception:
                        meta = {}

                    records.append({
                        "id": row[0],
                        "timestamp": row[1][:19] if row[1] else "",
                        "agent_name": row[2] or "assistant",
                        "func_name": row[3] or "handle_message",
                        "status": row[4] or "success",
                        "response_time_ms": float(row[5] or 0.0),
                        "memory_before": float(row[6] or 0.0),
                        "memory_after": float(row[7] or 0.0),
                        "metadata": meta,
                    })
            except Exception as e:
                logger.error(f"ClickHouse get_dashboard_data error: {e}")

        # 1. Discover Applications & Respective Functions across entire fleet
        apps_map: Dict[str, set] = defaultdict(set)
        if self.conn.is_connected and self.conn.client:
            try:
                user_filter = f"WHERE user_id = '{safe_uid}'" if user_id else ""
                all_apps_res = self.conn.safe_query(f"SELECT DISTINCT agent_name, func_name FROM telemetry_metrics {user_filter}")
                for row in all_apps_res.result_rows:
                    if row[0]:
                        apps_map[row[0]].add(row[1] or "default")
            except Exception as e:
                logger.warning(f"Error discovering all applications: {e}")

        if not self.conn.is_connected:
            mem_src = [r for r in self.conn.memory_records if r.get("user_id") == user_id] if user_id else self.conn.memory_records
            for r in mem_src:
                if r.get("agent_name"):
                    apps_map[r["agent_name"]].add(r.get("func_name", "default"))

        applications = [
            {"agent_name": k, "functions": sorted(list(v))}
            for k, v in sorted(apps_map.items())
        ]

        # 2. Compute Lightweight Summary KPIs from filtered records
        total = len(records)
        succ = sum(1 for r in records if r["status"] == "success")
        err = total - succ
        avg_resp = round(sum(r["response_time_ms"] for r in records) / total, 2) if total else 0.0

        # Compute 30-day Uptime: "Percent of requests the agent replied to in the last 30 days."
        uptime_val = 100.0
        if self.conn.is_connected and self.conn.client:
            try:
                w_30d_list = ["timestamp >= now() - INTERVAL 30 DAY"]
                if user_id:
                    w_30d_list.append(f"user_id = '{safe_uid}'")
                if agent_name and agent_name not in ("All Applications", "all"):
                    safe_ag = "".join(c for c in agent_name if c.isalnum() or c in ("-", "_", "."))
                    w_30d_list.append(f"agent_name = '{safe_ag}'")
                w_30d_sql = "WHERE " + " AND ".join(w_30d_list)
                up_q = self.conn.safe_query(f"SELECT count(*), countIf(status = 'success') FROM telemetry_metrics {w_30d_sql}")
                if up_q.result_rows and up_q.result_rows[0][0]:
                    t30 = int(up_q.result_rows[0][0])
                    s30 = int(up_q.result_rows[0][1] or 0)
                    if t30 > 0:
                        uptime_val = round((s30 / t30) * 100, 1)
            except Exception as e:
                logger.warning(f"Error calculating 30d uptime: {e}")
                uptime_val = round(succ / total * 100, 1) if total else 100.0
        else:
            uptime_val = round(succ / total * 100, 1) if total else 100.0

        # Discover or generate agent address
        agent_address_map = {
            "weather-agent": "agent1qfzll7xq6t8d9rx5n3cnql32me650q2sakexpc979u0luhn702jh2af5mds",
            "assistant": "agent1qtj4m78hdr2dmldtssn7kw7gt0e3ycledny3cadpmdau9dmnv9a4yzjxcx0",
            "receiver": "agent1qfzll7xq6t8d9rx5n3cnql32me650q2sakexpc979u0luhn702jh2af5mds",
            "sender": "agent1qtj4m78hdr2dmldtssn7kw7gt0e3ycledny3cadpmdau9dmnv9a4yzjxcx0",
        }
        active_agent = agent_name or (records[0]["agent_name"] if records else "weather-agent")
        found_addr = None
        for r in records:
            m = r.get("metadata") or {}
            if m.get("agent_address"):
                found_addr = m["agent_address"]
                break

        agent_addr = found_addr or agent_address_map.get(active_agent) or f"agent1q{abs(hash(active_agent)):016x}4gkq"

        summary = {
            "total_requests": total,
            "total_success": succ,
            "total_errors": err,
            "success_rate": round(succ / total * 100, 1) if total else 100.0,
            "error_rate": round(err / total * 100, 1) if total else 0.0,
            "avg_response_time_ms": avg_resp,
            "uptime": uptime_val,
            "uptime_desc": "Percent of requests the agent replied to in the last 30 days.",
            "agent_address": agent_addr,
        }

        # 3. Compute Time-Series Buckets matching LLM Monitoring timeline
        now_dt = datetime.now().astimezone()
        time_range_norm = (time_range or "7d").lower()

        # Generate Timeline Ticks & Labels according to requested time_range
        if time_range_norm == "1h":
            # 6 ticks over 1 hour (every 12 mins)
            start_tick = now_dt - timedelta(hours=1)
            ticks = [start_tick + timedelta(minutes=12 * i) for i in range(6)]
            labels = []
            for i, dt in enumerate(ticks):
                if i == 0 or dt.date() != ticks[max(0, i - 1)].date():
                    labels.append(f"{dt.month}/{dt.day}/{str(dt.year)[-2:]}")
                else:
                    labels.append(dt.strftime("%I:%M %p").lstrip("0"))

        elif time_range_norm in ("24h", "1d"):
            # 6 ticks over 24 hours (every 4.8 hours)
            start_tick = now_dt - timedelta(hours=24)
            step = timedelta(hours=24) / 5
            ticks = [start_tick + step * i for i in range(6)]
            labels = []
            for i, dt in enumerate(ticks):
                if i == 0 or (i == len(ticks) - 1 and dt.date() != ticks[0].date()):
                    labels.append(f"{dt.month}/{dt.day}/{str(dt.year)[-2:]}")
                else:
                    labels.append(dt.strftime("%I %p").lstrip("0"))

        elif time_range_norm == "7d":
            # 7 daily ticks over 7 days (e.g. 10/11/26, 10/12/26, ...)
            start_tick = now_dt - timedelta(days=6)
            ticks = [start_tick + timedelta(days=i) for i in range(7)]
            labels = [f"{dt.month}/{dt.day}/{str(dt.year)[-2:]}" for dt in ticks]

        elif time_range_norm == "30d":
            # 6 ticks over 30 days (every 6 days)
            start_tick = now_dt - timedelta(days=30)
            ticks = [start_tick + timedelta(days=6 * i) for i in range(6)]
            labels = [f"{dt.month}/{dt.day}/{str(dt.year)[-2:]}" for dt in ticks]

        else:
            start_tick = now_dt - timedelta(days=30)
            ticks = [start_tick + timedelta(days=6 * i) for i in range(6)]
            labels = [f"{dt.month}/{dt.day}/{str(dt.year)[-2:]}" for dt in ticks]

        def get_record_local_dt(ts_val) -> Optional[datetime]:
            if not ts_val:
                return None
            if isinstance(ts_val, datetime):
                return ts_val.astimezone() if ts_val.tzinfo else ts_val.replace(tzinfo=timezone.utc).astimezone()
            try:
                cleaned = str(ts_val).replace("Z", "+00:00").replace(" ", "T")
                dt = datetime.fromisoformat(cleaned)
                return dt.astimezone() if dt.tzinfo else dt.replace(tzinfo=timezone.utc).astimezone()
            except Exception:
                return None

        # Group records into nearest tick bucket
        buckets_map: Dict[str, List[Dict[str, Any]]] = {lbl: [] for lbl in labels}
        for r in records:
            r_dt = get_record_local_dt(r.get("timestamp"))
            if not r_dt:
                continue
            closest_idx = min(range(len(ticks)), key=lambda idx: abs((r_dt - ticks[idx]).total_seconds()))
            buckets_map[labels[closest_idx]].append(r)

        req_data = []
        resp_data = []
        err_data = []

        for time_key in labels:
            items = buckets_map[time_key]
            n = len(items)
            succ_cnt = sum(1 for i in items if i["status"] == "success")
            fail_cnt = n - succ_cnt
            times = [i["response_time_ms"] for i in items]
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

            avg_latency = round(sum(times) / n, 1) if n > 0 else 0.0

            req_data.append({
                "time": time_key,
                "total": n,
                "success": succ_cnt,
                "failure": fail_cnt,
            })

            resp_data.append({
                "time": time_key,
                "avg": avg_latency,
                "latency": avg_latency,
                "p50": avg_latency,
                "p90": avg_latency,
                "p95": avg_latency,
                "p99": avg_latency,
                "slaLimit": 300,
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
                "errors": err_data,
            },
            "traces": traces,
            "applications": applications,
        }

    def delete_traces(self, trace_ids: Optional[List[str]] = None, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Deletes specific telemetry traces by ID or truncates/deletes telemetry_metrics for a user."""
        safe_uid = "".join(c for c in user_id if c.isalnum() or c in ("-", "_", ".")) if user_id else None
        if not trace_ids:
            if safe_uid:
                self.conn.memory_records = [r for r in self.conn.memory_records if r.get("user_id") != safe_uid]
                if self.conn.is_connected and self.conn.client:
                    try:
                        self.conn.safe_command(f"ALTER TABLE telemetry_metrics DELETE WHERE user_id = '{safe_uid}'")
                    except Exception as e:
                        logger.error(f"Error deleting telemetry_metrics for user: {e}")
                        return {"status": "error", "message": str(e)}
                return {"status": "success", "message": "User tracing data cleared successfully"}
            else:
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
                        cmd = f"ALTER TABLE telemetry_metrics DELETE WHERE id IN ({in_clause})"
                        if safe_uid:
                            cmd += f" AND user_id = '{safe_uid}'"
                        self.conn.safe_command(cmd)
                except Exception as e:
                    logger.error(f"Error deleting traces from ClickHouse: {e}")
                    return {"status": "error", "message": str(e)}
            return {"status": "success", "message": f"{len(trace_ids)} trace(s) deleted successfully"}


# Default repository instance
telemetry_repo = TelemetryRepository()
