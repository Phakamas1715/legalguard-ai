"""Case Outcome Prediction API — predict case outcomes from historical data.

Endpoint:
  POST /predict/outcome — Analyze case facts, return predicted outcome with confidence
"""

from __future__ import annotations

import logging
import re
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.pii_masking import mask_pii
from app.services.responsible_ai import (
    apply_confidence_bound,
    enforce_risk_tier,
    generate_ethical_disclaimer,
)
from app.services.search_pipeline import SearchPipeline, SearchRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predict", tags=["prediction"])

_pipeline: SearchPipeline | None = None


def _get_pipeline() -> SearchPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = SearchPipeline()
    return _pipeline


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

PREDICTION_DISCLAIMER = (
    "⚠️ การพยากรณ์นี้เป็นข้อมูลเบื้องต้นเท่านั้น ไม่ใช่คำปรึกษาทางกฎหมาย "
    "ผลลัพธ์จริงขึ้นอยู่กับข้อเท็จจริงและดุลพินิจของศาล"
)


class PredictRequest(BaseModel):
    facts: str
    case_type: str = ""  # แพ่ง / อาญา / ปกครอง
    statutes: list[str] = Field(default_factory=list)
    role: str = "lawyer"


class SimilarCase(BaseModel):
    case_no: str = ""
    court_type: str = ""
    year: int = 0
    summary: str = ""
    outcome: str = ""
    relevance_score: float = 0.0


class PredictResponse(BaseModel):
    predicted_outcome: str  # plaintiff_wins / defendant_wins / settlement / dismissed
    confidence: float
    similar_cases_count: int
    win_loss_ratio: float
    top_precedents: list[SimilarCase] = Field(default_factory=list)
    factors: dict = Field(default_factory=dict)
    low_confidence_warning: bool = False
    disclaimer: str = PREDICTION_DISCLAIMER
    risk_level: str = "R4"


# ---------------------------------------------------------------------------
# Outcome classification helpers
# ---------------------------------------------------------------------------

_OUTCOME_KEYWORDS = {
    "plaintiff_wins": ["โจทก์ชนะ", "ลงโทษ", "จำคุก", "ปรับ", "ชดใช้", "ให้โจทก์", "รับฟ้อง"],
    "defendant_wins": ["ยกฟ้อง", "จำเลยชนะ", "พ้นผิด", "ไม่ผิด", "ยกคำร้อง"],
    "settlement": ["ประนีประนอม", "ไกล่เกลี่ย", "ตกลง", "ยอมความ"],
    "dismissed": ["จำหน่ายคดี", "ถอนฟ้อง", "ไม่รับฟ้อง"],
}


def _classify_outcome(text: str) -> str:
    """Classify case outcome from text using keyword matching."""
    text_lower = text.lower()
    scores = {}
    for outcome, keywords in _OUTCOME_KEYWORDS.items():
        scores[outcome] = sum(1 for kw in keywords if kw in text_lower)
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "plaintiff_wins"


def _compute_win_loss_ratio(cases: list[dict]) -> float:
    """Compute win/loss ratio from similar cases."""
    wins = sum(1 for c in cases if c.get("outcome") in ("plaintiff_wins", "ลงโทษ"))
    total = len(cases) or 1
    return round(wins / total, 3)


def _extract_factors(facts: str, similar_cases: list[dict]) -> dict:
    """Extract contributing factors for the prediction."""
    factors = {
        "similar_cases_found": len(similar_cases),
        "case_type_distribution": {},
        "statute_frequency": {},
        "avg_relevance": 0.0,
    }

    court_types = {}
    all_statutes = {}
    total_relevance = 0.0

    for case in similar_cases:
        ct = case.get("court_type", "unknown")
        court_types[ct] = court_types.get(ct, 0) + 1
        for s in case.get("statutes", []):
            all_statutes[s] = all_statutes.get(s, 0) + 1
        total_relevance += case.get("relevance_score", 0.0)

    factors["case_type_distribution"] = court_types
    factors["statute_frequency"] = dict(sorted(all_statutes.items(), key=lambda x: x[1], reverse=True)[:5])
    factors["avg_relevance"] = round(total_relevance / max(len(similar_cases), 1), 4)

    return factors


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------


@router.post("/outcome", response_model=PredictResponse)
async def predict_outcome(request: PredictRequest) -> PredictResponse:
    """Predict case outcome based on historical similar cases.

    Flow:
    1. PII mask input facts
    2. Search for similar cases via RAG pipeline
    3. Classify outcomes of similar cases
    4. Compute prediction with confidence
    5. Apply Risk Tier R4 (cap 80%, requires human review)
    6. Return prediction with factors and disclaimer
    """
    # 1. PII mask
    clean_facts, _, pii_count = mask_pii(request.facts)
    if pii_count > 0:
        logger.info("Masked %d PII items from prediction input", pii_count)

    # 2. Search similar cases
    query = clean_facts
    if request.case_type:
        query = f"{request.case_type} {query}"
    if request.statutes:
        query += " " + " ".join(request.statutes)

    similar_cases: list[dict] = []
    try:
        pipeline = _get_pipeline()
        search_req = SearchRequest(query=query, role=request.role, top_k=10)
        resp = await pipeline.search(search_req)

        for r in resp.results:
            text = r.summary or r.chunk_text
            outcome = _classify_outcome(text)
            similar_cases.append({
                "case_no": r.case_no,
                "court_type": r.court_type,
                "year": r.year,
                "summary": text[:300],
                "outcome": outcome,
                "statutes": r.statutes,
                "relevance_score": r.relevance_score,
            })
    except Exception as exc:
        logger.exception("Prediction search failed: %s", exc)

    # 3. Compute prediction
    similar_count = len(similar_cases)
    low_confidence_warning = similar_count < 10

    if similar_cases:
        # Majority vote on outcomes
        outcome_counts = {}
        for c in similar_cases:
            o = c["outcome"]
            outcome_counts[o] = outcome_counts.get(o, 0) + 1
        predicted_outcome = max(outcome_counts, key=outcome_counts.get)
        raw_confidence = outcome_counts[predicted_outcome] / similar_count
    else:
        predicted_outcome = "plaintiff_wins"
        raw_confidence = 0.0

    # 4. Apply Risk Tier R4
    risk_result = enforce_risk_tier("case_prediction", raw_confidence)
    confidence = apply_confidence_bound(raw_confidence, "case_prediction")

    # 5. Build top precedents
    top_precedents = [
        SimilarCase(
            case_no=c["case_no"],
            court_type=c["court_type"],
            year=c["year"],
            summary=c["summary"],
            outcome=c["outcome"],
            relevance_score=c["relevance_score"],
        )
        for c in similar_cases[:5]
    ]

    # 6. Factors
    factors = _extract_factors(clean_facts, similar_cases)
    win_loss = _compute_win_loss_ratio(similar_cases)

    return PredictResponse(
        predicted_outcome=predicted_outcome,
        confidence=round(confidence, 4),
        similar_cases_count=similar_count,
        win_loss_ratio=win_loss,
        top_precedents=top_precedents,
        factors=factors,
        low_confidence_warning=low_confidence_warning,
        disclaimer=generate_ethical_disclaimer("case_prediction", confidence),
        risk_level=risk_result.risk_level,
    )
