"""Tests for ingestion job persistence service."""

from app.services.ingestion_job_service import (
    IngestionJobService,
    SQLiteIngestionJobRepository,
)
from app.services.ingestion_orchestrator import IngestionResult


def test_start_job_persists_status(tmp_path):
    service = IngestionJobService(repository=SQLiteIngestionJobRepository(tmp_path / "jobs.db"))

    result = service.start_job(source_code="A1.1", total_documents=3)
    loaded = service.get_job(result.job_id)

    assert loaded is not None
    assert loaded.status == "in_progress"
    assert loaded.total_documents == 3


def test_complete_job_persists_updated_result(tmp_path):
    service = IngestionJobService(repository=SQLiteIngestionJobRepository(tmp_path / "jobs.db"))
    started = service.start_job(source_code="A1.1", total_documents=2)

    completed = IngestionResult(
        job_id=started.job_id,
        source_code="A1.1",
        total_documents=2,
        processed_documents=2,
        failed_documents=0,
        total_chunks=5,
        status="completed",
    )
    service.complete_job(completed)

    loaded = service.get_job(started.job_id)
    assert loaded is not None
    assert loaded.status == "completed"
    assert loaded.total_chunks == 5


def test_list_recent_jobs_returns_newest_first(tmp_path):
    service = IngestionJobService(repository=SQLiteIngestionJobRepository(tmp_path / "jobs.db"))
    first = service.start_job(source_code="A1.1", total_documents=1)
    second = service.start_job(source_code="B2.1", total_documents=2)

    recent = service.list_recent_jobs(limit=10)

    assert recent[0].job_id == second.job_id
    assert recent[1].job_id == first.job_id


def test_request_data_persists_across_job_updates(tmp_path):
    service = IngestionJobService(repository=SQLiteIngestionJobRepository(tmp_path / "jobs.db"))
    started = service.start_job(
        source_code="A1.1",
        total_documents=2,
        request_data={"kind": "documents", "file_paths": ["a.pdf", "b.pdf"]},
    )

    completed = IngestionResult(
        job_id=started.job_id,
        source_code="A1.1",
        total_documents=2,
        processed_documents=2,
        failed_documents=0,
        total_chunks=8,
        status="completed",
    )
    service.complete_job(completed)

    assert service.get_request_data(started.job_id) == {
        "kind": "documents",
        "file_paths": ["a.pdf", "b.pdf"],
    }


def test_retry_available_depends_on_request_data(tmp_path):
    service = IngestionJobService(repository=SQLiteIngestionJobRepository(tmp_path / "jobs.db"))
    retryable = service.start_job(
        source_code="A1.1",
        total_documents=1,
        request_data={"kind": "documents", "file_paths": ["a.pdf"]},
    )
    non_retryable = service.start_job(source_code="B2.1", total_documents=1)

    assert service.retry_available(retryable.job_id) is False
    assert service.retry_available(non_retryable.job_id) is False


def test_retry_state_allows_failed_job_with_payload(tmp_path):
    service = IngestionJobService(repository=SQLiteIngestionJobRepository(tmp_path / "jobs.db"))
    failed = service.fail_job(
        job_id="job-failed",
        source_code="A1.1",
        total_documents=1,
        error="boom",
        request_data={"kind": "documents", "file_paths": ["a.pdf"]},
    )

    state = service.get_retry_state(failed.job_id)

    assert state["available"] is True
    assert "retry" in state["reason"]


def test_retry_state_allows_completed_with_errors_job(tmp_path):
    service = IngestionJobService(repository=SQLiteIngestionJobRepository(tmp_path / "jobs.db"))
    started = service.start_job(
        source_code="A1.1",
        total_documents=2,
        request_data={"kind": "documents", "file_paths": ["a.pdf", "b.pdf"]},
    )

    service.complete_job(
        IngestionResult(
            job_id=started.job_id,
            source_code="A1.1",
            total_documents=2,
            processed_documents=1,
            failed_documents=1,
            total_chunks=4,
            error_log=[{"file_path": "b.pdf", "error": "boom"}],
            status="completed_with_errors",
        )
    )

    state = service.get_retry_state(started.job_id)

    assert state["available"] is True
    assert "สำเร็จบางส่วน" in state["reason"]


def test_retry_state_blocks_completed_job_even_with_payload(tmp_path):
    service = IngestionJobService(repository=SQLiteIngestionJobRepository(tmp_path / "jobs.db"))
    started = service.start_job(
        source_code="A1.1",
        total_documents=1,
        request_data={"kind": "documents", "file_paths": ["a.pdf"]},
    )
    service.complete_job(
        IngestionResult(
            job_id=started.job_id,
            source_code="A1.1",
            total_documents=1,
            processed_documents=1,
            failed_documents=0,
            total_chunks=2,
            status="completed",
        )
    )

    state = service.get_retry_state(started.job_id)

    assert state["available"] is False
    assert "สำเร็จครบแล้ว" in state["reason"]


