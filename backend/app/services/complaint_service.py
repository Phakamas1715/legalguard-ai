"""Complaint Drafting Assistant — classify, draft, validate, verify & summarize.

Keyword-based classification and template-based drafting (placeholder for LLM).
Supports Justice Court (Set A) and Administrative Court (Set B) workflows.
"""

from __future__ import annotations

import re
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class ClassifyRequest(BaseModel):
    facts: str  # natural language case facts


class ClassifyResponse(BaseModel):
    case_type: str  # "civil", "criminal", "administrative"
    recommended_court: str
    confidence: float
    statutes: list[str]


class DraftRequest(BaseModel):
    facts: str
    case_type: str
    plaintiff: str = ""
    defendant: str = ""


class DraftResponse(BaseModel):
    draft_text: str
    case_type: str
    recommended_court: str
    fields: dict  # structured form fields
    disclaimer: str


class ValidateRequest(BaseModel):
    draft: dict  # form fields to validate


class ValidateResponse(BaseModel):
    completeness_score: float  # 0-1
    missing_fields: list[dict]  # [{field, instruction}]
    warnings: list[str]


class VerifyRequest(BaseModel):
    complaint: dict  # complaint document fields
    target_court: str = "justice"  # "justice" or "administrative"


class VerifyResponse(BaseModel):
    case_type: str
    key_facts: str
    cited_statutes: list[str]
    parties: dict  # {"plaintiff": ..., "defendant": ...}
    completeness_score: float
    missing_elements: list[dict]  # [{element, reference}]
    summary: str


# ---------------------------------------------------------------------------
# Keyword dictionaries for classification
# ---------------------------------------------------------------------------

_CRIMINAL_KEYWORDS: list[str] = [
    "ฉ้อโกง", "ลักทรัพย์", "ทำร้าย", "ฆ่า", "ข่มขืน", "ยาเสพติด",
    "ปล้น", "ชิงทรัพย์", "วิ่งราว", "หมิ่นประมาท", "บุกรุก",
    "ยักยอก", "โจรกรรม", "ข่มขู่", "กรรโชก", "ปลอมแปลง",
]

_ADMINISTRATIVE_KEYWORDS: list[str] = [
    "หน่วยงานรัฐ", "ราชการ", "ใบอนุญาต", "ภาษี", "ปกครอง",
    "คำสั่งทางปกครอง", "เจ้าหน้าที่รัฐ", "ศาลปกครอง",
    "พ.ร.บ.จัดตั้งศาลปกครอง", "มาตรา 9", "มาตรา 56",
]

_CIVIL_KEYWORDS: list[str] = [
    "สัญญา", "หนี้", "เช่า", "ซื้อขาย", "มรดก", "หย่า",
    "ค่าเสียหาย", "ละเมิด", "ผิดสัญญา", "จำนอง", "ค้ำประกัน",
    "ครอบครัว", "ผู้บริโภค", "แรงงาน",
]

# ---------------------------------------------------------------------------
# Statute suggestions per case type
# ---------------------------------------------------------------------------

_CRIMINAL_STATUTES = ["ป.อ.", "ป.วิ.อ."]
_CIVIL_STATUTES = ["ป.พ.พ.", "ป.วิ.พ."]
_ADMIN_STATUTES = ["พ.ร.บ.จัดตั้งศาลปกครอง พ.ศ. 2542", "พ.ร.บ.วิธีพิจารณาคดีปกครอง พ.ศ. 2542"]

# ---------------------------------------------------------------------------
# Court recommendations
# ---------------------------------------------------------------------------

_COURT_MAP: dict[str, str] = {
    "criminal": "ศาลอาญา หรือศาลจังหวัดที่มีเขตอำนาจ",
    "civil": "ศาลแพ่ง หรือศาลจังหวัดที่มีเขตอำนาจ",
    "administrative": "ศาลปกครองกลาง หรือศาลปกครองในภูมิลำเนา",
}

