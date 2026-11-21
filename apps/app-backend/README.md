# ASI-Telemetry Backend (FastAPI + PostgreSQL + SQLAlchemy ORM)

A scalable, reliable backend for ingesting AI Agent SDK telemetry metrics and LLM traces, storing them in **PostgreSQL** using **SQLAlchemy ORM**.

---

## 📂 Simplified & Reliable Folder Structure

The backend has been restructured into an industry-standard, clean, and reliable FastAPI architecture with self-explanatory directory names:

```text
apps/app-backend/
├── core/                         # Core infrastructure & singleton services
│   ├── config.py                 # Central settings & .env configuration
│   ├── database.py               # PostgreSQL engine, sessionmaker, & DatabaseManager
│   └── security.py               # Argon2 password hashing & JWT token encoding/decoding
├── models/                       # SQLAlchemy ORM declarative models
│   ├── base.py                   # Declarative Base metadata
│   ├── telemetry.py              # TelemetryMetricModel (time-series metrics)
│   ├── llm.py                    # LLMTraceModel (prompts, tokens, latency, cost)
│   ├── user.py                   # UserModel, RefreshTokenModel, OAuthSessionModel
│   ├── api_key.py                # ApiKeyModel (scoped API keys)
│   └── __init__.py               # Exports & initialize_schema() helper
├── schemas/                      # Pydantic validation & response schemas
│   ├── telemetry.py              # Telemetry input & summary schemas
│   ├── llm.py                    # LLM trace & span schemas
│   ├── auth.py                   # Signup, login, profile, & token schemas
│   ├── api_key.py                # API key creation & response schemas
│   └── __init__.py               # Aggregated schema exports
├── services/                     # Business logic, repositories, & third-party integrations
│   ├── telemetry_service.py      # TelemetryRepository & dashboard timeline analytics
│   ├── llm_service.py            # LLMRepository & monitoring aggregations
│   ├── auth_service.py           # User authentication & token management
│   ├── api_key_service.py        # API key generation, masking, & verification
│   ├── oauth_service.py          # Google OAuth, PKCE, & agent handoff flow
│   └── __init__.py               # Aggregated services export
├── api/                          # FastAPI REST endpoints & HTTP dependencies
│   ├── dependencies.py           # Auth dependencies (get_current_user, API key resolution)
│   ├── telemetry.py              # /api/metrics, /api/dashboard, /api/traces
│   ├── llm.py                    # /api/llm/traces, /api/llm/monitoring
│   ├── auth.py                   # /api/auth/signup, /login, /me, /profile, /oauth/*
│   ├── api_keys.py               # /api/api-keys
│   ├── health.py                 # /api/health
│   └── __init__.py               # Aggregated api_router mounting all sub-routers
├── tests/                        # Automated unit & integration test suites
│   ├── test_database_sqlalchemy.py
│   ├── test_oauth_and_tokens.py
│   └── test_profile_update.py
├── main.py                       # FastAPI application setup & lifespan
├── run.py                        # Server runner script
├── requirements.txt              # Python package dependencies
├── pyproject.toml                # Project metadata & test configuration
├── pyrightconfig.json            # Strict type checking configuration for Pyright
└── README.md                     # Documentation
```

> **Backwards Compatibility**: Legacy import paths (`config/`, `database/`, `controllers/`, `routes/`, `auth/`) are preserved as lightweight re-export shims so existing tests, scripts, or external clients continue working with 100% backwards compatibility.

---

## 🗄️ PostgreSQL Database & SQLAlchemy ORM Models

All tables are defined as declarative models in `models/` and automatically managed via SQLAlchemy ORM:

- `telemetry_metrics`: Stores time-series metrics from AI agents (`id`, `timestamp`, `agent_name`, `func_name`, `status`, `response_time_ms`, `metadata`, `user_id`).
- `llm_traces`: Stores LLM prompt, completion, span, latency, token, and cost data (`id`, `trace_id`, `span_id`, `name`, `model`, `prompt_tokens`, `completion_tokens`, `cost_usd`, etc.).
- `users`: User accounts with Argon2 password hashing and Google OAuth linkage.
- `refresh_tokens`: Rotated refresh tokens with family tracking and reuse detection.
- `oauth_sessions`: Agent handoff sessions with PKCE verification and token exchange.
- `api_keys`: Scoped API keys with permissions and rate limit tracking.

> **Fallback Mode**: If PostgreSQL is temporarily offline during local development or unit testing, the backend logs a friendly warning and stores records in-memory so your server never crashes.

---

## ⚙️ Environment Configuration (`.env`)

In `apps/app-backend/.env`:

```env
# Server
HOST=0.0.0.0
PORT=8080

# PostgreSQL Database Configuration (SQLAlchemy ORM)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/asi_telemetry
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=asi_telemetry
POSTGRES_SSL=False

# Authentication
AUTH_SECRET_KEY=your-secret-key-here
```

---

## 🚀 How to Run the Backend

### Step 1: (Optional) Run PostgreSQL via Docker
```powershell
docker run -d --name asi-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=asi_telemetry -p 5432:5432 postgres:16-alpine
```

### Step 2: Install Python Dependencies
```powershell
cd apps/app-backend
pip install -r requirements.txt
```

### Step 3: Start the Backend Server
```powershell
python run.py
```

### Step 4: Run Tests & Type Checks
```powershell
# Run all tests
pytest tests -v

# Run type checker
pyright
```
