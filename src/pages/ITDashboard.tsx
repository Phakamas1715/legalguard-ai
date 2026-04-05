import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Shield, Database, BarChart3, Hash, ShieldCheck, AlertTriangle,
  CheckCircle2, Cpu, Server, Activity
} from "lucide-react";
import { getAuditEntries, verifyChainIntegrity } from "@/lib/auditLog";
import { maskPII, PII_TYPE_LABELS, type PIISpan } from "@/lib/piiMasking";

const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:8000") + "/api/v1";

interface LiveMetrics {
  timestamp: string;
  requests_1h: number;
  requests_24h: number;
  requests_by_action_1h: Record<string, number>;
  avg_confidence_1h: number;
  cache_hit_rate_1h: number;
  error_rate_1h: number;
  system_health: Record<string, string>;
  ai_metrics: { avg_honesty_score: number; hallucination_rate: number; pii_leak_count: number };
}

const ITDashboard = () => {
  const [chainValid, setChainValid] = useState<boolean | null>(null);
  const [auditEntries, setAuditEntries] = useState(getAuditEntries().slice(0, 20));
  const [piiInput, setPiiInput] = useState("");
  const [piiResult, setPiiResult] = useState<{ masked: string; spans: PIISpan[]; piiCount: number } | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null);
  const [liveError, setLiveError] = useState("");

  useEffect(() => { verifyChainIntegrity().then(r => setChainValid(r.valid)); }, []);
  useEffect(() => {
    const fetchLive = async () => {
      try {
        const resp = await fetch(`${API_BASE}/dashboard/live`);
        if (resp.ok) { setLiveMetrics(await resp.json()); setLiveError(""); }
      } catch { setLiveError("Backend ไม่พร้อม"); }
    };
    fetchLive();
    const interval = setInterval(fetchLive, 30000);
    return () => clearInterval(interval);
  }, []);
  const runPII = () => { if (piiInput.trim()) setPiiResult(maskPII(piiInput)); };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"><Server className="w-8 h-8 text-primary" /></div>
          <div>
            <h1 className="font-heading text-2xl font-bold">ระบบ IT / ผู้ดูแลระบบ</h1>
            <p className="text-muted-foreground">ข้อมูลเชิงเทคนิค สำหรับทีมพัฒนาและผู้ดูแลระบบ</p>
          </div>
        </div>

        <div className="space-y-6 max-w-5xl">
          {/* System Metrics — Live from backend */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat icon={Activity} value={liveMetrics ? String(liveMetrics.requests_1h) : "—"} label="Requests (1h)" color="text-primary" />
            <Stat icon={Database} value={liveMetrics ? String(liveMetrics.requests_24h) : "—"} label="Requests (24h)" color="text-teal" />
            <Stat icon={Cpu} value="5" label="LangGraph Agents" color="text-accent-foreground" />
            <Stat icon={Shield} value="7 ชั้น" label="Anti-Hallucination" color="text-teal" />
          </div>

          {/* Live Status Banner */}
          {liveMetrics && (
            <div className="bg-teal/5 border border-teal/20 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-teal rounded-full animate-pulse" />
                <span className="text-sm font-medium">Live Metrics</span>
                <span className="text-xs text-muted-foreground">อัพเดตทุก 30 วินาที</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span>Cache Hit: <span className="font-bold">{(liveMetrics.cache_hit_rate_1h * 100).toFixed(1)}%</span></span>
                <span>Error Rate: <span className={`font-bold ${liveMetrics.error_rate_1h > 0.05 ? "text-destructive" : "text-teal"}`}>{(liveMetrics.error_rate_1h * 100).toFixed(1)}%</span></span>
                <span>Confidence: <span className="font-bold">{(liveMetrics.avg_confidence_1h * 100).toFixed(1)}%</span></span>
              </div>
            </div>
          )}
          {liveError && (
            <div className="bg-muted border border-border rounded-xl p-3 text-xs text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {liveError} — แสดงข้อมูล static แทน
            </div>
          )}

          {/* Technical Stats */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="font-heading font-bold mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Performance Metrics (เป้าหมาย)</h3>
              <p className="text-xs text-muted-foreground mb-3">ค่าด้านล่างเป็นเป้าหมายจาก design doc — ค่าจริงจะวัดเมื่อ ingest ข้อมูลครบ</p>
              <div className="space-y-3">
                {[
                  { label: "Hit@3 Accuracy", value: "93.7%" },
                  { label: "P95 Latency", value: "689ms" },
                  { label: "Hallucination Rate", value: "< 1%" },
                  { label: "PII Recall", value: "99.2%" },
                  { label: "CFS Fairness", value: "93.5%" },
                  { label: "Honesty Score", value: "≥ 0.85" },
                  { label: "Hybrid Search Ratio", value: "FAISS 70% + BM25 30%" },
                  { label: "Reranking", value: "LeJEPA + OOD Detection" },
                ].map(m => (
                  <div key={m.label} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="font-medium font-mono">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="font-heading font-bold mb-4 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-teal" /> CFS Fairness Monitoring (เป้าหมาย)</h3>
              <p className="text-xs text-muted-foreground mb-3">ค่าจริงจะคำนวณจาก search results — ใช้ POST /dashboard/fairness</p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-teal-light rounded-xl text-center"><div className="text-lg font-bold text-teal">93.5%</div><div className="text-[11px] text-muted-foreground">CFS</div></div>
                <div className="p-3 bg-gold-light rounded-xl text-center"><div className="text-lg font-bold text-accent-foreground">0.85</div><div className="text-[11px] text-muted-foreground">H-Score</div></div>
                <div className="p-3 bg-secondary rounded-xl text-center"><div className="text-lg font-bold text-primary">&lt;1%</div><div className="text-[11px] text-muted-foreground">Halluc.</div></div>
              </div>
              <div className="space-y-2">
                {[{ label: "F_geo (ภูมิศาสตร์)", value: 92, color: "bg-teal" }, { label: "F_court (ประเภทศาล)", value: 88, color: "bg-primary" }, { label: "F_time (ช่วงเวลา)", value: 95, color: "bg-accent" }].map(b => (
                  <div key={b.label} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-36">{b.label}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full ${b.color} rounded-full`} style={{ width: `${b.value}%` }} /></div>
                    <span className="text-xs font-bold w-10 text-right">{b.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* LLM Providers */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <h3 className="font-heading font-bold mb-4 flex items-center gap-2"><Cpu className="w-5 h-5 text-primary" /> LLM Fallback Chain</h3>
            <div className="flex flex-wrap gap-3">
              {["Bedrock Claude (AWS)", "Typhoon (SCB 10X)", "SeaLLM-7B-v2 (HF)", "Anthropic Claude", "Ollama (Local)"].map((p, i) => (
                <div key={p} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm">
                  <span className="text-xs font-bold text-primary">{i + 1}</span>
                  <span>{p}</span>
                  {i < 4 && <span className="text-muted-foreground">→</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Audit Log */}
          <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-heading font-bold flex items-center gap-2"><Hash className="w-5 h-5 text-primary" /> CAL-130 Audit Log</h3>
              <span className="text-xs text-muted-foreground font-mono">SHA-256 Hash Chain | {chainValid === null ? "..." : chainValid ? "✅ Valid" : "❌ Broken"}</span>
            </div>
            {auditEntries.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">ยังไม่มี audit entry</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted"><tr><th className="px-4 py-3 text-left font-medium">เวลา</th><th className="px-4 py-3 text-left font-medium">Action</th><th className="px-4 py-3 text-left font-medium">Query</th><th className="px-4 py-3 text-left font-medium">Hash</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {auditEntries.map(e => (
                      <tr key={e.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 whitespace-nowrap">{new Date(e.timestamp).toLocaleString("th-TH")}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">{e.action}</span></td>
                        <td className="px-4 py-3 max-w-[200px] truncate">{e.query}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{e.entryHash.slice(0, 12)}…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* PII Masking */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <h3 className="font-heading font-bold mb-2 flex items-center gap-2"><Shield className="w-5 h-5 text-teal" /> PII Masking Engine Test</h3>
            <textarea value={piiInput} onChange={e => setPiiInput(e.target.value)}
              placeholder="วางข้อความเพื่อทดสอบ PII Masking..." rows={3}
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y" />
            <button onClick={runPII} disabled={!piiInput.trim()} className="mt-3 flex items-center gap-2 bg-teal text-white px-6 py-2.5 rounded-xl font-medium hover:opacity-90 disabled:opacity-50">
              <Shield className="w-4 h-4" /> ทดสอบ
            </button>
            {piiResult && (
              <div className="mt-4 bg-teal-light rounded-xl p-4 text-sm whitespace-pre-wrap">{piiResult.masked}
                {piiResult.spans.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {piiResult.spans.map((s, i) => (
                      <div key={i} className="text-xs"><span className="text-destructive line-through">{s.original}</span> → <span className="text-teal font-medium">{s.masked}</span></div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

const Stat = ({ icon: Icon, value, label, color }: { icon: typeof Database; value: string; label: string; color: string }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-4 text-center shadow-card">
    <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
    <div className={`font-heading text-2xl font-bold ${color}`}>{value}</div>
    <div className="text-xs text-muted-foreground mt-1">{label}</div>
  </motion.div>
);

export default ITDashboard;
