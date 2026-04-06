"""Persistence service for ingestion job tracking.

Moves ingestion job state out of the router and into a reusable SQLite-backed
service so status survives restarts and can be listed by admin/dashboard flows.
"""
from __future__ import annotations

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Any

from app.services.ingestion_orchestrator import IngestionResult


def _default_db_path() -> Path:
    project_root = Path(__file__).resolve().parents[3]
    return project_root / "data" / "jobs.db"


def _to_iso_datetime(value: Any) -> Optional[str]:
    if not isinstance(value, (int, float)):
        return None
    return datetime.fromtimestamp(value, tz=timezone.utc).isoformat()


def _unique_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []

    unique_values: list[str] = []
    for item in value:
        if isinstance(item, str) and item not in unique_values:
            unique_values.append(item)
    return unique_values


class SQLiteIngestionJobRepository:
    """SQLite-backed repository for persisted ingestion jobs."""

    def __init__(self, db_path: str | Optional[Path] = None) -> None:
        self._path = Path(db_path or _default_db_path())
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()

    def save(
        self,
        result: IngestionResult,
        *,
        request_data: dict[str, Any] | None = None,
    ) -> IngestionResult:
        with sqlite3.connect(self._path) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO jobs (job_id, data, request_data, created)
                VALUES (
                    ?,
                    ?,
                    COALESCE(?, (SELECT request_data FROM jobs WHERE job_id = ?)),
                    COALESCE((SELECT created FROM jobs WHERE job_id = ?), unixepoch())
                )
                """,
                (
                    result.job_id,
                    result.model_dump_json(),
                    json.dumps(request_data, ensure_ascii=False) if request_data is not None else None,
                    result.job_id,
                    result.job_id,
                ),
            )
        return result

    def get(self, job_id: str) -> Optional[IngestionResult]:
        with sqlite3.connect(self._path) as conn:
            row = conn.execute(
                "SELECT data FROM jobs WHERE job_id = ?",
                (job_id,),
            ).fetchone()
        return IngestionResult.model_validate_json(row[0]) if row else None

    def list_recent(self, limit: int = 100) -> list[IngestionResult]:
        with sqlite3.connect(self._path) as conn:
            rows = conn.execute(
                "SELECT data FROM jobs ORDER BY rowid DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [IngestionResult.model_validate_json(row[0]) for row in rows]

    def list_all_records(self) -> list[dict[str, Any]]:
        with sqlite3.connect(self._path) as conn:
            rows = conn.execute(
                "SELECT job_id, data, request_data, created FROM jobs ORDER BY created ASC, rowid ASC"
            ).fetchall()

        records: list[dict[str, Any]] = []
        for row in rows:
            request_data = json.loads(row[2]) if row[2] else {}
            records.append(
                {
                    "job_id": row[0],
                    "result": IngestionResult.model_validate_json(row[1]),
                    "request_data": request_data,
                    "created": row[3],
                }
            )
        return records

    def get_request_data(self, job_id: str) -> dict[str, Any] | None:
        with sqlite3.connect(self._path) as conn:
            row = conn.execute(
                "SELECT request_data FROM jobs WHERE job_id = ?",
                (job_id,),
            ).fetchone()
        if not row or not row[0]:
            return None
        return json.loads(row[0])

    def _ensure_schema(self) -> None:
        with sqlite3.connect(self._path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS jobs (
                    job_id TEXT PRIMARY KEY,
                    data TEXT NOT NULL,
                    request_data TEXT,
                    created REAL DEFAULT (unixepoch())
                )
                """
            )
            columns = {
                row[1]
                for row in conn.execute("PRAGMA table_info(jobs)").fetchall()
            }
            if "request_data" not in columns:
                conn.execute("ALTER TABLE jobs ADD COLUMN request_data TEXT")


