import logging
import threading
from contextlib import contextmanager
from typing import Any, Dict, Generator, List, Optional

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from core.config import settings

logger = logging.getLogger("backend.database")

Base = declarative_base()


class DatabaseManager:
    """Manages PostgreSQL engine, SQLAlchemy sessions, and fallback state."""

    def __init__(self):
        self.engine = None
        self.SessionFactory = None
        self.is_connected = False
        self._lock = threading.Lock()
        # In-memory fallbacks when PostgreSQL is offline
        self.memory_records: List[Dict[str, Any]] = []
        self.llm_records: List[Dict[str, Any]] = []

    @property
    def client(self):
        """Compatibility accessor returning the underlying engine when connected."""
        return self.engine if self.is_connected else None

    def connect(self):
        """Initializes SQLAlchemy engine and verifies PostgreSQL connection."""
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
                safe_target = db_url.split("@")[-1] if "@" in db_url else f"{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
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

    # Legacy compatibility methods
    def safe_query(self, sql: str, **kwargs):
        with self._lock:
            if not self.is_connected or not self.engine:
                raise RuntimeError("PostgreSQL database is not connected")
            with self.engine.connect() as conn:
                return conn.execute(text(sql), kwargs.get("parameters") or {})

    def safe_command(self, cmd: str, **kwargs):
        with self._lock:
            if not self.is_connected or not self.engine:
                raise RuntimeError("PostgreSQL database is not connected")
            with self.engine.begin() as conn:
                return conn.execute(text(cmd), kwargs.get("parameters") or {})

    def safe_insert(self, table: str, data: list, column_names: Optional[List[str]] = None):
        with self._lock:
            if not self.is_connected or not self.engine:
                raise RuntimeError("PostgreSQL database is not connected")
            if not data or not column_names:
                return
            cols = ", ".join(column_names)
            placeholders = ", ".join([f":{col}" for col in column_names])
            insert_sql = text(f"INSERT INTO {table} ({cols}) VALUES ({placeholders})")
            dict_data = [dict(zip(column_names, row)) for row in data]
            with self.engine.begin() as conn:
                conn.execute(insert_sql, dict_data)


# Global singleton database connection
db_connection = DatabaseManager()


@contextmanager
def session_scope() -> Generator[Optional[Session], None, None]:
    """Module-level transactional scope helper using db_connection."""
    with db_connection.session_scope() as session:
        yield session


# Aliases for backward compatibility
PostgresConnection = DatabaseManager


def get_db():
    """FastAPI dependency yielding a database session."""
    session = db_connection.get_session()
    if session is None:
        yield None
        return
    try:
        yield session
    finally:
        session.close()
