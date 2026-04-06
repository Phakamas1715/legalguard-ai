import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  TrendingUp, Send, Loader2, AlertTriangle, CheckCircle2,
  Scale, BarChart3, Target, Shield, FileText, Database, BadgeCheck
} from "lucide-react";

import { API_BASE } from "@/lib/runtimeConfig";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { loadWorkspace, saveWorkspace, WORKSPACE_STORAGE_KEYS } from "@/lib/flowWorkspace";
import { memory } from "@/lib/layeredMemory";

interface SimilarCase {
  case_no: string;
  court_type: string;
  year: number;
  summary: string;
  outcome: string;
  relevance_score: number;
}

interface PredictResponse {
  predicted_outcome: string;
  confidence: number;
  similar_cases_count: number;
  win_loss_ratio: number;
  top_precedents: SimilarCase[];
  factors: {
    similar_cases_found: number;
    case_type_distribution: Record<string, number>;
    statute_frequency: Record<string, number>;
    avg_relevance: number;
  };
  low_confidence_warning: boolean;
  disclaimer: string;
  risk_level: string;
}

const OUTCOME_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  plaintiff_wins: { label: "โจทก์ชนะคดี", color: "text-teal", icon: "✅" },
  defendant_wins: { label: "จำเลยชนะคดี", color: "text-primary", icon: "⚖️" },
  settlement: { label: "ประนีประนอมยอมความ", color: "text-accent-foreground", icon: "🤝" },
  dismissed: { label: "จำหน่ายคดี / ยกฟ้อง", color: "text-destructive", icon: "❌" },
};

const EXAMPLE_CASES = [
  { label: "กู้ยืมเงินไม่คืน", facts: "จำเลยกู้ยืมเงินโจทก์จำนวน 500,000 บาท ทำสัญญากู้ยืมเงินลงวันที่ 1 มกราคม 2567 กำหนดชำระคืนภายใน 6 เดือน พร้อมดอกเบี้ยร้อยละ 7.5 ต่อปี ครบกำหนดแล้วจำเลยไม่ชำระ โจทก์ทวงถามแล้ว 3 ครั้ง จำเลยเพิกเฉย", caseType: "แพ่ง", statutes: "ป.พ.พ. 653, ป.พ.พ. 224" },
  { label: "ฉ้อโกงออนไลน์", facts: "จำเลยลงประกาศขายโทรศัพท์มือถือในเว็บไซต์ราคา 15,000 บาท ผู้เสียหายโอนเงินผ่านบัญชีธนาคาร จำเลยไม่ส่งสินค้าและบล็อกการติดต่อ ตรวจสอบพบว่าจำเลยใช้วิธีเดียวกันหลอกลวงผู้เสียหายอีก 5 ราย", caseType: "อาญา", statutes: "ป.อ. 341, พ.ร.บ.คอมพิวเตอร์ 14" },
  { label: "เลิกจ้างไม่เป็นธรรม", facts: "โจทก์ทำงานเป็นพนักงานบริษัทจำเลยมา 8 ปี ตำแหน่งหัวหน้าแผนกบัญชี เงินเดือน 45,000 บาท จำเลยเลิกจ้างโดยอ้างว่าปรับโครงสร้างองค์กร แต่ภายหลังรับพนักงานใหม่ตำแหน่งเดียวกัน โจทก์ไม่ได้รับค่าชดเชยตามกฎหมาย", caseType: "แรงงาน", statutes: "พ.ร.บ.คุ้มครองแรงงาน 118, 49" },
];

const PREDICT_WORKSPACE_STORAGE_KEY = WORKSPACE_STORAGE_KEYS.predict;

