"""Search router — hybrid, semantic, and keyword search endpoints."""

from __future__ import annotations

import asyncio
import logging
import time

from fastapi import APIRouter, HTTPException

from app.services.bm25_indexer import BM25Indexer
from app.services.embedding_service import EmbeddingService
from app.services.qdrant_loader import QdrantService
from app.services.search_pipeline import (
    SearchFilters,
    SearchPipeline,
    SearchRequest,
    SearchResponse,
    SearchResult,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["search"])

# Lazily initialised singleton — avoids import-time side-effects.
_pipeline: SearchPipeline | None = None


def _get_pipeline() -> SearchPipeline:
    global _pipeline
    if _pipeline is None:
        try:
            from app.services.semantic_cache import SemanticCache

            cache: SemanticCache | None = SemanticCache()
        except Exception:
            cache = None
        _pipeline = SearchPipeline(
            embedding_service=EmbeddingService(),
            qdrant_service=QdrantService(),
            bm25_indexer=BM25Indexer(),
            cache=cache,
        )
    return _pipeline


@router.post("", response_model=SearchResponse)
async def hybrid_search(request: SearchRequest) -> SearchResponse:
    """Hybrid search: BM25 + vector + RRF + LeJEPA reranking."""
    pipeline = _get_pipeline()
    return await pipeline.search(request)


@router.post("/semantic", response_model=SearchResponse)
async def semantic_search(request: SearchRequest) -> SearchResponse:
    """Pure vector (semantic) search — skips BM25 leg."""
    pipeline = _get_pipeline()
    total_start = time.perf_counter()

    # Embed query
    embed_start = time.perf_counter()
    query_embedding = await asyncio.to_thread(
        pipeline.embedding_service.embed, request.query
    )
    query_embedding_time_ms = (time.perf_counter() - embed_start) * 1000

    # Vector search only
    qdrant_filters = SearchPipeline._build_qdrant_filters(request.filters)
    vector_start = time.perf_counter()
    vector_results = await asyncio.to_thread(
        pipeline.qdrant_service.search,
        query_embedding,
        qdrant_filters,
        request.top_k,
    )
    vector_search_time_ms = (time.perf_counter() - vector_start) * 1000

    results: list[SearchResult] = []
    for hit in vector_results:
        payload = hit.get("payload", {})
        score = hit.get("score", 0.0)
        results.append(
            SearchResult(
                id=hit["id"],
                case_no=payload.get("case_no", ""),
                court_type=payload.get("court_type", ""),
                year=payload.get("year", 0),
                title=payload.get("title", ""),
                summary=payload.get("summary", ""),
                chunk_text=payload.get("chunk_text", ""),
                statutes=payload.get("statutes", []),
                relevance_score=round(score, 4),
                source_code=payload.get("source_code", ""),
                bm25_score=0.0,
                vector_score=round(score, 4),
                rrf_score=0.0,
            )
        )

    total_time_ms = (time.perf_counter() - total_start) * 1000
    return SearchResponse(
        results=results,
        query_embedding_time_ms=round(query_embedding_time_ms, 2),
        bm25_search_time_ms=0.0,
        vector_search_time_ms=round(vector_search_time_ms, 2),
        rerank_time_ms=0.0,
        total_time_ms=round(total_time_ms, 2),
        cache_hit=False,
        total_candidates=len(vector_results),
    )


@router.post("/keyword", response_model=SearchResponse)
async def keyword_search(request: SearchRequest) -> SearchResponse:
    """Pure BM25 keyword search — skips vector leg."""
    pipeline = _get_pipeline()
    total_start = time.perf_counter()

    bm25_filters = SearchPipeline._build_bm25_filters(request.filters)
    bm25_start = time.perf_counter()
    bm25_results = await asyncio.to_thread(
        pipeline.bm25_indexer.search,
        request.query,
        request.top_k,
        bm25_filters,
    )
    bm25_search_time_ms = (time.perf_counter() - bm25_start) * 1000

    results: list[SearchResult] = []
    for hit in bm25_results:
        results.append(
            SearchResult(
                id=hit["id"],
                case_no="",
                court_type="",
                year=0,
                title="",
                summary="",
                chunk_text=hit.get("text_preview", ""),
                statutes=[],
                relevance_score=0.0,
                source_code="",
                bm25_score=round(hit.get("score", 0.0), 4),
                vector_score=0.0,
                rrf_score=0.0,
            )
        )

    total_time_ms = (time.perf_counter() - total_start) * 1000
    return SearchResponse(
        results=results,
        query_embedding_time_ms=0.0,
        bm25_search_time_ms=round(bm25_search_time_ms, 2),
        vector_search_time_ms=0.0,
        rerank_time_ms=0.0,
        total_time_ms=round(total_time_ms, 2),
        cache_hit=False,
        total_candidates=len(bm25_results),
    )
