"""Compatibility shim for API key service."""
from services.api_key_service import (
    generate_api_key_pair,
    hash_api_key,
    mask_key,
    create_api_key,
    list_api_keys,
    revoke_api_key,
    resolve_user_id_from_api_key,
)

__all__ = [
    "generate_api_key_pair",
    "hash_api_key",
    "mask_key",
    "create_api_key",
    "list_api_keys",
    "revoke_api_key",
    "resolve_user_id_from_api_key",
]
