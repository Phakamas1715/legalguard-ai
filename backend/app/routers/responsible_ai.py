"""Responsible AI API endpoints — Risk Tiers, Honesty Score, Circuit Breaker."""
from __future__ import annotations

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.responsible_ai import (
    CircuitBreaker,
    apply_confidence_bound,
    apply_missing_data_penalty,
    calculate_honesty_score,
    confidence_badge,
    enforce_risk_tier,
    generate_ethical_disclaimer,
    governance_score,
    honesty_level,
    legal_risk_score,
    risk_level_from_score,
)

router = APIRouter(prefix="/responsible-ai", tags=["responsible-ai"])

_circuit_breaker = CircuitBreaker()


class RiskCheckRequest(BaseModel):
    action_type: str
    raw_confidence: float


class HonestyRequest(BaseModel):
    response: dict
    state: dict = Field(default_factory=dict)


class CircuitBreakerRequest(BaseModel):
    response: dict
    metrics: dict = Field(default_factory=dict)


class MissingDataRequest(BaseModel):
    confidence: float
    available_sources: list[str] = Field(default_factory=list)


@router.post("/risk-tier")
async def check_risk_tier(req: RiskCheckRequest):
    """Check risk tier and apply confidence cap for an action type."""
    result = enforce_risk_tier(req.action_type, req.raw_confidence)
    return result.model_dump()


@router.post("/honesty-score")
async def check_honesty(req: HonestyRequest):
    """Calculate 6-dimension Honesty Score for a response."""
    score = calculate_honesty_score(req.response, req.state)
    level, action = honesty_level(score)
    badge = confidence_badge(score)
    return {
        "honesty_score": score,
        "level": level,
        "action": action,
        "badge": badge,
    }


@router.post("/circuit-breaker")
async def check_circuit_breaker(req: CircuitBreakerRequest):
    """Check response against circuit breaker thresholds."""
    return _circuit_breaker.check(req.response, req.metrics)


@router.post("/missing-data-penalty")
async def check_missing_data(req: MissingDataRequest):
    """Calculate missing data penalty for confidence adjustment."""
    effective, human_required, disclaimer = apply_missing_data_penalty(
        req.confidence, req.available_sources
    )
    return {
        "effective_confidence": effective,
        "human_review_required": human_required,
        "disclaimer": disclaimer,
    }


@router.post("/governance-score")
async def check_governance(req: HonestyRequest):
    """Calculate GLUE-RAAIA Governance Fusion Score."""
    return governance_score(req.response, req.state)


@router.post("/legal-risk")
async def check_legal_risk(req: HonestyRequest):
    """Calculate Legal Risk Score (P_risk)."""
    p_risk = legal_risk_score(req.response, req.state)
    level, action = risk_level_from_score(p_risk)
    return {
        "p_risk": p_risk,
        "level": level,
        "action": action,
    }


@router.get("/risk-tiers")
async def list_risk_tiers():
    """List all risk tier definitions."""
    from app.services.responsible_ai import RISK_TIERS
    return {
        action: {
            "risk_level": level,
            "confidence_cap": cap,
            "human_required": human,
        }
        for action, (level, cap, human) in RISK_TIERS.items()
    }


# ---------------------------------------------------------------------------
# TLAGF — Thai Legal AI Governance Framework
# ---------------------------------------------------------------------------


@router.get("/tlagf")
async def get_tlagf_status():
    """TLAGF 5 Pillars status — Thai Legal AI Governance Framework."""
    from app.services.responsible_ai import tlagf_status
    return tlagf_status()


@router.post("/cse-compliance")
async def check_cse(req: HonestyRequest):
    """Check response against CSE-200 PDPA constraints."""
    from app.services.responsible_ai import check_cse_compliance
    return check_cse_compliance(req.response, req.state)


@router.get("/release-guard")
async def release_guard():
    """Run DevSecOps Release Guard — pre-deployment safety checks."""
    from app.services.responsible_ai import run_release_guard
    return run_release_guard()


@router.get("/cse-constraints")
async def list_cse_constraints():
    """List all CSE-200 PDPA constraints."""
    from app.services.responsible_ai import CSE_PDPA_CONSTRAINTS
    return {
        "total": len(CSE_PDPA_CONSTRAINTS),
        "target": 200,
        "constraints": CSE_PDPA_CONSTRAINTS,
        "categories": {
            "PII": sum(1 for c in CSE_PDPA_CONSTRAINTS if c["category"] == "PII"),
            "sovereignty": sum(1 for c in CSE_PDPA_CONSTRAINTS if c["category"] == "sovereignty"),
            "access": sum(1 for c in CSE_PDPA_CONSTRAINTS if c["category"] == "access"),
            "ethics": sum(1 for c in CSE_PDPA_CONSTRAINTS if c["category"] == "ethics"),
            "audit": sum(1 for c in CSE_PDPA_CONSTRAINTS if c["category"] == "audit"),
            "fairness": sum(1 for c in CSE_PDPA_CONSTRAINTS if c["category"] == "fairness"),
        },
    }


@router.get("/access-matrix")
async def get_access_matrix():
    """Return runtime-authoritative classification/access matrix for IT dashboards."""
    from app.services.access_policy_service import AccessPolicyService

    return AccessPolicyService().get_matrix()
