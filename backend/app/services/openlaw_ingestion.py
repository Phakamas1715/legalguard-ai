"""Open Law Data Thailand — Ingestion Service.

Fetches Thai court judgments from openlawdatathailand.org, applies the
LegalGuard processing pipeline (PII masking → chunking → embedding →
Qdrant upsert + BM25 index), and computes CFS for the ingested batch.

This service intentionally uses the same embedding/Qdrant/BM25 contracts as
the main ingestion pipeline so OpenLaw documents become searchable through the
existing runtime without a separate storage path.
"""
from __future__ import annotations

from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from typing import Optional

from app.services.bm25_indexer import BM25Indexer
from app.services.dashboard_service import (
    CFS_WEIGHT_GEO,
    CFS_WEIGHT_COURT,
    CFS_WEIGHT_TIME,
    calc_geo_fairness,
    calc_court_fairness,
    calc_time_fairness,
)
from app.services.embedding_service import EmbeddingService
from app.services.openlaw_client import OpenLawDataClient
from app.services.pii_masking import mask_pii
from app.services.qdrant_loader import QdrantService
from app.services.thai_chunker import ThaiChunker

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Result model
# ---------------------------------------------------------------------------


@dataclass
class OpenLawIngestionResult:
    """Summary of an OpenLaw ingestion run."""

    job_id: str
    query: str
    fetched_documents: int
    ingested_chunks: int
    failed_documents: int
    cfs: float
    f_geo: float
    f_court: float
    f_time: float
    cfs_warning: bool
    error_log: list[dict] = field(default_factory=list)
    status: str = "completed"


# ---------------------------------------------------------------------------
# Ingestion service
# ---------------------------------------------------------------------------


