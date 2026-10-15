import asyncio
import json
import logging
import os
import time
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

logger = logging.getLogger("backend.websocket")
ws_router = APIRouter(tags=["WebSocket & Swarm"])

# ---------------------------------------------------------------------------
# Connection Manager
# ---------------------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcasts a JSON message to all connected WebSocket clients."""
        payload_str = json.dumps(message, default=str)
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(payload_str)
            except Exception as e:
                logger.warning(f"Failed to send to client: {e}")
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)


manager = ConnectionManager()

# In-memory history for quick initial state delivery
RECENT_TRACES: List[Dict[str, Any]] = []
KNOWN_AGENTS: Dict[str, Dict[str, Any]] = {
    "agent1q_orchestrator": {
        "id": "agent1q_orchestrator",
        "name": "Orchestrator Agent",
        "address": "agent1q2kl8m9x0w7n6p5v4u3t2s1r0q9p8o7n6m5",
        "role": "Coordinator",
        "status": "idle",
        "port": 8000,
        "last_seen": time.time(),
    },
    "agent1q_researcher": {
        "id": "agent1q_researcher",
        "name": "Researcher Agent",
        "address": "agent1q9v8u7t6s5r4q3p2o1n0m9l8k7j6h5g4f3d",
        "role": "Data Retriever",
        "status": "idle",
        "port": 8001,
        "last_seen": time.time(),
    },
    "agent1q_llm_worker": {
        "id": "agent1q_llm_worker",
        "name": "LLM Inference Agent",
        "address": "agent1q3f4g5h6j7k8l9m0n1o2p3q4r5s6t7u8v9w",
        "role": "LLM Worker",
        "status": "idle",
        "port": 8002,
        "last_seen": time.time(),
    },
    "agent1q_validator": {
        "id": "agent1q_validator",
        "name": "Validator Agent",
        "address": "agent1q7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p3q",
        "role": "Quality Gate",
        "status": "idle",
        "port": 8003,
        "last_seen": time.time(),
    },
}


# ---------------------------------------------------------------------------
# WebSocket Endpoint
# ---------------------------------------------------------------------------
@ws_router.websocket("/ws/telemetry")
async def telemetry_websocket(websocket: WebSocket):
    """
    WebSocket endpoint that streams real-time P2P agent trace events,
    latency stats, token costs, and node health to the frontend dashboard.
    """
    await manager.connect(websocket)
    try:
        # 1. Send initial snapshot upon connection
        await websocket.send_text(
            json.dumps({
                "type": "initial_state",
                "agents": list(KNOWN_AGENTS.values()),
                "traces": RECENT_TRACES[-20:],
                "server_time": time.time(),
            }, default=str)
        )

        # 2. Keep connection alive and accept client commands
        while True:
            data_text = await websocket.receive_text()
            try:
                data = json.loads(data_text)
                action = data.get("action")
                if action == "ping":
                    await websocket.send_text(json.dumps({"type": "pong", "time": time.time()}))
                elif action == "simulate":
                    # Trigger an animated swarm simulation
                    asyncio.create_task(run_simulated_swarm())
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)


# ---------------------------------------------------------------------------
# Trace Ingestion Endpoint
# ---------------------------------------------------------------------------
class TracePayload(BaseModel):
    trace_id: str
    name: str
    total_latency_ms: float = 0.0
    total_tokens: int = 0
    total_cost_usd: float = 0.0
    spans: List[Dict[str, Any]] = Field(default_factory=list)


@ws_router.post("/api/traces", status_code=201)
async def ingest_trace(payload: TracePayload):
    """
    Ingests an entire multi-agent or LLM trace from the SDK,
    records it into memory, and broadcasts live over WebSocket.
    """
    trace_data = payload.model_dump()
    RECENT_TRACES.append(trace_data)
    if len(RECENT_TRACES) > 100:
        RECENT_TRACES.pop(0)

    # Update agent states based on spans
    for span in trace_data.get("spans", []):
        agent_id = span.get("metadata", {}).get("agent_id") or span.get("metadata", {}).get("agent_name")
        if agent_id and agent_id in KNOWN_AGENTS:
            KNOWN_AGENTS[agent_id]["status"] = "completed" if not span.get("error") else "error"
            KNOWN_AGENTS[agent_id]["last_seen"] = time.time()

    # Broadcast event to frontend
    await manager.broadcast({
        "type": "trace_completed",
        "trace": trace_data,
        "agents": list(KNOWN_AGENTS.values()),
    })

    return {"status": "success", "trace_id": payload.trace_id}


def clear_recent_traces(trace_ids: Optional[List[str]] = None):
    """Clears or removes specified traces from memory buffer."""
    global RECENT_TRACES
    if not trace_ids:
        RECENT_TRACES.clear()
    else:
        ids_set = set(trace_ids)
        RECENT_TRACES = [
            t for t in RECENT_TRACES
            if t.get("trace_id") not in ids_set and t.get("id") not in ids_set
        ]


@ws_router.get("/api/traces")
def get_traces(limit: int = 20):
    """Returns recent traces."""
    return {"traces": RECENT_TRACES[-limit:], "total": len(RECENT_TRACES)}


@ws_router.get("/api/agents")
def get_agents():
    """Returns all known registered P2P agent nodes."""
    return {"agents": list(KNOWN_AGENTS.values())}


@ws_router.post("/api/simulate-swarm")
async def trigger_swarm_simulation():
    """API endpoint to trigger a simulated 4-agent swarm run over WebSocket."""
    asyncio.create_task(run_simulated_swarm())
    return {"status": "started", "message": "Swarm simulation initiated"}


