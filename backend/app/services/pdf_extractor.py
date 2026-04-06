"""PDF text extraction service for LegalGuard AI.

Uses PyMuPDF (fitz) for text-based PDFs with EasyOCR fallback for scanned PDFs.
Handles malformed PDFs gracefully — logs errors and continues batch processing.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class ExtractedDocument(BaseModel):
    """Structured result from PDF extraction."""

    file_path: str
    text: str = ""
    page_count: int = 0
    extraction_method: str = ""  # "pymupdf" or "easyocr"
    metadata: dict = Field(default_factory=dict)
    source_code: str = ""  # set by caller (e.g. "A1.1", "B1.2")
    error: Optional[str] = None


# Minimum average characters per page to consider PyMuPDF extraction successful.
_MIN_CHARS_PER_PAGE = 50


class PDFExtractor:
    """Extract text from PDFs using PyMuPDF with EasyOCR fallback."""

    def __init__(self) -> None:
        # Lazy-loaded EasyOCR reader (heavy import, only load when needed).
        self._ocr_reader: object | None = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def extract_text(self, file_path: str) -> ExtractedDocument:
        """Extract text from a single PDF file.

        Strategy:
        1. Try PyMuPDF (fitz) for native text extraction.
        2. If average chars/page < 50, fall back to EasyOCR.
        """
        path = Path(file_path)

        if not path.exists():
            logger.error("File not found: %s", file_path)
            return ExtractedDocument(
                file_path=file_path,
                error=f"FileNotFoundError: {file_path}",
            )

        # --- Attempt PyMuPDF extraction ---
        try:
            text, page_count, pdf_metadata = self._extract_with_pymupdf(file_path)
        except Exception as exc:
            logger.error("PyMuPDF failed for %s: %s", file_path, exc)
            # Corrupted / unreadable PDF — try OCR as last resort
            return self._try_ocr_fallback(file_path, original_error=str(exc))

        avg_chars = len(text) / max(page_count, 1)

        if avg_chars >= _MIN_CHARS_PER_PAGE:
            return ExtractedDocument(
                file_path=file_path,
                text=text,
                page_count=page_count,
                extraction_method="pymupdf",
                metadata=pdf_metadata,
            )

        # Text too sparse — likely a scanned PDF, fall back to OCR.
        logger.info(
            "PyMuPDF text too short (%.0f chars/page) for %s — trying EasyOCR",
            avg_chars,
            file_path,
        )
        return self._try_ocr_fallback(file_path, page_count=page_count, pdf_metadata=pdf_metadata)

    def extract_batch(
        self,
        file_paths: list[str],
        source_code: str,
    ) -> list[ExtractedDocument]:
        """Extract text from multiple PDFs.

        Each file is processed independently. On error the result carries the
        ``error`` field and processing continues with the next file.
        """
        results: list[ExtractedDocument] = []
        for fp in file_paths:
            try:
                doc = self.extract_text(fp)
            except Exception as exc:
                logger.error(
                    "Unexpected error extracting %s (source_code=%s): %s",
                    fp,
                    source_code,
                    exc,
                )
                doc = ExtractedDocument(
                    file_path=fp,
                    error=f"{type(exc).__name__}: {exc}",
                )
            doc.source_code = source_code
            results.append(doc)
        return results

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_with_pymupdf(file_path: str) -> tuple[str, int, dict]:
        """Return (full_text, page_count, metadata) using PyMuPDF."""
        import fitz  # PyMuPDF

        doc = fitz.open(file_path)
        try:
            pages_text: list[str] = []
            for page in doc:
                pages_text.append(page.get_text())

            full_text = "\n".join(pages_text)
            page_count = len(doc)

            raw_meta = doc.metadata or {}
            metadata: dict = {}
            if raw_meta.get("title"):
                metadata["title"] = raw_meta["title"]
            if raw_meta.get("author"):
                metadata["author"] = raw_meta["author"]
            if raw_meta.get("subject"):
                metadata["subject"] = raw_meta["subject"]

            return full_text, page_count, metadata
        finally:
            doc.close()

    def _get_ocr_reader(self):
        """Lazy-initialise and return the EasyOCR reader."""
        if self._ocr_reader is None:
            import easyocr

            self._ocr_reader = easyocr.Reader(["th", "en"], gpu=False)
        return self._ocr_reader

    def _try_ocr_fallback(
        self,
        file_path: str,
        *,
        original_error: Optional[str] = None,
        page_count: int = 0,
        pdf_metadata: Optional[dict] = None,
    ) -> ExtractedDocument:
        """Attempt OCR extraction via EasyOCR on rendered page images."""
        try:
            import fitz  # PyMuPDF — used to render pages to images

            doc = fitz.open(file_path)
        except Exception as exc:
            error_msg = f"Cannot open PDF for OCR: {exc}"
            if original_error:
                error_msg = f"PyMuPDF error: {original_error}; OCR open error: {exc}"
            logger.error("OCR fallback failed for %s: %s", file_path, error_msg)
            return ExtractedDocument(file_path=file_path, error=error_msg)

        try:
            reader = self._get_ocr_reader()
            ocr_texts: list[str] = []
            actual_page_count = len(doc)

            for page in doc:
                pix = page.get_pixmap(dpi=300)
                img_bytes = pix.tobytes("png")

                results = reader.readtext(img_bytes, detail=0)
                ocr_texts.append(" ".join(results))

            full_text = "\n".join(ocr_texts)
            return ExtractedDocument(
                file_path=file_path,
                text=full_text,
                page_count=actual_page_count,
                extraction_method="easyocr",
                metadata=pdf_metadata or {},
            )
        except Exception as exc:
            error_msg = f"EasyOCR failed: {exc}"
            if original_error:
                error_msg = f"PyMuPDF error: {original_error}; {error_msg}"
            logger.error("OCR fallback failed for %s: %s", file_path, error_msg)
            return ExtractedDocument(
                file_path=file_path,
                page_count=page_count,
                error=error_msg,
            )
        finally:
            doc.close()
