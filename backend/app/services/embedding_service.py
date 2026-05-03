"""Embedding service for LegalGuard AI.

Supports OpenAI, Amazon Bedrock (Titan/Cohere), and Typhoon Embeddings.
Provides single and batch embedding with retry logic (exponential backoff).
"""
from __future__ import annotations

import json
import logging
import time
from typing import Optional, Any

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class EmbeddingSettings(BaseSettings):
    """Embedding configuration loaded from environment variables."""

    model_config = SettingsConfigDict(env_prefix="", env_file=".env", extra="ignore")

    # "openai" | "bedrock" | "typhoon" | "wangchanberta"
    embedding_provider: str = "typhoon"
    openai_api_key: str = ""
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536
    aws_region: str = "ap-southeast-1"
    bedrock_embedding_model: str = "cohere.embed-multilingual-v3"
    bedrock_cohere_dimensions: int = 1024
    bedrock_cohere_input_type: str = "search_document"
    bedrock_cohere_truncate: str = "END"
    typhoon_api_key: str = ""
    typhoon_embed_url: str = "https://api.opentyphoon.ai/v1"
    typhoon_embed_model: str = "typhoon-v2-embed-multilingual"
    # WangchanBERTa (AIResearch) — Thai BERT, 768-dim
    wangchanberta_model: str = "airesearch/wangchanberta-base-att-spm-uncased"
    huggingface_token: str = ""


