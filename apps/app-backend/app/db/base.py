from sqlalchemy.orm import declarative_base

Base = declarative_base()

# Import models here so Alembic discovery and metadata includes all tables
def import_models():
    import app.models.user  # noqa: F401
    import app.models.api_key  # noqa: F401
    import app.models.telemetry  # noqa: F401
    import app.models.llm  # noqa: F401

__all__ = ["Base", "import_models"]
