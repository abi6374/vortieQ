"""Tests for app.llm_client's provider routing and Bedrock -> Groq fallback.

Real production incident: this AWS account's Bedrock on-demand throughput
quota throttles even with 8-attempt adaptive retry (see llm_client.py), which
was surfacing as hard 500s on path generation. GROQ_API_KEY is a REQUIRED
setting regardless of LLM_PROVIDER (see config.py), so Groq is always fully
configured as a fallback. These tests verify chat_completion() actually uses
it when Bedrock fails, that a successful provider is never bypassed
needlessly, and that a double failure still raises honestly rather than
fabricating a response.

No live AWS/Groq calls - both providers are mocked.
"""
from unittest.mock import patch

import pytest

from app import llm_client
from app.config import settings


@pytest.fixture
def restore_provider():
    """LLM_PROVIDER is a shared singleton (app.config.settings) - restore it
    after each test regardless of pass/fail so tests can't leak state into
    each other or into unrelated tests run in the same session."""
    original = settings.LLM_PROVIDER
    yield
    settings.LLM_PROVIDER = original


def test_groq_provider_never_touches_bedrock(restore_provider):
    settings.LLM_PROVIDER = "groq"
    with patch("app.llm_client._groq_chat", return_value="groq answer") as mock_groq, \
         patch("app.llm_client._bedrock_chat") as mock_bedrock:
        result = llm_client.chat_completion([{"role": "user", "content": "hi"}])
    assert result == "groq answer"
    mock_bedrock.assert_not_called()
    mock_groq.assert_called_once()


def test_bedrock_success_never_touches_groq(restore_provider):
    settings.LLM_PROVIDER = "bedrock"
    with patch("app.llm_client._bedrock_chat", return_value="bedrock answer"), \
         patch("app.llm_client._groq_chat") as mock_groq:
        result = llm_client.chat_completion([{"role": "user", "content": "hi"}])
    assert result == "bedrock answer"
    mock_groq.assert_not_called()


def test_bedrock_throttling_falls_back_to_groq(restore_provider):
    """The actual production fix: a Bedrock failure (throttling or otherwise)
    must not surface as an error to the caller when Groq can serve the same
    request for real."""
    settings.LLM_PROVIDER = "bedrock"
    with patch("app.llm_client._bedrock_chat", side_effect=RuntimeError("ThrottlingException: rate exceeded")), \
         patch("app.llm_client._groq_chat", return_value="real groq answer") as mock_groq:
        result = llm_client.chat_completion([{"role": "user", "content": "hi"}], max_tokens=999, temperature=0.5)
    assert result == "real groq answer"
    # The same request (messages/max_tokens/temperature) must reach Groq
    # unchanged - this is a real retry of the real request, not a different,
    # degraded call.
    mock_groq.assert_called_once_with([{"role": "user", "content": "hi"}], 999, 0.5)


def test_both_providers_failing_raises_honestly(restore_provider):
    """If Bedrock AND Groq both fail, the caller must see a real error -
    never a fabricated success or a swallowed exception."""
    settings.LLM_PROVIDER = "bedrock"
    with patch("app.llm_client._bedrock_chat", side_effect=RuntimeError("ThrottlingException")), \
         patch("app.llm_client._groq_chat", side_effect=RuntimeError("Groq also down")):
        with pytest.raises(RuntimeError, match="Groq also down"):
            llm_client.chat_completion([{"role": "user", "content": "hi"}])


def test_non_throttling_bedrock_error_also_falls_back(restore_provider):
    """The fallback isn't restricted to throttling specifically - any Bedrock
    failure (e.g. a transient network error) should still let Groq attempt
    the real request rather than failing the whole call outright."""
    settings.LLM_PROVIDER = "bedrock"
    with patch("app.llm_client._bedrock_chat", side_effect=ConnectionError("boom")), \
         patch("app.llm_client._groq_chat", return_value="groq saved it") as mock_groq:
        result = llm_client.chat_completion([{"role": "user", "content": "hi"}])
    assert result == "groq saved it"
    mock_groq.assert_called_once()
