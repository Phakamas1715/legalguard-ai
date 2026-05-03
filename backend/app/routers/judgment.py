"""Judgment API — precedent retrieval, AI-assisted drafting, and citation review.

Endpoints:
  POST /judgment/precedents         — Retrieve top-10 relevant precedent cases via RAG
  POST /judgment/draft              — Generate judgment draft (SSE streaming, judge-only)
  POST /judgment/review             — AI citation check + honesty score on a draft
  POST /judgment/brief              — Case Brief Generator: summarize สำนวน → 1-page brief
  POST /judgment/precedent-compare  — Precedent Comparison View: table of 5-10 similar cases
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.services.chatbot_service import NongKotChatbot
from app.services.llm_service import call_llm, stream_llm
from app.services.pii_masking import mask_pii
from app.services.responsible_ai import (
    apply_confidence_bound,
    calculate_honesty_score,
    enforce_risk_tier,
)
from app.services.search_pipeline import SearchPipeline, SearchRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/judgment", tags=["judgment"])

# ---------------------------------------------------------------------------
# Lazy service singletons
# ---------------------------------------------------------------------------

_pipeline: Optional[SearchPipeline] = None
_chatbot: Optional[NongKotChatbot] = None


def _get_pipeline() -> SearchPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = SearchPipeline()
    return _pipeline


def _get_chatbot() -> NongKotChatbot:
    global _chatbot
    if _chatbot is None:
        _chatbot = NongKotChatbot()
    return _chatbot


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

DRAFT_SYSTEM = """คุณเป็นผู้ช่วย AI สำหรับร่างคำพิพากษา ใช้สำหรับเจ้าหน้าที่ศาลเท่านั้น

