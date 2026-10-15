import logging
import threading
from typing import Any, Dict, List, Optional
import clickhouse_connect
from config.settings import settings

logger = logging.getLogger("backend.clickhouse")


class ClickHouseConnection:
    """Manages the ClickHouse client connection and thread-safe execution."""

    def __init__(self):
        self.client = None
        self.is_connected = False
        self._lock = threading.Lock()
        # In-memory fallbacks when ClickHouse is offline
        self.memory_records: List[Dict[str, Any]] = []
        self.llm_records: List[Dict[str, Any]] = []

    def connect(self):
        """Connects to ClickHouse with credentials from settings."""
        try:
            self.client = clickhouse_connect.get_client(
                host=settings.CLICKHOUSE_HOST,
                port=settings.CLICKHOUSE_PORT,
                username=settings.CLICKHOUSE_USER,
                password=settings.CLICKHOUSE_PASSWORD,
                database=settings.CLICKHOUSE_DATABASE,
                secure=settings.CLICKHOUSE_SECURE,
                connect_timeout=5,
            )
            self.is_connected = True
            logger.info(
                f"Connected to ClickHouse at {settings.CLICKHOUSE_HOST}:{settings.CLICKHOUSE_PORT}"
            )
        except Exception as e:
            self.is_connected = False
            self.client = None
            logger.warning(
                f"Could not connect to ClickHouse ({e}). Using in-memory fallback."
            )

    def disconnect(self):
        """Closes ClickHouse client connection if active."""
        if self.client:
            try:
                self.client.close()
            except Exception:
                pass
            self.client = None
            self.is_connected = False

    def safe_query(self, sql: str, **kwargs):
        """Executes a thread-safe query on ClickHouse."""
        with self._lock:
            if not self.is_connected or not self.client:
                raise RuntimeError("ClickHouse is not connected")
            return self.client.query(sql, **kwargs)

    def safe_command(self, cmd: str, **kwargs):
        """Executes a thread-safe command on ClickHouse."""
        with self._lock:
            if not self.is_connected or not self.client:
                raise RuntimeError("ClickHouse is not connected")
            return self.client.command(cmd, **kwargs)

    def safe_insert(self, table: str, data: list, column_names: Optional[List[str]] = None):
        """Executes a thread-safe batch insert into ClickHouse."""
        with self._lock:
            if not self.is_connected or not self.client:
                raise RuntimeError("ClickHouse is not connected")
            return self.client.insert(table, data, column_names=column_names)


# Global singleton database connection
db_connection = ClickHouseConnection()
