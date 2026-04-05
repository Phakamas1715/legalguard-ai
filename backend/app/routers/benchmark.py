"""NitiBench Benchmark API — run and view Thai Legal RAG benchmarks.

Endpoints:
  GET  /benchmark/cases       — List all benchmark test cases
  POST /benchmark/run         — Run benchmark against search pipeline
  GET  /benchmark/datasets    — List available HuggingFace datasets
  POST /benchmark/load-hf     — Load benchmark cases from HuggingFace
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.nitibench import (
    SURVEY_CASES,
    BenchmarkCase,
    BenchmarkReport,
    EvalResult,
    evaluate_search_results,
    load_nitibench_from_hf,
    print_report,
    run_benchmark,
    NITIBENCH_HF_DATASETS,
)

router = APIRouter(prefix="/benchmark", tags=["benchmark"])


class RunBenchmarkRequest(BaseModel):
    include_survey: bool = True
    include_hf: bool = False
    hf_dataset: str = "nitibench_ccl"
    hf_max_cases: int = 50


class LoadHFRequest(BaseModel):
    dataset_key: str = "nitibench_ccl"
    max_cases: int = 50


@router.get("/cases")
async def list_cases():
    """List all built-in survey benchmark test cases."""
    return {
        "total": len(SURVEY_CASES),
        "cases": [
            {
                "id": c.id,
                "query": c.query,
                "expected_statutes": c.expected_statutes,
                "expected_case_type": c.expected_case_type,
                "expected_keywords": c.expected_keywords,
                "user_role": c.user_role,
                "difficulty": c.difficulty,
                "source": c.source,
            }
            for c in SURVEY_CASES
        ],
    }


@router.get("/datasets")
async def list_datasets():
    """List available HuggingFace NitiBench datasets."""
    return {
        "datasets": {
            key: {"name": name, "description": _dataset_desc(key)}
            for key, name in NITIBENCH_HF_DATASETS.items()
        }
    }


@router.post("/load-hf")
async def load_hf_cases(req: LoadHFRequest):
    """Load benchmark cases from HuggingFace dataset."""
    cases = load_nitibench_from_hf(req.dataset_key, max_cases=req.max_cases)
    return {
        "dataset": req.dataset_key,
        "loaded": len(cases),
        "cases": [
            {
                "id": c.id,
                "query": c.query,
                "expected_statutes": c.expected_statutes,
                "expected_case_type": c.expected_case_type,
                "difficulty": c.difficulty,
                "source": c.source,
                "ground_truth_answer": c.ground_truth_answer[:200] if c.ground_truth_answer else "",
            }
            for c in cases
        ],
    }


@router.post("/run")
async def run_benchmark_endpoint(req: RunBenchmarkRequest):
    """Run NitiBench benchmark against the search pipeline.

    Returns Hit@K, MRR, Citation Accuracy, Hallucination Rate.
    """
    from app.services.search_pipeline import SearchPipeline, SearchRequest
    import time

    pipeline = SearchPipeline()

    # Collect cases
    cases: list[BenchmarkCase] = []
    if req.include_survey:
        cases.extend(SURVEY_CASES)
    if req.include_hf:
        hf_cases = load_nitibench_from_hf(req.hf_dataset, max_cases=req.hf_max_cases)
        cases.extend(hf_cases)

    if not cases:
        return {"error": "No benchmark cases to run"}

    # Run each case through search pipeline
    all_results: list[EvalResult] = []
    for case in cases:
        start = time.perf_counter()
        try:
            search_req = SearchRequest(query=case.query, role=case.user_role, top_k=5)
            resp = await pipeline.search(search_req)
            results = [
                {
                    "statutes": r.statutes,
                    "summary": r.summary,
                    "title": r.title,
                    "case_no": r.case_no,
                }
                for r in resp.results
            ]
            latency = (time.perf_counter() - start) * 1000
            eval_r = evaluate_search_results(case, results, latency)
        except Exception as e:
            eval_r = EvalResult(case_id=case.id)
        all_results.append(eval_r)

    # Aggregate
    n = len(all_results) or 1
    report = {
        "total_cases": len(cases),
        "hit_at_1": round(sum(1 for r in all_results if r.hit_at_1) / n, 4),
        "hit_at_3": round(sum(1 for r in all_results if r.hit_at_3) / n, 4),
        "hit_at_5": round(sum(1 for r in all_results if r.hit_at_5) / n, 4),
        "mrr": round(sum(r.reciprocal_rank for r in all_results) / n, 4),
        "avg_citation_accuracy": round(sum(r.citation_accuracy for r in all_results) / n, 4),
        "hallucination_rate": round(sum(1 for r in all_results if r.hallucination_detected) / n, 4),
        "avg_latency_ms": round(sum(r.latency_ms for r in all_results) / n, 2),
        "results": [
            {
                "case_id": r.case_id,
                "hit_at_1": r.hit_at_1,
                "hit_at_3": r.hit_at_3,
                "hit_at_5": r.hit_at_5,
                "reciprocal_rank": round(r.reciprocal_rank, 4),
                "citation_accuracy": round(r.citation_accuracy, 4),
                "latency_ms": round(r.latency_ms, 2),
            }
            for r in all_results
        ],
    }

    return report


def _dataset_desc(key: str) -> str:
    descs = {
        "nitibench_ccl": "Thai corporate & commercial law QA (VISAI/EMNLP 2025)",
        "nitibench_statute": "Statute retrieval benchmark (VISAI)",
        "wangchanx_rag": "WangchanX Legal ThaiCCL RAG Q&A pairs",
    }
    return descs.get(key, "")
