from __future__ import annotations

from app.services.access_policy_service import AccessPolicyService


def test_access_matrix_returns_backend_source():
    payload = AccessPolicyService().get_matrix()

    assert payload["source"] == "backend_runtime_policy"
    assert len(payload["classifications"]) >= 5
    assert any(item["classification"] == "pii" for item in payload["classifications"])


def test_access_matrix_contains_system_admin_quality():
    payload = AccessPolicyService().get_matrix()

    admin = next(item for item in payload["quality_by_role"] if item["role"] == "system_admin")
    assert admin["quality"] == 100
