import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base, import_models
from app.db.session import DatabaseManager, db_manager
import app.db.session as sess
import app.repositories.telemetry as tr
import app.repositories.llm as lr
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
def client(test_db):
    """FastAPI TestClient fixture bound to test_db."""
    orig_engine = sess.db_manager.engine
    orig_factory = sess.db_manager.SessionFactory
    orig_connected = sess.db_manager.is_connected

    sess.db_manager.engine = test_db.engine
    sess.db_manager.SessionFactory = test_db.SessionFactory
    sess.db_manager.is_connected = True
    tr.telemetry_repo.conn = sess.db_manager
    lr.llm_repo.db = sess.db_manager

    with TestClient(app) as test_client:
        yield test_client

    sess.db_manager.engine = orig_engine
    sess.db_manager.SessionFactory = orig_factory
    sess.db_manager.is_connected = orig_connected
    tr.telemetry_repo.conn = sess.db_manager
    lr.llm_repo.db = sess.db_manager
