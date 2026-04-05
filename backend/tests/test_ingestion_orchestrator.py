"""Tests for the ingestion orchestrator and ingest API endpoints."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.services.ingestion_orchestrator import (
    IngestionOrchestrator,
    IngestionResult,
    _mask_pii,
)
from app.services.pdf_extractor import ExtractedDocument
from app.services.metadata_extractor import DocumentMetadata
from app.services.thai_chunker import Chunk


# ---------------------------------------------------------------------------
# PII masking tests
# ---------------------------------------------------------------------------


class TestMaskPii:
    def test_masks_thai_national_id(self):
        text = "บัตรประชาชน 1-1234-56789-01-2 ของนาย"
        result = _mask_pii(text)
        assert "[THAI_ID]" in result
        assert "1-1234-56789-01-2" not in result

    def test_masks_phone_number(self):
        text = "โทร 081-234-5678 ติดต่อ"
        result = _mask_pii(text)
        assert "[PHONE]" in result
        assert "081-234-5678" not in result

    def test_masks_email(self):
        text = "ส่งเอกสารที่ test@example.com"
        result = _mask_pii(text)
        assert "[EMAIL]" in result
        assert "test@example.com" not in result

    def test_no_pii_unchanged(self):
        text = "ข้อความปกติไม่มีข้อมูลส่วนตัว"
        assert _mask_pii(text) == text


# ---------------------------------------------------------------------------
# IngestionResult model tests
# ---------------------------------------------------------------------------


class TestIngestionResult:
    def test_defaults(self):
        r = IngestionResult(
            job_id="abc",
            source_code="A1.1",
            total_documents=5,
            processed_documents=5,
            failed_documents=0,
            total_chunks=20,
        )
        assert r.status == "completed"
        assert r.error_log == []

    def test_with_errors(self):
        r = IngestionResult(
            job_id="abc",
            source_code="A1.1",
            total_documents=5,
            processed_documents=3,
            failed_documents=2,
            total_chunks=10,
            error_log=[{"file_path": "bad.pdf", "error": "broken"}],
            status="completed_with_errors",
        )
        assert r.status == "completed_with_errors"
        assert len(r.error_log) == 1


# ---------------------------------------------------------------------------
# Orchestrator unit tests (mocked services)
# ---------------------------------------------------------------------------


def _make_orchestrator():
    """Create an orchestrator with all services mocked."""
    orch = IngestionOrchestrator(
        pdf_extractor=MagicMock(),
        chunker=MagicMock(),
        metadata_extractor=MagicMock(),
        embedding_service=MagicMock(),
        dedup_service=MagicMock(),
        bm25_indexer=MagicMock(),
        qdrant_service=MagicMock(),
    )
    return orch


def _setup_happy_path(orch: IngestionOrchestrator):
    """Configure mocks for a successful single-file ingestion."""
    orch.pdf_extractor.extract_text.return_value = ExtractedDocument(
        file_path="test.pdf",
        text="ข้อความทดสอบสำหรับการทดสอบระบบ",
        page_count=1,
        extraction_method="pymupdf",
    )
    orch.metadata_extractor.extract.return_value = DocumentMetadata(
        source_code="A1.1",
        document_type="court_form",
        case_no="ฎ.123/2568",
        court_type="supreme",
        year=2568,
        statutes=["มาตรา 341"],
    )
    orch.chunker.chunk.return_value = [
        Chunk(text="chunk1", token_count=10, chunk_index=0, start_char=0, end_char=6),
        Chunk(text="chunk2", token_count=10, chunk_index=1, start_char=6, end_char=12),
    ]
    orch.embedding_service.embed_batch.return_value = [
        [0.1] * 1536,
        [0.2] * 1536,
    ]
    orch.dedup_service.deduplicate.side_effect = lambda records: records
    orch.bm25_indexer.ensure_index.return_value = None
    orch.bm25_indexer.add_documents.return_value = 2
    orch.qdrant_service.upsert_chunks.return_value = None


class TestIngestionOrchestrator:
    @pytest.mark.asyncio
    async def test_successful_ingestion(self):
        orch = _make_orchestrator()
        _setup_happy_path(orch)

        result = await orch.ingest_documents(
            file_paths=["test.pdf"],
            source_code="A1.1",
            batch_size=100,
        )

        assert result.processed_documents == 1
        assert result.failed_documents == 0
        assert result.total_chunks == 2
        assert result.status == "completed"
        assert result.error_log == []
        orch.qdrant_service.upsert_chunks.assert_called_once()
        orch.bm25_indexer.add_documents.assert_called_once()

    @pytest.mark.asyncio
    async def test_extraction_error_logged(self):
        orch = _make_orchestrator()
        orch.bm25_indexer.ensure_index.return_value = None
        orch.pdf_extractor.extract_text.return_value = ExtractedDocument(
            file_path="bad.pdf", error="FileNotFoundError: bad.pdf"
        )

        result = await orch.ingest_documents(
            file_paths=["bad.pdf"],
            source_code="A1.1",
        )

        assert result.failed_documents == 1
        assert result.processed_documents == 0
        assert result.status == "completed_with_errors"
        assert len(result.error_log) == 1
        assert "bad.pdf" in result.error_log[0]["file_path"]

    @pytest.mark.asyncio
    async def test_empty_text_error(self):
        orch = _make_orchestrator()
        orch.bm25_indexer.ensure_index.return_value = None
        orch.pdf_extractor.extract_text.return_value = ExtractedDocument(
            file_path="empty.pdf", text="", page_count=1, extraction_method="pymupdf"
        )

        result = await orch.ingest_documents(
            file_paths=["empty.pdf"],
            source_code="A1.1",
        )

        assert result.failed_documents == 1
        assert result.status == "completed_with_errors"

    @pytest.mark.asyncio
    async def test_partial_failure_continues(self):
        """One file fails, the other succeeds — batch continues."""
        orch = _make_orchestrator()
        _setup_happy_path(orch)

        # First call fails, second succeeds
        orch.pdf_extractor.extract_text.side_effect = [
            ExtractedDocument(file_path="bad.pdf", error="corrupt"),
            ExtractedDocument(
                file_path="good.pdf",
                text="ข้อความดี",
                page_count=1,
                extraction_method="pymupdf",
            ),
        ]

        result = await orch.ingest_documents(
            file_paths=["bad.pdf", "good.pdf"],
            source_code="A1.1",
        )

        assert result.processed_documents == 1
        assert result.failed_documents == 1
        assert result.total_documents == 2
        assert result.status == "completed_with_errors"

    @pytest.mark.asyncio
    async def test_batch_size_respected(self):
        """Verify batching processes all files."""
        orch = _make_orchestrator()
        _setup_happy_path(orch)

        result = await orch.ingest_documents(
            file_paths=["a.pdf", "b.pdf", "c.pdf"],
            source_code="A1.1",
            batch_size=2,  # 2 batches: [a,b] and [c]
        )

        assert result.total_documents == 3
        assert result.processed_documents == 3
        assert orch.pdf_extractor.extract_text.call_count == 3

    @pytest.mark.asyncio
    async def test_dedup_skips_document(self):
        """When dedup returns empty, document is skipped (0 chunks)."""
        orch = _make_orchestrator()
        _setup_happy_path(orch)
        orch.dedup_service.deduplicate.side_effect = None
        orch.dedup_service.deduplicate.return_value = []  # deduped away

        result = await orch.ingest_documents(
            file_paths=["dup.pdf"],
            source_code="A1.1",
        )

        # Processed but 0 chunks since deduped
        assert result.processed_documents == 1
        assert result.total_chunks == 0
        orch.qdrant_service.upsert_chunks.assert_not_called()


class TestDeleteSource:
    def test_delete_source(self):
        orch = _make_orchestrator()
        orch.bm25_indexer.delete_by_source.return_value = 5

        result = orch.delete_source("A1.1")

        assert result["source_code"] == "A1.1"
        assert result["bm25_deleted"] == 5
        assert result["status"] == "deleted"
        orch.qdrant_service.delete_by_source.assert_called_once_with("A1.1")
        orch.bm25_indexer.delete_by_source.assert_called_once_with("A1.1")
