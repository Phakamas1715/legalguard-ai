"""Metadata extraction service for Thai legal documents.

Extracts structured metadata (case number, court type, year, statutes,
form number, form category, document type) from raw text using regex patterns.
Tags each record with its source dataset code (A1.1–A7.4, B1.1–B5.4).
"""
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
# Detailed A1/B1 sub-mapping (National Security & Judicial Standard)
# ---------------------------------------------------------------------------

SUB_SOURCE_MAPPING: dict[str, str] = {
    "A1.1": "คำฟ้องแพ่ง (Civil Complaint)",
    "A1.2": "คำฟ้องอาญา (Criminal Complaint)",
    "A1.3": "คำฟ้องปกครอง (Admin Complaint)",
    "A1.4": "คำร้องทั่วไป (General Motion)",
    "B1.1": "พยานเอกสาร (Documentary Evidence)",
    "B1.2": "พยานวัตถุ (Material Evidence)",
    "B1.3": "หนังสือมอบอำนาจ (Power of Attorney)",
    "B1.4": "ใบแต่งทนาย (Appoint Attorney)",
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
    # E-prefix court-specific formats
    "พE": "district",   # ศาลจังหวัด (แพ่ง)
    "มE": "district",   # ศาลแขวง
    "ผบE": "district",  # ศาลแขวง (ผู้บริโภค)
    "ผE": "district",   # ศาลจังหวัด
    "ยE": "district",   # ศาลจังหวัด (อาญา)
    "อE": "appeal",     # ศาลอุทธรณ์
    "ย": "district",    # ศาลจังหวัด (อาญา)
}

# ---------------------------------------------------------------------------
# Regex patterns
# ---------------------------------------------------------------------------

# Case number patterns:
# Classic: ฎ.1234/2568, อ.999/2567, ชต.12/2566, ปค.45/2565
# Court-specific with E-prefix: พE 641/2567, มE500/2567, ผบE2001/2567
# Criminal: ย20202/2567, อ.1234/2568
# Black/Red numbers: คดีหมายเลขดำที่ / คดีหมายเลขแดงที่
_CASE_NO_RE = re.compile(
    r"((?:ฎ|อ|ชต|ผบ|รง|ปค)\.\s*\d+/\d{4})"
    r"|"
    r"((?:พE|มE|ผบE|ผE|ยE|อE)\s*\d+/\d{4})"
    r"|"
    r"(ย\d+/\d{4})"
)

# Extract prefix from a matched case number.
_CASE_PREFIX_RE = re.compile(
    r"^(ฎ|อ|ชต|ผบ|รง|ปค)\."
    r"|^(พE|มE|ผบE|ผE|ยE|อE)"
    r"|^(ย)"
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
    "คำฟ้องแพ่ง": ["คำฟ้องแพ่ง", "ฟ้องแพ่ง"],
    "คำฟ้องอาญา": ["คำฟ้องอาญา", "ฟ้องอาญา"],
    "คำฟ้องปกครอง": ["คำร้องขอให้ศาลปกครอง", "ฟ้องปกครอง"],
    "คำให้การ": ["คำให้การจำเลย", "แก้คำฟ้อง"],
    "คำร้อง": ["คำร้อง", "ร้องขอ"],
    "หมาย": ["หมายเรียก", "หมายนัด", "หมายจับ", "หมายค้น"],
    "พยานเอกสาร": ["บัญชีพยานเอกสาร", "ส่งพยานเอกสาร"],
    "พยานบุคคล": ["บัญชีพยานบุคคล", "นำสืบพยาน"],
    "พยานวัตถุ": ["บัญชีพยานวัตถุ"],
    "เอกสารแสดงตัวตน": ["สำเนาบัตรประชาชน", "สำเนาทะเบียนบ้าน", "หนังสือรับรองบริษัท"],
    "เอกสารมอบอำนาจ": ["ใบแต่งทนาย", "หนังสือมอบฉันทะ", "หนังสือมอบอำนาจ"],
    "ค่าธรรมเนียม": ["ใบเสร็จรับเงิน", "ค่าธรรมเนียมศาล", "ค่าขึ้นศาล"],
    "สรุปสำนวน": ["สรุปรายงาน", "ข้อเท็จจริงเบื้องต้น", "สารบาญ"],
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
        if not m:
            return None
        # Return whichever group matched (classic, E-prefix, or criminal)
        matched = m.group(1) or m.group(2) or m.group(3) or ""
        return matched.replace(" ", "") if matched else None

    @staticmethod
    def _court_type_from_case_no(case_no: Optional[str]) -> Optional[str]:
        if not case_no:
            return None
        m = _CASE_PREFIX_RE.match(case_no)
        if m:
            prefix = m.group(1) or m.group(2) or m.group(3) or ""
            return _PREFIX_TO_COURT.get(prefix)
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
