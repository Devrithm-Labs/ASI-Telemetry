import asyncio
import json
import math
import os
import time
from collections import deque
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# App Configuration & Setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="ASI-Telemetry Metrics Backend",
    description="FastAPI ingestion & dashboard backend for AI Agent telemetry",
    version="0.1.0",
)

# Enable CORS for Next.js frontend (default port 3000) and any local client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

START_TIME = time.time()

# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------
class MetricPayload(BaseModel):
    agent_name: str = Field(default="assistant", description="Name of the reporting agent")
    request_count: int = Field(default=1, ge=0)
    success_count: int = Field(default=1, ge=0)
    error_count: int = Field(default=0, ge=0)
    latency_ms: float = Field(default=0.0, ge=0.0)
    cpu_before: float = Field(default=0.0)
    cpu_after: float = Field(default=0.0)
    memory_before: float = Field(default=0.0)
    memory_after: float = Field(default=0.0)
    status: str = Field(default="success")
    func_name: Optional[str] = None
    timestamp: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class MetricSummary(BaseModel):
    total_requests: int
    total_success: int
    total_errors: int
    success_rate: float
    error_rate: float
    avg_latency_ms: float
    p50_latency_ms: float
    p95_latency_ms: float
    current_cpu: float
    current_memory: float
    events_count: int
    uptime_seconds: float


# ---------------------------------------------------------------------------
# In-Memory Telemetry Storage & WebSocket Manager
# ---------------------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)


class TelemetryStore:
    def __init__(self, max_history: int = 500):
        self.max_history = max_history
        self.events: deque = deque(maxlen=max_history)
        self.total_requests = 0
        self.total_success = 0
        self.total_errors = 0
        self.latest_cpu = 0.0
        self.latest_memory = 0.0

    def add_metric(self, payload: MetricPayload) -> dict:
        ts = payload.timestamp or datetime.now(timezone.utc).isoformat()
        event_dict = {
            "id": f"metric-{int(time.time()*1000)}-{len(self.events)+1}",
            "timestamp": ts,
            "agent_name": payload.agent_name,
            "request_count": payload.request_count,
            "success_count": payload.success_count,
            "error_count": payload.error_count,
            "latency_ms": round(payload.latency_ms, 2),
            "cpu_before": round(payload.cpu_before, 2),
            "cpu_after": round(payload.cpu_after, 2),
            "memory_before": round(payload.memory_before, 2),
            "memory_after": round(payload.memory_after, 2),
            "status": payload.status,
            "func_name": payload.func_name or "handle_message",
            "metadata": payload.metadata or {},
        }

        self.events.append(event_dict)
        self.total_requests = payload.request_count if payload.request_count > self.total_requests else self.total_requests + 1
        self.total_success = payload.success_count if payload.success_count >= self.total_success else self.total_success + (1 if payload.status == "success" else 0)
        self.total_errors = payload.error_count if payload.error_count >= self.total_errors else self.total_errors + (1 if payload.status != "success" else 0)
        self.latest_cpu = event_dict["cpu_after"]
        self.latest_memory = event_dict["memory_after"]

        return event_dict

    def get_summary(self) -> MetricSummary:
        total = self.total_requests or len(self.events) or 1
        success = self.total_success
        errors = self.total_errors

        success_rate = (success / total) * 100 if total > 0 else 100.0
        error_rate = (errors / total) * 100 if total > 0 else 0.0

        latencies = [e["latency_ms"] for e in self.events if "latency_ms" in e]
        if latencies:
            avg_lat = sum(latencies) / len(latencies)
            sorted_lat = sorted(latencies)
            p50_idx = int(math.ceil(0.50 * len(sorted_lat))) - 1
            p95_idx = int(math.ceil(0.95 * len(sorted_lat))) - 1
            p50_lat = sorted_lat[max(0, p50_idx)]
            p95_lat = sorted_lat[max(0, p95_idx)]
        else:
            avg_lat, p50_lat, p95_lat = 0.0, 0.0, 0.0

        return MetricSummary(
            total_requests=self.total_requests,
            total_success=self.total_success,
            total_errors=self.total_errors,
            success_rate=round(success_rate, 2),
            error_rate=round(error_rate, 2),
            avg_latency_ms=round(avg_lat, 2),
            p50_latency_ms=round(p50_lat, 2),
            p95_latency_ms=round(p95_lat, 2),
            current_cpu=round(self.latest_cpu, 2),
            current_memory=round(self.latest_memory, 2),
            events_count=len(self.events),
            uptime_seconds=round(time.time() - START_TIME, 1),
        )

    def reset(self):
        self.events.clear()
        self.total_requests = 0
        self.total_success = 0
        self.total_errors = 0
        self.latest_cpu = 0.0
        self.latest_memory = 0.0


