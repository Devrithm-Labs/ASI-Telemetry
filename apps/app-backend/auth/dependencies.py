"""Compatibility shim for auth dependencies."""
from api.dependencies import (
    get_current_user,
    resolve_request_user_id,
    oauth2_scheme,
    api_key_header,
)

__all__ = [
    "get_current_user",
    "resolve_request_user_id",
    "oauth2_scheme",
    "api_key_header",
]