class OpenLawIngestionService:
    """Ingest Open Law Data Thailand judgments into the RAG pipeline.

    Flow:
        1. Fetch judgments via OpenLawDataClient
        2. PII masking on full content
        3. Thai chunking (512 tokens, 64 overlap)
        4. Shared EmbeddingService embedding
        5. Upsert to Qdrant + BM25 index
        6. CFS computation for ingested batch
    """

    SOURCE_CODE = "openlaw_thailand"

    def __init__(
        self,
        openlaw_client: Optional[OpenLawDataClient] = None,
        qdrant_service: Optional[QdrantService] = None,
        bm25_indexer: Optional[BM25Indexer] = None,
        chunker: Optional[ThaiChunker] = None,
        embedding_service: Optional[EmbeddingService] = None,
    ) -> None:
        self.client = openlaw_client or OpenLawDataClient()
        self.qdrant = qdrant_service or QdrantService()
        self.bm25 = bm25_indexer or BM25Indexer()
        self.chunker = chunker or ThaiChunker()
        self.embedding_service = embedding_service or EmbeddingService()

    async def ingest(
        self,
        query: str,
        limit: int = 100,
        source_code: str = SOURCE_CODE,
    ) -> OpenLawIngestionResult:
        """Fetch + ingest judgments for a search query.

        Args:
            query: Thai search query sent to Open Law Data API
            limit: Max documents to fetch (max 200 per API call)
            source_code: Source tag stored in Qdrant metadata

        Returns:
            OpenLawIngestionResult with counts and CFS score
        """
        job_id = str(uuid.uuid4())
        error_log: list[dict] = []

        # 1. Fetch from API (runs in thread pool — blocking HTTP)
        logger.info("OpenLaw ingest: fetching %d docs for query=%r", limit, query)
        raw_docs = await asyncio.to_thread(self.client.search_judgments, query, limit)

        if not raw_docs:
            logger.warning("OpenLaw API returned 0 documents — API may be unavailable")

        # 2. Normalise
        docs = [self.client.normalize_document(d) for d in raw_docs]

        # 3. Process each document
        all_chunks: list[dict] = []
        doc_metas: list[dict] = []  # for CFS

        for doc in docs:
            try:
                chunks = self._process_document(doc, source_code)
                all_chunks.extend(chunks)
                doc_metas.append({
                    "province": doc.get("province", "ไม่ระบุ"),
                    "court_type": doc.get("court_type", "unknown"),
                    "year": doc.get("year", 0),
                })
            except Exception as exc:
                logger.error("Failed to process doc %s: %s", doc.get("judgment_id"), exc)
                error_log.append({"doc_id": doc.get("judgment_id"), "error": str(exc)})

        if not all_chunks:
            return OpenLawIngestionResult(
                job_id=job_id, query=query,
                fetched_documents=len(raw_docs), ingested_chunks=0,
                failed_documents=len(error_log),
                cfs=0.0, f_geo=0.0, f_court=0.0, f_time=0.0,
                cfs_warning=True, error_log=error_log, status="completed_with_errors",
            )

        self.qdrant.ensure_collection()
        self.bm25.ensure_index()

        # 4. Embed using the same embedding service as the main pipeline
        texts = [c["text"] for c in all_chunks]
        logger.info("Embedding %d chunks with shared EmbeddingService", len(texts))
        vectors = await asyncio.to_thread(self.embedding_service.embed_batch, texts)

        # 5. Upsert to Qdrant + BM25 using the same batch contracts as the core ingestion path
        qdrant_points = [
            {
                "id": chunk["id"],
                "vector": vector,
                "payload": chunk["payload"],
            }
            for chunk, vector in zip(all_chunks, vectors)
        ]
        bm25_docs = [
            {
                "id": chunk["id"],
                "text": chunk["text"],
                "source_code": chunk["payload"]["source_code"],
                "court_type": chunk["payload"]["court_type"],
                "year": chunk["payload"]["year"],
            }
            for chunk in all_chunks
        ]

        ingested = 0
        try:
            await asyncio.to_thread(self.qdrant.upsert_chunks, qdrant_points)
            ingested = await asyncio.to_thread(self.bm25.add_documents, bm25_docs)
        except Exception as exc:
            logger.error("OpenLaw batch upsert failed: %s", exc)
            error_log.append({"stage": "storage", "error": str(exc)})

        # 6. CFS for ingested batch
        f_geo = calc_geo_fairness(doc_metas)
        f_court = calc_court_fairness(doc_metas)
        f_time = calc_time_fairness(doc_metas)
        cfs = round(CFS_WEIGHT_GEO * f_geo + CFS_WEIGHT_COURT * f_court + CFS_WEIGHT_TIME * f_time, 3)

        status = "completed" if not error_log else "completed_with_errors"
        logger.info(
            "OpenLaw ingest done: %d docs → %d chunks, CFS=%.3f", len(docs), ingested, cfs
        )

        return OpenLawIngestionResult(
            job_id=job_id,
            query=query,
            fetched_documents=len(raw_docs),
            ingested_chunks=ingested,
            failed_documents=len(error_log),
            cfs=cfs,
            f_geo=round(f_geo, 3),
            f_court=round(f_court, 3),
            f_time=round(f_time, 3),
            cfs_warning=cfs < 0.83,
            error_log=error_log,
            status=status,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _process_document(self, doc: dict, source_code: str) -> list[dict]:
        """PII mask → chunk → build Qdrant payload dicts."""
        content = doc.get("content", "")
        if not content:
            return []

        # PII masking
        masked_content, _, pii_count = mask_pii(content)
        if pii_count > 0:
            logger.debug("Masked %d PII items in doc %s", pii_count, doc.get("judgment_id"))

        # Thai chunking
        raw_chunks = self.chunker.chunk(masked_content)

        chunks: list[dict] = []
        for i, chunk in enumerate(raw_chunks):
            chunk_text = getattr(chunk, "text", chunk)
            if not str(chunk_text).strip():
                continue

            payload = {
                "chunk_text": chunk_text,
                "title": doc.get("title", ""),
                "case_no": doc.get("case_no", ""),
                "court_type": doc.get("court_type", "unknown"),
                "year": doc.get("year", 0),
                "province": doc.get("province", "ไม่ระบุ"),
                "statutes": doc.get("statutes", []),
                "citation": doc.get("citation", ""),
                "source_code": source_code,
                "document_type": "judgment",
                "judgment_id": doc.get("judgment_id", ""),
                "chunk_index": i,
                "summary": chunk_text[:300],
            }

            chunks.append({
                "id": str(uuid.uuid4()),
                "text": chunk_text,
                "payload": payload,
            })

        return chunks
