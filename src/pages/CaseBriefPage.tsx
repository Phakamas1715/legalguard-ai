import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  FileText, Send, Loader2, Copy, CheckCircle2, AlertTriangle,
  Shield, Users, Scale, BookOpen, Hash, Download, ChevronDown, ChevronUp
} from "lucide-react";
import { API_BASE } from "@/lib/runtimeConfig";

interface BriefResponse {
  parties: { plaintiff: string; defendant: string };
  case_no: string;
  court: string;
  case_type: string;
  facts: string;
  legal_issues: string[];
  statutes: string[];
  verdict_summary: string;
  key_reasoning: string;
  ai_disclosure: string;
  generated_at: string;
  pii_count: number;
}

const EXAMPLE_TEXT = `คดีหมายเลขดำที่ 1234/2566 ศาลแพ่งกรุงเทพใต้

โจทก์: บริษัท เอบีซี จำกัด
จำเลย: นายสมชาย ใจดี

ข้อเท็จจริง: โจทก์ทำสัญญากู้ยืมเงินกับจำเลยจำนวน 2,000,000 บาท เมื่อวันที่ 1 มกราคม 2565 กำหนดชำระคืนภายใน 1 ปี พร้อมดอกเบี้ยร้อยละ 7.5 ต่อปี จำเลยได้รับเงินแล้วแต่ครบกำหนดชำระไม่ยอมชำระเงินคืน โจทก์ทวงถามหลายครั้งแต่จำเลยเพิกเฉย โจทก์จึงฟ้องเรียกเงินต้นพร้อมดอกเบี้ยและค่าเสียหาย

ประเด็นข้อกฎหมาย: จำเลยผิดสัญญากู้ยืมเงินตาม ป.พ.พ. มาตรา 653 หรือไม่ โจทก์มีสิทธิเรียกดอกเบี้ยตาม ป.พ.พ. มาตรา 224 หรือไม่`;

const ROLE_OPTIONS = [
  { value: "judge", label: "ผู้พิพากษา" },
  { value: "admin_judge", label: "ตุลาการศาลปกครอง" },
  { value: "lawyer", label: "ทนายความ" },
  { value: "government", label: "เจ้าหน้าที่ศาล" },
];

const ALERT_COLORS: Record<string, string> = {
  none: "text-teal border-teal/30 bg-teal/5",
  low: "text-amber-600 border-amber-300 bg-amber-50",
  medium: "text-orange-600 border-orange-300 bg-orange-50",
  high: "text-red-600 border-red-300 bg-red-50",
};

