# ASI-Telemetry Backend (FastAPI + ClickHouse)

A simple, easy-to-understand backend for ingesting AI Agent SDK telemetry metrics and storing them in **ClickHouse** with timestamps.

---

## 📂 Simplified Folder Structure

The project follows a standard MVC / Controller-Route architecture:

```text
apps/app-backend/
├── config/
│   └── settings.py       # Reads server and ClickHouse settings from .env
├── database/
│   └── clickhouse.py     # ClickHouse client & table operations (stores data with timestamps)
├── schemas/
│   └── telemetry.py      # Pydantic schemas for SDK input data & responses
├── controllers/
│   └── telemetry.py      # Business logic: saves metrics & queries data
├── routes/
│   └── telemetry.py      # FastAPI endpoints (/api/metrics, /api/health, /api/metrics/summary)
├── main.py               # Minimal FastAPI app (CORS + mounts routes) (~35 lines)
├── run.py                # Runner script to start the server
├── requirements.txt      # Minimal Python packages
├── .env                  # Active ClickHouse and server credentials
├── .env.example          # Sample environment file
└── README.md             # This guide
```

---

## 🗄️ ClickHouse Table & Timestamps

ClickHouse stores time-series data in the `telemetry_metrics` table with millisecond UTC precision:

```sql
CREATE TABLE IF NOT EXISTS telemetry_metrics (
    id String,
    timestamp DateTime64(3, 'UTC'),
    agent_name LowCardinality(String),
    func_name LowCardinality(String),
    status LowCardinality(String),
    latency_ms Float64,
    cpu_before Float64,
    cpu_after Float64,
    memory_before Float64,
    memory_after Float64,
    request_count UInt64,
    success_count UInt64,
    error_count UInt64,
    metadata String
) ENGINE = MergeTree()
ORDER BY (timestamp, agent_name);
```

> **Fallback Mode**: If ClickHouse is not currently running on your machine, the backend will log a friendly warning and store records in-memory so your server never crashes during local testing.

---

## ⚙️ Environment Configuration (`.env`)

In `apps/app-backend/.env`:

```env
# Server
HOST=0.0.0.0
PORT=8080

# ClickHouse Database
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
CLICKHOUSE_DATABASE=default
CLICKHOUSE_SECURE=False
```

---

## 🚀 How to Run the Backend

### Step 1: (Optional) Run ClickHouse via Docker
```powershell
docker run -d --name clickhouse-server -p 8123:8123 -p 9000:9000 clickhouse/clickhouse-server:latest
```
*(Or use a free instance at clickhouse.com and put credentials into `.env`)*.

### Step 2: Install Python Dependencies
```powershell
cd apps/app-backend
pip install -r requirements.txt
```

### Step 3: Start the Backend Server
```powershell
python run.py
```
Or directly with uvicorn:
```powershell
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

---

## 🧪 Available API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/metrics` | Ingests telemetry data from SDK and inserts into ClickHouse |
| `GET` | `/api/metrics` | Gets recent telemetry records |
| `GET` | `/api/metrics/summary` | Gets aggregated KPIs (total requests, success, latency, cpu) |
| `GET` | `/api/health` | Health check & ClickHouse connection status |
| `GET` | `/docs` | Interactive Swagger API documentation |
