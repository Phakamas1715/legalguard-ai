import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackOfficeBridgeBanner from "@/components/BackOfficeBridgeBanner";
import {
  Building2, Shield, FileText, BarChart3, Clock, Database,
  ShieldCheck, AlertTriangle, CheckCircle2, Hash, Send, Loader2, Scale,
  ExternalLink, BookOpen, Mic, Gavel, ThumbsUp, ThumbsDown
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getAuditStats, getAuditEntries, verifyChainIntegrity } from "@/lib/auditLog";
import { maskPII, PII_TYPE_LABELS, type PIISpan } from "@/lib/piiMasking";
import heroCourthouseImg from "@/assets/hero-courthouse.jpg";
import SafetyPipelinePreview from "@/components/SafetyPipelinePreview";

type Tab = "overview" | "tools" | "triage" | "draft" | "data" | "technical" | "transcribe";

import { apiClient, type DashboardLiveResponse, type DashboardSystemStatsResponse } from "@/lib/apiClient";
import { toast } from "sonner";

import { API_BASE } from "@/lib/runtimeConfig";

const judgePrinciples = [
  {
    title: "มนุษย์กำกับทุกขั้น",
    description: "ระบบช่วยค้น ช่วยสรุป และช่วยเตรียมร่างเท่านั้น การวินิจฉัยยังเป็นหน้าที่ของผู้พิพากษา",
    icon: Scale,
  },
  {
    title: "อ้างอิงก่อนใช้งาน",
    description: "ผลลัพธ์ที่ใช้ในงานตุลาการควรตรวจสอบที่มาได้เสมอ ทั้งมาตรา แนวคำพิพากษา และหลักฐานอ้างอิง",
    icon: BookOpen,
  },
  {
    title: "ตรวจสอบย้อนหลังได้",
    description: "ทุกการใช้งานต้องตรวจสอบย้อนหลังได้ เพื่อสร้างความเชื่อมั่นต่อทั้งผู้ใช้และผู้กำกับดูแล",
    icon: ShieldCheck,
  },
];

const judgeSupportScope = [
  "สรุปข้อเท็จจริงและประเด็นสำคัญของสำนวน",
  "ค้นคดีคล้ายและแนวคำพิพากษาที่เกี่ยวข้อง",
  "ช่วยจัดโครงสร้างร่างเอกสารเบื้องต้น",
  "ตรวจข้อมูลอ่อนไหวก่อนเผยแพร่หรือส่งต่อ",
];

const judgeBoundaries = [
  "ไม่ชี้ขาดผลคดีแทนผู้พิพากษา",
  "ไม่แทนการตีความกฎหมายขั้นสุดท้าย",
  "ไม่ควรใช้ผลลัพธ์โดยไม่ตรวจสอบ citation และบริบท",
  "กรณีเสี่ยงสูงต้องใช้เป็นข้อมูลประกอบเท่านั้น",
];

const judgeFeatureMenus = [
  {
    title: "ดูภาพรวมการใช้งาน",
    desc: "เริ่มจากภาพรวม หลักการกำกับ และสถานะความพร้อมของระบบสำหรับงานตุลาการ",
    icon: BarChart3,
    items: [
      { tab: "overview" as const, label: "ภาพรวม", note: "ดูภาพรวม metrics และขอบเขตการใช้งาน" },
      { tab: "triage" as const, label: "คุ้มครองข้อมูล (PDPA)", note: "ตรวจข้อมูลอ่อนไหวก่อนประมวลผล" },
    ],
  },
  {
    title: "ใช้เครื่องมือสนับสนุนคดี",
    desc: "เข้าถึงเครื่องมือค้นกฎหมาย ค้นคดีคล้าย และช่วยจัดเตรียมเนื้อหาประกอบการพิจารณา",
    icon: Gavel,
    items: [
      { tab: "tools" as const, label: "เครื่องมือ", note: "เปิดเครื่องมือช่วยค้นและค้นคว้า" },
      { tab: "draft" as const, label: "ร่างคำพิพากษา", note: "ใช้ระบบช่วยร่างภายใต้ human oversight" },
    ],
  },
  {
    title: "ตรวจหลักฐานอ้างอิง",
    desc: "ดูแหล่งข้อมูล ถอดเสียง และตรวจสอบความพร้อมของข้อมูลก่อนนำไปใช้อ้างอิง",
    icon: Database,
    items: [
      { tab: "data" as const, label: "แหล่งข้อมูล", note: "ตรวจแหล่งข้อมูลและ ingestion ที่เกี่ยวข้อง" },
      { tab: "transcribe" as const, label: "ถอดความเสียง", note: "แปลงเสียงเป็นข้อความเพื่อใช้ประกอบสำนวน" },
    ],
  },
];

