/**
 * LegalGuard AI — Distributed Tracing Instrumentation
 *
 * Compatible with:
 *   • AWS X-Ray  — propagates via X-Amzn-Trace-Id header
 *   • Zipkin     — propagates via B3 headers (X-B3-TraceId, etc.)
 *   • OpenTelemetry OTLP — exportable JSON spans
 *
 * Covers layers L0–L6 of the 7-Layer Pipeline with latency budget tracking.
 * Latency budget per architecture HTML:
 *   L1 Retrieval 412ms + L4 Reranking 142ms + L5 Safety 35ms + Network 100ms = 689ms P95
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type LayerName = "L0" | "L1" | "L2" | "L3" | "L4" | "L5" | "L6";

export const LAYER_ORDER: LayerName[] = ["L0", "L1", "L2", "L3", "L4", "L5", "L6"];

export const LAYER_METADATA: Record<
  LayerName,
  {
    title: string;
    description: string;
    owner: string;
    runtime: string;
    feynmanStage: "outside" | "entry" | "core";
  }
> = {
  L0: {
    title: "Query Router",
    description: "วิเคราะห์ intent และวางแผนเส้นทางการประมวลผล",
    owner: "Routing Layer",
    runtime: "LegalGuard Query Planner",
    feynmanStage: "outside",
  },
  L1: {
    title: "Retrieval Context",
    description: "ดึง context จาก memory และ knowledge hints ที่เกี่ยวข้อง",
    owner: "Knowledge Layer",
    runtime: "Memory + Retrieval Context",
    feynmanStage: "outside",
  },
  L2: {
    title: "Quality Filter",
    description: "คัดกรอง query, ปกปิด PII และตรวจสิทธิ์การเข้าถึง",
    owner: "Trust Layer",
    runtime: "PII Masking + Access Gate",
    feynmanStage: "outside",
  },
  L3: {
    title: "Fairness Baseline",
    description: "ประเมิน fairness baseline ก่อนส่งต่อเข้าชั้นความปลอดภัย",
    owner: "Risk Layer",
    runtime: "CFS Baseline",
    feynmanStage: "outside",
  },
  L4: {
    title: "Hybrid Reranking",
    description: "ประเมิน latent relevance และจัดลำดับความสำคัญของประเด็น",
    owner: "Inference Layer",
    runtime: "LeJEPA + Hybrid Scoring",
    feynmanStage: "outside",
  },
  L5: {
    title: "Safety Gate",
    description: "ตรวจ governance, audit integrity และ risk posture",
    owner: "Governance Layer",
    runtime: "RAAIA Safety Gate",
    feynmanStage: "entry",
  },
  L6: {
    title: "Multi-Agent",
    description: "ประมวลผล reasoning และ consensus ของหลายเอเจนต์",
    owner: "Agent Layer",
    runtime: "Feynman Multi-Agent Engine",
    feynmanStage: "core",
  },
};

export interface SpanAttributes {
  layer: LayerName;
  operation: string;
  userId?: string;
  queryHash?: string;
  strategy?: string;
  agentRole?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  layer: LayerName;
  startTime: number;        // performance.now() ms
  endTime?: number;
  duration?: number;        // ms
  attributes: SpanAttributes;
  status: "ok" | "error" | "timeout";
  error?: string;
  budgetMs: number;         // latency budget for this layer
  budgetExceeded: boolean;
}

export interface TraceResult {
  traceId: string;
  spans: Span[];
  totalDuration: number;
  p95Budget: number;        // 689ms
  withinBudget: boolean;
  layerBreakdown: Record<LayerName, number>;
  xrayHeader: string;       // X-Amzn-Trace-Id value
  zipkinHeaders: ZipkinHeaders;
  otlpSpans: OTLPSpan[];
}

export interface ZipkinHeaders {
  "X-B3-TraceId":      string;
  "X-B3-SpanId":       string;
  "X-B3-ParentSpanId": string;
  "X-B3-Sampled":      string;
}

export interface OTLPSpan {
  traceId:      string;
  spanId:       string;
  parentSpanId?: string;
  name:         string;
  startTimeUnixNano: string;
  endTimeUnixNano:   string;
  attributes:   Array<{ key: string; value: { stringValue?: string; intValue?: number; boolValue?: boolean } }>;
  status:       { code: number };  // 0=unset, 1=ok, 2=error
}

// ─── Layer latency budgets (ms) per architecture doc ─────────────────────────

const LAYER_BUDGETS: Record<LayerName, number> = {
  L0:  80,   // RagQueryRouter intent analysis
  L1: 412,   // VectorRetrievalAdapter + Graph
  L2:  40,   // RQS quality filter
  L3:  30,   // CFS fairness scoring
  L4: 142,   // RagOrchestration hybrid scoring + LeJEPA reranking
  L5:  35,   // RAAIA safety gate
  L6:  80,   // Multi-agent orchestrator (excluding external API calls)
};

const P95_TOTAL_BUDGET = 689; // ms

// ─── ID generators ────────────────────────────────────────────────────────────

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function newTraceId(): string { return randomHex(16); }  // 128-bit
function newSpanId():  string { return randomHex(8);  }  // 64-bit

// ─── Tracer class ─────────────────────────────────────────────────────────────

export class LegalTracer {
  private static instance: LegalTracer;
  private traces: Map<string, Span[]> = new Map();
  private readonly MAX_TRACES = 50;

  private constructor() {}

  public static getInstance(): LegalTracer {
    if (!LegalTracer.instance) LegalTracer.instance = new LegalTracer();
    return LegalTracer.instance;
  }

  /**
   * Start a new root trace (one per API request).
   */
  public startTrace(operationName: string, attributes: Partial<SpanAttributes> = {}): {
    traceId: string;
    rootSpanId: string;
  } {
    const traceId    = newTraceId();
    const rootSpanId = newSpanId();

    const root: Span = {
      traceId,
      spanId: rootSpanId,
      name: operationName,
      layer: "L0",
      startTime: performance.now(),
      attributes: { layer: "L0", operation: operationName, ...attributes },
      status: "ok",
      budgetMs: P95_TOTAL_BUDGET,
      budgetExceeded: false,
    };

    this.traces.set(traceId, [root]);
    return { traceId, rootSpanId };
  }

  /**
   * Start a child span for a specific layer.
   */
  public startSpan(
    traceId: string,
    layer: LayerName,
    operation: string,
    parentSpanId?: string,
    extraAttrs: Record<string, string | number | boolean> = {}
  ): string {
    const spanId = newSpanId();
    const span: Span = {
      traceId,
      spanId,
      parentSpanId,
      name: `${layer}:${operation}`,
      layer,
      startTime: performance.now(),
      attributes: { layer, operation, ...extraAttrs },
      status: "ok",
      budgetMs: LAYER_BUDGETS[layer],
      budgetExceeded: false,
    };

    const spans = this.traces.get(traceId) ?? [];
    spans.push(span);
    this.traces.set(traceId, spans);
    return spanId;
  }

  /**
   * End a span and record duration.
   */
  public endSpan(
    traceId: string,
    spanId: string,
    status: Span["status"] = "ok",
    error?: string
  ): Span | null {
    const spans = this.traces.get(traceId);
    if (!spans) return null;

    const span = spans.find((s) => s.spanId === spanId);
    if (!span) return null;

    span.endTime  = performance.now();
    span.duration = span.endTime - span.startTime;
    span.status   = status;
    span.error    = error;
    span.budgetExceeded = span.duration > span.budgetMs;

    return span;
  }

  /**
   * Attach additional attributes to an existing span.
   */
  public addSpanAttributes(
    traceId: string,
    spanId: string,
    attrs: Record<string, string | number | boolean | undefined>
  ): Span | null {
    const spans = this.traces.get(traceId);
    if (!spans) return null;

    const span = spans.find((s) => s.spanId === spanId);
    if (!span) return null;

    span.attributes = {
      ...span.attributes,
      ...attrs,
    };
    return span;
  }

  /**
   * Finalize and export a complete trace.
   */
  public finishTrace(traceId: string): TraceResult | null {
    const spans = this.traces.get(traceId);
    if (!spans || spans.length === 0) return null;

    // Close any unclosed spans
    const now = performance.now();
    spans.forEach((s) => {
      if (s.endTime === undefined) {
        s.endTime  = now;
        s.duration = now - s.startTime;
        s.budgetExceeded = s.duration > s.budgetMs;
      }
    });

    const root = spans[0];
    const totalDuration = (root.endTime ?? now) - root.startTime;

    // Layer breakdown
    const layerBreakdown: Record<LayerName, number> = {} as Record<LayerName, number>;
    for (const layer of Object.keys(LAYER_BUDGETS) as LayerName[]) {
      const layerSpans = spans.filter((s) => {
        if (s.layer !== layer || s.duration === undefined) return false;
        const parent = s.parentSpanId ? spans.find((candidate) => candidate.spanId === s.parentSpanId) : null;
        return parent?.layer !== layer;
      });
      layerBreakdown[layer] = layerSpans.reduce((sum, s) => sum + (s.duration ?? 0), 0);
    }

    const result: TraceResult = {
      traceId,
      spans,
      totalDuration: Math.round(totalDuration * 100) / 100,
      p95Budget: P95_TOTAL_BUDGET,
      withinBudget: totalDuration <= P95_TOTAL_BUDGET,
      layerBreakdown,
      xrayHeader: this.buildXRayHeader(traceId, root.spanId),
      zipkinHeaders: this.buildZipkinHeaders(traceId, root.spanId),
      otlpSpans: this.toOTLP(spans),
    };

    // Evict oldest if buffer full
    if (this.traces.size >= this.MAX_TRACES) {
      const oldest = this.traces.keys().next().value;
      if (oldest) this.traces.delete(oldest);
    }
    this.traces.delete(traceId);

    return result;
  }

  /**
   * Convenience: wrap an async function with automatic span lifecycle.
   */
  public async withSpan<T>(
    traceId: string,
    layer: LayerName,
    operation: string,
    fn: () => Promise<T>,
    parentSpanId?: string,
    attrs: Record<string, string | number | boolean> = {}
  ): Promise<T> {
    const spanId = this.startSpan(traceId, layer, operation, parentSpanId, attrs);
    try {
      const result = await fn();
      this.endSpan(traceId, spanId, "ok");
      return result;
    } catch (e) {
      this.endSpan(traceId, spanId, "error", String(e));
      throw e;
    }
  }

  /**
   * Get budget warning for a layer span (useful for dashboard display).
   */
  public getBudgetStatus(span: Span): { label: string; color: string; pct: number } {
    const pct = Math.round(((span.duration ?? 0) / span.budgetMs) * 100);
    if (pct < 70)  return { label: "正常",   color: "text-teal-600",   pct };
    if (pct < 90)  return { label: "เฝ้าระวัง", color: "text-yellow-600", pct };
    if (pct < 100) return { label: "ใกล้เต็ม", color: "text-orange-600", pct };
    return { label: "เกินงบ ❌", color: "text-red-600", pct };
  }

  // ── Header builders ──────────────────────────────────────────────────────

  private buildXRayHeader(traceId: string, spanId: string): string {
    // AWS X-Ray format: Root=1-{8-hex}-{24-hex};Parent={spanId};Sampled=1
    const epoch   = Math.floor(Date.now() / 1000).toString(16).padStart(8, "0");
    const unique  = traceId.slice(0, 24);
    return `Root=1-${epoch}-${unique};Parent=${spanId};Sampled=1`;
  }

  private buildZipkinHeaders(traceId: string, spanId: string): ZipkinHeaders {
    return {
      "X-B3-TraceId":      traceId,
      "X-B3-SpanId":       spanId,
      "X-B3-ParentSpanId": "0000000000000000",
      "X-B3-Sampled":      "1",
    };
  }

  private toOTLP(spans: Span[]): OTLPSpan[] {
    const epoch = Date.now();
    return spans.map((s) => ({
      traceId:      s.traceId,
      spanId:       s.spanId,
      parentSpanId: s.parentSpanId,
      name:         s.name,
      startTimeUnixNano: String(BigInt(epoch) * 1_000_000n + BigInt(Math.round(s.startTime * 1_000_000))),
      endTimeUnixNano:   String(BigInt(epoch) * 1_000_000n + BigInt(Math.round((s.endTime ?? s.startTime) * 1_000_000))),
      attributes: Object.entries(s.attributes).map(([key, value]) => ({
        key,
        value: typeof value === "number"  ? { intValue: value }    :
               typeof value === "boolean" ? { boolValue: value }   :
                                            { stringValue: String(value ?? "") },
      })),
      status: { code: s.status === "ok" ? 1 : 2 },
    }));
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const tracer = LegalTracer.getInstance();

// ─── Pre-built trace for the full orchestration pipeline ─────────────────────

/**
 * Creates a complete L0-L6 trace for one search/chat request.
 * Use in agentOrchestrator or API route handler:
 *
 *   const trace = await traceFullPipeline("ค้นหาคดีฉ้อโกง", "user-001");
 *   console.log(trace.withinBudget, trace.totalDuration);
 */
export async function traceFullPipeline(
  query: string,
  userId: string,
  layerFns: Partial<Record<LayerName, () => Promise<unknown>>> = {}
): Promise<TraceResult> {
  const { traceId, rootSpanId } = tracer.startTrace("legal_pipeline", {
    layer: "L0",
    operation: "full_pipeline",
    userId,
  });

  const layers: Array<{ layer: LayerName; op: string }> = [
    { layer: "L0", op: "query_router" },
    { layer: "L1", op: "vector_retrieval" },
    { layer: "L2", op: "rqs_quality_filter" },
    { layer: "L3", op: "cfs_fairness" },
    { layer: "L4", op: "hybrid_reranking" },
    { layer: "L5", op: "safety_gate" },
    { layer: "L6", op: "multi_agent_orchestrator" },
  ];

  const prevSpanId = rootSpanId;
  for (const { layer, op } of layers) {
    const fn = layerFns[layer] ?? (() => Promise.resolve());
    await tracer.withSpan(traceId, layer, op, fn, prevSpanId, { userId });
    // prevSpanId advances — each layer is a child of the previous (sequential chain)
  }

  return tracer.finishTrace(traceId)!;
}
