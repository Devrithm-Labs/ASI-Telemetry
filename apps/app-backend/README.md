# ASI-Telemetry Backend

A modular, clean, and reliable FastAPI backend for ingesting AI Agent telemetry metrics, LLM traces, and managing user authentication and API keys using **PostgreSQL** and **SQLAlchemy ORM**.

---

## 📂 Project Structure

```text
apps/app-backend/
├── app/
│   ├── main.py                 # FastAPI application factory, middleware, and routers
│   ├── api/                    # HTTP presentation layer (thin routers & dependency injection)
│   │   ├── deps.py             # Shared dependencies (get_db, get_current_user, resolve_request_user_id)
│   │   └── v1/
│   │       ├── router.py       # Aggregates all v1 API routers
│   │       ├── auth.py         # /api/v1/auth (signup, login, google oauth, pkce, refresh, logout)
│   │       ├── users.py        # /api/v1/users (profile & user management)
│   │       ├── api_keys.py     # /api/v1/api-keys (create, list, revoke keys)
│   │       ├── telemetry.py    # /api/v1/telemetry & /metrics & /dashboard
│   │       ├── llm.py          # /api/v1/llm (traces & observability monitoring)
│   │       └── health.py       # /api/v1/health (system & database health check)
│   │
│   ├── core/                   # Application-wide setup & singleton utilities
│   │   ├── config.py           # Settings loaded from .env (with pg8000 & SSL normalization)
│   │   ├── security.py         # Argon2 password hashing, JWT tokens, & SHA-256 token hashing
│   │   └── logging.py          # Structured logging configuration
│   │
│   ├── db/                     # Database engine, connection lifecycle, & Alembic base
│   │   ├── base.py             # Declarative Base with model auto-imports for migrations
│   │   └── session.py          # DatabaseManager, engine setup, sessionmaker, & get_db generator
│   │
│   ├── models/                 # SQLAlchemy ORM declarative models (Database tables)
│   │   ├── base.py             # Base metadata
│   │   ├── user.py             # UserModel, RefreshTokenModel, OAuthSessionModel
│   │   ├── api_key.py          # ApiKeyModel (scoped API keys)
│   │   ├── telemetry.py        # TelemetryMetricModel (agent time-series metrics)
│   │   └── llm.py              # LLMTraceModel (LLM prompt/output, latency, tokens, cost)
│   │
│   ├── schemas/                # Pydantic models (Request validation & Response serialization)
│   │   ├── auth.py             # SignupRequest, LoginRequest, AuthResponse, TokenResponse
│   │   ├── user.py             # UserBase, UserCreate, UserUpdate, UserResponse
│   │   ├── api_key.py          # CreateApiKeyRequest, ApiKeyResponse
│   │   ├── telemetry.py        # MetricPayload, MetricSummary, DashboardData, HealthResponse
│   │   └── llm.py              # LLMTracePayload
│   │
│   ├── repositories/           # Database queries only (encapsulates DB operations)
│   │   ├── user.py             # UserRepository
│   │   ├── api_key.py          # ApiKeyRepository
│   │   ├── telemetry.py        # TelemetryRepository
│   │   └── llm.py              # LLMRepository
│   │
│   ├── services/               # Business logic layer (coordinates repos, security, & cache)
│   │   ├── auth.py             # AuthService (login, signup, OAuth 2.0 PKCE, token rotation)
│   │   ├── user.py             # UserService (profile management)
│   │   ├── api_key.py          # ApiKeyService (generation, hashing, validation, masking)
│   │   ├── telemetry.py        # TelemetryService (metric ingestion, analytics, KPIs)
│   │   └── llm.py              # LLMService (LLM traces, search, cost & token monitoring)
│   │
│   └── utils/                  # Reusable helpers & templates
│       ├── helpers.py          # ISO timestamps, UTC utilities, pagination
│       └── templates.py        # HTML templates for OAuth Connect & Callback portals
│
├── migrations/                 # Alembic schema migrations
│   ├── env.py                  # Alembic environment linked to app.db.base.Base
│   ├── script.py.mako
│   └── versions/               # Versioned migration scripts
│
├── tests/                      # Automated test suite
│   ├── conftest.py             # Fixtures: in-memory test_db, FastAPI test client
│   ├── api/
│   │   ├── test_auth.py        # API endpoint tests for signup, login, and me
│   │   └── test_profile.py     # API tests for profile updates and password changes
│   └── services/
│       ├── test_repositories.py# Model & repository CRUD and aggregation tests
│       └── test_oauth_service.py # Full OAuth PKCE, handoff, and token lifecycle tests
│
├── .env.example                # Example environment variables
├── .gitignore
├── alembic.ini                 # Alembic database configuration
├── Dockerfile                  # Production container Dockerfile
├── docker-compose.yml          # Container stack: app + PostgreSQL + Redis
├── main.py                     # Entrypoint exporting `app`
├── package.json                # Turborepo runner configuration
├── pyproject.toml              # Dependencies & Pytest configuration
├── pyrightconfig.json          # Pyright typechecker configuration
├── README.md                   # This documentation
├── requirements.txt            # Python dependencies
└── run.py                      # Local development runner
```

---

## 🚀 Getting Started

### 1. Environment Setup

Create `.env` by copying `.env.example`:

```bash
cp .env.example .env
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

### 2. Start the Server

```bash
python run.py
```

- API Docs (Swagger UI): [http://localhost:8080/docs](http://localhost:8080/docs)
- Interactive ReDoc: [http://localhost:8080/redoc](http://localhost:8080/redoc)

### 3. Docker Compose Stack

Run the backend together with PostgreSQL and Redis:

```bash
docker compose up -d --build
```

---

## 🧪 Running Tests

Run the full automated test suite with pytest:

```bash
pytest tests -v
```

---

## 🔄 Database Migrations (Alembic)

Generate a new migration when models change:

```bash
alembic revision --autogenerate -m "describe_changes"
```

Apply migrations:

```bash
alembic upgrade head
```
