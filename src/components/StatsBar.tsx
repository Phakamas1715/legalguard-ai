import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Scale, Users, FileText, Shield } from "lucide-react";

import { API_BASE } from "@/lib/runtimeConfig";

interface SystemStats {
  actual: {
    pdf_files: number;
    mock_cases: number;
    hf_datasets: number;
    langgraph_agents: number;
    pii_patterns: number;
  };
  targets: { total_cases: number };
  phase: string;
}

const StatsBar = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/dashboard/system-stats`)
      .then(r => r.ok ? r.json() : null)
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const pdfCount = stats?.actual.pdf_files ?? 188;
  const mockCases = stats?.actual.mock_cases ?? 25;
  const hfDatasets = stats?.actual.hf_datasets ?? 10;

  const items = [
    { icon: Scale, value: "160,000+", label: "ฐานข้อมูลคำพิพากษาเป้าหมาย", color: "text-navy-deep", sub: "OpenLaw Thailand Dataset" },
    { icon: FileText, value: "25+", label: "AI Prompt Templates", color: "text-gold", sub: "ผ่านการ Audit โดยผู้เชี่ยวชาญ" },
    { icon: Users, value: "3 Tracks", label: "ประชาชน · ศาล · ตุลาการ", color: "text-teal", sub: "พร้อมแตก private bundle เพิ่มได้" },
    { icon: Shield, value: "Audit 100%", label: "ตรวจสอบย้อนหลังและปกปิด PII", color: "text-blue-600", sub: "มาตรฐาน RAAIA Verified" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + i * 0.1 }}
          className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-[2rem] p-8 text-center shadow-2xl hover:shadow-gold/10 hover:-translate-y-2 transition-all group"
        >
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-gold/10 transition-colors">
            <s.icon className={`w-6 h-6 ${s.color}`} />
          </div>
          <div className={`font-heading text-3xl font-black mb-1 p-0.5 tracking-tighter ${s.color}`}>{s.value}</div>
          <div className="text-sm font-bold text-foreground mb-1">{s.label}</div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground opacity-60">{s.sub}</div>
        </motion.div>
      ))}
    </div>
  );
};

export default StatsBar;
