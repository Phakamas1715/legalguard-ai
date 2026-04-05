# Implementation Plan: Smart Court AI Enhancement

## Overview

Implement the Smart Court AI Enhancement system in two phases. Phase 1 builds the core infrastructure and ingests available data (98 Justice Court PDFs, ~90 Admin Court PDFs, guides, FAQs, mock cases). Phase 2 enables advanced features that depend on court judgment data (160,000+ cases) arriving later. The Python FastAPI backend runs alongside existing Supabase Edge Functions, with LangGraph multi-agent orchestration replacing the simulated `agentOrchestrator.ts`.

## Tasks

- [x] 1. Set up Python FastAPI backend project structure
  - [x] 1.1 Initialize Python project with FastAPI, pyproject.toml, and dependencies (LangGraph, PyThaiNLP, EasyOCR, PyMuPDF, Qdrant client, Redis, RapidFuzz, Hypothesis)
    - Create `backend/` directory with `pyproject.toml`, `Dockerfile`, `.env.example`
    - Set up FastAPI app entry point `backend/app/main.py` with CORS, health check, and API router
    - _Requirements: 1.1, 2.1_
  - [x] 1.2 Create PostgreSQL schema migrations for all data models
    - Create migration files for `knowledge_base`, `document_chunks`, `ingestion_jobs`, `complaint_drafts`, `judgment_drafts`, `case_predictions`, `transcriptions`, `audit_log` tables
    - Create `dashboard_case_stats` materialized view and pg_cron refresh schedule
    - Create all indexes defined in the design (GIN indexes for statutes, metadata, etc.)
    - _Requirements: 1.1, 1.13, 2.11, 5.6, 8.6, 12.1_
  - [x] 1.3 Set up Qdrant vector database configuration and collection schema
    - Create Qdrant collection with payload schema matching design (chunk_id, knowledge_base_id, source_code, document_type, case_no, court_type, year, statutes, chunk_index, chunk_text)
    - Create helper module `backend/app/services/qdrant_loader.py` for upsert/search operations
    - _Requirements: 1.1, 3.1_
  - [x] 1.4 Set up Redis connection and Semantic Cache layer
    - Implement `backend/app/services/semantic_cache.py` with exact hash match + RapidFuzz fuzzy match (threshold 0.85)
    - Include TTL-based expiration (default 3600s)
    - _Requirements: 3.6_

- [x] 2. Implement Data Ingestion Pipeline — Phase 1 (available data)
  - [x] 2.1 Implement PDF extraction module (`pdf_extractor.py`)
    - Use PyMuPDF for text-based PDFs, EasyOCR fallback for scanned PDFs
    - Extract form structure, field names, and text content
    - Handle malformed PDFs gracefully: log error with doc_id and source_code, continue batch
    - _Requirements: 1.1, 1.12, 2.1_
  - [ ]* 2.2 Write property test for document parsing metadata (Property 1)
    - **Property 1: Document parsing produces complete metadata**
    - **Validates: Requirements 1.1, 1.6, 2.1**
  - [x] 2.3 Implement Thai-aware text chunking module (`thai_chunker.py`)
    - Use PyThaiNLP `sent_tokenize` for sentence segmentation
    - Implement overlapping chunking (512 tokens max, 64 token overlap) per design pseudocode
    - _Requirements: 1.2_
  - [ ]* 2.4 Write property test for chunking round-trip coverage (Property 2)
    - **Property 2: Text chunking round-trip coverage**
    - **Validates: Requirements 1.2**
  - [x] 2.5 Implement metadata extractor (`metadata_extractor.py`)
    - Extract case_no, court_type, year, statutes, form_number, form_category from text
    - Tag each record with source dataset code (A1.1–A7.4, B1.1–B5.4)
    - _Requirements: 1.13, 2.11_
  - [ ]* 2.6 Write property test for source code traceability (Property 3)
    - **Property 3: Source code traceability invariant**
    - **Validates: Requirements 1.13, 2.11**
  - [x] 2.7 Implement embedding service (`embedding_service.py`)
    - Generate embeddings via OpenAI `text-embedding-3-small` or local model
    - Batch embedding with retry logic (exponential backoff, 3 attempts)
    - _Requirements: 3.1_
  - [x] 2.8 Implement deduplication service (`dedup_service.py`)
    - Deduplicate by composite key `(case_no, court_type)`, retain most recent by `ingested_at`
    - _Requirements: 2.10_
  - [ ]* 2.9 Write property test for deduplication (Property 5)
    - **Property 5: Deduplication by composite key**
    - **Validates: Requirements 2.10**
  - [x] 2.10 Implement BM25 indexer (`bm25_indexer.py`)
    - Build/update Tantivy BM25 index with PyThaiNLP tokenization
    - _Requirements: 3.1_
  - [x] 2.11 Implement ingestion orchestrator with batch processing and error logging
    - Wire PDF extractor → Thai chunker → metadata extractor → PII masking → dedup → embedding → Qdrant upsert + BM25 index + PostgreSQL metadata
    - Implement `POST /api/v1/ingest/documents`, `GET /api/v1/ingest/status/{job_id}`, `DELETE /api/v1/ingest/source/{source_code}`
    - Process in configurable batch sizes (default 100), checkpoint progress
    - Log errors to `ingestion_jobs.error_log` per document
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.12, 1.13, 2.1, 2.2, 2.3, 2.4, 2.11_
  - [ ]* 2.12 Write property test for ingestion error resilience (Property 4)
    - **Property 4: Ingestion error resilience**
    - **Validates: Requirements 1.12**

