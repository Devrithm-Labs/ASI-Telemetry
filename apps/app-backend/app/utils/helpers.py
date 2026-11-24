from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


def utc_now() -> datetime:
    """Returns current datetime in UTC."""
    return datetime.now(timezone.utc)


def format_iso_timestamp(dt: Optional[datetime]) -> str:
    """Formats a datetime as standard ISO 8601 string."""
    if dt is None:
        return ""
    if hasattr(dt, "isoformat"):
        return dt.isoformat()
    return str(dt)


def paginate_list(items: List[Any], page: int = 1, limit: int = 50) -> Dict[str, Any]:
    """Helper to paginate an in-memory list."""
    total = len(items)
    start_idx = max(0, (page - 1) * limit)
    end_idx = start_idx + limit
    paginated = items[start_idx:end_idx]
    return {
        "items": paginated,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if limit > 0 else 1,
    }
