import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  BarChart3, Play, Database, CheckCircle2, XCircle,
  Clock, Target, AlertTriangle, Loader2
} from "lucide-react";

import { API_BASE } from "@/lib/runtimeConfig";

interface BenchmarkResult {
  case_id: string;
  hit_at_1: boolean;
  hit_at_3: boolean;
  hit_at_5: boolean;
  reciprocal_rank: number;
  citation_accuracy: number;
  latency_ms: number;
}

interface BenchmarkReport {
  total_cases: number;
  hit_at_1: number;
  hit_at_3: number;
  hit_at_5: number;
  mrr: number;
  avg_citation_accuracy: number;
  hallucination_rate: number;
  avg_latency_ms: number;
  results: BenchmarkResult[];
}

interface BenchmarkCase {
  id: string;
  query: string;
  expected_statutes: string[];
  expected_case_type: string;
  difficulty: string;
  source: string;
}

const NitiBenchPage = () => {
  const [cases, setCases] = useState<BenchmarkCase[]>([]);
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCases, setLoadingCases] = useState(false);
  const [error, setError] = useState("");

  const loadCases = async () => {
    setLoadingCases(true);
    setError("");
    try {
      const resp = await fetch(`${API_BASE}/benchmark/cases`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setCases(data.cases || []);
    } catch (e) {
      setError("ไม่สามารถโหลด benchmark cases ได้ — ตรวจสอบว่า backend ทำงานอยู่");
    }
    setLoadingCases(false);
  };

  const runBenchmark = async () => {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const resp = await fetch(`${API_BASE}/benchmark/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ include_survey: true, include_hf: false }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setReport(data);
    } catch (e) {
      setError("ไม่สามารถรัน benchmark ได้ — ตรวจสอบว่า backend ทำงานอยู่");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">NitiBench — Thai Legal RAG Benchmark</h1>
            <p className="text-muted-foreground">วัดคุณภาพ RAG pipeline ด้วย benchmark มาตรฐาน (VISAI/EMNLP 2025)</p>
          </div>
        </div>

        <div className="max-w-5xl space-y-6">
          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button onClick={loadCases} disabled={loadingCases}
              className="flex items-center gap-2 bg-muted border border-border px-5 py-2.5 rounded-xl font-medium hover:bg-secondary transition-colors disabled:opacity-50">
              {loadingCases ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              โหลด Test Cases
            </button>
            <button onClick={runBenchmark} disabled={loading}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              รัน Benchmark
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-xl p-4 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Report */}
          {report && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <h2 className="font-heading text-lg font-bold">ผลลัพธ์ Benchmark</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard icon={Target} label="Hit@3" value={`${(report.hit_at_3 * 100).toFixed(1)}%`}
                  color={report.hit_at_3 >= 0.9 ? "text-teal" : report.hit_at_3 >= 0.7 ? "text-accent-foreground" : "text-destructive"} />
                <MetricCard icon={BarChart3} label="MRR" value={report.mrr.toFixed(3)} color="text-primary" />
                <MetricCard icon={CheckCircle2} label="Citation Accuracy" value={`${(report.avg_citation_accuracy * 100).toFixed(1)}%`} color="text-teal" />
                <MetricCard icon={Clock} label="Avg Latency" value={`${report.avg_latency_ms.toFixed(0)}ms`}
                  color={report.avg_latency_ms < 2300 ? "text-teal" : "text-destructive"} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{(report.hit_at_1 * 100).toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">Hit@1</div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-teal">{(report.hit_at_5 * 100).toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">Hit@5</div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <div className={`text-2xl font-bold ${report.hallucination_rate < 0.01 ? "text-teal" : "text-destructive"}`}>
                    {(report.hallucination_rate * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Hallucination Rate</div>
                </div>
              </div>

              {/* Per-case results */}
              <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-heading font-bold">รายละเอียดแต่ละ Case ({report.total_cases} cases)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Case ID</th>
                        <th className="px-4 py-3 text-center font-medium">Hit@1</th>
                        <th className="px-4 py-3 text-center font-medium">Hit@3</th>
                        <th className="px-4 py-3 text-center font-medium">Hit@5</th>
                        <th className="px-4 py-3 text-right font-medium">RR</th>
                        <th className="px-4 py-3 text-right font-medium">Citation</th>
                        <th className="px-4 py-3 text-right font-medium">Latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {report.results.map(r => (
                        <tr key={r.case_id} className="hover:bg-muted/50">
                          <td className="px-4 py-3 font-mono text-xs">{r.case_id}</td>
                          <td className="px-4 py-3 text-center">{r.hit_at_1 ? <CheckCircle2 className="w-4 h-4 text-teal mx-auto" /> : <XCircle className="w-4 h-4 text-muted-foreground mx-auto" />}</td>
                          <td className="px-4 py-3 text-center">{r.hit_at_3 ? <CheckCircle2 className="w-4 h-4 text-teal mx-auto" /> : <XCircle className="w-4 h-4 text-muted-foreground mx-auto" />}</td>
                          <td className="px-4 py-3 text-center">{r.hit_at_5 ? <CheckCircle2 className="w-4 h-4 text-teal mx-auto" /> : <XCircle className="w-4 h-4 text-muted-foreground mx-auto" />}</td>
                          <td className="px-4 py-3 text-right font-mono">{r.reciprocal_rank.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono">{(r.citation_accuracy * 100).toFixed(0)}%</td>
                          <td className="px-4 py-3 text-right font-mono">{r.latency_ms.toFixed(0)}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Test Cases */}
          {cases.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="font-heading text-lg font-bold mb-3">Test Cases ({cases.length})</h2>
              <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">ID</th>
                        <th className="px-4 py-3 text-left font-medium">Query</th>
                        <th className="px-4 py-3 text-left font-medium">ประเภท</th>
                        <th className="px-4 py-3 text-left font-medium">ความยาก</th>
                        <th className="px-4 py-3 text-left font-medium">มาตราที่คาดหวัง</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {cases.map(c => (
                        <tr key={c.id} className="hover:bg-muted/50">
                          <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                          <td className="px-4 py-3 max-w-[300px] truncate">{c.query}</td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs">{c.expected_case_type}</span></td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${
                            c.difficulty === "easy" ? "bg-teal/10 text-teal" :
                            c.difficulty === "hard" ? "bg-destructive/10 text-destructive" :
                            "bg-accent/10 text-accent-foreground"
                          }`}>{c.difficulty}</span></td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{c.expected_statutes.join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, color }: { icon: typeof Target; label: string; value: string; color: string }) => (
  <div className="bg-card border border-border rounded-xl p-4 text-center shadow-card">
    <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
    <div className={`font-heading text-2xl font-bold ${color}`}>{value}</div>
    <div className="text-xs text-muted-foreground mt-1">{label}</div>
  </div>
);

export default NitiBenchPage;
