"""Ingestion orchestrator for LegalGuard AI.

Coordinates the full data ingestion pipeline:
PDF extraction → Thai chunking → metadata extraction → PII masking →
deduplication → embedding → Qdrant upsert + BM25 index.

Processes files in configurable batch sizes with per-document error logging.
"""

from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field

from app.services.bm25_indexer import BM25Indexer
from app.services.dedup_service import DedupRecord, DedupService
from app.services.embedding_service import EmbeddingService
from app.services.metadata_extractor import MetadataExtractor
from app.services.pdf_extractor import PDFExtractor
from app.services.qdrant_loader import QdrantService
from app.services.thai_chunker import ThaiChunker

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class IngestionResult(BaseModel):
    """Result of a full ingestion run."""

    job_id: str
    source_code: str
    total_documents: int
    processed_documents: int
    failed_documents: int
    total_chunks: int
    error_log: list[dict] = Field(default_factory=list)
    status: str = "completed"  # "completed" | "completed_with_errors"


# ---------------------------------------------------------------------------
# PII masking (basic digit replacement before embedding)
# ---------------------------------------------------------------------------

# Thai national ID: 13 digits with optional dashes
_THAI_ID_RE = re.compile(r"\b\d{1}-?\d{4}-?\d{5}-?\d{2}-?\d{1}\b")
# Phone numbers: 0x-xxxx-xxxx or 0xxxxxxxxx
_PHONE_RE = re.compile(r"\b0\d{1,2}-?\d{3,4}-?\d{4}\b")
# Email
_EMAIL_RE = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")


def _mask_pii(text: str) -> str:
    """Basic PII masking — replace Thai IDs, phone numbers, and emails."""
    text = _THAI_ID_RE.sub("[THAI_ID]", text)
    text = _PHONE_RE.sub("[PHONE]", text)
    text = _EMAIL_RE.sub("[EMAIL]", text)
    return text


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


