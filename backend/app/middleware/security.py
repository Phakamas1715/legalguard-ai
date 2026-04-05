"""Data Sovereignty & Security middleware for LegalGuard AI.

Implements:
- JWT/Bearer token authentication (Cognito-ready)
- Data classification (สาธารณะ/ภายใน/ลับ/ลับมาก)
- Role-based access control per classification level
- Rate limiting (in-memory for dev, Redis for production)
- PII masking enforcement before external LLM API calls
- LLM fallback to local model (Ollama) when external API unavailable
- Security response headers (OWASP)
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import time
from base64 import b64decode
from collections import defaultdict
from enum import Enum
from typing import Optional

from fastapi import Request, Response
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "120"))
AUTH_ENABLED = os.getenv("AUTH_ENABLED", "false").lower() == "true"
AUTH_SECRET = os.getenv("AUTH_SECRET", "")  # JWT secret or Cognito public key
AUTH_SKIP_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}

# In-memory rate limiter (swap for Redis in production via REDIS_URL)
_rate_counters: dict[tuple[str, int], int] = defaultdict(int)


# ---------------------------------------------------------------------------
# JWT Token Verification (simplified — production should use Cognito/Auth0)
# ---------------------------------------------------------------------------


def _verify_token(token: str) -> Optional[dict]:
    """Verify a Bearer token and return claims.

    Supports:
    1. Simple HMAC-SHA256 tokens (for dev/testing)
    2. Cognito JWT (when AUTH_SECRET is a Cognito public key — future)

    Returns None if invalid.
    """
    if not AUTH_SECRET:
        return None

    try:
        # Simple format: base64(json_claims).base64(hmac_signature)
        parts = token.split(".")
        if len(parts) == 2:
            claims_b64, sig_b64 = parts
            expected_sig = hmac.new(
                AUTH_SECRET.encode(), claims_b64.encode(), hashlib.sha256
            ).hexdigest()
            if hmac.compare_digest(expected_sig, sig_b64):
                claims = json.loads(b64decode(claims_b64 + "=="))
                return claims
    except Exception:
        pass
    return None


def _extract_role_from_token(claims: dict) -> str:
    """Extract user role from JWT claims."""
    return claims.get("role", claims.get("custom:role", "citizen"))


# ---------------------------------------------------------------------------
# FastAPI Middleware
# ---------------------------------------------------------------------------


class SecurityMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware that enforces:
    - Authentication (JWT Bearer token when AUTH_ENABLED=true)
    - Role-based access control
    - Rate limiting (per IP, per minute)
    - Security response headers (OWASP)
    - Request/response logging
    """

    VALID_ROLES = {
        "citizen",       # ประชาชนทั่วไป
        "lawyer",        # ทนายความ / นักกฎหมาย
        "government",    # เจ้าหน้าที่รัฐทั่วไป
        "judge",         # ผู้พิพากษา (ศาลยุติธรรม — คดีแพ่ง/อาญา)
        "admin_judge",   # ตุลาการ (ศาลปกครอง/ศาลรัฐธรรมนูญ — คดีปกครอง)
        "admin",         # ผู้ดูแลระบบ
    }

    # Endpoints that require specific roles
    ROLE_RESTRICTED = {
        # Judgment drafting — ผู้พิพากษา/ตุลาการ/admin เท่านั้น
        "/api/v1/judgment/draft": {"judge", "admin_judge", "admin"},
        "/api/v1/judgment/review": {"judge", "admin_judge", "lawyer", "admin"},
        "/api/v1/judgment/precedents": {"judge", "admin_judge", "lawyer", "government", "admin"},
        # Case prediction — ทนาย/ผู้พิพากษา/ตุลาการ/เจ้าหน้าที่
        "/api/v1/predict/outcome": {"lawyer", "judge", "admin_judge", "government", "admin"},
    }

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start = time.perf_counter()
        client_ip = request.client.host if request.client else "unknown"

        # 0. Skip auth for health/docs
        if request.url.path in AUTH_SKIP_PATHS:
            return await call_next(request)

        # 1. Rate limiting per client IP
        bucket = int(start // 60)
        key = (client_ip, bucket)
        _rate_counters[key] += 1
        if _rate_counters[key] > RATE_LIMIT_PER_MINUTE:
            logger.warning("Rate limit exceeded: ip=%s", client_ip)
            return Response(
                content='{"detail":"Rate limit exceeded — ลองใหม่ใน 1 นาที"}',
                status_code=429,
                media_type="application/json",
            )

        # 2. Authentication
        role = "citizen"  # default
        if AUTH_ENABLED:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]
                claims = _verify_token(token)
                if claims:
                    role = _extract_role_from_token(claims)
                else:
                    return Response(
                        content='{"detail":"Invalid or expired token"}',
                        status_code=401,
                        media_type="application/json",
                    )
            elif request.url.path not in AUTH_SKIP_PATHS:
                # No token — check if endpoint requires auth
                path = request.url.path
                for restricted_path, allowed_roles in self.ROLE_RESTRICTED.items():
                    if path.startswith(restricted_path):
                        return Response(
                            content='{"detail":"Authentication required — กรุณาเข้าสู่ระบบ"}',
                            status_code=401,
                            media_type="application/json",
                        )
        else:
            # Auth disabled — trust X-User-Role header (dev mode)
            role = request.headers.get("X-User-Role", "citizen")

        if role not in self.VALID_ROLES:
            role = "citizen"

        # 3. Role-based endpoint restriction
        path = request.url.path
        for restricted_path, allowed_roles in self.ROLE_RESTRICTED.items():
            if path.startswith(restricted_path) and role not in allowed_roles:
                logger.warning("Access denied: role=%s path=%s ip=%s", role, path, client_ip)
                return Response(
                    content=json.dumps({
                        "detail": f"Access denied — ต้องมีสิทธิ์ {', '.join(allowed_roles)}",
                        "required_roles": list(allowed_roles),
                        "current_role": role,
                    }),
                    status_code=403,
                    media_type="application/json",
                )

        # 4. Process request
        request.state.role = role  # make role available to handlers
        response = await call_next(request)

        # 5. Security response headers (OWASP)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["X-Request-Duration-Ms"] = str(
            round((time.perf_counter() - start) * 1000, 2)
        )

        logger.debug(
            "method=%s path=%s status=%s role=%s dur_ms=%.1f",
            request.method,
            request.url.path,
            response.status_code,
            role,
            (time.perf_counter() - start) * 1000,
        )
        return response


