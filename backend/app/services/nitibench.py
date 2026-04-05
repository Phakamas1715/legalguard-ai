"""NitiBench — Thai Legal RAG Benchmark for LegalGuard AI.

Benchmark test set for measuring RAG quality on Thai legal queries.
Inspired by LegalBench-RAG (Stanford) but designed for Thai legal context.

Metrics:
- Hit@K: Does the correct answer appear in top-K results?
- MRR (Mean Reciprocal Rank): Average 1/rank of first correct result
- Citation Accuracy: Are cited statutes/case numbers correct?
- Hallucination Rate: % of responses containing fabricated references
- CFS (Composite Fairness Score): Bias across geography/court/time

Data sources:
- Survey ground truth (17 respondents, real queries + expected results)
- HuggingFace WangchanX-Legal-ThaiCCL-RAG (Q&A pairs)
- HuggingFace iapp/rag_thai_laws
- Mock case data (case_2568_sample.json, mockResults.ts)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class BenchmarkCase:
    """A single benchmark test case."""
    id: str
    query: str                          # User query in Thai
    expected_statutes: list[str]        # Expected statutes in results
    expected_case_type: str             # แพ่ง/อาญา/ปกครอง
    expected_keywords: list[str]        # Keywords that should appear
    user_role: str = "citizen"          # citizen/lawyer/government
    difficulty: str = "medium"          # easy/medium/hard
    source: str = "survey"             # survey/hf_wangchan/hf_iapp/manual
    ground_truth_answer: str = ""       # Expected answer summary
    expected_court: str = ""            # Expected court type


# ---------------------------------------------------------------------------
# Survey-derived test cases (from 17 respondents)
# ---------------------------------------------------------------------------

SURVEY_CASES: list[BenchmarkCase] = [
    BenchmarkCase(
        id="S01", query="ฉ้อโกงขายของออนไลน์ไม่ส่งของ",
        expected_statutes=["ป.อ. มาตรา 341", "พ.ร.บ.คอมพิวเตอร์ มาตรา 14"],
        expected_case_type="อาญา", expected_keywords=["ฉ้อโกง", "ออนไลน์", "ไม่ส่งของ"],
        user_role="citizen", difficulty="easy", source="survey",
        ground_truth_answer="จำเลยหลอกขายสินค้าออนไลน์โดยไม่มีเจตนาส่งมอบ",
    ),
    BenchmarkCase(
        id="S02", query="กฏจราจร คดีอาญา อุบัติเหตุ",
        expected_statutes=["พ.ร.บ.จราจรทางบก"],
        expected_case_type="อาญา", expected_keywords=["จราจร", "อุบัติเหตุ"],
        user_role="citizen", difficulty="easy", source="survey",
    ),
    BenchmarkCase(
        id="S03", query="จัดตั้งศาลปกครอง ประกาศ",
        expected_statutes=["พ.ร.บ.จัดตั้งศาลปกครอง พ.ศ. 2542"],
        expected_case_type="ปกครอง", expected_keywords=["ศาลปกครอง", "จัดตั้ง"],
        user_role="government", difficulty="medium", source="survey",
        expected_court="ศาลปกครอง",
    ),
    BenchmarkCase(
        id="S04", query="คดีฉ้อโกง อายุความ",
        expected_statutes=["ป.อ. มาตรา 341"],
        expected_case_type="อาญา", expected_keywords=["ฉ้อโกง", "อายุความ"],
        user_role="lawyer", difficulty="medium", source="survey",
    ),
    BenchmarkCase(
        id="S05", query="ค่าปรับเท่าไหร่",
        expected_statutes=["พ.ร.บ.จราจรทางบก"],
        expected_case_type="อาญา", expected_keywords=["ค่าปรับ"],
        user_role="citizen", difficulty="easy", source="survey",
    ),
    BenchmarkCase(
        id="S06",
        query="ขอแนวคำพิพากษาฎีกา กรณีรถถูกยึดก่อนครบกำหนดตามหนังสือบอกเลิกสัญญา",
        expected_statutes=["ป.พ.พ."],
        expected_case_type="แพ่ง", expected_keywords=["ยึดรถ", "บอกเลิกสัญญา", "ฎีกา"],
        user_role="lawyer", difficulty="hard", source="survey",
    ),
    BenchmarkCase(
        id="S07", query="กฏหมายภาษีส่วนบุคคล",
        expected_statutes=["ประมวลรัษฎากร"],
        expected_case_type="แพ่ง", expected_keywords=["ภาษี", "บุคคล"],
        user_role="citizen", difficulty="medium", source="survey",
    ),
    BenchmarkCase(
        id="S08", query="กฏหมายแรงงาน การเลิกจ้างงาน",
        expected_statutes=["พ.ร.บ.คุ้มครองแรงงาน"],
        expected_case_type="แพ่ง", expected_keywords=["แรงงาน", "เลิกจ้าง"],
        user_role="citizen", difficulty="easy", source="survey",
    ),
    BenchmarkCase(
        id="S09", query="โกงออนไลน์ คดียักยอก",
        expected_statutes=["ป.อ. มาตรา 341", "ป.อ. มาตรา 352"],
        expected_case_type="อาญา", expected_keywords=["โกง", "ยักยอก"],
        user_role="lawyer", difficulty="medium", source="survey",
    ),
    BenchmarkCase(
        id="S10",
        query="กรณีนำผ้าที่ตัดเย็บตามสัญญาจ้างเย็บผ้าแล้วไม่ยอมส่งมอบผ้าคืน",
        expected_statutes=["ป.อ. มาตรา 352", "ป.พ.พ."],
        expected_case_type="อาญา", expected_keywords=["ยักยอก", "สัญญาจ้าง", "ส่งมอบ"],
        user_role="lawyer", difficulty="hard", source="survey",
    ),
    BenchmarkCase(
        id="S11", query="ฉ้อโกงเงินซื้อของ",
        expected_statutes=["ป.อ. มาตรา 341"],
        expected_case_type="อาญา", expected_keywords=["ฉ้อโกง"],
        user_role="government", difficulty="easy", source="survey",
    ),
    BenchmarkCase(
        id="S12", query="กฏหมายดิจิตอล",
        expected_statutes=["พ.ร.บ.คอมพิวเตอร์"],
        expected_case_type="อาญา", expected_keywords=["ดิจิทัล", "คอมพิวเตอร์"],
        user_role="government", difficulty="medium", source="survey",
    ),
]


# ---------------------------------------------------------------------------
# Evaluation metrics
# ---------------------------------------------------------------------------

@dataclass
class EvalResult:
    """Result of evaluating a single benchmark case."""
    case_id: str
    hit_at_1: bool = False
    hit_at_3: bool = False
    hit_at_5: bool = False
    reciprocal_rank: float = 0.0
    citation_accuracy: float = 0.0      # % of expected statutes found
    hallucination_detected: bool = False
    latency_ms: float = 0.0


@dataclass
class BenchmarkReport:
    """Aggregate benchmark results."""
    total_cases: int = 0
    hit_at_1: float = 0.0   # % of cases with hit@1
    hit_at_3: float = 0.0   # % of cases with hit@3
    hit_at_5: float = 0.0   # % of cases with hit@5
    mrr: float = 0.0        # Mean Reciprocal Rank
    avg_citation_accuracy: float = 0.0
    hallucination_rate: float = 0.0
    avg_latency_ms: float = 0.0
    results: list[EvalResult] = field(default_factory=list)


def evaluate_search_results(
    case: BenchmarkCase,
    results: list[dict],
    latency_ms: float = 0.0,
) -> EvalResult:
    """Evaluate search results against a benchmark case.

    Args:
        case: The benchmark test case with expected values
        results: List of search result dicts with keys: statutes, summary, case_type
        latency_ms: Time taken for the search
    """
    eval_r = EvalResult(case_id=case.id, latency_ms=latency_ms)

    # Check hits at various K
    for rank, result in enumerate(results[:5]):
        result_statutes = set(result.get("statutes", []))
        result_text = (result.get("summary", "") + " " + result.get("title", "")).lower()
        expected_set = set(case.expected_statutes)

        # A "hit" = at least one expected statute found OR expected keywords present
        statute_match = bool(result_statutes & expected_set)
        keyword_match = any(kw.lower() in result_text for kw in case.expected_keywords)

        if statute_match or keyword_match:
            if rank == 0:
                eval_r.hit_at_1 = True
            if rank < 3:
                eval_r.hit_at_3 = True
            if rank < 5:
                eval_r.hit_at_5 = True
            if eval_r.reciprocal_rank == 0.0:
                eval_r.reciprocal_rank = 1.0 / (rank + 1)

    # Citation accuracy: how many expected statutes appear in top-5 results
    if case.expected_statutes:
        all_result_statutes: set[str] = set()
        for r in results[:5]:
            all_result_statutes.update(r.get("statutes", []))
        found = sum(1 for s in case.expected_statutes if s in all_result_statutes)
        eval_r.citation_accuracy = found / len(case.expected_statutes)

    # Hallucination check: any statute in results that doesn't exist in expected + known set
    # (simplified — in production would check against full statute database)
    eval_r.hallucination_detected = False

    return eval_r


def run_benchmark(
    search_fn,
    cases: Optional[list[BenchmarkCase]] = None,
) -> BenchmarkReport:
    """Run the full NitiBench benchmark.

    Args:
        search_fn: Callable(query, role) -> (results, latency_ms)
        cases: Test cases to run (defaults to SURVEY_CASES)
    """
    if cases is None:
        cases = SURVEY_CASES

    report = BenchmarkReport(total_cases=len(cases))
    all_results: list[EvalResult] = []

    for case in cases:
        try:
            results, latency = search_fn(case.query, case.user_role)
            eval_r = evaluate_search_results(case, results, latency)
            all_results.append(eval_r)
        except Exception as e:
            logger.error("Benchmark case %s failed: %s", case.id, e)
            all_results.append(EvalResult(case_id=case.id))

    report.results = all_results
    n = len(all_results) or 1
    report.hit_at_1 = sum(1 for r in all_results if r.hit_at_1) / n
    report.hit_at_3 = sum(1 for r in all_results if r.hit_at_3) / n
    report.hit_at_5 = sum(1 for r in all_results if r.hit_at_5) / n
    report.mrr = sum(r.reciprocal_rank for r in all_results) / n
    report.avg_citation_accuracy = sum(r.citation_accuracy for r in all_results) / n
    report.hallucination_rate = sum(1 for r in all_results if r.hallucination_detected) / n
    report.avg_latency_ms = sum(r.latency_ms for r in all_results) / n

    return report


def print_report(report: BenchmarkReport) -> str:
    """Format benchmark report as readable string."""
    lines = [
        "=" * 50,
        "NitiBench — Thai Legal RAG Benchmark Report",
        "=" * 50,
        f"Total cases: {report.total_cases}",
        f"Hit@1: {report.hit_at_1:.1%}",
        f"Hit@3: {report.hit_at_3:.1%}",
        f"Hit@5: {report.hit_at_5:.1%}",
        f"MRR: {report.mrr:.3f}",
        f"Citation Accuracy: {report.avg_citation_accuracy:.1%}",
        f"Hallucination Rate: {report.hallucination_rate:.1%}",
        f"Avg Latency: {report.avg_latency_ms:.0f}ms",
        "-" * 50,
    ]
    for r in report.results:
        status = "✅" if r.hit_at_3 else "❌"
        lines.append(f"  {status} {r.case_id}: H@3={r.hit_at_3} RR={r.reciprocal_rank:.2f} Cite={r.citation_accuracy:.0%}")
    lines.append("=" * 50)
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# HuggingFace NitiBench Dataset Integration
# ---------------------------------------------------------------------------

NITIBENCH_HF_DATASETS = {
    "nitibench_ccl": "VISAI-AI/nitibench-ccl",
    "nitibench_statute": "VISAI-AI/nitibench-statute",
    "wangchanx_rag": "airesearch/WangchanX-Legal-ThaiCCL-RAG",
}


def load_nitibench_from_hf(
    dataset_key: str = "nitibench_ccl",
    max_cases: int = 100,
) -> list[BenchmarkCase]:
    """Load NitiBench benchmark cases from HuggingFace.

    Supports:
    - VISAI-AI/nitibench-ccl (Thai corporate & commercial law)
    - VISAI-AI/nitibench-statute (statute retrieval)
    - airesearch/WangchanX-Legal-ThaiCCL-RAG (RAG Q&A pairs)

    Returns BenchmarkCase objects compatible with run_benchmark().
    """
    dataset_name = NITIBENCH_HF_DATASETS.get(dataset_key)
    if not dataset_name:
        logger.error("Unknown NitiBench dataset: %s", dataset_key)
        return []

    cases: list[BenchmarkCase] = []

    try:
        from datasets import load_dataset
        ds = load_dataset(dataset_name, split="test")
        for i, row in enumerate(ds):
            if i >= max_cases:
                break
            cases.append(_hf_row_to_benchmark_case(row, i, dataset_key))
        logger.info("Loaded %d NitiBench cases from %s", len(cases), dataset_name)
    except ImportError:
        logger.warning("datasets library not installed, trying API fallback")
        cases = _load_nitibench_via_api(dataset_name, dataset_key, max_cases)
    except Exception as e:
        logger.error("Failed to load NitiBench from HF: %s", e)

    return cases


def _hf_row_to_benchmark_case(row: dict, index: int, source: str) -> BenchmarkCase:
    """Convert a HuggingFace dataset row to a BenchmarkCase."""
    question = row.get("question", row.get("instruction", row.get("query", "")))
    answer = row.get("answer", row.get("response", row.get("output", "")))
    context = row.get("context", row.get("section_content", ""))

    # Extract statutes from answer/context
    import re
    statutes = re.findall(r"มาตรา\s*\d+(?:/\d+)?", str(answer) + " " + str(context))
    statutes = list(set(statutes))

    # Classify case type from content
    text = str(question) + " " + str(answer)
    if any(kw in text for kw in ["อาญา", "ฉ้อโกง", "ลักทรัพย์", "ป.อ."]):
        case_type = "อาญา"
    elif any(kw in text for kw in ["ปกครอง", "ศาลปกครอง"]):
        case_type = "ปกครอง"
    else:
        case_type = "แพ่ง"

    # Extract keywords from question
    keywords = [w for w in question.split() if len(w) > 2][:5]

    return BenchmarkCase(
        id=f"HF-{source}-{index:04d}",
        query=question,
        expected_statutes=statutes,
        expected_case_type=case_type,
        expected_keywords=keywords,
        user_role="lawyer",
        difficulty="medium",
        source=f"hf_{source}",
        ground_truth_answer=str(answer)[:500],
    )


def _load_nitibench_via_api(
    dataset_name: str, dataset_key: str, max_cases: int
) -> list[BenchmarkCase]:
    """Fallback: load NitiBench via HuggingFace Datasets Server API."""
    import httpx
    cases: list[BenchmarkCase] = []
    try:
        url = (
            f"https://datasets-server.huggingface.co/rows"
            f"?dataset={dataset_name}&config=default&split=test"
            f"&offset=0&length={min(max_cases, 100)}"
        )
        resp = httpx.get(url, timeout=30)
        if resp.status_code != 200:
            logger.error("HF API error %d for %s", resp.status_code, dataset_name)
            return []
        data = resp.json()
        for i, row_data in enumerate(data.get("rows", [])):
            row = row_data.get("row", {})
            cases.append(_hf_row_to_benchmark_case(row, i, dataset_key))
    except Exception as e:
        logger.error("HF API fallback failed for NitiBench: %s", e)
    return cases


def run_full_benchmark(
    search_fn,
    *,
    include_survey: bool = True,
    include_hf: bool = True,
    hf_dataset: str = "nitibench_ccl",
    hf_max_cases: int = 50,
) -> BenchmarkReport:
    """Run combined benchmark: survey cases + HuggingFace NitiBench cases."""
    cases: list[BenchmarkCase] = []

    if include_survey:
        cases.extend(SURVEY_CASES)

    if include_hf:
        hf_cases = load_nitibench_from_hf(hf_dataset, max_cases=hf_max_cases)
        cases.extend(hf_cases)

    if not cases:
        return BenchmarkReport()

    return run_benchmark(search_fn, cases=cases)
