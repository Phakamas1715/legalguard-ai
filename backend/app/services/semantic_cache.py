"""Semantic Cache layer using Redis + RapidFuzz for LegalGuard AI.

Provides exact SHA-256 hash matching and fuzzy matching via RapidFuzz
token_sort_ratio to serve cached results for repeated or similar queries.
"""
from __future__ import annotations

from __future__ import annotations

import hashlib
import json
import logging
from typing import Optional

import redis.asyncio as aioredis
from pydantic_settings import BaseSettings, SettingsConfigDict
from rapidfuzz import fuzz, process

logger = logging.getLogger(__name__)

# Redis key prefixes
_PREFIX_EXACT = "cache:exact:"
_PREFIX_FUZZY = "cache:fuzzy:"
_SET_QUERIES = "cache:queries"


class CacheSettings(BaseSettings):
    """Cache connection settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_prefix="", env_file=".env", extra="ignore")

    redis_url: str = "redis://localhost:6379/0"


class SemanticCache:
    """Semantic cache with exact hash match and RapidFuzz fuzzy match.

    Parameters
    ----------
    redis_client:
        An ``redis.asyncio.Redis`` instance. If *None*, one is created from
        *settings*.
    similarity_threshold:
        Minimum RapidFuzz ``token_sort_ratio`` score (0-1 scale) to accept a
        fuzzy match.  Default ``0.85`` (i.e. 85 on the 0-100 scale used by
        RapidFuzz).
    settings:
        Optional :class:`CacheSettings`; used only when *redis_client* is not
        provided.
    """

    def __init__(
        self,
        redis_client: Optional[aioredis.Redis] = None,
        similarity_threshold: float = 0.85,
        settings: Optional[CacheSettings] = None,
    ) -> None:
        self.threshold = similarity_threshold
        if redis_client is not None:
            self.redis = redis_client
        else:
            _settings = settings or CacheSettings()
            self.redis = aioredis.from_url(
                _settings.redis_url, decode_responses=True
            )

    # -- Public API -----------------------------------------------------------

    async def get(self, query: str) -> Optional[dict]:
        """Look up a cached result by *query*.

        1. Try an exact SHA-256 hash match.
        2. Fall back to RapidFuzz fuzzy match (``token_sort_ratio``) against
           all cached query strings.

        Returns the cached dict on hit, or ``None`` on miss / error.
        """
        try:
            # 1. Exact match by hash
            cache_key = self._hash_key(query)
            exact = await self.redis.get(f"{_PREFIX_EXACT}{cache_key}")
            if exact:
                return json.loads(exact)

            # 2. Fuzzy match using RapidFuzz
            cached_queries: set[str] = await self.redis.smembers(_SET_QUERIES)
            if not cached_queries:
                return None

            best_match = process.extractOne(
                query,
                cached_queries,
                scorer=fuzz.token_sort_ratio,
            )
            if best_match and best_match[1] >= self.threshold * 100:
                fuzzy_val = await self.redis.get(
                    f"{_PREFIX_FUZZY}{best_match[0]}"
                )
                if fuzzy_val:
                    return json.loads(fuzzy_val)

            return None
        except Exception:
            logger.exception("SemanticCache.get failed for query: %s", query[:80])
            return None

    async def set(
        self, query: str, result: dict, ttl: int = 3600
    ) -> None:
        """Store *result* under both exact-hash and fuzzy keys.

        Parameters
        ----------
        query:
            The original query string.
        result:
            Serialisable dict to cache.
        ttl:
            Time-to-live in seconds (default 3600).
        """
        try:
            cache_key = self._hash_key(query)
            serialized = json.dumps(result, ensure_ascii=False)

            await self.redis.setex(
                f"{_PREFIX_EXACT}{cache_key}", ttl, serialized
            )
            await self.redis.sadd(_SET_QUERIES, query)
            await self.redis.setex(
                f"{_PREFIX_FUZZY}{query}", ttl, serialized
            )
        except Exception:
            logger.exception("SemanticCache.set failed for query: %s", query[:80])

    async def invalidate(self, query: str) -> None:
        """Remove a cached entry for *query*."""
        try:
            cache_key = self._hash_key(query)
            await self.redis.delete(f"{_PREFIX_EXACT}{cache_key}")
            await self.redis.delete(f"{_PREFIX_FUZZY}{query}")
            await self.redis.srem(_SET_QUERIES, query)
        except Exception:
            logger.exception("SemanticCache.invalidate failed for query: %s", query[:80])

    async def clear_all(self) -> None:
        """Flush all cache entries (exact, fuzzy, and query set)."""
        try:
            await self.redis.flushdb()
        except Exception:
            logger.exception("SemanticCache.clear_all failed")

    # -- Internal helpers -----------------------------------------------------

    @staticmethod
    def _hash_key(query: str) -> str:
        """Return the SHA-256 hex digest of *query*."""
        return hashlib.sha256(query.encode()).hexdigest()
