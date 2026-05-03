import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Scale, Users, FileText, Shield } from "lucide-react";
import { apiClient, type DashboardSystemStatsResponse } from "@/lib/apiClient";

const StatsBar = () => {
  const [stats, setStats] = useState<DashboardSystemStatsResponse | null>(null);

  useEffect(() => {
    apiClient.getDashboardSystemStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const targetCases = stats?.targets?.total_cases ? `${stats.targets.total_cases.toLocaleString()}+` : "—";
  const pdfFiles = typeof stats?.actual.pdf_files === "number" ? `${stats.actual.pdf_files}` : "—";
  const hfDatasets = typeof stats?.actual.hf_datasets === "number" ? `${stats.actual.hf_datasets}` : "—";
  const auditEntries = typeof stats?.actual.audit_entries === "number" ? `${stats.actual.audit_entries}` : "—";

  const items = [
    {
      icon: Scale,
      value: targetCases,
      label: "เป้าหมายฐานข้อมูลคำพิพากษา",
      color: "text-navy-deep",
      sub: stats?.targets?.total_cases_note ?? "รอข้อมูลเป้าหมายจาก backend",
    },
    {
      icon: FileText,
      value: pdfFiles,
      label: "PDF ที่มีในระบบตอนนี้",
      color: "text-gold",
      sub: stats?.actual.pdf_description ?? "actual count จาก backend system stats",
    },
    {
      icon: Users,
      value: hfDatasets,
      label: "ชุดข้อมูล Hugging Face",
      color: "text-teal",
      sub: stats?.actual.hf_datasets_description ?? "actual count จาก backend system stats",
    },
    {
      icon: Shield,
      value: auditEntries,
      label: "Audit entries ที่บันทึกแล้ว",
      color: "text-blue-600",
      sub: stats?.phase ?? "รอ backend system stats",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + i * 0.1 }}
          className="float-card bg-white/90 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 text-center shadow-xl group relative overflow-hidden"
        >
          {/* Subtle gradient accent at top */}
          <div className={`absolute top-0 left-0 right-0 h-1 ${
            s.color === 'text-gold' ? 'bg-gradient-to-r from-gold/80 to-gold/20' :
            s.color === 'text-teal' ? 'bg-gradient-to-r from-teal/80 to-teal/20' :
            s.color === 'text-blue-600' ? 'bg-gradient-to-r from-blue-600/80 to-blue-600/20' :
            'bg-gradient-to-r from-navy-deep/80 to-navy-deep/20'
          } rounded-t-[2rem]`} />
          <div className={`w-14 h-14 mx-auto mb-5 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${
            s.color === 'text-gold' ? 'bg-gradient-to-br from-gold/20 to-gold/5 shadow-gold/10' :
            s.color === 'text-teal' ? 'bg-gradient-to-br from-teal/20 to-teal/5 shadow-teal/10' :
            s.color === 'text-blue-600' ? 'bg-gradient-to-br from-blue-600/20 to-blue-600/5' :
            'bg-gradient-to-br from-navy-deep/15 to-navy-deep/5'
          } shadow-lg`}>
            <s.icon className={`w-7 h-7 ${s.color}`} />
          </div>
          <div className={`font-heading text-3xl font-black mb-1.5 tracking-tighter ${s.color}`}>{s.value}</div>
          <div className="text-sm font-bold text-foreground mb-1.5">{s.label}</div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50">{s.sub}</div>
        </motion.div>
      ))}
    </div>
  );
};

export default StatsBar;
