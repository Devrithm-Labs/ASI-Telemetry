import logging
from config.database import ClickHouseConnection

logger = logging.getLogger("backend.clickhouse.schema")


def create_telemetry_table(conn: ClickHouseConnection):
    """Creates the telemetry_metrics table with response_time_ms."""
    if not conn.is_connected or not conn.client:
        return

    query = """
    CREATE TABLE IF NOT EXISTS telemetry_metrics (
        id String,
        timestamp DateTime64(3, 'UTC'),
        agent_name LowCardinality(String),
        func_name LowCardinality(String),
        status LowCardinality(String),
        response_time_ms Float64,
        cpu_before Float64,
        cpu_after Float64,
        memory_before Float64,
        memory_after Float64,
        metadata String
    ) ENGINE = MergeTree()
    ORDER BY (timestamp, agent_name);
    """
    try:
        conn.safe_command(query)
    except Exception as e:
        logger.warning(f"Error creating telemetry_metrics table: {e}")


def create_llm_table(conn: ClickHouseConnection):
    """Creates the dedicated llm_traces table in ClickHouse."""
    if not conn.is_connected or not conn.client:
        return

    query = """
    CREATE TABLE IF NOT EXISTS llm_traces (
        id String,
        trace_id String,
        span_id String,
        parent_id Nullable(String),
        name String,
        run_type LowCardinality(String),
        status LowCardinality(String),
        model LowCardinality(String),
        input String,
        output String,
        error Nullable(String),
        start_time DateTime64(3, 'UTC'),
        end_time DateTime64(3, 'UTC'),
        latency_ms Float64,
        prompt_tokens UInt32,
        completion_tokens UInt32,
        total_tokens UInt32,
        cost_usd Float64,
        metadata String,
        agent_address LowCardinality(String),
        agent_handle LowCardinality(String)
    ) ENGINE = MergeTree()
    ORDER BY (trace_id, start_time);
    """
    try:
        conn.safe_command(query)
        conn.safe_command("ALTER TABLE llm_traces ADD COLUMN IF NOT EXISTS agent_address LowCardinality(String)")
        conn.safe_command("ALTER TABLE llm_traces ADD COLUMN IF NOT EXISTS agent_handle LowCardinality(String)")
    except Exception as e:
        logger.warning(f"Error creating llm_traces table: {e}")


def migrate_telemetry_table(conn: ClickHouseConnection):
    """Ensures telemetry_metrics schema has response_time_ms, agent_address, agent_handle and drops legacy columns."""
    if not conn.is_connected or not conn.client:
        return

    try:
        res = conn.safe_query("DESCRIBE TABLE telemetry_metrics")
        cols = [c[0] for c in res.result_rows]

        # 1. Add response_time_ms if not present
        if "response_time_ms" not in cols:
            conn.safe_command(
                "ALTER TABLE telemetry_metrics ADD COLUMN IF NOT EXISTS response_time_ms Float64"
            )
            if "latency_ms" in cols:
                conn.safe_command(
                    "ALTER TABLE telemetry_metrics UPDATE response_time_ms = latency_ms WHERE response_time_ms = 0"
                )

        if "agent_address" not in cols:
            conn.safe_command(
                "ALTER TABLE telemetry_metrics ADD COLUMN IF NOT EXISTS agent_address LowCardinality(String)"
            )
        if "agent_handle" not in cols:
            conn.safe_command(
                "ALTER TABLE telemetry_metrics ADD COLUMN IF NOT EXISTS agent_handle LowCardinality(String)"
            )

        # 2. Drop legacy columns
        for old_col in ["latency_ms", "request_count", "success_count", "error_count"]:
            if old_col in cols:
                try:
                    conn.safe_command(
                        f"ALTER TABLE telemetry_metrics DROP COLUMN IF EXISTS {old_col}"
                    )
                except Exception:
                    pass
    except Exception as e:
        logger.debug(f"Column migration notice: {e}")


def initialize_schema(conn: ClickHouseConnection):
    """Initializes and migrates all ClickHouse tables."""
    if conn.is_connected:
        create_telemetry_table(conn)
        create_llm_table(conn)
        migrate_telemetry_table(conn)
