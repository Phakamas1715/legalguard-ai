"""Tests for Legal Glossary — ศัพท์กฎหมายไทย + query expansion."""

from app.services.legal_glossary import (
    expand_query,
    get_all_statutes,
    get_landmark_cases,
    lookup,
    search_terms,
)


class TestLookup:
    def test_exact_term(self):
        result = lookup("ฉ้อโกง")
        assert result is not None
        assert result["en"] == "Fraud"
        assert "341" in result["statute"]

    def test_synonym_lookup(self):
        result = lookup("โกง")
        assert result is not None
        assert result["term"] == "ฉ้อโกง"
        assert result["matched_synonym"] == "โกง"

    def test_procedural_term(self):
        result = lookup("โจทก์")
        assert result is not None
        assert "Plaintiff" in result["en"]

    def test_unknown_term(self):
        assert lookup("คำที่ไม่มี") is None


class TestSearch:
    def test_search_by_thai(self):
        results = search_terms("ฉ้อโกง")
        assert len(results) >= 1
        assert results[0]["term"] == "ฉ้อโกง"

    def test_search_by_english(self):
        results = search_terms("fraud")
        assert len(results) >= 1

    def test_search_partial(self):
        results = search_terms("หย่า")
        assert any(r["term"] == "หย่า" for r in results)

    def test_search_limit(self):
        results = search_terms("ก", limit=3)
        assert len(results) <= 3


class TestExpandQuery:
    def test_expand_synonym(self):
        expanded = expand_query("ถูกโกงเงิน")
        assert "ฉ้อโกง" in expanded
        assert "มาตรา 341" in expanded

    def test_expand_statute(self):
        expanded = expand_query("ฉ้อโกง")
        assert "มาตรา 341" in expanded

    def test_no_expansion_needed(self):
        expanded = expand_query("สวัสดีครับ")
        assert expanded == "สวัสดีครับ"

    def test_expand_labor(self):
        expanded = expand_query("ถูกเลิกจ้าง")
        assert "เลิกจ้างไม่เป็นธรรม" in expanded or "แรงงาน" in expanded


class TestStatutes:
    def test_get_all_statutes(self):
        statutes = get_all_statutes()
        assert len(statutes) >= 5
        assert any("341" in s for s in statutes)


class TestLandmarkCases:
    def test_get_all(self):
        cases = get_landmark_cases()
        assert len(cases) >= 5

    def test_filter_by_topic(self):
        cases = get_landmark_cases("ฉ้อโกง")
        assert len(cases) >= 1
        assert "ฉ้อโกง" in cases[0]["topic"]

    def test_filter_no_match(self):
        cases = get_landmark_cases("หัวข้อที่ไม่มี")
        assert len(cases) == 0
