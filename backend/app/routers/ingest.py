"""Ingestion API endpoints for LegalGuard AI.

POST /ingest/documents       — Start document ingestion
GET  /ingest/status/{job_id} — Check ingestion job status
DELETE /ingest/source/{source_code} — Remove all records from a source
"""
from __future__ import annotations

from __future__ import annotations

import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.ingestion_job_service import IngestionJobService
from app.services.ingestion_orchestrator import IngestionOrchestrator, IngestionResult
from app.services.openlaw_ingestion import OpenLawIngestionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ingest", tags=["ingestion"])

# Shared service instances
_job_service = IngestionJobService()
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
    retry_available: bool = False
    retry_reason: Optional[str] = None
    retry_failed_available: bool = False
    retry_failed_reason: Optional[str] = None
    retry_mode: Optional[str] = None
    retry_of: Optional[str] = None
    retried_file_count: Optional[int] = None
    retried_file_paths: list[str] = Field(default_factory=list)


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
    retry_available: bool = False
    retry_reason: Optional[str] = None
    retry_failed_available: bool = False
    retry_failed_reason: Optional[str] = None
    retry_mode: Optional[str] = None
    retry_of: Optional[str] = None
    retried_file_count: Optional[int] = None
    retried_file_paths: list[str] = Field(default_factory=list)


class DeleteResponse(BaseModel):
    """Response for source deletion."""

    source_code: str
    bm25_deleted: int
    status: str


class RecentJobsResponse(BaseModel):
    jobs: list[JobStatusResponse] = Field(default_factory=list)


class RetryChainNodeResponse(BaseModel):
    job_id: str
    created_at: Optional[str] = None
    source_code: str
    status: str
    total_documents: int
    processed_documents: int
    failed_documents: int
    total_chunks: int
    retry_mode: Optional[str] = None
    retry_of: Optional[str] = None
    retried_file_count: Optional[int] = None
    retried_file_paths: list[str] = Field(default_factory=list)
    failed_file_paths: list[str] = Field(default_factory=list)


class RetryChainRoundMetricResponse(BaseModel):
    round: int
    job_id: str
    retry_mode: Optional[str] = None
    retried_file_count: int
    recovered_count: int
    remaining_failed_count: int
    recovery_rate: Optional[float] = None
    elapsed_seconds_from_root: Optional[float] = None
    elapsed_seconds_from_previous: Optional[float] = None
    fully_recovered: bool


class RetryChainMetricsResponse(BaseModel):
    total_rounds: int
    retry_rounds: int
    root_failed_file_count: int
    current_remaining_failed_count: int
    total_retried_files: int
    overall_recovery_rate: Optional[float] = None
    recovery_completed: bool
    time_to_full_recovery_seconds: Optional[float] = None
    rounds: list[RetryChainRoundMetricResponse] = Field(default_factory=list)


class RetryChainResponse(BaseModel):
    selected_job_id: str
    root_job_id: str
    nodes: list[RetryChainNodeResponse] = Field(default_factory=list)
    metrics: Optional[RetryChainMetricsResponse] = None


def _job_retry_context(job_id: str) -> dict[str, str | int | list[str] | None]:
    request_data = _job_service.get_request_data(job_id) or {}
    retry_mode = request_data.get("retry_mode")
    retry_of = request_data.get("retry_of")
    retried_file_count = request_data.get("retried_file_count")
    retried_file_paths = request_data.get("file_paths")
    return {
        "retry_mode": retry_mode if isinstance(retry_mode, str) else None,
        "retry_of": retry_of if isinstance(retry_of, str) else None,
        "retried_file_count": retried_file_count if isinstance(retried_file_count, int) else None,
        "retried_file_paths": retried_file_paths if isinstance(retried_file_paths, list) else [],
    }


def _job_status_response(result: IngestionResult) -> JobStatusResponse:
    retry_state = _job_service.get_retry_state(result.job_id)
    retry_failed_state = _job_service.get_failed_items_retry_state(result.job_id)
    retry_context = _job_retry_context(result.job_id)
    return JobStatusResponse(
        job_id=result.job_id,
        source_code=result.source_code,
        total_documents=result.total_documents,
        processed_documents=result.processed_documents,
        failed_documents=result.failed_documents,
        total_chunks=result.total_chunks,
        error_log=result.error_log,
        status=result.status,
        retry_available=retry_state["available"],
        retry_reason=retry_state["reason"],
        retry_failed_available=retry_failed_state["available"],
        retry_failed_reason=retry_failed_state["reason"],
        retry_mode=retry_context["retry_mode"],
        retry_of=retry_context["retry_of"],
        retried_file_count=retry_context["retried_file_count"],
        retried_file_paths=retry_context["retried_file_paths"],
    )


