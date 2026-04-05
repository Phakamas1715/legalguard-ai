"""Ingestion API endpoints for LegalGuard AI.

POST /ingest/documents       — Start document ingestion
GET  /ingest/status/{job_id} — Check ingestion job status
DELETE /ingest/source/{source_code} — Remove all records from a source
"""

from __future__ import annotations

import asyncio
import logging
import sqlite3
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field

from app.services.ingestion_orchestrator import IngestionOrchestrator, IngestionResult
from app.services.openlaw_ingestion import OpenLawIngestionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ingest", tags=["ingestion"])

# ---------------------------------------------------------------------------
# SQLite-backed job store — survives server restarts
# ---------------------------------------------------------------------------

_DB_PATH = Path(__file__).resolve().parent.parent.parent.parent / "data" / "jobs.db"


class _JobStore:
    """Thread-safe SQLite job store using the built-in sqlite3 module."""

    def __init__(self, path: Path = _DB_PATH) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self._path = str(path)
        with sqlite3.connect(self._path) as conn:
            conn.execute(
                """CREATE TABLE IF NOT EXISTS jobs (
                       job_id   TEXT PRIMARY KEY,
                       data     TEXT NOT NULL,
                       created  REAL DEFAULT (unixepoch())
                   )"""
            )

    def save(self, job_id: str, result: IngestionResult) -> None:
        with sqlite3.connect(self._path) as conn:
            conn.execute(
                "INSERT OR REPLACE INTO jobs (job_id, data) VALUES (?, ?)",
                (job_id, result.model_dump_json()),
            )

    def get(self, job_id: str) -> IngestionResult | None:
        with sqlite3.connect(self._path) as conn:
            row = conn.execute(
                "SELECT data FROM jobs WHERE job_id = ?", (job_id,)
            ).fetchone()
        return IngestionResult.model_validate_json(row[0]) if row else None

    def list_recent(self, limit: int = 100) -> list[IngestionResult]:
        with sqlite3.connect(self._path) as conn:
            rows = conn.execute(
                "SELECT data FROM jobs ORDER BY created DESC LIMIT ?", (limit,)
            ).fetchall()
        return [IngestionResult.model_validate_json(r[0]) for r in rows]


_job_store = _JobStore()
_jobs_in_progress: dict[str, dict] = {}  # transient in-progress tracking only

# Shared service instances
_orchestrator = IngestionOrchestrator()
_openlaw_service = OpenLawIngestionService()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class IngestRequest(BaseModel):
    """Request body for document ingestion."""

    source_code: str  # e.g. "A1.1"
    file_paths: list[str]  # paths relative to project root
    batch_size: int = 100


class IngestResponse(BaseModel):
    """Immediate response when ingestion is started."""

    job_id: str
    source_code: str
    total_documents: int
    status: str  # "in_progress"


class JobStatusResponse(BaseModel):
    """Response for job status queries."""

    job_id: str
    source_code: str
    total_documents: int
    processed_documents: int
    failed_documents: int
    total_chunks: int
    error_log: list[dict] = Field(default_factory=list)
    status: str


class DeleteResponse(BaseModel):
    """Response for source deletion."""

    source_code: str
    bm25_deleted: int
    status: str


# ---------------------------------------------------------------------------
# Background task runner
# ---------------------------------------------------------------------------


async def _run_ingestion(
    request: IngestRequest,
    job_id: str,
) -> None:
    """Run ingestion in the background and store the result."""
    try:
        result = await _orchestrator.ingest_documents(
            file_paths=request.file_paths,
            source_code=request.source_code,
            batch_size=request.batch_size,
        )
        # Override job_id to match the one we returned to the caller
        result.job_id = job_id
        _job_store.save(job_id, result)
    except Exception as exc:
        logger.error("Ingestion job %s failed: %s", job_id, exc)
        _job_store.save(
            job_id,
            IngestionResult(
                job_id=job_id,
                source_code=request.source_code,
                total_documents=len(request.file_paths),
                processed_documents=0,
                failed_documents=len(request.file_paths),
                total_chunks=0,
                error_log=[{"error": str(exc)}],
                status="failed",
            ),
        )
    finally:
        _jobs_in_progress.pop(job_id, None)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/documents", response_model=IngestResponse)
