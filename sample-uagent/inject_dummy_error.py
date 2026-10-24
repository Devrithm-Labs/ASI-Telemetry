"""Script to directly inject dummy error telemetry into the ASI-Telemetry backend."""

import os
import sys
import json
import urllib.request
import urllib.error
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

API_KEY = os.getenv("ASI_API_KEY", "asi_live_39324b2ba7eba4cb598746e38d5547cc")
BACKEND_URL = os.getenv("TELEMETRY_BACKEND_URL", "http://localhost:8080").rstrip("/")


def post_json(endpoint: str, data: dict):
    url = f"{BACKEND_URL}{endpoint}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        return err.code, err.read().decode("utf-8")
    except Exception as exc:
        return 0, str(exc)


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    print("=" * 65)
    print("💉 Injecting Dummy Error Telemetry Data")
    print(f"• Backend URL: {BACKEND_URL}")
    print(f"• API Key:     {API_KEY[:14]}...")
    print("=" * 65)

    # 1. Inject Tool Metric Error into ClickHouse via /api/metrics
    tool_error_payload = {
        "agent_name": "sample_demo_agent",
        "func_name": "compute_analytics",
        "status": "error",
        "response_time_ms": 45.6,
        "api_key": API_KEY,
        "metadata": {
            "error": "KeyError: 'completion_tokens'",
            "error_type": "KeyError",
            "file": "sample-uagent/tools.py",
            "line": 32,
            "exception": "KeyError: 'completion_tokens' in compute_analytics()",
        },
    }

    print("\n[1/2] Injecting Tool Error metric to /api/metrics...")
    status, res = post_json("/api/metrics", tool_error_payload)
    if status in (200, 201):
        print(f"[OK] Injected Tool Error successfully! Response: {res}")
    else:
        print(f"[NOTE] Status {status}: {res} (Make sure backend is running on {BACKEND_URL})")

    # 2. Inject LLM Trace Error to /api/llm/traces
    llm_error_payload = {
        "name": "gemini_reasoning_step",
        "run_type": "llm",
        "status": "error",
        "model": "gemini-3.8-flash",
        "input": "Calculate token consumption metrics for current billing period",
        "output": "",
        "error": "KeyError: 'completion_tokens' in compute_analytics()",
        "latency_ms": 350.2,
        "prompt_tokens": 120,
        "completion_tokens": 0,
        "cost_usd": 0.0001,
        "api_key": API_KEY,
        "metadata": {
            "defect_file": "sample-uagent/tools.py",
            "defect_line": 32,
        },
    }

    print("\n[2/2] Injecting LLM Trace Error to /api/llm/traces...")
    status, res = post_json("/api/llm/traces", llm_error_payload)
    if status in (200, 201):
        print(f"[OK] Injected LLM Trace Error successfully! Response: {res}")
    else:
        print(f"[NOTE] Status {status}: {res} (Make sure backend is running on {BACKEND_URL})")

    print("\n" + "=" * 65)
    print("✅ Dummy error data prepared!")
    print("You can view the error in your ASI-Telemetry dashboard, or in ASI:One chat:")
    print("1. In ASI:One chat: type 'diagnose'")
    print("2. (Or directly in ASI:One chat without backend running, type: 'simulate error')")
    print("=" * 65)


if __name__ == "__main__":
    main()
