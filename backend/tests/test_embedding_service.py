"""Unit tests for the EmbeddingService."""

from __future__ import annotations

import json
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from app.services.embedding_service import (
    EmbeddingService,
    EmbeddingSettings,
    _AuthError,
    _RetryableError,
    _classify_bedrock_error,
    _classify_openai_error,
)


# ---------------------------------------------------------------------------
# Helpers / Fakes
# ---------------------------------------------------------------------------

DIMS = 8  # small dimension for tests


def _make_settings(**overrides: Any) -> EmbeddingSettings:
    defaults = {
        "embedding_provider": "openai",
        "openai_api_key": "test-key",
        "embedding_model": "text-embedding-3-small",
        "embedding_dimensions": DIMS,
        "aws_region": "ap-southeast-1",
    }
    defaults.update(overrides)
    return EmbeddingSettings(**defaults)


def _fake_openai_response(texts: list[str], dims: int) -> Any:
    """Build a fake OpenAI embeddings response object."""
    mock_resp = MagicMock()
    mock_resp.data = []
    for i, _ in enumerate(texts):
        item = MagicMock()
        item.embedding = [float(i + 1) / dims] * dims
        mock_resp.data.append(item)
    return mock_resp


class FakeOpenAIClient:
    """Minimal fake for openai.OpenAI."""

    def __init__(self, dims: int = DIMS) -> None:
        self.dims = dims
        self.call_count = 0
        self.embeddings = self

    def create(self, *, input: list[str], model: str, dimensions: int) -> Any:
        self.call_count += 1
        return _fake_openai_response(input, dimensions)


class FailThenSucceedClient:
    """Fails N times then succeeds."""

    def __init__(self, fail_count: int, dims: int = DIMS) -> None:
        self.fail_count = fail_count
        self.dims = dims
        self.call_count = 0
        self.embeddings = self

    def create(self, *, input: list[str], model: str, dimensions: int) -> Any:
        self.call_count += 1
        if self.call_count <= self.fail_count:
            raise _make_timeout_error()
        return _fake_openai_response(input, dimensions)


class AlwaysFailClient:
    """Always raises a retryable error."""

    def __init__(self) -> None:
        self.call_count = 0
        self.embeddings = self

    def create(self, **kwargs: Any) -> Any:
        self.call_count += 1
        raise _make_timeout_error()


class AuthFailClient:
    """Always raises an auth error (simulates OpenAI AuthenticationError)."""

    def __init__(self) -> None:
        self.embeddings = self

    def create(self, **kwargs: Any) -> Any:
        # Create an exception whose type name is "AuthenticationError"
        # so _classify_openai_error maps it to _AuthError
        exc_cls = type("AuthenticationError", (Exception,), {})
        raise exc_cls("Invalid API key")


def _make_timeout_error() -> _RetryableError:
    return _RetryableError("Connection timed out")


def _make_auth_error() -> _AuthError:
    return _AuthError("Invalid API key")


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def settings() -> EmbeddingSettings:
    return _make_settings()


@pytest.fixture
def service(settings: EmbeddingSettings) -> EmbeddingService:
    svc = EmbeddingService(settings)
    svc._client = FakeOpenAIClient(dims=DIMS)
    return svc


# ---------------------------------------------------------------------------
# EmbeddingSettings
# ---------------------------------------------------------------------------


class TestEmbeddingSettings:
    def test_defaults(self) -> None:
        s = EmbeddingSettings(
            embedding_provider="openai",
            openai_api_key="",
            embedding_model="text-embedding-3-small",
            embedding_dimensions=1536,
            aws_region="ap-southeast-1",
        )
        assert s.embedding_provider == "openai"
        assert s.embedding_dimensions == 1536

    def test_bedrock_provider(self) -> None:
        s = _make_settings(embedding_provider="bedrock")
        assert s.embedding_provider == "bedrock"


# ---------------------------------------------------------------------------
# embed (single text)
# ---------------------------------------------------------------------------