# ---------------------------------------------------------------------------
# Background task runner
# ---------------------------------------------------------------------------


async def _run_ingestion(
    request: IngestRequest,
    job_id: str,
    request_data: Optional[dict] = None,
) -> None:
    """Run ingestion in the background and store the result."""
    resolved_request_data = request_data or {
        "kind": "documents",
        "source_code": request.source_code,
        "file_paths": request.file_paths,
        "batch_size": request.batch_size,
    }
    try:
        result = await _orchestrator.ingest_documents(
            file_paths=request.file_paths,
            source_code=request.source_code,
            batch_size=request.batch_size,
        )
        result.job_id = job_id
        _job_service.complete_job(result, request_data=resolved_request_data)
    except Exception as exc:
        logger.error("Ingestion job %s failed: %s", job_id, exc)
        _job_service.fail_job(
            job_id=job_id,
            source_code=request.source_code,
            total_documents=len(request.file_paths),
            error=str(exc),
            request_data=resolved_request_data,
        )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/documents", response_model=IngestResponse)
async def ingest_documents(
    request: IngestRequest,
    background_tasks: BackgroundTasks,
) -> IngestResponse:
    """Start document ingestion. Returns immediately with a job_id."""
    pending_job = _job_service.start_job(
        source_code=request.source_code,
        total_documents=len(request.file_paths),
        request_data={
            "kind": "documents",
            "source_code": request.source_code,
            "file_paths": request.file_paths,
            "batch_size": request.batch_size,
        },
    )

    background_tasks.add_task(_run_ingestion, request, pending_job.job_id, {
        "kind": "documents",
        "source_code": request.source_code,
        "file_paths": request.file_paths,
        "batch_size": request.batch_size,
    })

    return IngestResponse(
        job_id=pending_job.job_id,
        source_code=request.source_code,
        total_documents=len(request.file_paths),
        status="in_progress",
        retry_available=False,
        retry_reason="job นี้ยังทำงานอยู่",
        retry_failed_available=False,
        retry_failed_reason="job นี้ยังทำงานอยู่",
        retried_file_paths=[],
    )


@router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_ingestion_status(job_id: str) -> JobStatusResponse:
    """Check ingestion job status."""
    result = _job_service.get_job(job_id)
    if result is not None:
        return _job_status_response(result)

    raise HTTPException(status_code=404, detail=f"Job {job_id} not found")


@router.get("/recent", response_model=RecentJobsResponse)
async def list_recent_jobs(limit: int = Query(10, ge=1, le=100)) -> RecentJobsResponse:
    """List recently created ingestion jobs for admin/dashboard usage."""
    jobs = _job_service.list_recent_jobs(limit=limit)
    return RecentJobsResponse(
        jobs=[_job_status_response(result) for result in jobs]
    )


@router.get("/chain/{job_id}", response_model=RetryChainResponse)
async def get_retry_chain(job_id: str) -> RetryChainResponse:
    """Return the full retry lineage for a job."""
    payload = _job_service.get_retry_chain(job_id)
    if payload is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return RetryChainResponse(**payload)


