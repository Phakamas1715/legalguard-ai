"""Complaint Drafting Assistant API endpoints."""
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
    """Export complaint to e-Filing XML format (Form 04/05/06/ปค.1).

    Returns XML string with validation. If XML generation fails,
    returns a JSON fallback so the user can still review their data.
    """
    exporter = EFilingXMLExporter()
    form_code = "pk1" if complaint.case_type == "administrative" else (
        "06" if complaint.case_type == "criminal" else "04"
    )

    try:
        xml_string = exporter.export(complaint)
        validation = exporter.validate(xml_string)

        if not validation["valid"]:
            # Return validation errors + JSON fallback
            return {
                "xml": None,
                "valid": False,
                "form": form_code,
                "errors": validation["errors"],
                "json_fallback": complaint.model_dump(),
            }

        return {
            "xml": xml_string,
            "valid": True,
            "form": form_code,
            "errors": [],
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
