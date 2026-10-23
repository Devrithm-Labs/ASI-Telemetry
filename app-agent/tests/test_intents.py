"""Intent parsing tests: supported questions, parameters, unsupported input."""

from __future__ import annotations

from handlers.intents import IntentName, parse_intent, parse_time_range

VALID_KEY = "asi_dev_" + "ab12" * 8


def test_welcome():
    assert parse_intent("Hello!").name == IntentName.WELCOME
    assert parse_intent("hi there").name == IntentName.WELCOME


def test_help():
    assert parse_intent("help").name == IntentName.HELP
    assert parse_intent("What can you do?").name == IntentName.HELP


def test_unsupported():
    assert parse_intent("what is the capital of France").name == IntentName.UNSUPPORTED
    assert parse_intent("").name == IntentName.UNSUPPORTED
    assert parse_intent("   ").name == IntentName.UNSUPPORTED
    assert parse_intent("please delete all my data").name == IntentName.UNSUPPORTED


def test_overview():
    assert parse_intent("account overview").name == IntentName.OVERVIEW
    assert parse_intent("who am i").name == IntentName.OVERVIEW


def test_token_usage_with_range():
    intent = parse_intent("how many tokens did I use in the last 7 days")
    assert intent.name == IntentName.TOKEN_USAGE
    assert intent.time_range == "7d"


def test_token_usage_today():
    intent = parse_intent("token usage today")
    assert intent.name == IntentName.TOKEN_USAGE
    assert intent.time_range == "24h"


def test_cost_summary_default_range():
    intent = parse_intent("what did I spend?")
    assert intent.name == IntentName.COST_SUMMARY
    assert intent.time_range is None


def test_cost_summary_month():
    intent = parse_intent("estimated cost for the last 30 days")
    assert intent.name == IntentName.COST_SUMMARY
    assert intent.time_range == "30d"


def test_cost_beats_tokens_when_both_present():
    # "spend ... tokens" should classify as cost (cost reply includes tokens).
    assert parse_intent("how much did I spend on tokens").name == IntentName.COST_SUMMARY


def test_applications():
    assert parse_intent("project summary").name == IntentName.APPLICATIONS
    assert parse_intent("which applications are active this week").name == IntentName.APPLICATIONS


def test_no_greeting_false_positive():
    # "which" contains "hi" as a substring but must not classify as greeting.
    assert parse_intent("which applications are active").name == IntentName.APPLICATIONS


def test_no_help_false_positive():
    # "usage" inside a token query must not classify as help.
    assert parse_intent("token usage for the last 24 hours").name == IntentName.TOKEN_USAGE


def test_errors_performance():
    intent = parse_intent("error rate and latency this week")
    assert intent.name == IntentName.ERRORS_PERFORMANCE
    assert intent.time_range == "7d"


def test_traces_with_limit():
    intent = parse_intent("show me the last 5 traces")
    assert intent.name == IntentName.TRACES
    assert intent.limit == 5


def test_traces_limit_clamped():
    intent = parse_intent("show me the last 99 traces")
    assert intent.name == IntentName.TRACES
    assert intent.limit == 10


def test_traces_default():
    intent = parse_intent("recent traces")
    assert intent.name == IntentName.TRACES
    assert intent.limit is None


def test_link_with_key():
    intent = parse_intent(f"link account {VALID_KEY}")
    assert intent.name == IntentName.LINK
    assert intent.api_key == VALID_KEY


def test_link_without_key_is_not_link_intent():
    assert parse_intent("link account").name != IntentName.LINK


def test_unlink_wins_over_link():
    intent = parse_intent(f"unlink account {VALID_KEY}")
    assert intent.name == IntentName.UNLINK


def test_model_filter():
    intent = parse_intent("token usage for model gemini-3.8-flash last 24 hours")
    assert intent.name == IntentName.TOKEN_USAGE
    assert intent.model == "gemini-3.8-flash"
    assert intent.time_range == "24h"


def test_time_range_parsing():
    assert parse_time_range("last hour") == "1h"
    assert parse_time_range("past 24 hours") == "24h"
    assert parse_time_range("last 3 days") == "7d"
    assert parse_time_range("last 10 days") == "30d"
    assert parse_time_range("last 90 days") == "all"
    assert parse_time_range("all time") == "all"
    assert parse_time_range("this week") == "7d"
    assert parse_time_range("this month") == "30d"
    assert parse_time_range("something vague") is None
