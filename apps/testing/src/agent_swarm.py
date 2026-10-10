import asyncio
import os
import sys
import time
import uuid
import httpx
from dotenv import load_dotenv

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=env_path)

# Import our custom tracer
from asi_tracer import traceable, instrument_llm_provider, calculate_cost
from google import genai

# Setup Gemini Client
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
instrument_llm_provider(client)

BACKEND_URL = os.getenv("TELEMETRY_BACKEND_URL", "http://127.0.0.1:8080/api/traces")

# ---------------------------------------------------------------------------
# Simulated Agents with Cryptographic Addresses
# ---------------------------------------------------------------------------
AGENTS = {
    "orchestrator": {
        "name": "Orchestrator Agent",
        "address": "agent1q2kl8m9x0w7n6p5v4u3t2s1r0q9p8o7n6m5",
        "port": 8000,
    },
    "researcher": {
        "name": "Researcher Agent",
        "address": "agent1q9v8u7t6s5r4q3p2o1n0m9l8k7j6h5g4f3d",
        "port": 8001,
    },
    "llm_worker": {
        "name": "LLM Inference Agent",
        "address": "agent1q3f4g5h6j7k8l9m0n1o2p3q4r5s6t7u8v9w",
        "port": 8002,
    },
    "validator": {
        "name": "Validator Agent",
        "address": "agent1q7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p3q",
        "port": 8003,
    },
}


# ---------------------------------------------------------------------------
# Step 1: Agent 1 (Orchestrator)
# ---------------------------------------------------------------------------
@traceable(name="orchestrator:plan_and_route", metadata={"agent_id": "agent1q_orchestrator"})
def agent_orchestrator(query: str) -> dict:
    time.sleep(0.05)
    return {
        "task": query,
        "instructions": "Extract on-chain metrics, synthesize via Gemini, and validate.",
        "assigned_to": AGENTS["researcher"]["address"],
    }


# ---------------------------------------------------------------------------
# Step 2: Agent 2 (Researcher)
# ---------------------------------------------------------------------------
@traceable(name="researcher:fetch_onchain_data", metadata={"agent_id": "agent1q_researcher"})
def agent_researcher(plan: dict) -> dict:
    time.sleep(0.08)
    return {
        "topic": plan["task"],
        "raw_data": "ASI Network Staking APR is 14.2%, Active Validators = 120, Avg Block Latency = 5.1s.",
        "forward_to": AGENTS["llm_worker"]["address"],
    }


# ---------------------------------------------------------------------------
# Step 3: Agent 3 (LLM Worker with Gemini)
# ---------------------------------------------------------------------------
@traceable(name="llm_worker:generate_synthesis", run_type="llm", metadata={"agent_id": "agent1q_llm_worker", "model": "gemini-3.8-flash"})
def agent_llm_worker(research_packet: dict) -> str:
    prompt = (
        f"In exactly 1 concise sentence, summarize this data for an executive: "
        f"{research_packet['raw_data']}"
    )
    response = client.models.generate_content(
        model="gemini-3.8-flash",
        contents=prompt,
    )
    return response.text.strip()


# ---------------------------------------------------------------------------
# Step 4: Agent 4 (Validator)
# ---------------------------------------------------------------------------
@traceable(name="validator:verify_safety", metadata={"agent_id": "agent1q_validator"})
def agent_validator(synthesis: str) -> dict:
    time.sleep(0.04)
    return {
        "verified": True,
        "final_report": synthesis,
        "hallucination_detected": False,
        "status": "APPROVED",
    }


# ---------------------------------------------------------------------------
# Root Swarm Pipeline
# ---------------------------------------------------------------------------
@traceable(name="swarm:distributed_pipeline")
def run_swarm_pipeline(user_query: str) -> dict:
    print(f"\n[1/4] Orchestrator ({AGENTS['orchestrator']['address'][:16]}...) starting...")
    plan = agent_orchestrator(user_query)

    print(f"[2/4] Researcher ({AGENTS['researcher']['address'][:16]}...) fetching metrics...")
    data = agent_researcher(plan)

    print(f"[3/4] LLM Worker ({AGENTS['llm_worker']['address'][:16]}...) calling Gemini 3.8...")
    synthesis = agent_llm_worker(data)

    print(f"[4/4] Validator ({AGENTS['validator']['address'][:16]}...) verifying output...")
    final_output = agent_validator(synthesis)

    return final_output


if __name__ == "__main__":
    query = "Fetch and report current ASI network staking parameters"
    print("=" * 80)
    print(" STARTING 4-AGENT DISTRIBUTED SWARM WITH REAL GEMINI TELEMETRY")
    print("=" * 80)

    result = run_swarm_pipeline(query)

    print("\n--- Final Pipeline Output ---")
    print(result)

    # Dispatch trace to backend if server is up
    from asi_tracer import LAST_TRACE
    if LAST_TRACE:
        try:
            print("\n>> Dispatching trace to backend at", BACKEND_URL)
            resp = httpx.post(BACKEND_URL, json=LAST_TRACE, timeout=3.0)
            if resp.status_code == 201:
                print(">> Success! Trace broadcasted live over WebSocket to dashboard.")
        except Exception as e:
            print(">> Note: Backend is not running yet. Start it with 'python apps/app-backend/run.py' to see live WebSocket updates.")
