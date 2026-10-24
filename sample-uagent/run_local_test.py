"""Single-command local test runner: executes tools, sends telemetry, and triggers the intentional defect."""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

# Ensure local SDK source is loadable
SDK_SRC = Path(__file__).resolve().parent.parent / "apps" / "app-sdk" / "src"
if SDK_SRC.exists() and str(SDK_SRC) not in sys.path:
    sys.path.insert(0, str(SDK_SRC))

from asi_telemetry import ASI_Telemetry
from tools import compute_analytics, format_agent_status

API_KEY = os.getenv("ASI_API_KEY", "asi_live_39324b2ba7eba4cb598746e38d5547cc")
BACKEND_URL = os.getenv("TELEMETRY_BACKEND_URL", "http://localhost:8080")
AGENT_NAME = os.getenv("AGENT_NAME", "sample_demo_agent")


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    print("=" * 65)
    print(f"[TEST] Testing Sample Agent Telemetry & Planted Defect")
    print(f"- Agent Name: {AGENT_NAME}")
    print(f"- API Key:    {API_KEY[:14]}...")
    print(f"- Backend:    {BACKEND_URL}")
    print("=" * 65)

    # 1. Initialize ASI-Telemetry Observer
    observe = ASI_Telemetry(
        api_key=API_KEY,
        agent_name=AGENT_NAME,
        backend_url=BACKEND_URL,
    )

    # 2. Run healthy tracked tool
    print("\n[Step 1] Executing healthy tool: format_agent_status()...")
    tracked_status = observe.track("format_agent_status")(format_agent_status)
    status_result = tracked_status({"service": AGENT_NAME, "uptime_seconds": 600})
    print(f"[SUCCESS] Output: {status_result}")

    # 3. Run defect-planted tool
    print("\n[Step 2] Executing defect-planted tool: compute_analytics()...")
    print("Payload: {'prompt_tokens': 300} (omitting 'completion_tokens')")
    tracked_analytics = observe.track("compute_analytics")(compute_analytics)

    try:
        tracked_analytics({"prompt_tokens": 300})
        print("[WARNING] Defect did not trigger!")
    except KeyError as exc:
        print(f"[DEFECT TRIGGERED] KeyError: {exc}")
        print("Telemetry dispatched to ASI-Telemetry backend!")
        print("\n" + "=" * 65)
        print("[SUCCESS] Runtime defect captured in telemetry.")
        print("Next Steps in ASI:One Chat:")
        print("1. Open ASI:One and send message: diagnose")
        print("2. Select your repository: select repo <owner/repo>")
        print("3. Approve PR fix: approve pr")
        print("=" * 65)


if __name__ == "__main__":
    main()