store = TelemetryStore()
ws_manager = ConnectionManager()


# ---------------------------------------------------------------------------
# API Routes: Metrics Ingestion & Querying
# ---------------------------------------------------------------------------
@app.post("/api/metrics", status_code=201)
@app.post("/api/telemetry", status_code=201)
async def ingest_metrics(payload: MetricPayload):
    """
    Ingests metrics exported from AgentMonitor (observ.py).
    Broadcasts the recorded metric to active WebSockets in real time.
    """
    event = store.add_metric(payload)
    summary = store.get_summary()

    # Broadcast to live dashboard clients
    await ws_manager.broadcast({
        "type": "new_metric",
        "data": event,
        "summary": summary.model_dump(),
    })

    return {
        "status": "recorded",
        "event": event,
        "summary": summary,
    }


@app.get("/api/metrics/summary", response_model=MetricSummary)
async def get_metrics_summary():
    """
    Returns aggregated KPIs (requests, success rate, latency percentiles, resources).
    """
    return store.get_summary()


@app.get("/api/metrics/latest")
async def get_latest_metric():
    """
    Returns the most recent metric recorded.
    """
    if not store.events:
        return {"status": "empty", "latest": None}
    return {"status": "ok", "latest": store.events[-1]}


@app.get("/api/metrics/history")
async def get_metrics_history(limit: int = 50):
    """
    Returns recent events and time-series series points for charting.
    """
    events_list = list(store.events)[-limit:]
    chart_series = [
        {
            "time": e["timestamp"][-8:-1] if len(e.get("timestamp", "")) >= 8 else "",
            "latency": e["latency_ms"],
            "cpu": e["cpu_after"],
            "memory": e["memory_after"],
            "status": e["status"],
        }
        for e in events_list
    ]

    return {
        "count": len(events_list),
        "history": events_list,
        "chart_series": chart_series,
    }


@app.get("/api/overview/kpis")
async def get_overview_kpis():
    """
    Matches the Next.js `OverviewKPIs` schema in apps/web/types/telemetry.ts.
    Directly pluggable into the frontend dashboard!
    """
    summary = store.get_summary()
    recent = list(store.events)[-10:]
    latencies = [e["latency_ms"] for e in recent] if recent else [0.0]

    return {
        "totalTraces": summary.total_requests,
        "totalTracesDeltaPct": 0.0,
        "errorRate": round(summary.error_rate / 100.0, 4),
        "errorRateDeltaPct": 0.0,
        "p50LatencyMs": summary.p50_latency_ms,
        "p50LatencyDeltaPct": 0.0,
        "p95LatencyMs": summary.p95_latency_ms,
        "p95LatencyDeltaPct": 0.0,
        "totalTokens": 0,
        "totalTokensDeltaPct": 0.0,
        "totalCostUsd": 0.0,
        "totalCostDeltaPct": 0.0,
        "sparklines": {
            "traces": [len(recent)],
            "errorRate": [summary.error_rate],
            "latency": latencies,
            "tokens": [0],
            "cost": [0],
        },
    }


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "asi-telemetry-backend",
        "uptime_seconds": round(time.time() - START_TIME, 1),
        "events_count": len(store.events),
    }


@app.post("/api/metrics/reset")
async def reset_metrics():
    store.reset()
    await ws_manager.broadcast({"type": "reset", "summary": store.get_summary().model_dump()})
    return {"status": "reset_successful"}


