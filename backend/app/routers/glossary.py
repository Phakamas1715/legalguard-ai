"""Legal Glossary API — ศัพท์กฎหมายไทย + ฎีกาสำคัญ สำหรับทนายความ."""
from __future__ import annotations

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Query

from app.services.legal_glossary import (
    expand_query,
    get_all_statutes,
    get_landmark_cases,
    lookup,
    search_terms,
)

router = APIRouter(prefix="/glossary", tags=["legal-glossary"])


@router.get("/lookup")
async def lookup_term(term: str = Query(..., description="ศัพท์กฎหมาย เช่น ฉ้อโกง, ยักยอก, หย่า")):
    """Look up a legal term — returns definition, statute, penalty, synonyms."""
    result = lookup(term)
    if result:
        return result
    return {"found": False, "term": term, "message": "ไม่พบศัพท์นี้ในพจนานุกรม"}


@router.get("/search")
async def search_glossary(
    q: str = Query(..., description="คำค้นหา"),
    limit: int = Query(5, ge=1, le=20),
):
    """Search legal terms by partial match."""
    return {"results": search_terms(q, limit=limit), "query": q}


@router.get("/expand")
async def expand(query: str = Query(..., description="คำค้นหาที่ต้องการ expand")):
    """Expand query with legal synonyms and statute references."""
    expanded = expand_query(query)
    return {"original": query, "expanded": expanded, "added": expanded != query}


@router.get("/statutes")
async def list_statutes():
    """List all statute references in the glossary."""
    return {"statutes": get_all_statutes()}


@router.get("/landmark-cases")
async def landmark_cases(topic: Optional[str] = Query(None, description="กรองตามหัวข้อ เช่น ฉ้อโกง")):
    """List landmark cases (ฎีกาสำคัญ) — optionally filtered by topic."""
    cases = get_landmark_cases(topic)
    return {"cases": cases, "total": len(cases)}


@router.get("/data-sources")
async def list_data_sources():
    """List all Thai legal data sources (OCS, ศาลฎีกา, ศาลปกครอง, etc.)."""
    from app.services.legal_glossary import get_data_sources
    return {"sources": get_data_sources()}


@router.get("/ocs-search")
async def ocs_search_url(q: str = Query(..., description="คำค้นหากฎหมาย")):
    """Generate OCS (สำนักงานคณะกรรมการกฤษฎีกา) search URL."""
    from app.services.legal_glossary import get_ocs_search_url
    return {"url": get_ocs_search_url(q), "query": q, "source": "สำนักงานคณะกรรมการกฤษฎีกา"}
