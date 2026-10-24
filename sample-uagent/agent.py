"""Standalone uAgent utilizing ASI-Telemetry SDK with intentional runtime bug for ASI:One testing."""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load local .env
load_dotenv(Path(__file__).parent / ".env")

# Fallback import path in case asi-telemetry is tested locally before pip install
SDK_SRC = Path(__file__).resolve().parent.parent / "apps" / "app-sdk" / "src"
if SDK_SRC.exists() and str(SDK_SRC) not in sys.path:
    sys.path.insert(0, str(SDK_SRC))

# Auto-link workspace venv packages if running with system python
for venv_path in [
    Path(__file__).resolve().parent.parent / "app-agent" / ".venv" / "Lib" / "site-packages",
    Path(__file__).resolve().parent.parent / "apps" / "testing" / ".venv" / "Lib" / "site-packages",
]:
    if venv_path.exists() and str(venv_path) not in sys.path:
        sys.path.insert(0, str(venv_path))

try:
    from asi_telemetry import ASI_Telemetry
    from uagents import Agent, Context, Model
except ImportError as err:
    sys.exit(
        f"[ERROR] Required dependencies missing ({err}).\n"
        "Please install requirements: pip install uagents asi-telemetry\n"
    )
from tools import compute_analytics, format_agent_status

# 1. Configuration & Telemetry Setup
API_KEY = os.getenv("ASI_API_KEY", "asi_live_39324b2ba7eba4cb598746e38d5547cc")
BACKEND_URL = os.getenv("TELEMETRY_BACKEND_URL", "http://localhost:8080")
AGENT_PORT = int(os.getenv("AGENT_PORT", "8300"))
AGENT_NAME = os.getenv("AGENT_NAME", "sample_demo_agent")

# Ensure an asyncio event loop is set on the main thread (required on Python 3.14+)
import asyncio

try:
    asyncio.get_event_loop()
except RuntimeError:
    asyncio.set_event_loop(asyncio.new_event_loop())

agent = Agent(
    name=AGENT_NAME,
    port=AGENT_PORT,
    seed=os.getenv("AGENT_SEED", "sample-demo-agent-seed-production-2026"),
    endpoint=[f"http://127.0.0.1:{AGENT_PORT}/submit"],
)

# Initialize ASI-Telemetry Observer
observe = ASI_Telemetry(
    api_key=API_KEY,
    agent_name=AGENT_NAME,
    agent_address=agent.address,
    backend_url=BACKEND_URL,
)


# 2. Communication Models
class QueryRequest(Model):
    query_type: str  # "status" | "analytics"
    payload: dict = {}


class QueryResponse(Model):
    success: bool
    data: dict = {}
    error: str = ""


# 3. Agent Lifecycle Handlers
@agent.on_event("startup")
async def startup_handler(ctx: Context):
    ctx.logger.info("=" * 60)
    ctx.logger.info(f"🚀 Sample uAgent running: {AGENT_NAME}")
    ctx.logger.info(f"📍 Agent Address: {agent.address}")
    ctx.logger.info(f"🌐 Listening on: http://127.0.0.1:{AGENT_PORT}")
    ctx.logger.info(f"📊 ASI-Telemetry Backend: {BACKEND_URL}")
    ctx.logger.info(f"🔑 ASI-Telemetry API Key: {API_KEY[:12]}...")
    ctx.logger.info("=" * 60)


# 4. Message Dispatch with Telemetry Tracking
@agent.on_message(model=QueryRequest, replies=QueryResponse)
async def message_handler(ctx: Context, sender: str, msg: QueryRequest):
    ctx.logger.info(f"Received query '{msg.query_type}' from {sender}")

    if msg.query_type == "status":
        # Working tool execution
        tracked_status = observe.track("format_agent_status")(format_agent_status)
        result = tracked_status({"service": AGENT_NAME, "uptime_seconds": 120})
        await ctx.send(sender, QueryResponse(success=True, data=result))
        return

    if msg.query_type == "analytics":
        # Tracked tool execution containing intentional bug
        try:
            tracked_analytics = observe.track("compute_analytics")(compute_analytics)
            result = tracked_analytics(msg.payload)
            await ctx.send(sender, QueryResponse(success=True, data=result))
        except Exception as exc:
            ctx.logger.error(f"❌ Error encountered in tool execution: {exc}")
            # The exception is recorded in ASI-Telemetry metrics and traces
            await ctx.send(
                sender,
                QueryResponse(
                    success=False,
                    error=f"{type(exc).__name__}: {exc}",
                ),
            )
        return

    await ctx.send(
        sender,
        QueryResponse(
            success=False,
            error=f"Unsupported query_type '{msg.query_type}'. Use 'status' or 'analytics'.",
        ),
    )


if __name__ == "__main__":
    agent.run()