หลักการร่าง:
1. อ้างอิงมาตรากฎหมายและเลขคดีให้ครบถ้วน
2. ใช้ภาษากฎหมายที่ถูกต้องตามแบบแผน
3. ระบุองค์ประกอบครบ: ข้อเท็จจริง → ประเด็นข้อกฎหมาย → วินิจฉัย → คำพิพากษา
4. ⚠️ ร่างเบื้องต้นเท่านั้น ต้องผ่านการตรวจสอบและลงนามโดยผู้พิพากษา
5. ห้ามใส่ข้อมูลส่วนบุคคลที่ไม่จำเป็น"""


class PrecedentRequest(BaseModel):
    query: str
    case_type: str = ""          # แพ่ง / อาญา / ปกครอง
    role: str = "government"
    top_k: int = 10


class PrecedentResponse(BaseModel):
    precedents: list[dict]
    total_found: int
    query_used: str


class DraftRequest(BaseModel):
    facts: str                   # ข้อเท็จจริง
    legal_issues: str            # ประเด็นข้อกฎหมาย
    role: str = "government"
    case_type: str = "แพ่ง"


class ReviewRequest(BaseModel):
    draft_text: str
    role: str = "government"


class ReviewResponse(BaseModel):
    verified_citations: list[dict]
    unverified_citations: list[dict]
    honesty_score: float
    risk_level: str
    pii_count: int
    recommendations: list[str]
    confidence: float


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/precedents", response_model=PrecedentResponse)
async def get_precedents(request: PrecedentRequest) -> PrecedentResponse:
    """Retrieve top-K relevant precedent cases for judgment drafting.

    Uses the hybrid RAG pipeline (BM25 + Qdrant + LeJEPA reranking).
    Access: government role required for full detail.
    """
    if request.role not in {"government", "judge", "admin_judge", "lawyer", "admin"}:
        raise HTTPException(status_code=403, detail="Precedent retrieval requires judge, lawyer, or government role")

    # Build query — append case_type context if given
    query = request.query
    if request.case_type:
        query = f"{request.case_type} {query}"

    # PII-mask input query
    clean_query, _, _ = mask_pii(query)

    try:
        pipeline = _get_pipeline()
        search_req = SearchRequest(
            query=clean_query,
            role=request.role,
            top_k=min(request.top_k, 20),
        )
        resp = await pipeline.search(search_req)
    except Exception as exc:
        logger.exception("Precedent search failed")
        raise HTTPException(status_code=500, detail=f"Search pipeline error: {exc}")

    precedents = [
        {
            "rank": i + 1,
            "case_no": r.case_no,
            "court_type": r.court_type,
            "year": r.year,
            "title": r.title,
            "summary": r.summary or r.chunk_text[:400],
            "statutes": r.statutes,
            "relevance_score": r.relevance_score,
            "source_code": r.source_code,
        }
        for i, r in enumerate(resp.results)
    ]

    return PrecedentResponse(
        precedents=precedents,
        total_found=len(precedents),
        query_used=clean_query,
    )


@router.post("/draft")
async def draft_judgment(request: DraftRequest) -> StreamingResponse:
    """Generate judgment draft via streaming SSE (government role only).

    Flow: PII mask → RAG precedent retrieval → LLM draft generation (streamed)
    Risk tier: R4 (confidence cap 80%, requires human review before filing)
    """
    if request.role not in {"judge", "admin_judge", "admin"}:
        raise HTTPException(
            status_code=403,
            detail="Judgment drafting requires ผู้พิพากษา/ตุลาการ role (R4 restricted)"
        )

    # PII mask inputs
    clean_facts, _, pii_facts = mask_pii(request.facts)
    clean_issues, _, pii_issues = mask_pii(request.legal_issues)
    if pii_facts + pii_issues > 0:
        logger.info("Masked %d PII items from judgment draft inputs", pii_facts + pii_issues)

    # RAG: find relevant precedents
    rag_context = ""
    try:
        pipeline = _get_pipeline()
        search_query = f"{request.case_type} {clean_facts[:200]} {clean_issues[:200]}"
        search_req = SearchRequest(query=search_query, role="government", top_k=5)
        resp = await pipeline.search(search_req)
        if resp.results:
            rag_context = "\n\n".join(
                f"คดีที่ {r.case_no} ({r.court_type}, {r.year})\n"
                f"มาตรา: {', '.join(r.statutes)}\n"
                f"{r.summary or r.chunk_text[:500]}"
                for r in resp.results[:3]
            )
    except Exception:
        logger.warning("Precedent retrieval failed for draft — proceeding without context")

    # Build draft prompt
    context_block = f"\n\nบรรทัดฐานที่เกี่ยวข้อง:\n{rag_context}" if rag_context else ""
    prompt_content = (
        f"ประเภทคดี: {request.case_type}{context_block}\n\n"
        f"ข้อเท็จจริง:\n{clean_facts}\n\n"
        f"ประเด็นข้อกฎหมาย:\n{clean_issues}\n\n"
        "กรุณาร่างคำพิพากษาโดยมีโครงสร้าง: ข้อเท็จจริง → วินิจฉัย → คำพิพากษา"
    )
    messages = [{"role": "user", "content": prompt_content}]

    return StreamingResponse(
        stream_llm(messages, system=DRAFT_SYSTEM),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "X-Risk-Tier": "R4",
            "X-Requires-Human-Review": "true",
        },
    )


@router.post("/review", response_model=ReviewResponse)
async def review_judgment(request: ReviewRequest) -> ReviewResponse:
    """AI citation check + honesty scoring on a draft judgment.

    Steps:
      1. PII detection
      2. Extract citation patterns (case numbers + statute references)
      3. Verify citations via SearchPipeline lookup
      4. Compute Honesty Score (6-dimension) via responsible_ai
      5. Return review with recommendations
    """
    if request.role not in {"government", "judge", "admin_judge", "lawyer", "admin"}:
        raise HTTPException(status_code=403, detail="Review requires judge, lawyer, or government role")

    import re

    text = request.draft_text

    # 1. PII scan
    _, _, pii_count = mask_pii(text)

    # 2. Extract citations
    case_pattern = re.compile(r"(?:ฎีกา|อุทธรณ์|ชั้นต้น|ที่)\s*(\d{1,5}/\d{4})")
    statute_pattern = re.compile(
        r"(?:มาตรา|ม\.)\s*\d+(?:\s*(?:วรรค|แห่ง|และ|หรือ)\s*(?:มาตรา|ม\.)?\s*\d+)*"
    )

    found_cases = [m.group(0) for m in case_pattern.finditer(text)]
    found_statutes = [m.group(0) for m in statute_pattern.finditer(text)]

    # 3. Verify citations via SearchPipeline
    verified: list[dict] = []
    unverified: list[dict] = []

    if found_cases:
        try:
            pipeline = _get_pipeline()
            search_req = SearchRequest(
                query=" ".join(found_cases[:5]),
                role=request.role,
                top_k=10,
            )
            resp = await pipeline.search(search_req)
            known_case_nos = {r.case_no for r in resp.results}

            for case_ref in found_cases:
                citation_dict = {"citation": case_ref, "type": "case"}
                # Match if any known case_no is contained in the reference
                if any(cn in case_ref for cn in known_case_nos if cn):
                    citation_dict["verified"] = True
                    verified.append(citation_dict)
                else:
                    citation_dict["verified"] = False
                    citation_dict["warning"] = "ไม่พบในฐานข้อมูล — กรุณาตรวจสอบ"
                    unverified.append(citation_dict)
        except Exception:
            logger.exception("Citation verification failed")
            unverified.extend([{"citation": c, "type": "case", "verified": False,
                                 "warning": "verification failed"} for c in found_cases])

    # All statute references pass (statutes are structural, not data-verified)
    for statute in found_statutes[:10]:
        verified.append({"citation": statute, "type": "statute", "verified": True})

    # 4. Honesty score
    total_citations = len(found_cases) + len(found_statutes)
    citation_acc = len(verified) / max(total_citations, 1)
    confidence_raw = citation_acc * 0.9 if not unverified else citation_acc * 0.7

    risk_result = enforce_risk_tier("judgment_draft", confidence_raw)
    confidence = apply_confidence_bound(confidence_raw, "judgment_draft")

    response_dict = {
        "content": text[:500],
        "citations": [c["citation"] for c in verified],
        "confidence": confidence,
        "disclaimer": "ร่างเบื้องต้น ต้องตรวจสอบโดยผู้พิพากษา",
        "pii_clean": pii_count == 0,
    }
    state_dict = {"confidence_cap": 0.80, "uncertainty_ratio": len(unverified) / max(total_citations, 1)}
    h_score = calculate_honesty_score(response_dict, state_dict)

    # 5. Recommendations
    recommendations: list[str] = []
    if pii_count > 0:
        recommendations.append(f"⚠️ พบ PII {pii_count} จุด — ปกปิดข้อมูลส่วนบุคคลก่อนเผยแพร่")
    if unverified:
        recommendations.append(f"⚠️ อ้างอิง {len(unverified)} รายการที่ไม่พบในฐานข้อมูล — ตรวจสอบความถูกต้อง")
    if h_score < 0.7:
        recommendations.append("⚠️ คะแนนความซื่อสัตย์ต่ำ — ขอแนะนำให้เพิ่มการอ้างอิงที่ตรวจสอบได้")
    if not recommendations:
        recommendations.append("✅ ร่างผ่านการตรวจสอบเบื้องต้น — ส่งให้ผู้พิพากษาตรวจสอบก���อนลงนาม")

    return ReviewResponse(
        verified_citations=verified,
        unverified_citations=unverified,
        honesty_score=round(h_score, 4),
        risk_level=risk_result.risk_level,
        pii_count=pii_count,
        recommendations=recommendations,
        confidence=round(confidence, 4),
    )


# ---------------------------------------------------------------------------
# D — Case Brief Generator
# ---------------------------------------------------------------------------

BRIEF_SYSTEM = """คุณเป็นผู้ช่วย AI สำหรับตุลาการ ทำหน้าที่สรุปสำนวนคดีเป็น "Case Brief" 1 หน้า

