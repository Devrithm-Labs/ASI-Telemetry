from fastapi import APIRouter
from core.database import db_connection

router = APIRouter(prefix="/api", tags=["Health"])


@router.get("/health")
def health_check():
    """Health check endpoint showing PostgreSQL database status."""
    return {
        "status": "healthy",
        "database_connected": db_connection.is_connected,
        "database_type": "postgresql",
        "postgres_connected": db_connection.is_connected,
        "clickhouse_connected": db_connection.is_connected,
        "total_records": len(db_connection.memory_records),
        "total_llm_records": len(db_connection.llm_records),
    }
