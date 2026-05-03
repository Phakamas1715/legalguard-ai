import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Shield, CheckCircle2, AlertTriangle, Loader2, Lock, Eye, Scale, Heart, BarChart3
} from "lucide-react";

import { API_BASE } from "@/lib/runtimeConfig";
import { apiClient, type AgenticArchitectureResponse } from "@/lib/apiClient";

interface TLAGFPillar {
  pillar: string;
  name_th: string;
  status: string;
  score: number;
  details: string;
}

interface RiskTier {
  risk_level: string;
  confidence_cap: number;
  human_required: boolean;
}

interface CSEConstraint {
  id: string;
  category: string;
  description: string;
  status: string;
}

interface ReleaseGuardResult {
  passed: boolean;
  checks: { name?: string; check?: string; passed: boolean; detail?: string; status?: string }[];
}

const PILLAR_ICONS: Record<string, typeof Shield> = {
  transparency: Eye,
  fairness: Scale,
  accountability: Shield,
  privacy: Lock,
  safety: Heart,
};

const MOCK_TLAGF: TLAGFPillar[] = [
  { pillar: "transparency", name_th: "ความโปร่งใส", status: "active", score: 0.92, details: "ทุกผลลัพธ์แสดงดัชนีความซื่อสัตย์ แหล่งอ้างอิง และระดับความเชื่อมั่น" },
  { pillar: "fairness", name_th: "ความเป็นธรรม", status: "active", score: 0.88, details: "CFS ≥ 93.5% — ตรวจสอบ bias ด้านภูมิศาสตร์ ประเภทศาล และช่วงเวลา" },
  { pillar: "accountability", name_th: "ความรับผิดชอบ", status: "active", score: 0.95, details: "มีบันทึกการใช้งาน CAL-130 และห่วงโซ่แฮช SHA-256 ทุกการทำงาน" },
  { pillar: "privacy", name_th: "ความเป็นส่วนตัว", status: "active", score: 0.97, details: "มีการปกปิด PII อัตโนมัติ ข้อมูลจัดเก็บในไทย และสอดคล้องตาม PDPA" },
  { pillar: "safety", name_th: "ความปลอดภัย", status: "active", score: 0.90, details: "มีวงจรหยุดฉุกเฉิน ระดับความเสี่ยง R1-R4 และเพดานความเชื่อมั่น" },
];

const MOCK_RISK_TIERS: Record<string, RiskTier> = {
  legal_search: { risk_level: "R1", confidence_cap: 0.95, human_required: false },
  case_summary: { risk_level: "R2", confidence_cap: 0.90, human_required: false },
  document_draft: { risk_level: "R3", confidence_cap: 0.85, human_required: true },
  case_prediction: { risk_level: "R4", confidence_cap: 0.80, human_required: true },
  judgment_draft: { risk_level: "R4", confidence_cap: 0.75, human_required: true },
  legal_advice: { risk_level: "R4", confidence_cap: 0.80, human_required: true },
};

const MOCK_CSE: CSEConstraint[] = [
  { id: "CSE-001", category: "PII", description: "ปกปิดชื่อ-นามสกุลจริงก่อนส่ง LLM", status: "enforced" },
  { id: "CSE-002", category: "PII", description: "ปกปิดเลขบัตรประชาชน 13 หลัก", status: "enforced" },
  { id: "CSE-003", category: "PII", description: "ปกปิดเบอร์โทรศัพท์", status: "enforced" },
  { id: "CSE-004", category: "sovereignty", description: "ข้อมูลต้องเก็บใน Region ap-southeast-1", status: "enforced" },
  { id: "CSE-005", category: "sovereignty", description: "ห้ามส่งข้อมูลคดีออกนอกประเทศ", status: "enforced" },
  { id: "CSE-006", category: "access", description: "แยกสิทธิ์ตามบทบาท citizen/lawyer/government", status: "enforced" },
  { id: "CSE-007", category: "ethics", description: "แสดง disclaimer ทุกผลลัพธ์ AI", status: "enforced" },
  { id: "CSE-008", category: "ethics", description: "ห้าม AI ตัดสินคดีแทนมนุษย์", status: "enforced" },
  { id: "CSE-009", category: "audit", description: "บันทึก audit log ทุก action", status: "enforced" },
  { id: "CSE-010", category: "fairness", description: "ตรวจสอบ bias ก่อน deploy", status: "enforced" },
];

