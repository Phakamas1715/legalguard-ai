/**
 * apiClient — centralized backend API client
 * All LLM/AI calls go through the FastAPI backend (localhost:8000).
 * API keys live server-side only — never in VITE_ env vars.
 */

const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:8000") + "/api/v1";

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
};