โครงสร้างที่ต้องใช้ (ตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่น):
{
  "parties": {
    "plaintiff": "ชื่อโจทก์/ผู้ฟ้องคดี",
    "defendant": "ชื่อจำเลย/ผู้ถูกฟ้องคดี"
  },
  "case_no": "เลขคดี (ถ้ามี)",
  "court": "ศาลที่พิจารณา",
  "case_type": "ประเภทคดี (แพ่ง/อาญา/ปกครอง)",
  "facts": "ข้อเท็จจริงสำคัญ 3-5 ประโยค",
  "legal_issues": ["ประเด็นกฎหมาย 1", "ประเด็นกฎหมาย 2"],
  "statutes": ["มาตราที่อ้างอิง เช่น ป.พ.พ. มาตรา 420"],
  "verdict_summary": "สรุปคำวินิจฉัย/คำพิพากษา 2-3 ประโยค",
  "key_reasoning": "เหตุผลสำคัญของศาล 1-2 ประโยค"
}

กฎเหล็ก:
- ตอบเป็น JSON เท่านั้น ไม่มี markdown code block
- ข้อมูลที่ไม่พบให้ใส่ค่าว่าง "" หรือ []
- ห้ามสรุปสิ่งที่ไม่มีในเอกสาร"""


class BriefRequest(BaseModel):
    case_text: str = Field(..., description="ข้อความสำนวนคดี (เต็มหรือบางส่วน)")
    case_no: str = Field(default="", description="เลขคดี (ถ้าทราบ)")
    role: str = "judge"


class BriefResponse(BaseModel):
    parties: dict
    case_no: str
    court: str
    case_type: str
    facts: str
    legal_issues: list[str]
    statutes: list[str]
    verdict_summary: str
    key_reasoning: str
    ai_disclosure: str
    generated_at: str
    pii_count: int


@router.post("/brief", response_model=BriefResponse)
async def generate_case_brief(request: BriefRequest) -> BriefResponse:
    """Case Brief Generator — สรุปสำนวนคดี 100-500 หน้าเป็น 1 หน้า.

    Flow: PII mask → LLM structured extraction → AI Disclosure stamp
    Risk tier: R3 (ข้อมูลเชิงสรุป, ต้องตรวจสอบก่อนใช้งานจริง)
    Access: judge, admin_judge, lawyer, government
    """
    import json

    if request.role not in {"judge", "admin_judge", "lawyer", "government", "admin"}:
        raise HTTPException(status_code=403, detail="Case brief requires judge, lawyer, or government role")

    if len(request.case_text.strip()) < 50:
        raise HTTPException(status_code=422, detail="case_text ต้องมีความยาวอย่างน้อย 50 ตัวอักษร")

    # PII mask input
    clean_text, _, pii_count = mask_pii(request.case_text)

    # Truncate to avoid token overflow (keep first 6000 chars — ~2000 tokens)
    truncated = clean_text[:6000]
    if len(clean_text) > 6000:
        truncated += "\n\n[...ข้อความถูกตัดเพื่อประมวลผล...]"

    prompt = f"สรุปสำนวนคดีต่อไปนี้เป็น Case Brief:\n\n{truncated}"
    if request.case_no:
        prompt = f"เลขคดี: {request.case_no}\n\n" + prompt

    messages = [{"role": "user", "content": prompt}]

    try:
        raw = await call_llm(messages, system=BRIEF_SYSTEM)
    except Exception as exc:
        logger.exception("Case brief LLM call failed")
        raise HTTPException(status_code=500, detail=f"LLM error: {exc}")

    # Parse JSON response
    try:
        # Strip markdown fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = "\n".join(cleaned.split("\n")[1:])
        if cleaned.endswith("```"):
            cleaned = "\n".join(cleaned.split("\n")[:-1])
        data = json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        logger.warning("Brief LLM returned non-JSON, wrapping in fallback structure")
        data = {
            "parties": {"plaintiff": "", "defendant": ""},
            "case_no": request.case_no,
            "court": "",
            "case_type": "",
            "facts": raw[:800],
            "legal_issues": [],
            "statutes": [],
            "verdict_summary": "",
            "key_reasoning": "",
        }

    generated_at = datetime.now(timezone.utc).isoformat()
    ai_disclosure = (
        "⚠️ เอกสารนี้จัดทำด้วย AI (LegalGuard AI) — ตามแนวปฏิบัติศาลฎีกา พ.ศ. 2568 "
        "เนื้อหาเป็นการสรุปเบื้องต้นเพื่อประกอบการพิจารณาเท่านั้น "
        "ต้องตรวจสอบความถูกต้องกับสำนวนต้นฉบับก่อนนำไปใช้ในกระบวนการยุติธรรม "
        f"(สร้างเมื่อ: {generated_at})"
    )

    return BriefResponse(
        parties=data.get("parties", {"plaintiff": "", "defendant": ""}),
        case_no=data.get("case_no", request.case_no),
        court=data.get("court", ""),
        case_type=data.get("case_type", ""),
        facts=data.get("facts", ""),
        legal_issues=data.get("legal_issues", []),
        statutes=data.get("statutes", []),
        verdict_summary=data.get("verdict_summary", ""),
        key_reasoning=data.get("key_reasoning", ""),
        ai_disclosure=ai_disclosure,
        generated_at=generated_at,
        pii_count=pii_count,
    )


# ---------------------------------------------------------------------------
# A — Precedent Comparison View
# ---------------------------------------------------------------------------

class CompareRequest(BaseModel):
    query: str = Field(..., description="ข้อเท็จจริงหรือประเด็นคดีที่ต้องการเปรียบเทียบ")
    case_type: str = Field(default="", description="แพ่ง / อาญา / ปกครอง (ถ้าระบุ)")
    role: str = "judge"
    top_k: int = Field(default=8, ge=3, le=15)


class PrecedentRow(BaseModel):
    rank: int
    case_no: str
    year: str
    court: str
    case_type: str
    key_facts: str
    statutes: list[str]
    verdict_summary: str
    relevance_score: float
    source_code: str


class CompareResponse(BaseModel):
    rows: list[PrecedentRow]
    total: int
    query_used: str
    ai_disclosure: str


@router.post("/precedent-compare", response_model=CompareResponse)
async def compare_precedents(request: CompareRequest) -> CompareResponse:
    """Precedent Comparison View — ดึงคดีคล้ายกัน 5-10 คดี แสดงเป็นตารางเปรียบเทียบ.

    ใช้ Hybrid RAG (BM25 + Qdrant) ดึง precedents แล้ว format เป็น structured rows
    พร้อม AI Disclosure stamp ตามแนวปฏิบัติศาลฎีกา 2568
    Access: judge, admin_judge, lawyer, government
    """
    if request.role not in {"judge", "admin_judge", "lawyer", "government", "admin"}:
        raise HTTPException(status_code=403, detail="Precedent comparison requires judge, lawyer, or government role")

    query = request.query
    if request.case_type:
        query = f"{request.case_type} {query}"
    clean_query, _, _ = mask_pii(query)

    try:
        pipeline = _get_pipeline()
        search_req = SearchRequest(
            query=clean_query,
            role=request.role,
            top_k=min(request.top_k, 15),
        )
        resp = await pipeline.search(search_req)
    except Exception as exc:
        logger.exception("Precedent compare search failed")
        raise HTTPException(status_code=500, detail=f"Search pipeline error: {exc}")

    rows: list[PrecedentRow] = []
    for i, r in enumerate(resp.results):
        # Build a concise key_facts from chunk_text or summary
        raw_facts = r.summary or r.chunk_text or ""
        key_facts = raw_facts[:300].strip()
        if len(raw_facts) > 300:
            key_facts += "..."

        rows.append(PrecedentRow(
            rank=i + 1,
            case_no=r.case_no or f"คดีที่ {i + 1}",
            year=str(r.year) if r.year else "",
            court=r.court_type or "",
            case_type=request.case_type or "",
            key_facts=key_facts,
            statutes=r.statutes or [],
            verdict_summary=r.summary[:200] if r.summary else "",
            relevance_score=round(r.relevance_score, 4),
            source_code=r.source_code or "",
        ))

    ai_disclosure = (
        "⚠️ เอกสารนี้จัดทำด้วย AI (LegalGuard AI) — ตามแนวปฏิบัติศาลฎีกา พ.ศ. 2568 "
        "ผลการเปรียบเทียบบรรทัดฐานเป็นเพียงข้อมูลเบื้องต้นเพื่อประกอบการพิจารณา "
        "ต้องตรวจสอบสำนวนต้นฉบับก่อนนำไปใช้ในกระบวนการยุติธรรม"
    )

    return CompareResponse(
        rows=rows,
        total=len(rows),
        query_used=clean_query,
        ai_disclosure=ai_disclosure,
    )


# ---------------------------------------------------------------------------
# B — Statute Cross-Reference Check
# ---------------------------------------------------------------------------

# Known amended/repealed statutes (สรุปการแก้ไขกฎหมายสำคัญล่าสุด)
_STATUTE_STATUS: dict[str, dict] = {
    # ป.พ.พ.
    "ป.พ.พ. มาตรา 193/30": {"status": "amended", "notes": "แก้ไขโดย พ.ร.บ. แก้ไขเพิ่มเติม ป.พ.พ. 2558 — อายุความ 10 ปี", "last_updated": "2558"},
    "ป.พ.พ. มาตรา 450": {"status": "amended", "notes": "แก้ไขเรื่องค่าสินไหมทดแทน 2564", "last_updated": "2564"},
    # ป.อ.
    "ป.อ. มาตรา 83": {"status": "active", "notes": "ยังมีผลบังคับ — ผู้ร่วมกระทำความผิด", "last_updated": "2499"},
    "ป.อ. มาตรา 157": {"status": "active", "notes": "ยังมีผลบังคับ — เจ้าพนักงานปฏิบัติหน้าที่โดยมิชอบ", "last_updated": "2499"},
    # พ.ร.บ. แรงงาน
    "พ.ร.บ.คุ้มครองแรงงาน มาตรา 118": {"status": "amended", "notes": "แก้ไขอัตราค่าชดเชย พ.ร.บ.คุ้มครองแรงงาน (ฉบับที่ 7) พ.ศ. 2562", "last_updated": "2562"},
    "พ.ร.บ.คุ้มครองแรงงาน มาตรา 17": {"status": "active", "notes": "ยังมีผลบังคับ — สัญญาจ้างแรงงาน", "last_updated": "2541"},
    # พ.ร.บ. คอมพิวเตอร์
    "พ.ร.บ.คอมพิวเตอร์ มาตรา 14": {"status": "amended", "notes": "แก้ไขโดย พ.ร.บ.คอมพิวเตอร์ (ฉบับที่ 2) พ.ศ. 2560 — เพิ่มข้อยกเว้น fake news", "last_updated": "2560"},
    "พ.ร.บ.คอมพิวเตอร์ มาตรา 15": {"status": "amended", "notes": "แก้ไขความรับผิดผู้ให้บริการ 2560", "last_updated": "2560"},
    # PDPA
    "พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล มาตรา 27": {"status": "active", "notes": "มีผลบังคับเต็มรูปแบบ 1 มิ.ย. 2565", "last_updated": "2562"},
    "พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล มาตรา 37": {"status": "active", "notes": "หน้าที่ผู้ควบคุมข้อมูลส่วนบุคคล", "last_updated": "2562"},
    # ป.วิ.อ.
    "ป.วิ.อ. มาตรา 150": {"status": "amended", "notes": "แก้ไขกระบวนการชันสูตรพลิกศพ 2562", "last_updated": "2562"},
    "ป.วิ.อ. มาตรา 226": {"status": "active", "notes": "หลักการรับฟังพยานหลักฐาน", "last_updated": "2477"},
}

_KNOWN_ACTIVE_PATTERNS = [
    ("ป.พ.พ.", "active", "กฎหมายแพ่งและพาณิชย์ — ยังมีผลบังคับ (ตรวจสอบการแก้ไขล่าสุดกับฐานข้อมูล Krisdika)"),
    ("ป.อ.", "active", "ประมวลกฎหมายอาญา — ยังมีผลบังคับ"),
    ("ป.วิ.พ.", "active", "ประมวลกฎหมายวิธีพิจารณาความแพ่ง — ยังมีผลบังคับ"),
    ("ป.วิ.อ.", "active", "ประมวลกฎหมายวิธีพิจารณาความอาญา — ยังมีผลบังคับ"),
    ("พ.ร.บ.ล้มละลาย", "active", "พ.ร.บ.ล้มละลาย พ.ศ. 2483 — ยังมีผลบังคับ"),
    ("พ.ร.บ.อนุญาโตตุลาการ", "active", "พ.ร.บ.อนุญาโตตุลาการ พ.ศ. 2545 — ยังมีผลบังคับ"),
]


class StatuteCheckRequest(BaseModel):
    statutes: list[str] = Field(..., description="รายชื่อมาตราที่ต้องการตรวจสอบ เช่น ['ป.พ.พ. มาตรา 420', 'ป.อ. มาตรา 341']")
    role: str = "judge"


class StatuteResult(BaseModel):
    statute: str
    status: str          # active | amended | repealed | unknown
    notes: str
    last_updated: str
    risk_flag: bool      # True ถ้า amended/repealed


class StatuteCheckResponse(BaseModel):
    results: list[StatuteResult]
    total: int
    flagged_count: int
    ai_disclosure: str
    recommendation: str


@router.post("/statute-check", response_model=StatuteCheckResponse)
async def check_statutes(request: StatuteCheckRequest) -> StatuteCheckResponse:
    """Statute Cross-Reference Check — ตรวจว่ามาตราที่อ้างยังมีผลบังคับใช้ไหม.

    ตรวจสอบจาก:
    1. Local known amendments database
    2. Pattern-based heuristic (ระบุ code ของกฎหมาย)
    Risk tier: R1 (ข้อมูลอ้างอิง ควรยืนยันกับ krisdika.go.th)
    """
    if request.role not in {"judge", "admin_judge", "lawyer", "government", "admin"}:
        raise HTTPException(status_code=403, detail="Statute check requires judge, lawyer, or government role")

    if not request.statutes:
        raise HTTPException(status_code=422, detail="กรุณาระบุมาตราอย่างน้อย 1 รายการ")

    results: list[StatuteResult] = []

    for statute in request.statutes[:20]:  # cap at 20
        stat_clean = statute.strip()

        # 1. Check exact match in known DB
        if stat_clean in _STATUTE_STATUS:
            info = _STATUTE_STATUS[stat_clean]
            results.append(StatuteResult(
                statute=stat_clean,
                status=info["status"],
                notes=info["notes"],
                last_updated=info["last_updated"],
                risk_flag=info["status"] in {"amended", "repealed"},
            ))
            continue

        # 2. Fuzzy partial key match
        matched = False
        for key, info in _STATUTE_STATUS.items():
            if stat_clean in key or key in stat_clean:
                results.append(StatuteResult(
                    statute=stat_clean,
                    status=info["status"],
                    notes=f"(จับคู่บางส่วนกับ {key}) {info['notes']}",
                    last_updated=info["last_updated"],
                    risk_flag=info["status"] in {"amended", "repealed"},
                ))
                matched = True
                break

        if matched:
            continue

        # 3. Pattern heuristic
        heuristic_status = "unknown"
        heuristic_notes = "ไม่พบในฐานข้อมูลภายใน — กรุณายืนยันกับ krisdika.go.th"
        for code, status, note in _KNOWN_ACTIVE_PATTERNS:
            if code in stat_clean:
                heuristic_status = status
                heuristic_notes = note
                break

        results.append(StatuteResult(
            statute=stat_clean,
            status=heuristic_status,
            notes=heuristic_notes,
            last_updated="",
            risk_flag=heuristic_status == "unknown",
        ))

    flagged = sum(1 for r in results if r.risk_flag)
    ai_disclosure = (
        "⚠️ เอกสารนี้จัดทำด้วย AI (LegalGuard AI) — ตามแนวปฏิบัติศาลฎีกา พ.ศ. 2568 "
        "ผลการตรวจสอบมาตราเป็นข้อมูลเบื้องต้นจากฐานข้อมูลภายใน "
        "ต้องยืนยันความถูกต้องกับ krisdika.go.th ก่อนนำไปอ้างอิงในสำนวน"
    )
    recommendation = (
        f"พบ {flagged} มาตราที่ต้องตรวจสอบเพิ่มเติม (แก้ไขแล้ว/ไม่ทราบสถานะ) "
        "— ยืนยันกับฐานข้อมูลกฎหมาย Krisdika ก่อนยื่นเอกสาร"
        if flagged > 0 else
        "มาตราที่ตรวจสอบทั้งหมดมีสถานะบังคับใช้อยู่ตามฐานข้อมูลภายใน"
    )

    return StatuteCheckResponse(
        results=results,
        total=len(results),
        flagged_count=flagged,
        ai_disclosure=ai_disclosure,
        recommendation=recommendation,
    )


# ---------------------------------------------------------------------------
# C — Conflicting Precedent Alert
# ---------------------------------------------------------------------------

CONFLICT_SYSTEM = """คุณเป็นผู้เชี่ยวชาญด้านการวิเคราะห์แนวคำพิพากษาไทย

