"""Metadata extraction service for Thai legal documents.

Extracts structured metadata (case number, court type, year, statutes,
form number, form category, document type) from raw text using regex patterns.
Tags each record with its source dataset code (A1.1–A7.4, B1.1–B5.4).
"""
from __future__ import annotations

from __future__ import annotations

import re
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Source code → document type mapping
# ---------------------------------------------------------------------------

SOURCE_TO_DOCTYPE: dict[str, str] = {
    "A1": "court_form",
    "A2": "guide",
    "A3": "regulation",
    "A4": "judgment",
    "A5": "training",
    "A6": "statistics",
    "A7": "reference",
    "B1": "court_form",
    "B2": "guide",
    "B3": "regulation",
    "B4": "validation",
    "B5": "judgment",
}

# ---------------------------------------------------------------------------
# Case-number prefix → court type
# ---------------------------------------------------------------------------

_PREFIX_TO_COURT: dict[str, str] = {
    "ฎ": "supreme",
    "อ": "appeal",
    "ชต": "district",
    "ผบ": "district",
    "รง": "district",
    "ปค": "admin",
}

# ---------------------------------------------------------------------------
# Regex patterns
# ---------------------------------------------------------------------------

# Case number patterns: ฎ.1234/2568, อ.999/2567, ชต.12/2566, ปค.45/2565, etc.
_CASE_NO_RE = re.compile(
    r"((?:ฎ|อ|ชต|ผบ|รง|ปค)\.\s*\d+/\d{4})"
)

# Extract prefix from a matched case number.
_CASE_PREFIX_RE = re.compile(
    r"^(ฎ|อ|ชต|ผบ|รง|ปค)\."
)

# Buddhist year (25XX) — standalone or inside case numbers.
_YEAR_RE = re.compile(r"(?:พ\.?ศ\.?\s*)?(\b25\d{2}\b)")

# Statute references: มาตรา 341, ป.อ., ป.พ.พ., พ.ร.บ.XXX
_STATUTE_RE = re.compile(
    r"(มาตรา\s*\d+(?:\s*(?:ทวิ|ตรี|จัตวา|วรรค(?:หนึ่ง|สอง|สาม)))?|"
    r"ป\.อ\.|ป\.พ\.พ\.|ป\.วิ\.อ\.|ป\.วิ\.พ\.|"
    r"พ\.ร\.บ\.[^\s,;]+)"
)

# Form number from text: "แบบฟอร์ม 04", "แบบพิมพ์ 15", "ปค.1"
_FORM_NUMBER_TEXT_RE = re.compile(
    r"(?:แบบฟอร์ม|แบบพิมพ์|แบบ)\s*(\d+(?:\s*(?:ทวิ|ตรี))?)|"
    r"(ปค\.\d+)"
)

# Form number from filename: leading digits like "04 แบบพิมพ์คำฟ้อง.pdf"
_FORM_NUMBER_FILE_RE = re.compile(r"(?:^|/)(\d{2,3})\s")

# Form category keywords
_FORM_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "คำฟ้อง": ["คำฟ้อง", "ฟ้อง"],
    "คำร้อง": ["คำร้อง", "ร้อง"],
    "หมาย": ["หมาย", "หมายเรียก", "หมายนัด", "หมายจับ", "หมายค้น"],
    "เอกสารประกอบ": [
        "บัญชีพยาน",
        "ใบแต่งทนาย",
        "ใบมอบฉันทะ",
        "ใบมอบอำนาจ",
        "บัญชีทรัพย์",
        "สารบาญ",
        "สารบัญ",
        "ปกหน้า",
        "หน้าสำนวน",
        "คำให้การ",
    ],
}


# ---------------------------------------------------------------------------
# Pydantic model
# ---------------------------------------------------------------------------

