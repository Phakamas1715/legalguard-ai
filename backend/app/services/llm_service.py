"""LLM Service — server-side AI calls with Thai model support.

Provider chain (in order):
  1. Amazon Bedrock Claude — primary, data stays in AWS ap-southeast-1
  2. Typhoon (SCB 10X) — typhoon-v2-70b-instruct, Thai-specific
  3. SeaLLM-7B-v2 — HuggingFace Inference API (Southeast Asian LLM)
  4. Anthropic Claude — direct API fallback
  5. Ollama (Local) — data never leaves VPC, last-resort fallback

API keys are read from environment variables only — never exposed to the browser.

References:
- Lewis et al. (2020) "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"
- SeaLLMs/SeaLLM-7B-v2: Zhang et al. (2024) "SeaLLMs for Southeast Asia"
"""
from __future__ import annotations

from __future__ import annotations

import json
import logging
import os
from typing import AsyncIterator

import httpx

logger = logging.getLogger(__name__)

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
TYPHOON_URL = "https://api.opentyphoon.ai/v1/chat/completions"
HF_INFERENCE_URL = "https://api-inference.huggingface.co/models/{model}/v1/chat/completions"
SEALLM_MODEL = "SeaLLMs/SeaLLM-7B-v2"
TYPHOON_CHAT_MODEL = "typhoon-v2-70b-instruct"

SYSTEM_PROMPT = """คุณเป็น "น้องซื่อสัตย์" ผู้ช่วย AI ด้านกฎหมายไทย ระบบ Smart LegalGuard AI

กรอบ Anti-Hallucination 7 ชั้น:
1. ตอบจากข้อมูลกฎหมายไทยจริงเท่านั้น อ้างอิงมาตราและเลขคดีจริง
2. ถ้าไม่แน่ใจ ต้องบอกว่า "ยังไม่ได้รับการยืนยัน กรุณาตรวจสอบกับทนายความ"
3. ถ้าไม่มีข้อมูล ตอบว่า "ไม่พบข้อมูลที่เกี่ยวข้อง กรุณาปรึกษาทนายความ"
4. ห้ามแสดงความมั่นใจเกิน 90%
5. ลงท้ายทุกคำตอบด้วย "⚖️ ข้อมูลเบื้องต้นเท่านั้น กรุณาปรึกษาทนายความสำหรับกรณีจริง"
6. ตอบเป็นภาษาไทยที่เข้าใจง่าย อ้างอิงมาตรากฎหมายเสมอ
7. ห้ามให้คำแนะนำนอกขอบเขตกฎหมาย"""


# ---------------------------------------------------------------------------
# Key helpers
# ---------------------------------------------------------------------------


def _bedrock_region() -> str:
    return os.getenv("AWS_REGION", "ap-southeast-1")


def _bedrock_model() -> str:
    return os.getenv("BEDROCK_MODEL", "anthropic.claude-3-5-sonnet-20241022-v2:0")


def _bedrock_token() -> str:
    return os.getenv("AWS_BEARER_TOKEN_BEDROCK", "")


def _typhoon_key() -> str:
    return os.getenv("TYPHOON_API_KEY", "")


def _hf_token() -> str:
    return os.getenv("HUGGINGFACE_TOKEN", "")


def _anthropic_key() -> str:
    return os.getenv("ANTHROPIC_API_KEY", "")


def _ollama_url() -> str:
    return os.getenv("OLLAMA_URL", "http://localhost:11434")


def _ollama_model() -> str:
    return os.getenv("OLLAMA_MODEL", "llama3.2")


# ---------------------------------------------------------------------------
# Single-shot LLM call
# ---------------------------------------------------------------------------


async def call_llm(messages: list[dict], system: str = SYSTEM_PROMPT) -> str:
    """Single-shot LLM call.

    Provider chain: Bedrock Claude → Typhoon → SeaLLM → Anthropic → Ollama
    """
    # 1. Amazon Bedrock Claude (primary — data stays in AWS)
    if _bedrock_token():
        try:
            result = await _call_bedrock(messages, system)
            if result:
                return result
        except Exception:
            logger.exception("Bedrock Claude failed, trying Typhoon")

    # 2. Typhoon (SCB 10X) — Thai-specific LLM
    if _typhoon_key():
        try:
            result = await _call_typhoon(messages, system)
            if result:
                return result
        except Exception:
            logger.exception("Typhoon failed, trying SeaLLM")

    # 3. SeaLLM-7B-v2 — Southeast Asian LLM
    if _hf_token():
        try:
            result = await _call_seallm(messages, system)
            if result:
                return result
        except Exception:
            logger.exception("SeaLLM failed, trying Anthropic direct")

    # 4. Anthropic Claude (direct API fallback)
    if _anthropic_key():
        try:
            result = await _call_anthropic(messages, system)
            if result:
                return result
        except Exception:
            logger.exception("Anthropic failed, trying Ollama")

    # 5. Ollama (Local) — data never leaves VPC
    try:
        result = await _call_ollama(messages, system)
        if result:
            return result
    except Exception:
        logger.exception("Ollama failed — all providers exhausted")

    return ""


# ---------------------------------------------------------------------------
# Provider implementations
# ---------------------------------------------------------------------------


