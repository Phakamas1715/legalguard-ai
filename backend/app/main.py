from __future__ import annotations
from pathlib import Path

from dotenv import load_dotenv

# Load backend/.env (server-side secrets — never bundled into browser JS)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.middleware.security import SecurityMiddleware
from app.routers import chat, complaint, dashboard, ingest, judgment, predict, search, stt, tracking
from app.routers import responsible_ai
from app.routers import graph
from app.routers import benchmark
from app.routers import geocoder
from app.routers import glossary
from app.routers import prompts
from app.routers import agent

app = FastAPI(
    title="LegalGuard AI Backend",
    description="Smart Court AI Enhancement — RAG-based legal AI backend",
    version="0.1.0",
)

import os

_cors_origins_str = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:4173",
)
_cors_origins = [o.strip() for o in _cors_origins_str.split(",") if o.strip()]
_local_origin_regex = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"

app.add_middleware(SecurityMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=_local_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-User-Role"],
)

api_router_prefix = "/api/v1"

app.include_router(ingest.router, prefix=api_router_prefix)
app.include_router(search.router, prefix=api_router_prefix)
app.include_router(complaint.router, prefix=api_router_prefix)
app.include_router(judgment.router, prefix=api_router_prefix)
app.include_router(predict.router, prefix=api_router_prefix)
app.include_router(stt.router, prefix=api_router_prefix)
app.include_router(dashboard.router, prefix=api_router_prefix)
app.include_router(chat.router, prefix=api_router_prefix)
app.include_router(tracking.router, prefix=api_router_prefix)
app.include_router(responsible_ai.router, prefix=api_router_prefix)
app.include_router(graph.router, prefix=api_router_prefix)
app.include_router(benchmark.router, prefix=api_router_prefix)
app.include_router(geocoder.router, prefix=api_router_prefix)
app.include_router(glossary.router, prefix=api_router_prefix)
app.include_router(prompts.router, prefix=api_router_prefix)
app.include_router(agent.router, prefix=api_router_prefix)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "legalguard-ai-backend"}
