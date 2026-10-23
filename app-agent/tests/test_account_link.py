"""Account-linking store tests."""

from __future__ import annotations

import pytest

from services.account_link import (
    AccountLinkStore,
    InvalidKeyFormatError,
    looks_like_agent_address,
    looks_like_api_key,
    redact_key,
)
from tests.conftest import KEY_A, KEY_B

SENDER_A = "agent1qguqps0pr90qw4p74j5utz8qavm2nv6ncept2v838h4h8cceu9fwkv7m0fj"
SENDER_B = "agent1qtj4m78hdr2dmldtssn7kw7gt0e3ycledny3cadpmdau9dmnv9a4yzjxcx0"


def test_link_and_get():
    store = AccountLinkStore()
    store.link(SENDER_A, KEY_A)
    assert store.get_key(SENDER_A) == KEY_A
    assert store.is_linked(SENDER_A) is True
    assert store.linked_count() == 1


def test_unlink():
    store = AccountLinkStore()
    store.link(SENDER_A, KEY_A)
    assert store.unlink(SENDER_A) is True
    assert store.unlink(SENDER_A) is False
    assert store.is_linked(SENDER_A) is False


def test_invalid_key_format_rejected():
    store = AccountLinkStore()
    with pytest.raises(InvalidKeyFormatError):
        store.link(SENDER_A, "not-a-key")
    with pytest.raises(InvalidKeyFormatError):
        store.link(SENDER_A, "asi_dev_zz" * 4)  # non-hex payload
    assert store.is_linked(SENDER_A) is False


def test_senders_are_isolated():
    store = AccountLinkStore()
    store.link(SENDER_A, KEY_A)
    store.link(SENDER_B, KEY_B)
    assert store.get_key(SENDER_A) == KEY_A
    assert store.get_key(SENDER_B) == KEY_B
    store.unlink(SENDER_A)
    assert store.get_key(SENDER_B) == KEY_B  # unaffected


def test_shape_helpers():
    assert looks_like_api_key(KEY_A)
    assert not looks_like_api_key("asi_dev")
    assert not looks_like_api_key("")
    assert looks_like_agent_address(SENDER_A)
    assert not looks_like_agent_address("user@example.com")


def test_redact_key_never_exposes_full_key():
    redacted = redact_key(KEY_A)
    assert KEY_A not in redacted
    assert redacted.startswith("asi_dev_")
