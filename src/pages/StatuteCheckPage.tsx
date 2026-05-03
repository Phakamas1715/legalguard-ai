import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  BookOpen, Send, Loader2, AlertTriangle, CheckCircle2,
  XCircle, HelpCircle, Shield, Plus, X, ExternalLink
} from "lucide-react";
import { API_BASE } from "@/lib/runtimeConfig";

interface StatuteResult {
  statute: string;
  status: "active" | "amended" | "repealed" | "unknown";
  notes: string;
  last_updated: string;
  risk_flag: boolean;
}

interface StatuteCheckResponse {
  results: StatuteResult[];
  total: number;
  flagged_count: number;
  ai_disclosure: string;
  recommendation: string;
}

const STATUS_CONFIG: Record<string, {
  label: string;
  icon: typeof CheckCircle2;
  color: string;
  bg: string;
  border: string;
}> = {
  active: {
    label: "มีผลบังคับ",
    icon: CheckCircle2,
    color: "text-teal",
    bg: "bg-teal/5",
    border: "border-teal/30",
  },
  amended: {
    label: "แก้ไขแล้ว",
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  repealed: {
    label: "ยกเลิกแล้ว",
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  unknown: {
    label: "ไม่ทราบสถานะ",
    icon: HelpCircle,
    color: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-border",
  },
};

const EXAMPLE_STATUTES = [
  "ป.พ.พ. มาตรา 420",
  "ป.พ.พ. มาตรา 193/30",
  "ป.อ. มาตรา 341",
  "พ.ร.บ.คุ้มครองแรงงาน มาตรา 118",
  "พ.ร.บ.คอมพิวเตอร์ มาตรา 14",
  "พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล มาตรา 27",
];

const ROLE_OPTIONS = [
  { value: "judge", label: "ผู้พิพากษา" },
  { value: "admin_judge", label: "ตุลาการศาลปกครอง" },
  { value: "lawyer", label: "ทนายความ" },
  { value: "government", label: "เจ้าหน้าที่ศาล" },
];

const StatuteCheckPage = () => {
  const [statutes, setStatutes] = useState<string[]>([""]);
  const [role, setRole] = useState("judge");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StatuteCheckResponse | null>(null);
  const [error, setError] = useState("");

  const addStatute = () => setStatutes(s => [...s, ""]);
  const removeStatute = (i: number) => setStatutes(s => s.filter((_, idx) => idx !== i));
  const updateStatute = (i: number, val: string) =>
    setStatutes(s => s.map((v, idx) => (idx === i ? val : v)));

  const loadExample = () => setStatutes([...EXAMPLE_STATUTES]);

  const handleCheck = async () => {
    const clean = statutes.map(s => s.trim()).filter(Boolean);
    if (!clean.length || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const resp = await fetch(`${API_BASE}/judgment/statute-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statutes: clean, role }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || `HTTP ${resp.status}`);
      }
      setResult(await resp.json() as StatuteCheckResponse);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "ไม่สามารถเชื่อมต่อ backend ได้");
    }
    setLoading(false);
  };

  const validStatutes = statutes.filter(s => s.trim()).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1 max-w-4xl">

        {/* Header */}
        <div className="flex items-center gap-5 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest mb-1">
              Statute Cross-Reference Check · Risk R1
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground">
              ตรวจสถานะ<span className="text-primary">มาตรากฎหมาย</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              ตรวจว่ามาตราที่อ้างอิงยังมีผลบังคับใช้อยู่หรือไม่ — แจ้งเตือนถ้าแก้ไขหรือยกเลิกแล้ว
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Input */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
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

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    มาตราที่ต้องการตรวจ ({validStatutes})
                  </label>
                  <button
                    onClick={loadExample}
                    className="text-xs text-primary underline underline-offset-2 hover:text-primary/70"
                  >
                    โหลดตัวอย่าง
                  </button>
                </div>
                <div className="space-y-2">
                  {statutes.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={s}
                        onChange={e => updateStatute(i, e.target.value)}
                        placeholder="เช่น ป.พ.พ. มาตรา 420"
                        className="flex-1 px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                        onKeyDown={e => { if (e.key === "Enter") addStatute(); }}
                      />
                      {statutes.length > 1 && (
                        <button
                          onClick={() => removeStatute(i)}
                          className="p-2 rounded-xl border border-border hover:bg-red-50 hover:border-red-200 transition-colors"
                        >
                          <X className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addStatute}
                  disabled={statutes.length >= 20}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-border text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่มมาตรา (สูงสุด 20)
                </button>
              </div>

              <button
                onClick={handleCheck}
                disabled={loading || validStatutes === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {loading ? "กำลังตรวจ..." : `ตรวจสอบ ${validStatutes} มาตรา`}
              </button>

              {/* Link to Krisdika */}
              <a
                href="https://www.krisdika.go.th/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                ยืนยันกับ Krisdika.go.th (แหล่งข้อมูลทางการ)
              </a>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex gap-3 items-start mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {!result && !loading && !error && (
              <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">ผลการตรวจสอบมาตราจะแสดงที่นี่</p>
                <p className="text-xs mt-1">ใส่มาตราแล้วกด "ตรวจสอบ"</p>
              </div>
            )}

            {loading && (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-primary" />
                <p className="font-medium text-muted-foreground">กำลังตรวจสอบมาตรา...</p>
              </div>
            )}

            {result && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                {/* Summary */}
                <div className={`rounded-2xl border p-4 ${
                  result.flagged_count > 0
                    ? "border-amber-200 bg-amber-50"
                    : "border-teal/30 bg-teal/5"
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {result.flagged_count > 0
                      ? <AlertTriangle className="w-5 h-5 text-amber-600" />
                      : <CheckCircle2 className="w-5 h-5 text-teal" />}
                    <span className={`font-bold text-sm ${result.flagged_count > 0 ? "text-amber-700" : "text-teal"}`}>
                      {result.flagged_count > 0
                        ? `พบ ${result.flagged_count} มาตราที่ต้องตรวจสอบเพิ่มเติม`
                        : "มาตราทั้งหมดมีผลบังคับใช้ (ตามฐานข้อมูลภายใน)"}
                    </span>
                  </div>
                  <p className={`text-xs ${result.flagged_count > 0 ? "text-amber-600" : "text-teal/80"}`}>
                    {result.recommendation}
                  </p>
                </div>

                {/* Results list */}
                {result.results.map((r, i) => {
                  const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.unknown;
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${cfg.color}`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-foreground">{r.statute}</p>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.notes}</p>
                            {r.last_updated && (
                              <p className="text-[10px] text-muted-foreground/70 mt-1">
                                แก้ไขล่าสุด: พ.ศ. {r.last_updated}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* AI Disclosure */}
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-2 items-start">
                  <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">{result.ai_disclosure}</p>
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

export default StatuteCheckPage;