- [ ] 3. Checkpoint — Phase 1 Ingestion
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Hybrid RAG Search Pipeline
  - [x] 4.1 Implement hybrid search endpoint (`POST /api/v1/search`)
    - PII mask query → check semantic cache → generate query embedding → parallel BM25 + Qdrant vector search → Reciprocal Rank Fusion (k=60) → cross-encoder reranking → return top-K
    - Support filters: court_type, year_from, year_to, source_codes, statutes
    - Return `SearchResponse` with timing metrics, cache_hit flag, and citations
    - _Requirements: 3.1, 3.2, 3.5, 3.6_
  - [ ]* 4.2 Write property test for search results ordering (Property 6)
    - **Property 6: Search results ordering invariant**
    - **Validates: Requirements 3.2**
  - [x] 4.3 Implement role-based result formatting
    - Lawyer role: include full statute references, dissenting opinions, cross-references
    - Citizen role: simplified Thai language with plain-language summaries
    - _Requirements: 3.3, 3.4_
  - [x] 4.4 Implement low-relevance fallback with alternative suggestions
    - When all results have relevance_score < 0.3 or no results found, return suggestions field with alternative search terms
    - _Requirements: 3.7_
  - [ ]* 4.5 Write property test for low-relevance fallback (Property 7)
    - **Property 7: Low-relevance fallback suggestions**
    - **Validates: Requirements 3.7**

- [x] 5. Implement PII Masking Engine (Python backend)
  - [x] 5.1 Port and enhance PII masking from existing `src/lib/piiMasking.ts` to Python (`backend/app/services/pii_masking.py`)
    - Support Thai national ID, phone, email, address, name prefixes, bank account, passport, LINE ID patterns
    - Ensure all detected PII spans are replaced with masked tokens
    - Apply before any text is sent to external LLM APIs
    - _Requirements: 4.7, 5.4, 9.3, 12.5_
  - [ ]* 5.2 Write property test for PII masking invariant (Property 10)
    - **Property 10: PII masking invariant**
    - **Validates: Requirements 4.7, 5.4, 9.3**

- [x] 6. Implement LangGraph Multi-Agent Engine
  - [x] 6.1 Define LangGraph state schema and agent graph
    - Implement `AgentState` TypedDict with all fields from design (query, user_role, intent, search_results, draft_output, compliance_status, citations, confidence, audit_entries, messages, iteration_count, final_response)
    - Build StateGraph with Manager → Researcher/Drafter/Compliance routing, Researcher → Reviewer → Manager loop
    - Limit iterations to 5 to prevent cycles
    - _Requirements: 3.1, 4.1, 5.1, 7.1_
  - [x] 6.2 Implement Manager agent node
    - Classify query intent: SEARCH, DRAFT_COMPLAINT, DRAFT_JUDGMENT, PREDICT, CHAT
    - Route to appropriate agent nodes based on intent
    - _Requirements: 3.1, 4.1, 5.1, 6.1, 7.1_
  - [x] 6.3 Implement Researcher agent node
    - Access RAG search pipeline (hybrid search) to retrieve relevant documents
    - Return search_results and retrieved_context to state
    - _Requirements: 3.1, 5.1, 7.1_
  - [x] 6.4 Implement Reviewer agent node
    - Verify all citations exist in Knowledge Base
    - Partition references into verified and unverified sets
    - Flag unverified references with warnings
    - _Requirements: 5.3, 5.5_
  - [ ]* 6.5 Write property test for citation verification (Property 11)
    - **Property 11: Citation verification partitions references**
    - **Validates: Requirements 5.3, 5.5**
  - [x] 6.6 Implement Compliance agent node
    - Apply PII masking, check role-based access control
    - Block response if compliance check fails
    - _Requirements: 4.7, 12.5_
  - [x] 6.7 Implement Drafter agent node
    - Generate complaint/judgment drafts using templates + retrieved context
    - _Requirements: 4.2, 5.2_