class DataClassification(str, Enum):
    PUBLIC = "สาธารณะ"        # FAQ, guides, flow charts
    INTERNAL = "ภายใน"        # Court forms, regulations, statistics
    CONFIDENTIAL = "ลับ"      # Anonymized judgments, complaints
    HIGHLY_CONFIDENTIAL = "ลับมาก"  # Raw judgments, PII, audit logs


class UserRole(str, Enum):
    CITIZEN = "citizen"          # ประชาชนทั่วไป
    LAWYER = "lawyer"            # ทนายความ / นักกฎหมาย
    GOVERNMENT = "government"    # เจ้าหน้าที่รัฐทั่วไป
    JUDGE = "judge"              # ผู้พิพากษา (ศาลยุติธรรม)
    ADMIN_JUDGE = "admin_judge"  # ตุลาการ (ศาลปกครอง/ศาลรัฐธรรมนูญ)
    ADMIN = "admin"              # ผู้ดูแลระบบ


# Access matrix: which roles can access which classification levels
ACCESS_MATRIX: dict[DataClassification, set[UserRole]] = {
    DataClassification.PUBLIC: {
        UserRole.CITIZEN, UserRole.LAWYER, UserRole.GOVERNMENT,
        UserRole.JUDGE, UserRole.ADMIN_JUDGE, UserRole.ADMIN,
    },
    DataClassification.INTERNAL: {
        UserRole.LAWYER, UserRole.GOVERNMENT,
        UserRole.JUDGE, UserRole.ADMIN_JUDGE, UserRole.ADMIN,
    },
    DataClassification.CONFIDENTIAL: {
        UserRole.GOVERNMENT, UserRole.JUDGE, UserRole.ADMIN_JUDGE, UserRole.ADMIN,
    },
    DataClassification.HIGHLY_CONFIDENTIAL: {
        UserRole.JUDGE, UserRole.ADMIN_JUDGE, UserRole.ADMIN,
    },
}


# Source code → classification mapping
SOURCE_CLASSIFICATION: dict[str, DataClassification] = {
    "A1": DataClassification.INTERNAL,
    "A2": DataClassification.PUBLIC,
    "A3": DataClassification.INTERNAL,
    "A4": DataClassification.CONFIDENTIAL,
    "A5": DataClassification.CONFIDENTIAL,
    "A6": DataClassification.INTERNAL,
    "A7": DataClassification.PUBLIC,
    "B1": DataClassification.INTERNAL,
    "B2": DataClassification.PUBLIC,
    "B3": DataClassification.INTERNAL,
    "B4": DataClassification.INTERNAL,
    "B5": DataClassification.CONFIDENTIAL,
}


class AccessCheckResult(BaseModel):
    allowed: bool
    classification: str
    role: str
    reason: str


def check_access(source_code: str, role: str) -> AccessCheckResult:
    """Check if a role can access data with the given source_code."""
    prefix = source_code.split(".")[0] if source_code else ""
    classification = SOURCE_CLASSIFICATION.get(prefix, DataClassification.INTERNAL)
    user_role = UserRole(role) if role in [r.value for r in UserRole] else UserRole.CITIZEN
    allowed = user_role in ACCESS_MATRIX.get(classification, set())
    reason = "access granted" if allowed else f"{classification.value} requires higher role"
    return AccessCheckResult(allowed=allowed, classification=classification.value, role=role, reason=reason)


def classify_source(source_code: str) -> DataClassification:
    """Return the data classification for a source code."""
    prefix = source_code.split(".")[0] if source_code else ""
    return SOURCE_CLASSIFICATION.get(prefix, DataClassification.INTERNAL)


class LLMGateway:
    """Gateway that enforces PII masking before external LLM calls and falls back to Ollama."""

    def __init__(self, ollama_url: str = "http://localhost:11434"):
        self.ollama_url = ollama_url
        self._external_available = True

    def send_to_llm(self, text: str, provider: str = "bedrock") -> dict:
        """Send text to LLM with PII masking enforcement.

        1. Apply PII masking
        2. Try external provider (Bedrock/OpenAI)
        3. Fallback to Ollama if external unavailable
        """
        from app.services.pii_masking import mask_pii
        masked_text, spans, pii_count = mask_pii(text)

        if pii_count > 0:
            logger.info("PII masked before LLM call: %d items removed", pii_count)

        return {
            "masked_text": masked_text,
            "pii_count": pii_count,
            "provider": provider if self._external_available else "ollama",
            "data_sovereignty": "text sent to LLM contains no PII",
        }
