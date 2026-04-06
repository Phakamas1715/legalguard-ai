import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BACKEND_URL =
  Deno.env.get("LEGALGUARD_BACKEND_URL") || "http://localhost:8000";

interface BackendSearchResult {
  id: string;
  case_no?: string;
  court_type?: string;
  year?: number;
  title?: string;
  summary?: string;
  chunk_text?: string;
  statutes?: string[];
  relevance_score?: number;
  source_code?: string;
}

interface BackendSearchResponse {
  results?: BackendSearchResult[];
  suggestions?: string[];
  cache_hit?: boolean;
  total_candidates?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { query, filters, role } = await req.json();

    // Proxy to Python FastAPI hybrid search endpoint
    const response = await fetch(`${BACKEND_URL}/api/v1/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: query ?? "",
        filters: filters ?? {},
        role: role ?? "citizen",
        top_k: 10,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "เกิดข้อผิดพลาดในการค้นหา" }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data: BackendSearchResponse = await response.json();

    // Transform backend response to match frontend expected format
    const results = (data.results ?? []).map((r) => ({
      id: r.id,
      caseNo: r.case_no ?? "",
      courtType: r.court_type ?? "",
      year: r.year ?? 0,
      title: r.title ?? "",
      summary: r.summary ?? r.chunk_text ?? "",
      fullText: r.chunk_text ?? "",
      statutes: r.statutes ?? [],
      confidence: r.relevance_score ?? 0,
      relevanceScore: r.relevance_score ?? 0,
      province: "",
      sourceCode: r.source_code ?? "",
    }));

    return new Response(
      JSON.stringify({
        results,
        suggestions: data.suggestions ?? [],
        cache_hit: data.cache_hit ?? false,
        total_candidates: data.total_candidates ?? 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("legal-search error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
