"""Configuration loading and validation tests."""

from __future__ import annotations

import pytest

from config import ConfigError, Settings

ENV_KEYS = (
    "AGENT_NAME",
    "AGENT_SEED_PHRASE",
    "AGENT_PORT",
    "AGENT_ENDPOINT",
    "AGENT_MAILBOX",
    "TELEMETRY_API_BASE_URL",
    "TELEMETRY_ACCOUNT_AUTH_MODE",
    "HTTP_TIMEOUT_SECONDS",
    "LOG_LEVEL",
)


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    for key in ENV_KEYS:
        monkeypatch.delenv(key, raising=False)


def test_defaults(monkeypatch):
    settings = Settings.from_env()
    assert settings.agent_name == "asi_telemetry_agent"
    assert settings.agent_port == 8200
    assert settings.telemetry_api_base_url == "http://localhost:8080"
    assert settings.telemetry_account_auth_mode == "link"
    assert settings.agent_endpoint == ["http://localhost:8200/submit"]
    assert settings.agent_mailbox is False


def test_full_environment(monkeypatch):
    monkeypatch.setenv("AGENT_NAME", "my_agent")
    monkeypatch.setenv("AGENT_SEED_PHRASE", "secret-seed")
    monkeypatch.setenv("AGENT_PORT", "9000")
    monkeypatch.setenv("AGENT_ENDPOINT", "https://a.example/submit, https://b.example/submit")
    monkeypatch.setenv("AGENT_MAILBOX", "true")
    monkeypatch.setenv("TELEMETRY_API_BASE_URL", "https://telemetry.example/")
    monkeypatch.setenv("HTTP_TIMEOUT_SECONDS", "3.5")
    monkeypatch.setenv("LOG_LEVEL", "debug")

    settings = Settings.from_env()
    assert settings.agent_name == "my_agent"
    assert settings.agent_seed_phrase == "secret-seed"
    assert settings.agent_port == 9000
    assert settings.agent_endpoint == ["https://a.example/submit", "https://b.example/submit"]
    assert settings.agent_mailbox is True
    assert settings.telemetry_api_base_url == "https://telemetry.example"  # trailing / stripped
    assert settings.http_timeout_seconds == 3.5
    assert settings.log_level == "DEBUG"


@pytest.mark.parametrize("port", ["0", "70000", "abc"])
def test_invalid_port(monkeypatch, port):
    monkeypatch.setenv("AGENT_PORT", port)
    with pytest.raises(ConfigError):
        Settings.from_env()


def test_invalid_base_url(monkeypatch):
    monkeypatch.setenv("TELEMETRY_API_BASE_URL", "ftp://nope")
    with pytest.raises(ConfigError, match="TELEMETRY_API_BASE_URL"):
        Settings.from_env()


def test_invalid_auth_mode(monkeypatch):
    monkeypatch.setenv("TELEMETRY_ACCOUNT_AUTH_MODE", "password")
    with pytest.raises(ConfigError, match="TELEMETRY_ACCOUNT_AUTH_MODE"):
        Settings.from_env()


def test_invalid_timeout(monkeypatch):
    monkeypatch.setenv("HTTP_TIMEOUT_SECONDS", "-1")
    with pytest.raises(ConfigError, match="HTTP_TIMEOUT_SECONDS"):
        Settings.from_env()


def test_invalid_log_level(monkeypatch):
    monkeypatch.setenv("LOG_LEVEL", "LOUD")
    with pytest.raises(ConfigError, match="LOG_LEVEL"):
        Settings.from_env()


def test_require_seed_phrase_missing():
    settings = Settings.from_env()
    with pytest.raises(ConfigError, match="AGENT_SEED_PHRASE"):
        settings.require_seed_phrase()


def test_require_seed_phrase_present(monkeypatch):
    monkeypatch.setenv("AGENT_SEED_PHRASE", "seed-value")
    settings = Settings.from_env()
    assert settings.require_seed_phrase() == "seed-value"