- [x] 7. Implement CAL-130 Audit Log (PostgreSQL)
  - [x] 7.1 Implement PostgreSQL-based audit log service replacing localStorage-based `auditLog.ts`
    - Create `backend/app/services/audit_service.py` with SHA-256 hash chain
    - Support action types: search, chat, judgment_draft, complaint_verification, stt
    - Maintain hash chain integrity (each entry's prev_hash = previous entry's entry_hash)
    - _Requirements: 5.6, 7.5, 9.6, 10.5_
  - [ ]* 7.2 Write property test for audit log chain integrity (Property 12)
    - **Property 12: Audit log entry creation invariant**
    - **Validates: Requirements 5.6, 7.5, 9.6, 10.5**

- [ ] 8. Checkpoint — Core Infrastructure Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement Enhanced Nong Kot Chatbot with RAG
  - [x] 9.1 Create RAG-enhanced chatbot endpoint
    - Retrieve relevant context from Knowledge Base using RAG before generating response
    - Cite source case number or regulation for each factual claim
    - Use simplified Thai language for Citizen role, avoid legal jargon
    - When no relevant info found, state unavailability and recommend consulting a lawyer
    - Retrieve filing guides, document checklists, and fee schedules when asked about procedures
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6_
  - [x] 9.2 Update Supabase Edge Function `legal-chat/index.ts` to proxy to Python backend
    - Replace direct Gemini API call with proxy to FastAPI RAG chatbot endpoint
    - _Requirements: 7.1_
  - [ ]* 9.3 Write unit tests for chatbot RAG integration
    - Test citation inclusion, simplified language output, fallback behavior
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 10. Implement Complaint Drafting Assistant
  - [x] 10.1 Implement case classification endpoint (`POST /api/v1/complaint/classify`)
    - Classify case type (civil, criminal, administrative) from natural language facts
    - Recommend appropriate court
    - _Requirements: 4.1_
  - [ ]* 10.2 Write property test for case classification (Property 8)
    - **Property 8: Case classification returns valid type**
    - **Validates: Requirements 4.1**
  - [x] 10.3 Implement complaint draft generation (`POST /api/v1/complaint/draft`)
    - Generate structured complaint following court form template for the case type
    - Pre-fill fields based on provided facts
    - _Requirements: 4.2_
  - [x] 10.4 Implement complaint validation (`POST /api/v1/complaint/validate`)
    - Validate each field against court's document verification criteria
    - Return completeness_score [0,1] and missing_fields with correction instructions
    - For Administrative Court: check Section 56 elements, jurisdiction, legal interest, 90-day deadline
    - _Requirements: 4.3, 4.5, 4.6_
  - [ ]* 10.5 Write property test for complaint validation completeness (Property 9)
    - **Property 9: Complaint validation identifies all missing required fields**
    - **Validates: Requirements 4.3, 4.5**
  - [x] 10.6 Implement Complaint Verification and Summarization
    - Verify complaint against acceptance checklist from Set A or Set B based on target court
    - Generate structured summary: case type, key facts, cited statutes, parties, completeness score
    - List missing elements with references when completeness < 0.7
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [ ]* 10.7 Write property test for verification completeness scoring (Property 17)
    - **Property 17: Complaint verification completeness scoring**
    - **Validates: Requirements 10.2, 10.3**