class EmbeddingService:
    """Generate text embeddings via OpenAI or Amazon Bedrock models."""

    MAX_RETRIES = 3
    BASE_DELAY = 1.0  # seconds

    def __init__(self, settings: Optional[EmbeddingSettings] = None) -> None:
        self._settings = settings or EmbeddingSettings()
        self._client: Any = None

    # -- Public API -----------------------------------------------------------

    def embed(self, text: str) -> list[float]:
        """Embed a single text string. Returns a vector of ``embedding_dimensions`` length."""
        results = self.embed_batch([text], batch_size=1)
        return results[0]

    def embed_batch(
        self, texts: list[str], batch_size: int = 100
    ) -> list[list[float]]:
        """Embed a list of texts in batches with retry logic.

        Returns one vector per input text. On permanent failure for a batch,
        zero vectors are returned for the failed items and the error is logged.
        """
        all_embeddings: list[list[float]] = []

        for start in range(0, len(texts), batch_size):
            batch = texts[start : start + batch_size]
            embeddings = self._embed_batch_with_retry(batch)
            all_embeddings.extend(embeddings)

        return all_embeddings

    # -- Retry logic ----------------------------------------------------------

    def _embed_batch_with_retry(self, texts: list[str]) -> list[list[float]]:
        """Attempt to embed a batch with exponential backoff (3 attempts)."""
        last_exc: Optional[Exception] = None

        for attempt in range(self.MAX_RETRIES):
            try:
                return self._call_provider(texts)
            except _AuthError:
                raise  # don't retry auth errors
            except _RetryableError as exc:
                last_exc = exc
                delay = self._backoff_delay(attempt, exc)
                logger.warning(
                    "Embedding attempt %d/%d failed (%s), retrying in %.1fs",
                    attempt + 1,
                    self.MAX_RETRIES,
                    exc,
                    delay,
                )
                time.sleep(delay)

        # All retries exhausted — return zero vectors
        logger.error(
            "Embedding failed after %d attempts: %s. Returning zero vectors for %d texts.",
            self.MAX_RETRIES,
            last_exc,
            len(texts),
        )
        dims = self._expected_dimensions()
        return [[0.0] * dims for _ in texts]

    def _backoff_delay(self, attempt: int, exc: Exception) -> float:
        """Calculate delay: respect Retry-After header for rate limits, else exponential."""
        retry_after = getattr(exc, "retry_after", None)
        if retry_after is not None:
            return float(retry_after)
        return self.BASE_DELAY * (2**attempt)  # 1s, 2s, 4s

    # -- Provider dispatch ----------------------------------------------------

    def _call_provider(self, texts: list[str]) -> list[list[float]]:
        provider = self._settings.embedding_provider
        if provider == "openai":
            return self._embed_openai(texts)
        elif provider == "bedrock":
            return self._embed_bedrock(texts)
        elif provider == "typhoon":
            return self._embed_typhoon(texts)
        elif provider == "wangchanberta":
            return self._embed_wangchanberta(texts)
        else:
            raise ValueError(f"Unknown embedding provider: {provider}")

    # -- OpenAI ---------------------------------------------------------------

    def _get_openai_client(self) -> Any:
        if self._client is None:
            import openai

            self._client = openai.OpenAI(api_key=self._settings.openai_api_key)
        return self._client

    def _embed_openai(self, texts: list[str]) -> list[list[float]]:
        try:
            client = self._get_openai_client()
            response = client.embeddings.create(
                input=texts,
                model=self._settings.embedding_model,
                dimensions=self._settings.embedding_dimensions,
            )
            return [item.embedding for item in response.data]
        except Exception as exc:
            raise _classify_openai_error(exc) from exc

    # -- Amazon Bedrock -------------------------------------------------------

    def _get_bedrock_client(self) -> Any:
        if self._client is None:
            import boto3

            self._client = boto3.client(
                "bedrock-runtime", region_name=self._settings.aws_region
            )
        return self._client

    def _embed_bedrock(self, texts: list[str]) -> list[list[float]]:
        client = self._get_bedrock_client()
        model_id = self._settings.bedrock_embedding_model
        if model_id.startswith("cohere.embed"):
            return self._embed_bedrock_cohere(client, texts, model_id)
        return self._embed_bedrock_titan(client, texts, model_id)

    def _embed_bedrock_titan(
        self,
        client: Any,
        texts: list[str],
        model_id: str,
    ) -> list[list[float]]:
        """Bedrock Titan Embeddings — one call per text (no native batch API)."""
        results: list[list[float]] = []
        for text in texts:
            try:
                body = json.dumps(
                    {
                        "inputText": text,
                        "dimensions": self._settings.embedding_dimensions,
                        "normalize": True,
                    }
                )
                response = client.invoke_model(
                    modelId=model_id,
                    contentType="application/json",
                    accept="application/json",
                    body=body,
                )
                resp_body = json.loads(response["body"].read())
                results.append(resp_body["embedding"])
            except Exception as exc:
                raise _classify_bedrock_error(exc) from exc
        return results

    def _embed_bedrock_cohere(
        self,
        client: Any,
        texts: list[str],
        model_id: str,
    ) -> list[list[float]]:
        """Bedrock Cohere Embeddings — multilingual batch embedding."""
        try:
            body = json.dumps(
                {
                    "texts": texts,
                    "input_type": self._settings.bedrock_cohere_input_type,
                    "truncate": self._settings.bedrock_cohere_truncate,
                }
            )
            response = client.invoke_model(
                modelId=model_id,
                contentType="application/json",
                accept="application/json",
                body=body,
            )
            resp_body = json.loads(response["body"].read())
            embeddings = resp_body.get("embeddings") or resp_body.get("embeddings_floats")
            if not isinstance(embeddings, list) or len(embeddings) != len(texts):
                raise ValueError("Unexpected Cohere embedding response shape")
            return embeddings
        except Exception as exc:
            raise _classify_bedrock_error(exc) from exc


    # -- Typhoon Embeddings (SCB 10X) ----------------------------------------

    def _embed_typhoon(self, texts: list[str]) -> list[list[float]]:
        """Typhoon Embeddings via OpenAI-compatible API."""
        try:
            import openai
            client = openai.OpenAI(
                api_key=self._settings.typhoon_api_key,
                base_url=self._settings.typhoon_embed_url,
            )
            response = client.embeddings.create(
                input=texts,
                model=self._settings.typhoon_embed_model,
            )
            return [item.embedding for item in response.data]
        except Exception as exc:
            raise _classify_openai_error(exc) from exc

    def _expected_dimensions(self) -> int:
        if (
            self._settings.embedding_provider == "bedrock"
            and self._settings.bedrock_embedding_model.startswith("cohere.embed")
        ):
            return self._settings.bedrock_cohere_dimensions
        return self._settings.embedding_dimensions

    # -- WangchanBERTa (AIResearch — Thai BERT, 768-dim) ---------------------

    def _embed_wangchanberta(self, texts: list[str]) -> list[list[float]]:
        """WangchanBERTa embeddings via sentence-transformers.

        Model: airesearch/wangchanberta-base-att-spm-uncased
        Produces 768-dim CLS-token embeddings optimised for Thai NLP.
        Falls back to HuggingFace Inference API when local model is unavailable.

        References:
        - Lowphansirikul et al. (2021) "WangchanBERTa: Pretraining transformer-
          based Thai language models" https://arxiv.org/abs/2101.09635
        """
        try:
            from sentence_transformers import SentenceTransformer

            if not hasattr(self, "_wangchan_model"):
                logger.info("Loading WangchanBERTa locally (first call — may take a moment)")
                self._wangchan_model = SentenceTransformer(  # type: ignore[attr-defined]
                    self._settings.wangchanberta_model,
                    use_auth_token=self._settings.huggingface_token or None,
                )
            embeddings = self._wangchan_model.encode(texts, normalize_embeddings=True)  # type: ignore[attr-defined]
            return [emb.tolist() for emb in embeddings]
        except ImportError:
            logger.warning("sentence-transformers not available; falling back to HF Inference API")
            return self._embed_wangchanberta_api(texts)
        except Exception as exc:
            logger.warning("WangchanBERTa local load failed (%s); falling back to HF Inference API", exc)
            return self._embed_wangchanberta_api(texts)

    def _embed_wangchanberta_api(self, texts: list[str]) -> list[list[float]]:
        """WangchanBERTa via HuggingFace Inference API (no local GPU required)."""
        import httpx

        token = self._settings.huggingface_token
        if not token:
            raise _AuthError("HUGGINGFACE_TOKEN required for WangchanBERTa API")

        url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{self._settings.wangchanberta_model}"
        headers = {"Authorization": f"Bearer {token}"}

        results: list[list[float]] = []
        for text in texts:
            try:
                resp = httpx.post(url, headers=headers, json={"inputs": text}, timeout=15)
                if resp.status_code == 401:
                    raise _AuthError("Invalid HUGGINGFACE_TOKEN")
                if resp.status_code == 429:
                    raise _RetryableError("HF Inference API rate limited")
                resp.raise_for_status()
                data = resp.json()
                # HF feature-extraction returns [[token_vectors]] or [cls_vector]
                if isinstance(data[0][0], list):
                    # Token-level: take mean of token embeddings (mean pooling)
                    token_vecs = data[0]
                    n = len(token_vecs)
                    dim = len(token_vecs[0])
                    mean_vec = [sum(token_vecs[i][d] for i in range(n)) / n for d in range(dim)]
                    results.append(mean_vec)
                else:
                    results.append(data[0])
            except (_AuthError, _RetryableError):
                raise
            except Exception as exc:
                raise _RetryableError(str(exc)) from exc
        return results