# ---------------------------------------------------------------------------
# Real-Time WebSocket Streaming
# ---------------------------------------------------------------------------
@app.websocket("/ws/metrics")
async def websocket_metrics(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial snapshot upon connection
        await websocket.send_json({
            "type": "initial_state",
            "summary": store.get_summary().model_dump(),
            "history": list(store.events)[-20:],
        })
        while True:
            # Keep-alive ping/pong
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


# ---------------------------------------------------------------------------
# Built-In Live Interactive Dashboard (HTML/JS)
# ---------------------------------------------------------------------------
@app.get("/", response_class=HTMLResponse)
@app.get("/dashboard", response_class=HTMLResponse)
async def live_dashboard():
    return HTMLResponse(content=DASHBOARD_HTML)


DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ASI-Telemetry | Live Agent Observability</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 500: '#6366f1', 600: '#4f46e5' },
            darkbg: '#090d16',
            darkcard: '#111827',
            cardborder: '#1f2937'
          }
        }
      }
    }
  </script>
  <style>
    body { background-color: #090d16; color: #f3f4f6; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
    .glass { background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.08); }
    .pulse-dot { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
  </style>
</head>
<body class="min-h-screen p-4 md:p-8">
  <div class="max-w-7xl mx-auto space-y-6">

    <!-- Header -->
    <header class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-gray-800">
      <div>
        <div class="flex items-center gap-3">
          <span class="text-2xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            ASI-Telemetry
          </span>
          <span class="text-xs px-2.5 py-0.5 rounded-full border border-indigo-500/30 text-indigo-400 bg-indigo-500/10 font-mono">
            FastAPI Live Agent Backend
          </span>
        </div>
        <p class="text-xs text-gray-400 mt-1">Real-time telemetry ingestion, resource monitoring & performance analytics</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-800 bg-gray-900/80 text-xs">
          <span id="wsStatusDot" class="w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-dot"></span>
          <span id="wsStatusText" class="text-gray-300 font-mono">Live WebSocket</span>
        </div>
        <button onclick="testMetric()" class="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition">
          + Simulate Metric
        </button>
        <button onclick="resetMetrics()" class="text-xs px-3 py-1.5 rounded-lg border border-gray-700 hover:bg-gray-800 text-gray-400 hover:text-white transition">
          Reset
        </button>
      </div>
    </header>

    <!-- KPI Grid -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      <div class="glass p-4 rounded-xl">
        <div class="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Requests</div>
        <div id="statRequests" class="text-2xl font-bold font-mono text-white mt-1">0</div>
        <div class="text-[11px] text-gray-500 mt-1">Total handled</div>
      </div>
      <div class="glass p-4 rounded-xl">
        <div class="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Success Rate</div>
        <div id="statSuccessRate" class="text-2xl font-bold font-mono text-emerald-400 mt-1">100%</div>
        <div id="statSuccessCount" class="text-[11px] text-emerald-500/80 mt-1">0 success</div>
      </div>
      <div class="glass p-4 rounded-xl">
        <div class="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Error Rate</div>
        <div id="statErrorRate" class="text-2xl font-bold font-mono text-rose-400 mt-1">0%</div>
        <div id="statErrorCount" class="text-[11px] text-rose-500/80 mt-1">0 errors</div>
      </div>
      <div class="glass p-4 rounded-xl">
        <div class="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Avg Latency</div>
        <div id="statAvgLatency" class="text-2xl font-bold font-mono text-indigo-400 mt-1">0.0 ms</div>
        <div class="text-[11px] text-gray-500 mt-1">Response time</div>
      </div>
      <div class="glass p-4 rounded-xl">
        <div class="text-[11px] uppercase tracking-wider text-gray-400 font-medium">P95 Latency</div>
        <div id="statP95Latency" class="text-2xl font-bold font-mono text-purple-400 mt-1">0.0 ms</div>
        <div class="text-[11px] text-gray-500 mt-1">95th percentile</div>
      </div>
      <div class="glass p-4 rounded-xl">
        <div class="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Host CPU / RAM</div>
        <div id="statResources" class="text-2xl font-bold font-mono text-amber-400 mt-1">0% / 0%</div>
        <div class="text-[11px] text-gray-500 mt-1">System usage</div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="glass p-5 rounded-xl">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-gray-200">Execution Latency (ms)</h2>
          <span class="text-xs text-gray-500 font-mono">Recent operations</span>
        </div>
        <div class="h-56">
          <canvas id="latencyChart"></canvas>
        </div>
      </div>
      <div class="glass p-5 rounded-xl">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-gray-200">CPU & Memory Usage (%)</h2>
          <span class="text-xs text-gray-500 font-mono">Resource footprint</span>
        </div>
        <div class="h-56">
          <canvas id="resourceChart"></canvas>
        </div>
      </div>
    </div>

    <!-- Live Event Feed Table -->
    <div class="glass rounded-xl overflow-hidden">
      <div class="px-5 py-3.5 border-b border-gray-800 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <h2 class="text-sm font-semibold text-gray-200">Live Telemetry Events</h2>
          <span id="eventsBadge" class="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 font-mono">0 events</span>
        </div>
        <span class="text-xs text-gray-500">Auto-updates in real time</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-gray-900/60 text-gray-400 border-b border-gray-800">
            <tr>
              <th class="py-2.5 px-4 font-medium">Timestamp</th>
              <th class="py-2.5 px-4 font-medium">Agent</th>
              <th class="py-2.5 px-4 font-medium">Status</th>
              <th class="py-2.5 px-4 font-medium">Latency</th>
              <th class="py-2.5 px-4 font-medium">CPU Before/After</th>
              <th class="py-2.5 px-4 font-medium">RAM Before/After</th>
            </tr>
          </thead>
          <tbody id="eventsTableBody" class="divide-y divide-gray-800 text-gray-300 font-mono">
            <tr>
              <td colspan="6" class="py-8 text-center text-gray-500">
                Waiting for incoming metrics from <code class="text-indigo-400">observ.py</code>...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>

  <script>
    // Initialize Charts
    const maxDataPoints = 25;
    const latencyCtx = document.getElementById('latencyChart').getContext('2d');
    const latencyChart = new Chart(latencyCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Latency (ms)',
          borderColor: '#818cf8',
          backgroundColor: 'rgba(129, 140, 248, 0.1)',
          data: [],
          tension: 0.35,
          fill: true,
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b7280', font: { size: 10 } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b7280', font: { size: 10 } }, beginAtZero: true }
        }
      }
    });

    const resourceCtx = document.getElementById('resourceChart').getContext('2d');
    const resourceChart = new Chart(resourceCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'CPU (%)',
            borderColor: '#fbbf24',
            backgroundColor: 'rgba(251, 191, 36, 0.05)',
            data: [],
            tension: 0.35,
            pointRadius: 2
          },
          {
            label: 'Memory (%)',
            borderColor: '#34d399',
            backgroundColor: 'rgba(52, 211, 153, 0.05)',
            data: [],
            tension: 0.35,
            pointRadius: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#9ca3af', font: { size: 11 } } }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b7280', font: { size: 10 } } },
          y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b7280', font: { size: 10 } } }
        }
      }
    });

    let eventsLog = [];

    function updateKPIs(summary) {
      if (!summary) return;
      document.getElementById('statRequests').innerText = summary.total_requests;
      document.getElementById('statSuccessRate').innerText = summary.success_rate.toFixed(1) + '%';
      document.getElementById('statSuccessCount').innerText = summary.total_success + ' success';
      document.getElementById('statErrorRate').innerText = summary.error_rate.toFixed(1) + '%';
      document.getElementById('statErrorCount').innerText = summary.total_errors + ' errors';
      document.getElementById('statAvgLatency').innerText = summary.avg_latency_ms.toFixed(1) + ' ms';
      document.getElementById('statP95Latency').innerText = summary.p95_latency_ms.toFixed(1) + ' ms';
      document.getElementById('statResources').innerText = summary.current_cpu + '% / ' + summary.current_memory + '%';
    }

    function addEventToUI(event) {
      eventsLog.unshift(event);
      if (eventsLog.length > 50) eventsLog.pop();

      document.getElementById('eventsBadge').innerText = eventsLog.length + ' events';

      // Update Table
      const tbody = document.getElementById('eventsTableBody');
      const timeStr = event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
      const statusBadge = event.status === 'success'
        ? '<span class="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">SUCCESS</span>'
        : '<span class="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/30">ERROR</span>';

      const rowHtml = `
        <tr class="hover:bg-gray-800/40 transition">
          <td class="py-2.5 px-4 text-gray-400">${timeStr}</td>
          <td class="py-2.5 px-4 text-white font-medium">${event.agent_name || 'agent'}</td>
          <td class="py-2.5 px-4">${statusBadge}</td>
          <td class="py-2.5 px-4 text-indigo-300 font-semibold">${event.latency_ms} ms</td>
          <td class="py-2.5 px-4 text-amber-300">${event.cpu_before}% &rarr; ${event.cpu_after}%</td>
          <td class="py-2.5 px-4 text-emerald-300">${event.memory_before}% &rarr; ${event.memory_after}%</td>
        </tr>
      `;

      if (eventsLog.length === 1) {
        tbody.innerHTML = rowHtml;
      } else {
        tbody.insertAdjacentHTML('afterbegin', rowHtml);
      }

      // Update Charts
      latencyChart.data.labels.push(timeStr);
      latencyChart.data.datasets[0].data.push(event.latency_ms);
      if (latencyChart.data.labels.length > maxDataPoints) {
        latencyChart.data.labels.shift();
        latencyChart.data.datasets[0].data.shift();
      }
      latencyChart.update();

      resourceChart.data.labels.push(timeStr);
      resourceChart.data.datasets[0].data.push(event.cpu_after);
      resourceChart.data.datasets[1].data.push(event.memory_after);
      if (resourceChart.data.labels.length > maxDataPoints) {
        resourceChart.data.labels.shift();
        resourceChart.data.datasets[0].data.shift();
        resourceChart.data.datasets[1].data.shift();
      }
      resourceChart.update();
    }

    // Connect WebSocket
    function connectWS() {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws/metrics`);

      ws.onopen = () => {
        document.getElementById('wsStatusDot').className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-dot';
        document.getElementById('wsStatusText').innerText = 'Live WebSocket';
      };

      ws.onmessage = (msg) => {
        try {
          const payload = JSON.parse(msg.data);
          if (payload.type === 'initial_state') {
            updateKPIs(payload.summary);
            if (payload.history && payload.history.length > 0) {
              payload.history.forEach(addEventToUI);
            }
          } else if (payload.type === 'new_metric') {
            updateKPIs(payload.summary);
            addEventToUI(payload.data);
          } else if (payload.type === 'reset') {
            updateKPIs(payload.summary);
            eventsLog = [];
            document.getElementById('eventsTableBody').innerHTML = '<tr><td colspan="6" class="py-8 text-center text-gray-500">Reset completed. Waiting for metrics...</td></tr>';
            latencyChart.data.labels = [];
            latencyChart.data.datasets[0].data = [];
            latencyChart.update();
            resourceChart.data.labels = [];
            resourceChart.data.datasets[0].data = [];
            resourceChart.data.datasets[1].data = [];
            resourceChart.update();
          }
        } catch (e) {
          console.error(e);
        }
      };

      ws.onclose = () => {
        document.getElementById('wsStatusDot').className = 'w-2.5 h-2.5 rounded-full bg-amber-500';
        document.getElementById('wsStatusText').innerText = 'Reconnecting...';
        setTimeout(connectWS, 2000);
      };
    }

    // Simulate metric test button
    async function testMetric() {
      await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_name: 'assistant',
          request_count: (eventsLog.length + 1),
          success_count: (eventsLog.length + 1),
          error_count: 0,
          latency_ms: (Math.random() * 25 + 5),
          cpu_before: (Math.random() * 15 + 5),
          cpu_after: (Math.random() * 20 + 8),
          memory_before: 42.1,
          memory_after: 42.4,
          status: 'success'
        })
      });
    }

    async function resetMetrics() {
      await fetch('/api/metrics/reset', { method: 'POST' });
    }

    connectWS();
  </script>
</body>
</html>
"""

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
