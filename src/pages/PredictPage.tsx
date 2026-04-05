import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  TrendingUp, Send, Loader2, AlertTriangle, CheckCircle2,
  Scale, BarChart3, Target, Shield, FileText
} from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:8000") + "/api/v1";

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

const PredictPage = () => {
  const [facts, setFacts] = useState("");
  const [caseType, setCaseType] = useState("");
  const [statutes, setStatutes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [error, setError] = useState("");

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
      setResult(await resp.json());
    } catch (e) {
      setError("ไม่สามารถเชื่อมต่อ backend ได้ กรุณาตรวจสอบว่า server ทำงานอยู่");
    }
    setLoading(false);
  };

  const outcomeInfo = result ? OUTCOME_LABELS[result.predicted_outcome] ?? { label: result.predicted_outcome, color: "text-foreground", icon: "📋" } : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-accent-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">พยากรณ์ผลคดี</h1>
            <p className="text-muted-foreground">วิเคราะห์แนวโน้มจากคำพิพากษาที่คล้ายกัน (Risk Tier R4)</p>
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
                  <h3 className="font-heading font-bold mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" /> ผลพยากรณ์
                  </h3>
                  <div className="text-center mb-4">
                    <span className="text-4xl">{outcomeInfo.icon}</span>
                    <p className={`text-xl font-bold mt-2 ${outcomeInfo.color}`}>{outcomeInfo.label}</p>
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
