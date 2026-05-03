"""Complaint Drafting Assistant API endpoints.

e-Filing v.4 (ม.ค. 2569) — รองรับประเภทคดีใหม่:
  civil, criminal, administrative, consumer, juvenile_family, take_it_down
"""
from __future__ import annotations

from fastapi import APIRouter

from app.services.complaint_service import (
    ClassifyRequest,
    ClassifyResponse,
    ComplaintService,
    DraftRequest,
    DraftResponse,
    ValidateRequest,
    ValidateResponse,
    VerifyRequest,
    VerifyResponse,
)
from app.services.efiling_xml import EFilingComplaint, EFilingXMLExporter

router = APIRouter(prefix="/complaint", tags=["complaint"])

_service = ComplaintService()


@router.post("/classify", response_model=ClassifyResponse)
async def classify_case(request: ClassifyRequest):
    """Classify case type from natural language facts."""
    return _service.classify(request)


@router.post("/draft", response_model=DraftResponse)
async def draft_complaint(request: DraftRequest):
    """Generate structured complaint draft."""
    return _service.draft(request)


@router.post("/validate", response_model=ValidateResponse)
async def validate_complaint(request: ValidateRequest):
    """Validate draft against court criteria."""
    return _service.validate(request)


@router.post("/verify", response_model=VerifyResponse)
async def verify_complaint(request: VerifyRequest):
    """Verify complaint against acceptance checklist and generate summary."""
    return _service.verify_and_summarize(request)


@router.post("/export-xml")
async def export_xml(complaint: EFilingComplaint):
    """Export complaint to e-Filing v.4 XML (e-Form structure).

    รองรับทุกประเภทคดี:
      civil → Form 04+05 | criminal → Form 04+06
      administrative → ปค.1 | consumer → CB-01
      juvenile_family → JF-01 | take_it_down → TID-01 (CIOS)

    Returns XML + validation result. JSON fallback ถ้า XML สร้างไม่ได้.
    """
    exporter = EFilingXMLExporter()
    form_map = {
        "civil": "04",
        "criminal": "04",
        "administrative": "pk1",
        "consumer": "CB-01",
        "juvenile_family": "JF-01",
        "take_it_down": "TID-01",
    }
    form_code = form_map.get(complaint.case_type, "04")

    try:
        xml_string = exporter.export(complaint)
        validation = exporter.validate(xml_string)

        if not validation["valid"]:
            return {
                "xml": None,
                "valid": False,
                "form": form_code,
                "efiling_version": "4.0",
                "errors": validation["errors"],
                "warnings": validation.get("warnings", []),
                "json_fallback": complaint.model_dump(),
            }

        return {
            "xml": xml_string,
            "valid": True,
            "form": form_code,
            "efiling_version": "4.0",
            "errors": [],
            "warnings": validation.get("warnings", []),
            "json_fallback": None,
        }

    except Exception as e:
        # XML generation failed entirely — provide JSON fallback
        return {
            "xml": None,
            "valid": False,
            "form": form_code,
            "errors": [f"XML generation failed: {str(e)}"],
            "json_fallback": complaint.model_dump(),
        }
