"""Case Tracking Service — ติดตามสถานะคดี 24 ชม.

ให้ประชาชนติดตามสถานะคดีผ่าน chatbot หรือ API
รองรับทั้งศาลยุติธรรมและศาลปกครอง
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class CaseStatus(BaseModel):
    case_no: str
    court: str = ""
    case_type: str = ""
    status: str = ""  # รับฟ้อง, นัดพิจารณา, พิพากษา, etc.
    current_step: str = ""
    next_hearing_date: Optional[str] = None
    judge: str = ""
    filing_date: Optional[str] = None
    last_updated: str = ""
    timeline: list[dict] = Field(default_factory=list)
    estimated_completion: Optional[str] = None


class CaseTrackingService:
    """Track case status for citizens — placeholder for e-Filing API integration."""

    # Simulated case statuses (will be replaced with e-Filing API)
    _MOCK_CASES: dict[str, CaseStatus] = {
        "ฎ.1234/2568": CaseStatus(
            case_no="ฎ.1234/2568", court="ศาลฎีกา", case_type="อาญา",
            status="อยู่ระหว่างพิจารณา", current_step="นัดสืบพยาน",
            next_hearing_date="15 ก.ค. 2569", filing_date="10 ม.ค. 2568",
            last_updated=datetime.now(timezone.utc).isoformat(),
            timeline=[
                {"date": "10 ม.ค. 2568", "event": "ยื่นฟ้อง", "status": "เสร็จสิ้น"},
                {"date": "25 ม.ค. 2568", "event": "รับฟ้อง", "status": "เสร็จสิ้น"},
                {"date": "15 มี.ค. 2568", "event": "นัดชี้สองสถาน", "status": "เสร็จสิ้น"},
                {"date": "15 ก.ค. 2569", "event": "นัดสืบพยาน", "status": "รอดำเนินการ"},
            ],
        ),
        "ปค.45/2565": CaseStatus(
            case_no="ปค.45/2565", court="ศาลปกครองกลาง", case_type="ปกครอง",
            status="พิพากษาแล้ว", current_step="คดีถึงที่สุด",
            filing_date="5 มี.ค. 2565",
            last_updated=datetime.now(timezone.utc).isoformat(),
            timeline=[
                {"date": "5 มี.ค. 2565", "event": "ยื่นฟ้อง", "status": "เสร็จสิ้น"},
                {"date": "20 มี.ค. 2565", "event": "รับฟ้อง", "status": "เสร็จสิ้น"},
                {"date": "10 ส.ค. 2566", "event": "พิพากษา", "status": "เสร็จสิ้น"},
            ],
        ),
    }

    def track(self, case_no: str) -> Optional[CaseStatus]:
        """Look up case status by case number.

        Currently uses mock data. Will integrate with e-Filing API later.
        """
        # Normalize case number
        normalized = case_no.strip().replace(" ", "")

        # Check mock data
        result = self._MOCK_CASES.get(normalized)
        if result:
            return result

        # Try partial match
        for key, status in self._MOCK_CASES.items():
            if normalized in key or key in normalized:
                return status

        return None

    def get_all_mock_cases(self) -> list[CaseStatus]:
        """Return all mock cases for demo purposes."""
        return list(self._MOCK_CASES.values())
