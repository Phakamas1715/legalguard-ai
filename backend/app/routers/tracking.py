"""Case Tracking API — ติดตามสถานะคดี."""

from fastapi import APIRouter, HTTPException

from app.services.case_tracking import CaseStatus, CaseTrackingService

router = APIRouter(prefix="/tracking", tags=["case-tracking"])

_service = CaseTrackingService()


@router.get("/case/{case_no}", response_model=CaseStatus)
async def track_case(case_no: str):
    """Track case status by case number."""
    result = _service.track(case_no)
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"ไม่พบข้อมูลคดีหมายเลข {case_no} — กรุณาตรวจสอบเลขคดีอีกครั้ง",
        )
    return result


@router.get("/cases", response_model=list[CaseStatus])
async def list_cases():
    """List all available cases (demo)."""
    return _service.get_all_mock_cases()
