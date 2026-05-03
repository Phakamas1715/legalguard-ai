/**
 * apiClient — centralized backend API client
 * All LLM/AI calls go through the FastAPI backend.
 * API keys live server-side only — never in VITE_ env vars.
 */

import { API_BASE } from "@/lib/runtimeConfig";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatResponseData {
  content: string;
  citations: Record<string, string>[];
  confidence: number;
  disclaimer: string;
}

export interface SearchFiltersPayload {
  court_type?: string;
  year_from?: number;
  year_to?: number;
}

export interface ComplaintClassifyResponse {
  case_type: string;
  recommended_court: string;
  confidence: number;
  statutes: string[];
}

export interface ComplaintDraftResponse {
  draft_text: string;
  case_type: string;
  recommended_court: string;
  fields: Record<string, unknown>;
  disclaimer: string;
}

export interface ComplaintValidateResponse {
  completeness_score: number;
  missing_fields: Array<{ field: string; instruction: string }>;
  warnings: string[];
}

export interface ComplaintVerifyResponse {
  case_type: string;
  key_facts: string;
  cited_statutes: string[];
  parties: { plaintiff: string; defendant: string };
  completeness_score: number;
  missing_elements: Array<{ element: string; reference: string }>;
  summary: string;
}

export interface ComplaintExportXmlResponse {
  xml: string | null;
  valid: boolean;
  form: string;
  errors: string[];
  json_fallback: Record<string, unknown> | null;
}

export interface DashboardSystemStatsResponse {
  actual: {
    pdf_files: number;
    pdf_description?: string;
    mock_cases: number;
    mock_cases_description?: string;
    hf_datasets: number;
    hf_datasets_description?: string;
    audit_entries?: number;
    langgraph_agents?: number;
    anti_hallucination_layers?: number;
    pii_patterns: number;
    api_endpoints?: number;
    backend_services?: number;
    total_tests?: number;
  };
  targets?: {
    total_cases?: number;
    total_cases_note?: string;
    hit_at_3?: number;
    hit_at_3_note?: string;
    p95_latency_ms?: number;
    p95_latency_note?: string;
    cfs_target?: number;
    cfs_note?: string;
    honesty_score_target?: number;
    honesty_note?: string;
  };
  phase: string;
}

export interface DashboardLiveResponse {
  timestamp: string;
  requests_1h: number;
  requests_24h: number;
  requests_by_action_1h: Record<string, number>;
  requests_by_action_24h?: Record<string, number>;
  avg_confidence_1h: number;
  cache_hit_rate_1h: number;
  error_rate_1h: number;
  ingestion_jobs_24h?: number;
  total_audit_entries?: number;
  system_health: Record<string, string>;
  ai_metrics: {
    avg_honesty_score: number;
    hallucination_rate: number;
    pii_leak_count?: number;
  };
}

export interface ReleaseGuardCheck {
  id?: string;
  name?: string;
  check?: string;
  required?: boolean;
  passed: boolean;
  status?: string;
  detail?: string;
}

export interface ReleaseGuardResponse {
  release_allowed?: boolean;
  passed?: boolean;
  passed_checks?: number;
  failed_checks?: number;
  checks: ReleaseGuardCheck[];
  total_checks?: number;
  failed?: number;
  required_all_passed?: boolean;
  mode?: string;
}

export interface BottlenecksResponse {
  bottlenecks: Array<{
    case_type: string;
    avg_processing_days: number;
    standard_days: number;
    threshold_days: number;
    sample_count: number;
    contributing_factors?: string[];
  }>;
}

export interface RecentAuditResponse {
  entries: Array<{
    id: string;
    action: string;
    query_preview: string;
    result_count: number;
    confidence: number | null;
    agent_role: string | null;
    entry_hash: string;
    prev_hash?: string;
    created_at: string;
    metadata: Record<string, unknown>;
  }>;
  chain_valid: boolean;
  broken_at: number | null;
}

export interface RecentIngestionJobsResponse {
  jobs: Array<{
    job_id: string;
    source_code: string;
    total_documents: number;
    processed_documents: number;
    failed_documents: number;
    total_chunks: number;
    error_log: Array<Record<string, unknown>>;
    status: string;
  }>;
}

export interface SafetyPipelineResponse {
  title: string;
  subtitle: string;
  badge: string;
  architecture_version?: string;
  integrity: {
    audit_chain_valid: boolean;
    generated_at: string;
  };
  layers: Array<{
    step: string;
    layer_code?: string;
    title: string;
    description: string;
    architecture_label?: string;
    purpose?: string;
    inputs?: string[];
    controls?: string[];
    outputs?: string[];
    services?: string[];
    runtime_status?: string;
    runtime_evidence?: Record<string, unknown>;
  }>;
}