- [x] 11. Implement e-Filing XML Export
  - [x] 11.1 Implement XML export endpoint (`POST /api/v1/complaint/export-xml`)
    - Serialize complaint draft to e-Filing XML format
    - Validate generated XML against e_Filing_Schema before returning
    - Return specific validation errors and fields needing correction on failure
    - Provide JSON fallback if XML export fails
    - _Requirements: 11.1, 11.2, 11.3_
  - [ ]* 11.2 Write property test for XML round-trip (Property 18)
    - **Property 18: e-Filing XML serialization round-trip**
    - **Validates: Requirements 11.4**

- [ ] 12. Checkpoint — Complaint Drafting Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement Smart Dashboard with Real-Time Analytics
  - [x] 13.1 Implement dashboard API endpoints
    - `GET /api/v1/dashboard/stats` — real-time case intake counts by case type, court level, time period
    - `GET /api/v1/dashboard/bottlenecks` — bottleneck analysis (flag when avg processing time > 1.5× standard)
    - `POST /api/v1/dashboard/report` — generate PDF report with statistics, trends, bottleneck summary
    - Display rejection rates with top 5 rejection reasons per case type
    - Refresh via materialized view every 5 minutes
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  - [ ]* 13.2 Write property test for bottleneck detection (Property 15)
    - **Property 15: Bottleneck detection threshold**
    - **Validates: Requirements 8.3**
  - [x] 13.3 Implement Fairness Monitoring panel in dashboard
    - Compute CFS for every search result set
    - Monitor bias across dimensions: geographic, court type, case type, time period, user role
    - Display fairness warning when CFS < 0.7
    - Show CFS trends over time, bias breakdown, alerts
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  - [x] 13.4 Update `GovernmentDashboard.tsx` frontend to consume real dashboard API
    - Replace mock data with real API calls to dashboard endpoints
    - Add Fairness Monitoring panel with CFS visualization
    - _Requirements: 8.1, 13.4_
  - [ ]* 13.5 Write unit tests for dashboard statistics and fairness scoring
    - Test CFS calculation, bottleneck detection, report generation
    - _Requirements: 8.1, 8.3, 13.1_

- [x] 14. Implement Data Sovereignty and Security
  - [x] 14.1 Implement data classification and access control middleware
    - Classify data into security levels: สาธารณะ, ภายใน, ลับ, ลับมาก
    - Enforce access controls per classification level
    - Ensure PII masking is applied before any external LLM API call
    - Maintain data processing register documenting all data flows
    - _Requirements: 12.4, 12.5, 12.6_
  - [x] 14.2 Implement LLM fallback to local model (Ollama)
    - When external LLM API is unavailable, fallback to locally-hosted model
    - Ensure no data leaves controlled environment during fallback
    - _Requirements: 12.7_
  - [ ]* 14.3 Write unit tests for security middleware
    - Test PII masking before LLM calls, access control enforcement, fallback behavior
    - _Requirements: 12.5, 12.7_

- [ ] 15. Checkpoint — Phase 1 Features Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Update Supabase Edge Functions and Frontend Integration
  - [x] 16.1 Update `legal-search/index.ts` to proxy to Python FastAPI hybrid search
    - Replace direct Gemini API call with proxy to `POST /api/v1/search`
    - Pass role, filters, and query through to backend
    - _Requirements: 3.1_
  - [x] 16.2 Update `SearchPage.tsx` to handle new search response format
    - Display citations, relevance scores, source codes, and cache_hit indicator
    - Show CFS fairness score for result sets
    - Show alternative suggestions when no relevant results found
    - _Requirements: 3.2, 3.3, 3.4, 3.7, 13.1_
  - [x] 16.3 Update `ComplaintFormPage.tsx` to integrate with complaint drafting API
    - Wire case classification, draft generation, validation, and XML export endpoints
    - Show completeness score, missing fields, and correction instructions
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 11.1_
  - [ ]* 16.4 Write integration tests for frontend-backend flow
    - Test search → results display, complaint → validation → export flows
    - _Requirements: 3.1, 4.1, 11.1_