class IngestionOrchestrator:
    """Coordinates the full data ingestion pipeline."""

    def __init__(
        self,
        pdf_extractor: PDFExtractor | None = None,
        chunker: ThaiChunker | None = None,
        metadata_extractor: MetadataExtractor | None = None,
        embedding_service: EmbeddingService | None = None,
        dedup_service: DedupService | None = None,
        bm25_indexer: BM25Indexer | None = None,
        qdrant_service: QdrantService | None = None,
    ) -> None:
        self.pdf_extractor = pdf_extractor or PDFExtractor()
        self.chunker = chunker or ThaiChunker()
        self.metadata_extractor = metadata_extractor or MetadataExtractor()
        self.embedding_service = embedding_service or EmbeddingService()
        self.dedup_service = dedup_service or DedupService()
        self.bm25_indexer = bm25_indexer or BM25Indexer()
        self.qdrant_service = qdrant_service or QdrantService()


    async def ingest_documents(
        self,
        file_paths: list[str],
        source_code: str,
        batch_size: int = 100,
    ) -> IngestionResult:
        """Run the full ingestion pipeline on a list of file paths.

        Pipeline per file:
        1. Extract text from PDF
        2. Chunk text with Thai-aware chunker
        3. Extract metadata
        4. PII masking
        5. Deduplicate
        6. Generate embeddings
        7. Upsert to Qdrant
        8. Index in BM25

        Files are processed in batches of *batch_size*. Each file is
        independent — errors don't stop the batch.
        """
        job_id = str(uuid.uuid4())
        total_documents = len(file_paths)
        processed_documents = 0
        failed_documents = 0
        total_chunks = 0
        error_log: list[dict] = []

        # Ensure indexes exist
        self.bm25_indexer.ensure_index()

        for batch_start in range(0, total_documents, batch_size):
            batch_paths = file_paths[batch_start : batch_start + batch_size]

            for file_path in batch_paths:
                try:
                    chunks_count = await self._process_single_file(
                        file_path, source_code, job_id
                    )
                    total_chunks += chunks_count
                    processed_documents += 1
                except Exception as exc:
                    failed_documents += 1
                    error_log.append(
                        {
                            "file_path": file_path,
                            "error": f"{type(exc).__name__}: {exc}",
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        }
                    )
                    logger.error(
                        "Ingestion failed for %s (job=%s): %s",
                        file_path,
                        job_id,
                        exc,
                    )

            logger.info(
                "Batch checkpoint job=%s: processed=%d failed=%d chunks=%d",
                job_id,
                processed_documents,
                failed_documents,
                total_chunks,
            )

        status = "completed" if failed_documents == 0 else "completed_with_errors"

        return IngestionResult(
            job_id=job_id,
            source_code=source_code,
            total_documents=total_documents,
            processed_documents=processed_documents,
            failed_documents=failed_documents,
            total_chunks=total_chunks,
            error_log=error_log,
            status=status,
        )

    # ------------------------------------------------------------------
    # Single-file pipeline
    # ------------------------------------------------------------------

    async def _process_single_file(
        self,
        file_path: str,
        source_code: str,
        job_id: str,
    ) -> int:
        """Process one file through the full pipeline. Returns chunk count."""

        # 1. Extract text
        doc = self.pdf_extractor.extract_text(file_path)
        if doc.error:
            raise RuntimeError(f"Extraction failed: {doc.error}")
        if not doc.text.strip():
            raise RuntimeError("Extracted text is empty")

        # 2. Extract metadata
        metadata = self.metadata_extractor.extract(
            text=doc.text, source_code=source_code, file_path=file_path
        )

        # 3. Chunk text
        chunks = self.chunker.chunk(doc.text)
        if not chunks:
            raise RuntimeError("Chunker produced zero chunks")

        # 4. PII masking on chunk texts
        masked_texts = [_mask_pii(c.text) for c in chunks]

        # 5. Deduplication (at document level via metadata)
        now = datetime.now(timezone.utc)
        dedup_record = DedupRecord(
            case_no=metadata.case_no,
            court_type=metadata.court_type,
            source_code=source_code,
            ingested_at=now,
            data={"file_path": file_path},
        )
        deduped = self.dedup_service.deduplicate([dedup_record])
        if not deduped:
            logger.info("Document %s deduplicated away, skipping.", file_path)
            return 0

        # 6. Generate embeddings for all chunks
        embeddings = self.embedding_service.embed_batch(masked_texts)

        # 7. Build records for Qdrant + BM25
        knowledge_base_id = str(uuid.uuid4())
        qdrant_points: list[dict] = []
        bm25_docs: list[dict] = []

        for i, (chunk, masked_text, embedding) in enumerate(
            zip(chunks, masked_texts, embeddings)
        ):
            chunk_id = str(uuid.uuid4())
            payload = {
                "chunk_id": chunk_id,
                "knowledge_base_id": knowledge_base_id,
                "source_code": source_code,
                "document_type": metadata.document_type,
                "case_no": metadata.case_no or "",
                "court_type": metadata.court_type or "",
                "year": metadata.year or 0,
                "statutes": metadata.statutes,
                "chunk_index": i,
                "chunk_text": masked_text,
            }
            qdrant_points.append(
                {
                    "id": chunk_id,
                    "vector": embedding,
                    "payload": payload,
                }
            )
            bm25_docs.append(
                {
                    "id": chunk_id,
                    "text": masked_text,
                    "source_code": source_code,
                    "court_type": metadata.court_type,
                    "year": metadata.year,
                }
            )

        # 8. Upsert to Qdrant
        self.qdrant_service.upsert_chunks(qdrant_points)

        # 9. Index in BM25
        self.bm25_indexer.add_documents(bm25_docs)

        logger.info(
            "Ingested %s: %d chunks (job=%s, kb_id=%s)",
            file_path,
            len(chunks),
            job_id,
            knowledge_base_id,
        )

        return len(chunks)

    # ------------------------------------------------------------------
    # Deletion
    # ------------------------------------------------------------------

    def delete_source(self, source_code: str) -> dict:
        """Delete all data for a source_code from Qdrant and BM25."""
        self.qdrant_service.delete_by_source(source_code)
        bm25_deleted = self.bm25_indexer.delete_by_source(source_code)
        logger.info(
            "Deleted source_code=%s: bm25_deleted=%d", source_code, bm25_deleted
        )
        return {
            "source_code": source_code,
            "bm25_deleted": bm25_deleted,
            "status": "deleted",
        }
