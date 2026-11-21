"""Compatibility shim for auth service."""
from services.auth_service import (
    signup,
    login,
    update_profile,
    get_user_by_id,
    get_or_create_google_user,
    insert_refresh_token,
    get_refresh_token_record,
    revoke_refresh_token,
    revoke_token_family,
    revoke_all_user_tokens,
)

__all__ = [
    "signup",
    "login",
    "update_profile",
    "get_user_by_id",
    "get_or_create_google_user",
    "insert_refresh_token",
    "get_refresh_token_record",
    "revoke_refresh_token",
    "revoke_token_family",
    "revoke_all_user_tokens",
]