const PredictPage = () => {
  const [facts, setFacts] = useState("");
  const [caseType, setCaseType] = useState("");
  const [statutes, setStatutes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [error, setError] = useState("");
  const hydratedRef = useRef(false);
  const backendStatus = useBackendStatus();
  const memoryStats = memory.getStats();

  useEffect(() => {
    const saved = loadWorkspace<{
      facts: string;
      caseType: string;
      statutes: string;
    }>(PREDICT_WORKSPACE_STORAGE_KEY);
    if (!saved) return;
    setFacts(saved.facts ?? "");
    setCaseType(saved.caseType ?? "");
    setStatutes(saved.statutes ?? "");
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    saveWorkspace(PREDICT_WORKSPACE_STORAGE_KEY, { facts, caseType, statutes });
  }, [facts, caseType, statutes]);

  const fillExample = (ex: typeof EXAMPLE_CASES[0]) => {
    setFacts(ex.facts);
    setCaseType(ex.caseType);
    setStatutes(ex.statutes);
    setResult(null);
    setError("");
  };

  const handlePredict = async () => {
    if (!facts.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    memory.write("working", `[predict] ${facts.slice(0, 120)}`, { concept: "predict_case", importance: 0.8 });
    try {
      const resp = await fetch(`${API_BASE}/predict/outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facts,
          case_type: caseType,
          statutes: statutes ? statutes.split(",").map(s => s.trim()) : [],
          role: "lawyer",
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = (await resp.json()) as PredictResponse;
      setResult(data);
      memory.write(
        "episodic",
        `Predict outcome=${data.predicted_outcome} confidence=${data.confidence.toFixed(2)} similar=${data.similar_cases_count}`,
        { concept: "predict_result", importance: Math.max(0.6, data.confidence) },
      );
      if (data.confidence >= 0.7) {
        memory.summarizeToL5(
          `Predict "${facts.slice(0, 70)}" -> ${data.predicted_outcome} (${data.confidence.toFixed(2)})`,
          "predict_workspace",
        );
      }
    } catch (e) {
      setError("ไม่สามารถเชื่อมต่อ backend ได้ กรุณาตรวจสอบว่า server ทำงานอยู่");
      memory.write("episodic", `Predict failed for "${facts.slice(0, 80)}"`, {
        concept: "predict_failure",
        importance: 0.7,
      });
    }
    setLoading(false);
  };

  const outcomeInfo = result ? OUTCOME_LABELS[result.predicted_outcome] ?? { label: result.predicted_outcome, color: "text-foreground", icon: "📋" } : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-gold/10 border-2 border-gold/30 flex items-center justify-center shadow-2xl shadow-gold/10 group hover:rotate-6 transition-transform duration-500">
              <TrendingUp className="w-10 h-10 text-gold group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary text-white border border-primary/20 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2 shadow-sm">
                 Honest Predictor Engine
              </div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                พยากรณ์<span className="text-primary">ผลคดี</span>
              </h1>
              <p className="text-muted-foreground font-medium text-sm md:text-base mt-1">
                วิเคราะห์ความเสี่ยงและแนวโน้มคำพิพากษาด้วย <span className="text-primary font-bold">Smart LegalGuard Infrastructure</span>
                <br />
                <span className="text-[11px] text-primary/60 font-bold uppercase tracking-widest mt-2 block italic">Engine Crafted & Developed by Honest Predictor</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 py-3 bg-teal/5 border border-teal/20 rounded-2xl shadow-sm">
             <Shield className="w-5 h-5 text-teal" />
             <div>
                <p className="text-[10px] uppercase font-bold text-teal tracking-tighter">Security Tier</p>
                <p className="text-sm font-bold text-foreground">Risk Level: R4 (High Trust)</p>
             </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Shield className="h-4 w-4 text-teal" />
              System Status
            </div>
            <p className={`text-sm font-bold ${backendStatus.online ? "text-teal" : "text-destructive"}`}>
              {backendStatus.online ? "Prediction backend พร้อมใช้งาน" : "Backend ยังไม่ตอบสนอง"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">เชื่อมต่อผ่าน runtime config กลางของระบบ</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Database className="h-4 w-4 text-primary" />
              Layered Memory
            </div>
            <p className="text-sm font-bold text-foreground">L1 {memoryStats.l1Count} · L2 {memoryStats.l2Count} · L5 {memoryStats.l5Count}</p>
            <p className="mt-1 text-xs text-muted-foreground">ระบบจำโจทย์วิเคราะห์ล่าสุดและสรุปเคสสำคัญข้าม session</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <BadgeCheck className="h-4 w-4 text-accent-foreground" />
              Responsible Use
            </div>
            <p className="text-sm font-bold text-foreground">Prediction for analysis only</p>
            <p className="mt-1 text-xs text-muted-foreground">ใช้เพื่อประเมินเบื้องต้นและควรอ่านคดีอ้างอิงประกอบทุกครั้ง</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <h2 className="font-heading font-bold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> ข้อมูลคดี
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">ข้อเท็จจริง</label>
                <textarea value={facts} onChange={(e) => setFacts(e.target.value)}
                  placeholder="เช่น จำเลยยืมเงินโจทก์ 500,000 บาท ทำสัญญากู้ยืมลงวันที่ 1 ม.ค. 2567 ครบกำหนดชำระแล้วไม่คืน..."
                  rows={6} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">ประเภทคดี</label>
                  <select value={caseType} onChange={(e) => setCaseType(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">-- เลือก --</option>
                    <option value="แพ่ง">แพ่ง</option>
                    <option value="อาญา">อาญา</option>
                    <option value="ปกครอง">ปกครอง</option>
                    <option value="แรงงาน">แรงงาน</option>
                    <option value="ผู้บริโภค">ผู้บริโภค</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">มาตรา (คั่นด้วย ,)</label>
                  <input type="text" value={statutes} onChange={(e) => setStatutes(e.target.value)}
                    placeholder="เช่น ป.พ.พ. 653, ป.อ. 341"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <button onClick={handlePredict} disabled={!facts.trim() || loading}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:bg-navy-deep transition-colors disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {loading ? "กำลังวิเคราะห์..." : "พยากรณ์ผลคดี"}
              </button>
            </div>
            <div className="mt-4 bg-destructive/10 border border-destructive/20 rounded-xl p-3">
              <p className="text-xs text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                การพยากรณ์เป็นข้อมูลเบื้องต้นเท่านั้น ไม่ใช่คำปรึกษาทางกฎหมาย
              </p>
            </div>
            {/* Example Cases */}
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">💡 ตัวอย่างข้อเท็จจริง (กดเพื่อเติมอัตโนมัติ)</p>
              <div className="space-y-2">
                {EXAMPLE_CASES.map((ex, i) => (
                  <button key={i} onClick={() => fillExample(ex)}
                    className="w-full text-left p-3 bg-muted/50 border border-border rounded-xl hover:border-primary/30 transition-colors">
                    <span className="text-xs font-medium text-primary">{ex.label}</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{ex.facts}</p>
                    <div className="flex gap-1 mt-1">
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{ex.caseType}</span>
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{ex.statutes}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-sm text-destructive">{error}</div>
            )}
            {result && outcomeInfo && (
              <>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-2xl p-6 shadow-card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading font-bold flex items-center gap-2">
                       <Target className="w-5 h-5 text-primary" /> ผลพยากรณ์อัจฉริยะ
                    </h3>
                    <span className="text-[10px] bg-teal/10 text-teal border border-teal/20 px-2 py-0.5 rounded-full font-bold uppercase">AI Reasoning Active</span>
                  </div>
                  <div className="text-center mb-6 py-6 bg-muted/30 rounded-3xl border border-border/50 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-5xl drop-shadow-lg mb-4 block">{outcomeInfo.icon}</span>
                    <p className={`text-2xl font-bold tracking-tight ${outcomeInfo.color}`}>{outcomeInfo.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 uppercase tracking-widest font-bold">Predicted Outcome</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="p-3 bg-primary/5 rounded-xl text-center">
                      <div className="text-lg font-bold text-primary">{(result.confidence * 100).toFixed(1)}%</div>
                      <div className="text-[11px] text-muted-foreground">ความมั่นใจ</div>
                    </div>
                    <div className="p-3 bg-teal/5 rounded-xl text-center">
                      <div className="text-lg font-bold text-teal">{result.similar_cases_count}</div>
                      <div className="text-[11px] text-muted-foreground">คดีที่คล้ายกัน</div>
                    </div>
                    <div className="p-3 bg-accent/5 rounded-xl text-center">
                      <div className="text-lg font-bold text-accent-foreground">{(result.win_loss_ratio * 100).toFixed(0)}%</div>
                      <div className="text-[11px] text-muted-foreground">อัตราชนะ</div>
                    </div>
                  </div>
                  {result.low_confidence_warning && (
                    <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 mb-3">
                      <p className="text-xs text-accent-foreground flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> ข้อมูลน้อย — ควรปรึกษาทนายความ
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">{result.disclaimer}</p>
                </motion.div>

                {/* Top Precedents */}
                {result.top_precedents.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="bg-card border border-border rounded-2xl p-6 shadow-card">
                    <h3 className="font-heading font-bold mb-4 flex items-center gap-2">
                      <Scale className="w-5 h-5 text-teal" /> คดีอ้างอิง (Top 5)
                    </h3>
                    <div className="space-y-3">
                      {result.top_precedents.map((c, i) => (
                        <div key={i} className="p-3 border border-border rounded-xl">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">{c.case_no || `คดีที่ ${i + 1}`}</span>
                            <span className="text-[11px] text-muted-foreground">{c.court_type} · {c.year || "-"}</span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{c.summary}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[11px] bg-teal/10 text-teal px-1.5 py-0.5 rounded">{OUTCOME_LABELS[c.outcome]?.label ?? c.outcome}</span>
                            <span className="text-[11px] text-muted-foreground">ความเกี่ยวข้อง {(c.relevance_score * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Factors */}
                {result.factors && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="bg-card border border-border rounded-2xl p-6 shadow-card">
                    <h3 className="font-heading font-bold mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-accent-foreground" /> ปัจจัยวิเคราะห์
                    </h3>
                    {Object.keys(result.factors.statute_frequency).length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-medium mb-2">มาตราที่พบบ่อย</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(result.factors.statute_frequency).map(([s, count]) => (
                            <span key={s} className="text-[11px] bg-primary/10 text-primary px-2 py-1 rounded-full">{s} ({count})</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {Object.keys(result.factors.case_type_distribution).length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-2">ประเภทศาล</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(result.factors.case_type_distribution).map(([ct, count]) => (
                            <span key={ct} className="text-[11px] bg-muted px-2 py-1 rounded-full">{ct} ({count})</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </>
            )}
            {!result && !error && !loading && (
              <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground shadow-card">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>กรอกข้อเท็จจริงของคดีแล้วกด "พยากรณ์ผลคดี"</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PredictPage;
