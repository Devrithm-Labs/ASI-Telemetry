import json
import logging
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from config.database import ClickHouseConnection, db_connection

logger = logging.getLogger("backend.clickhouse.llm")


class LLMRepository:
    """Repository handling LLM traces, span storage, and monitoring pre-aggregations."""

    def __init__(self, conn: ClickHouseConnection = db_connection):
        self.conn = conn

    def insert_llm_trace(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Inserts a single LLM trace/span into ClickHouse llm_traces table (or memory fallback)."""
        now_dt = datetime.now(timezone.utc)
        record_id = payload.get("id") or str(uuid.uuid4())
        trace_id = payload.get("trace_id") or str(uuid.uuid4())
        span_id = payload.get("span_id") or str(uuid.uuid4())
        parent_id = payload.get("parent_id")
        name = payload.get("name") or "gemini_generate"
        run_type = payload.get("run_type") or "llm"
        status = payload.get("status") or "success"
        model = payload.get("model") or "gemini-3.8-flash"
        input_str = str(payload.get("input") or "")
        output_str = str(payload.get("output") or "")
        error_str = str(payload.get("error")) if payload.get("error") else None

        latency_ms = float(payload.get("latency_ms") or 0.0)
        tokens = payload.get("tokens") or {}
        prompt_tokens = int(payload.get("prompt_tokens") or tokens.get("input") or tokens.get("prompt") or 0)
        completion_tokens = int(payload.get("completion_tokens") or tokens.get("output") or tokens.get("completion") or 0)
        calc_total = prompt_tokens + completion_tokens
        total_tokens = calc_total if calc_total > 0 else int(payload.get("total_tokens") or tokens.get("total") or 0)
        cost_usd = float(payload.get("cost_usd") or payload.get("cost") or 0.0)

        metadata_str = json.dumps(payload.get("metadata") or {})

        record = {
            "id": record_id,
            "trace_id": trace_id,
            "span_id": span_id,
            "parent_id": parent_id,
            "name": name,
            "run_type": run_type,
            "status": status,
            "model": model,
            "input": input_str,
            "output": output_str,
            "error": error_str,
            "start_time": now_dt.isoformat(),
            "end_time": now_dt.isoformat(),
            "latency_ms": latency_ms,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "cost_usd": cost_usd,
            "metadata": metadata_str,
        }

        # 1. Store in memory fallback
        self.conn.llm_records.insert(0, record)
        if len(self.conn.llm_records) > 500:
            self.conn.llm_records.pop()

        # 2. Store in ClickHouse if connected
        if self.conn.is_connected and self.conn.client:
            try:
                row = [
                    record["id"],
                    record["trace_id"],
                    record["span_id"],
                    record["parent_id"],
                    record["name"],
                    record["run_type"],
                    record["status"],
                    record["model"],
                    record["input"],
                    record["output"],
                    record["error"],
                    now_dt,
                    now_dt,
                    record["latency_ms"],
                    record["prompt_tokens"],
                    record["completion_tokens"],
                    record["total_tokens"],
                    record["cost_usd"],
                    record["metadata"],
                ]
                self.conn.safe_insert(
                    "llm_traces",
                    [row],
                    column_names=[
                        "id",
                        "trace_id",
                        "span_id",
                        "parent_id",
                        "name",
                        "run_type",
                        "status",
                        "model",
                        "input",
                        "output",
                        "error",
                        "start_time",
                        "end_time",
                        "latency_ms",
                        "prompt_tokens",
                        "completion_tokens",
                        "total_tokens",
                        "cost_usd",
                        "metadata",
                    ],
                )
            except Exception as e:
                logger.error(f"Failed to insert into ClickHouse llm_traces: {e}")

        return record

    def get_llm_traces(
        self,
        limit: int = 100,
        search: Optional[str] = None,
        status: Optional[str] = None,
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Queries LLM traces from ClickHouse or memory fallback with metrics."""
        records = self.conn.llm_records

        if self.conn.is_connected and self.conn.client:
            try:
                where_clauses = []
                if status and status != "all":
                    where_clauses.append(f"status = '{status}'")
                if model:
                    where_clauses.append(f"model = '{model}'")
                if search:
                    where_clauses.append(f"(name ILIKE '%{search}%' OR input ILIKE '%{search}%' OR output ILIKE '%{search}%')")

                where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
                sql = f"SELECT * FROM llm_traces {where_sql} ORDER BY start_time DESC LIMIT {limit}"

                result = self.conn.safe_query(sql)
                cols = result.column_names
                db_records = []
                for row in result.result_rows:
                    item = dict(zip(cols, row))
                    if isinstance(item.get("start_time"), datetime):
                        item["start_time"] = item["start_time"].isoformat()
                    if isinstance(item.get("end_time"), datetime):
                        item["end_time"] = item["end_time"].isoformat()
                    db_records.append(item)
                if db_records:
                    records = db_records
            except Exception as e:
                logger.warning(f"ClickHouse query error for llm_traces: {e}")

        # In-memory filter if using memory records
        filtered = records
        if search:
            q = search.lower()
            filtered = [r for r in filtered if q in r.get("name", "").lower() or q in str(r.get("input", "")).lower() or q in str(r.get("output", "")).lower()]
        if status and status != "all":
            filtered = [r for r in filtered if r.get("status") == status]
        if model:
            filtered = [r for r in filtered if r.get("model") == model]

        traces_slice = filtered[:limit]

        total_tokens = sum(r.get("total_tokens", 0) for r in filtered)
        total_cost = sum(r.get("cost_usd", 0.0) for r in filtered)
        avg_latency = (
            sum(r.get("latency_ms", 0.0) for r in filtered) / (len(filtered) or 1)
        )

        return {
            "traces": traces_slice,
            "total": len(filtered),
            "stats": {
                "total_traces": len(filtered),
                "total_tokens": total_tokens,
                "total_cost_usd": round(total_cost, 6),
                "avg_latency_ms": round(avg_latency, 2),
            },
        }

    def get_llm_monitoring_data(
        self,
        model: Optional[str] = None,
        limit: int = 2000,
    ) -> Dict[str, Any]:
        """Calculates all LLM monitoring metrics, KPIs, and chart time-series in the backend."""
        records: List[Dict[str, Any]] = []
        distinct_models: List[str] = []

        if self.conn.is_connected and self.conn.client:
            try:
                model_res = self.conn.safe_query("SELECT DISTINCT model FROM llm_traces WHERE model != '' ORDER BY model ASC")
                distinct_models = [row[0] for row in model_res.result_rows if row[0]]

                where_clauses = []
                if model and model not in ("All Models", "all", "All"):
                    safe_model = model.replace("'", "\\'")
                    where_clauses.append(f"model = '{safe_model}'")

                where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
                sql = f"SELECT * FROM llm_traces {where_sql} ORDER BY start_time ASC LIMIT {limit}"
                result = self.conn.safe_query(sql)
                cols = result.column_names
                for row in result.result_rows:
                    item = dict(zip(cols, row))
                    if isinstance(item.get("start_time"), datetime):
                        item["start_time"] = item["start_time"].isoformat()
                    if isinstance(item.get("end_time"), datetime):
                        item["end_time"] = item["end_time"].isoformat()
                    records.append(item)
            except Exception as e:
                logger.warning(f"ClickHouse query error in get_llm_monitoring_data: {e}")

        if not records and self.conn.llm_records:
            mem = sorted(self.conn.llm_records, key=lambda r: str(r.get("start_time", "")))
            distinct_models = sorted(list(set(r.get("model") for r in mem if r.get("model"))))
            if model and model not in ("All Models", "all", "All"):
                mem = [r for r in mem if r.get("model") == model]
            records = mem[:limit]

        models = ["All Models"] + [m for m in distinct_models if m != "All Models"]

        total_count = len(records)
        error_count = sum(1 for r in records if r.get("status") == "error")
        success_count = total_count - error_count
        success_rate = round((success_count / total_count) * 100, 1) if total_count > 0 else 100.0
        prompt_tokens = sum(int(r.get("prompt_tokens") or 0) for r in records)
        completion_tokens = sum(int(r.get("completion_tokens") or 0) for r in records)
        calc_tokens = prompt_tokens + completion_tokens
        total_tokens = calc_tokens if calc_tokens > 0 else sum(int(r.get("total_tokens") or 0) for r in records)
        total_cost = round(sum(float(r.get("cost_usd") or 0.0) for r in records), 6)
        avg_latency_ms = (
            round(sum(float(r.get("latency_ms") or 0.0) for r in records) / total_count, 1)
            if total_count > 0
            else 0.0
        )

        latencies = sorted([float(r.get("latency_ms") or 0.0) for r in records])
        if latencies:
            p99_idx = min(int(len(latencies) * 0.99), len(latencies) - 1)
            p99_latency_ms = round(latencies[p99_idx], 1)
        else:
            p99_latency_ms = 0.0

        summary = {
            "totalCount": total_count,
            "errorCount": error_count,
            "successCount": success_count,
            "successRate": success_rate,
            "totalTokens": total_tokens,
            "promptTokens": prompt_tokens,
            "completionTokens": completion_tokens,
            "totalCost": total_cost,
            "avgLatencyMs": avg_latency_ms,
            "p99LatencyMs": p99_latency_ms,
        }

        # Discover Tool Names
        tool_names_set = set()
        for r in records:
            name = str(r.get("name") or "")
            run_type = str(r.get("run_type") or "")
            meta = r.get("metadata")
            if isinstance(meta, str):
                try:
                    meta = json.loads(meta)
                except Exception:
                    meta = {}
            elif not isinstance(meta, dict):
                meta = {}

            if run_type == "tool" or "tool" in name.lower() or "tool_name" in meta:
                tool_names_set.add(meta.get("tool_name") or name)
        tool_names = sorted(list(tool_names_set))

        def parse_bucket_key(ts_str: Optional[str]) -> str:
            if not ts_str:
                return "Unknown"
            try:
                dt = datetime.fromisoformat(str(ts_str).replace("Z", "+00:00"))
                return dt.strftime("%m/%d %H:%M")
            except Exception:
                return str(ts_str)[:16]

        buckets_map: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for r in records:
            b_key = parse_bucket_key(r.get("start_time"))
            buckets_map[b_key].append(r)

        bucket_keys = list(buckets_map.keys())

        trace_count_data = []
        trace_latency_data = []
        trace_error_rate_data = []
        llm_count_data = []
        llm_latency_data = []
        total_cost_data = []
        cost_per_trace_data = []
        tokens_data = []
        output_tokens_per_trace_data = []
        input_tokens_per_trace_data = []
        tools_count_data = []
        tools_latency_data = []

        running_cost = 0.0

        for t_key in bucket_keys:
            group = buckets_map[t_key]
            g_total = len(group)
            g_err = sum(1 for r in group if r.get("status") == "error")
            g_succ = g_total - g_err
            g_err_rate = round((g_err / g_total) * 100, 1) if g_total else 0.0

            g_lats = sorted([float(r.get("latency_ms") or 0.0) for r in group])
            p50_sec = round((g_lats[len(g_lats) // 2] if g_lats else 0.0) / 1000.0, 2)
            p99_idx = min(int(len(g_lats) * 0.99), len(g_lats) - 1) if g_lats else 0
            p99_sec = round((g_lats[p99_idx] if g_lats else 0.0) / 1000.0, 2)

            trace_count_data.append({
                "time": t_key,
                "success": g_succ,
                "error": g_err,
                "total": g_total,
            })

            trace_latency_data.append({
                "time": t_key,
                "p50": p50_sec,
                "p99": p99_sec,
            })

            trace_error_rate_data.append({
                "time": t_key,
                "errorRate": g_err_rate,
            })

            llm_group = [
                r for r in group
                if str(r.get("run_type") or "").lower() == "llm" or r.get("model")
            ]
            llm_tot = len(llm_group)
            llm_err = sum(1 for r in llm_group if r.get("status") == "error")
            llm_succ = llm_tot - llm_err
            llm_lats = sorted([float(r.get("latency_ms") or 0.0) for r in llm_group])
            llm_p50 = round((llm_lats[len(llm_lats) // 2] if llm_lats else 0.0) / 1000.0, 2)
            llm_p99_idx = min(int(len(llm_lats) * 0.99), len(llm_lats) - 1) if llm_lats else 0
            llm_p99 = round((llm_lats[llm_p99_idx] if llm_lats else 0.0) / 1000.0, 2)

            llm_count_data.append({
                "time": t_key,
                "success": llm_succ,
                "error": llm_err,
                "total": llm_tot,
            })

            llm_latency_data.append({
                "time": t_key,
                "p50": llm_p50,
                "p99": llm_p99,
            })

            bucket_cost = sum(float(r.get("cost_usd") or 0.0) for r in group)
            running_cost += bucket_cost
            avg_cost_trace = round(bucket_cost / g_total, 6) if g_total else 0.0

            total_cost_data.append({
                "time": t_key,
                "total": round(running_cost, 6),
            })

            cost_per_trace_data.append({
                "time": t_key,
                "cost": avg_cost_trace,
            })

            input_tokens = sum(int(r.get("prompt_tokens") or 0) for r in group)
            output_tokens = sum(int(r.get("completion_tokens") or 0) for r in group)

            tokens_data.append({
                "time": t_key,
                "input": input_tokens,
                "output": output_tokens,
            })

            input_tokens_per_trace_data.append({
                "time": t_key,
                "input": round(input_tokens / g_total, 1) if g_total else 0.0,
            })

            output_tokens_per_trace_data.append({
                "time": t_key,
                "output": round(output_tokens / g_total, 1) if g_total else 0.0,
            })

            if tool_names:
                t_count_entry = {"time": t_key}
                t_lat_entry = {"time": t_key}
                for tname in tool_names:
                    matches = [
                        r for r in group
                        if (r.get("name") == tname or (isinstance(r.get("metadata"), dict) and r["metadata"].get("tool_name") == tname))
                    ]
                    t_count_entry[tname] = len(matches)
                    t_avg_lat = (
                        round(sum(float(m.get("latency_ms") or 0.0) for m in matches) / len(matches) / 1000.0, 2)
                        if matches
                        else 0.0
                    )
                    t_lat_entry[tname] = t_avg_lat

                tools_count_data.append(t_count_entry)
                tools_latency_data.append(t_lat_entry)

        return {
            "summary": summary,
            "models": models,
            "toolNames": tool_names,
            "traceCountData": trace_count_data,
            "traceLatencyData": trace_latency_data,
            "traceErrorRateData": trace_error_rate_data,
            "llmCountData": llm_count_data,
            "llmLatencyData": llm_latency_data,
            "totalCostData": total_cost_data,
            "costPerTraceData": cost_per_trace_data,
            "tokensData": tokens_data,
            "outputTokensPerTraceData": output_tokens_per_trace_data,
            "inputTokensPerTraceData": input_tokens_per_trace_data,
            "toolsCountData": tools_count_data,
            "toolsLatencyData": tools_latency_data,
        }

    def clear_llm_traces(self) -> Dict[str, Any]:
        """Truncates or clears llm_traces from ClickHouse and memory."""
        self.conn.llm_records.clear()
        if self.conn.is_connected and self.conn.client:
            try:
                self.conn.safe_command("TRUNCATE TABLE IF EXISTS llm_traces")
            except Exception as e:
                logger.warning(f"Error truncating llm_traces table: {e}")
        return {"status": "success", "message": "All LLM traces cleared"}


# Default repository instance
llm_repo = LLMRepository()
