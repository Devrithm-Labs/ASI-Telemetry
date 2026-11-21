import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from config.database import Base, DatabaseManager
from database.schema import (
    TelemetryMetricModel,
    LLMTraceModel,
    ApiKeyModel,
    UserModel,
    RefreshTokenModel,
    OAuthSessionModel,
    initialize_schema,
)
from database.telemetry import TelemetryRepository
from database.llm import LLMRepository


@pytest.fixture
def test_db():
    """Sets up an in-memory SQLite database using the SQLAlchemy Base schema for testing."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    manager = DatabaseManager()
    manager.engine = engine
    manager.SessionFactory = TestingSessionLocal
    manager.is_connected = True

    yield manager

    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_user_model_crud(test_db):
    """Test creating and retrieving a user with SQLAlchemy ORM."""
    with test_db.session_scope() as session:
        user = UserModel(
            id="user-123",
            name="Alice Developer",
            email="alice@example.com",
            password_hash="argon2_hashed_secret",
            created_at=datetime.now(timezone.utc),
        )
        session.add(user)

    with test_db.session_scope() as session:
        queried = session.query(UserModel).filter(UserModel.email == "alice@example.com").first()
        assert queried is not None
        assert queried.name == "Alice Developer"
        assert queried.id == "user-123"


def test_telemetry_repository_with_sqlalchemy(test_db):
    """Test inserting and retrieving telemetry metrics through TelemetryRepository."""
    repo = TelemetryRepository(conn=test_db)

    # Ingest metrics
    metric_data = {
        "agent_name": "agent-orchestrator",
        "func_name": "process_task",
        "status": "success",
        "response_time_ms": 125.4,
        "user_id": "user-456",
        "metadata": {"custom_tag": "v1.2", "agent_address": "agent1qtest"},
    }
    record = repo.insert_metric(metric_data)
    assert record["agent_name"] == "agent-orchestrator"
    assert record["response_time_ms"] == 125.4

    # Query dashboard data
    dashboard = repo.get_dashboard_data(user_id="user-456")
    assert dashboard["summary"]["total_requests"] == 1
    assert dashboard["summary"]["total_success"] == 1
    assert len(dashboard["traces"]) == 1
    assert dashboard["traces"][0]["name"] == "process_task"

    # Delete traces
    res = repo.delete_traces(user_id="user-456")
    assert res["status"] == "success"

    # Verify empty after deletion
    dashboard_after = repo.get_dashboard_data(user_id="user-456")
    assert dashboard_after["summary"]["total_requests"] == 0


def test_llm_repository_with_sqlalchemy(test_db):
    """Test inserting, searching, and clearing LLM traces with LLMRepository."""
    repo = LLMRepository(conn=test_db)

    # Insert LLM trace
    trace_payload = {
        "trace_id": "trace-abc-123",
        "name": "gemini_completion",
        "run_type": "llm",
        "status": "success",
        "model": "gemini-3.8-flash",
        "input": "Summarize the quarterly report.",
        "output": "Here is the summary of Q3...",
        "latency_ms": 450.2,
        "prompt_tokens": 120,
        "completion_tokens": 55,
        "total_tokens": 175,
        "cost_usd": 0.00012,
        "user_id": "user-789",
    }
    trace = repo.insert_llm_trace(trace_payload)
    assert trace["trace_id"] == "trace-abc-123"

    # Search traces
    traces_res = repo.get_llm_traces(search="quarterly", user_id="user-789")
    assert traces_res["total"] == 1
    assert traces_res["stats"]["total_tokens"] == 175

    # Monitoring data
    monitoring = repo.get_llm_monitoring_data(user_id="user-789")
    assert monitoring["summary"]["totalCount"] == 1
    assert "gemini-3.8-flash" in monitoring["models"]

    # Clear traces
    clear_res = repo.clear_llm_traces(user_id="user-789")
    assert clear_res["status"] == "success"

    traces_after = repo.get_llm_traces(user_id="user-789")
    assert traces_after["total"] == 0


def test_api_keys_and_tokens_models(test_db):
    """Test ApiKeyModel and RefreshTokenModel schema integrity."""
    now = datetime.now(timezone.utc)
    with test_db.session_scope() as session:
        key = ApiKeyModel(
            id="key_1",
            user_id="user-1",
            name="Prod Key",
            key_prefix="asi_live_abc1",
            full_key="asi_live_secretkey1234567890",
            environment="production",
            permissions='["telemetry:write", "telemetry:read"]',
            rate_limit="25,000 req/min",
            status="active",
            created_at=now,
        )
        token = RefreshTokenModel(
            id="tok_1",
            user_id="user-1",
            token_hash="sha256_hash_here",
            family_id="fam_1",
            created_at=now,
            expires_at=now,
        )
        session.add(key)
        session.add(token)

    with test_db.session_scope() as session:
        saved_key = session.query(ApiKeyModel).filter(ApiKeyModel.id == "key_1").first()
        assert saved_key is not None
        assert saved_key.get_permissions_list() == ["telemetry:write", "telemetry:read"]

        saved_token = session.query(RefreshTokenModel).filter(RefreshTokenModel.id == "tok_1").first()
        assert saved_token is not None
        assert saved_token.family_id == "fam_1"