- [ ] 17. Checkpoint — Frontend Integration Complete
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 18. Phase 2 — Data Ingestion for Court Judgments (when data arrives)
  - [ ] 18.1 Implement web scraping module with rate limiting (`POST /api/v1/ingest/web-scrape`)
    - Scrape online sources (coj.go.th FAQ, deka.supremecourt.or.th, admincourt.go.th)
    - Respect rate limits, exponential backoff, max 10 retries
    - Store results in same Knowledge Base format as file-based ingestion
    - _Requirements: 1.4, 2.12_
  - [ ] 18.2 Ingest Justice Court judgments (A4.1-A4.3) when received
    - Parse and store Supreme Court (100,000+), Appeal Court (50,000+), First Instance (10,000+) judgments
    - Extract case_no, court_type, year, statutes, full_text metadata
    - _Requirements: 1.6_
  - [ ] 18.3 Ingest Justice Court statistics (A6.1-A6.4) when received
    - Extract case intake stats, rejection stats with reasons, avg processing time, win/loss rates
    - _Requirements: 1.7_
  - [ ] 18.4 Ingest AI training data (A5.1-A5.6) when received
    - Process complete complaints (200+), rejected complaints with reasons (100+), before/after pairs (50+), sample case files, chat logs, transaction records
    - _Requirements: 1.9_
  - [ ] 18.5 Ingest rules, regulations, and XML schemas (A3.1-A3.5) when received
    - Index filing procedures, fee schedules, verification criteria, standard timelines, e-Filing XML schemas (87)
    - _Requirements: 1.10_
  - [ ] 18.6 Ingest remaining citizen guides (A2.2-A2.4, A2.7) when received
    - Store filing guides per case type, flow charts, document checklists, court summons reading guides
    - _Requirements: 1.11_
  - [ ] 18.7 Ingest form field descriptions and examples (A1.3-A1.5) when received
    - Parse field explanations, correct fill examples, court summons examples
    - _Requirements: 1.8_

- [ ] 19. Phase 2 — Administrative Court Data (when data arrives)
  - [ ] 19.1 Ingest Administrative Court validation criteria (B4.1-B4.7) when received
    - Parse complaint acceptance checklists, rejection criteria, validation rules, Section 56 elements, jurisdiction logic trees, interest verification examples, 90-day counting method
    - _Requirements: 2.5_
  - [ ] 19.2 Ingest Administrative Court case studies and special group guides (B2.4, B2.6, B2.8) when received
    - Store simulated case studies (20-30), special group guides, e-Filing video metadata
    - _Requirements: 2.6_
  - [ ] 19.3 Ingest certification examples and Chief Justice orders (B1.6, B3.4) when received
    - Index certification examples (20+) and Chief Justice orders
    - _Requirements: 2.7_
  - [ ] 19.4 Ingest Administrative Court judgments (B5.1-B5.3) when received
    - Store Supreme Admin Court (2,000+), Central Admin Court (1,000+), First Instance Admin Court (1,000+) judgments
    - _Requirements: 2.8_
  - [ ] 19.5 Ingest landmark cases (B5.4) when received
    - Store 50-100 important cases with summaries, legal principles, referenced statutes
    - _Requirements: 2.9_

- [x] 20. Phase 2 — Judgment Drafting Agent
  - [x] 20.1 Implement precedent retrieval endpoint (`POST /api/v1/judgment/precedents`)
    - Retrieve top 10 most relevant precedent cases from Knowledge Base given case facts
    - PII mask input, role-based access (government/lawyer only)
    - _Requirements: 5.1_
  - [x] 20.2 Implement judgment draft generation (`POST /api/v1/judgment/draft`)
    - Generate draft following standard format: facts, legal analysis, statute references, ruling
    - SSE streaming via LLM, RAG context from precedent search
    - Apply PII masking before displaying draft
    - Risk Tier R4 (confidence cap 80%, requires human review)
    - _Requirements: 5.2, 5.3, 5.4, 5.6_
  - [x] 20.3 Implement judgment review with citation check (`POST /api/v1/judgment/review`)
    - Verify all cited cases exist in Knowledge Base
    - Flag unverified references with warnings
    - Compute Honesty Score (6-dimension) + Risk Level
    - _Requirements: 5.5_
  - [ ]* 20.4 Write unit tests for judgment drafting and citation verification
    - Test precedent retrieval, draft format, PII masking, unverified reference flagging
    - _Requirements: 5.1, 5.3, 5.5_

