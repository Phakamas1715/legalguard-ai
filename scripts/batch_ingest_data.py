"""Build an ingestion manifest for ./data and optionally ingest supported files.

Usage:
    python3 scripts/batch_ingest_data.py
    python3 scripts/batch_ingest_data.py --execute
    python3 scripts/batch_ingest_data.py --manifest-out data/ingestion_manifest.json

Supported execution paths today:
    - PDF corpora via IngestionOrchestrator
    - Structured judgment JSON via shared chunk/embed/upsert flow

Everything else is surfaced in the manifest as manual review or skip.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
import uuid
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, TYPE_CHECKING

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_ROOT = PROJECT_ROOT / "backend"
DATA_ROOT = PROJECT_ROOT / "data"

sys.path.insert(0, str(BACKEND_ROOT))

if TYPE_CHECKING:
    from app.services.bm25_indexer import BM25Indexer
    from app.services.embedding_service import EmbeddingService
    from app.services.ingestion_orchestrator import IngestionOrchestrator, IngestionResult
    from app.services.qdrant_loader import QdrantService
    from app.services.thai_chunker import ThaiChunker

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


@dataclass
class ManifestEntry:
    path: str
    file_type: str
    pipeline: str
    action: str
    source_code: str
    document_type: str
    reason: str

    def to_dict(self) -> dict[str, str]:
        return {
            "path": self.path,
            "file_type": self.file_type,
            "pipeline": self.pipeline,
            "action": self.action,
            "source_code": self.source_code,
            "document_type": self.document_type,
            "reason": self.reason,
        }


SUPPORTED_PDF_SOURCE_CODES = {
    "A1": "court_form",
    "A2": "guide",
    "A7": "reference",
    "B1": "court_form",
    "B2": "guide",
    "B3": "regulation",
}

STRUCTURED_JSON_SOURCES = {
    "court_judgments_sample.json": ("A4.1", "judgment"),
    "case_2568_sample.json": ("A4.9", "judgment"),
}

SKIP_FILENAMES = {
    "ingestion_manifest.json",
    "jobs.db",
    "jobs.db.bak-20260407-demo",
    "mockResults.ts",
    "openlaw_vectors.json",
    "openlaw_fetched.json",
}

COMPLAINT_FORM_KEYWORDS = (
    "คำฟ้อง",
    "ฟ้องด้วยวาจา",
    "ท้ายคำฟ้อง",
    "คำร้อง",
)

SUPPORTING_FORM_KEYWORDS = (
    "บัญชี",
    "ใบ",
    "หมาย",
    "สำนวน",
    "สารบาญ",
    "สารบัญ",
    "คำให้การ",
    "หนังสือ",
    "พยาน",
    "รายงาน",
    "สัญญา",
    "ใบรับ",
    "ปกหน้า",
    "หน้าสำนวน",
)


def _match_dataset_code_by_path(path: Path) -> str | None:
    absolute_path = path if path.is_absolute() else (PROJECT_ROOT / path).resolve()
    rel = absolute_path.relative_to(PROJECT_ROOT).as_posix()
    name = path.name

    if "/A1 แบบฟอร์มและเอกสารทางคดี/" in rel:
        if any(keyword in name for keyword in COMPLAINT_FORM_KEYWORDS):
            return "A1.1"
        if any(keyword in name for keyword in SUPPORTING_FORM_KEYWORDS):
            return "A1.6"
        return "A1.6"

    if "/A2 คู่มือและแนวทางปฏิบัติ/" in rel:
        return "A2.1"

    if "/A7 ข้อมูลอ้างอิงและช่องทางติดต่อ/" in rel:
        if any(keyword in name for keyword in ("ที่อยู่", "เบอร์โทรศัพท์", "เขตอำนาจศาล")):
            return "A7.1"
        if "e-Filing" in name:
            return "A7.2"
        if "ชุมชน" in name:
            return "A7.3"
        return "A7.1"

    if "/B1 แบบฟอร์มและเอกสารทางคดีศาลปกครอง/" in rel:
        if any(keyword in name for keyword in COMPLAINT_FORM_KEYWORDS):
            return "B1.1"
        if any(keyword in name for keyword in SUPPORTING_FORM_KEYWORDS):
            return "B1.6"
        return "B1.6"

    if "/B2 คู่มือและแนวทางปฏิบัติ/" in rel:
        if any(keyword in name for keyword in ("FAQ", "คู่มือสำหรับประชาชน")):
            return "B2.1"
        if any(keyword in name for keyword in ("Flow Chart", "vs", "ขั้นตอนฟ้องคดี")):
            return "B2.2"
        if "พ.ร.บ." in name:
            return "B2.3"
        return "B2.1"

    if "/B3 กฎหมายและระเบียบ/" in rel:
        return "B3.1"

    return None


def infer_source_code(path: Path) -> str:
    name = path.name
    if name in STRUCTURED_JSON_SOURCES:
        return STRUCTURED_JSON_SOURCES[name][0]
    if name == "openlaw_fetched.json":
        return "OPENLAW.cache"
    if name == "openlaw_vectors.json":
        return "OPENLAW.vector-cache"
    matched_code = _match_dataset_code_by_path(path)
    if matched_code:
        return matched_code
    return "LOCAL.misc"


def infer_document_type(path: Path, source_code: str) -> str:
    ext = path.suffix.lower()
    if path.name in STRUCTURED_JSON_SOURCES:
        return STRUCTURED_JSON_SOURCES[path.name][1]
    if ext == ".pdf":
        prefix = source_code.split(".")[0]
        return SUPPORTED_PDF_SOURCE_CODES.get(prefix, "reference")
    if ext in {".jpg", ".jpeg", ".png"}:
        return "image_reference"
    if ext in {".doc", ".docx"}:
        return "office_document"
    if ext in {".xlsx", ".xls"}:
        return "spreadsheet"
    if ext == ".html":
        return "html_reference"
    if ext == ".json":
        return "json_reference"
    return "unknown"


def classify_file(path: Path) -> ManifestEntry:
    absolute_path = path if path.is_absolute() else (PROJECT_ROOT / path).resolve()
    rel_path = absolute_path.relative_to(PROJECT_ROOT).as_posix()
    ext = path.suffix.lower()
    source_code = infer_source_code(path)
    document_type = infer_document_type(path, source_code)

    if path.name in STRUCTURED_JSON_SOURCES:
        return ManifestEntry(
            path=rel_path,
            file_type=ext or "[noext]",
            pipeline="structured_judgment_json",
            action="ingest",
            source_code=source_code,
            document_type=document_type,
            reason="structured legal JSON พร้อมแปลงเป็น chunk และดัชนีค้นหาได้ทันที",
        )

    if path.name in SKIP_FILENAMES:
        return ManifestEntry(
            path=rel_path,
            file_type=ext or "[noext]",
            pipeline="none",
            action="skip",
            source_code=source_code,
            document_type=document_type,
            reason="ไฟล์ระบบ, cache, vector snapshot หรือ artifact ภายใน ไม่ควร ingest เข้าคลังค้นหา",
        )

    if ext == ".pdf":
        prefix = source_code.split(".")[0]
        if prefix in SUPPORTED_PDF_SOURCE_CODES:
            return ManifestEntry(
                path=rel_path,
                file_type=ext,
                pipeline="pdf_rag_pipeline",
                action="ingest",
                source_code=source_code,
                document_type=document_type,
                reason="PDF รองรับการสกัดข้อความ, chunk, mask PII, embed และทำดัชนีได้ใน pipeline ปัจจุบัน",
            )
        return ManifestEntry(
            path=rel_path,
            file_type=ext,
            pipeline="pdf_rag_pipeline",
            action="manual_review",
            source_code=source_code,
            document_type=document_type,
            reason="เป็น PDF แต่ยังไม่แมป source_code ชัดเจนสำหรับ ingest อัตโนมัติ ควรตรวจชุดข้อมูลก่อน",
        )

    if ext in {".jpg", ".jpeg", ".png"}:
        return ManifestEntry(
            path=rel_path,
            file_type=ext,
            pipeline="ocr_candidate",
            action="manual_review",
            source_code=source_code,
            document_type=document_type,
            reason="ไฟล์ภาพต้องผ่าน OCR และตรวจคุณภาพก่อน ingest อัตโนมัติ",
        )

    if ext in {".doc", ".docx", ".xlsx", ".xls", ".html"} or ext == "":
        return ManifestEntry(
            path=rel_path,
            file_type=ext or "[noext]",
            pipeline="office_conversion_required",
            action="manual_review",
            source_code=source_code,
            document_type=document_type,
            reason="ต้องแปลงเป็น PDF/JSON มาตรฐานหรือมี parser เพิ่มก่อนจึง ingest ได้อย่างน่าเชื่อถือ",
        )

    return ManifestEntry(
        path=rel_path,
        file_type=ext or "[noext]",
        pipeline="none",
        action="skip",
        source_code=source_code,
        document_type=document_type,
        reason="ไม่อยู่ใน pipeline การ ingest ปัจจุบันของระบบ",
    )


def build_manifest(data_root: Path = DATA_ROOT) -> dict[str, Any]:
    absolute_root = data_root if data_root.is_absolute() else (PROJECT_ROOT / data_root).resolve()
    entries = [classify_file(path) for path in sorted(absolute_root.rglob("*")) if path.is_file()]
    action_counts = Counter(entry.action for entry in entries)
    pipeline_counts = Counter(entry.pipeline for entry in entries)
    file_type_counts = Counter(entry.file_type for entry in entries)

    return {
        "generated_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "root": str(absolute_root.relative_to(PROJECT_ROOT)),
        "summary": {
            "total_files": len(entries),
            "actions": dict(sorted(action_counts.items())),
            "pipelines": dict(sorted(pipeline_counts.items())),
            "file_types": dict(sorted(file_type_counts.items())),
        },
        "entries": [entry.to_dict() for entry in entries],
    }


def write_manifest(manifest: dict[str, Any], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def build_full_text_from_case(case: dict[str, Any]) -> str:
    if case.get("fullText"):
        return str(case["fullText"])

    parts = [
        f"คดีหมายเลข {case.get('caseNo', '')}",
        case.get("summary", ""),
        f"มาตราที่เกี่ยวข้อง: {', '.join(case.get('statutes', []))}" if case.get("statutes") else "",
    ]
    return "\n".join(part for part in parts if part).strip()


def build_full_text_from_judgment(judgment: dict[str, Any]) -> str:
    parts = [
        f"คำพิพากษา {judgment.get('court', '')}",
        f"คดีหมายเลขดำที่ {judgment.get('case_no_black', '')}",
        f"คดีหมายเลขแดงที่ {judgment.get('case_no_red', '')}",
        f"วันที่ {judgment.get('date', '')}",
        f"ความ{judgment.get('case_type', 'แพ่ง')}",
        f"เรื่อง {judgment.get('subject', '')}",
        f"โจทก์: {judgment.get('plaintiff', '')}",
        f"จำเลย: {judgment.get('defendant', '')}",
        "",
        f"ข้อเท็จจริง: {judgment.get('facts', '')}",
        "",
        f"ประเด็น: {judgment.get('issue', '')}",
        "",
        f"คำพิพากษา: {judgment.get('ruling', '')}",
    ]
    if judgment.get("statutes"):
        parts.append(f"\nมาตราที่เกี่ยวข้อง: {', '.join(judgment['statutes'])}")
    return "\n".join(parts).strip()


def ingest_structured_json(
    json_path: Path,
    source_code: str,
    *,
    chunker: "ThaiChunker",
    embedding_service: "EmbeddingService",
    qdrant_service: "QdrantService",
    bm25_indexer: "BM25Indexer",
) -> "IngestionResult":
    from app.services.ingestion_orchestrator import IngestionResult
    from app.services.pii_masking import mask_pii

    records = json.loads(json_path.read_text(encoding="utf-8"))
    if not isinstance(records, list):
        raise ValueError(f"{json_path} ต้องเป็น list ของเอกสาร")

    qdrant_service.ensure_collection()
    bm25_indexer.ensure_index()

    total_chunks = 0
    failed_documents = 0
    processed_documents = 0
    error_log: list[dict[str, Any]] = []
    job_id = str(uuid.uuid4())

    for index, record in enumerate(records):
        try:
            if not isinstance(record, dict):
                raise ValueError("record ต้องเป็น object")

            text = build_full_text_from_judgment(record) if "case_no_black" in record else build_full_text_from_case(record)
            masked_text, _, _ = mask_pii(text)
            chunks = chunker.chunk(masked_text)
            if not chunks:
                raise ValueError("ไม่สามารถ chunk เอกสารได้")

            embeddings = embedding_service.embed_batch([chunk.text for chunk in chunks])
            kb_id = str(uuid.uuid4())
            qdrant_points = []
            bm25_docs = []

            for chunk_index, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                chunk_id = str(uuid.uuid4())
                title = record.get("subject") or record.get("caseNo") or record.get("id") or json_path.stem
                court_type = record.get("court_type", "unknown")
                year = record.get("year", 0)
                statutes = record.get("statutes", [])
                payload = {
                    "chunk_id": chunk_id,
                    "knowledge_base_id": kb_id,
                    "source_code": source_code,
                    "document_type": "judgment",
                    "case_no": record.get("case_no_black") or record.get("caseNo") or "",
                    "court_type": court_type,
                    "year": year,
                    "statutes": statutes,
                    "chunk_index": chunk_index,
                    "chunk_text": chunk.text,
                    "title": title,
                    "summary": (record.get("summary") or record.get("ruling") or chunk.text[:200]),
                }
                qdrant_points.append({"id": chunk_id, "vector": embedding, "payload": payload})
                bm25_docs.append(
                    {
                        "id": chunk_id,
                        "text": chunk.text,
                        "source_code": source_code,
                        "court_type": court_type,
                        "year": year,
                    }
                )

            qdrant_service.upsert_chunks(qdrant_points)
            bm25_indexer.add_documents(bm25_docs)
            processed_documents += 1
            total_chunks += len(chunks)
        except Exception as exc:
            failed_documents += 1
            error_log.append(
                {
                    "file_path": str(json_path.relative_to(PROJECT_ROOT)),
                    "record_index": index,
                    "error": f"{type(exc).__name__}: {exc}",
                }
            )

    return IngestionResult(
        job_id=job_id,
        source_code=source_code,
        total_documents=len(records),
        processed_documents=processed_documents,
        failed_documents=failed_documents,
        total_chunks=total_chunks,
        error_log=error_log,
        status="completed" if failed_documents == 0 else "completed_with_errors",
    )


async def execute_manifest(
    manifest: dict[str, Any],
    *,
    batch_size: int,
    allowed_pipelines: set[str] | None = None,
    max_files_per_group: int | None = None,
) -> list["IngestionResult"]:
    from app.services.bm25_indexer import BM25Indexer
    from app.services.embedding_service import EmbeddingService
    from app.services.ingestion_job_service import IngestionJobService
    from app.services.ingestion_orchestrator import IngestionOrchestrator, IngestionResult
    from app.services.qdrant_loader import QdrantService
    from app.services.thai_chunker import ThaiChunker

    orchestrator = IngestionOrchestrator()
    job_service = IngestionJobService()
    chunker = ThaiChunker()
    embedding_service = EmbeddingService()
    qdrant_service = QdrantService()
    bm25_indexer = BM25Indexer()

    results: list[IngestionResult] = []
    pdf_groups: dict[str, list[str]] = defaultdict(list)

    for entry in manifest["entries"]:
        if entry["action"] != "ingest":
            continue
        if allowed_pipelines and entry["pipeline"] not in allowed_pipelines:
            continue
        if entry["pipeline"] == "pdf_rag_pipeline":
            pdf_groups[entry["source_code"]].append(entry["path"])

    for source_code, paths in sorted(pdf_groups.items()):
        selected_paths = paths[:max_files_per_group] if max_files_per_group else paths
        logger.info("Ingesting PDF group %s (%d files)", source_code, len(paths))
        result = await orchestrator.ingest_documents(selected_paths, source_code=source_code, batch_size=batch_size)
        job_service.complete_job(
            result,
            request_data={
                "kind": "documents",
                "source_code": source_code,
                "file_paths": selected_paths,
                "batch_size": batch_size,
            },
        )
        results.append(result)

    for entry in manifest["entries"]:
        if entry["action"] != "ingest" or entry["pipeline"] != "structured_judgment_json":
            continue
        if allowed_pipelines and entry["pipeline"] not in allowed_pipelines:
            continue
        path = PROJECT_ROOT / entry["path"]
        logger.info("Ingesting structured JSON %s", entry["path"])
        result = ingest_structured_json(
            path,
            entry["source_code"],
            chunker=chunker,
            embedding_service=embedding_service,
            qdrant_service=qdrant_service,
            bm25_indexer=bm25_indexer,
        )
        job_service.complete_job(
            result,
            request_data={
                "kind": "structured_json",
                "source_code": entry["source_code"],
                "file_paths": [entry["path"]],
                "batch_size": batch_size,
            },
        )
        results.append(result)

    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Build manifest and batch-ingest supported data files.")
    parser.add_argument("--manifest-out", default="data/ingestion_manifest.json", help="output path for manifest JSON")
    parser.add_argument("--execute", action="store_true", help="run ingestion for entries marked as ingest")
    parser.add_argument("--batch-size", type=int, default=50, help="batch size for PDF ingestion")
    parser.add_argument(
        "--pipelines",
        default="",
        help="comma-separated pipeline filters, e.g. structured_judgment_json,pdf_rag_pipeline",
    )
    parser.add_argument(
        "--max-files-per-group",
        type=int,
        default=0,
        help="optional cap per PDF source group for smoke runs",
    )
    args = parser.parse_args()

    manifest = build_manifest(DATA_ROOT)
    manifest_out = PROJECT_ROOT / args.manifest_out
    write_manifest(manifest, manifest_out)

    logger.info("Manifest written to %s", manifest_out)
    logger.info("Summary: %s", json.dumps(manifest["summary"], ensure_ascii=False))

    if not args.execute:
        return

    allowed_pipelines = {item.strip() for item in args.pipelines.split(",") if item.strip()} or None
    max_files_per_group = args.max_files_per_group or None
    results = asyncio.run(
        execute_manifest(
            manifest,
            batch_size=args.batch_size,
            allowed_pipelines=allowed_pipelines,
            max_files_per_group=max_files_per_group,
        )
    )
    logger.info("Executed %d ingestion batches", len(results))
    for result in results:
        logger.info(
            "job=%s source=%s docs=%d processed=%d failed=%d chunks=%d status=%s",
            result.job_id,
            result.source_code,
            result.total_documents,
            result.processed_documents,
            result.failed_documents,
            result.total_chunks,
            result.status,
        )


if __name__ == "__main__":
    main()
