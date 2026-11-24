import logging
import threading
from contextlib import contextmanager
from typing import Any, Dict, Generator, List, Optional

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings
from app.db.base import Base, import_models

logger = logging.getLogger("asi_telemetry.db")


class DatabaseManager:
    """Manages PostgreSQL engine, SQLAlchemy sessions, and fallback state."""

    def __init__(self):
        self.engine = None
        self.SessionFactory = None
        self.is_connected = False
        self._lock = threading.Lock()
        self.memory_records: List[Dict[str, Any]] = []
        self.llm_records: List[Dict[str, Any]] = []

    @property
    def client(self):
        """Compatibility accessor returning the underlying engine when connected."""
        return self.engine if self.is_connected else None

    def connect(self):
        """Initializes SQLAlchemy engine and verifies PostgreSQL connection with retry."""
        db_url = settings.database_url_resolved
        connect_args: dict[str, Any] = {}
        if "pg8000" in db_url:
            if "ssl" in db_url.lower():
                import ssl
                ssl_ctx = ssl.create_default_context()
                ssl_ctx.check_hostname = False
                ssl_ctx.verify_mode = ssl.CERT_NONE
                connect_args["ssl_context"] = ssl_ctx
            if "?" in db_url:
                db_url = db_url.split("?")[0]
        elif "psycopg" in db_url:
            connect_args["connect_timeout"] = 5

        for attempt in range(1, 4):
            try:
                self.engine = create_engine(
                    db_url,
                    pool_pre_ping=True,
                    pool_size=10,
                    max_overflow=20,
                    connect_args=connect_args,
                )
                # Test connection
                with self.engine.connect() as conn:
                    conn.execute(text("SELECT 1"))

                self.SessionFactory = sessionmaker(
                    autocommit=False,
                    autoflush=False,
                    bind=self.engine,
                )
                self.is_connected = True
                safe_target = (
                    db_url.split("@")[-1]
                    if "@" in db_url
                    else f"{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
                )
                logger.info(f"Connected to PostgreSQL at {safe_target}")
                return
            except Exception as e:
                if attempt < 3:
                    import time
                    time.sleep(1.0)
                    continue
                self.is_connected = False
                self.engine = None
                self.SessionFactory = None
                logger.warning(f"Could not connect to PostgreSQL ({e}). Using in-memory fallback.")

    def disconnect(self):
        """Closes connection pool and disposes engine."""
        with self._lock:
            if self.engine:
                try:
                    self.engine.dispose()
                except Exception:
                    pass
                self.engine = None
                self.SessionFactory = None
            self.is_connected = False

    def get_session(self) -> Optional[Session]:
        """Creates and returns a new SQLAlchemy session if connected."""
        if self.is_connected and self.SessionFactory:
            return self.SessionFactory()
        return None

    @contextmanager
    def session_scope(self) -> Generator[Optional[Session], None, None]:
        """Provide a transactional scope around a series of operations."""
        session = self.get_session()
        if session is None:
            yield None
            return
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def safe_query(self, sql: str, **kwargs):
        with self._lock:
            if not self.is_connected or not self.engine:
                raise RuntimeError("PostgreSQL database is not connected")
            with self.engine.connect() as conn:
                return conn.execute(text(sql), kwargs.get("parameters") or {})

    def check_connection(self) -> bool:
        """Returns True if the database is reachable."""
        if not self.is_connected or not self.engine:
            return False
        try:
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except Exception:
            return False


db_manager = DatabaseManager()
# Alias for backwards-compatibility
db_connection = db_manager


def get_db() -> Generator[Optional[Session], None, None]:
    """FastAPI dependency yielding an active SQLAlchemy session."""
    with db_manager.session_scope() as session:
        yield session


def initialize_schema(db: DatabaseManager = db_manager) -> None:
    """Creates all database tables using SQLAlchemy ORM metadata if they do not exist."""
    import_models()
    if db.is_connected and db.engine:
        try:
            Base.metadata.create_all(bind=db.engine)
            logger.info("Database schemas verified and initialized.")
        except Exception as e:
            logger.error(f"Error during schema initialization: {e}")
