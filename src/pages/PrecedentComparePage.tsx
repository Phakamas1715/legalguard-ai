import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Scale, Send, Loader2, AlertTriangle, ChevronDown, ChevronUp,
  BarChart3, BookOpen, Hash, Copy, CheckCircle2, Shield
} from "lucide-react";
import { API_BASE } from "@/lib/runtimeConfig";

interface PrecedentRow {
  rank: number;
  case_no: string;
  year: string;
  court: string;
  case_type: string;
  key_facts: string;
  statutes: string[];
  verdict_summary: string;
  relevance_score: number;
  source_code: string;
}

interface CompareResponse {
  rows: PrecedentRow[];
  total: int;
  query_used: string;
  ai_disclosure: string;
}

// TypeScript workaround
type int = number;

const CASE_TYPES = ["", "แพ่ง", "อาญา", "ปกครอง", "แรงงาน", "เยาวชนและครอบครัว", "ผู้บริโภค"];

const SCORE_COLOR = (s: number) =>
  s >= 0.8 ? "text-teal bg-teal/10 border-teal/30"
  : s >= 0.6 ? "text-amber-600 bg-amber-50 border-amber-200"
  : "text-muted-foreground bg-muted border-border";

const EXAMPLES = [
  { label: "กู้ยืมไม่คืน", query: "กู้ยืมเงินครบกำหนดไม่ชำระคืน เรียกดอกเบี้ยตามสัญญา", caseType: "แพ่ง" },
  { label: "เลิกจ้างไม่เป็นธรรม", query: "เลิกจ้างโดยไม่จ่ายค่าชดเชย อ้างปรับโครงสร้าง", caseType: "แรงงาน" },
  { label: "ฉ้อโกงออนไลน์", query: "หลอกลวงขายสินค้าออนไลน์ รับเงินแล้วไม่ส่งสินค้า", caseType: "อาญา" },
];

const ROLE_OPTIONS = [
  { value: "judge", label: "ผู้พิพากษา" },
  { value: "admin_judge", label: "ตุลาการศาลปกครอง" },
  { value: "lawyer", label: "ทนายความ" },
  { value: "government", label: "เจ้าหน้าที่ศาล" },
];