# -- Error classification -----------------------------------------------------


class _RetryableError(Exception):
    """Wraps errors that should trigger a retry (timeout, rate limit, network)."""

    retry_after: Optional[float] = None


class _AuthError(Exception):
    """Wraps authentication errors that should NOT be retried."""


def _classify_openai_error(exc: Exception) -> Exception:
    """Map OpenAI SDK exceptions to our retry/auth categories."""
    exc_type = type(exc).__name__

    # Rate limit (429)
    if exc_type == "RateLimitError":
        err = _RetryableError(str(exc))
        # OpenAI SDK may expose retry_after on the response headers
        retry_after = getattr(exc, "retry_after", None)
        if retry_after is not None:
            err.retry_after = float(retry_after)
        return err

    # Auth errors (401, 403)
    if exc_type in ("AuthenticationError", "PermissionDeniedError"):
        return _AuthError(str(exc))

    # Timeout / connection errors
    if exc_type in ("APITimeoutError", "APIConnectionError", "Timeout", "ConnectError"):
        return _RetryableError(str(exc))

    # Any other API error — treat as retryable
    if "APIError" in exc_type or "APIStatusError" in exc_type:
        return _RetryableError(str(exc))

    # Unknown — retryable as a safe default
    return _RetryableError(str(exc))


def _classify_bedrock_error(exc: Exception) -> Exception:
    """Map boto3/botocore exceptions to our retry/auth categories."""
    exc_type = type(exc).__name__

    # Auth errors
    if exc_type in (
        "UnrecognizedClientException",
        "AccessDeniedException",
        "ExpiredTokenException",
    ):
        return _AuthError(str(exc))

    # Throttling (rate limit)
    if exc_type == "ThrottlingException":
        err = _RetryableError(str(exc))
        err.retry_after = 1.0
        return err

    # All other boto errors — retryable
    return _RetryableError(str(exc))