class TestEmbed:
    def test_returns_vector_of_correct_length(self, service: EmbeddingService) -> None:
        vec = service.embed("hello world")
        assert isinstance(vec, list)
        assert len(vec) == DIMS

    def test_returns_floats(self, service: EmbeddingService) -> None:
        vec = service.embed("test")
        assert all(isinstance(v, float) for v in vec)


# ---------------------------------------------------------------------------
# embed_batch
# ---------------------------------------------------------------------------


class TestEmbedBatch:
    def test_returns_one_vector_per_text(self, service: EmbeddingService) -> None:
        texts = ["one", "two", "three"]
        results = service.embed_batch(texts)
        assert len(results) == 3
        assert all(len(v) == DIMS for v in results)

    def test_batch_size_splits_calls(self) -> None:
        settings = _make_settings()
        svc = EmbeddingService(settings)
        client = FakeOpenAIClient(dims=DIMS)
        svc._client = client

        texts = [f"text_{i}" for i in range(5)]
        results = svc.embed_batch(texts, batch_size=2)
        assert len(results) == 5
        # 5 texts / batch_size 2 = 3 calls (2+2+1)
        assert client.call_count == 3

    def test_empty_list(self, service: EmbeddingService) -> None:
        results = service.embed_batch([])
        assert results == []

    def test_bedrock_cohere_batch_shape(self) -> None:
        settings = _make_settings(
            embedding_provider="bedrock",
            bedrock_embedding_model="cohere.embed-multilingual-v3",
            bedrock_cohere_dimensions=4,
        )
        svc = EmbeddingService(settings)

        fake_body = MagicMock()
        fake_body.read.return_value = json.dumps(
            {"embeddings": [[0.1, 0.2, 0.3, 0.4], [0.5, 0.6, 0.7, 0.8]]}
        ).encode()
        fake_client = MagicMock()
        fake_client.invoke_model.return_value = {"body": fake_body}
        svc._client = fake_client

        results = svc.embed_batch(["หนึ่ง", "สอง"], batch_size=2)

        assert results == [[0.1, 0.2, 0.3, 0.4], [0.5, 0.6, 0.7, 0.8]]
        fake_client.invoke_model.assert_called_once()


# ---------------------------------------------------------------------------
# Retry logic
# ---------------------------------------------------------------------------


class TestRetryLogic:
    def test_retries_on_transient_error(self) -> None:
        settings = _make_settings()
        svc = EmbeddingService(settings)
        svc.BASE_DELAY = 0.0  # no actual sleep in tests
        client = FailThenSucceedClient(fail_count=2, dims=DIMS)
        svc._client = client

        vec = svc.embed("retry me")
        assert len(vec) == DIMS
        assert client.call_count == 3  # 2 failures + 1 success

    def test_returns_zero_vector_after_max_retries(self) -> None:
        settings = _make_settings()
        svc = EmbeddingService(settings)
        svc.BASE_DELAY = 0.0
        client = AlwaysFailClient()
        svc._client = client

        vec = svc.embed("fail forever")
        assert vec == [0.0] * DIMS
        assert client.call_count == 3  # MAX_RETRIES

    def test_auth_error_raises_immediately(self) -> None:
        settings = _make_settings()
        svc = EmbeddingService(settings)
        svc._client = AuthFailClient()

        with pytest.raises(_AuthError):
            svc.embed("auth fail")

    def test_batch_zero_vectors_on_permanent_failure(self) -> None:
        settings = _make_settings()
        svc = EmbeddingService(settings)
        svc.BASE_DELAY = 0.0
        svc._client = AlwaysFailClient()

        results = svc.embed_batch(["a", "b", "c"], batch_size=2)
        # All should be zero vectors
        assert len(results) == 3
        for vec in results:
            assert vec == [0.0] * DIMS


# ---------------------------------------------------------------------------
# Backoff delay calculation
# ---------------------------------------------------------------------------