const PrecedentComparePage = () => {
  const [query, setQuery] = useState("");
  const [caseType, setCaseType] = useState("");
  const [topK, setTopK] = useState(8);
  const [role, setRole] = useState("judge");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [error, setError] = useState("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(false);

  const handleSearch = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    setExpandedRow(null);
    try {
      const resp = await fetch(`${API_BASE}/judgment/precedent-compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, case_type: caseType, top_k: topK, role }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || `HTTP ${resp.status}`);
      }
      setResult(await resp.json() as CompareResponse);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "ไม่สามารถเชื่อมต่อ backend ได้");
    }
    setLoading(false);
  };

  const handleCopyTable = () => {
    if (!result) return;
    const header = "อันดับ\tเลขคดี\tปี\tศาล\tมาตรา\tสรุปคำวินิจฉัย\tคะแนน";
    const rows = result.rows.map(r =>
      `${r.rank}\t${r.case_no}\t${r.year}\t${r.court}\t${r.statutes.join(", ")}\t${r.verdict_summary}\t${r.relevance_score.toFixed(3)}`
    );
    navigator.clipboard.writeText([header, ...rows].join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1 max-w-7xl">

        {/* Header */}
        <div className="flex items-center gap-5 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg">
            <Scale className="w-8 h-8 text-primary" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest mb-1">
              Precedent Comparison View · Hybrid RAG
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground">
              เปรียบเทียบ<span className="text-primary">บรรทัดฐาน</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              ค้นหาคดีคล้ายกัน 5-15 คดี แสดงเป็นตารางเปรียบเทียบข้อเท็จจริง / มาตรา / คำวินิจฉัย
            </p>
          </div>
        </div>

        {/* Input panel */}
        <div className="rounded-2xl border border-border bg-card p-5 mb-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                ข้อเท็จจริง / ประเด็นคดี *
              </label>
              <textarea
                value={query}
                onChange={e => setQuery(e.target.value)}
                rows={3}
                placeholder="เช่น กู้ยืมเงินครบกำหนดไม่ชำระ เรียกดอกเบี้ยตามสัญญา..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  ประเภทคดี
                </label>
                <select
                  value={caseType}
                  onChange={e => setCaseType(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {CASE_TYPES.map(t => (
                    <option key={t} value={t}>{t || "ทุกประเภท"}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  บทบาท
                </label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  จำนวนคดี: {topK}
                </label>
                <input
                  type="range"
                  min={3}
                  max={15}
                  value={topK}
                  onChange={e => setTopK(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>3</span><span>15</span>
                </div>
              </div>
              <button
                onClick={handleSearch}
                disabled={loading || !query.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {loading ? "กำลังค้น..." : "ค้นหาบรรทัดฐาน"}
              </button>
            </div>
          </div>

          {/* Examples */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider self-center">ตัวอย่าง:</span>
            {EXAMPLES.map(ex => (
              <button
                key={ex.label}
                onClick={() => { setQuery(ex.query); setCaseType(ex.caseType); }}
                className="px-3 py-1 rounded-full border border-border bg-muted text-xs font-medium hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex gap-3 items-start mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-primary" />
            <p className="font-medium text-muted-foreground">กำลังค้นหาบรรทัดฐาน...</p>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div className="rounded-2xl border-2 border-dashed border-border p-16 text-center text-muted-foreground">
            <Scale className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">ตารางเปรียบเทียบบรรทัดฐานจะแสดงที่นี่</p>
            <p className="text-xs mt-1">ใส่ข้อเท็จจริงแล้วกด "ค้นหาบรรทัดฐาน"</p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            {/* Summary bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  พบ {result.total} คดีที่คล้ายกัน
                </div>
                <span className="text-xs text-muted-foreground">คำค้น: "{result.query_used}"</span>
              </div>
              <button
                onClick={handleCopyTable}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-white text-xs font-medium hover:bg-muted transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-teal" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "คัดลอกแล้ว" : "คัดลอกตาราง (TSV)"}
              </button>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block rounded-2xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground w-10">#</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">เลขคดี / ศาล</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">มาตรา</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">ข้อเท็จจริงสำคัญ</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">คะแนน</th>
                    <th className="px-4 py-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.rows.map((row) => (
                    <>
                      <tr
                        key={row.rank}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setExpandedRow(expandedRow === row.rank ? null : row.rank)}
                      >
                        <td className="px-4 py-3">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                            {row.rank}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-foreground text-xs">{row.case_no || "—"}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{row.court} {row.year && `· ${row.year}`}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {row.statutes.slice(0, 3).map((s, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded-md bg-primary/8 text-primary text-[9px] font-medium border border-primary/15 truncate max-w-[160px]">
                                {s}
                              </span>
                            ))}
                            {row.statutes.length > 3 && (
                              <span className="text-[9px] text-muted-foreground">+{row.statutes.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-xs text-foreground line-clamp-2">{row.key_facts || "—"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${SCORE_COLOR(row.relevance_score)}`}>
                            {(row.relevance_score * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {expandedRow === row.rank
                            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </td>
                      </tr>
                      {expandedRow === row.rank && (
                        <tr key={`${row.rank}-expanded`} className="bg-muted/20">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid gap-3 md:grid-cols-2">
                              <div>
                                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">ข้อเท็จจริงสำคัญ</p>
                                <p className="text-sm leading-relaxed">{row.key_facts || "—"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">สรุปคำวินิจฉัย</p>
                                <p className="text-sm leading-relaxed">{row.verdict_summary || "—"}</p>
                              </div>
                              {row.statutes.length > 0 && (
                                <div className="md:col-span-2">
                                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5">มาตราทั้งหมด</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {row.statutes.map((s, i) => (
                                      <span key={i} className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                                        {s}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {result.rows.map((row) => (
                <div key={row.rank} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {row.rank}
                      </span>
                      <div>
                        <p className="font-bold text-xs">{row.case_no || "—"}</p>
                        <p className="text-[10px] text-muted-foreground">{row.court} {row.year}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${SCORE_COLOR(row.relevance_score)}`}>
                      {(row.relevance_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-2">{row.key_facts}</p>
                  <div className="flex flex-wrap gap-1">
                    {row.statutes.slice(0, 3).map((s, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded-md bg-primary/8 text-primary text-[9px] font-medium border border-primary/15">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* AI Disclosure */}
            <div
              className="rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden cursor-pointer"
              onClick={() => setShowDisclosure(v => !v)}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-700">AI Disclosure — ศาลฎีกา พ.ศ. 2568</span>
                </div>
                {showDisclosure
                  ? <ChevronUp className="w-4 h-4 text-amber-600" />
                  : <ChevronDown className="w-4 h-4 text-amber-600" />}
              </div>
              {showDisclosure && (
                <div className="px-4 pb-4">
                  <p className="text-xs text-amber-700 leading-relaxed">{result.ai_disclosure}</p>
                </div>
              )}
            </div>

          </motion.div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default PrecedentComparePage;