async def ingest_documents(
    request: IngestRequest,
    background_tasks: BackgroundTasks,
) -> IngestResponse:
    """Start document ingestion. Returns immediately with a job_id."""
    import uuid

    job_id = str(uuid.uuid4())

    _jobs_in_progress[job_id] = {
        "source_code": request.source_code,
        "total_documents": len(request.file_paths),
    }

    background_tasks.add_task(_run_ingestion, request, job_id)

    return IngestResponse(
        job_id=job_id,
        source_code=request.source_code,
        total_documents=len(request.file_paths),
        status="in_progress",
    )


@router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_ingestion_status(job_id: str) -> JobStatusResponse:
    """Check ingestion job status."""
    # Check persisted completed jobs
    result = _job_store.get(job_id)
    if result is not None:
        return JobStatusResponse(
            job_id=result.job_id,
            source_code=result.source_code,
            total_documents=result.total_documents,
            processed_documents=result.processed_documents,
            failed_documents=result.failed_documents,
            total_chunks=result.total_chunks,
            error_log=result.error_log,
            status=result.status,
        )

    # Check in-progress jobs
    if job_id in _jobs_in_progress:
        info = _jobs_in_progress[job_id]
        return JobStatusResponse(
            job_id=job_id,
            source_code=info["source_code"],
            total_documents=info["total_documents"],
            processed_documents=0,
            failed_documents=0,
            total_chunks=0,
            error_log=[],
            status="in_progress",
        )

    raise HTTPException(status_code=404, detail=f"Job {job_id} not found")


@router.delete("/source/{source_code}", response_model=DeleteResponse)
async def delete_source(source_code: str) -> DeleteResponse:
    """Remove all records for a source_code from Qdrant and BM25."""
    result = _orchestrator.delete_source(source_code)
    return DeleteResponse(
        source_code=result["source_code"],
        bm25_deleted=result["bm25_deleted"],
        status=result["status"],
    )


@router.post("/web-scrape")
async def web_scrape():
    """Scrape online sources (FAQ, judgments). Phase 2."""
    return {"status": "not_implemented"}


# ---------------------------------------------------------------------------
# Open Law Data Thailand ingestion
# ---------------------------------------------------------------------------


class OpenLawIngestRequest(BaseModel):
    """Request body for Open Law Data Thailand ingestion."""

    query: str = "สัญญา กฎหมาย"         # Thai search query
    limit: int = 100                       # max docs to fetch (capped at 200)
    source_code: str = "openlaw_thailand"  # source tag in Qdrant/BM25


class OpenLawIngestResponse(BaseModel):
    """Response from Open Law Data ingestion."""

    job_id: str
    query: str
    fetched_documents: int
    ingested_chunks: int
    failed_documents: int
    cfs: float
    f_geo: float
    f_court: float
    f_time: float
    cfs_warning: bool
    status: str


@router.post("/openlaw", response_model=OpenLawIngestResponse)
async def ingest_openlaw(request: OpenLawIngestRequest) -> OpenLawIngestResponse:
    """Ingest Thai court judgments from Open Law Data Thailand.

    Fetches judgments via openlawdatathailand.org API, applies the full
    LegalGuard pipeline (PII mask → chunk → multilingual-e5-large embed →
    Qdrant + BM25), and returns CFS for the ingested batch.

    The endpoint is synchronous (waits for completion) because ingestion
    volume is typically small (<200 docs). For large batches use /documents.
    """
    result = await _openlaw_service.ingest(
        query=request.query,
        limit=min(request.limit, 200),
        source_code=request.source_code,
    )
    return OpenLawIngestResponse(
        job_id=result.job_id,
        query=result.query,
        fetched_documents=result.fetched_documents,
        ingested_chunks=result.ingested_chunks,
        failed_documents=result.failed_documents,
        cfs=result.cfs,
        f_geo=result.f_geo,
        f_court=result.f_court,
        f_time=result.f_time,
        cfs_warning=result.cfs_warning,
        status=result.status,
    )