# ---------------------------------------------------------------------------
# Swarm Simulation Runner
# ---------------------------------------------------------------------------
async def run_simulated_swarm():
    """
    Simulates an asynchronous 4-agent distributed pipeline:
    Agent 1 (Orchestrator) -> Agent 2 (Researcher) -> Agent 3 (LLM Worker) -> Agent 4 (Validator)
    Emits live step-by-step progress events over the WebSocket so the UI animates live.
    """
    trace_id = str(uuid.uuid4())
    s1_id = str(uuid.uuid4())
    s2_id = str(uuid.uuid4())
    s3_id = str(uuid.uuid4())
    s4_id = str(uuid.uuid4())

    pipeline_query = "Analyze ASI token staking APR and consensus health"

    steps = [
        {
            "agent_id": "agent1q_orchestrator",
            "span_id": s1_id,
            "parent_id": None,
            "action": "Task Planning & Routing",
            "input": pipeline_query,
            "output": "Plan created: Retrieve on-chain metrics -> Summarize -> Validate",
            "latency_ms": 142.5,
            "tokens": {"input": 0, "output": 0, "total": 0},
            "cost": 0.0,
            "ram_mb": 42.1,
            "cpu_consumed_sec": 0.015,
        },
        {
            "agent_id": "agent1q_researcher",
            "span_id": s2_id,
            "parent_id": s1_id,
            "action": "Querying Almanac & Blockchain Node",
            "input": "Fetch staking APR & validator count",
            "output": "Raw metrics: APR = 14.2%, Active Validators = 120, Block Time = 5.2s",
            "latency_ms": 284.1,
            "tokens": {"input": 0, "output": 0, "total": 0},
            "cost": 0.0,
            "ram_mb": 51.3,
            "cpu_consumed_sec": 0.032,
        },
        {
            "agent_id": "agent1q_llm_worker",
            "span_id": s3_id,
            "parent_id": s2_id,
            "action": "LLM Synthesis (Gemini 3.8 / ASI-1)",
            "input": "Summarize APR=14.2%, 120 validators into user report",
            "output": "ASI network health is robust with 14.2% APR across 120 active validators.",
            "latency_ms": 1120.4,
            "tokens": {"input": 65, "output": 28, "total": 93},
            "cost": 0.000013,
            "ram_mb": 68.7,
            "cpu_consumed_sec": 0.084,
            "model": "gemini-3.8-flash",
        },
        {
            "agent_id": "agent1q_validator",
            "span_id": s4_id,
            "parent_id": s3_id,
            "action": "Safety & Quality Verification",
            "input": "Verify report consistency against raw metrics",
            "output": "Verification PASSED. Zero hallucination detected.",
            "latency_ms": 95.2,
            "tokens": {"input": 0, "output": 0, "total": 0},
            "cost": 0.0,
            "ram_mb": 48.0,
            "cpu_consumed_sec": 0.011,
        },
    ]

    collected_spans = []
    total_tokens = 0
    total_cost = 0.0

    # Step-by-step broadcast for live UI animation
    for i, step in enumerate(steps):
        # 1. Announce Agent active/working
        KNOWN_AGENTS[step["agent_id"]]["status"] = "active"
        await manager.broadcast({
            "type": "agent_hop_start",
            "trace_id": trace_id,
            "hop_index": i + 1,
            "total_hops": len(steps),
            "from_agent": steps[i - 1]["agent_id"] if i > 0 else "Client",
            "to_agent": step["agent_id"],
            "action": step["action"],
            "agents": list(KNOWN_AGENTS.values()),
        })

        await asyncio.sleep(0.7)  # Simulated network and computation latency

        # 2. Complete the hop
        KNOWN_AGENTS[step["agent_id"]]["status"] = "completed"
        span = {
            "trace_id": trace_id,
            "span_id": step["span_id"],
            "parent_id": step["parent_id"],
            "name": f"{KNOWN_AGENTS[step['agent_id']]['name']}:{step['action']}",
            "run_type": "llm" if "model" in step else "agent",
            "inputs": step["input"],
            "outputs": step["output"],
            "error": None,
            "duration_ms": step["latency_ms"],
            "tokens": step["tokens"],
            "cost": step["cost"],
            "metadata": {
                "agent_id": step["agent_id"],
                "agent_address": KNOWN_AGENTS[step["agent_id"]]["address"],
                "model": step.get("model"),
            },
            "system": {
                "ram_mb": step["ram_mb"],
                "cpu_consumed_sec": step["cpu_consumed_sec"],
            },
        }
        collected_spans.append(span)
        total_tokens += step["tokens"]["total"]
        total_cost += step["cost"]

        await manager.broadcast({
            "type": "agent_hop_completed",
            "trace_id": trace_id,
            "hop": span,
            "agents": list(KNOWN_AGENTS.values()),
        })

        await asyncio.sleep(0.4)

    # 3. Final trace summary
    completed_trace = {
        "trace_id": trace_id,
        "name": "multi_agent_staking_pipeline",
        "total_latency_ms": round(sum(s["latency_ms"] for s in steps), 2),
        "total_tokens": total_tokens,
        "total_cost_usd": round(total_cost, 6),
        "spans": collected_spans,
    }
    RECENT_TRACES.append(completed_trace)

    # Reset agents to idle
    for a in KNOWN_AGENTS.values():
        a["status"] = "idle"

    await manager.broadcast({
        "type": "trace_completed",
        "trace": completed_trace,
        "agents": list(KNOWN_AGENTS.values()),
    })