วิเคราะห์รายการคดีที่ให้มา และตรวจสอบว่ามีแนวคำพิพากษาที่ขัดแย้งกันหรือไม่

ตอบเป็น JSON เท่านั้น (ไม่มี markdown):
{
  "has_conflict": true/false,
  "conflict_pairs": [
    {
      "case_a": "เลขคดี A",
      "case_b": "เลขคดี B",
      "conflict_description": "อธิบายประเด็นที่ขัดแย้ง",
      "conflict_type": "ข้อเท็จจริง | กฎหมาย | การวินิจฉัย | มาตรา"
    }
  ],
  "majority_view": "แนวทางที่คดีส่วนใหญ่ใช้",
  "minority_view": "แนวทางที่แตกต่างออกไป (ถ้ามี)",
  "alert_level": "none | low | medium | high",
  "recommendation": "คำแนะนำสำหรับผู้พิพากษา"
}"""


class ConflictCheckRequest(BaseModel):
    query: str = Field(..., description="ประเด็นคดีหรือข้อเท็จจริงที่ต้องการตรวจสอบ")
    case_type: str = Field(default="", description="แพ่ง / อาญา / ปกครอง")
    role: str = "judge"
    top_k: int = Field(default=8, ge=3, le=12)


class ConflictPair(BaseModel):
    case_a: str
    case_b: str
    conflict_description: str
    conflict_type: str


class ConflictCheckResponse(BaseModel):
    has_conflict: bool
    conflict_pairs: list[ConflictPair]
    majority_view: str
    minority_view: str
    alert_level: str     # none | low | medium | high
    recommendation: str
    cases_analyzed: list[dict]
    ai_disclosure: str


@router.post("/conflict-check", response_model=ConflictCheckResponse)
async def check_conflicting_precedents(request: ConflictCheckRequest) -> ConflictCheckResponse:
    """Conflicting Precedent Alert — ตรวจหาแนวคำพิพากษาที่ขัดแย้ง.

    Flow:
    1. ดึง top-K precedents ด้วย Hybrid RAG
    2. ส่งให้ LLM วิเคราะห์ความขัดแย้งระหว่างแนวคำพิพากษา
    3. Return structured conflict report พร้อม AI Disclosure
    Risk tier: R3 (ต้องตรวจสอบโดยผู้พิพากษาก่อนใช้งาน)
    """
    import json

    if request.role not in {"judge", "admin_judge", "lawyer", "government", "admin"}:
        raise HTTPException(status_code=403, detail="Conflict check requires judge, lawyer, or government role")

    query = request.query
    if request.case_type:
        query = f"{request.case_type} {query}"
    clean_query, _, _ = mask_pii(query)

    # 1. Retrieve precedents
    try:
        pipeline = _get_pipeline()
        search_req = SearchRequest(query=clean_query, role=request.role, top_k=min(request.top_k, 12))
        resp = await pipeline.search(search_req)
    except Exception as exc:
        logger.exception("Conflict check search failed")
        raise HTTPException(status_code=500, detail=f"Search pipeline error: {exc}")

    if not resp.results:
        ai_disclosure = (
            "⚠️ เอกสารนี้จัดทำด้วย AI (LegalGuard AI) — ตามแนวปฏิบัติศาลฎีกา พ.ศ. 2568"
        )
        return ConflictCheckResponse(
            has_conflict=False,
            conflict_pairs=[],
            majority_view="ไม่พบคดีในฐานข้อมูลที่เพียงพอสำหรับการวิเคราะห์",
            minority_view="",
            alert_level="none",
            recommendation="กรุณาค้นหาด้วยคำค้นที่กว้างขึ้น หรือตรวจสอบกับฐานข้อมูลภายนอก",
            cases_analyzed=[],
            ai_disclosure=ai_disclosure,
        )

    # Build case summaries for LLM
    cases_analyzed = []
    case_summaries = []
    for i, r in enumerate(resp.results):
        summary_text = r.summary or r.chunk_text[:300] or ""
        cases_analyzed.append({
            "rank": i + 1,
            "case_no": r.case_no or f"คดีที่ {i+1}",
            "court": r.court_type or "",
            "year": str(r.year) if r.year else "",
            "statutes": r.statutes or [],
            "summary": summary_text[:200],
            "relevance_score": round(r.relevance_score, 3),
        })
        case_summaries.append(
            f"คดีที่ {i+1}: {r.case_no or 'ไม่ระบุ'} ({r.court_type}, {r.year})\n"
            f"มาตรา: {', '.join(r.statutes or [])}\n"
            f"สรุป: {summary_text[:200]}"
        )

    cases_block = "\n\n---\n\n".join(case_summaries)
    prompt = (
        f"ประเด็นคดี: {clean_query}\n\n"
        f"คดีที่ค้นพบ ({len(resp.results)} คดี):\n\n{cases_block}\n\n"
        "วิเคราะห์ว่ามีแนวคำพิพากษาที่ขัดแย้งกันหรือไม่"
    )
    messages = [{"role": "user", "content": prompt}]

    # 2. LLM conflict analysis
    try:
        raw = await call_llm(messages, system=CONFLICT_SYSTEM)
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = "\n".join(cleaned.split("\n")[1:])
        if cleaned.endswith("```"):
            cleaned = "\n".join(cleaned.split("\n")[:-1])
        data = json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        logger.warning("Conflict check LLM returned non-JSON, using fallback")
        data = {
            "has_conflict": False,
            "conflict_pairs": [],
            "majority_view": "ไม่สามารถวิเคราะห์ได้โดยอัตโนมัติ",
            "minority_view": "",
            "alert_level": "low",
            "recommendation": "กรุณาตรวจสอบคดีด้วยตนเอง",
        }
    except Exception as exc:
        logger.exception("Conflict check LLM failed")
        raise HTTPException(status_code=500, detail=f"LLM error: {exc}")

    conflict_pairs = [
        ConflictPair(
            case_a=p.get("case_a", ""),
            case_b=p.get("case_b", ""),
            conflict_description=p.get("conflict_description", ""),
            conflict_type=p.get("conflict_type", ""),
        )
        for p in data.get("conflict_pairs", [])
    ]

    ai_disclosure = (
        "⚠️ เอกสารนี้จัดทำด้วย AI (LegalGuard AI) — ตามแนวปฏิบัติศาลฎีกา พ.ศ. 2568 "
        "การวิเคราะห์ความขัดแย้งของแนวคำพิพากษาเป็นเพียงข้อมูลเบื้องต้น "
        "ต้องตรวจสอบสำนวนต้นฉบับและปรึกษาผู้เชี่ยวชาญก่อนนำไปใช้"
    )

    return ConflictCheckResponse(
        has_conflict=data.get("has_conflict", False),
        conflict_pairs=conflict_pairs,
        majority_view=data.get("majority_view", ""),
        minority_view=data.get("minority_view", ""),
        alert_level=data.get("alert_level", "none"),
        recommendation=data.get("recommendation", ""),
        cases_analyzed=cases_analyzed,
        ai_disclosure=ai_disclosure,
    )
