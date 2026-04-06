"""Open Law Data Thailand — HuggingFace Dataset Client.

Fetches Thai legal documents from two public HuggingFace datasets:
  - open-law-data-thailand/ocs-krisdika   (กฤษฎีกา — กฎหมายฉบับเต็ม)
  - open-law-data-thailand/soc-ratchakitcha (ราชกิจจานุเบกษา — ประกาศราชการ)

The original openlawdatathailand.org REST API (api.*) does not resolve —
all data is served exclusively through HuggingFace datasets.

Data layout:
  ocs-krisdika:     data/{year}/{year}-{month}.jsonl
  soc-ratchakitcha: meta/{year}/{year}-{month}.jsonl

Authentication: set HUGGINGFACE_TOKEN in backend/.env
"""
from __future__ import annotations

from __future__ import annotations

import logging
import os
import re
from datetime import datetime
from typing import Optional, Any

import httpx

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

HF_BASE = "https://huggingface.co/datasets"
HF_API  = "https://huggingface.co/api/datasets"

DATASET_KRISDIKA    = "open-law-data-thailand/ocs-krisdika"
DATASET_RATCHAKITCHA = "open-law-data-thailand/soc-ratchakitcha"

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
    "เพชรบูรณ์", "ตาก", "สุโขทัย", "อุตรดิตถ์", "แพร่", "น่าน",
    "พะเยา", "แม่ฮ่องสอน", "ลำพูน", "กำแพงเพชร", "พิจิตร",
    "อ่างทอง", "ชัยนาท", "สิงห์บุรี", "สุพรรณบุรี", "นครปฐม", "ราชบุรี",
]

_STATUTE_RE = re.compile(r"มาตรา\s*\d+(?:\s*(?:และ|,|และ)\s*มาตรา\s*\d+)*")
_YEAR_BE_RE = re.compile(r"พ\.ศ\.\s*(\d{4})")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _hf_token() -> Optional[str]:
    return os.environ.get("HUGGINGFACE_TOKEN") or None


def _hf_headers() -> dict[str, str]:
    token = _hf_token()
    headers = {"User-Agent": "LegalGuardAI/2.0"}
    if token and not token.startswith("hf_your"):
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _current_year_month() -> list[tuple[int, int]]:
    """Return last 6 months as (year, month) tuples, newest first."""
    now = datetime.now()
    result = []
    y, m = now.year, now.month
    for _ in range(6):
        result.append((y, m))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    return result


def _discover_latest_months(dataset: str, prefix: str, n: int = 6) -> list[tuple[int, int]]:
    """Discover the most recent available (year, month) from a HuggingFace dataset.

    Uses the HF tree API to list files under `prefix/` and picks the last n.
    Falls back to _current_year_month() if the API call fails.
    """
    import json as _json
    try:
        url = f"{HF_API}/{dataset}/tree/main/{prefix}"
        resp = httpx.get(url, headers=_hf_headers(), timeout=15.0)
        resp.raise_for_status()
        years = sorted(
            [item["path"].split("/")[-1] for item in resp.json() if item.get("type") == "directory"],
            reverse=True,
        )
        results: list[tuple[int, int]] = []
        for year_str in years:
            if len(results) >= n:
                break
            try:
                year = int(year_str)
            except ValueError:
                continue
            month_url = f"{HF_API}/{dataset}/tree/main/{prefix}/{year_str}"
            try:
                mresp = httpx.get(month_url, headers=_hf_headers(), timeout=15.0)
                mresp.raise_for_status()
                months = sorted(
                    [
                        int(item["path"].split("/")[-1].replace(".jsonl", "").split("-")[-1])
                        for item in mresp.json()
                        if item.get("path", "").endswith(".jsonl")
                    ],
                    reverse=True,
                )
                for m in months:
                    results.append((year, m))
                    if len(results) >= n:
                        break
            except Exception:
                pass
        return results if results else _current_year_month()
    except Exception as exc:
        logger.debug("HF tree API failed (%s) — falling back to current months", exc)
        return _current_year_month()


def _extract_statutes(text: str) -> list[str]:
    return _STATUTE_RE.findall(text)


def _extract_year_from_text(text: str) -> int:
    m = _YEAR_BE_RE.search(text)
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            pass
    return 0


def _extract_province(text: str) -> str:
    for p in _PROVINCES:
        if p in text:
            return p
    return "ไม่ระบุ"


