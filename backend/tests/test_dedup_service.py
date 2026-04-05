"""Unit tests for the deduplication service."""

from datetime import datetime, timezone
from typing import Optional

from app.services.dedup_service import DedupRecord, DedupService, dedup_stats


def _rec(
    case_no: Optional[str],
    court_type: Optional[str],
    source_code: str = "A1.1",
    ingested_at: str = "2025-01-01T00:00:00+00:00",
    data: Optional[dict] = None,
) -> DedupRecord:
    return DedupRecord(
        case_no=case_no,
        court_type=court_type,
        source_code=source_code,
        ingested_at=datetime.fromisoformat(ingested_at),
        data=data or {},
    )


class TestDedupService:
    def setup_method(self) -> None:
        self.svc = DedupService()

    def test_empty_list(self) -> None:
        assert self.svc.deduplicate([]) == []

    def test_no_duplicates(self) -> None:
        records = [
            _rec("ฎ.1/2568", "supreme"),
            _rec("อ.2/2568", "appeal"),
        ]
        result = self.svc.deduplicate(records)
        assert len(result) == 2

    def test_duplicate_keeps_most_recent(self) -> None:
        old = _rec("ฎ.1/2568", "supreme", source_code="A4.1", ingested_at="2025-01-01T00:00:00+00:00")
        new = _rec("ฎ.1/2568", "supreme", source_code="A4.2", ingested_at="2025-06-01T00:00:00+00:00")
        result = self.svc.deduplicate([old, new])
        assert len(result) == 1
        assert result[0].source_code == "A4.2"

    def test_duplicate_keeps_most_recent_reverse_order(self) -> None:
        old = _rec("ฎ.1/2568", "supreme", source_code="A4.1", ingested_at="2025-01-01T00:00:00+00:00")
        new = _rec("ฎ.1/2568", "supreme", source_code="A4.2", ingested_at="2025-06-01T00:00:00+00:00")
        result = self.svc.deduplicate([new, old])
        assert len(result) == 1
        assert result[0].source_code == "A4.2"

    def test_none_case_no_always_unique(self) -> None:
        records = [
            _rec(None, "supreme", source_code="A1.1"),
            _rec(None, "supreme", source_code="A1.2"),
            _rec(None, None, source_code="B1.1"),
        ]
        result = self.svc.deduplicate(records)
        assert len(result) == 3

    def test_different_court_type_not_deduped(self) -> None:
        r1 = _rec("ฎ.1/2568", "supreme")
        r2 = _rec("ฎ.1/2568", "appeal")
        result = self.svc.deduplicate([r1, r2])
        assert len(result) == 2

    def test_preserves_original_order(self) -> None:
        a = _rec("อ.1/2568", "appeal", source_code="X", ingested_at="2025-03-01T00:00:00+00:00")
        b = _rec(None, None, source_code="Y")
        c = _rec("ฎ.2/2568", "supreme", source_code="Z", ingested_at="2025-01-01T00:00:00+00:00")
        d = _rec("อ.1/2568", "appeal", source_code="W", ingested_at="2025-01-01T00:00:00+00:00")
        # a and d share key; a is newer → a kept, d removed
        result = self.svc.deduplicate([a, b, c, d])
        assert [r.source_code for r in result] == ["X", "Y", "Z"]

    def test_multiple_duplicate_groups(self) -> None:
        records = [
            _rec("ฎ.1/2568", "supreme", source_code="A", ingested_at="2025-01-01T00:00:00+00:00"),
            _rec("ฎ.1/2568", "supreme", source_code="B", ingested_at="2025-06-01T00:00:00+00:00"),
            _rec("อ.2/2568", "appeal", source_code="C", ingested_at="2025-01-01T00:00:00+00:00"),
            _rec("อ.2/2568", "appeal", source_code="D", ingested_at="2025-06-01T00:00:00+00:00"),
        ]
        result = self.svc.deduplicate(records)
        assert len(result) == 2
        assert result[0].source_code == "B"
        assert result[1].source_code == "D"

    def test_mixed_none_and_keyed(self) -> None:
        records = [
            _rec(None, None, source_code="N1"),
            _rec("ฎ.1/2568", "supreme", source_code="K1", ingested_at="2025-01-01T00:00:00+00:00"),
            _rec(None, "appeal", source_code="N2"),
            _rec("ฎ.1/2568", "supreme", source_code="K2", ingested_at="2025-06-01T00:00:00+00:00"),
        ]
        result = self.svc.deduplicate(records)
        assert len(result) == 3
        codes = [r.source_code for r in result]
        assert codes == ["N1", "N2", "K2"]


class TestDedupStats:
    def test_no_duplicates(self) -> None:
        records = [_rec("ฎ.1/2568", "supreme"), _rec("อ.2/2568", "appeal")]
        deduped = records[:]
        stats = dedup_stats(records, deduped)
        assert stats == {
            "original_count": 2,
            "deduped_count": 2,
            "removed_count": 0,
            "duplicate_groups": 0,
        }

    def test_with_duplicates(self) -> None:
        original = [
            _rec("ฎ.1/2568", "supreme", ingested_at="2025-01-01T00:00:00+00:00"),
            _rec("ฎ.1/2568", "supreme", ingested_at="2025-06-01T00:00:00+00:00"),
            _rec("อ.2/2568", "appeal"),
        ]
        svc = DedupService()
        deduped = svc.deduplicate(original)
        stats = dedup_stats(original, deduped)
        assert stats["original_count"] == 3
        assert stats["deduped_count"] == 2
        assert stats["removed_count"] == 1
        assert stats["duplicate_groups"] == 1

    def test_empty(self) -> None:
        stats = dedup_stats([], [])
        assert stats == {
            "original_count": 0,
            "deduped_count": 0,
            "removed_count": 0,
            "duplicate_groups": 0,
        }

    def test_all_none_case_no(self) -> None:
        records = [_rec(None, None), _rec(None, None)]
        stats = dedup_stats(records, records)
        assert stats["duplicate_groups"] == 0
        assert stats["removed_count"] == 0
