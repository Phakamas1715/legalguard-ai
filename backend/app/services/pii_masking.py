"""PII Masking Engine — detect and mask personal information in Thai legal text.

Ported from src/lib/piiMasking.ts with all Thai-specific patterns.
"""

from __future__ import annotations

import re
from enum import Enum
from typing import NamedTuple


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class PIIType(str, Enum):
    """Types of PII detected in Thai legal documents."""

    name = "name"
    id_card = "id_card"
    phone = "phone"
    address = "address"
    email = "email"
    bank_account = "bank_account"


class PIISpan(NamedTuple):
    """A detected PII span in text."""

    start: int
    end: int
    type: PIIType
    original: str
    masked: str


# ---------------------------------------------------------------------------
# Thai labels for each PII type
# ---------------------------------------------------------------------------

PII_TYPE_LABELS: dict[PIIType, str] = {
    PIIType.name: "ชื่อ-นามสกุล",
    PIIType.id_card: "เลขบัตรประชาชน",
    PIIType.phone: "เบอร์โทรศัพท์",
    PIIType.address: "ที่อยู่",
    PIIType.email: "อีเมล",
    PIIType.bank_account: "เลขบัญชีธนาคาร",
}


# ---------------------------------------------------------------------------
# Pattern definitions — ported from TypeScript PII_PATTERNS
# ---------------------------------------------------------------------------

# Thai Unicode range: \u0e01-\u0e39\u0e40-\u0e4c (consonants + vowels + tone marks)
_THAI = r"\u0e01-\u0e39\u0e40-\u0e4c"

_PII_PATTERNS: list[tuple[PIIType, re.Pattern[str], str]] = [
    # 1. Thai national ID: 13 digits with optional dashes/spaces
    (
        PIIType.id_card,
        re.compile(r"\b[0-9][-\s]?[0-9]{4}[-\s]?[0-9]{5}[-\s]?[0-9]{2}[-\s]?[0-9]\b"),
        "[เลขบัตรถูกปกปิด]",
    ),
    # 2. Thai phone: +66, 0x-xxx-xxxx, 0x-xxxx-xxxx (Bangkok 02x)
    (
        PIIType.phone,
        re.compile(
            r"(?:"
            r"\+66[-\s]?[0-9]{1,2}[-\s]?[0-9]{3,4}[-\s]?[0-9]{4}"
            r"|0[2689][-\s]?[0-9]{3,4}[-\s]?[0-9]{4}"
            r"|0[0-9]{2}[-\s]?[0-9]{3}[-\s]?[0-9]{4}"
            r"|0[0-9]{2}[-\s]?[0-9]{7}"
            r")"
        ),
        "[เบอร์โทรถูกปกปิด]",
    ),
    # 3. Email — including Thai-subdomain and code-switch patterns
    (
        PIIType.email,
        re.compile(
            r"\b[A-Za-z0-9._%+\-" + _THAI + r"]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"
        ),
        "[อีเมลถูกปกปิด]",
    ),
    # 4. Bank account: 10-digit Thai bank pattern (with or without Thai labels)
    (
        PIIType.bank_account,
        re.compile(
            r"(?:"
            r"(?:บัญชี(?:เลขที่)?|account\s*no\.?|acct\.?)[:\s]*"
            r"[0-9]{3}[-\s]?[0-9][-\s]?[0-9]{5}[-\s]?[0-9]"
            r"|(?<!\d)[0-9]{3}[-\s]?[0-9][-\s]?[0-9]{5}[-\s]?[0-9](?!\d)"
            r")",
            re.IGNORECASE,
        ),
        "[เลขบัญชีถูกปกปิด]",
    ),
    # 5. Thai address patterns (standard + abbreviated)
    (
        PIIType.address,
        re.compile(
            r"\d{1,4}/\d{1,4}\s+"
            r"(?:หมู่|ม\.|ซ\.|ซอย|ถ\.|ถนน|ต\.|ตำบล|อ\.|อำเภอ|จ\.|จังหวัด)"
            r"[^\n]{5,60}"
        ),
        "[ที่อยู่ถูกปกปิด]",
    ),
    # 6. Thai names with prefix — pure Thai, pure English, or code-switch mixed
    (
        PIIType.name,
        re.compile(
            r"(?:นาย|นาง(?:สาว)?|น\.ส\.|ด\.ช\.|ด\.ญ\.|Mr\.|Mrs\.|Ms\.|Miss|นพ\.|พญ\.)"
            r"\s*[" + _THAI + r"A-Za-z]{2,}(?:\s+[" + _THAI + r"A-Za-z]{2,})+"
        ),
        "[ชื่อ-นามสกุลถูกปกปิด]",
    ),
    # 7. Code-switch: English name after Thai case prefix
    (
        PIIType.name,
        re.compile(
            r"(?:ผู้(?:เสียหาย|กล่าวหา|ต้องหา|ถูกกล่าวหา)|จำเลย|โจทก์|พยาน)"
            r"\s+([A-Z][a-z]+\s+[A-Z][a-z]+)"
        ),
        "[ชื่อ-นามสกุลถูกปกปิด]",
    ),
    # 8. Thai passport number (P + 8 alphanumeric) — quasi-identifier
    (
        PIIType.id_card,
        re.compile(r"\b[Pp][A-Za-z0-9]{8}\b"),
        "[เลขหนังสือเดินทางถูกปกปิด]",
    ),
    # 9. LINE ID / social handle in legal docs
    (
        PIIType.phone,
        re.compile(
            r"(?:LINE\s*(?:ID)?|line\s*(?:id)?|ไลน์\s*(?:ID|id)?)"
            r"[:\s]+@?[A-Za-z0-9._\-" + _THAI + r"]{3,30}",
            re.IGNORECASE,
        ),
        "[LINE ID ถูกปกปิด]",
    ),
]


# ---------------------------------------------------------------------------
# Detection & masking functions
# ---------------------------------------------------------------------------


def detect_pii(text: str) -> list[PIISpan]:
    """Detect all PII spans in *text*.

    Returns a sorted, non-overlapping list of ``PIISpan`` instances.
    """
    spans: list[PIISpan] = []

    for pii_type, pattern, mask in _PII_PATTERNS:
        for match in pattern.finditer(text):
            spans.append(
                PIISpan(
                    start=match.start(),
                    end=match.end(),
                    type=pii_type,
                    original=match.group(),
                    masked=mask,
                )
            )

    # Sort by start position and remove overlaps (keep first match)
    spans.sort(key=lambda s: s.start)
    filtered: list[PIISpan] = []
    last_end = -1
    for span in spans:
        if span.start >= last_end:
            filtered.append(span)
            last_end = span.end

    return filtered


def mask_pii(text: str) -> tuple[str, list[PIISpan], int]:
    """Mask all PII in *text*.

    Returns ``(masked_text, spans, pii_count)``.
    """
    spans = detect_pii(text)
    if not spans:
        return text, [], 0

    parts: list[str] = []
    cursor = 0
    for span in spans:
        parts.append(text[cursor : span.start])
        parts.append(span.masked)
        cursor = span.end
    parts.append(text[cursor:])

    return "".join(parts), spans, len(spans)
