"""Interactive test client to interact with sample_demo_agent and trigger the intentional defect."""

import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

# Auto-link virtual environment site-packages if running with system python
for venv_path in [
    Path(__file__).resolve().parent.parent / "app-agent" / ".venv" / "Lib" / "site-packages",
    Path(__file__).resolve().parent.parent / "apps" / "testing" / ".venv" / "Lib" / "site-packages",
]:
    if venv_path.exists() and str(venv_path) not in sys.path:
        sys.path.insert(0, str(venv_path))

try:
    from uagents import Agent, Context, Model
except ImportError as err:
    sys.exit(
        f"[ERROR] 'uagents' is not installed in the active environment ({err}).\n"
        "Please run with the virtual environment python or install dependencies:\n"
        "  pip install uagents asi-telemetry\n"
    )


class QueryRequest(Model):
    query_type: str
    payload: dict = {}


class QueryResponse(Model):
    success: bool
    data: dict = {}
    error: str = ""


# Target agent address & port
TARGET_PORT = int(os.getenv("AGENT_PORT", "8300"))
TARGET_ENDPOINT = f"http://127.0.0.1:{TARGET_PORT}/submit"

# Ensure an asyncio event loop is set on the main thread (required on Python 3.14+)
try:
    asyncio.get_event_loop()
except RuntimeError:
    asyncio.set_event_loop(asyncio.new_event_loop())

# Test client agent
client = Agent(
    name="test_client_agent",
    port=8301,
    seed="sample-test-client-seed-2026",
    endpoint=["http://127.0.0.1:8301/submit"],
)


@client.on_event("startup")
async def run_tests(ctx: Context):
    ctx.logger.info("=" * 60)
    ctx.logger.info("🧪 Test Client Starting...")
    ctx.logger.info(f"🎯 Target Endpoint: {TARGET_ENDPOINT}")
    ctx.logger.info("=" * 60)

    # Let the server agent finish booting
    await asyncio.sleep(2)

    # Resolve target agent address by inspecting target or using query
    # In uagents, send QueryRequest to target
    from agent import agent as target_agent

    ctx.logger.info("\n--- TEST 1: Sending Successful Health Check Query ---")
    await ctx.send(
        target_agent.address,
        QueryRequest(query_type="status", payload={"client": "test_client"}),
    )

    await asyncio.sleep(2)

    ctx.logger.info("\n--- TEST 2: Sending Trigger Payload To Cause KeyError Defect ---")
    ctx.logger.info("Payload missing 'completion_tokens' -> Triggers KeyError in compute_analytics")
    await ctx.send(
        target_agent.address,
        QueryRequest(
            query_type="analytics",
            payload={"prompt_tokens": 250},  # 'completion_tokens' intentionally omitted!
        ),
    )


@client.on_message(model=QueryResponse)
async def handle_response(ctx: Context, sender: str, msg: QueryResponse):
    if msg.success:
        ctx.logger.info(f"✅ Response from {sender}: {msg.data}")
    else:
        ctx.logger.warning(f"❌ Error Response Captured from {sender}: {msg.error}")
        ctx.logger.info("\n" + "=" * 60)
        ctx.logger.info("🚨 DEFECT TRIGGERED SUCCESSFULLY!")
        ctx.logger.info("The error was ingested into ASI-Telemetry ClickHouse storage.")
        ctx.logger.info("Now open ASI:One and type 'diagnose' to view the root cause and proposed fix!")
        ctx.logger.info("=" * 60)


if __name__ == "__main__":
    client.run()