@router.post("/retry/{job_id}", response_model=IngestResponse)
async def retry_ingestion_job(job_id: str, background_tasks: BackgroundTasks) -> IngestResponse:
    """Retry an ingestion job using its persisted request payload."""
    if _job_service.get_job(job_id) is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    retry_state = _job_service.get_retry_state(job_id)
    if not retry_state["available"]:
        raise HTTPException(status_code=409, detail=retry_state["reason"])

    request_data = _job_service.get_request_data(job_id)
    if request_data is None:
        raise HTTPException(status_code=404, detail=f"Retry payload for job {job_id} not found")

    kind = request_data.get("kind")
    if kind == "documents":
        request = IngestRequest(
            source_code=request_data["source_code"],
            file_paths=request_data["file_paths"],
            batch_size=request_data.get("batch_size", 100),
        )
        retry_payload = {
            **request_data,
            "retry_mode": "full",
            "retry_of": job_id,
            "retried_file_count": len(request.file_paths),
        }
        pending_job = _job_service.start_job(
            source_code=request.source_code,
            total_documents=len(request.file_paths),
            request_data=retry_payload,
        )
        background_tasks.add_task(_run_ingestion, request, pending_job.job_id, retry_payload)
        return IngestResponse(
            job_id=pending_job.job_id,
            source_code=request.source_code,
            total_documents=len(request.file_paths),
            status="in_progress",
            retry_available=False,
            retry_reason="job นี้ยังทำงานอยู่",
            retry_failed_available=False,
            retry_failed_reason="job นี้ยังทำงานอยู่",
            retry_mode="full",
            retry_of=job_id,
            retried_file_count=len(request.file_paths),
            retried_file_paths=request.file_paths,
        )

    if kind == "openlaw":
        request = OpenLawIngestRequest(
            query=request_data["query"],
            limit=request_data.get("limit", 100),
            source_code=request_data.get("source_code", "openlaw_thailand"),
        )
        result = await _openlaw_service.ingest(
            query=request.query,
            limit=min(request.limit, 200),
            source_code=request.source_code,
        )
        _job_service.complete_job(
            IngestionResult(
                job_id=result.job_id,
                source_code=request.source_code,
                total_documents=result.fetched_documents,
                processed_documents=result.fetched_documents - result.failed_documents,
                failed_documents=result.failed_documents,
                total_chunks=result.ingested_chunks,
                error_log=result.error_log,
                status=result.status,
            ),
            request_data=request_data,
        )
        return IngestResponse(
            job_id=result.job_id,
            source_code=request.source_code,
            total_documents=result.fetched_documents,
            status=result.status,
            retry_available=_job_service.get_retry_state(result.job_id)["available"],
            retry_reason=_job_service.get_retry_state(result.job_id)["reason"],
            retry_failed_available=_job_service.get_failed_items_retry_state(result.job_id)["available"],
            retry_failed_reason=_job_service.get_failed_items_retry_state(result.job_id)["reason"],
            retried_file_paths=[],
        )

    raise HTTPException(status_code=400, detail=f"Unsupported retry kind: {kind}")


@router.post("/retry-failed/{job_id}", response_model=IngestResponse)
async def retry_failed_items(job_id: str, background_tasks: BackgroundTasks) -> IngestResponse:
    """Retry only failed documents from a partially successful ingestion job."""
    if _job_service.get_job(job_id) is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    retry_state = _job_service.get_failed_items_retry_state(job_id)
    if not retry_state["available"]:
        raise HTTPException(status_code=409, detail=retry_state["reason"])

    request_data = _job_service.get_request_data(job_id)
    if request_data is None:
        raise HTTPException(status_code=404, detail=f"Retry payload for job {job_id} not found")

    failed_file_paths = retry_state["failed_file_paths"]
    request = IngestRequest(
        source_code=request_data["source_code"],
        file_paths=failed_file_paths,
        batch_size=request_data.get("batch_size", 100),
    )
    retry_payload = {
        "kind": "documents",
        "source_code": request.source_code,
        "file_paths": failed_file_paths,
        "batch_size": request.batch_size,
        "retry_mode": "failed_only",
        "retry_of": job_id,
        "retried_file_count": len(failed_file_paths),
    }
    pending_job = _job_service.start_job(
        source_code=request.source_code,
        total_documents=len(request.file_paths),
        request_data=retry_payload,
    )
    background_tasks.add_task(_run_ingestion, request, pending_job.job_id, retry_payload)
    return IngestResponse(
        job_id=pending_job.job_id,
        source_code=request.source_code,
        total_documents=len(request.file_paths),
        status="in_progress",
        retry_available=False,
        retry_reason="job นี้ยังทำงานอยู่",
        retry_failed_available=False,
        retry_failed_reason="job นี้ยังทำงานอยู่",
        retry_mode="failed_only",
        retry_of=job_id,
        retried_file_count=len(failed_file_paths),
        retried_file_paths=failed_file_paths,
    )


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
    LegalGuard pipeline (PII mask → chunk → shared embedding service →
    Qdrant + BM25), and returns CFS for the ingested batch.

    The endpoint is synchronous (waits for completion) because ingestion
    volume is typically small (<200 docs). For large batches use /documents.
    """
    result = await _openlaw_service.ingest(
        query=request.query,
        limit=min(request.limit, 200),
        source_code=request.source_code,
    )
    _job_service.complete_job(
        IngestionResult(
            job_id=result.job_id,
            source_code=request.source_code,
            total_documents=result.fetched_documents,
            processed_documents=result.fetched_documents - result.failed_documents,
            failed_documents=result.failed_documents,
            total_chunks=result.ingested_chunks,
            error_log=result.error_log,
            status=result.status,
        ),
        request_data={
            "kind": "openlaw",
            "query": request.query,
            "limit": request.limit,
            "source_code": request.source_code,
        },
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