const MOCK_RELEASE: ReleaseGuardResult = {
  passed: false,
  checks: [
    { name: "การเชื่อมต่อระบบหลังบ้าน", passed: false, detail: "ใช้ข้อมูลสำรองชั่วคราว เพราะระบบตรวจปล่อยใช้งานยังไม่ตอบกลับ" },
    { name: "หลักฐานก่อนปล่อยใช้งาน", passed: false, detail: "ยังไม่มีหลักฐานจากระบบรันจริงเพื่อยืนยันการทดสอบ การ build และการกำกับดูแล" },
    { name: "ขั้นตอนของผู้ดูแลระบบ", passed: false, detail: "ต้องตรวจระบบหลังบ้านและใช้ผลตรวจจากระบบจริงก่อนสาธิตหรือปล่อยใช้งาน" },
  ],
};

const MOCK_ARCHITECTURE: AgenticArchitectureResponse = {
  title: "Responsible AI Agentic Architecture",
  subtitle: "สถาปัตยกรรมภาพรวมของระบบ AI ด้านกฎหมาย ที่รวมสิทธิ์การเข้าถึง การสืบค้น การทำงานของ agent การกำกับความเสี่ยง และการตรวจสอบย้อนหลังไว้ด้วยกัน",
  badge: "Fallback View",
  architecture_version: "fallback_demo",
  relation_to_safety_pipeline: "7-Layer Safety Pipeline คือเส้นทางคุ้มครองของคำขอแต่ละครั้ง ส่วน Responsible AI Agentic Architecture คือกรอบภาพรวมของระบบทั้งหมด",
  integrity: {
    audit_chain_valid: false,
    generated_at: new Date().toISOString(),
  },
  components: [
    {
      id: "access",
      title: "Role-Aware Access Layer",
      description: "กำหนดสิทธิ์ตามบทบาทผู้ใช้งานและระดับข้อมูล",
      responsibilities: ["แยกบทบาทผู้ใช้งาน", "คุมการเข้าถึง endpoint", "กำกับ access matrix"],
      mapped_layers: ["L2", "L5"],
      services: ["Security Middleware", "Access Matrix"],
    },
    {
      id: "retrieval",
      title: "Trusted Retrieval Layer",
      description: "สืบค้นจากฐานความรู้ที่เชื่อถือได้ พร้อมแหล่งอ้างอิง",
      responsibilities: ["Hybrid retrieval", "context selection", "citation-first"],
      mapped_layers: ["L1", "L4"],
      services: ["Search Pipeline", "Vector Search", "BM25"],
    },
    {
      id: "reasoning",
      title: "Agentic Reasoning Layer",
      description: "ให้ agent หลายบทบาทร่วมกันคิดและตรวจทาน",
      responsibilities: ["intent routing", "research", "review", "compliance"],
      mapped_layers: ["L0", "L6"],
      services: ["LangGraph Agent Engine", "Feynman Multi-Agent Engine"],
    },
    {
      id: "controls",
      title: "Responsible AI Control Layer",
      description: "คุมความเสี่ยงทั้งก่อน ระหว่าง และหลังการประมวลผล",
      responsibilities: ["PII masking", "prompt guard", "risk tier", "circuit breaker"],
      mapped_layers: ["L2", "L5"],
      services: ["Prompt Guard", "PII Masking", "Release Guard"],
    },
    {
      id: "governance",
      title: "Audit & Governance Layer",
      description: "บันทึกและตรวจสอบย้อนหลังได้",
      responsibilities: ["audit log", "hash chain", "governance evidence"],
      mapped_layers: ["audit"],
      services: ["CAL-130 Audit Log", "Hash Chain"],
    },
    {
      id: "oversight",
      title: "Operational Oversight Layer",
      description: "ให้ฝ่ายไอทีมองเห็นสถานะและความพร้อมของระบบ",
      responsibilities: ["monitoring", "trace", "benchmark", "readiness"],
      mapped_layers: ["L5", "audit"],
      services: ["AI Control Tower", "IT Dashboard"],
    },
  ],
};