def test_failed_items_retry_state_returns_failed_file_paths(tmp_path):
    service = IngestionJobService(repository=SQLiteIngestionJobRepository(tmp_path / "jobs.db"))
    started = service.start_job(
        source_code="A1.1",
        total_documents=3,
        request_data={"kind": "documents", "file_paths": ["a.pdf", "b.pdf", "c.pdf"]},
    )
    service.complete_job(
        IngestionResult(
            job_id=started.job_id,
            source_code="A1.1",
            total_documents=3,
            processed_documents=2,
            failed_documents=1,
            total_chunks=7,
            error_log=[
                {"file_path": "b.pdf", "error": "boom"},
                {"file_path": "b.pdf", "error": "still boom"},
            ],
            status="completed_with_errors",
        )
    )

    state = service.get_failed_items_retry_state(started.job_id)

    assert state["available"] is True
    assert state["failed_file_paths"] == ["b.pdf"]


def test_failed_items_retry_state_blocks_non_partial_job(tmp_path):
    service = IngestionJobService(repository=SQLiteIngestionJobRepository(tmp_path / "jobs.db"))
    started = service.start_job(
        source_code="A1.1",
        total_documents=1,
        request_data={"kind": "documents", "file_paths": ["a.pdf"]},
    )

    state = service.get_failed_items_retry_state(started.job_id)

    assert state["available"] is False
    assert "completed_with_errors" in state["reason"]


def test_get_retry_chain_returns_multi_level_lineage(tmp_path):
    service = IngestionJobService(repository=SQLiteIngestionJobRepository(tmp_path / "jobs.db"))

    root = service.start_job(
        source_code="A1.1",
        total_documents=3,
        job_id="root-job",
        request_data={"kind": "documents", "file_paths": ["a.pdf", "b.pdf", "c.pdf"]},
    )
    service.complete_job(
        IngestionResult(
            job_id=root.job_id,
            source_code="A1.1",
            total_documents=3,
            processed_documents=2,
            failed_documents=1,
            total_chunks=6,
            error_log=[{"file_path": "b.pdf", "error": "boom"}],
            status="completed_with_errors",
        ),
        request_data={"kind": "documents", "file_paths": ["a.pdf", "b.pdf", "c.pdf"]},
    )

    retry1 = service.start_job(
        source_code="A1.1",
        total_documents=1,
        job_id="retry-1",
        request_data={
            "kind": "documents",
            "file_paths": ["b.pdf"],
            "retry_mode": "failed_only",
            "retry_of": "root-job",
            "retried_file_count": 1,
        },
    )
    service.complete_job(
        IngestionResult(
            job_id=retry1.job_id,
            source_code="A1.1",
            total_documents=1,
            processed_documents=0,
            failed_documents=1,
            total_chunks=0,
            error_log=[{"file_path": "b.pdf", "error": "still boom"}],
            status="completed_with_errors",
        ),
        request_data={
            "kind": "documents",
            "file_paths": ["b.pdf"],
            "retry_mode": "failed_only",
            "retry_of": "root-job",
            "retried_file_count": 1,
        },
    )

    retry2 = service.start_job(
        source_code="A1.1",
        total_documents=1,
        job_id="retry-2",
        request_data={
            "kind": "documents",
            "file_paths": ["b.pdf"],
            "retry_mode": "failed_only",
            "retry_of": "retry-1",
            "retried_file_count": 1,
        },
    )
    service.complete_job(
        IngestionResult(
            job_id=retry2.job_id,
            source_code="A1.1",
            total_documents=1,
            processed_documents=1,
            failed_documents=0,
            total_chunks=2,
            error_log=[],
            status="completed",
        ),
        request_data={
            "kind": "documents",
            "file_paths": ["b.pdf"],
            "retry_mode": "failed_only",
            "retry_of": "retry-1",
            "retried_file_count": 1,
        },
    )

    payload = service.get_retry_chain("retry-2")

    assert payload is not None
    assert payload["root_job_id"] == "root-job"
    assert payload["selected_job_id"] == "retry-2"
    assert [node["job_id"] for node in payload["nodes"]] == ["root-job", "retry-1", "retry-2"]
    assert payload["nodes"][0]["created_at"] is not None
    assert payload["metrics"]["total_rounds"] == 3
    assert payload["metrics"]["retry_rounds"] == 2
    assert payload["metrics"]["root_failed_file_count"] == 1
    assert payload["metrics"]["current_remaining_failed_count"] == 0
    assert payload["metrics"]["overall_recovery_rate"] == 1.0
    assert payload["metrics"]["recovery_completed"] is True
    assert payload["metrics"]["time_to_full_recovery_seconds"] is not None
    assert payload["metrics"]["rounds"][0]["round"] == 1
    assert payload["metrics"]["rounds"][0]["recovery_rate"] == 0.0
    assert payload["metrics"]["rounds"][1]["round"] == 2
    assert payload["metrics"]["rounds"][1]["recovery_rate"] == 1.0
