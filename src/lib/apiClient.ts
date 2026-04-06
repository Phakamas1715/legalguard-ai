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
};