# ---------------------------------------------------------------------------
# Main client
# ---------------------------------------------------------------------------

class OpenLawDataClient:
    """Fetch Thai legal documents from HuggingFace Open Law Data datasets.

    search_judgments() is the primary entry point used by OpenLawIngestionService.
    It fetches recent JSONL files from ocs-krisdika and soc-ratchakitcha,
    filters by keyword, then returns normalised document dicts.
    """

    def __init__(self, timeout: float = 30.0) -> None:
        self._timeout = timeout

    # ------------------------------------------------------------------
    # Public API (same contract as the old REST client)
    # ------------------------------------------------------------------

    def search_judgments(self, query: str, limit: int = 20) -> list[dict[str, Any]]:
        """Search Thai legal documents from HuggingFace datasets.

        Fetches recent months from ocs-krisdika (กฤษฎีกา) and
        soc-ratchakitcha (ราชกิจจา), filters by query keyword,
        and returns up to `limit` results.
        """
        results: list[dict[str, Any]] = []

        # ocs-krisdika first (has full text via sections[])
        try:
            krisdika = self._search_krisdika(query, limit)
            results.extend(krisdika)
            logger.info("Krisdika: %d results for query=%r", len(krisdika), query)
        except Exception as exc:
            logger.warning("Krisdika fetch failed: %s", exc)

        # soc-ratchakitcha to fill remaining quota
        remaining = limit - len(results)
        if remaining > 0:
            try:
                ratchakitcha = self._search_ratchakitcha(query, remaining)
                results.extend(ratchakitcha)
                logger.info("Ratchakitcha: %d results for query=%r", len(ratchakitcha), query)
            except Exception as exc:
                logger.warning("Ratchakitcha fetch failed: %s", exc)

        return results[:limit]

    def get_judgment(self, judgment_id: str) -> dict[str, Any]:
        """Not supported via HuggingFace datasets — returns empty dict."""
        logger.debug("get_judgment(%s) not supported via HF datasets", judgment_id)
        return {}

    def normalize_document(self, doc: dict[str, Any]) -> dict[str, Any]:
        """Convert a raw HuggingFace dataset record to internal document format."""
        content = doc.get("content", "")
        return {
            "content": content,
            "title": doc.get("title", ""),
            "case_no": doc.get("case_no", ""),
            "court_type": doc.get("court_type", "unknown"),
            "year": doc.get("year", _extract_year_from_text(content)),
            "province": _extract_province(content),
            "statutes": doc.get("statutes") or _extract_statutes(content),
            "citation": doc.get("citation", ""),
            "source": doc.get("source", "openlaw_thailand"),
            "judgment_id": doc.get("id", ""),
        }

    # ------------------------------------------------------------------
    # Backwards-compatible static helpers (used by ingestion service)
    # ------------------------------------------------------------------

    @staticmethod
    def extract_province(text: str) -> str:
        return _extract_province(text)

    @staticmethod
    def extract_year(doc: dict[str, Any]) -> int:
        y = doc.get("year") or doc.get("metadata", {}).get("year")
        if y:
            try:
                return int(y)
            except (ValueError, TypeError):
                pass
        return _extract_year_from_text(doc.get("content", ""))

    @staticmethod
    def extract_court_level(doc: dict[str, Any]) -> str:
        raw = (doc.get("court_type") or doc.get("metadata", {}).get("court_level", "")).lower()
        if "supreme" in raw or "ฎีกา" in raw:
            return "supreme"
        if "appeal" in raw or "อุทธรณ์" in raw:
            return "appeal"
        if "first" in raw or "ชั้นต้น" in raw:
            return "first"
        return "unknown"

    # ------------------------------------------------------------------
    # Dataset fetchers
    # ------------------------------------------------------------------

    def _fetch_jsonl(self, url: str) -> list[dict[str, Any]]:
        """Download a JSONL file and parse each line."""
        import json
        records: list[dict[str, Any]] = []
        try:
            resp = httpx.get(url, headers=_hf_headers(), timeout=self._timeout, follow_redirects=True)
            resp.raise_for_status()
            for line in resp.text.splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
        except httpx.HTTPStatusError as exc:
            logger.warning("HTTP %s fetching %s", exc.response.status_code, url)
        except Exception as exc:
            logger.warning("Failed to fetch %s: %s", url, exc)
        return records

    def _search_krisdika(self, query: str, limit: int) -> list[dict[str, Any]]:
        """Search ocs-krisdika dataset (กฤษฎีกา).

        Each record has: title, sections[], publish_date, year, month, reference_url
        sections[] contains the full law text split by article.
        """
        results: list[dict[str, Any]] = []
        query_lower = query.lower()

        for year, month in _discover_latest_months(DATASET_KRISDIKA, "data", n=6):
            if len(results) >= limit:
                break
            url = f"{HF_BASE}/{DATASET_KRISDIKA}/resolve/main/data/{year}/{year}-{month:02d}.jsonl"
            records = self._fetch_jsonl(url)

            for rec in records:
                if len(results) >= limit:
                    break

                title = rec.get("title", "")
                sections = rec.get("sections", []) or []

                # Build full text from sections
                section_texts = []
                for s in sections:
                    if isinstance(s, dict):
                        section_texts.append(s.get("content", ""))
                full_text = "\n".join(filter(None, section_texts))

                # Keyword filter — match query in title or content
                searchable = (title + " " + full_text).lower()
                if query_lower and not any(kw in searchable for kw in query_lower.split()):
                    continue

                # Derive year (BE) — dataset year field is CE
                raw_year = rec.get("year")
                be_year = 0
                if raw_year:
                    try:
                        ce = int(raw_year)
                        be_year = ce + 543 if ce < 2400 else ce
                    except (ValueError, TypeError):
                        pass
                if not be_year:
                    be_year = _extract_year_from_text(title + full_text)

                results.append({
                    "id": rec.get("law_code", rec.get("raw_enc_id", f"krisdika-{year}-{month}")),
                    "content": full_text or title,
                    "title": title,
                    "case_no": rec.get("law_code", ""),
                    "court_type": "krisdika",
                    "year": be_year,
                    "province": _extract_province(full_text),
                    "statutes": _extract_statutes(full_text),
                    "citation": rec.get("reference_url", ""),
                    "source": "openlaw_krisdika",
                    "publish_date": rec.get("publish_date", ""),
                })

        return results

    def _search_ratchakitcha(self, query: str, limit: int) -> list[dict[str, Any]]:
        """Search soc-ratchakitcha dataset (ราชกิจจานุเบกษา).

        Each record has: doctitle, bookNo, section, category, publishDate, pdf_file
        No full text — only metadata + PDF link.
        """
        results: list[dict[str, Any]] = []
        query_lower = query.lower()

        for year, month in _discover_latest_months(DATASET_RATCHAKITCHA, "meta", n=6):
            if len(results) >= limit:
                break

            # soc-ratchakitcha year field is CE
            url = f"{HF_BASE}/{DATASET_RATCHAKITCHA}/resolve/main/meta/{year}/{year}-{month:02d}.jsonl"
            records = self._fetch_jsonl(url)

            for rec in records:
                if len(results) >= limit:
                    break

                title = rec.get("doctitle", "")

                # Keyword filter
                if query_lower and not any(kw in title.lower() for kw in query_lower.split()):
                    continue

                publish_date = rec.get("publishDate", "")
                be_year = 0
                if publish_date:
                    try:
                        ce_year = int(publish_date[:4])
                        be_year = ce_year + 543
                    except (ValueError, IndexError):
                        pass

                doc_id = rec.get("id", f"ratchakitcha-{year}-{month}-{rec.get('no', '')}")
                pdf_url = ""
                if rec.get("pdf_file"):
                    pdf_url = (
                        f"{HF_BASE}/{DATASET_RATCHAKITCHA}/resolve/main/pdf"
                        f"/{year}/{year}-{month:02d}/{rec['pdf_file']}"
                    )

                results.append({
                    "id": doc_id,
                    "content": title,  # no full text available without PDF parse
                    "title": title,
                    "case_no": f"ราชกิจจา เล่ม {rec.get('bookNo', '')} ตอน {rec.get('section', '')}",
                    "court_type": "ratchakitcha",
                    "year": be_year,
                    "province": _extract_province(title),
                    "statutes": _extract_statutes(title),
                    "citation": pdf_url,
                    "source": "openlaw_ratchakitcha",
                    "publish_date": publish_date,
                    "category": rec.get("category", ""),
                })

        return results
