import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Scale, Users, FileText, Shield } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:8000") + "/api/v1";

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
    { icon: Scale, value: "160K+", label: "คำพิพากษาเป้าหมาย", color: "text-primary" },
    { icon: FileText, value: "25+", label: "Prompt Templates", color: "text-teal" },
    { icon: Users, value: "3 บทบาท", label: "ประชาชน · ทนาย · เจ้าหน้าที่", color: "text-accent-foreground" },
    { icon: Shield, value: "PDPA", label: "ข้อมูลเก็บในไทย ปลอดภัย", color: "text-teal" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + i * 0.1 }}
          className="bg-card border border-border rounded-xl p-4 text-center shadow-card"
        >
          <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
          <div className={`font-heading text-2xl font-bold ${s.color}`}>{s.value}</div>
          <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
        </motion.div>
      ))}
    </div>
  );
};

export default StatsBar;
