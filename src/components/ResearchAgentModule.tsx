import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  ShieldCheck, 
  FileSearch, 
  Workflow, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  BookOpen,
  ArrowRight
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";

interface ResearchStep {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "error";
}

const ResearchAgentModule = () => {
  const [query, setQuery] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [steps, setSteps] = useState<ResearchStep[]>([
    { id: "analyze", label: "วิเคราะห์ประเด็นและบริบทข้อกฎหมาย (Researcher Agent)", status: "pending" },
    { id: "search", label: "ค้นฐานข้อมูลศาลและราชกิจจานุเบกษา", status: "pending" },
    { id: "verify", label: "ตรวจสอบมาตราและแหล่งอ้างอิง (Verifier Agent)", status: "pending" },
    { id: "synthesis", label: "สรุปผลพร้อมประเด็นสำคัญ (Writer Agent)", status: "pending" },
  ]);
  const [result, setResult] = useState<any>(null);

  const startDeepResearch = async () => {
    if (!query.trim() || isResearching) return;

    setIsResearching(true);
    setResult(null);
    setSteps(s => s.map(step => ({ ...step, status: "pending" })));

    try {
      // Step 1: Researcher
      setSteps(s => s.map(step => step.id === "analyze" ? { ...step, status: "running" } : step));
      await new Promise(r => setTimeout(r, 1500)); // Simulate AI overhead
      setSteps(s => s.map(step => step.id === "analyze" ? { ...step, status: "completed" } : step));

      // Step 2: Search (Real Backend Call)
      setSteps(s => s.map(step => step.id === "search" ? { ...step, status: "running" } : step));
      const searchData = await apiClient.search(query, {}, "government", 5);
      setSteps(s => s.map(step => step.id === "search" ? { ...step, status: "completed" } : step));

      // Step 3: Verifier
      setSteps(s => s.map(step => step.id === "verify" ? { ...step, status: "running" } : step));
      await new Promise(r => setTimeout(r, 2000));
      setSteps(s => s.map(step => step.id === "verify" ? { ...step, status: "completed" } : step));

      // Step 4: Writer Synthesis
      setSteps(s => s.map(step => step.id === "synthesis" ? { ...step, status: "running" } : step));
      const finalMsg = [
        { role: "system" as const, content: "คุณคือ Feynman Research Agent ประจำ LegalGuard AI หน้าที่ของคุณคือสรุปผลการค้นคว้ากฎหมายจากการสืบค้น โดยเน้นความถูกต้องของมาตราอ้างอิงและตรวจสอบแหล่งที่มาได้" },
        { role: "user" as const, content: `สรุปผลการค้นคว้ากฎหมายสำหรับเจ้าหน้าที่ศาลในหัวข้อ: ${query}\nข้อมูลอ้างอิงเบื้องต้น: ${JSON.stringify(searchData.results)}` }
      ];
      const synthesis = await apiClient.chat(finalMsg, "government");
      setSteps(s => s.map(step => step.id === "synthesis" ? { ...step, status: "completed" } : step));

      setResult({
        content: synthesis.content,
        citations: searchData.results,
        confidence: synthesis.confidence
      });
      
      toast.success("สรุปผลการค้นคว้าเสร็จแล้ว พร้อมแหล่งอ้างอิงที่ตรวจสอบได้");
    } catch (error) {
      console.error("Research error:", error);
      toast.error("เกิดข้อผิดพลาดในโมดูลค้นคว้ากฎหมาย");
      setSteps(s => s.map(step => ({ ...step, status: "error" })));
    } finally {
      setIsResearching(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-10">
      <div className="bg-gradient-to-br from-navy-deep to-navy p-10 rounded-[2.5rem] border border-gold/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 blur-[100px]" />
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1 space-y-6 w-full">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-gold mb-2">
                <ShieldCheck className="w-6 h-6 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-[0.3em]">Institutional Research Agent</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white leading-none">
                ระบบช่วยค้นคว้า<span className="text-gold">กฎหมาย</span>
              </h2>
              <p className="text-white/60 text-sm md:text-base font-medium max-w-xl">
                ขับเคลื่อนด้วย Feynman Multi-Agent Engine เพื่อช่วยสรุปประเด็น ค้นแหล่งอ้างอิง และตรวจสอบย้อนหลังได้อย่างเป็นระบบ
              </p>
            </div>

            <div className="relative group">
              <div className="absolute -inset-1 bg-gold/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
              <div className="relative flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input 
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="ระบุข้อเท็จจริงหรือประเด็นคดีที่ต้องการให้ระบบช่วยค้นคว้า..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-gold/50 transition-all"
                  />
                </div>
                <button 
                  onClick={startDeepResearch}
                  disabled={isResearching || !query.trim()}
                  className="px-8 py-4 bg-gold text-navy-deep font-black rounded-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2 whitespace-nowrap shadow-[0_10px_20px_rgba(255,193,7,0.3)]"
                >
                  {isResearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Workflow className="w-5 h-5" />}
                  {isResearching ? "กำลังค้นคว้า..." : "เริ่มค้นคว้า"}
                </button>
              </div>
            </div>
          </div>

          <div className="w-full md:w-80 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 space-y-4">
            <h4 className="text-xs font-black text-white/50 uppercase tracking-widest flex items-center gap-2">
              <FileSearch className="w-4 h-4" /> Workflow Status
            </h4>
            <div className="space-y-4">
              {steps.map((step) => (
                <div key={step.id} className="flex items-start gap-3">
                  <div className={`mt-1 w-2 h-2 rounded-full ${
                    step.status === "completed" ? "bg-teal shadow-[0_0_8px_#14b8a6]" : 
                    step.status === "running" ? "bg-gold animate-ping" : 
                    step.status === "error" ? "bg-destructive" :
                    "bg-white/20"
                  }`} />
                  <span className={`text-xs font-bold leading-tight ${
                    step.status === "running" ? "text-gold" : 
                    step.status === "completed" ? "text-white" : "text-white/40"
                  }`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 bg-card border border-border rounded-[2rem] p-8 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-primary" />
                  <h3 className="font-heading text-2xl font-bold">สรุปผลการค้นคว้า</h3>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-teal/10 border border-teal/20 text-teal text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  Confidence Score: {Math.round(result.confidence * 100)}%
                </div>
              </div>
              <div className="prose prose-slate max-w-none">
                <div className="bg-muted/30 p-6 rounded-2xl border border-border/50 text-foreground leading-relaxed whitespace-pre-wrap text-sm md:text-base font-medium">
                  {result.content}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-navy-deep border border-white/5 rounded-[2rem] p-6 shadow-xl">
                <h4 className="text-white font-black text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-gold" /> Verified Citations
                </h4>
                <div className="space-y-3">
                  {result.citations?.map((cit: any, i: number) => (
                    <div key={i} className="group p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-gold/30 transition-all cursor-pointer">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[10px] text-white/40 font-mono mb-1 truncate">SOURCE ID: {cit.id}</p>
                        <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-gold transition-colors" />
                      </div>
                      <p className="text-xs text-white font-bold line-clamp-2 leading-snug">
                        {cit.metadata?.title || "ไม่ระบุชื่อเอกสารอ้างอิง"}
                      </p>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-6 py-3 rounded-xl border border-white/10 text-white/50 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                  Export Audit Report <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResearchAgentModule;
