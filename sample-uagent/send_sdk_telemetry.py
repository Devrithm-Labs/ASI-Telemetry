"""Emits realistic sample telemetry (tools, LLM traces, and runtime errors) using the asi-telemetry SDK."""

import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv

# 1. Load local .env
load_dotenv(Path(__file__).parent / ".env")

# 2. Add local SDK package to path (or uses pip-installed asi-telemetry)
SDK_SRC = Path(__file__).resolve().parent.parent / "apps" / "app-sdk" / "src"
if SDK_SRC.exists() and str(SDK_SRC) not in sys.path:
    sys.path.insert(0, str(SDK_SRC))

# Auto-link virtual environments if running with system python
for venv_path in [
    Path(__file__).resolve().parent.parent / "app-agent" / ".venv" / "Lib" / "site-packages",
    Path(__file__).resolve().parent.parent / "apps" / "testing" / ".venv" / "Lib" / "site-packages",
]:
    if venv_path.exists() and str(venv_path) not in sys.path:
        sys.path.insert(0, str(venv_path))

from asi_telemetry import ASI_Telemetry
from tools import compute_analytics, format_agent_status

API_KEY = os.getenv("ASI_API_KEY", "asi_live_39324b2ba7eba4cb598746e38d5547cc")
BACKEND_URL = os.getenv("TELEMETRY_BACKEND_URL", "http://127.0.0.1:8080")
AGENT_NAME = os.getenv("AGENT_NAME", "sample_demo_agent")


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    print("=" * 65)
    print("📡 Emitting Sample Telemetry via ASI-Telemetry SDK")
    print(f"• Target Agent:   {AGENT_NAME}")
    print(f"• API Key:        {API_KEY[:14]}...")
    print(f"• Backend URL:    {BACKEND_URL}")
    print("=" * 65)

    # Initialize SDK observer
    observe = ASI_Telemetry(
        api_key=API_KEY,
        agent_name=AGENT_NAME,
        agent_address="agent1qwth0xslz63lfs4dx7xn4krnp89a9wknv6xhszg9la9wue639k8x68gs3pm",
        backend_url=BACKEND_URL,
    )

    # 1. Emit Healthy Tool Call
    print("\n[1/3] Emitting healthy tool metric: format_agent_status()...")
    tracked_status = observe.track("format_agent_status")(format_agent_status)
    status_result = tracked_status({"service": AGENT_NAME, "uptime_seconds": 1800, "status": "online"})
    print(f"  [OK] Tool output: {status_result}")

    # 2. Emit Tracked LLM Trace Spans
    print("\n[2/3] Emitting LLM execution trace via @observe.traceable()...")

    @observe.traceable(name="agent_reasoning_step", run_type="llm")
    def simulate_llm_call(prompt: str) -> str:
        time.sleep(0.12)  # Simulate model latency
        return f"Processed query: {prompt}. Analysis complete with 0 anomalies."

    response = simulate_llm_call("Verify user billing and token consumption quotas")
    print(f"  [OK] LLM response: {response}")

    # 3. Emit Error Tool Call (Intentional Defect)
    print("\n[3/3] Emitting intentional defect tool metric: compute_analytics()...")
    print("  Payload missing 'completion_tokens' -> triggers KeyError: 'completion_tokens'")
    tracked_analytics = observe.track("compute_analytics")(compute_analytics)

    try:
        tracked_analytics({"prompt_tokens": 420})
    except KeyError as exc:
        print(f"  [OK] Defect caught and logged by SDK: KeyError: {exc}")

    # Give SDK daemon background worker thread a moment to deliver HTTP payload
    print("\nFlushing SDK telemetry worker...")
    time.sleep(1.5)

    print("=" * 65)
    print("✅ All telemetry data emitted successfully via SDK!")
    print("You can view the data live:")
    print("1. Dashboard: http://localhost:3000")
    print("2. LLM Tracing: http://localhost:3000/llm-traces")
    print("3. ASI:One Chat: type 'diagnose' to view the defect diagnosis")
    print("=" * 65)


if __name__ == "__main__":
    main()