async def _call_bedrock(messages: list[dict], system: str) -> str:
    """Call Amazon Bedrock Claude — data stays in ap-southeast-1."""
    try:
        import boto3

        client = boto3.client("bedrock-runtime", region_name=_bedrock_region())

        # Build Bedrock messages format
        bedrock_messages = []
        for m in messages:
            bedrock_messages.append({
                "role": m.get("role", "user"),
                "content": [{"type": "text", "text": m.get("content", "")}],
            })

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1024,
            "system": system,
            "messages": bedrock_messages,
            "temperature": 0.3,
        })

        response = client.invoke_model(
            modelId=_bedrock_model(),
            contentType="application/json",
            accept="application/json",
            body=body,
        )

        resp_body = json.loads(response["body"].read())
        return resp_body["content"][0]["text"]
    except ImportError:
        logger.warning("boto3 not available for Bedrock")
        return ""


async def _call_typhoon(messages: list[dict], system: str) -> str:
    """Call Typhoon v2 70B (SCB 10X) — Thai-optimised LLM."""
    async with httpx.AsyncClient(timeout=45) as client:
        resp = await client.post(
            TYPHOON_URL,
            headers={
                "Authorization": f"Bearer {_typhoon_key()}",
                "Content-Type": "application/json",
            },
            json={
                "model": TYPHOON_CHAT_MODEL,
                "messages": [{"role": "system", "content": system}, *messages],
                "max_tokens": 1024,
                "temperature": 0.3,
            },
        )
        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"]
        logger.warning("Typhoon HTTP %d: %s", resp.status_code, resp.text[:200])
        return ""


async def _call_seallm(messages: list[dict], system: str) -> str:
    """Call SeaLLM-7B-v2 via HuggingFace Inference API."""
    url = HF_INFERENCE_URL.format(model=SEALLM_MODEL)
    async with httpx.AsyncClient(timeout=45) as client:
        resp = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {_hf_token()}",
                "Content-Type": "application/json",
            },
            json={
                "model": SEALLM_MODEL,
                "messages": [{"role": "system", "content": system}, *messages],
                "max_tokens": 1024,
                "temperature": 0.3,
            },
        )
        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"]
        logger.warning("SeaLLM HTTP %d: %s", resp.status_code, resp.text[:200])
        return ""


async def _call_anthropic(messages: list[dict], system: str) -> str:
    """Call Anthropic Claude direct API."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            ANTHROPIC_URL,
            headers={
                "x-api-key": _anthropic_key(),
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "system": system,
                "messages": messages,
                "max_tokens": 1024,
            },
        )
        if resp.status_code == 200:
            return resp.json()["content"][0]["text"]
        logger.warning("Anthropic HTTP %d: %s", resp.status_code, resp.text[:200])
        return ""


async def _call_ollama(messages: list[dict], system: str) -> str:
    """Call Ollama local LLM — data never leaves the VPC."""
    url = f"{_ollama_url()}/api/chat"
    ollama_messages = [{"role": "system", "content": system}]
    for m in messages:
        ollama_messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            url,
            json={"model": _ollama_model(), "messages": ollama_messages, "stream": False},
        )
        if resp.status_code == 200:
            return resp.json().get("message", {}).get("content", "")
        logger.warning("Ollama HTTP %d: %s", resp.status_code, resp.text[:200])
        return ""


# ---------------------------------------------------------------------------
# Streaming SSE — Bedrock primary, Typhoon/SeaLLM fallback
# ---------------------------------------------------------------------------


async def stream_llm(messages: list[dict], system: str = SYSTEM_PROMPT) -> AsyncIterator[str]:
    """Streaming SSE for judgment drafting.

    Tries Bedrock streaming → Typhoon → SeaLLM → error message.
    """
    # 1. Try Typhoon streaming (OpenAI-compatible, easiest SSE)
    if _typhoon_key():
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                async with client.stream(
                    "POST",
                    TYPHOON_URL,
                    headers={
                        "Authorization": f"Bearer {_typhoon_key()}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": TYPHOON_CHAT_MODEL,
                        "stream": True,
                        "messages": [{"role": "system", "content": system}, *messages],
                        "max_tokens": 2048,
                        "temperature": 0.3,
                    },
                ) as response:
                    async for chunk in response.aiter_text():
                        if chunk:
                            yield chunk
            return
        except Exception:
            logger.exception("Typhoon streaming failed, trying SeaLLM")

    # 2. Try SeaLLM streaming via HF
    if _hf_token():
        try:
            url = HF_INFERENCE_URL.format(model=SEALLM_MODEL)
            async with httpx.AsyncClient(timeout=60) as client:
                async with client.stream(
                    "POST",
                    url,
                    headers={
                        "Authorization": f"Bearer {_hf_token()}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": SEALLM_MODEL,
                        "stream": True,
                        "messages": [{"role": "system", "content": system}, *messages],
                        "max_tokens": 2048,
                        "temperature": 0.3,
                    },
                ) as response:
                    async for chunk in response.aiter_text():
                        if chunk:
                            yield chunk
            return
        except Exception:
            logger.exception("SeaLLM streaming failed")

    # 3. Fallback: non-streaming call → wrap as SSE
    result = await call_llm(messages, system)
    if result:
        yield f'data: {{"choices":[{{"delta":{{"content":"{result[:2000]}"}}}}]}}\n\n'
    else:
        yield 'data: {"choices":[{"delta":{"content":"ไม่พบ LLM provider กรุณาตั้งค่า AWS_BEARER_TOKEN_BEDROCK หรือ TYPHOON_API_KEY"}}]}\n\n'
    yield "data: [DONE]\n\n"