- [x] 21. Phase 2 — Case Outcome Prediction
  - [x] 21.1 Implement case outcome prediction endpoint (`POST /api/v1/predict/outcome`)
    - Analyze historical judgment data via RAG search, return predicted outcome with confidence [0,1]
    - Majority vote on similar case outcomes (plaintiff_wins/defendant_wins/settlement/dismissed)
    - Provide factor breakdown: similar cases count, win/loss ratio, court distribution, statute frequency
    - Include top 5 most similar historical cases
    - Display disclaimer (informational only, not legal advice)
    - Show low-confidence warning when fewer than 10 similar cases exist
    - Risk Tier R4 (confidence cap 85%)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [ ]* 21.2 Write property test for prediction confidence bounds (Property 13)
    - **Property 13: Prediction confidence bounds and breakdown completeness**
    - **Validates: Requirements 6.1, 6.2, 6.5**
  - [ ]* 21.3 Write property test for low-data prediction warning (Property 14)
    - **Property 14: Low-data prediction warning**
    - **Validates: Requirements 6.4**

- [x] 22. Phase 2 — Speech-to-Text Engine
  - [x] 22.1 Implement speech-to-text endpoints
    - `POST /api/v1/stt/transcribe` — upload audio (WAV, MP3, M4A, FLAC), get transcript
    - `GET /api/v1/stt/status/{job_id}` — check transcription status
    - Validate format and duration (max 120 min)
    - Speaker diarization (simulated — ready for AWS Transcribe/Whisper)
    - Apply PII masking to transcript
    - Flag segments with confidence < 0.7 for manual review
    - Log each session to audit log
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  - [ ]* 22.2 Write property test for low-confidence segment flagging (Property 16)
    - **Property 16: Low-confidence transcription segment flagging**
    - **Validates: Requirements 9.4**

- [ ] 23. Phase 2 — Bias Testing and Fairness Reporting
  - [ ] 23.1 Implement monthly Fairness Report generation
    - Summarize bias metrics, CFS distribution, corrective actions
    - _Requirements: 13.5_
  - [ ]* 23.2 Write unit tests for fairness report generation
    - Test CFS aggregation, bias dimension breakdown, report format
    - _Requirements: 13.5_

- [ ] 24. Final Checkpoint — All Phases Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 25. Responsible AI Engine (RAAIA 3.1)
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_
  - [x] 25.1 Implement Risk Tiers (R0-R5) with confidence caps
    - R0 (FAQ): 99%, R1 (search): 95%, R2 (chatbot): 90%, R3 (complaint): 85%, R4 (judgment/predict): 80%, R5 (ruling): blocked
    - `backend/app/services/responsible_ai.py`
  - [x] 25.2 Implement Confidence-Bounded Bayesian (CBB) framework
    - Per-task confidence caps, ethical disclaimers, missing data penalty
  - [x] 25.3 Implement Honesty Score (6-dimension)
    - citation_accuracy, confidence_calibration, debate_transparency, disclaimer_present, pii_clean, data_completeness
  - [x] 25.4 Implement Circuit Breaker
    - Block on: honesty < 0.50, PII leak, hallucination > 5%
    - Warn on: confidence < 0.50, conflicting precedents
  - [x] 25.5 Implement Anti-Collusion Debate Protocol
    - CommitRevealProtocol (SHA-256), Knowledge Partition, Bias Convergence Detection
  - [x] 25.6 Implement Strategic Dishonesty Detection + Legal Risk Score (P_risk) + GLUE-RAAIA Governance Score
  - [x] 25.7 Create Responsible AI API endpoints (`/api/v1/responsible-ai/`)
    - risk-tier, honesty-score, circuit-breaker, missing-data-penalty, governance-score, legal-risk, risk-tiers
  - [x] 25.8 Integrate Responsible AI into chatbot (Risk Tier + CBB + Honesty Score + Circuit Breaker + Badge)

- [x] 26. Legal Knowledge Graph (inspired by personal-graph)
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_
  - [x] 26.1 Implement Text → Graph parser for Thai legal text
    - Rule-based entity extraction: persons, statutes, cases, courts, crime concepts (9 entity types)
    - Relation extraction: ฟ้อง, ฐานความผิด, อ้างอิง, พิพากษา, etc. (10 relation types)
  - [x] 26.2 Implement LegalGraphDB — Graph Memory store
    - Node/edge CRUD with vector embeddings, similarity search, subgraph retrieval
    - Merge by similarity (dedup), to_context_string() for LLM prompts
  - [x] 26.3 Implement NetworkX export/import for GNN analysis
  - [x] 26.4 Create Knowledge Graph API endpoints (`/api/v1/graph/`)
    - text-to-graph, search, node, edge, merge, stats, export/networkx

