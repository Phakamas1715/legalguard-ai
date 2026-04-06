import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Database, Search, FileText, Shield, Scale, BarChart3,
  ArrowRight, CheckCircle2, Cpu, Layers, Eye, Lock,
  MessageCircle, Mic, AlertTriangle, ExternalLink, Zap,
  Play, RefreshCw, Terminal, ChevronRight, Activity, HardDrive,
  Users, Bot, ShieldCheck, FileSearch, type LucideIcon
} from "lucide-react";
import demoBg from "@/assets/demo-bg.jpg";

type Phase = "idle" | "ingestion" | "search" | "agents" | "safety" | "output";

const SystemDemoPage = () => {
  const [currentPhase, setCurrentPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const phases: { id: Phase; label: string; icon: LucideIcon; color: string; desc: string }[] = [
    { id: "ingestion", label: "Data Ingestion", icon: Database, color: "text-blue-400", desc: "นำเข้าและประมวลผลเอกสารกองกลาง" },
    { id: "search", label: "Hybrid RAG", icon: Search, color: "text-purple-400", desc: "สืบค้นความหมายและข้อกฎหมาย" },
    { id: "agents", label: "Multi-Agent", icon: Cpu, color: "text-gold", desc: "เครือข่าย AI วิเคราะห์เชิงลึก" },
    { id: "safety", label: "Guardrails", icon: ShieldCheck, color: "text-teal", desc: "ตรวจสอบความปลอดภัยและ PDPA" },
    { id: "output", label: "Final Result", icon: Eye, color: "text-white", desc: "สรุปและร่างเอกสารอัตโนมัติ" },
  ];

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const runSimulation = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setLogs([]);
    
    // Step 1: Ingestion
    setCurrentPhase("ingestion");
    addLog("Initializing Data Ingestion Pipeline...");
    for (let i = 0; i <= 100; i += 5) {
      setProgress(i);
      if (i === 20) addLog("Loading Thai Judicial Dataset (OpenLaw)...");
      if (i === 50) addLog("Executing Advanced OCR & NLP Segmentation...");
      if (i === 80) addLog("Applying Automated PII/PDPA Masking...");
      await new Promise(r => setTimeout(r, 100));
    }
    addLog("✔ Ingestion Complete: 160K+ vectors indexed.");
    await new Promise(r => setTimeout(r, 500));

    // Step 2: Search
    setCurrentPhase("search");
    addLog("User Query: 'ถูกหลอกลงทุนออนไลน์ ฟ้องอย่างไร?'");
    for (let i = 0; i <= 100; i += 10) {
      setProgress(i);
      if (i === 30) addLog("Neural Semantic Search active...");
      if (i === 60) addLog("Hybrid Reranking (FAISS + BM25) in progress...");
      await new Promise(r => setTimeout(r, 150));
    }
    addLog("✔ Top 3 candidates retrieved with 94.2% confidence.");
    await new Promise(r => setTimeout(r, 500));

    // Step 3: Agents
    setCurrentPhase("agents");
    addLog("Orchestrating Multi-Agent Network...");
    for (let i = 0; i <= 100; i += 10) {
      setProgress(i);
      if (i === 20) addLog("Researcher Agent identifying Penal Code Sec. 341...");
      if (i === 50) addLog("Reviewer Agent validating case precedents...");
      if (i === 80) addLog("Compliance Agent scanning for potential bias...");
      await new Promise(r => setTimeout(r, 200));
    }
    addLog("✔ Multi-Agent reasoning verified (CAL-130 Protected).");
    await new Promise(r => setTimeout(r, 500));

    // Step 4: Safety
    setCurrentPhase("safety");
    addLog("Activating Legal Guardrails...");
    for (let i = 0; i <= 100; i += 10) {
      setProgress(i);
      if (i === 40) addLog("Running Hallucination-Check (Grounding)...");
      if (i === 80) addLog("Verifying AWS Bedrock Security Policies...");
      await new Promise(r => setTimeout(r, 150));
    }
    addLog("✔ Safety validated: Zero Hallucination detected.");
    await new Promise(r => setTimeout(r, 500));

    // Step 5: Output
    setCurrentPhase("output");
    addLog("Generating final response for Citizen Role...");
    setProgress(100);
    addLog("✔ Operation Success: LegalGuard AI is ready.");
    setIsSimulating(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050b18] text-white">
      <Navbar />

      {/* Hero Simulator Header */}
      <div className="relative pt-24 pb-12 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 z-0">
          <img src={demoBg} className="w-full h-full object-cover opacity-10" alt="" />
          <div className="absolute inset-0 bg-gradient-to-b from-navy-deep via-transparent to-transparent"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex items-center gap-2 px-3 py-1 bg-gold/10 text-gold rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 border border-gold/20">
              <Activity className="w-3 h-3" /> Real-time System Simulator
            </motion.div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
              LegalGuard AI <span className="text-gold">Simulator</span>
            </h1>
            <p className="text-white/60 text-lg md:text-xl font-medium max-w-2xl mx-auto mb-10">
              สัมผัสประสบการณ์การทำงานของสถาปัตยกรรมระดับชาติ <br />แบบ Step-by-Step ผ่านเครื่องจำลองระบบอัจฉริยะ
            </p>
            
            {!isSimulating && currentPhase === "idle" && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={runSimulation}
                className="group relative px-8 py-4 bg-gold text-navy-deep font-bold rounded-2xl shadow-2xl flex items-center gap-3 mx-auto overflow-hidden transition-all"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                <Play className="w-5 h-5 fill-current" /> เริ่มต้นการจำลองระบบ
              </motion.button>
            )}
            
            {isSimulating && (
              <div className="flex items-center justify-center gap-4 text-gold font-bold">
                <RefreshCw className="w-5 h-5 animate-spin" /> 
                <span className="animate-pulse">ระบบกำลังประมวลผลจำลอง...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simulator Interface */}
      <div className="container mx-auto px-4 py-12 flex-1">
        <div className="grid lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
          
          {/* Left: Logic Flow */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Layers className="w-5 h-5 text-gold" /> System Flow Visualizer
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gold rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-gold uppercase tracking-widest">Active State</span>
                  </div>
                </div>
              </div>

              <div className="relative space-y-12 pl-6">
                <div className="absolute left-[2.45rem] top-4 bottom-4 w-0.5 bg-gradient-to-b from-blue-500 via-gold to-teal-500 opacity-20" />
                
                {phases.map((phase, idx) => (
                  <motion.div 
                    key={phase.id}
                    animate={{ 
                      opacity: currentPhase === phase.id || currentPhase === "idle" ? 1 : 0.3,
                      scale: currentPhase === phase.id ? 1.02 : 1
                    }}
                    className={`relative flex items-start gap-8 transition-all px-6 py-4 rounded-3xl ${currentPhase === phase.id ? 'bg-white/5 border border-white/10 shadow-2xl' : ''}`}
                  >
                    <div className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                      currentPhase === phase.id 
                      ? 'bg-gold text-navy-deep scale-110' 
                      : 'bg-white/5 text-white/40'
                    }`}>
                      <phase.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`text-lg font-bold transition-colors ${currentPhase === phase.id ? 'text-gold' : 'text-white/60'}`}>
                          {phase.label}
                        </h4>
                        {currentPhase === phase.id && (
                          <div className="text-[10px] font-bold bg-gold/20 text-gold px-2 py-0.5 rounded-lg border border-gold/20 mr-2 uppercase">
                            Processing {progress}%
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-white/40 font-medium">{phase.desc}</p>
                      
                      {currentPhase === phase.id && (
                        <motion.div className="mt-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-gold shadow-[0_0_10px_rgba(255,b153,0,0.5)]"
                          />
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Technical Logs & Output */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Terminal Logs */}
            <div className="bg-[#0a1221] rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden flex flex-col h-[400px]">
              <div className="bg-white/5 px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-gold" />
                  <span className="text-xs font-bold uppercase tracking-widest text-white/60">System Core Logs</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                </div>
              </div>
              <div 
                ref={scrollRef}
                className="flex-1 p-6 font-mono text-[11px] leading-relaxed overflow-y-auto space-y-2 scrollbar-hide"
              >
                {logs.length === 0 && (
                  <p className="text-white/20 italic">Waiting for system trigger...</p>
                )}
                {logs.map((log, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i} 
                    className={`${log.includes('✔') ? 'text-teal font-bold' : log.includes('Executing') ? 'text-gold' : 'text-white/70'}`}
                  >
                    {log}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Live Metrics */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8">
              <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Activity className="w-4 h-4 text-gold" /> Security & Performance
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Data Quality", value: "99.8%", icon: ShieldCheck, color: "text-teal" },
                  { label: "AI Latency", value: "<150ms", icon: Zap, color: "text-blue-400" },
                  { label: "RAG Accuracy", value: "94.2%", icon: FileSearch, color: "text-purple-400" },
                  { label: "Trust Score", value: "CAL-130", icon: Scale, color: "text-gold" }
                ].map((stat, i) => (
                  <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                    <div className="text-xl font-bold">{stat.value}</div>
                    <div className="text-[10px] text-white/40 font-bold uppercase">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Call to Action */}
            <AnimatePresence>
              {currentPhase === "output" && !isSimulating && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-gold to-accent p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group"
                >
                  <div className="relative z-10">
                    <h3 className="text-navy-deep text-2xl font-bold mb-2">Simulated Success!</h3>
                    <p className="text-navy-deep/80 text-sm font-medium mb-6">ระบบจำลองยืนยันความพร้อมของสถาปัตยกรรม 100% กุญแจสู่ความยุติธรรมดิจิทัลพร้อมใช้งานแล้ว</p>
                    <button 
                      onClick={() => navigate("/search?role=citizen")}
                      className="w-full py-4 bg-navy-deep text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:gap-4 transition-all"
                    >
                      ลองใช้งานจริงบนระบบ Sandbox <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="absolute top-[-50%] right-[-20%] w-64 h-64 bg-white/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default SystemDemoPage;
