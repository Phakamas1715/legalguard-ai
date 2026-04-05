"""Deduplication service for ingested legal records.

Deduplicates records by composite key ``(case_no, court_type)``, retaining
the most recent record per group based on ``ingested_at``.  Records with
``case_no is None`` are always treated as unique (no dedup applied).
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

class DedupRecord(BaseModel):
    """A record eligible for deduplication."""

    case_no: Optional[str] = None
    court_type: Optional[str] = None
    source_code: str
    ingested_at: datetime
    data: dict = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class DedupService:
    """Deduplicate ingested records by ``(case_no, court_type)``."""

    def deduplicate(self, records: list[DedupRecord]) -> list[DedupRecord]:
        """Return *records* with duplicates removed.

        * Group by ``(case_no, court_type)`` composite key.
        * Records where ``case_no is None`` are never grouped — each is unique.
        * Within each duplicate group keep the record with the latest
          ``ingested_at``.
        * The returned list preserves the original order of the kept records.
        """
        # Map composite key → best (most recent) record seen so far.
        best: dict[tuple[str, str | None], DedupRecord] = {}
        # Track removed records for logging.
        removed: list[DedupRecord] = []

        for rec in records:
            if rec.case_no is None:
                # No dedup for records without a case number.
                continue

            key = (rec.case_no, rec.court_type)
            existing = best.get(key)
            if existing is None:
                best[key] = rec
            elif rec.ingested_at > existing.ingested_at:
                removed.append(existing)
                best[key] = rec
            else:
                removed.append(rec)

        # Log each removal.
        for r in removed:
            logger.info(
                "Dedup removed record case_no=%s court_type=%s source_code=%s ingested_at=%s",
                r.case_no,
                r.court_type,
                r.source_code,
                r.ingested_at.isoformat(),
            )

        kept_set = set(id(r) for r in best.values())

        # Build result preserving original order.
        result: list[DedupRecord] = []
        for rec in records:
            if rec.case_no is None:
                result.append(rec)
            elif id(rec) in kept_set:
                result.append(rec)

        return result


# ---------------------------------------------------------------------------
# Stats helper
# ---------------------------------------------------------------------------

def dedup_stats(original: list[DedupRecord], deduped: list[DedupRecord]) -> dict:
    """Return summary statistics about a deduplication run.

    Returns a dict with keys:
    * ``original_count`` – number of records before dedup
    * ``deduped_count``  – number of records after dedup
    * ``removed_count``  – number of records removed
    * ``duplicate_groups`` – number of composite-key groups that had duplicates
    """
    original_count = len(original)
    deduped_count = len(deduped)
    removed_count = original_count - deduped_count

    # Count groups that had more than one record.
    groups: dict[tuple[str, str | None], int] = {}
    for rec in original:
        if rec.case_no is not None:
            key = (rec.case_no, rec.court_type)
            groups[key] = groups.get(key, 0) + 1

    duplicate_groups = sum(1 for count in groups.values() if count > 1)

    return {
        "original_count": original_count,
        "deduped_count": deduped_count,
        "removed_count": removed_count,
        "duplicate_groups": duplicate_groups,
    }