const ResponsibleAIPage = () => {
  const [tlagf, setTlagf] = useState<TLAGFPillar[]>([]);
  const [riskTiers, setRiskTiers] = useState<Record<string, RiskTier>>({});
  const [cseConstraints, setCseConstraints] = useState<CSEConstraint[]>([]);
  const [cseCategories, setCseCategories] = useState<Record<string, number>>({});
  const [releaseGuard, setReleaseGuard] = useState<ReleaseGuardResult | null>(null);
  const [architecture, setArchitecture] = useState<AgenticArchitectureResponse>(MOCK_ARCHITECTURE);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tlagf" | "risk" | "cse" | "release">("tlagf");

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [tlagfResp, riskResp, cseResp, releaseResp] = await Promise.all([
        fetch(`${API_BASE}/responsible-ai/tlagf`).catch(() => null),
        fetch(`${API_BASE}/responsible-ai/risk-tiers`).catch(() => null),
        fetch(`${API_BASE}/responsible-ai/cse-constraints`).catch(() => null),
        fetch(`${API_BASE}/responsible-ai/release-guard`).catch(() => null),
      ]);
      apiClient.getAgenticArchitecture().then(setArchitecture).catch(() => setArchitecture(MOCK_ARCHITECTURE));
      if (tlagfResp?.ok) {
        const tlagfData = await tlagfResp.json();
        const pillars = tlagfData.pillars ?? (Array.isArray(tlagfData) ? tlagfData : []);
        setTlagf(pillars.length > 0 ? pillars : MOCK_TLAGF);
      } else { setTlagf(MOCK_TLAGF); }
      if (riskResp?.ok) {
        const rd = await riskResp.json();
        setRiskTiers(Object.keys(rd).length > 0 ? rd : MOCK_RISK_TIERS);
      } else { setRiskTiers(MOCK_RISK_TIERS); }
      if (cseResp?.ok) {
        const cseData = await cseResp.json();
        setCseConstraints((cseData.constraints ?? []).length > 0 ? cseData.constraints : MOCK_CSE);
        setCseCategories(cseData.categories ?? { PII: 3, sovereignty: 2, access: 1, ethics: 2, audit: 1, fairness: 1 });
      } else {
        setCseConstraints(MOCK_CSE);
        setCseCategories({ PII: 3, sovereignty: 2, access: 1, ethics: 2, audit: 1, fairness: 1 });
      }
      if (releaseResp?.ok) {
        setReleaseGuard(await releaseResp.json());
      } else { setReleaseGuard(MOCK_RELEASE); }
    } catch {
      setTlagf(MOCK_TLAGF);
      setRiskTiers(MOCK_RISK_TIERS);
      setCseConstraints(MOCK_CSE);
      setCseCategories({ PII: 3, sovereignty: 2, access: 1, ethics: 2, audit: 1, fairness: 1 });
      setReleaseGuard(MOCK_RELEASE);
      setArchitecture(MOCK_ARCHITECTURE);
    }
    setLoading(false);
  };

  const tabs = [
    { id: "tlagf" as const, label: "หลักการ TLAGF 5 ด้าน", icon: Shield },
    { id: "risk" as const, label: "ระดับความเสี่ยง", icon: AlertTriangle },
    { id: "cse" as const, label: "CSE-200", icon: Lock },
    { id: "release" as const, label: "การตรวจปล่อยใช้งาน", icon: CheckCircle2 },
  ];

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-teal/10 flex items-center justify-center">
            <Shield className="w-8 h-8 text-teal" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">แดชบอร์ดการกำกับการใช้ AI</h1>
            <p className="text-muted-foreground">ธรรมาภิบาลปัญญาประดิษฐ์ในกระบวนการยุติธรรม</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-muted"
              }`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* TLAGF 5 Pillars */}
        {activeTab === "tlagf" && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-primary">
                    <BarChart3 className="h-4 w-4" /> {architecture.badge}
                  </div>
                  <h3 className="mt-4 font-heading text-xl font-bold">{architecture.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{architecture.subtitle}</p>
                  <p className="mt-3 text-xs text-muted-foreground">{architecture.relation_to_safety_pipeline}</p>
                </div>
                <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] ${architecture.integrity.audit_chain_valid ? "border-teal/20 bg-teal/10 text-teal" : "border-destructive/20 bg-destructive/10 text-destructive"}`}>
                  {architecture.integrity.audit_chain_valid ? "Audit Chain Verified" : "Runtime Not Verified"}
                </div>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                {architecture.components.map((component) => (
                  <div key={component.id} className="rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{component.title}</h4>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{component.description}</p>
                      </div>
                      <div className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-primary">
                        {component.mapped_layers.join(" · ")}
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      {component.responsibilities.slice(0, 2).map((item) => (
                        <p key={item} className="text-xs text-foreground/80">• {item}</p>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      บริการที่เกี่ยวข้อง: {component.services.join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            {Array.isArray(tlagf) && tlagf.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tlagf.map((p, i) => {
                  const Icon = PILLAR_ICONS[p.pillar?.toLowerCase()] ?? Shield;
                  const ok = p.status === "active" || p.status === "passed" || p.score >= 0.8;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="bg-card border border-border rounded-2xl p-5 shadow-card">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ok ? "bg-teal/10" : "bg-destructive/10"}`}>
                          <Icon className={`w-5 h-5 ${ok ? "text-teal" : "text-destructive"}`} />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{p.name_th || p.pillar}</p>
                          <span className={`text-[11px] ${ok ? "text-teal" : "text-destructive"}`}>{p.status}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                        <div className={`h-full rounded-full ${ok ? "bg-teal" : "bg-destructive"}`} style={{ width: `${(p.score ?? 0) * 100}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground">{p.details}</p>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <p>ไม่พบข้อมูล TLAGF กรุณาตรวจสอบระบบหลังบ้าน</p>
              </div>
            )}
          </div>
        )}

        {/* Risk Tiers */}
        {activeTab === "risk" && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="font-heading font-bold flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-accent-foreground" /> ระดับความเสี่ยง</h3>
                <p className="text-xs text-muted-foreground mt-1">ระดับความเสี่ยงและเพดานความเชื่อมั่นสำหรับแต่ละประเภทงาน</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">ประเภทงาน</th>
                      <th className="px-4 py-3 text-left font-medium">ระดับความเสี่ยง</th>
                      <th className="px-4 py-3 text-left font-medium">เพดานความเชื่อมั่น</th>
                      <th className="px-4 py-3 text-left font-medium">ต้องมีมนุษย์กำกับ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Object.entries(riskTiers).map(([action, tier]) => (
                      <tr key={action} className="hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">{action}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            tier.risk_level === "R1" ? "bg-teal/10 text-teal" :
                            tier.risk_level === "R2" ? "bg-primary/10 text-primary" :
                            tier.risk_level === "R3" ? "bg-accent/10 text-accent-foreground" :
                            "bg-destructive/10 text-destructive"
                          }`}>{tier.risk_level}</span>
                        </td>
                        <td className="px-4 py-3">{(tier.confidence_cap * 100).toFixed(0)}%</td>
                        <td className="px-4 py-3">
                          {tier.human_required
                            ? <CheckCircle2 className="w-4 h-4 text-destructive" />
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CSE-200 */}
        {activeTab === "cse" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(cseCategories).map(([cat, count]) => (
                <div key={cat} className="bg-card border border-border rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-primary">{count}</div>
                  <div className="text-[11px] text-muted-foreground">{cat}</div>
                </div>
              ))}
            </div>
            <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="font-heading font-bold flex items-center gap-2"><Lock className="w-5 h-5 text-primary" /> ข้อกำกับ CSE-200 ด้าน PDPA</h3>
                <p className="text-xs text-muted-foreground mt-1">{cseConstraints.length} / 200 ข้อกำกับ</p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">ID</th>
                      <th className="px-4 py-2 text-left font-medium">หมวด</th>
                      <th className="px-4 py-2 text-left font-medium">รายละเอียด</th>
                      <th className="px-4 py-2 text-left font-medium">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {cseConstraints.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/50">
                        <td className="px-4 py-2 text-xs font-mono">{c.id}</td>
                        <td className="px-4 py-2"><span className="text-[11px] bg-muted px-1.5 py-0.5 rounded">{c.category}</span></td>
                        <td className="px-4 py-2 text-xs">{c.description}</td>
                        <td className="px-4 py-2">
                          {c.status === "enforced" || c.status === "active"
                            ? <CheckCircle2 className="w-4 h-4 text-teal" />
                            : <AlertTriangle className="w-4 h-4 text-accent-foreground" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Release Guard */}
        {activeTab === "release" && releaseGuard && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <div className="flex items-center gap-3 mb-6">
                {releaseGuard.passed
                  ? <CheckCircle2 className="w-8 h-8 text-teal" />
                  : <AlertTriangle className="w-8 h-8 text-destructive" />}
                <div>
                  <h3 className="font-heading font-bold text-lg">{releaseGuard.passed ? "ผ่านการตรวจปล่อยใช้งาน ✅" : "ยังไม่ผ่านการตรวจปล่อยใช้งาน ❌"}</h3>
                  <p className="text-sm text-muted-foreground">การตรวจความปลอดภัยก่อนปล่อยใช้งานตามแนวทาง DevSecOps</p>
                </div>
              </div>
              <div className="space-y-2">
                {(releaseGuard.checks ?? []).map((check, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                    className={`p-3 rounded-xl flex items-center gap-3 ${check.passed ? "bg-teal/5 border border-teal/20" : "bg-destructive/5 border border-destructive/20"}`}>
                    {check.passed ? <CheckCircle2 className="w-4 h-4 text-teal flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />}
                    <div>
                      <p className="text-sm font-medium">{check.name ?? check.check ?? "guard_check"}</p>
                      <p className="text-xs text-muted-foreground">{check.detail ?? check.status ?? "พร้อมใช้งาน"}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default ResponsibleAIPage;