class IngestionJobService:
    """Service layer for ingestion job lifecycle management."""

    def __init__(self, repository: Optional[SQLiteIngestionJobRepository] = None) -> None:
        self._repository = repository or SQLiteIngestionJobRepository()

    def start_job(
        self,
        source_code: str,
        total_documents: int,
        *,
        job_id: Optional[str] = None,
        request_data: dict[str, Any] | None = None,
    ) -> IngestionResult:
        result = IngestionResult(
            job_id=job_id or str(uuid.uuid4()),
            source_code=source_code,
            total_documents=total_documents,
            processed_documents=0,
            failed_documents=0,
            total_chunks=0,
            error_log=[],
            status="in_progress",
        )
        return self._repository.save(result, request_data=request_data)

    def complete_job(
        self,
        result: IngestionResult,
        *,
        request_data: dict[str, Any] | None = None,
    ) -> IngestionResult:
        return self._repository.save(result, request_data=request_data)

    def fail_job(
        self,
        *,
        job_id: str,
        source_code: str,
        total_documents: int,
        error: str,
        request_data: dict[str, Any] | None = None,
    ) -> IngestionResult:
        result = IngestionResult(
            job_id=job_id,
            source_code=source_code,
            total_documents=total_documents,
            processed_documents=0,
            failed_documents=total_documents,
            total_chunks=0,
            error_log=[{"error": error}],
            status="failed",
        )
        return self._repository.save(result, request_data=request_data)

    def get_job(self, job_id: str) -> Optional[IngestionResult]:
        return self._repository.get(job_id)

    def list_recent_jobs(self, limit: int = 20) -> list[IngestionResult]:
        return self._repository.list_recent(limit=limit)

    def get_request_data(self, job_id: str) -> dict[str, Any] | None:
        return self._repository.get_request_data(job_id)

    def list_all_job_records(self) -> list[dict[str, Any]]:
        return self._repository.list_all_records()

    def retry_available(self, job_id: str) -> bool:
        return self.get_retry_state(job_id)["available"]

    def get_retry_state(self, job_id: str) -> dict[str, Any]:
        job = self.get_job(job_id)
        if job is None:
            return {"available": False, "reason": "ไม่พบ ingestion job นี้"}

        if self.get_request_data(job_id) is None:
            return {"available": False, "reason": "ไม่มี request payload สำหรับ retry"}

        if job.status == "in_progress":
            return {"available": False, "reason": "job นี้ยังทำงานอยู่"}

        if job.status == "completed":
            return {"available": False, "reason": "job นี้สำเร็จครบแล้ว จึงไม่จำเป็นต้อง retry"}

        if job.status == "failed":
            return {"available": True, "reason": "job ล้มเหลว สามารถ retry ได้"}

        if job.status == "completed_with_errors":
            return {"available": True, "reason": "job สำเร็จบางส่วนและมี error จึงสามารถ retry ได้"}

        return {"available": False, "reason": f"ไม่รองรับ retry สำหรับสถานะ {job.status}"}

    def get_failed_file_paths(self, job_id: str) -> list[str]:
        job = self.get_job(job_id)
        if job is None:
            return []

        failed_paths: list[str] = []
        for entry in job.error_log:
            file_path = entry.get("file_path")
            if isinstance(file_path, str) and file_path not in failed_paths:
                failed_paths.append(file_path)
        return failed_paths

    def get_failed_items_retry_state(self, job_id: str) -> dict[str, Any]:
        job = self.get_job(job_id)
        if job is None:
            return {"available": False, "reason": "ไม่พบ ingestion job นี้"}

        if job.status != "completed_with_errors":
            return {"available": False, "reason": "retry failed items ใช้ได้เฉพาะ job ที่ completed_with_errors"}

        request_data = self.get_request_data(job_id)
        if request_data is None:
            return {"available": False, "reason": "ไม่มี request payload สำหรับ retry failed items"}

        if request_data.get("kind") != "documents":
            return {"available": False, "reason": "retry failed items รองรับเฉพาะ document ingestion"}

        failed_paths = self.get_failed_file_paths(job_id)
        if not failed_paths:
            return {"available": False, "reason": "ไม่พบรายการเอกสารที่ล้มเหลวสำหรับ retry"}

        return {
            "available": True,
            "reason": f"retry ได้เฉพาะ {len(failed_paths)} เอกสารที่ล้มเหลว",
            "failed_file_paths": failed_paths,
        }

    def get_retry_chain(self, job_id: str) -> dict[str, Any] | None:
        records = self.list_all_job_records()
        by_id = {record["job_id"]: record for record in records}
        selected = by_id.get(job_id)
        if selected is None:
            return None

        lineage_ids: list[str] = []
        visited: set[str] = set()
        while True:
            if job_id in visited:
                break
            visited.add(job_id)
            lineage_ids.append(job_id)
            request_data = by_id[job_id].get("request_data") or {}
            parent_id = request_data.get("retry_of")
            if not isinstance(parent_id, str) or parent_id not in by_id:
                break
            job_id = parent_id

        lineage_ids.reverse()
        root_id = lineage_ids[0]

        nodes = []
        for chain_id in lineage_ids:
            record = by_id[chain_id]
            result: IngestionResult = record["result"]
            request_data = record.get("request_data") or {}
            failed_file_paths = []
            for entry in result.error_log:
                file_path = entry.get("file_path")
                if isinstance(file_path, str) and file_path not in failed_file_paths:
                    failed_file_paths.append(file_path)
            nodes.append(
                {
                    "job_id": result.job_id,
                    "created_at": _to_iso_datetime(record.get("created")),
                    "created_timestamp": record.get("created"),
                    "source_code": result.source_code,
                    "status": result.status,
                    "total_documents": result.total_documents,
                    "processed_documents": result.processed_documents,
                    "failed_documents": result.failed_documents,
                    "total_chunks": result.total_chunks,
                    "retry_mode": request_data.get("retry_mode"),
                    "retry_of": request_data.get("retry_of"),
                    "retried_file_count": request_data.get("retried_file_count"),
                    "retried_file_paths": _unique_string_list(request_data.get("file_paths")),
                    "failed_file_paths": failed_file_paths,
                }
            )

        metrics = self._build_retry_chain_metrics(nodes)
        for node in nodes:
            node.pop("created_timestamp", None)

        return {
            "selected_job_id": selected["job_id"],
            "root_job_id": root_id,
            "nodes": nodes,
            "metrics": metrics,
        }

    def _build_retry_chain_metrics(self, nodes: list[dict[str, Any]]) -> dict[str, Any]:
        if not nodes:
            return {
                "total_rounds": 0,
                "retry_rounds": 0,
                "root_failed_file_count": 0,
                "current_remaining_failed_count": 0,
                "total_retried_files": 0,
                "overall_recovery_rate": None,
                "recovery_completed": False,
                "time_to_full_recovery_seconds": None,
                "rounds": [],
            }

        root_node = nodes[0]
        root_created = root_node.get("created_timestamp")
        root_failed_paths = set(_unique_string_list(root_node.get("failed_file_paths")))
        latest_node = nodes[-1]
        latest_failed_paths = set(_unique_string_list(latest_node.get("failed_file_paths")))

        rounds: list[dict[str, Any]] = []
        time_to_full_recovery_seconds: Optional[float] = None

        if root_node.get("status") == "completed" and int(root_node.get("failed_documents") or 0) == 0:
            time_to_full_recovery_seconds = 0.0

        for round_index, node in enumerate(nodes[1:], start=1):
            retried_file_paths = _unique_string_list(node.get("retried_file_paths"))
            retry_failed_set = set(_unique_string_list(node.get("failed_file_paths")))
            retried_file_count = len(retried_file_paths)
            recovered_count = len([path for path in retried_file_paths if path not in retry_failed_set])
            remaining_failed_count = len([path for path in retried_file_paths if path in retry_failed_set])

            created_timestamp = node.get("created_timestamp")
            previous_node = nodes[round_index - 1]
            previous_timestamp = previous_node.get("created_timestamp")

            elapsed_seconds_from_root = (
                float(created_timestamp - root_created)
                if isinstance(created_timestamp, (int, float)) and isinstance(root_created, (int, float))
                else None
            )
            elapsed_seconds_from_previous = (
                float(created_timestamp - previous_timestamp)
                if isinstance(created_timestamp, (int, float)) and isinstance(previous_timestamp, (int, float))
                else None
            )

            if (
                time_to_full_recovery_seconds is None
                and node.get("status") == "completed"
                and int(node.get("failed_documents") or 0) == 0
            ):
                time_to_full_recovery_seconds = elapsed_seconds_from_root

            rounds.append(
                {
                    "round": round_index,
                    "job_id": node.get("job_id"),
                    "retry_mode": node.get("retry_mode"),
                    "retried_file_count": retried_file_count,
                    "recovered_count": recovered_count,
                    "remaining_failed_count": remaining_failed_count,
                    "recovery_rate": (
                        recovered_count / retried_file_count if retried_file_count > 0 else None
                    ),
                    "elapsed_seconds_from_root": elapsed_seconds_from_root,
                    "elapsed_seconds_from_previous": elapsed_seconds_from_previous,
                    "fully_recovered": remaining_failed_count == 0,
                }
            )

        overall_recovery_rate = None
        if root_failed_paths:
            recovered_total = len(root_failed_paths - latest_failed_paths)
            overall_recovery_rate = recovered_total / len(root_failed_paths)

        current_remaining_failed_count = max(
            len(latest_failed_paths),
            int(latest_node.get("failed_documents") or 0),
        )

        return {
            "total_rounds": len(nodes),
            "retry_rounds": len(rounds),
            "root_failed_file_count": len(root_failed_paths),
            "current_remaining_failed_count": current_remaining_failed_count,
            "total_retried_files": sum(int(round_data["retried_file_count"]) for round_data in rounds),
            "overall_recovery_rate": overall_recovery_rate,
            "recovery_completed": current_remaining_failed_count == 0 and len(nodes) > 1,
            "time_to_full_recovery_seconds": time_to_full_recovery_seconds,
            "rounds": rounds,
        }
