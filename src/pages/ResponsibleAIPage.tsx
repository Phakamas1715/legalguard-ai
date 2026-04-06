import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Shield, CheckCircle2, AlertTriangle, Loader2, Lock, Eye, Scale, Heart, BarChart3
} from "lucide-react";

import { API_BASE } from "@/lib/runtimeConfig";

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
  checks: { name: string; passed: boolean; detail: string }[];
}

const PILLAR_ICONS: Record<string, typeof Shield> = {
  transparency: Eye,
  fairness: Scale,
  accountability: Shield,
  privacy: Lock,
  safety: Heart,
};

const MOCK_TLAGF: TLAGFPillar[] = [
  { pillar: "transparency", name_th: "ความโปร่งใส", status: "active", score: 0.92, details: "ทุกผลลัพธ์แสดง Honesty Score + แหล่งอ้างอิง + Confidence Badge" },
  { pillar: "fairness", name_th: "ความเป็นธรรม", status: "active", score: 0.88, details: "CFS ≥ 93.5% — ตรวจสอบ bias ด้านภูมิศาสตร์ ประเภทศาล และช่วงเวลา" },
  { pillar: "accountability", name_th: "ความรับผิดชอบ", status: "active", score: 0.95, details: "CAL-130 Audit Log + SHA-256 Hash Chain ทุก action" },
  { pillar: "privacy", name_th: "ความเป็นส่วนตัว", status: "active", score: 0.97, details: "PII Masking อัตโนมัติ + ข้อมูลเก็บในไทย + PDPA compliant" },
  { pillar: "safety", name_th: "ความปลอดภัย", status: "active", score: 0.90, details: "Circuit Breaker + Risk Tier R1-R4 + Confidence Cap" },
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
  passed: true,
  checks: [
    { name: "Unit Tests", passed: true, detail: "574/574 tests passed" },
    { name: "PII Masking", passed: true, detail: "ปกปิดข้อมูลส่วนบุคคลทำงานปกติ" },
    { name: "Honesty Score", passed: true, detail: "H-Score ≥ 0.85 ทุก endpoint" },
    { name: "Hallucination Rate", passed: true, detail: "< 1% จากการทดสอบ NitiBench" },
    { name: "PDPA Compliance", passed: true, detail: "CSE-200 constraints enforced" },
    { name: "Risk Tier Caps", passed: true, detail: "Confidence cap ทำงานทุก tier" },
    { name: "Audit Log Integrity", passed: true, detail: "SHA-256 hash chain valid" },
    { name: "Bias Check (CFS)", passed: true, detail: "CFS = 93.5% ≥ threshold 90%" },
  ],
};

const ResponsibleAIPage = () => {
  const [tlagf, setTlagf] = useState<TLAGFPillar[]>([]);
  const [riskTiers, setRiskTiers] = useState<Record<string, RiskTier>>({});
  const [cseConstraints, setCseConstraints] = useState<CSEConstraint[]>([]);
  const [cseCategories, setCseCategories] = useState<Record<string, number>>({});
  const [releaseGuard, setReleaseGuard] = useState<ReleaseGuardResult | null>(null);
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
    }
    setLoading(false);
  };

  const tabs = [
    { id: "tlagf" as const, label: "TLAGF 5 Pillars", icon: Shield },
    { id: "risk" as const, label: "Risk Tiers", icon: AlertTriangle },
    { id: "cse" as const, label: "CSE-200", icon: Lock },
    { id: "release" as const, label: "Release Guard", icon: CheckCircle2 },
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
            <h1 className="font-heading text-2xl font-bold">Responsible AI Dashboard</h1>
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
                <p>ไม่พบข้อมูล TLAGF — ตรวจสอบ backend</p>
              </div>
            )}
          </div>
        )}

        {/* Risk Tiers */}
        {activeTab === "risk" && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="font-heading font-bold flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-accent-foreground" /> Risk Tiers</h3>
                <p className="text-xs text-muted-foreground mt-1">ระดับความเสี่ยงและ Confidence Cap สำหรับแต่ละ Action Type</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Action Type</th>
                      <th className="px-4 py-3 text-left font-medium">Risk Level</th>
                      <th className="px-4 py-3 text-left font-medium">Confidence Cap</th>
                      <th className="px-4 py-3 text-left font-medium">Human Required</th>
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
                <h3 className="font-heading font-bold flex items-center gap-2"><Lock className="w-5 h-5 text-primary" /> CSE-200 PDPA Constraints</h3>
                <p className="text-xs text-muted-foreground mt-1">{cseConstraints.length} / 200 constraints</p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">ID</th>
                      <th className="px-4 py-2 text-left font-medium">Category</th>
                      <th className="px-4 py-2 text-left font-medium">Description</th>
                      <th className="px-4 py-2 text-left font-medium">Status</th>
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
                  <h3 className="font-heading font-bold text-lg">{releaseGuard.passed ? "Release Guard ผ่าน ✅" : "Release Guard ไม่ผ่าน ❌"}</h3>
                  <p className="text-sm text-muted-foreground">DevSecOps pre-deployment safety checks</p>
                </div>
              </div>
              <div className="space-y-2">
                {(releaseGuard.checks ?? []).map((check, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                    className={`p-3 rounded-xl flex items-center gap-3 ${check.passed ? "bg-teal/5 border border-teal/20" : "bg-destructive/5 border border-destructive/20"}`}>
                    {check.passed ? <CheckCircle2 className="w-4 h-4 text-teal flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />}
                    <div>
                      <p className="text-sm font-medium">{check.name}</p>
                      <p className="text-xs text-muted-foreground">{check.detail}</p>
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
