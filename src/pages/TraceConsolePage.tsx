import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { orchestrator, type OrchestratorResult } from "@/lib/agentOrchestrator";
import { LAYER_METADATA, LAYER_ORDER, tracer, type LayerName, type Span, type TraceResult } from "@/lib/tracing";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Database,
  Loader2,
  Play,
  ShieldCheck,
  Workflow,
} from "lucide-react";

const EXAMPLE_QUERIES = [
  "คดีฉ้อโกงออนไลน์มาตรา 341 มีประเด็นอะไรที่ควรค้นต่อ",
  "สรุปแนวคำพิพากษาเกี่ยวกับการกู้ยืมเงินไม่คืน และมาตราที่เกี่ยวข้อง",
  "ผู้พิพากษาควรเห็นประเด็นใดบ้างเมื่อคดีมีข้อเท็จจริงขัดกันหลายส่วน",
];

const TraceConsolePage = () => {
  const [query, setQuery] = useState(EXAMPLE_QUERIES[0]);
  const [userId, setUserId] = useState("government");
  const [loading, setLoading] = useState(false);
  const [trace, setTrace] = useState<TraceResult | null>(null);
  const [result, setResult] = useState<OrchestratorResult | null>(null);
  const [error, setError] = useState<string>("");

  const displaySpans = useMemo(() => {
    if (!trace) return {} as Record<LayerName, Span | null>;

    return Object.fromEntries(
      LAYER_ORDER.map((layer) => {
        const spans = trace.spans.filter((span) => span.layer === layer);
        const primary = spans.find((span) => span.name.startsWith(`${layer}:`)) ?? spans[0] ?? null;
        return [layer, primary];
      })
    ) as Record<LayerName, Span | null>;
  }, [trace]);

  const agentSpans = useMemo(() => {
    if (!trace) return [];
    return trace.spans.filter((span) => span.layer === "L6" && typeof span.attributes.agentRole === "string");
  }, [trace]);

  const runTrace = async () => {
    if (!query.trim() || loading) return;

    setLoading(true);
    setError("");
    setTrace(null);
    setResult(null);

    try {
      const execution = await orchestrator.orchestrateWithTrace(query.trim(), userId.trim() || "government");
      setTrace(execution.trace);
      setResult(execution.result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const maybeTrace = typeof err === "object" && err !== null && "trace" in err ? (err as { trace?: TraceResult }).trace ?? null : null;
      if (maybeTrace) setTrace(maybeTrace);
      setError(message || "ไม่สามารถรัน trace console ได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10 flex-1">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="rounded-[2rem] border border-border bg-card p-8 shadow-card">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3 max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-primary">
                  <Activity className="w-3 h-3" /> Trace Console
                </div>
                <h1 className="font-heading text-3xl md:text-5xl font-black tracking-tight">
                  Debug Console สำหรับ <span className="text-primary">L0-L6 Runtime Trace</span>
                </h1>
                <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
                  รัน query จริงผ่าน orchestrator แล้วดูทีละชั้นตั้งแต่ query router, retrieval, quality filter,
                  fairness baseline, reranking, safety gate ไปจนถึง multi-agent execution พร้อม latency, ownership และตำแหน่งของ Feynman Multi-Agent Engine ใน stack จริง
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:min-w-[320px]">
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mode</div>
                  <div className="mt-1 text-sm font-bold">Real Orchestrator Trace</div>
                </div>
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Coverage</div>
                  <div className="mt-1 text-sm font-bold">L0-L6</div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_180px_180px]">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-border bg-background px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="ระบุ query ที่ต้องการตรวจ trace ของ agent pipeline..."
              />
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="rounded-2xl border border-border bg-background px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="user/role"
              />
              <button
                onClick={runTrace}
                disabled={loading || !query.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {loading ? "กำลังรัน..." : "Run Trace"}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((item) => (
                <button
                  key={item}
                  onClick={() => setQuery(item)}
                  className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/30 hover:text-primary"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card">
                <div className="flex items-center gap-2 mb-5">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <h2 className="font-heading text-xl font-bold">Feynman Engine Placement</h2>
                </div>
                <div className="space-y-3">
                  {LAYER_ORDER.map((layer) => {
                    const meta = LAYER_METADATA[layer];
                    const stageLabel =
                      meta.feynmanStage === "core"
                        ? "Feynman Core"
                        : meta.feynmanStage === "entry"
                          ? "Pre-Feynman Guard"
                          : "Outside Feynman";

                    return (
                      <div key={`engine-${layer}`} className="rounded-2xl border border-border bg-muted/20 p-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                                {layer}
                              </span>
                              <span className="text-sm font-bold">{meta.title}</span>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {meta.runtime} · {meta.owner}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-black ${
                              meta.feynmanStage === "core"
                                ? "bg-primary/10 text-primary"
                                : meta.feynmanStage === "entry"
                                  ? "bg-gold/10 text-gold"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {stageLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  สรุปสั้น: <span className="font-bold text-foreground">Feynman Multi-Agent Engine อยู่ที่ชั้น L6</span> ส่วน L0-L5 เป็น routing,
                  retrieval, trust, inference และ governance layer ที่คุมก่อนและหลัง agent execution
                </p>
              </div>

              <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card">
                <div className="flex items-center gap-2 mb-5">
                  <Workflow className="w-5 h-5 text-primary" />
                  <h2 className="font-heading text-xl font-bold">Layer Breakdown</h2>
                </div>

                <div className="space-y-4">
                  {LAYER_ORDER.map((layer) => {
                    const span = displaySpans[layer];
                    const meta = LAYER_METADATA[layer];
                    const budget = span ? tracer.getBudgetStatus(span) : null;
                    const layerDuration = trace?.layerBreakdown[layer] ?? 0;

                    return (
                      <div key={layer} className="rounded-2xl border border-border bg-muted/30 p-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                                {layer}
                              </span>
                              <span className="text-sm font-bold">{meta.title}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{meta.description}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {meta.runtime} · {meta.owner}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-border px-3 py-1 text-[11px] font-bold text-foreground">
                              {layerDuration.toFixed(2)} ms
                            </span>
                            {span && budget && (
                              <span className={`rounded-full px-3 py-1 text-[11px] font-black ${budget.color}`}>
                                {budget.label} {budget.pct}%
                              </span>
                            )}
                          </div>
                        </div>

                        {span ? (
                          <div className="mt-4 grid gap-2 text-xs md:grid-cols-2">
                            <div className="rounded-xl border border-border bg-background px-3 py-2">
                              <span className="text-muted-foreground">operation</span>
                              <div className="mt-1 font-mono text-[11px]">{span.attributes.operation}</div>
                            </div>
                            <div className="rounded-xl border border-border bg-background px-3 py-2">
                              <span className="text-muted-foreground">status</span>
                              <div className="mt-1 font-mono text-[11px]">{span.status}</div>
                            </div>
                            {Object.entries(span.attributes)
                              .filter(([key]) => !["layer", "operation"].includes(key))
                              .slice(0, 6)
                              .map(([key, value]) => (
                                <div key={key} className="rounded-xl border border-border bg-background px-3 py-2">
                                  <span className="text-muted-foreground">{key}</span>
                                  <div className="mt-1 font-mono text-[11px] break-all">{String(value)}</div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <p className="mt-4 text-xs text-muted-foreground">ยังไม่มี span สำหรับชั้นนี้</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card">
                <div className="flex items-center gap-2 mb-5">
                  <Cpu className="w-5 h-5 text-primary" />
                  <h2 className="font-heading text-xl font-bold">L6 Agent Breakdown</h2>
                </div>
                <div className="space-y-3">
                  {result?.agentTimeline.length ? result.agentTimeline.map((step) => {
                    const span = agentSpans.find((item) => item.attributes.agentRole === step.role || item.attributes.operation === step.action.toLowerCase());
                    return (
                      <div key={step.id} className="rounded-2xl border border-border bg-muted/20 p-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                                {step.role}
                              </span>
                              <span className="text-sm font-bold">{step.action}</span>
                            </div>
                            <p className="mt-2 text-xs leading-6 text-muted-foreground">{step.summary}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-border px-3 py-1 text-[11px] font-bold text-foreground">
                              {Math.round(step.confidence * 100)}%
                            </span>
                            <span className="rounded-full border border-border px-3 py-1 text-[11px] font-bold text-foreground">
                              {span?.duration ? `${span.duration.toFixed(2)} ms` : "runtime pending"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <p className="rounded-2xl border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                      รอผลการรัน query เพื่อแสดงขั้นย่อยของ Feynman Multi-Agent Engine
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card">
                <div className="flex items-center gap-2 mb-5">
                  <Cpu className="w-5 h-5 text-primary" />
                  <h2 className="font-heading text-xl font-bold">Execution Summary</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border bg-muted/40 p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Trace ID</div>
                    <div className="mt-1 font-mono text-[11px] break-all">{trace?.traceId ?? "-"}</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/40 p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Duration</div>
                    <div className="mt-1 text-lg font-black">{trace ? `${trace.totalDuration.toFixed(2)} ms` : "-"}</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/40 p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Budget</div>
                    <div className="mt-1 text-sm font-bold">
                      {trace ? (trace.withinBudget ? "Within Budget" : "Exceeded Budget") : "-"}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/40 p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Audit Integrity</div>
                    <div className="mt-1 text-sm font-bold">{result ? (result.auditIntegrity ? "valid" : "invalid") : "-"}</div>
                  </div>
                </div>

                {result && (
                  <>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-border bg-background px-4 py-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Risk Tier</div>
                        <div className="mt-1 text-base font-black">{result.riskTier}</div>
                      </div>
                      <div className="rounded-2xl border border-border bg-background px-4 py-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Honesty Score</div>
                        <div className="mt-1 text-base font-black">{Math.round(result.honestyScore * 100)}%</div>
                      </div>
                      <div className="rounded-2xl border border-border bg-background px-4 py-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Predicted Outcome</div>
                        <div className="mt-1 text-sm font-bold">{result.predictedOutcome}</div>
                      </div>
                      <div className="rounded-2xl border border-border bg-background px-4 py-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Violations</div>
                        <div className="mt-1 text-base font-black">{result.violations}</div>
                      </div>
                      <div className="rounded-2xl border border-border bg-background px-4 py-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Engine Runtime</div>
                        <div className="mt-1 text-sm font-bold">{result.engineRuntime}</div>
                      </div>
                      <div className="rounded-2xl border border-border bg-background px-4 py-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Engine Layer</div>
                        <div className="mt-1 text-sm font-bold">{result.engineLayer}</div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-border bg-muted/30 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-4 h-4 text-teal" />
                        <h3 className="text-sm font-black">Final Answer</h3>
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                        {result.answer}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-5 h-5 text-primary" />
                  <h2 className="font-heading text-xl font-bold">Raw Trace Console</h2>
                </div>
                <div className="rounded-2xl border border-border bg-[#0b1220] p-4 text-[11px] text-white/80 font-mono overflow-x-auto">
                  <pre>{trace ? JSON.stringify(trace, null, 2) : "// รอผล trace จาก orchestrator"}</pre>
                </div>
              </div>

              <div className="rounded-[2rem] border border-primary/20 bg-primary/5 p-6">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="font-bold mb-1">Debug Notes</h3>
                    <p className="text-sm text-muted-foreground">
                      หน้านี้ใช้ orchestrator จริงและ tracer จริงของระบบ ไม่ได้ดึง trace จาก pipeline จำลองแบบเดิม
                      จึงเหมาะสำหรับ demo ฝั่ง IT, governance และการอธิบาย architecture กับ Mentor โดยเฉพาะเวลาต้องตอบให้ชัดว่า Feynman ทำงานตรง L6 และมี guardrails อะไรก่อน-หลังบ้าง
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">
                      เปิด query ตัวอย่าง <ChevronRight className="w-4 h-4" /> ดู span ทีละชั้นแบบ real flow
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TraceConsolePage;
