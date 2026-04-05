"""Tests for the PDF extraction module."""

from __future__ import annotations

import logging
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.services.pdf_extractor import ExtractedDocument, PDFExtractor


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def extractor() -> PDFExtractor:
    return PDFExtractor()


# ---------------------------------------------------------------------------
# ExtractedDocument model tests
# ---------------------------------------------------------------------------


class TestExtractedDocument:
    def test_defaults(self):
        doc = ExtractedDocument(file_path="/tmp/test.pdf")
        assert doc.file_path == "/tmp/test.pdf"
        assert doc.text == ""
        assert doc.page_count == 0
        assert doc.extraction_method == ""
        assert doc.metadata == {}
        assert doc.source_code == ""
        assert doc.error is None

    def test_with_error(self):
        doc = ExtractedDocument(file_path="x.pdf", error="broken")
        assert doc.error == "broken"

    def test_source_code_settable(self):
        doc = ExtractedDocument(file_path="x.pdf")
        doc.source_code = "A1.1"
        assert doc.source_code == "A1.1"


# ---------------------------------------------------------------------------
# extract_text — file not found
# ---------------------------------------------------------------------------


class TestExtractTextFileNotFound:
    def test_returns_error_document(self, extractor: PDFExtractor):
        result = extractor.extract_text("/nonexistent/path.pdf")
        assert result.error is not None
        assert "FileNotFoundError" in result.error
        assert result.file_path == "/nonexistent/path.pdf"
        assert result.text == ""

    def test_logs_error(self, extractor: PDFExtractor, caplog):
        with caplog.at_level(logging.ERROR):
            extractor.extract_text("/no/such/file.pdf")
        assert "File not found" in caplog.text


# ---------------------------------------------------------------------------
# extract_text — successful PyMuPDF extraction
# ---------------------------------------------------------------------------


class TestExtractTextPyMuPDF:
    @patch.object(PDFExtractor, "_extract_with_pymupdf")
    def test_returns_pymupdf_result_when_text_sufficient(
        self, mock_pymupdf, extractor: PDFExtractor, tmp_path: Path
    ):
        pdf_file = tmp_path / "good.pdf"
        pdf_file.write_bytes(b"%PDF-1.4 fake")

        # 200 chars on 1 page → avg 200 >= 50 threshold
        mock_pymupdf.return_value = ("A" * 200, 1, {"title": "Test Doc"})

        result = extractor.extract_text(str(pdf_file))

        assert result.extraction_method == "pymupdf"
        assert result.text == "A" * 200
        assert result.page_count == 1
        assert result.metadata == {"title": "Test Doc"}
        assert result.error is None


# ---------------------------------------------------------------------------
# extract_text — OCR fallback when text is sparse
# ---------------------------------------------------------------------------


class TestExtractTextOCRFallback:
    @patch.object(PDFExtractor, "_try_ocr_fallback")
    @patch.object(PDFExtractor, "_extract_with_pymupdf")
    def test_falls_back_to_ocr_when_text_sparse(
        self, mock_pymupdf, mock_ocr, extractor: PDFExtractor, tmp_path: Path
    ):
        pdf_file = tmp_path / "scanned.pdf"
        pdf_file.write_bytes(b"%PDF-1.4 fake")

        # 10 chars on 1 page → avg 10 < 50 threshold
        mock_pymupdf.return_value = ("short text", 1, {})
        mock_ocr.return_value = ExtractedDocument(
            file_path=str(pdf_file),
            text="OCR extracted text here",
            page_count=1,
            extraction_method="easyocr",
        )

        result = extractor.extract_text(str(pdf_file))

        assert result.extraction_method == "easyocr"
        mock_ocr.assert_called_once()

    @patch.object(PDFExtractor, "_try_ocr_fallback")
    @patch.object(PDFExtractor, "_extract_with_pymupdf")
    def test_pymupdf_exception_triggers_ocr_fallback(
        self, mock_pymupdf, mock_ocr, extractor: PDFExtractor, tmp_path: Path
    ):
        pdf_file = tmp_path / "corrupt.pdf"
        pdf_file.write_bytes(b"not a pdf")

        mock_pymupdf.side_effect = RuntimeError("corrupted file")
        mock_ocr.return_value = ExtractedDocument(
            file_path=str(pdf_file), error="OCR also failed"
        )

        result = extractor.extract_text(str(pdf_file))
        mock_ocr.assert_called_once()


# ---------------------------------------------------------------------------
# extract_batch
# ---------------------------------------------------------------------------


class TestExtractBatch:
    @patch.object(PDFExtractor, "extract_text")
    def test_processes_all_files_and_sets_source_code(
        self, mock_extract, extractor: PDFExtractor
    ):
        mock_extract.side_effect = [
            ExtractedDocument(file_path="a.pdf", text="hello", extraction_method="pymupdf"),
            ExtractedDocument(file_path="b.pdf", text="world", extraction_method="pymupdf"),
        ]

        results = extractor.extract_batch(["a.pdf", "b.pdf"], source_code="A1.1")

        assert len(results) == 2
        assert all(r.source_code == "A1.1" for r in results)
        assert results[0].text == "hello"
        assert results[1].text == "world"

    @patch.object(PDFExtractor, "extract_text")
    def test_continues_on_error(self, mock_extract, extractor: PDFExtractor):
        mock_extract.side_effect = [
            RuntimeError("boom"),
            ExtractedDocument(file_path="ok.pdf", text="fine", extraction_method="pymupdf"),
        ]

        results = extractor.extract_batch(["bad.pdf", "ok.pdf"], source_code="B1.1")

        assert len(results) == 2
        assert results[0].error is not None
        assert "RuntimeError" in results[0].error
        assert results[0].source_code == "B1.1"
        assert results[1].text == "fine"
        assert results[1].error is None

    @patch.object(PDFExtractor, "extract_text")
    def test_error_document_includes_source_code(
        self, mock_extract, extractor: PDFExtractor
    ):
        mock_extract.return_value = ExtractedDocument(
            file_path="x.pdf", error="FileNotFoundError: x.pdf"
        )

        results = extractor.extract_batch(["x.pdf"], source_code="A4.1")

        assert results[0].source_code == "A4.1"
        assert results[0].error is not None

    def test_empty_batch(self, extractor: PDFExtractor):
        results = extractor.extract_batch([], source_code="A1.1")
        assert results == []


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


class TestEdgeCases:
    @patch.object(PDFExtractor, "_extract_with_pymupdf")
    def test_zero_page_pdf(
        self, mock_pymupdf, extractor: PDFExtractor, tmp_path: Path
    ):
        """A PDF with 0 pages should not cause division by zero."""
        pdf_file = tmp_path / "empty.pdf"
        pdf_file.write_bytes(b"%PDF-1.4 fake")

        mock_pymupdf.return_value = ("", 0, {})

        # avg_chars = 0 / max(0,1) = 0 < 50 → triggers OCR fallback
        with patch.object(PDFExtractor, "_try_ocr_fallback") as mock_ocr:
            mock_ocr.return_value = ExtractedDocument(
                file_path=str(pdf_file), text="", page_count=0, extraction_method="easyocr"
            )
            result = extractor.extract_text(str(pdf_file))
            mock_ocr.assert_called_once()
