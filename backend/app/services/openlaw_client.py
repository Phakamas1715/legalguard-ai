"""Open Law Data Thailand API Client.

Fetches Thai court judgments from openlawdatathailand.org and converts
them into the internal document format expected by the ingestion pipeline.

Reference: https://openlawdatathailand.org (Open Government Data)

Bug fixes applied from original design:
  - limit: int = 20  (was `limit: 20` — invalid annotation syntax)
  - self.BASE_URL     (was `self.base_url` — class attr, not instance)
  - court_level as comma-joined string (requests serialises list incorrectly)
  - try/except on all HTTP calls — API may be unavailable
"""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Province list for metadata extraction (77 จังหวัด, abbreviated)
# ---------------------------------------------------------------------------

_PROVINCES: list[str] = [
    "กรุงเทพ", "กรุงเทพมหานคร", "เชียงใหม่", "เชียงราย", "ขอนแก่น",
    "นครราชสีมา", "อุดรธานี", "สงขลา", "ชลบุรี", "ภูเก็ต",
    "นนทบุรี", "สมุทรปราการ", "ปทุมธานี", "อยุธยา", "ระยอง",
    "สุราษฎร์ธานี", "นครศรีธรรมราช", "อุบลราชธานี", "มหาสารคาม",
    "ลำปาง", "พิษณุโลก", "กาญจนบุรี", "นครสวรรค์", "สระบุรี",
    "ลพบุรี", "เพชรบุรี", "ประจวบคีรีขันธ์", "ตรัง", "พัทลุง",
    "ยะลา", "นราธิวาส", "ปัตตานี", "สตูล", "กระบี่", "พังงา",
    "ระนอง", "ชุมพร", "สมุทรสาคร", "สมุทรสงคราม", "ฉะเชิงเทรา",
    "ปราจีนบุรี", "นครนายก", "สระแก้ว", "จันทบุรี", "ตราด",
    "บึงกาฬ", "หนองบัวลำภู", "หนองคาย", "เลย", "สกลนคร",
    "นครพนม", "มุกดาหาร", "กาฬสินธุ์", "ร้อยเอ็ด", "ยโสธร",
    "อำนาจเจริญ", "ศรีสะเกษ", "สุรินทร์", "บุรีรัมย์", "ชัยภูมิ",
    "นครราชสีมา", "เพชรบูรณ์", "ตาก", "สุโขทัย", "อุตรดิตถ์",
    "แพร่", "น่าน", "พะเยา", "แม่ฮ่องสอน", "ลำพูน",
    "กำแพงเพชร", "พิจิตร", "อ่างทอง", "ชัยนาท", "สิงห์บุรี",
    "สุพรรณบุรี", "นครปฐม", "ราชบุรี",
]

_YEAR_RE = re.compile(r"(?:พ\.ศ\.|พศ\.?|B\.E\.?)\s*(\d{4})")
_CASE_RE = re.compile(r"(\d{1,5})/(\d{4})")


class OpenLawDataClient:
    """HTTP client for Open Law Data Thailand public API.

    All methods return empty lists/dicts when the API is unavailable,
    so the system degrades gracefully during development/testing.
    """

    BASE_URL = "https://api.openlawdatathailand.org/v1"

    def __init__(self, timeout: float = 15.0) -> None:
        self._timeout = timeout

    # ------------------------------------------------------------------
    # Judgment search
    # ------------------------------------------------------------------

    def search_judgments(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Search Thai court judgments from Open Law Data Thailand.

        Args:
            query: Thai-language search query
            limit: Maximum number of results (default 20, max 200)

        Returns:
            List of judgment dicts with keys: id, content, metadata, citation
        """
        url = f"{self.BASE_URL}/judgments/search"
        params: Dict[str, Any] = {
            "q": query,
            "court_level": "supreme,appeal,first",  # comma-joined string, not list
            "limit": min(limit, 200),
            "fields": "content,metadata,citation",
        }
        try:
            resp = httpx.get(url, params=params, timeout=self._timeout,
                             headers={"User-Agent": "LegalGuardAI-v2.0/1.0"})
            resp.raise_for_status()
            data = resp.json()
            return data.get("data", [])
        except httpx.HTTPStatusError as exc:
            logger.warning("OpenLawData search HTTP %s: %s", exc.response.status_code, query)
            return []
        except Exception as exc:
            logger.warning("OpenLawData search unavailable (%s) — returning empty", exc)
            return []

    def get_judgment(self, judgment_id: str) -> Dict[str, Any]:
        """Fetch a single judgment by ID."""
        url = f"{self.BASE_URL}/judgments/{judgment_id}"
        try:
            resp = httpx.get(url, timeout=self._timeout,
                             headers={"User-Agent": "LegalGuardAI-v2.0/1.0"})
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:
            logger.warning("OpenLawData get_judgment %s failed: %s", judgment_id, exc)
            return {}

    # ------------------------------------------------------------------
    # Metadata extraction helpers
    # ------------------------------------------------------------------

    @staticmethod
    def extract_province(text: str) -> str:
        """Extract the first province name found in text."""
        for province in _PROVINCES:
            if province in text:
                return province
        return "ไม่ระบุ"

    @staticmethod
    def extract_year(doc: Dict[str, Any]) -> int:
        """Extract Buddhist Era year from metadata or content."""
        meta = doc.get("metadata", {})
        if meta.get("year"):
            try:
                return int(meta["year"])
            except (ValueError, TypeError):
                pass

        content = doc.get("content", "")
        match = _YEAR_RE.search(content)
        if match:
            try:
                return int(match.group(1))
            except ValueError:
                pass

        # Fallback: extract from case number pattern XXXX/YYYY
        case_match = _CASE_RE.search(content)
        if case_match:
            try:
                return int(case_match.group(2))
            except ValueError:
                pass

        return 0

    @staticmethod
    def extract_court_level(doc: Dict[str, Any]) -> str:
        """Normalise court level to supreme | appeal | first."""
        meta = doc.get("metadata", {})
        raw = meta.get("court_level", "").lower()
        if "supreme" in raw or "ฎีกา" in raw:
            return "supreme"
        if "appeal" in raw or "อุทธรณ์" in raw:
            return "appeal"
        if "first" in raw or "ชั้นต้น" in raw:
            return "first"
        return "unknown"

    def normalize_document(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Convert an OpenLawData judgment dict to internal document format."""
        content = doc.get("content", "")
        meta = doc.get("metadata", {})

        return {
            "content": content,
            "title": meta.get("title", ""),
            "case_no": meta.get("case_no", ""),
            "court_type": self.extract_court_level(doc),
            "year": self.extract_year(doc),
            "province": self.extract_province(content),
            "statutes": meta.get("statutes", []),
            "citation": doc.get("citation", ""),
            "source": "openlaw_thailand",
            "judgment_id": doc.get("id", ""),
        }