export interface AgenticArchitectureResponse {
  title: string;
  subtitle: string;
  badge: string;
  architecture_version?: string;
  relation_to_safety_pipeline: string;
  integrity: {
    audit_chain_valid: boolean;
    generated_at: string;
  };
  components: Array<{
    id: string;
    title: string;
    description: string;
    responsibilities: string[];
    mapped_layers: string[];
    services: string[];
    runtime_evidence?: Record<string, unknown>;
  }>;
}

export interface RiskTier {
  risk_level: string;
  confidence_cap: number;
  human_required: boolean;
}

async function getJson<T>(path: string): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`);
  if (!resp.ok) throw new Error(`${path} ${resp.status}`);
  return resp.json();
}

export const apiClient = {
  /** Non-streaming chat — น้องซื่อสัตย์ chatbot */
  async chat(messages: ChatMessage[], role = "citizen"): Promise<ChatResponseData> {
    const resp = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, role }),
    });
    if (!resp.ok) throw new Error(`chat ${resp.status}`);
    return resp.json();
  },

  /** Streaming chat — draft judgment, returns raw Response for SSE parsing */
  chatStream(messages: ChatMessage[], role = "citizen"): Promise<Response> {
    return fetch(`${API_BASE}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, role }),
    });
  },

  /** Hybrid search (BM25 + vector) */
  async search(
    query: string,
    filters: { courtType?: string; year?: string; statute?: string } = {},
    role = "citizen",
    topK = 10,
  ) {
    const payload: SearchFiltersPayload = {};
    if (filters.courtType) payload.court_type = filters.courtType;
    if (filters.year) {
      const y = Number(filters.year);
      payload.year_from = y;
      payload.year_to = y;
    }

    const resp = await fetch(`${API_BASE}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, filters: payload, role, top_k: topK }),
    });
    if (!resp.ok) throw new Error(`search ${resp.status}`);
    return resp.json();
  },

  async classifyComplaint(facts: string): Promise<ComplaintClassifyResponse> {
    const resp = await fetch(`${API_BASE}/complaint/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facts }),
    });
    if (!resp.ok) throw new Error(`complaint/classify ${resp.status}`);
    return resp.json();
  },

  async draftComplaint(payload: {
    facts: string;
    case_type: string;
    plaintiff?: string;
    defendant?: string;
  }): Promise<ComplaintDraftResponse> {
    const resp = await fetch(`${API_BASE}/complaint/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(`complaint/draft ${resp.status}`);
    return resp.json();
  },

  async validateComplaint(draft: Record<string, unknown>): Promise<ComplaintValidateResponse> {
    const resp = await fetch(`${API_BASE}/complaint/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft }),
    });
    if (!resp.ok) throw new Error(`complaint/validate ${resp.status}`);
    return resp.json();
  },

  async verifyComplaint(payload: {
    complaint: Record<string, unknown>;
    target_court: "justice" | "administrative";
  }): Promise<ComplaintVerifyResponse> {
    const resp = await fetch(`${API_BASE}/complaint/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(`complaint/verify ${resp.status}`);
    return resp.json();
  },

  async exportComplaintXml(payload: Record<string, unknown>): Promise<ComplaintExportXmlResponse> {
    const resp = await fetch(`${API_BASE}/complaint/export-xml`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(`complaint/export-xml ${resp.status}`);
    return resp.json();
  },

  getDashboardSystemStats(): Promise<DashboardSystemStatsResponse> {
    return getJson<DashboardSystemStatsResponse>("/dashboard/system-stats");
  },

  getDashboardLive(): Promise<DashboardLiveResponse> {
    return getJson<DashboardLiveResponse>("/dashboard/live");
  },

  getReleaseGuard(): Promise<ReleaseGuardResponse> {
    return getJson<ReleaseGuardResponse>("/responsible-ai/release-guard");
  },

  getRiskTiers(): Promise<Record<string, RiskTier>> {
    return getJson<Record<string, RiskTier>>("/responsible-ai/risk-tiers");
  },

  getBottlenecks(): Promise<BottlenecksResponse> {
    return getJson<BottlenecksResponse>("/dashboard/bottlenecks");
  },

  getRecentAudit(limit = 10): Promise<RecentAuditResponse> {
    return getJson<RecentAuditResponse>(`/dashboard/audit/recent?limit=${limit}`);
  },

  getRecentIngestionJobs(limit = 10): Promise<RecentIngestionJobsResponse> {
    return getJson<RecentIngestionJobsResponse>(`/ingest/recent?limit=${limit}`);
  },

  getSafetyPipeline(): Promise<SafetyPipelineResponse> {
    return getJson<SafetyPipelineResponse>("/dashboard/safety-pipeline");
  },

  getAgenticArchitecture(): Promise<AgenticArchitectureResponse> {
    return getJson<AgenticArchitectureResponse>("/dashboard/agentic-architecture");
  },
};