class TestBackoffDelay:
    def test_exponential_backoff(self) -> None:
        svc = EmbeddingService(_make_settings())
        exc = _RetryableError("timeout")
        assert svc._backoff_delay(0, exc) == 1.0
        assert svc._backoff_delay(1, exc) == 2.0
        assert svc._backoff_delay(2, exc) == 4.0

    def test_retry_after_header_respected(self) -> None:
        svc = EmbeddingService(_make_settings())
        exc = _RetryableError("rate limited")
        exc.retry_after = 5.0
        assert svc._backoff_delay(0, exc) == 5.0
        assert svc._backoff_delay(2, exc) == 5.0  # always uses retry_after


# ---------------------------------------------------------------------------
# Error classification
# ---------------------------------------------------------------------------


class TestErrorClassification:
    def test_openai_rate_limit(self) -> None:
        exc = type("RateLimitError", (Exception,), {})()
        result = _classify_openai_error(exc)
        assert isinstance(result, _RetryableError)

    def test_openai_auth_error(self) -> None:
        exc = type("AuthenticationError", (Exception,), {})()
        result = _classify_openai_error(exc)
        assert isinstance(result, _AuthError)

    def test_openai_permission_denied(self) -> None:
        exc = type("PermissionDeniedError", (Exception,), {})()
        result = _classify_openai_error(exc)
        assert isinstance(result, _AuthError)

    def test_openai_timeout(self) -> None:
        exc = type("APITimeoutError", (Exception,), {})()
        result = _classify_openai_error(exc)
        assert isinstance(result, _RetryableError)

    def test_openai_connection_error(self) -> None:
        exc = type("APIConnectionError", (Exception,), {})()
        result = _classify_openai_error(exc)
        assert isinstance(result, _RetryableError)

    def test_bedrock_auth_error(self) -> None:
        exc = type("AccessDeniedException", (Exception,), {})()
        result = _classify_bedrock_error(exc)
        assert isinstance(result, _AuthError)

    def test_bedrock_throttling(self) -> None:
        exc = type("ThrottlingException", (Exception,), {})()
        result = _classify_bedrock_error(exc)
        assert isinstance(result, _RetryableError)
        assert result.retry_after == 1.0

    def test_bedrock_unknown_error_is_retryable(self) -> None:
        exc = type("ServiceException", (Exception,), {})()
        result = _classify_bedrock_error(exc)
        assert isinstance(result, _RetryableError)


# ---------------------------------------------------------------------------
# Provider: unknown
# ---------------------------------------------------------------------------


class TestUnknownProvider:
    def test_raises_value_error(self) -> None:
        settings = _make_settings(embedding_provider="unknown")
        svc = EmbeddingService(settings)
        with pytest.raises(ValueError, match="Unknown embedding provider"):
            svc.embed("test")


# ---------------------------------------------------------------------------
# Bedrock provider (mocked)
# ---------------------------------------------------------------------------


class TestBedrockProvider:
    def test_embed_bedrock_single(self) -> None:
        settings = _make_settings(
            embedding_provider="bedrock",
            bedrock_embedding_model="amazon.titan-embed-text-v2:0",
        )
        svc = EmbeddingService(settings)

        fake_body = MagicMock()
        fake_body.read.return_value = json.dumps(
            {"embedding": [0.1] * DIMS}
        ).encode()

        mock_client = MagicMock()
        mock_client.invoke_model.return_value = {"body": fake_body}
        svc._client = mock_client

        vec = svc.embed("test bedrock")
        assert len(vec) == DIMS
        assert vec == [0.1] * DIMS

        # Verify invoke_model was called with correct params
        call_args = mock_client.invoke_model.call_args
        assert call_args.kwargs["modelId"] == "amazon.titan-embed-text-v2:0"
        body = json.loads(call_args.kwargs["body"])
        assert body["inputText"] == "test bedrock"
        assert body["dimensions"] == DIMS
        assert body["normalize"] is True
