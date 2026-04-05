"""HuggingFace Dataset Loader for LegalGuard AI.

Loads Thai legal datasets from HuggingFace for RAG pipeline:
- WangchanX-Legal-ThaiCCL-RAG (validation)
- WangchanX-Legal-ThaiCCL-Refusal (abstention training)
- ThaiLaw (pythainlp) — full Thai law text
- RAG Thai Laws (iapp)
- Thai Traffic Law / Thai Land Tax (domain-specific)
"""

from __future__ import annotations

import logging
from typing import Optional

from pydantic import BaseModel

logger = logging.getLogger(__name__)

HF_DATASETS = {
    "wangchanx_rag": {
        "name": "airesearch/WangchanX-Legal-ThaiCCL-RAG",
        "use": "validation",
        "description": "Thai legal RAG dataset — Q&A pairs with context",
    },
    "wangchanx_refusal": {
        "name": "panuthept/WangchanX-Legal-ThaiCCL-Refusal",
        "use": "abstention_training",
        "description": "Train AI to refuse answering when unsure",
    },
    "nitibench_ccl": {
        "name": "VISAI-AI/nitibench-ccl",
        "use": "benchmark",
        "description": "NitiBench-CCL: Thai corporate & commercial law QA benchmark (VISAI/EMNLP 2025)",
    },
    "nitibench_statute": {
        "name": "VISAI-AI/nitibench-statute",
        "use": "benchmark",
        "description": "NitiBench statute retrieval benchmark (VISAI)",
    },
    "thailaw": {
        "name": "pythainlp/thailaw",
        "use": "domain_adaptation",
        "description": "Full Thai law text for domain adaptation",
    },
    "rag_thai_laws": {
        "name": "iapp/rag_thai_laws",
        "use": "rag_corpus",
        "description": "Thai laws for RAG pipeline",
    },
    "traffic_law": {
        "name": "Apiwat01/thai-traffic-law-rag",
        "use": "supplementary",
        "description": "Thai traffic law domain-specific",
    },
    "land_tax": {
        "name": "monoboard/thai-land-tax-legal-qa",
        "use": "supplementary",
        "description": "Thai land tax legal QA",
    },
    "open_law_ratchakitcha": {
        "name": "OpenLawDataThailand/ratchakitcha",
        "use": "rag_corpus",
        "description": "Open Law Data Thailand — ราชกิจจานุเบกษา 1.3M+ documents (machine-readable)",
    },
    "thai_law_pythainlp": {
        "name": "PyThaiNLP/thai-law",
        "use": "rag_corpus",
        "description": "Thai Law Dataset (Act of Parliament) from PyThaiNLP",
    },
}

# Typhoon Models on HuggingFace (SCB 10X)
TYPHOON_HF_MODELS = {
    "typhoon_llm": {
        "name": "typhoon-ai/typhoon2.5-qwen3-30b-a3b",
        "type": "llm",
        "params": "30B (3B active)",
        "context": "256k",
        "description": "Thai LLM with function-calling, 256k context",
    },
    "typhoon_translate": {
        "name": "typhoon-ai/typhoon-translate1.5-4b",
        "type": "translation",
        "params": "4B",
        "description": "Thai ↔ English translation",
    },
    "typhoon_ocr": {
        "name": "typhoon-ai/typhoon-ocr1.5-2b",
        "type": "ocr",
        "params": "2B",
        "description": "Thai OCR for handwritten + form documents (แทน EasyOCR)",
    },
    "typhoon_asr": {
        "name": "typhoon-ai/typhoon-asr-realtime",
        "type": "asr",
        "params": "115M",
        "description": "Thai Speech-to-Text realtime (แทน AWS Transcribe)",
    },
}


class HFDatasetRecord(BaseModel):
    text: str = ""
    question: str = ""
    answer: str = ""
    context: str = ""
    source: str = ""
    dataset_name: str = ""


class HFDatasetLoader:
    """Load HuggingFace datasets for LegalGuard AI RAG pipeline."""

    def load_dataset(self, dataset_key: str, split: str = "train", max_records: int = 1000) -> list[HFDatasetRecord]:
        """Load a HuggingFace dataset by key.

        Uses the datasets library. Falls back to API if not installed.
        """
        if dataset_key not in HF_DATASETS:
            logger.error("Unknown dataset key: %s", dataset_key)
            return []

        info = HF_DATASETS[dataset_key]
        dataset_name = info["name"]

        try:
            from datasets import load_dataset
            ds = load_dataset(dataset_name, split=split)
            records = []
            for i, row in enumerate(ds):
                if i >= max_records:
                    break
                records.append(HFDatasetRecord(
                    text=row.get("text", row.get("content", "")),
                    question=row.get("question", row.get("instruction", "")),
                    answer=row.get("answer", row.get("response", row.get("output", ""))),
                    context=row.get("context", ""),
                    source=dataset_name,
                    dataset_name=dataset_key,
                ))
            logger.info("Loaded %d records from %s", len(records), dataset_name)
            return records
        except ImportError:
            logger.warning("datasets library not installed, using API fallback")
            return self._load_via_api(dataset_name, max_records)
        except Exception as e:
            logger.error("Failed to load %s: %s", dataset_name, e)
            return []

    def _load_via_api(self, dataset_name: str, max_records: int) -> list[HFDatasetRecord]:
        """Fallback: load via HuggingFace Datasets Server API."""
        import httpx
        try:
            url = f"https://datasets-server.huggingface.co/rows?dataset={dataset_name}&config=default&split=train&offset=0&length={min(max_records, 100)}"
            resp = httpx.get(url, timeout=30)
            if resp.status_code != 200:
                logger.error("HF API error: %s", resp.status_code)
                return []
            data = resp.json()
            records = []
            for row_data in data.get("rows", []):
                row = row_data.get("row", {})
                records.append(HFDatasetRecord(
                    text=row.get("text", row.get("content", str(row)[:500])),
                    source=dataset_name,
                    dataset_name=dataset_name,
                ))
            return records
        except Exception as e:
            logger.error("HF API fallback failed: %s", e)
            return []

    def load_all_for_rag(self, max_per_dataset: int = 500) -> list[HFDatasetRecord]:
        """Load all RAG-relevant datasets."""
        all_records = []
        for key, info in HF_DATASETS.items():
            if info["use"] in ("rag_corpus", "domain_adaptation", "validation"):
                records = self.load_dataset(key, max_records=max_per_dataset)
                all_records.extend(records)
        logger.info("Total HF records loaded for RAG: %d", len(all_records))
        return all_records

    def load_refusal_dataset(self, max_records: int = 500) -> list[HFDatasetRecord]:
        """Load the refusal/abstention training dataset."""
        return self.load_dataset("wangchanx_refusal", max_records=max_records)
