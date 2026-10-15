from fastapi import APIRouter
from controllers.health import HealthController

router = APIRouter(prefix="/api", tags=["Health"])


@router.get("/health")
def health_check():
    """Health check endpoint showing ClickHouse database status."""
    return HealthController.get_health()