# ---------------------------------------------------------------------------
# Required fields per case type
# ---------------------------------------------------------------------------

_REQUIRED_FIELDS: dict[str, list[str]] = {
    "civil": ["plaintiff", "defendant", "facts", "case_type", "court", "relief"],
    "criminal": ["plaintiff", "defendant", "facts", "case_type", "court", "offense_date"],
    "administrative": [
        "plaintiff", "defendant", "facts", "case_type", "court",
        "section_56_elements", "jurisdiction", "legal_interest", "filing_deadline",
    ],
}

_COMMON_REQUIRED = ["plaintiff", "defendant", "facts", "case_type", "court"]

# ---------------------------------------------------------------------------
# Field-level correction instructions
# ---------------------------------------------------------------------------

_FIELD_INSTRUCTIONS: dict[str, str] = {
    "plaintiff": "กรุณาระบุชื่อ-นามสกุล ที่อยู่ของโจทก์/ผู้ฟ้องคดี",
    "defendant": "กรุณาระบุชื่อ-นามสกุล ที่อยู่ของจำเลย/ผู้ถูกฟ้องคดี",
    "facts": "กรุณาระบุข้อเท็จจริงของคดีอย่างละเอียด",
    "case_type": "กรุณาระบุประเภทคดี (แพ่ง/อาญา/ปกครอง)",
    "court": "กรุณาระบุศาลที่จะยื่นฟ้อง",
    "relief": "กรุณาระบุคำขอท้ายคำฟ้อง (สิ่งที่ต้องการให้ศาลสั่ง)",
    "offense_date": "กรุณาระบุวันที่เกิดเหตุ",
    "section_56_elements": "กรุณาระบุองค์ประกอบตามมาตรา 56 พ.ร.บ.จัดตั้งศาลปกครอง",
    "jurisdiction": "กรุณาระบุเหตุผลที่ศาลปกครองมีอำนาจพิจารณา",
    "legal_interest": "กรุณาระบุส่วนได้เสียทางกฎหมายของผู้ฟ้องคดี",
    "filing_deadline": "กรุณาตรวจสอบว่ายื่นฟ้องภายใน 90 วันนับแต่วันที่รู้หรือควรรู้ถึงเหตุ",
}

_DISCLAIMER = (
    "⚠️ เอกสารนี้เป็นร่างเบื้องต้นที่สร้างโดย AI เพื่อประกอบการตัดสินใจเท่านั้น "
    "กรุณาตรวจสอบความถูกต้องกับทนายความหรือที่ปรึกษากฎหมายก่อนยื่นต่อศาล"
)


# ---------------------------------------------------------------------------
# ComplaintService
# ---------------------------------------------------------------------------


