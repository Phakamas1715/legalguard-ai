import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, Shield, ShieldCheck } from "lucide-react";
import { apiClient, type SafetyPipelineResponse } from "@/lib/apiClient";

interface SafetyPipelineLayer {
  step: string;
  layer_code?: string;
  title: string;
  description: string;
  runtime_status?: string;
}

const fallbackLayers: SafetyPipelineLayer[] = [
  { step: "01", layer_code: "L2", title: "PII Sanitization", description: "ปกปิดข้อมูลส่วนบุคคล", runtime_status: "unknown" },
  { step: "02", layer_code: "L0", title: "Intent Routing", description: "วิเคราะห์เส้นทางการทำงาน", runtime_status: "unknown" },
  { step: "03", layer_code: "L1", title: "Hybrid Retrieval", description: "ค้นข้อมูลกฎหมายหลายชั้น", runtime_status: "unknown" },
  { step: "04", layer_code: "L4", title: "Context Filter", description: "คัดเฉพาะบริบทที่เกี่ยวข้อง", runtime_status: "unknown" },
  { step: "05", layer_code: "L5", title: "AI Guardrails", description: "คุม governance และ compliance", runtime_status: "unknown" },
  { step: "06", layer_code: "L6", title: "Hallucination Audit", description: "ตรวจทาน reasoning หลาย agent", runtime_status: "unknown" },
  { step: "07", layer_code: "audit", title: "Crypto Log", description: "บันทึก hash chain ย้อนหลังได้", runtime_status: "unknown" },
];

const fallbackPipeline: SafetyPipelineResponse = {
  title: "ระบบคัดกรองความปลอดภัย 7 ชั้น (7-Layer Safety Pipeline)",
  subtitle: "โหมดสำรองสำหรับเดโม เมื่อ backend ไม่พร้อมตอบ runtime evidence",
  badge: "Fallback View",
  integrity: {
    audit_chain_valid: false,
    generated_at: new Date().toISOString(),
  },
  layers: fallbackLayers,
};

const statusClass = (status?: string) => {
  if (status === "healthy") return "bg-teal/15 text-teal border-teal/20";
  if (status === "warning") return "bg-gold/15 text-gold border-gold/20";
  return "bg-muted text-muted-foreground border-border";
};

const statusLabel = (status?: string) => {
  if (status === "healthy") return "พร้อมใช้งาน";
  if (status === "warning") return "เฝ้าระวัง";
  return "ไม่มีข้อมูล";
};

const SafetyPipelinePreview = ({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  compact = false,
  className = "",
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction?: { label: string; path: string };
  secondaryAction?: { label: string; path: string };
  compact?: boolean;
  className?: string;
}) => {
  const [pipeline, setPipeline] = useState<SafetyPipelineResponse>(fallbackPipeline);
  const [sourceLabel, setSourceLabel] = useState("กำลังตรวจ runtime");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await apiClient.getSafetyPipeline();
        if (active && data.layers?.length) {
          setPipeline(data);
          setSourceLabel("ดึงจาก backend runtime");
        }
      } catch {
        if (active) {
          setPipeline(fallbackPipeline);
          setSourceLabel("ใช้ fallback สำหรับเดโม");
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className={`rounded-[2rem] border border-border bg-card p-6 shadow-card ${className}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
            <Shield className="h-4 w-4" /> {eyebrow}
          </div>
          <h3 className="mt-4 font-heading text-2xl font-black text-foreground">{title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            {pipeline.title} · {pipeline.subtitle}
          </p>
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            แหล่งข้อมูล: {sourceLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-gold">
            <ShieldCheck className="h-4 w-4" /> {pipeline.badge}
          </span>
          <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] ${pipeline.integrity.audit_chain_valid ? "border-teal/20 bg-teal/10 text-teal" : "border-destructive/20 bg-destructive/10 text-destructive"}`}>
            <Activity className="h-4 w-4" /> {pipeline.integrity.audit_chain_valid ? "Audit Chain Verified" : "Runtime Not Verified"}
          </span>
        </div>
      </div>

      <div className={`mt-6 grid gap-3 ${compact ? "grid-cols-2 md:grid-cols-4 xl:grid-cols-7" : "grid-cols-2 md:grid-cols-4 xl:grid-cols-7"}`}>
        {pipeline.layers.map((layer) => (
          <div key={layer.step} className="rounded-[1.5rem] border border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                {layer.layer_code ?? `STEP ${layer.step}`}
              </span>
              <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${statusClass(layer.runtime_status)}`}>
                {statusLabel(layer.runtime_status)}
              </span>
            </div>
            <p className="mt-3 text-sm font-bold text-foreground">{layer.title}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{layer.description}</p>
          </div>
        ))}
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-wrap gap-3">
          {primaryAction && (
            <Link to={primaryAction.path} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90">
              {primaryAction.label} <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          {secondaryAction && (
            <Link to={secondaryAction.path} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold text-foreground hover:bg-muted">
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default SafetyPipelinePreview;