class DocumentMetadata(BaseModel):
    """Structured metadata extracted from a Thai legal document."""

    case_no: Optional[str] = None
    court_type: Optional[str] = None  # "supreme", "appeal", "district", "admin"
    year: Optional[int] = None  # Buddhist year e.g. 2568
    statutes: list[str] = Field(default_factory=list)
    form_number: Optional[str] = None  # e.g. "04", "ปค.1"
    form_category: Optional[str] = None  # "คำฟ้อง", "คำร้อง", "หมาย", "เอกสารประกอบ"
    document_type: str = "court_form"  # inferred from source_code
    source_code: str = ""  # e.g. "A1.1", "B5.1"


# ---------------------------------------------------------------------------
# Extractor
# ---------------------------------------------------------------------------

class MetadataExtractor:
    """Extract structured metadata from Thai legal document text."""

    def extract(
        self,
        text: str,
        source_code: str,
        file_path: str = "",
    ) -> DocumentMetadata:
        """Extract metadata from *text* tagged with *source_code*.

        Parameters
        ----------
        text:
            Raw document text (may be empty for scanned PDFs that failed OCR).
        source_code:
            Dataset code such as ``"A1.1"`` or ``"B5.1"``.
        file_path:
            Optional original file path — used to extract form numbers from
            filenames like ``"04 แบบพิมพ์คำฟ้อง.pdf"``.
        """
        case_no = self._extract_case_no(text)
        court_type = self._court_type_from_case_no(case_no)
        year = self._extract_year(text, case_no)
        statutes = self._extract_statutes(text)
        form_number = self._extract_form_number(text, file_path)
        form_category = self._extract_form_category(text, file_path)
        document_type = self._infer_document_type(source_code)

        return DocumentMetadata(
            case_no=case_no,
            court_type=court_type,
            year=year,
            statutes=statutes,
            form_number=form_number,
            form_category=form_category,
            document_type=document_type,
            source_code=source_code,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_case_no(text: str) -> Optional[str]:
        m = _CASE_NO_RE.search(text)
        return m.group(1).replace(" ", "") if m else None

    @staticmethod
    def _court_type_from_case_no(case_no: Optional[str]) -> Optional[str]:
        if not case_no:
            return None
        m = _CASE_PREFIX_RE.match(case_no)
        if m:
            return _PREFIX_TO_COURT.get(m.group(1))
        return None

    @staticmethod
    def _extract_year(text: str, case_no: Optional[str]) -> Optional[int]:
        # Prefer year from case number (e.g. ฎ.1234/2568 → 2568).
        if case_no:
            parts = case_no.split("/")
            if len(parts) == 2 and parts[1].isdigit():
                yr = int(parts[1])
                if 2500 <= yr <= 2599:
                    return yr

        # Fallback: first Buddhist year found in text.
        m = _YEAR_RE.search(text)
        if m:
            yr = int(m.group(1))
            if 2500 <= yr <= 2599:
                return yr
        return None

    @staticmethod
    def _extract_statutes(text: str) -> list[str]:
        matches = _STATUTE_RE.findall(text)
        # Deduplicate while preserving order.
        seen: set[str] = set()
        result: list[str] = []
        for s in matches:
            s_clean = s.strip()
            if s_clean and s_clean not in seen:
                seen.add(s_clean)
                result.append(s_clean)
        return result

    @staticmethod
    def _extract_form_number(text: str, file_path: str) -> Optional[str]:
        # Try text first.
        m = _FORM_NUMBER_TEXT_RE.search(text)
        if m:
            return (m.group(1) or m.group(2) or "").strip() or None

        # Fallback: extract from filename.
        if file_path:
            m = _FORM_NUMBER_FILE_RE.search(file_path)
            if m:
                return m.group(1)
        return None

    @staticmethod
    def _extract_form_category(text: str, file_path: str) -> Optional[str]:
        combined = f"{file_path} {text}"
        for category, keywords in _FORM_CATEGORY_KEYWORDS.items():
            for kw in keywords:
                if kw in combined:
                    return category
        return None

    @staticmethod
    def _infer_document_type(source_code: str) -> str:
        # Extract major code: "A1.1" → "A1", "B5" → "B5"
        prefix = source_code.split(".")[0] if source_code else ""
        return SOURCE_TO_DOCTYPE.get(prefix, "court_form")
