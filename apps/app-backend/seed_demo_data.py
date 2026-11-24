"""
Database seed script to create a demo user account and populate realistic
telemetry metrics and LLM traces for live dashboard testing and showcases.
"""
from datetime import datetime, timedelta, timezone
import json
import random
from uuid import uuid4

from app.core.security import hash_password
from app.db.session import db_manager, initialize_schema
from app.models.api_key import ApiKeyModel
from app.models.llm import LLMTraceModel
from app.models.telemetry import TelemetryMetricModel
from app.models.user import UserModel

DEMO_USER_ID = "usr_demo_asi_telemetry"
DEMO_EMAIL = "demo@asi-telemetry.io"
DEMO_PASSWORD = "DemoUser123!"
DEMO_NAME = "Demo Engineer"
DEMO_API_KEY = "asi_live_demo_9876543210abcdef12345678"


def seed_demo():
    print(">> Connecting to PostgreSQL database...")
    db_manager.connect()
    if not db_manager.is_connected:
        print("!! Could not connect to PostgreSQL database. Aborting seed.")
        return

    initialize_schema(db_manager)

    with db_manager.session_scope() as session:
        # 1. Upsert Demo User
        existing_user = session.query(UserModel).filter(UserModel.email == DEMO_EMAIL).first()
        if existing_user:
            print(f">> Existing demo user found: {DEMO_EMAIL}. Updating password hash...")
            existing_user.password_hash = hash_password(DEMO_PASSWORD)
            existing_user.name = DEMO_NAME
            user_id = existing_user.id
        else:
            print(f">> Creating new demo user: {DEMO_EMAIL}")
            new_user = UserModel(
                id=DEMO_USER_ID,
                name=DEMO_NAME,
                email=DEMO_EMAIL,
                password_hash=hash_password(DEMO_PASSWORD),
                created_at=datetime.now(timezone.utc),
            )
            session.add(new_user)
            user_id = DEMO_USER_ID

        # 2. Upsert Demo API Key
        existing_key = session.query(ApiKeyModel).filter(ApiKeyModel.full_key == DEMO_API_KEY).first()
        if not existing_key:
            print(f">> Creating demo API key: {DEMO_API_KEY[:16]}...")
            api_key = ApiKeyModel(
                id=f"key_{uuid4().hex[:12]}",
                user_id=user_id,
                name="Demo Production Agent Key",
                key_prefix=DEMO_API_KEY[:14],
                full_key=DEMO_API_KEY,
                environment="production",
                permissions=json.dumps(["read", "write", "telemetry"]),
                rate_limit="50,000 req/min",
                status="active",
                created_at=datetime.now(timezone.utc),
            )
            session.add(api_key)

        # 3. Clean previous dummy records for idempotency
        session.query(TelemetryMetricModel).filter(TelemetryMetricModel.user_id == user_id).delete()
        session.query(LLMTraceModel).filter(LLMTraceModel.user_id == user_id).delete()

        now = datetime.now(timezone.utc)

        # 4. Seed Telemetry Metrics (45 realistic items spread over 7 days)
        agents_data = [
            ("FinancialAnalystAgent", ["analyze_earnings", "calculate_ratios", "summarize_filing"]),
            ("CodeReviewAgent", ["review_pr", "security_scan", "suggest_refactor"]),
            ("CustomerSupportAgent", ["classify_ticket", "resolve_inquiry", "draft_reply"]),
            ("SearchOrchestrator", ["web_search_rag", "fetch_documents", "rerank_passages"]),
        ]

        print(">> Seeding 45 telemetry metrics...")
        for i in range(45):
            agent_name, functions = random.choice(agents_data)
            func_name = random.choice(functions)
            # 96% success rate
            is_success = random.random() < 0.96
            status = "success" if is_success else "error"
            resp_time = round(random.uniform(95.0, 1150.0) if is_success else random.uniform(2500.0, 4200.0), 2)
            time_offset = timedelta(
                days=random.uniform(0, 6.8),
                hours=random.uniform(0, 23),
                minutes=random.uniform(0, 59),
            )
            ts = now - time_offset

            metric = TelemetryMetricModel(
                id=f"metric_{uuid4().hex[:16]}",
                timestamp=ts,
                agent_name=agent_name,
                func_name=func_name,
                status=status,
                response_time_ms=resp_time,
                memory_before=round(random.uniform(120.0, 180.0), 1),
                memory_after=round(random.uniform(130.0, 210.0), 1),
                meta_data=json.dumps({
                    "sdk_version": "0.2.0",
                    "environment": "production",
                    "framework": "uagents",
                    "agent_address": f"agent1q{uuid4().hex[:32]}",
                    "agent_handle": f"@{agent_name.lower()}",
                }),
                agent_address=f"agent1q{uuid4().hex[:32]}",
                agent_handle=f"@{agent_name.lower()}",
                user_id=user_id,
            )
            session.add(metric)

        # 5. Seed LLM Traces (30 realistic items)
        llm_scenarios = [
            {
                "name": "financial_sentiment_analysis",
                "model": "gemini-2.5-flash",
                "input": "Analyze sentiment of Q3 shareholder letter regarding operating margin expansion.",
                "output": "Sentiment is highly positive (0.84). Highlights 14% EBITDA growth and cloud infrastructure optimization.",
                "prompt_tokens": 340,
                "completion_tokens": 78,
                "cost_usd": 0.00018,
            },
            {
                "name": "code_vulnerability_audit",
                "model": "claude-3-5-sonnet",
                "input": "Audit the following SQL query constructor for SQL injection risks: def query(filter): ...",
                "output": "Vulnerability identified: parameter concatenation in line 14. Recommend using parameterized prepared statements with SQLAlchemy.",
                "prompt_tokens": 620,
                "completion_tokens": 142,
                "cost_usd": 0.00285,
            },
            {
                "name": "customer_inquiry_classification",
                "model": "gpt-4o-mini",
                "input": "Classify incoming support request: 'My webhook is failing with 401 Unauthorized since yesterday'",
                "output": "Category: Authentication/API_Key. Priority: High. Suggested action: Verify token expiration and regenerate API key.",
                "prompt_tokens": 115,
                "completion_tokens": 44,
                "cost_usd": 0.00004,
            },
            {
                "name": "rag_document_synthesis",
                "model": "gemini-1.5-pro",
                "input": "Synthesize key findings from the 5 retrieved architecture docs regarding microservice decoupling.",
                "output": "Summary: 1. Adopt event-driven choreography with message queues. 2. Implement circuit breakers. 3. Standardize OpenTelemetry traces.",
                "prompt_tokens": 1280,
                "completion_tokens": 210,
                "cost_usd": 0.00392,
            },
            {
                "name": "agent_planning_reasoning",
                "model": "gemini-2.5-flash",
                "input": "Generate a step-by-step action plan to ingest telemetry from 50 autonomous agent swarms.",
                "output": "1. Deploy load balancer. 2. Buffer events in streaming ingest queue. 3. Batch insert into PostgreSQL. 4. Aggregate 1-minute rollup metrics.",
                "prompt_tokens": 450,
                "completion_tokens": 120,
                "cost_usd": 0.00024,
            },
        ]

        print(">> Seeding 30 LLM traces...")
        for i in range(30):
            scenario = random.choice(llm_scenarios)
            time_offset = timedelta(
                days=random.uniform(0, 6.8),
                hours=random.uniform(0, 23),
                minutes=random.uniform(0, 59),
            )
            start_dt = now - time_offset
            latency = round(random.uniform(210.0, 1850.0), 2)
            end_dt = start_dt + timedelta(milliseconds=latency)

            is_success = random.random() < 0.95
            status = "success" if is_success else "error"
            error_msg = None if is_success else "Rate limit exceeded (HTTP 429). Retrying after 2s."

            trace_id = f"trace_{uuid4().hex[:16]}"
            llm_trace = LLMTraceModel(
                id=f"span_{uuid4().hex[:16]}",
                trace_id=trace_id,
                span_id=f"span_{uuid4().hex[:12]}",
                parent_id=None,
                name=scenario["name"],
                run_type="llm",
                status=status,
                model=scenario["model"],
                input=scenario["input"],
                output=scenario["output"] if is_success else "",
                error=error_msg,
                start_time=start_dt,
                end_time=end_dt,
                latency_ms=latency,
                prompt_tokens=scenario["prompt_tokens"],
                completion_tokens=scenario["completion_tokens"] if is_success else 0,
                total_tokens=scenario["prompt_tokens"] + (scenario["completion_tokens"] if is_success else 0),
                cost_usd=scenario["cost_usd"] if is_success else 0.0,
                meta_data=json.dumps({
                    "framework": "langchain",
                    "temperature": 0.2,
                    "top_p": 0.95,
                    "user_id": user_id,
                }),
                agent_address=f"agent1q{uuid4().hex[:32]}",
                agent_handle="@orchestrator",
                user_id=user_id,
            )
            session.add(llm_trace)

    print("\n=======================================================")
    print(">> DEMO DATA SEEDED SUCCESSFULLY!")
    print(f">> Demo Email:    {DEMO_EMAIL}")
    print(f">> Demo Password: {DEMO_PASSWORD}")
    print(f">> Demo API Key:  {DEMO_API_KEY}")
    print("=======================================================\n")


if __name__ == "__main__":
    seed_demo()
