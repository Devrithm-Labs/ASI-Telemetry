"""Environment-driven configuration for the ASI-Telemetry ACP agent.

All runtime settings are read from environment variables (optionally via a
local ``.env`` file which is never committed). Configuration is validated at
load time so that misconfiguration fails fast with a clear message instead of
surfacing as a runtime error deep inside message handling.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv

# Load .env from the app-agent directory (same convention as the backend).
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

SUPPORTED_ACCOUNT_AUTH_MODES = ("link",)
SUPPORTED_LOG_LEVELS = ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL")


class ConfigError(ValueError):
    """Raised when the agent configuration is missing or invalid."""


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise ConfigError(f"{name} must be an integer, got {raw!r}") from exc


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return float(raw)
    except ValueError as exc:
        raise ConfigError(f"{name} must be a number, got {raw!r}") from exc


@dataclass(frozen=True)
class Settings:
    """Validated runtime settings for the agent."""

    agent_name: str = "asi_telemetry_agent"
    agent_seed_phrase: Optional[str] = None
    agent_port: int = 8200
    agent_endpoint: List[str] = field(default_factory=list)
    agent_mailbox: bool = False

    telemetry_api_base_url: str = "http://localhost:8080"
    telemetry_account_auth_mode: str = "link"

    http_timeout_seconds: float = 10.0
    log_level: str = "INFO"

    @staticmethod
    def from_env() -> "Settings":
        """Build settings from the environment and validate them."""
        name = os.getenv("AGENT_NAME", "asi_telemetry_agent").strip() or "asi_telemetry_agent"
        seed = os.getenv("AGENT_SEED_PHRASE", "").strip() or None
        port = _env_int("AGENT_PORT", _env_int("PORT", 8200))
        mailbox = _env_bool("AGENT_MAILBOX", False)

        base_url = os.getenv("TELEMETRY_API_BASE_URL", "http://localhost:8080").strip()
        auth_mode = os.getenv("TELEMETRY_ACCOUNT_AUTH_MODE", "link").strip().lower() or "link"
        timeout = _env_float("HTTP_TIMEOUT_SECONDS", 10.0)
        log_level = os.getenv("LOG_LEVEL", "INFO").strip().upper() or "INFO"

        endpoint_raw = os.getenv("AGENT_ENDPOINT", "").strip()
        if endpoint_raw:
            endpoints = [e.strip() for e in endpoint_raw.split(",") if e.strip()]
        else:
            endpoints = [f"http://localhost:{port}/submit"]

        settings = Settings(
            agent_name=name,
            agent_seed_phrase=seed,
            agent_port=port,
            agent_endpoint=endpoints,
            agent_mailbox=mailbox,
            telemetry_api_base_url=base_url.rstrip("/"),
            telemetry_account_auth_mode=auth_mode,
            http_timeout_seconds=timeout,
            log_level=log_level,
        )
        settings.validate()
        return settings

    def validate(self) -> None:
        if not self.agent_name:
            raise ConfigError("AGENT_NAME must not be empty")
        if not (1 <= self.agent_port <= 65535):
            raise ConfigError(f"AGENT_PORT must be between 1 and 65535, got {self.agent_port}")
        if not self.telemetry_api_base_url.startswith(("http://", "https://")):
            raise ConfigError(
                "TELEMETRY_API_BASE_URL must start with http:// or https://, "
                f"got {self.telemetry_api_base_url!r}"
            )
        if self.telemetry_account_auth_mode not in SUPPORTED_ACCOUNT_AUTH_MODES:
            raise ConfigError(
                "TELEMETRY_ACCOUNT_AUTH_MODE must be one of "
                f"{SUPPORTED_ACCOUNT_AUTH_MODES}, got {self.telemetry_account_auth_mode!r}"
            )
        if self.http_timeout_seconds <= 0:
            raise ConfigError("HTTP_TIMEOUT_SECONDS must be greater than 0")
        if self.log_level not in SUPPORTED_LOG_LEVELS:
            raise ConfigError(
                f"LOG_LEVEL must be one of {SUPPORTED_LOG_LEVELS}, got {self.log_level!r}"
            )

    def require_seed_phrase(self) -> str:
        """Return the seed phrase, raising a clear error when it is not set.

        The seed phrase derives the agent's on-chain identity. It is required
        to run the agent locally but is intentionally optional in
        ``Settings`` so that tests and config validation do not need
        production credentials.
        """
        if not self.agent_seed_phrase:
            raise ConfigError(
                "AGENT_SEED_PHRASE is required to run the agent. "
                "Set it in app-agent/.env (see .env.example). Never commit it."
            )
        return self.agent_seed_phrase
