import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base, import_models
from app.db.session import DatabaseManager
from app.main import app

import_models()


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


@pytest.fixture
def client():
    """FastAPI TestClient fixture."""
    return TestClient(app)
