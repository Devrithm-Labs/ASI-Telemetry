# ASI-Telemetry FastAPI Backend

FastAPI metrics ingestion & telemetry backend for AI agents and the ASI-Telemetry observability dashboard.

---

## Features

- **Ingestion API**: `POST /api/metrics` to receive telemetry directly from `observ.py`.
- **Real-Time WebSocket**: `ws://localhost:8080/ws/metrics` pushes instant live updates to connected dashboards.
- **Built-In Live Dashboard**: Visit `http://localhost:8080/dashboard` for an interactive, dark-mode real-time visualization of agent latency, CPU/memory resource trends, and KPI cards.
- **Next.js Dashboard Integration**: `GET /api/overview/kpis` directly provides the `OverviewKPIs` data structure matching `apps/web/types/telemetry.ts`.
- **CORS Enabled**: Out-of-the-box support for Next.js (`http://localhost:3000`) and other frontends.

---

## Quickstart

### 1. Activate Environment & Run
```bash
cd apps/backend

# Using Python directly:
python run.py

# Or using uvicorn:
uvicorn main:app --port 8080 --reload
```

The server will start on **`http://127.0.0.1:8080`**.

### 2. Available Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/dashboard` | `GET` | Interactive Live Web Dashboard with real-time charts & event log |
| `/docs` | `GET` | Interactive Swagger API documentation |
| `/api/metrics` | `POST` | Ingests metric event exported by `observ.py` |
| `/api/metrics/summary` | `GET` | Aggregated KPIs (requests, success rate, error rate, avg latency, p95, CPU, RAM) |
| `/api/metrics/latest` | `GET` | Returns most recent telemetry event |
| `/api/metrics/history` | `GET` | Time-series history for charts & tables |
| `/api/overview/kpis` | `GET` | Next.js `OverviewKPIs`-compatible schema for `apps/web` |
| `/api/health` | `GET` | Health check & uptime |
| `/ws/metrics` | `WebSocket` | Real-time push stream for dashboard clients |