class ComplaintService:
    """Keyword-based classification, template-based drafting, rule-based validation."""

    # -- classify -------------------------------------------------------------

    def classify(self, request: ClassifyRequest) -> ClassifyResponse:
        """Classify case type from natural-language facts."""
        facts_lower = request.facts.strip()

        criminal_score = sum(1 for kw in _CRIMINAL_KEYWORDS if kw in facts_lower)
        admin_score = sum(1 for kw in _ADMINISTRATIVE_KEYWORDS if kw in facts_lower)
        civil_score = sum(1 for kw in _CIVIL_KEYWORDS if kw in facts_lower)

        total = criminal_score + admin_score + civil_score

        if total == 0:
            # Default to civil with low confidence
            return ClassifyResponse(
                case_type="civil",
                recommended_court=_COURT_MAP["civil"],
                confidence=0.3,
                statutes=_CIVIL_STATUTES,
            )

        scores = {
            "criminal": criminal_score,
            "administrative": admin_score,
            "civil": civil_score,
        }
        case_type = max(scores, key=scores.get)  # type: ignore[arg-type]
        confidence = round(scores[case_type] / total, 2)
        confidence = min(confidence, 0.95)  # cap per CBB

        statute_map = {
            "criminal": _CRIMINAL_STATUTES,
            "civil": _CIVIL_STATUTES,
            "administrative": _ADMIN_STATUTES,
        }

        return ClassifyResponse(
            case_type=case_type,
            recommended_court=_COURT_MAP[case_type],
            confidence=confidence,
            statutes=statute_map[case_type],
        )

    # -- draft ----------------------------------------------------------------

    def draft(self, request: DraftRequest) -> DraftResponse:
        """Generate a structured complaint draft based on case_type."""
        case_type = request.case_type if request.case_type in _COURT_MAP else "civil"
        court = _COURT_MAP[case_type]

        fields: dict = {
            "plaintiff": request.plaintiff or "",
            "defendant": request.defendant or "",
            "facts": request.facts,
            "case_type": case_type,
            "court": court,
        }

        if case_type == "criminal":
            draft_text = self._draft_criminal(fields)
        elif case_type == "administrative":
            draft_text = self._draft_administrative(fields)
        else:
            draft_text = self._draft_civil(fields)

        return DraftResponse(
            draft_text=draft_text,
            case_type=case_type,
            recommended_court=court,
            fields=fields,
            disclaimer=_DISCLAIMER,
        )

    # -- validate -------------------------------------------------------------

    def validate(self, request: ValidateRequest) -> ValidateResponse:
        """Check required fields and return completeness score."""
        draft = request.draft
        case_type = draft.get("case_type", "civil")

        required = _REQUIRED_FIELDS.get(case_type, _COMMON_REQUIRED)

        present = 0
        missing: list[dict] = []
        warnings: list[str] = []

        for field in required:
            value = draft.get(field)
            if value and str(value).strip():
                present += 1
            else:
                missing.append({
                    "field": field,
                    "instruction": _FIELD_INSTRUCTIONS.get(
                        field, f"กรุณาระบุข้อมูล {field}"
                    ),
                })

        completeness = round(present / len(required), 2) if required else 0.0

        # Administrative-specific warnings
        if case_type == "administrative":
            if not draft.get("section_56_elements"):
                warnings.append("ยังไม่ได้ระบุองค์ประกอบตามมาตรา 56")
            if not draft.get("jurisdiction"):
                warnings.append("ยังไม่ได้ระบุเหตุผลเรื่องเขตอำนาจศาลปกครอง")
            if not draft.get("legal_interest"):
                warnings.append("ยังไม่ได้ระบุส่วนได้เสียทางกฎหมาย")
            if not draft.get("filing_deadline"):
                warnings.append("ยังไม่ได้ตรวจสอบระยะเวลา 90 วัน")

        return ValidateResponse(
            completeness_score=completeness,
            missing_fields=missing,
            warnings=warnings,
        )

    # -- verify & summarize ---------------------------------------------------

    def verify_and_summarize(self, request: VerifyRequest) -> VerifyResponse:
        """Verify complaint against acceptance checklist and generate summary."""
        complaint = request.complaint
        target_court = request.target_court

        # Extract basic info
        case_type = complaint.get("case_type", "civil")
        facts = complaint.get("facts", "")
        plaintiff = complaint.get("plaintiff", "")
        defendant = complaint.get("defendant", "")
        statutes = complaint.get("statutes", [])
        if isinstance(statutes, str):
            statutes = [s.strip() for s in statutes.split(",") if s.strip()]

        # Determine required fields based on target court
        if target_court == "administrative":
            required = _REQUIRED_FIELDS.get("administrative", _COMMON_REQUIRED)
        else:
            required = _REQUIRED_FIELDS.get(case_type, _COMMON_REQUIRED)

        present = 0
        missing_elements: list[dict] = []
        for field in required:
            value = complaint.get(field)
            if value and str(value).strip():
                present += 1
            else:
                missing_elements.append({
                    "element": field,
                    "reference": _FIELD_INSTRUCTIONS.get(
                        field, f"กรุณาระบุข้อมูล {field}"
                    ),
                })

        completeness = round(present / len(required), 2) if required else 0.0

        # Build summary text
        summary_parts = [
            f"ประเภทคดี: {case_type}",
            f"โจทก์/ผู้ฟ้องคดี: {plaintiff or 'ไม่ระบุ'}",
            f"จำเลย/ผู้ถูกฟ้องคดี: {defendant or 'ไม่ระบุ'}",
            f"ข้อเท็จจริง: {facts[:200] + '...' if len(facts) > 200 else facts}" if facts else "ข้อเท็จจริง: ไม่ระบุ",
            f"กฎหมายที่อ้างอิง: {', '.join(statutes)}" if statutes else "กฎหมายที่อ้างอิง: ไม่ระบุ",
            f"คะแนนความครบถ้วน: {completeness}",
        ]
        if completeness < 0.7 and missing_elements:
            summary_parts.append("รายการที่ขาด:")
            for me in missing_elements:
                summary_parts.append(f"  - {me['element']}: {me['reference']}")

        summary = "\n".join(summary_parts)

        return VerifyResponse(
            case_type=case_type,
            key_facts=facts[:500] if facts else "",
            cited_statutes=statutes,
            parties={"plaintiff": plaintiff, "defendant": defendant},
            completeness_score=completeness,
            missing_elements=missing_elements if completeness < 0.7 else [],
            summary=summary,
        )

    # -- private template helpers ---------------------------------------------

    @staticmethod
    def _draft_civil(fields: dict) -> str:
        return (
            "คำฟ้องคดีแพ่ง\n"
            f"ศาล: {fields.get('court', '')}\n\n"
            f"โจทก์: {fields.get('plaintiff', '[ระบุชื่อโจทก์]')}\n"
            f"จำเลย: {fields.get('defendant', '[ระบุชื่อจำเลย]')}\n\n"
            "ข้อเท็จจริง:\n"
            f"  {fields.get('facts', '[ระบุข้อเท็จจริง]')}\n\n"
            "คำขอท้ายคำฟ้อง:\n"
            "  [ระบุคำขอท้ายคำฟ้อง]\n"
        )

    @staticmethod
    def _draft_criminal(fields: dict) -> str:
        return (
            "คำฟ้องคดีอาญา\n"
            f"ศาล: {fields.get('court', '')}\n\n"
            f"โจทก์: {fields.get('plaintiff', '[ระบุชื่อโจทก์]')}\n"
            f"จำเลย: {fields.get('defendant', '[ระบุชื่อจำเลย]')}\n\n"
            "ข้อเท็จจริงและพฤติการณ์:\n"
            f"  {fields.get('facts', '[ระบุข้อเท็จจริง]')}\n\n"
            "ฐานความผิด:\n"
            "  [ระบุฐานความผิดและมาตราที่เกี่ยวข้อง]\n\n"
            "คำขอท้ายคำฟ้อง:\n"
            "  [ระบุคำขอท้ายคำฟ้อง]\n"
        )

    @staticmethod
    def _draft_administrative(fields: dict) -> str:
        return (
            "คำฟ้องคดีปกครอง\n"
            f"ศาล: {fields.get('court', '')}\n\n"
            f"ผู้ฟ้องคดี: {fields.get('plaintiff', '[ระบุชื่อผู้ฟ้องคดี]')}\n"
            f"ผู้ถูกฟ้องคดี: {fields.get('defendant', '[ระบุชื่อผู้ถูกฟ้องคดี]')}\n\n"
            "ข้อเท็จจริง:\n"
            f"  {fields.get('facts', '[ระบุข้อเท็จจริง]')}\n\n"
            "องค์ประกอบตามมาตรา 56:\n"
            "  [ระบุองค์ประกอบตามมาตรา 56]\n\n"
            "เขตอำนาจศาล:\n"
            "  [ระบุเหตุผลเรื่องเขตอำนาจ]\n\n"
            "คำขอ:\n"
            "  [ระบุคำขอ]\n"
        )
