import sys
import os
import random
import json
import uuid
from datetime import datetime, timedelta, timezone

# Ensure backend root is on sys.path
backend_path = os.path.abspath(r"c:\Users\ukcod\Desktop\VS workspace\ASI-Telemetry\apps\app-backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from config.database import db_connection
from auth.database import initialize_auth_database, get_user_by_email, insert_user
from auth.security import hash_password, create_access_token
from auth.api_keys import create_api_key

DEMO_NAME = "Demo Engineer"
DEMO_EMAIL = "demo@asi-telemetry.com"
DEMO_PASSWORD = "DemoUser123!"

def seed_dummy_account():
    print(f"Connecting to ClickHouse for dummy account seeding...")
    db_connection.connect()
    if not db_connection.is_connected or not db_connection.client:
        print("ERROR: Could not connect to ClickHouse database.")
        sys.exit(1)

    initialize_auth_database()

    # 1. Check if user already exists or create new
    existing_user = get_user_by_email(DEMO_EMAIL)
    now = datetime.now(timezone.utc)

    if existing_user:
        user_id = existing_user["id"]
        print(f"Found existing user with email '{DEMO_EMAIL}' (ID: {user_id}).")
        # Update password hash in ClickHouse
        pw_hash = hash_password(DEMO_PASSWORD)
        db_connection.safe_command(
            f"ALTER TABLE users UPDATE password_hash = '{pw_hash}' WHERE id = '{user_id}'"
        )
        print("Updated password hash to ensure credentials match.")
    else:
        user_id = str(uuid.uuid4())
        pw_hash = hash_password(DEMO_PASSWORD)
        insert_user(
            user_id=user_id,
            name=DEMO_NAME,
            email=DEMO_EMAIL,
            password_hash=pw_hash,
            created_at=now,
        )
        print(f"Created new user account: {DEMO_EMAIL} (ID: {user_id})")

    # 2. Provision active production API key for this user if not present
    try:
        keys_res = db_connection.safe_query(
            f"SELECT count(*) FROM api_keys WHERE user_id = '{user_id}' AND status = 'active'"
        )
        has_key = keys_res.result_rows and keys_res.result_rows[0][0] > 0
        if not has_key:
            created_key = create_api_key(user_id=user_id, name="Production Demo Key", environment="production")
            print(f"Provisioned active API key for demo user: {created_key.get('key_prefix')}...")
        else:
            print("User already has active API key(s).")
    except Exception as e:
        print(f"Warning during API key check: {e}")

    # 3. Clean up existing old dummy metrics for this user to avoid duplicates if re-run
    try:
        db_connection.safe_command(f"ALTER TABLE telemetry_metrics DELETE WHERE user_id = '{user_id}'")
        db_connection.safe_command(f"ALTER TABLE llm_traces DELETE WHERE user_id = '{user_id}'")
        print("Cleaned up previous telemetry records for clean seeding.")
    except Exception as e:
        print(f"Notice on delete previous metrics: {e}")

    # 4. Generate realistic dummy telemetry and LLM traces
    agents_funcs = [
        ("research-agent", "analyze_financials"),
        ("market-pulse", "fetch_crypto_rates"),
        ("code-auditor", "verify_smart_contract"),
        ("support-assistant", "resolve_customer_ticket"),
        ("data-extractor", "extract_unstructured_tables"),
    ]

    llm_prompts = [
        ("Summarize Q3 financial earnings for cloud SaaS providers.", "Net margins increased by 14.2% YoY with recurring subscription ARR up 22%.", "gemini-2.5-flash", 420, 180),
        ("Extract structured risk factors from enterprise SEC filing.", '{"risks": ["currency_volatility", "supply_chain_lead_time", "datacenter_power_constraints"]}', "gpt-4o", 850, 310),
        ("Audit Solidity ERC-20 contract for re-entrancy vulnerabilities.", "Security scan complete: 0 high-severity issues found. Reentrancy guard present on withdraw().", "claude-3-5-sonnet", 1250, 480),
        ("Generate friendly agent onboarding response for customer inquiry.", "Welcome to ASI Observability! Your telemetry endpoint is configured and receiving live traces.", "gemini-1.5-pro", 310, 115),
        ("Analyze query intent and dispatch delegate tool.", '{"intent": "market_rates", "symbols": ["ETH", "SOL", "BTC"], "confidence": 0.98}', "gemini-2.5-flash", 240, 95),
    ]

    tool_calls = [
        ("fetch_crypto_rates", '{"symbols": ["SOL", "ETH"]}', '{"SOL": 182.40, "ETH": 3410.20, "timestamp": "2026-10-20T12:00:00Z"}'),
        ("query_clickhouse_metrics", '{"query": "SELECT count(*) FROM traces", "limit": 100}', '{"count": 142850, "execution_ms": 3.8}'),
        ("search_vector_kb", '{"embedding_vector": [0.12, -0.45, 0.89], "top_k": 3}', '{"matches": [{"doc_id": "kb_912", "score": 0.94}]}'),
        ("send_slack_alert", '{"channel": "#agent-ops", "text": "High latency detected"}', '{"ok": true, "ts": "1739981240.12"}'),
        ("execute_python_sandbox", '{"code": "import math; math.sqrt(144)"}', '{"stdout": "12.0", "exit_code": 0}'),
    ]

    telemetry_rows = []
    llm_rows = []

    # Distribute over 30 days with a heavier cluster in the last 24 hours
    for day_offset in range(30, -1, -1):
        day_date = now - timedelta(days=day_offset)

        if day_offset == 0:
            count = 45 # Today (rich recent timeline)
        elif day_offset <= 3:
            count = 20
        elif day_offset <= 7:
            count = 14
        else:
            count = 7

        for i in range(count):
            if day_offset == 0:
                # Spread over last 24 hours, with strong concentration in last 2 hours
                if i < 20:
                    minute_offset = random.randint(1, 115)
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

            agent, func = random.choice(agents_funcs)
            is_error = random.random() < 0.04  # ~96% success rate
            status = "error" if is_error else "success"

            if is_error:
                resp_time = random.uniform(320.0, 1100.0)
                err_code = random.choice([429, 500, 504])
                meta = json.dumps({"status_code": err_code, "error": f"API {err_code} Error: timeout or rate limit"})
            else:
                resp_time = random.uniform(35.0, 280.0)
                meta = json.dumps({"status_code": 200, "project": "production-fleet"})

            mem_before = round(random.uniform(90.0, 140.0), 1)
            mem_after = round(mem_before + random.uniform(0.5, 6.0), 1)

            # Telemetry metrics row
            # ['id', 'timestamp', 'agent_name', 'func_name', 'status', 'memory_before', 'memory_after', 'metadata', 'response_time_ms', 'agent_address', 'agent_handle', 'user_id']
            metric_id = f"metric-{uuid.uuid4().hex[:12]}"
            agent_addr = f"agent1q{uuid.uuid4().hex[:32]}"
            agent_handle = f"asi/{agent}"

            telemetry_rows.append([
                metric_id,
                ts,
                agent,
                func,
                status,
                mem_before,
                mem_after,
                meta,
                round(resp_time, 2),
                agent_addr,
                agent_handle,
                user_id,
            ])

            # LLM / Tool trace record
            run_type = "tool" if (i % 2 == 1) else "llm"
            is_llm_error = random.random() < 0.03
            llm_status = "error" if is_llm_error else "success"
            err_msg = "RateLimitError: 429 quota reached on provider endpoint" if is_llm_error else None

            trace_id = f"tr_{uuid.uuid4().hex[:16]}"
            span_id = f"sp_{uuid.uuid4().hex[:8]}"

            if run_type == "llm":
                prompt_text, resp_text, model, p_tokens, c_tokens = random.choice(llm_prompts)
                p_tokens += random.randint(-40, 60)
                c_tokens += random.randint(-20, 40)
                t_tokens = p_tokens + c_tokens
                # Pricing ~$0.20-$0.40 per 1M tokens
                cost = round((p_tokens * 0.0000004) + (c_tokens * 0.0000012), 6)
                latency = random.uniform(220.0, 1650.0)
                name = random.choice(["chat_completion", "summarize_document", "extract_structured_json", "reasoning_step"])
            else:
                tool_name, tool_in, tool_out = random.choice(tool_calls)
                name = tool_name
                prompt_text = tool_in
                resp_text = tool_out if not is_llm_error else '{"error": "Tool execution timed out"}'
                model = "tool-executor"
                p_tokens = 0
                c_tokens = 0
                t_tokens = 0
                cost = 0.0
                latency = random.uniform(18.0, 195.0)

            end_ts = ts + timedelta(milliseconds=latency)
            trace_metadata = json.dumps({
                "agent_name": agent,
                "agent_address": agent_addr,
                "is_agent_root": (i % 3 == 0),
                "environment": "production"
            })

            # llm_traces cols:
            # ['id', 'trace_id', 'span_id', 'parent_id', 'name', 'run_type', 'status', 'model', 'input', 'output', 'error', 'start_time', 'end_time', 'latency_ms', 'prompt_tokens', 'completion_tokens', 'total_tokens', 'cost_usd', 'metadata', 'agent_address', 'agent_handle', 'user_id']
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
                trace_metadata,
                agent_addr,
                agent_handle,
                user_id,
            ])

    print(f"Generated {len(telemetry_rows)} telemetry metrics and {len(llm_rows)} LLM traces.")

    # 5. Insert into ClickHouse
    telemetry_cols = [
        "id", "timestamp", "agent_name", "func_name", "status",
        "memory_before", "memory_after", "metadata", "response_time_ms",
        "agent_address", "agent_handle", "user_id"
    ]
    db_connection.safe_insert("telemetry_metrics", telemetry_rows, column_names=telemetry_cols)
    print("Inserted telemetry_metrics into ClickHouse!")

    llm_cols = [
        "id", "trace_id", "span_id", "parent_id", "name",
        "run_type", "status", "model", "input", "output",
        "error", "start_time", "end_time", "latency_ms",
        "prompt_tokens", "completion_tokens", "total_tokens",
        "cost_usd", "metadata", "agent_address", "agent_handle", "user_id"
    ]
    db_connection.safe_insert("llm_traces", llm_rows, column_names=llm_cols)
    print("Inserted llm_traces into ClickHouse!")

    # 6. Verify inserted counts for this user
    count_t = db_connection.safe_query(
        f"SELECT count(*) FROM telemetry_metrics WHERE user_id = '{user_id}'"
    ).result_rows[0][0]
    count_l = db_connection.safe_query(
        f"SELECT count(*) FROM llm_traces WHERE user_id = '{user_id}'"
    ).result_rows[0][0]

    print(f"\nSeeding complete!")
    print(f"User ID: {user_id}")
    print(f"Email: {DEMO_EMAIL}")
    print(f"Password: {DEMO_PASSWORD}")
    print(f"Telemetry metrics for user: {count_t}")
    print(f"LLM traces for user: {count_l}")

if __name__ == "__main__":
    seed_dummy_account()
