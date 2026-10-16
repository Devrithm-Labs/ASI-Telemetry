import sys
import os
import random
import json
import uuid
from datetime import datetime, timedelta, timezone

# Ensure backend root is on path
backend_path = os.path.abspath(r"c:\Users\ukcod\Desktop\VS workspace\ASI-Telemetry\apps\app-backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from config.database import db_connection

def seed():
    print("Connecting to ClickHouse...")
    db_connection.connect()
    if not db_connection.is_connected or not db_connection.client:
        print("Failed to connect to ClickHouse!")
        return

    now = datetime.now(timezone.utc)
    print(f"Current UTC time: {now.isoformat()}")

    agents_funcs = [
        ("assistant", "handle_message"),
        ("weather-agent", "fetch_weather"),
        ("summarizer-agent", "summarize_text"),
        ("sentiment-agent", "analyze_sentiment"),
        ("data-fetcher", "query_db"),
    ]

    llm_prompts = [
        ("Analyze user query and route to agent", "Identified intent: weather_query with high confidence.", "gemini-1.5-flash"),
        ("Summarize recent telemetry trends", "System operating normally with 99.2% uptime across nodes.", "gemini-1.5-pro"),
        ("Extract structured parameters from input", '{"city": "San Francisco", "metrics": ["temp", "humidity"]}', "gpt-4o"),
        ("Generate conversational greeting for sender", "Hello! Assistant agent online and ready for tasks.", "gemini-1.5-flash"),
        ("Validate schema for incoming telemetry span", "Validation passed: all required attributes present.", "claude-3-5-sonnet"),
    ]

    tool_calls = [
        ("fetch_weather_api", '{"lat": 37.77, "lon": -122.41}', '{"temperature_c": 18.5, "conditions": "Clear"}'),
        ("search_knowledge_base", '{"query": "P99 SLA breach thresholds"}', '{"results_count": 3, "top_match": "docs/sla.md"}'),
        ("calculate_stats", '{"values": [120, 240, 180, 310]}', '{"mean": 212.5, "p90": 295.0}'),
        ("execute_sql_query", '{"table": "agent_logs", "limit": 10}', '{"rows_returned": 10, "status": "ok"}'),
        ("send_notification", '{"channel": "#ops-telemetry", "level": "info"}', '{"dispatched": true, "message_id": "msg_9012"}'),
    ]

    telemetry_rows = []
    llm_rows = []

    # Distribution of points across 30 days
    # Days 30 down to 0 (today)
    for day_offset in range(30, -1, -1):
        day_date = now - timedelta(days=day_offset)
        
        # More records in recent days
        if day_offset == 0:
            count = 35 # Today: detailed hours and minutes
        elif day_offset <= 2:
            count = 18
        elif day_offset <= 7:
            count = 12
        else:
            count = 6

        for i in range(count):
            if day_offset == 0:
                # Spread today across last 24h, with cluster in last 2h
                if i < 15:
                    # Last 2 hours
                    minute_offset = random.randint(1, 110)
                    ts = now - timedelta(minutes=minute_offset)
                else:
                    hour_offset = random.randint(2, 23)
                    minute_offset = random.randint(0, 59)
                    ts = now - timedelta(hours=hour_offset, minutes=minute_offset)
            else:
                hour = random.randint(0, 23)
                minute = random.randint(0, 59)
                sec = random.randint(0, 59)
                ts = datetime(day_date.year, day_date.month, day_date.day, hour, minute, sec, tzinfo=timezone.utc)

            # Telemetry record
            agent, func = random.choice(agents_funcs)
            is_error = random.random() < 0.06
            status = "error" if is_error else "success"
            
            # Response times with realistic variation
            if is_error:
                resp_time = random.uniform(250.0, 950.0)
                err_code = random.choice([500, 429, 504, 400])
                meta = json.dumps({"status_code": err_code, "error": f"HTTP {err_code} Exception"})
            else:
                resp_time = random.uniform(45.0, 320.0)
                meta = json.dumps({"status_code": 200})

            cpu_b = random.uniform(8.0, 22.0)
            cpu_a = cpu_b + random.uniform(2.0, 15.0)
            mem_b = random.uniform(85.0, 130.0)
            mem_a = mem_b + random.uniform(1.0, 8.0)

            telemetry_rows.append([
                f"metric-{uuid.uuid4().hex[:12]}",
                ts,
                agent,
                func,
                status,
                round(resp_time, 2),
                round(cpu_b, 1),
                round(cpu_a, 1),
                round(mem_b, 1),
                round(mem_a, 1),
                meta,
            ])

            # LLM record
            # Alternate between "llm" and "tool"
            run_type = "tool" if (i % 2 == 1) else "llm"
            is_llm_err = random.random() < 0.05
            llm_status = "error" if is_llm_err else "success"
            err_msg = "Rate limit exceeded: 429 quota reached" if is_llm_err else None

            trace_id = f"trace-{uuid.uuid4().hex[:16]}"
            span_id = f"span-{uuid.uuid4().hex[:8]}"

            if run_type == "llm":
                prompt_text, resp_text, model = random.choice(llm_prompts)
                p_tokens = random.randint(120, 850)
                c_tokens = random.randint(30, 420)
                t_tokens = p_tokens + c_tokens
                cost = round((p_tokens * 0.0000005) + (c_tokens * 0.0000015), 6)
                latency = random.uniform(450.0, 1850.0)
                name = random.choice(["chat_completion", "generate_response", "summarize_text", "classify_intent"])
            else:
                tool_name, tool_in, tool_out = random.choice(tool_calls)
                name = tool_name
                prompt_text = tool_in
                resp_text = tool_out if not is_llm_err else '{"error": "Tool execution timeout"}'
                model = "uAgent-local"
                p_tokens = 0
                c_tokens = 0
                t_tokens = 0
                cost = 0.0
                latency = random.uniform(35.0, 260.0)

            end_ts = ts + timedelta(milliseconds=latency)

            llm_rows.append([
                f"llm-{uuid.uuid4().hex[:12]}",
                trace_id,
                span_id,
                None, # parent_id
                name,
                run_type,
                llm_status,
                model,
                prompt_text,
                resp_text,
                err_msg,
                ts,
                end_ts,
                round(latency, 2),
                p_tokens,
                c_tokens,
                t_tokens,
                cost,
                json.dumps({"agent": agent, "run_type": run_type}),
            ])

    print(f"Generated {len(telemetry_rows)} telemetry records and {len(llm_rows)} LLM/Tool trace records across 30 days.")

    # Insert in batches
    telemetry_cols = [
        "id", "timestamp", "agent_name", "func_name", "status",
        "response_time_ms", "cpu_before", "cpu_after",
        "memory_before", "memory_after", "metadata"
    ]
    db_connection.safe_insert("telemetry_metrics", telemetry_rows, column_names=telemetry_cols)
    print("Inserted telemetry_metrics into ClickHouse!")

    llm_cols = [
        "id", "trace_id", "span_id", "parent_id", "name",
        "run_type", "status", "model", "input", "output",
        "error", "start_time", "end_time", "latency_ms",
        "prompt_tokens", "completion_tokens", "total_tokens",
        "cost_usd", "metadata"
    ]
    db_connection.safe_insert("llm_traces", llm_rows, column_names=llm_cols)
    print("Inserted llm_traces into ClickHouse!")

    # Verify counts
    res_t = db_connection.safe_query("SELECT count(*) FROM telemetry_metrics").result_rows[0][0]
    res_l = db_connection.safe_query("SELECT count(*) FROM llm_traces").result_rows[0][0]
    print(f"Current total in ClickHouse: telemetry_metrics = {res_t}, llm_traces = {res_l}")

if __name__ == "__main__":
    seed()