const healthLabel = (value?: string) => {
  if (value === "healthy") return "พร้อมใช้งาน";
  if (value === "warning") return "เฝ้าระวัง";
  return "ไม่มีข้อมูล";
};

const JudgeDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [chainValid, setChainValid] = useState<boolean | null>(null);
  const [systemStats, setSystemStats] = useState<DashboardSystemStatsResponse | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<DashboardLiveResponse | null>(null);
  const [auditEntries, setAuditEntries] = useState(getAuditEntries().slice(0, 20));
  const [draftInput, setDraftInput] = useState("");
  const [draftResult, setDraftResult] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [piiInput, setPiiInput] = useState("");
  const [piiResult, setPiiResult] = useState<{ masked: string; spans: PIISpan[]; piiCount: number } | null>(null);
  // OpenLaw ingestion state
  const [olQuery, setOlQuery] = useState("คำพิพากษาศาลฎีกา");
  const [olLimit, setOlLimit] = useState(100);
  const [olLoading, setOlLoading] = useState(false);
  const [olResult, setOlResult] = useState<{
    fetched_documents: number; ingested_chunks: number; failed_documents: number;
    cfs: number; status: string;
  } | null>(null);

  useEffect(() => {
    verifyChainIntegrity().then((r) => setChainValid(r.valid));
    void apiClient.getDashboardSystemStats().then(setSystemStats).catch(() => setSystemStats(null));
    void apiClient.getDashboardLive().then(setLiveMetrics).catch(() => setLiveMetrics(null));
  }, []);

  const runDraft = async () => {
    if (!draftInput.trim() || draftLoading) return;
    setDraftLoading(true); setDraftResult("");
    try {
      const messages = [
        { role: "system" as const, content: "คุณเป็นผู้ช่วย AI สำหรับตุลาการ ช่วยยกร่างคำพิพากษา อ้างอิงมาตรากฎหมาย ⚠️ ร่างเบื้องต้นเท่านั้น" },
        { role: "user" as const, content: `ยกร่างคำพิพากษา:\n\n${draftInput}` },
      ];
      const resp = await apiClient.chatStream(messages, "government");
      if (!resp.ok || !resp.body) { setDraftResult("❌ เกิดข้อผิดพลาด กรุณาลองใหม่"); setDraftLoading(false); return; }
      const reader = resp.body.getReader(); const decoder = new TextDecoder();
      let buffer = "", full = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx); buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim(); if (json === "[DONE]") break;
          try { const p = JSON.parse(json); const c = p.choices?.[0]?.delta?.content; if (c) { full += c; setDraftResult(full); } } catch { /* ignore parse errors in SSE stream */ }
        }
      }
    } catch { setDraftResult("❌ ไม่สามารถเชื่อมต่อกับ backend กรุณาตรวจสอบว่า server ทำงานอยู่"); }
    setDraftLoading(false);
  };

  const runPII = () => { if (piiInput.trim()) setPiiResult(maskPII(piiInput)); };

  const runOpenLawIngest = async () => {
    setOlLoading(true);
    setOlResult(null);
    try {
      const resp = await fetch(`${API_BASE}/ingest/openlaw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: olQuery, limit: olLimit, source_code: "openlaw_thailand" }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setOlResult(await resp.json());
      toast.success("ดึงข้อมูลจาก OpenLaw สำเร็จ");
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อ OpenLaw API ได้");
    }
    setOlLoading(false);
  };

  const tabs: { id: Tab; label: string; icon: typeof Building2 }[] = [
    { id: "overview", label: "ภาพรวม", icon: BarChart3 },
    { id: "tools", label: "เครื่องมือ", icon: Gavel },
    { id: "draft", label: "ร่างคำพิพากษา", icon: FileText },
    { id: "triage", label: "คุ้มครองข้อมูล (PDPA)", icon: ShieldCheck },
    { id: "data", label: "แหล่งข้อมูล", icon: Database },
    { id: "transcribe", label: "ถอดความเสียง", icon: Mic },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <div className="bg-hero-gradient relative overflow-hidden pt-12 pb-12 mb-8">
        {/* Background Decorative Pattern */}
        <div 
          className="absolute inset-0 opacity-15 bg-cover bg-center mix-blend-overlay"
          style={{ backgroundImage: `url(${heroCourthouseImg})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80 md:opacity-0 mix-blend-multiply"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
                <Building2 className="w-10 h-10 text-white" />
              </div>
              <div className="text-primary-foreground">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/70 bg-gold/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-[0_10px_30px_rgba(255,183,0,0.24)]"
                >
                  มุมมองเดิม (Legacy View)
                </motion.div>
                <motion.h1 initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="font-heading text-3xl md:text-4xl font-bold mb-1">
                  แดชบอร์ดตุลาการในมุมมองเดิม
                </motion.h1>
                <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="opacity-90 text-sm md:text-base font-light max-w-2xl">
                  มุมมองอ้างอิงของพื้นที่ทำงานเดิมสำหรับผู้พิพากษา ที่ออกแบบให้ AI ช่วยค้น ช่วยสรุป และช่วยตรวจทาน โดยไม่ล้ำเส้นดุลยพินิจ
                </motion.p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: "ขอบเขตการใช้งาน", value: "ตัวช่วยประกอบการพิจารณา" },
                { label: "โหมดความเชื่อถือ", value: "อ้างอิง + ตรวจสอบย้อนหลัง" },
                { label: "หลักการสำคัญ", value: "มนุษย์กำกับทุกขั้น" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/60">{item.label}</p>
                  <p className="mt-1 text-sm font-bold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-8 flex-1">
        <div className="mb-6">
          <BackOfficeBridgeBanner
            eyebrow="มุมมองเดิม (Legacy View)"
            title="พื้นที่ช่วยงานผู้พิพากษาคือหน้าหลักใหม่สำหรับการค้น สรุป และเตรียมร่าง"
            description="หน้านี้เป็นมุมมองเดิมสำหรับการอ้างอิงและเปรียบเทียบ ส่วนการใช้งานหลักควรเริ่มที่พื้นที่ช่วยงานผู้พิพากษา เพื่อให้เข้าสู่ฟีเจอร์ตามบทบาทได้ตรงกว่าและลดความซ้ำซ้อนของเมนู"
            primaryAction={{ label: "เปิดพื้นที่ช่วยงานผู้พิพากษา", path: "/judge-workbench", icon: Gavel }}
            secondaryAction={{ label: "เปิดศูนย์รวมแดชบอร์ดหลังบ้าน", path: "/back-office" }}
            tone="gold"
          />
        </div>

        <section className="mb-6 rounded-[2rem] border border-border bg-card p-6 shadow-card">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-primary/70">ทางลัดในมุมมองเดิม</p>
              <h2 className="font-heading text-2xl font-black text-foreground">เปิดแท็บอ้างอิงของแดชบอร์ดเดิมได้โดยตรง</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                ลดเมนูซ้ำให้เหลือเพียงทางลัดไปยังแท็บสำคัญของแดชบอร์ดเดิม ส่วนการใช้งานประจำวันควรเริ่มจากพื้นที่ช่วยงานผู้พิพากษา
              </p>
            </div>
            <div className="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
              หมวดปัจจุบัน: <span className="font-semibold text-foreground">{tabs.find((tab) => tab.id === activeTab)?.label ?? "ไม่ระบุ"}</span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {judgeFeatureMenus.flatMap((menu) =>
              menu.items.map((item) => (
                <button
                  key={`${menu.title}-${item.tab}-${item.label}`}
                  type="button"
                  onClick={() => setActiveTab(item.tab)}
                  className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                    activeTab === item.tab
                      ? "border-primary/25 bg-primary/5"
                      : "border-border bg-muted/10 hover:bg-muted"
                  }`}
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary/70">{menu.title}</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-foreground">{item.label}</span>
                    <Send className="h-4 w-4 text-primary" />
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.note}</p>
                </button>
              )),
            )}
          </div>
        </section>

        {/* ภาพรวม — ภาษาเข้าใจง่าย ไม่มีศัพท์เทคนิค */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Database} value={systemStats ? String(systemStats.actual.pdf_files) : "—"} label="PDF ที่มีในระบบตอนนี้" color="text-primary" />
              <StatCard icon={FileText} value={systemStats ? String(systemStats.actual.mock_cases) : "—"} label="ชุดคดีตัวอย่าง" color="text-teal" />
              <StatCard icon={Clock} value={liveMetrics ? String(liveMetrics.requests_by_action_1h.search ?? 0) : "—"} label="การค้นหาชั่วโมงล่าสุด" color="text-accent-foreground" />
              <StatCard icon={ShieldCheck} value={chainValid === null ? "รอตรวจ" : chainValid ? "ยืนยันแล้ว" : "เฝ้าระวัง"} label="สถานะ audit chain" color="text-teal" />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {judgePrinciples.map((item) => (
                <div key={item.title} className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-heading text-xl font-bold text-foreground">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>

            <SafetyPipelinePreview
              eyebrow="Judicial Trust Layer"
              title="ผลลัพธ์สำหรับผู้พิพากษาผ่านรั้วคุมความเสี่ยงก่อนเสมอ"
              description="ฝั่งตุลาการจะเห็นเฉพาะผลที่ผ่าน privacy, guardrails, multi-agent review และ audit chain แล้ว เพื่อให้ AI ช่วยงานซ้ำโดยไม่ล้ำเส้นดุลยพินิจ"
              primaryAction={{ label: "เปิดพื้นที่ช่วยงานผู้พิพากษา", path: "/judge-workbench" }}
              secondaryAction={{ label: "ดูคอนโซลติดตามการทำงาน", path: "/trace-console" }}
              compact
            />

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                <h3 className="font-heading font-bold mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-teal" /> สถานะความพร้อม</h3>
                <div className="space-y-4">
                  <StatusRow label="ระบบค้นหา" value={healthLabel(liveMetrics?.system_health.search_pipeline)} ok={liveMetrics?.system_health.search_pipeline === "healthy"} />
                  <StatusRow label="ระบบร่างเอกสาร" value={healthLabel(liveMetrics?.system_health.llm)} ok={liveMetrics?.system_health.llm === "healthy"} />
                  <StatusRow label="ปกป้องข้อมูลส่วนบุคคล" value={liveMetrics ? `ไม่พบการรั่วไหล / 1h (${liveMetrics.ai_metrics.pii_leak_count ?? 0})` : "ไม่มีข้อมูล"} ok={liveMetrics ? (liveMetrics.ai_metrics.pii_leak_count ?? 0) === 0 : false} />
                  <StatusRow label="บันทึกการใช้งาน" value={chainValid === null ? "ตรวจสอบ..." : chainValid ? "ปกติ" : "มีปัญหา"} ok={chainValid === true} />
                  <StatusRow label="ความเชื่อมั่นของผลค้นหา" value={liveMetrics ? `${Math.round(liveMetrics.ai_metrics.avg_honesty_score * 100)}%` : "ไม่มีข้อมูล"} ok={liveMetrics ? liveMetrics.ai_metrics.avg_honesty_score >= 0.8 : false} />
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                <h3 className="font-heading font-bold mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" /> ระบบช่วยอะไร</h3>
                <div className="space-y-3">
                  {judgeSupportScope.map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-xl bg-muted/30 px-4 py-3">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-teal" />
                      <p className="text-sm text-muted-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                <h3 className="font-heading font-bold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-accent-foreground" /> ระบบไม่ทำแทน</h3>
                <div className="space-y-3">
                  {judgeBoundaries.map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-xl bg-muted/30 px-4 py-3">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-accent-foreground" />
                      <p className="text-sm text-muted-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="font-heading font-bold flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> ภาพรวมภาระงานรายสัปดาห์</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    ใช้ดูสัญญาณ workload และช่วงเวลาที่การค้นหรือการเตรียมร่างเอกสารมีความหนาแน่นสูงขึ้น
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 px-4 py-2 text-xs font-medium text-muted-foreground">
                  ตัวอย่างภาพรวมเพื่อใช้สื่อสารแนวคิด dashboard สำหรับตุลาการ
                </div>
              </div>
              <div className="mt-6 h-40 flex items-end justify-around gap-2 px-4 pb-2 border-b border-border mb-4">
                {[65, 40, 85, 30, 95, 55, 78].map((h, i) => (
                  <div key={i} className="bg-primary/20 w-full rounded-t-md relative group">
                    <div style={{ height: `${h}%` }} className="bg-primary rounded-t-md transition-all" />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[11px] font-bold transition-opacity">{h}%</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground px-2">
                <span>จ.</span><span>อ.</span><span>พ.</span><span>พฤ.</span><span>ศ.</span><span>ส.</span><span>อา.</span>
              </div>
            </div>
          </div>
        )}

        {/* เครื่องมือ — ภาษาไทยล้วน */}
        {activeTab === "tools" && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { icon: FileText, title: "ร่างคำพิพากษา", desc: "AI ช่วยยกร่าง + อ้างอิงฎีกาและตัวบท", action: () => setActiveTab("draft"), color: "bg-teal/10 text-teal" },
              { icon: Mic, title: "ถอดความเสียงพยาน", desc: "แปลงเสียงไต่สวนพยานบนบัลลังก์", action: () => setActiveTab("transcribe"), color: "bg-secondary text-foreground", badge: "ใหม่" },
              { icon: BookOpen, title: "ค้นหาฎีกา", desc: "ค้นหาคำพิพากษาที่เกี่ยวข้อง", action: () => navigate("/search?role=government"), color: "bg-accent/10 text-accent-foreground" },
              { icon: ShieldCheck, title: "ตรวจสอบความเป็นธรรม", desc: "ตรวจความเสี่ยงเรื่องอคติด้วยระบบกำกับ AI", action: () => navigate("/responsible-ai"), color: "bg-primary/10 text-primary" },
              { icon: BarChart3, title: "สถิติคดีประจำวัน", desc: "ดูสถานะคดีในความรับผิดชอบ", action: () => setActiveTab("overview"), color: "bg-primary/5 text-primary" },
              { icon: Database, title: "แหล่งข้อมูล", desc: "ดึงข้อมูล OpenLaw มาตรฐานล่าสุด", action: () => setActiveTab("data"), color: "bg-teal/5 text-teal" },
            ].map((t, i) => (
              <motion.button key={t.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                onClick={t.action} className="bg-card border border-border rounded-2xl p-5 text-left hover:shadow-card-hover transition-shadow relative">
                {(t as Record<string, unknown>).badge && <span className="absolute top-3 right-3 text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-bold">{String((t as Record<string, unknown>).badge)}</span>}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${t.color}`}><t.icon className="w-6 h-6" /></div>
                <h3 className="font-bold text-sm mb-1">{t.title}</h3>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </motion.button>
            ))}
          </div>
        )}



        {/* ถอดความเสียง */}
        {activeTab === "transcribe" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-bold flex items-center gap-2 text-primary">
                  <Mic className="w-6 h-6" /> ระบบช่วยถอดความเสียงการพิจารณา
                </h3>
                <span className="text-[10px] bg-gold/10 text-gold border border-gold/20 px-2 py-1 rounded font-bold">พร้อมสาธิต</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">แปลงเสียงคำให้การหรือการไต่สวนเป็นข้อความ เพื่อช่วยจัดทำบันทึกเบื้องต้น โดยยังต้องมีการตรวจทานก่อนใช้งานจริง</p>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-4">
                  <div className="p-4 bg-muted/50 rounded-xl border border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">แหล่งสัญญาณเสียง</p>
                    <select className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-primary">
                      <option>ไมโครโฟนในเครื่อง</option>
                      <option>ชุดผสมเสียงห้องพิจารณา</option>
                      <option>ไมโครโฟน USB ภายนอก</option>
                    </select>
                  </div>
                  <div className="p-4 bg-teal/5 rounded-xl border border-teal/20">
                    <p className="text-[10px] font-bold text-teal uppercase mb-2">โหมดช่วยอ่านศัพท์กฎหมาย</p>
                    <div className="flex items-center gap-2">
                       <CheckCircle2 className="w-4 h-4 text-teal" />
                       <span className="text-xs font-bold font-heading">เปิดคลังศัพท์กฎหมายเฉพาะทาง</span>
                    </div>
                  </div>
                </div>
                
              <div className="md:col-span-2 border-2 border-dashed border-border rounded-2xl p-10 text-center bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col items-center justify-center group cursor-pointer">
                <motion.div 
                  animate={{ scale: [1, 1.1, 1] }} 
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 shadow-xl"
                >
                  <Mic className="w-10 h-10 text-primary" />
                </motion.div>
                  <h4 className="font-bold text-lg mb-2">เริ่มถอดความการพิจารณาคดี</h4>
                  <p className="text-xs text-muted-foreground max-w-[260px]">ใช้สำหรับช่วยจัดทำบันทึกข้อความจากการไต่สวนหรือคำให้การ โดยยังต้องตรวจทานก่อนใช้งานจริง</p>
                  <button className="mt-6 bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                    เริ่มถอดความ
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Anonymization (ถมดำข้อมูลส่วนบุคคล) */}
        {activeTab === "triage" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="font-heading font-bold mb-4 flex items-center gap-2 text-primary">
                <ShieldCheck className="w-6 h-6" /> ระบบคุ้มครองข้อมูลส่วนบุคคล (PII Anonymization)
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                 ตรวจสอบและถมดำ (Masking) ข้อมูลที่ระบุตัวตนบุคคลได้อัตโนมัติ เพื่อนำคำพิพากษาไปเผยแพร่ตามมาตรฐาน PDPA
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block uppercase">ข้อความต้นฉบับ (Original Text)</label>
                  <textarea 
                    value={piiInput} 
                    onChange={(e) => setPiiInput(e.target.value)}
                    placeholder="เช่น โจทก์คือนายสมชาย ใจดี พักอยู่บ้านเลขที่ 99/1 ถนนแจ้งวัฒนะ..."
                    className="w-full h-40 bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary" 
                  />
                </div>
                <button 
                  onClick={runPII}
                  className="bg-navy-deep text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-colors"
                >
                  <Shield className="w-5 h-5 text-gold" /> ประมวลผลและถมดำข้อมูล
                </button>
              </div>

              {piiResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-4">
                  <div className="p-4 bg-teal/10 border border-teal/20 rounded-xl">
                    <p className="text-sm font-bold text-teal flex items-center gap-2">
                       <CheckCircle2 className="w-4 h-4" /> ตรวจพบข้อมูลอ่อนไหว {piiResult.piiCount} จุด
                    </p>
                  </div>
                  <div className="bg-black/90 text-white p-6 rounded-2xl font-mono text-sm leading-relaxed border border-white/10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 text-[10px] bg-gold text-navy-deep font-bold">PII MASKED VIEW</div>
                    <div className="whitespace-pre-wrap">{piiResult.masked}</div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}

        {/* ร่างคำพิพากษา */}
        {activeTab === "draft" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="font-heading font-bold mb-2 flex items-center gap-2"><Scale className="w-5 h-5 text-primary" /> AI ช่วยยกร่างคำพิพากษา</h3>
              <p className="text-sm text-muted-foreground mb-4">ใส่ข้อเท็จจริงของคดี ระบบจะช่วยยกร่างเบื้องต้น</p>
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /> ร่างเบื้องต้นเท่านั้น ต้องตรวจสอบจากตุลาการก่อนใช้จริง
                </p>
              </div>
              <textarea value={draftInput} onChange={(e) => setDraftInput(e.target.value)}
                placeholder="ตัวอย่าง: โจทก์ฟ้องว่าจำเลยยืมเงิน 100,000 บาท..." rows={6}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y" />
              {/* Example draft inputs */}
              <div className="mt-2 mb-3">
                <p className="text-[11px] text-muted-foreground mb-1.5">ตัวอย่างข้อเท็จจริง</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "กู้ยืมเงิน", text: "โจทก์ฟ้องว่าจำเลยกู้ยืมเงินจำนวน 300,000 บาท ทำสัญญากู้ยืมลงวันที่ 15 มี.ค. 2567 กำหนดชำระคืนภายใน 1 ปี พร้อมดอกเบี้ยร้อยละ 7.5 ต่อปี ครบกำหนดแล้วจำเลยไม่ชำระ ทวงถาม 3 ครั้งแล้วเพิกเฉย ขอให้ศาลพิพากษาให้จำเลยชำระเงินต้นพร้อมดอกเบี้ย" },
                    { label: "ขับไล่ผู้เช่า", text: "โจทก์เป็นเจ้าของอาคารพาณิชย์ ให้จำเลยเช่าทำร้านค้า สัญญาเช่า 3 ปี ค่าเช่าเดือนละ 15,000 บาท สัญญาสิ้นสุดแล้วจำเลยไม่ยอมออก ค้างค่าเช่า 4 เดือน รวม 60,000 บาท ขอให้ศาลพิพากษาขับไล่และชำระค่าเช่าค้าง" },
                    { label: "ลักทรัพย์", text: "จำเลยลักเอาโทรศัพท์มือถือยี่ห้อ iPhone ราคา 35,000 บาท ของผู้เสียหายไปจากร้านกาแฟ ขณะผู้เสียหายเข้าห้องน้ำ กล้องวงจรปิดบันทึกภาพจำเลยหยิบโทรศัพท์แล้วเดินออกจากร้าน" },
                  ].map(ex => (
                    <button key={ex.label} onClick={() => setDraftInput(ex.text)}
                      className="text-[11px] bg-primary/10 text-primary px-2 py-1 rounded-lg hover:bg-primary/20 transition-colors">{ex.label}</button>
                  ))}
                </div>
              </div>
              <button onClick={runDraft} disabled={!draftInput.trim() || draftLoading}
                className="mt-3 flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium hover:bg-navy-deep transition-colors disabled:opacity-50">
                {draftLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {draftLoading ? "กำลังยกร่าง..." : "ยกร่างคำพิพากษา"}
              </button>
            </div>
            {draftResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6 shadow-card">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-heading font-bold text-primary">📄 ร่างคำพิพากษา</h4>
                  <div className="flex gap-2">
                     <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-lg hover:bg-teal/10 hover:text-teal hover:border-teal/30 transition-colors">
                        <ThumbsUp className="w-3.5 h-3.5" /> พอใจ
                     </button>
                     <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-lg hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors">
                        <ThumbsDown className="w-3.5 h-3.5" /> รายงานความผิดพลาด
                     </button>
                  </div>
                </div>
                <div className="prose prose-sm max-w-none [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2"><ReactMarkdown>{draftResult}</ReactMarkdown></div>
              </motion.div>
            )}
          </div>
        )}

        {/* แหล่งข้อมูล */}
        {activeTab === "data" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="font-heading font-bold mb-4 flex items-center gap-2 text-primary"><BookOpen className="w-5 h-5" /> แหล่งข้อมูลภายนอก</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {[
                  { name: "ราชกิจจานุเบกษา", url: "https://ratchakitcha.soc.go.th", desc: "ประกาศ/พ.ร.บ./กฎกระทรวง" },
                  { name: "ฎีกาศาลฎีกา", url: "https://deka.supremecourt.or.th", desc: "ค้นหาคำพิพากษาศาลฎีกา" },
                  { name: "ศาลปกครอง", url: "https://www.admincourt.go.th", desc: "คำพิพากษาศาลปกครอง" },
                  { name: "ศาลยุติธรรม", url: "https://www.coj.go.th", desc: "ข้อมูลศาลยุติธรรม + FAQ" },
                  { name: "e-Filing ศาลยุติธรรม", url: "https://efiling.coj.go.th", desc: "ระบบยื่นฟ้องออนไลน์" },
                  { name: "สำนักเลขาธิการ ครม.", url: "https://www.soc.go.th", desc: "มติ ครม. + ข้อมูลราชการ" },
                ].map(link => (
                  <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="p-3 border border-border rounded-xl hover:border-primary/30 transition-colors flex items-center gap-3 group">
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">{link.name}</p>
                      <p className="text-[11px] text-muted-foreground">{link.desc}</p>
                    </div>
                  </a>
                ))}
              </div>
              <h4 className="text-sm font-bold mb-3">ข้อมูลในระบบ (Phase 1 — ข้อมูลที่มีจริง)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="p-3 bg-primary/5 rounded-xl text-center"><div className="text-xl font-bold text-primary">~188</div><div className="text-[11px] text-muted-foreground">PDF เอกสาร</div></div>
                <div className="p-3 bg-teal/5 rounded-xl text-center"><div className="text-xl font-bold text-teal">25</div><div className="text-[11px] text-muted-foreground">คดีตัวอย่าง</div></div>
                <div className="p-3 bg-accent/5 rounded-xl text-center"><div className="text-xl font-bold text-accent-foreground">10</div><div className="text-[11px] text-muted-foreground">ชุดข้อมูล HF</div></div>
                <div className="p-3 bg-secondary rounded-xl text-center"><div className="text-xl font-bold text-foreground">29</div><div className="text-[11px] text-muted-foreground">Backend Services</div></div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                ⏳ Phase 2: รอข้อมูลจากศาล 160,000+ คำพิพากษา — เมื่อได้รับจะ ingest เข้าระบบอัตโนมัติ
              </div>
            </div>

            {/* Phase 2: OpenLaw Data Thailand */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="font-heading font-bold mb-2 flex items-center gap-2 text-primary">
                <Database className="w-5 h-5" /> Phase 2 — Open Law Data Thailand
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                ดึงคำพิพากษาจาก <a href="https://openlawdatathailand.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">openlawdatathailand.org</a> (160,000+ คดี) เข้าสู่ระบบ RAG pipeline อัตโนมัติ
              </p>
              <div className="grid md:grid-cols-3 gap-3 mb-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-medium mb-1 block">คำค้นหา</label>
                  <input type="text" value={olQuery} onChange={(e) => setOlQuery(e.target.value)}
                    placeholder="เช่น คำพิพากษาศาลฎีกา, สัญญากู้ยืม..."
                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">จำนวน (สูงสุด 200)</label>
                  <input type="number" value={olLimit} onChange={(e) => setOlLimit(Math.min(200, Math.max(1, Number(e.target.value))))}
                    min={1} max={200}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {["คำพิพากษาศาลฎีกา", "สัญญากู้ยืม", "ฉ้อโกง", "เลิกจ้าง", "หย่า", "ละเมิด"].map(q => (
                  <button key={q} onClick={() => setOlQuery(q)}
                    className="text-[11px] bg-primary/10 text-primary px-2.5 py-1 rounded-full hover:bg-primary/20 transition-colors">{q}</button>
                ))}
              </div>
              <button onClick={runOpenLawIngest} disabled={olLoading || !olQuery.trim()}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium hover:bg-navy-deep transition-colors disabled:opacity-50">
                {olLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                {olLoading ? "กำลังดึงข้อมูล..." : "ดึงข้อมูลจาก OpenLaw"}
              </button>
              {olResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-4 bg-teal/5 border border-teal/20 rounded-xl p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="text-center">
                      <div className="text-lg font-bold text-teal">{olResult.fetched_documents}</div>
                      <div className="text-[10px] text-muted-foreground">คดีที่ดึงได้</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{olResult.ingested_chunks}</div>
                      <div className="text-[10px] text-muted-foreground">Chunks ที่ ingest</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${olResult.failed_documents === 0 ? "text-teal" : "text-destructive"}`}>{olResult.failed_documents}</div>
                      <div className="text-[10px] text-muted-foreground">ล้มเหลว</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-accent-foreground">{(olResult.cfs * 100).toFixed(1)}%</div>
                      <div className="text-[10px] text-muted-foreground">CFS Score</div>
                    </div>
                  </div>
                  <p className="text-xs text-teal flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> สถานะ: {olResult.status}
                  </p>
                </motion.div>
              )}
              <div className="mt-4 bg-accent/10 border border-accent/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-accent-foreground flex-shrink-0" />
                  เป้าหมาย Phase 2: นำเข้า 160,000+ คำพิพากษาจาก OpenLaw — ดึงทีละ batch ผ่านระบบคัดกรองข้อมูล และส่งเข้าคลังข้อมูลขนาดใหญ่โดยอัตโนมัติ
                </p>
              </div>
            </div>
          </div>
        )}


      </div>
      <Footer />
    </div>
  );
};

const StatCard = ({ icon: Icon, value, label, color }: { icon: typeof Database; value: string; label: string; color: string }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-4 text-center shadow-card">
    <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
    <div className={`font-heading text-2xl font-bold ${color}`}>{value}</div>
    <div className="text-xs text-muted-foreground mt-1">{label}</div>
  </motion.div>
);

const StatusRow = ({ label, value, ok }: { label: string; value: string; ok: boolean }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={`text-sm font-medium flex items-center gap-1 ${ok ? "text-teal" : "text-destructive"}`}>
      {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />} {value}
    </span>
  </div>
);

export default JudgeDashboard;