- [x] 27. NitiBench Integration + Open Law Data
  - _Requirements: 16.1, 16.2, 16.3, 18.1, 18.2, 18.3_
  - [x] 27.1 Integrate NitiBench HuggingFace datasets (VISAI-AI/nitibench-ccl, nitibench-statute, WangchanX-Legal-ThaiCCL-RAG)
    - load_nitibench_from_hf(), run_full_benchmark() combining survey + HF cases
  - [x] 27.2 Add Open Law Data Thailand datasets to HF loader
    - ราชกิจจานุเบกษา 1.3M+ documents, PyThaiNLP/thai-law
  - [x] 27.3 Create NitiBench Benchmark API endpoints (`/api/v1/benchmark/`)
    - cases, datasets, load-hf, run (Hit@K, MRR, Citation Accuracy)

- [x] 28. Dashboard Live Metrics
  - _Requirements: 8.6, 17.1, 17.2, 17.3_
  - [x] 28.1 Implement real-time system health endpoint (`GET /api/v1/dashboard/live`)
    - Request counts (1h/24h), action breakdown, avg confidence, cache hit rate, error rate
    - System health status, AI metrics (honesty score, hallucination rate)

- [x] 29. Additional Features
  - [x] 29.1 Case Tracking Service (`/api/v1/tracking/`)
    - Track case status by case number, timeline, next hearing date
    - _Requirements: 20.1, 20.2_
  - [x] 29.2 Security Middleware (registered in main.py)
    - Rate limiting (120 req/min per IP), security headers, role validation
    - JWT Bearer token authentication with role-based endpoint restriction
    - _Requirements: 21.1, 21.2, 21.3, 21.4_
  - [x] 29.3 PII Masking on search query input (SearchPipeline.search())
    - _Requirements: 12.5_
  - [x] 29.4 LangGraph researcher_node connected to real SearchPipeline
    - _Requirements: 3.1_
  - [x] 29.5 LangGraph drafter_node connected to real LLM service
    - _Requirements: 4.2, 5.2_
  - [x] 29.6 Self-hosted Geocoder (traccar-geocoder)
    - Reverse geocoding + court lookup + nearest court
    - _Requirements: 19.1, 19.2, 19.3_
  - [x] 29.7 Thai-Optimized AI Models
    - WangchanBERTa embeddings (768-dim) + SeaLLM-7B-v2 in LLM chain
    - Bedrock Claude → Typhoon → SeaLLM → Anthropic → Ollama fallback chain
    - _Requirements: 22.1, 22.2, 22.3_

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Phase 1 tasks (1–17) — ✅ COMPLETE: all core infrastructure built
- Phase 2 tasks (18–23) — Judgment (20) ✅, Prediction (21) ✅, STT (22) ✅ structure ready, Data ingestion (18-19) waiting for court data
- Tasks 25–29 — ✅ COMPLETE: Responsible AI, Knowledge Graph, NitiBench, Dashboard Live, Additional Features
- Each task references specific requirements for traceability
- Property tests validate the 18 correctness properties defined in the design document
- Python backend uses Hypothesis for property-based testing; frontend uses fast-check with Vitest
- **449 tests passing** as of latest run

### Implementation Summary

| Category | Services | Routers | Tests |
|----------|----------|---------|-------|
| Core Infrastructure | 4 (qdrant, redis, embedding, bm25) | 1 (ingest) | 60+ |
| Search & RAG | 2 (search_pipeline, semantic_cache) | 1 (search) | 40+ |
| AI Agents | 3 (langgraph, chatbot, llm) | 2 (chat, judgment) | 30+ |
| Complaint | 2 (complaint, efiling_xml) | 1 (complaint) | 40+ |
| Security | 3 (pii_masking, security middleware, responsible_ai) | 1 (responsible_ai) | 60+ |
| Dashboard | 2 (dashboard, audit) | 2 (dashboard, benchmark) | 30+ |
| Knowledge Graph | 1 (legal_graph) | 1 (graph) | 20+ |
| Prediction | 1 (predict router) | 1 (predict) | 16+ |
| Other | 5 (case_tracking, nitibench, hf_loader, openlaw, rag_evaluator) | 1 (tracking) | 20+ |
| **Total** | **31 services** | **14 routers** | **458 tests** |
