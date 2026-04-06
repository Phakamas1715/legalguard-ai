import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Building2, Shield, FileText, BarChart3, Clock, Database,
  ShieldCheck, AlertTriangle, CheckCircle2, Hash, Send, Loader2, Scale,
  ExternalLink, BookOpen, Mic, Gavel, ThumbsUp, ThumbsDown
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getAuditStats, getAuditEntries, verifyChainIntegrity } from "@/lib/auditLog";
import { maskPII, PII_TYPE_LABELS, type PIISpan } from "@/lib/piiMasking";
import heroCourthouseImg from "@/assets/hero-courthouse.jpg";

type Tab = "overview" | "tools" | "triage" | "draft" | "data" | "technical" | "transcribe";

import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";

import { API_BASE } from "@/lib/runtimeConfig";

const JudgeDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [chainValid, setChainValid] = useState<boolean | null>(null);
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

  useEffect(() => { verifyChainIntegrity().then((r) => setChainValid(r.valid)); }, []);

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
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <div className="text-primary-foreground">
              <motion.h1 initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="font-heading text-3xl md:text-4xl font-bold mb-1">
                แดชบอร์ดตุลาการ
              </motion.h1>
              <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="opacity-90 text-sm md:text-base font-light">
                เครื่องมืออัจฉริยะสำหรับผู้พิพากษา ช่วยยกร่างและพิจารณาคดีด้วย AI
              </motion.p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-8 flex-1">

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap shadow-sm border ${
                activeTab === tab.id 
                  ? "bg-navy-deep text-white border-gold shadow-gold/20" 
                  : "bg-card border-border text-muted-foreground hover:bg-muted"
              }`}>
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-gold" : ""}`} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Role-specific access notice */}
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 mb-6">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium text-primary">บทบาท: ตุลาการ / ผู้พิพากษา</span> — สิทธิ์เข้าถึง: ร่างคำพิพากษา, ค้นหาฎีกา, แม่แบบคำสั่ง, ตรวจสอบความเป็นธรรม
          </p>
        </div>

        {/* ภาพรวม — ภาษาเข้าใจง่าย ไม่มีศัพท์เทคนิค */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Database} value={`~${188}`} label="เอกสาร PDF" color="text-primary" />
              <StatCard icon={FileText} value="25" label="คดีตัวอย่าง" color="text-teal" />
              <StatCard icon={Clock} value="< 2 วินาที" label="เวลาค้นหาเฉลี่ย" color="text-accent-foreground" />
              <StatCard icon={ShieldCheck} value="ปลอดภัย" label="ข้อมูลเก็บในไทย" color="text-teal" />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                <h3 className="font-heading font-bold mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-teal" /> สถานะระบบ</h3>
                <div className="space-y-4">
                  <StatusRow label="ระบบค้นหา" value="พร้อมใช้งาน" ok />
                  <StatusRow label="ระบบร่างเอกสาร" value="พร้อมใช้งาน" ok />
                  <StatusRow label="ปกป้องข้อมูลส่วนบุคคล" value="เปิดใช้งาน" ok />
                  <StatusRow label="บันทึกการใช้งาน" value={chainValid === null ? "ตรวจสอบ..." : chainValid ? "ปกติ" : "มีปัญหา"} ok={chainValid === true} />
                  <StatusRow label="ความเป็นธรรมของผลค้นหา" value="ผ่านเกณฑ์" ok />
                </div>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card md:col-span-2">
                <h3 className="font-heading font-bold mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> สถิติคดีในสัปดาห์นี้</h3>
                <div className="h-40 flex items-end justify-around gap-2 px-4 pb-2 border-b border-border mb-4">
                  {[65, 40, 85, 30, 95, 55, 78].map((h, i) => (
                    <div key={i} className="bg-primary/20 hover:bg-primary/40 transition-colors w-full rounded-t-md relative group">
                      <div style={{ height: `${h}%` }} className="bg-primary rounded-t-md" />
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[11px] font-bold transition-opacity">{h}%</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground px-2">
                  <span>จ.</span><span>อ.</span><span>พ.</span><span>พฤ.</span><span>ศ.</span><span>ส.</span><span>อา.</span>
                </div>
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
              { icon: ShieldCheck, title: "ตรวจสอบความเป็นธรรม", desc: "ตรวจสอบ Bias ด้วย Responsible AI", action: () => navigate("/responsible-ai"), color: "bg-primary/10 text-primary" },
              { icon: BarChart3, title: "สถิติคดีประจำวัน", desc: "ดูสถานะคดีในความรับผิดชอบ", action: () => setActiveTab("overview"), color: "bg-primary/5 text-primary" },
              { icon: Database, title: "แหล่งข้อมูล", desc: "ดึงข้อมูล OpenLaw มาตรฐานล่าสุด", action: () => setActiveTab("data"), color: "bg-teal/5 text-teal" },
              { icon: Scale, title: "แม่แบบคำสั่ง AI", desc: "รวม Prompt สำหรับช่วยตัดสิน", action: () => navigate("/prompts"), color: "bg-accent/10 text-accent-foreground" },
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
                  <Mic className="w-6 h-6" /> ระบบ AI ถอดความเสียง (Legal Speech-to-Text)
                </h3>
                <span className="text-[10px] bg-gold/10 text-gold border border-gold/20 px-2 py-1 rounded font-bold">READY FOR COURTROOM</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">แปลงเสียงคำให้การบนบัลลังก์ศาลเป็นข้อความอัตโนมัติแบบ Real-time พร้อมคัดกรองศัพท์กฎหมายเฉพาะทาง</p>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-4">
                  <div className="p-4 bg-muted/50 rounded-xl border border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Audio Input Source</p>
                    <select className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-primary">
                      <option>Microphone (Built-in)</option>
                      <option>Courtroom Mixer (Line-in)</option>
                      <option>External USB Mic</option>
                    </select>
                  </div>
                  <div className="p-4 bg-teal/5 rounded-xl border border-teal/20">
                    <p className="text-[10px] font-bold text-teal uppercase mb-2">AI Precision Mode</p>
                    <div className="flex items-center gap-2">
                       <CheckCircle2 className="w-4 h-4 text-teal" />
                       <span className="text-xs font-bold font-heading">Legal Terminology Enabled</span>
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
                  <h4 className="font-bold text-lg mb-2">คลิกเพื่อเริ่มบันทึกการพิจารณาคดี</h4>
                  <p className="text-xs text-muted-foreground max-w-[200px]">รองรับการทำงานแบบ Live Stream ส่งข้อความไปยังหน้าจาตุลาการทันที</p>
                  <button className="mt-6 bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                    Start Live Transcription
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
                <p className="text-[11px] text-muted-foreground mb-1.5">💡 ตัวอย่างข้อเท็จจริง</p>
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