const CaseBriefPage = () => {
  const [caseText, setCaseText] = useState("");
  const [caseNo, setCaseNo] = useState("");
  const [role, setRole] = useState("judge");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BriefResponse | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(false);

  const handleGenerate = async () => {
    if (!caseText.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const resp = await fetch(`${API_BASE}/judgment/brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_text: caseText, case_no: caseNo, role }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${resp.status}`);
      }
      setResult(await resp.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "ไม่สามารถเชื่อมต่อ backend ได้");
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (!result) return;
    const text = `CASE BRIEF — ${result.case_no || "ไม่ระบุเลขคดี"}
ศาล: ${result.court}  |  ประเภทคดี: ${result.case_type}
โจทก์: ${result.parties.plaintiff}  |  จำเลย: ${result.parties.defendant}

ข้อเท็จจริง:
${result.facts}

ประเด็นกฎหมาย:
${result.legal_issues.map((i, n) => `${n + 1}. ${i}`).join("\n")}

มาตราที่อ้างอิง: ${result.statutes.join(", ")}

สรุปคำวินิจฉัย:
${result.verdict_summary}

เหตุผลสำคัญ:
${result.key_reasoning}

---
${result.ai_disclosure}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1 max-w-5xl">

        {/* Header */}
        <div className="flex items-center gap-5 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest mb-1">
              Case Brief Generator · Risk R3
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground">
              สรุปสำนวน<span className="text-primary">1 หน้า</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              ป้อนข้อความสำนวนคดี (100–500 หน้า) — AI สรุปเป็น Case Brief มาตรฐานใน 1 หน้า
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: Shield, label: "Risk Tier", value: "R3 · ต้องตรวจสอบ", color: "text-amber-600" },
            { icon: Users, label: "สิทธิ์ใช้งาน", value: "ผู้พิพากษา / ทนาย / เจ้าหน้าที่", color: "text-primary" },
            { icon: Scale, label: "AI Disclosure", value: "ศาลฎีกา 2568 Compliant", color: "text-teal" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                <Icon className={`w-4 h-4 ${color}`} />
                {label}
              </div>
              <p className={`text-sm font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Input */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                เลขคดี (ไม่บังคับ)
              </label>
              <input
                value={caseNo}
                onChange={e => setCaseNo(e.target.value)}
                placeholder="เช่น 1234/2566"
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />

              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mt-4 mb-2">
                บทบาท
              </label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {ROLE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mt-4 mb-2">
                ข้อความสำนวน *
              </label>
              <textarea
                value={caseText}
                onChange={e => setCaseText(e.target.value)}
                rows={12}
                placeholder="วางข้อความสำนวนคดีที่นี่..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">{caseText.length.toLocaleString()} ตัวอักษร</p>

              <button
                onClick={() => { setCaseText(EXAMPLE_TEXT); setCaseNo("1234/2566"); }}
                className="mt-2 text-xs text-primary underline underline-offset-2 hover:text-primary/70"
              >
                ใช้ตัวอย่าง
              </button>

              <button
                onClick={handleGenerate}
                disabled={loading || !caseText.trim()}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {loading ? "กำลังสรุป..." : "สร้าง Case Brief"}
              </button>
            </div>
          </div>

          {/* Output */}
          <div className="lg:col-span-3">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex gap-3 items-start mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {!result && !loading && !error && (
              <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Case Brief จะแสดงที่นี่</p>
                <p className="text-xs mt-1">ป้อนข้อความสำนวนแล้วกด "สร้าง Case Brief"</p>
              </div>
            )}

            {loading && (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-primary" />
                <p className="font-medium text-muted-foreground">AI กำลังวิเคราะห์สำนวน...</p>
                <p className="text-xs text-muted-foreground mt-1">ใช้เวลาประมาณ 10-30 วินาที</p>
              </div>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Header bar */}
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-primary text-sm">
                      Case Brief {result.case_no && `— คดีที่ ${result.case_no}`}
                    </p>
                    <p className="text-xs text-muted-foreground">{result.court} · {result.case_type}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-white text-xs font-medium hover:bg-muted transition-colors"
                    >
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-teal" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "คัดลอกแล้ว" : "คัดลอก"}
                    </button>
                  </div>
                </div>

                {/* PII warning */}
                {result.pii_count > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 flex gap-2 items-center">
                    <Shield className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                      พบและปิดบัง PII {result.pii_count} จุดจากข้อความต้นฉบับโดยอัตโนมัติ
                    </p>
                  </div>
                )}

                {/* Parties */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    <Users className="w-4 h-4" /> คู่ความ
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">โจทก์ / ผู้ฟ้องคดี</p>
                      <p className="text-sm font-medium">{result.parties.plaintiff || "—"}</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">จำเลย / ผู้ถูกฟ้อง</p>
                      <p className="text-sm font-medium">{result.parties.defendant || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Facts */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    <FileText className="w-4 h-4" /> ข้อเท็จจริงสำคัญ
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">{result.facts || "—"}</p>
                </div>

                {/* Legal Issues */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    <Scale className="w-4 h-4" /> ประเด็นกฎหมาย
                  </div>
                  {result.legal_issues.length > 0 ? (
                    <ol className="space-y-2">
                      {result.legal_issues.map((issue, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ol>
                  ) : <p className="text-sm text-muted-foreground">—</p>}
                </div>

                {/* Statutes */}
                {result.statutes.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      <BookOpen className="w-4 h-4" /> มาตราที่อ้างอิง
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.statutes.map((s, i) => (
                        <span key={i} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verdict */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    <Hash className="w-4 h-4" /> สรุปคำวินิจฉัย
                  </div>
                  <p className="text-sm leading-relaxed">{result.verdict_summary || "—"}</p>
                  {result.key_reasoning && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">เหตุผลสำคัญ</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{result.key_reasoning}</p>
                    </div>
                  )}
                </div>

                {/* AI Disclosure */}
                <div
                  className="rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden cursor-pointer"
                  onClick={() => setShowDisclosure(v => !v)}
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold text-amber-700">AI Disclosure — ศาลฎีกา พ.ศ. 2568</span>
                    </div>
                    {showDisclosure
                      ? <ChevronUp className="w-4 h-4 text-amber-600" />
                      : <ChevronDown className="w-4 h-4 text-amber-600" />}
                  </div>
                  {showDisclosure && (
                    <div className="px-4 pb-4">
                      <p className="text-xs text-amber-700 leading-relaxed">{result.ai_disclosure}</p>
                      <p className="text-[10px] text-amber-600/70 mt-2">สร้างเมื่อ: {new Date(result.generated_at).toLocaleString("th-TH")}</p>
                    </div>
                  )}
                </div>

              </motion.div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CaseBriefPage;
