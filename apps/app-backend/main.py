"""FastAPI entrypoint re-exporting the application from app.main."""
from app.main import app, create_app

__all__ = ["app", "create_app"]
