import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  FileText,
  Gavel,
  Hash,
  Loader2,
  RefreshCw,
  Scale,
  Send,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { maskPII, PII_TYPE_LABELS, type PIISpan } from "@/lib/piiMasking";
import heroCourthouseImg from "@/assets/hero-courthouse.jpg";
import { toast } from "sonner";

import { API_BASE } from "@/lib/runtimeConfig";

type Tab = "overview" | "tools" | "draft" | "data" | "technical";

interface DashboardSystemStats {
  actual: {
    pdf_files: number;
    pdf_description: string;
    mock_cases: number;
    mock_cases_description: string;
    hf_datasets: number;
    hf_datasets_description: string;
    audit_entries: number;
    langgraph_agents: number;
    anti_hallucination_layers: number;
    pii_patterns: number;
    api_endpoints: number;
    backend_services: number;
    total_tests: number;
  };
  targets: {
    total_cases: number;
    total_cases_note: string;
    hit_at_3: number;
    hit_at_3_note: string;
    p95_latency_ms: number;
    p95_latency_note: string;
    cfs_target: number;
    cfs_note: string;
    honesty_score_target: number;
    honesty_note: string;
  };
  phase: string;
}

interface DashboardLiveMetrics {
  timestamp: string;
  requests_1h: number;
  requests_24h: number;
  requests_by_action_1h: Record<string, number>;
  requests_by_action_24h: Record<string, number>;
  avg_confidence_1h: number;
  cache_hit_rate_1h: number;
  error_rate_1h: number;
  ingestion_jobs_24h: number;
  total_audit_entries: number;
  system_health: Record<string, string>;
  ai_metrics: {
    avg_honesty_score: number;
    hallucination_rate: number;
    pii_leak_count: number;
  };
}

interface ReleaseGuardResponse {
  release_allowed: boolean;
  checks: Array<{
    id: string;
    check: string;
    required: boolean;
    passed: boolean;
    status: string;
  }>;
  total_checks: number;
  passed: number;
  failed: number;
  required_all_passed: boolean;
}

interface BottlenecksResponse {
  bottlenecks: Array<{
    case_type: string;
    avg_processing_days: number;
    standard_days: number;
    threshold_days: number;
    sample_count: number;
    contributing_factors?: string[];
  }>;
}

interface OpenLawIngestResult {
  job_id: string;
  query: string;
  fetched_documents: number;
  ingested_chunks: number;
  failed_documents: number;
  cfs: number;
  f_geo: number;
  f_court: number;
  f_time: number;
  cfs_warning: boolean;
  status: string;
}

interface RecentAuditResponse {
  entries: Array<{
    id: string;
    action: string;
    query_preview: string;
    result_count: number;
    confidence: number | null;
    agent_role: string | null;
    entry_hash: string;
    prev_hash: string;
    created_at: string;
    metadata: Record<string, unknown>;
  }>;
  chain_valid: boolean;
  broken_at: number | null;
}

interface RecentIngestionJobsResponse {
  jobs: Array<{
    job_id: string;
    source_code: string;
    total_documents: number;
    processed_documents: number;
    failed_documents: number;
    total_chunks: number;
    error_log: Array<Record<string, unknown>>;
    status: string;
  }>;
}

const tabs: Array<{ id: Tab; label: string; icon: typeof BarChart3 }> = [
  { id: "overview", label: "ภาพรวม", icon: BarChart3 },
  { id: "tools", label: "เครื่องมือจริง", icon: Gavel },
  { id: "draft", label: "ร่างคำพิพากษา", icon: FileText },
  { id: "data", label: "ข้อมูลจริง", icon: Database },
  { id: "technical", label: "PII + Audit", icon: Shield },
];

const externalSources = [
  { name: "ราชกิจจานุเบกษา", url: "https://ratchakitcha.soc.go.th", desc: "ประกาศ กฎหมาย และกฎกระทรวง" },
  { name: "ฎีกาศาลฎีกา", url: "https://deka.supremecourt.or.th", desc: "ค้นหาคำพิพากษาศาลฎีกา" },
  { name: "ศาลปกครอง", url: "https://www.admincourt.go.th", desc: "คำพิพากษาและข้อมูลคดีปกครอง" },
  { name: "ศาลยุติธรรม", url: "https://www.coj.go.th", desc: "ข้อมูลศาลและบริการประชาชน" },
  { name: "e-Filing ศาลยุติธรรม", url: "https://efiling.coj.go.th", desc: "ระบบยื่นฟ้องออนไลน์" },
  { name: "Open Law Data Thailand", url: "https://openlawdatathailand.org", desc: "ฐานข้อมูลเปิดสำหรับการ ingest ระยะถัดไป" },
];

const toolRoutes = [
  { title: "คัดกรองคำฟ้อง", desc: "เชื่อมต่อ backend complaint classify / validate / export XML", route: "/complaint-form", icon: Scale },
  { title: "ค้นหากฎหมาย", desc: "ค้นหาผ่าน hybrid retrieval จาก backend โดยตรง", route: "/search?role=government", icon: BookOpen },
  { title: "วิเคราะห์คดี", desc: "ส่งเคสเข้าสู่โมดูล analyze สำหรับสรุปประเด็น", route: "/analyze", icon: Gavel },
  { title: "Responsible AI", desc: "ตรวจ policy, governance, และ release guard", route: "/responsible-ai", icon: ShieldCheck },
];

const GovernmentDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [systemStats, setSystemStats] = useState<DashboardSystemStats | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<DashboardLiveMetrics | null>(null);
  const [releaseGuard, setReleaseGuard] = useState<ReleaseGuardResponse | null>(null);
  const [bottlenecks, setBottlenecks] = useState<BottlenecksResponse | null>(null);
  const [recentAudit, setRecentAudit] = useState<RecentAuditResponse | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentIngestionJobsResponse | null>(null);
  const [draftInput, setDraftInput] = useState("");
  const [draftResult, setDraftResult] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [piiInput, setPiiInput] = useState("");
  const [piiResult, setPiiResult] = useState<{ masked: string; spans: PIISpan[]; piiCount: number } | null>(null);
  const [olQuery, setOlQuery] = useState("คำพิพากษาศาลฎีกา");
  const [olLimit, setOlLimit] = useState(50);
  const [olLoading, setOlLoading] = useState(false);
  const [olResult, setOlResult] = useState<OpenLawIngestResult | null>(null);

  const fetchJson = async <T,>(path: string): Promise<T> => {
    const response = await fetch(`${API_BASE}${path}`);
    if (!response.ok) {
      throw new Error(`${path} ${response.status}`);
    }
    return response.json();
  };

  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage("");

    try {
      const [stats, live, guard, bottleneckData, auditData, jobsData] = await Promise.all([
        fetchJson<DashboardSystemStats>("/dashboard/system-stats"),
        fetchJson<DashboardLiveMetrics>("/dashboard/live"),
        fetchJson<ReleaseGuardResponse>("/responsible-ai/release-guard"),
        fetchJson<BottlenecksResponse>("/dashboard/bottlenecks"),
        fetchJson<RecentAuditResponse>("/dashboard/audit/recent?limit=10"),
        fetchJson<RecentIngestionJobsResponse>("/ingest/recent?limit=10"),
      ]);

      setSystemStats(stats);
      setLiveMetrics(live);
      setReleaseGuard(guard);
      setBottlenecks(bottleneckData);
      setRecentAudit(auditData);
      setRecentJobs(jobsData);
    } catch (error) {
      console.error("Government dashboard error:", error);
      setErrorMessage("ไม่สามารถดึง metrics จาก backend ได้ กรุณาตรวจสอบว่า server ทำงานอยู่");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const runDraft = async () => {
    if (!draftInput.trim() || draftLoading) return;

    setDraftLoading(true);
    setDraftResult("");
    try {
      const messages = [
        {
          role: "system" as const,
          content: "คุณเป็นผู้ช่วย AI สำหรับตุลาการ ช่วยยกร่างคำพิพากษา อ้างอิงมาตรากฎหมาย และต้องระบุว่าเป็นร่างเบื้องต้นเท่านั้น",
        },
        { role: "user" as const, content: `ยกร่างคำพิพากษา:\n\n${draftInput}` },
      ];
      const resp = await apiClient.chatStream(messages, "government");
      if (!resp.ok || !resp.body) {
        throw new Error(`chat/stream ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const payload = JSON.parse(json);
            const content = payload.choices?.[0]?.delta?.content;
            if (content) {
              full += content;
              setDraftResult(full);
            }
          } catch {
            // Ignore malformed SSE frames and continue streaming.
          }
        }
      }
    } catch {
      setDraftResult("ไม่สามารถเชื่อมต่อ backend สำหรับร่างคำพิพากษาได้");
    } finally {
      setDraftLoading(false);
    }
  };

  const runPII = () => {
    if (!piiInput.trim()) return;
    setPiiResult(maskPII(piiInput));
  };

  const runOpenLawIngest = async () => {
    if (!olQuery.trim() || olLoading) return;

    setOlLoading(true);
    setOlResult(null);
    try {
      const response = await fetch(`${API_BASE}/ingest/openlaw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: olQuery, limit: olLimit }),
      });
      if (!response.ok) {
        throw new Error(`ingest/openlaw ${response.status}`);
      }
      const result = (await response.json()) as OpenLawIngestResult;
      setOlResult(result);
      toast.success(`OpenLaw ingest สำเร็จ ${result.fetched_documents} เอกสาร`);
      void loadDashboardData(true);
    } catch (error) {
      console.error("OpenLaw ingest error:", error);
      toast.error("ไม่สามารถ ingest ผ่าน backend ได้ในขณะนี้");
    } finally {
      setOlLoading(false);
    }
  };

  const healthRows = useMemo(() => {
    if (!liveMetrics) return [];
    return Object.entries(liveMetrics.system_health);
  }, [liveMetrics]);

  const requestRows = useMemo(() => {
    if (!liveMetrics) return [];
    return Object.entries(liveMetrics.requests_by_action_1h).sort((a, b) => b[1] - a[1]);
  }, [liveMetrics]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <div className="bg-hero-gradient relative overflow-hidden pt-12 pb-12 mb-8">
        <div
          className="absolute inset-0 opacity-15 bg-cover bg-center mix-blend-overlay"
          style={{ backgroundImage: `url(${heroCourthouseImg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80 md:opacity-0 mix-blend-multiply" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <div className="text-primary-foreground">
              <motion.h1 initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="font-heading text-3xl md:text-4xl font-bold mb-1">
                แดชบอร์ดเจ้าหน้าที่
              </motion.h1>
              <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="opacity-90 text-sm md:text-base font-light">
                หน้าเดียวสำหรับดู metrics จริงของระบบ, audit, และเครื่องมือ backend ที่เปิดใช้งานอยู่
              </motion.p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-8 flex-1">
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium text-primary">บทบาท: เจ้าหน้าที่รัฐ / ธุรการศาล</span>
            <span>หน้านี้ดึงข้อมูลจาก backend โดยตรง และแยกเป้าหมายในเอกสารออกจากตัวเลข runtime จริง</span>
          </p>
          <button
            type="button"
            onClick={() => void loadDashboardData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            รีเฟรช metrics
          </button>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap shadow-sm border ${
                activeTab === tab.id
                  ? "bg-navy-deep text-white border-gold shadow-gold/20"
                  : "bg-card border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-gold" : ""}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="max-w-5xl mx-auto rounded-2xl border border-border bg-card p-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-primary" />
            <p className="text-sm text-muted-foreground">กำลังโหลด metrics จาก backend...</p>
          </div>
        ) : (
          <>
            {errorMessage && (
              <div className="max-w-5xl mx-auto mb-6 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-sm text-destructive flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </p>
              </div>
            )}

            {activeTab === "overview" && systemStats && liveMetrics && releaseGuard && (
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={Database} value={String(systemStats.actual.pdf_files)} label="PDF จริงใน data/" color="text-primary" />
                  <StatCard icon={Activity} value={String(liveMetrics.requests_1h)} label="Requests ใน 1 ชม." color="text-teal" />
                  <StatCard icon={Clock} value={`${Math.round(systemStats.targets.p95_latency_ms)} ms`} label="Latency target จาก spec" color="text-accent-foreground" />
                  <StatCard
                    icon={releaseGuard.required_all_passed ? ShieldCheck : AlertTriangle}
                    value={releaseGuard.required_all_passed ? "พร้อมใช้งาน" : "ต้องตรวจเพิ่ม"}
                    label="Release Guard"
                    color={releaseGuard.required_all_passed ? "text-teal" : "text-destructive"}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                    <h3 className="font-heading font-bold mb-4 flex items-center gap-2 text-primary">
                      <BarChart3 className="w-5 h-5" /> สถานะระบบจริงจาก backend
                    </h3>
                    <div className="space-y-3">
                      {healthRows.map(([label, value]) => (
                        <StatusRow key={label} label={label} value={value} ok={value === "healthy"} />
                      ))}
                      <StatusRow
                        label="Average confidence (1h)"
                        value={`${Math.round(liveMetrics.avg_confidence_1h * 100)}%`}
                        ok={liveMetrics.avg_confidence_1h >= 0.7}
                      />
                      <StatusRow
                        label="Cache hit rate (1h)"
                        value={`${Math.round(liveMetrics.cache_hit_rate_1h * 100)}%`}
                        ok={liveMetrics.cache_hit_rate_1h >= 0.3}
                      />
                      <StatusRow
                        label="Error rate (1h)"
                        value={`${Math.round(liveMetrics.error_rate_1h * 100)}%`}
                        ok={liveMetrics.error_rate_1h <= 0.05}
                      />
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                    <h3 className="font-heading font-bold mb-4 flex items-center gap-2 text-primary">
                      <ShieldCheck className="w-5 h-5" /> Governance snapshot
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="rounded-xl bg-muted/30 p-4">
                        <p className="text-xs text-muted-foreground mb-1">Honesty score เฉลี่ย</p>
                        <p className="text-2xl font-bold text-foreground">{Math.round(liveMetrics.ai_metrics.avg_honesty_score * 100)}%</p>
                      </div>
                      <div className="rounded-xl bg-muted/30 p-4">
                        <p className="text-xs text-muted-foreground mb-1">Audit entries ทั้งหมด</p>
                        <p className="text-2xl font-bold text-foreground">{liveMetrics.total_audit_entries}</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2 text-sm">
                      <p className="font-medium text-foreground">{systemStats.phase}</p>
                      <p className="text-muted-foreground">{systemStats.actual.pdf_description}</p>
                      <p className="text-muted-foreground">{systemStats.targets.total_cases_note}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                  <h3 className="font-heading font-bold mb-4 flex items-center gap-2 text-primary">
                    <AlertCircle className="w-5 h-5" /> Bottleneck analysis
                  </h3>
                  {bottlenecks && bottlenecks.bottlenecks.length > 0 ? (
                    <div className="space-y-3">
                      {bottlenecks.bottlenecks.slice(0, 3).map((item) => (
                        <div key={item.case_type} className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                          <p className="font-medium text-foreground">{item.case_type}</p>
                          <p className="text-sm text-muted-foreground">
                            เฉลี่ย {item.avg_processing_days} วัน จากมาตรฐาน {item.standard_days} วัน
                          </p>
                          {item.contributing_factors?.map((factor) => (
                            <p key={factor} className="text-xs text-muted-foreground mt-1">
                              - {factor}
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      ยังไม่มีข้อมูล audit เชิงเวลาเพียงพอสำหรับระบุ bottleneck ที่เชื่อถือได้
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "tools" && (
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  {toolRoutes.map((tool) => (
                    <button
                      key={tool.route}
                      type="button"
                      onClick={() => navigate(tool.route)}
                      className="rounded-2xl border border-border bg-card p-6 text-left shadow-card transition-transform hover:-translate-y-0.5"
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                        <tool.icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-heading font-bold text-foreground mb-2">{tool.title}</h3>
                      <p className="text-sm text-muted-foreground">{tool.desc}</p>
                    </button>
                  ))}
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                  <h3 className="font-heading font-bold mb-3 flex items-center gap-2 text-primary">
                    <CheckCircle2 className="w-5 h-5" /> หลักการของหน้าเจ้าหน้าที่ในรอบนี้
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>- หน้า dashboard นี้ไม่แสดงตัวเลขเป้าหมายปะปนกับตัวเลข runtime โดยไม่ติดป้ายกำกับ</li>
                    <li>- การ ingest OpenLaw เรียกผ่าน backend endpoint จริง ไม่ fetch ตรงจาก browser แล้วแปลผลเอง</li>
                    <li>- งาน complaint, search และ draft ถูกโยงไปยังโมดูลที่มี backend รองรับแล้ว</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "draft" && (
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                  <h3 className="font-heading font-bold mb-2 flex items-center gap-2 text-primary">
                    <FileText className="w-5 h-5" /> ร่างคำพิพากษาเบื้องต้นผ่าน backend
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    ช่องนี้เชื่อม `chat/stream` ของ backend โดยตรง และแสดงผลเป็นร่างเบื้องต้นเท่านั้น
                  </p>
                  <textarea
                    value={draftInput}
                    onChange={(event) => setDraftInput(event.target.value)}
                    rows={8}
                    placeholder="วางข้อเท็จจริงหรือประเด็นคดีที่ต้องการยกร่าง..."
                    className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={runDraft}
                      disabled={!draftInput.trim() || draftLoading}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-navy-deep disabled:opacity-50"
                    >
                      {draftLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {draftLoading ? "กำลังร่าง..." : "เริ่มร่างผ่าน backend"}
                    </button>
                  </div>
                  <div className="mt-4 rounded-xl border border-accent/20 bg-accent/10 p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-accent-foreground" />
                      ผลลัพธ์เป็นร่างคำพิพากษาเบื้องต้น ต้องมีเจ้าหน้าที่หรือตุลาการตรวจทานก่อนใช้จริง
                    </p>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 shadow-card min-h-[240px]">
                  <h4 className="font-medium text-foreground mb-3">ผลลัพธ์</h4>
                  {draftResult ? (
                    <pre className="whitespace-pre-wrap text-sm text-foreground font-sans">{draftResult}</pre>
                  ) : (
                    <p className="text-sm text-muted-foreground">ยังไม่มีผลลัพธ์จาก backend ในรอบนี้</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "data" && systemStats && (
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                  <h3 className="font-heading font-bold mb-4 flex items-center gap-2 text-primary">
                    <Database className="w-5 h-5" /> แหล่งข้อมูลจริงที่ระบบใช้อยู่
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="rounded-xl bg-primary/5 p-4 text-center">
                      <div className="text-2xl font-bold text-primary">{systemStats.actual.pdf_files}</div>
                      <div className="text-[11px] text-muted-foreground">PDF จริง</div>
                    </div>
                    <div className="rounded-xl bg-teal/5 p-4 text-center">
                      <div className="text-2xl font-bold text-teal">{systemStats.actual.hf_datasets}</div>
                      <div className="text-[11px] text-muted-foreground">HF datasets</div>
                    </div>
                    <div className="rounded-xl bg-accent/5 p-4 text-center">
                      <div className="text-2xl font-bold text-accent-foreground">{systemStats.actual.backend_services}</div>
                      <div className="text-[11px] text-muted-foreground">Backend services</div>
                    </div>
                    <div className="rounded-xl bg-secondary p-4 text-center">
                      <div className="text-2xl font-bold text-foreground">{systemStats.actual.total_tests}</div>
                      <div className="text-[11px] text-muted-foreground">Tests ในระบบ</div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground space-y-1">
                    <p>{systemStats.actual.pdf_description}</p>
                    <p>{systemStats.actual.hf_datasets_description}</p>
                    <p>{systemStats.targets.total_cases_note}</p>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                  <h3 className="font-heading font-bold mb-4 flex items-center gap-2 text-primary">
                    <BookOpen className="w-5 h-5" /> แหล่งข้อมูลภายนอก
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {externalSources.map((link) => (
                      <a
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border border-border p-4 transition-colors hover:border-primary/30"
                      >
                        <div className="flex items-start gap-3">
                          <ExternalLink className="w-4 h-4 mt-0.5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{link.name}</p>
                            <p className="text-xs text-muted-foreground">{link.desc}</p>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                  <h3 className="font-heading font-bold mb-2 flex items-center gap-2 text-primary">
                    <Database className="w-5 h-5" /> OpenLaw ingestion ผ่าน backend
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    ปุ่มนี้เรียก `POST /api/v1/ingest/openlaw` และให้ backend เป็นผู้ fetch, คัดกรอง, และ index เอกสาร
                  </p>
                  <div className="grid md:grid-cols-3 gap-3 mb-4">
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium mb-1 block">คำค้นหา</label>
                      <input
                        type="text"
                        value={olQuery}
                        onChange={(event) => setOlQuery(event.target.value)}
                        className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">จำนวนเอกสาร</label>
                      <input
                        type="number"
                        value={olLimit}
                        min={1}
                        max={200}
                        onChange={(event) => setOlLimit(Math.min(200, Math.max(1, Number(event.target.value))))}
                        className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={runOpenLawIngest}
                    disabled={!olQuery.trim() || olLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-navy-deep disabled:opacity-50"
                  >
                    {olLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                    {olLoading ? "กำลัง ingest..." : "เริ่ม ingest"}
                  </button>

                  {olResult && (
                    <div className="mt-4 rounded-xl border border-teal/20 bg-teal/5 p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <MiniMetric label="Fetched" value={String(olResult.fetched_documents)} />
                        <MiniMetric label="Chunks" value={String(olResult.ingested_chunks)} />
                        <MiniMetric label="Failed" value={String(olResult.failed_documents)} />
                        <MiniMetric label="CFS" value={`${Math.round(olResult.cfs * 100)}%`} />
                      </div>
                      <p className="text-sm text-foreground mb-1">สถานะ: {olResult.status}</p>
                      <p className="text-xs text-muted-foreground">
                        F_geo {Math.round(olResult.f_geo * 100)}% | F_court {Math.round(olResult.f_court * 100)}% | F_time {Math.round(olResult.f_time * 100)}%
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                  <h3 className="font-heading font-bold mb-4 flex items-center gap-2 text-primary">
                    <Clock className="w-5 h-5" /> Recent ingestion jobs
                  </h3>
                  {recentJobs && recentJobs.jobs.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">Job</th>
                            <th className="px-4 py-3 text-left font-medium">Source</th>
                            <th className="px-4 py-3 text-left font-medium">สถานะ</th>
                            <th className="px-4 py-3 text-left font-medium">Documents</th>
                            <th className="px-4 py-3 text-left font-medium">Chunks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {recentJobs.jobs.map((job) => (
                            <tr key={job.job_id}>
                              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{job.job_id.slice(0, 8)}...</td>
                              <td className="px-4 py-3 font-medium text-foreground">{job.source_code}</td>
                              <td className="px-4 py-3">
                                <span className={`text-xs font-medium ${
                                  job.status === "completed" ? "text-teal" :
                                  job.status === "in_progress" ? "text-primary" :
                                  "text-destructive"
                                }`}>
                                  {job.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {job.processed_documents}/{job.total_documents}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{job.total_chunks}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">ยังไม่มี ingestion job ที่บันทึกไว้</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "technical" && liveMetrics && releaseGuard && (
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="bg-accent/10 border border-accent/20 rounded-xl p-4">
                  <p className="text-sm text-accent-foreground flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    โหมดนี้แสดง PII Masking และ CAL-130 Audit ในระดับ implementation/runtime
                  </p>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                  <h3 className="font-heading font-bold mb-4 flex items-center gap-2 text-primary">
                    <Hash className="w-5 h-5" /> CAL-130 Cryptographic Audit
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <MiniMetric label="Requests 1h" value={String(liveMetrics.requests_1h)} />
                    <MiniMetric label="Requests 24h" value={String(liveMetrics.requests_24h)} />
                    <MiniMetric label="Audit entries" value={String(liveMetrics.total_audit_entries)} />
                    <MiniMetric label="Error rate" value={`${Math.round(liveMetrics.error_rate_1h * 100)}%`} />
                  </div>
                  {requestRows.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">Action</th>
                            <th className="px-4 py-3 text-left font-medium">Requests (1h)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {requestRows.map(([action, count]) => (
                            <tr key={action}>
                              <td className="px-4 py-3 font-medium text-foreground">{action}</td>
                              <td className="px-4 py-3 text-muted-foreground">{count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">ยังไม่มี request ใน audit log ช่วง 1 ชั่วโมงล่าสุด</p>
                  )}

                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-foreground">Recent audit rows</h4>
                      {recentAudit && (
                        <span className={`text-xs font-medium ${recentAudit.chain_valid ? "text-teal" : "text-destructive"}`}>
                          {recentAudit.chain_valid ? "hash chain valid" : `chain broken at ${recentAudit.broken_at}`}
                        </span>
                      )}
                    </div>
                    {recentAudit && recentAudit.entries.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-4 py-3 text-left font-medium">เวลา</th>
                              <th className="px-4 py-3 text-left font-medium">Action</th>
                              <th className="px-4 py-3 text-left font-medium">Query</th>
                              <th className="px-4 py-3 text-left font-medium">Hash</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {recentAudit.entries.map((entry) => (
                              <tr key={entry.id}>
                                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                  {new Date(entry.created_at).toLocaleString("th-TH")}
                                </td>
                                <td className="px-4 py-3 font-medium text-foreground">{entry.action}</td>
                                <td className="px-4 py-3 max-w-[320px] truncate text-muted-foreground">{entry.query_preview || "—"}</td>
                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{entry.entry_hash.slice(0, 12)}...</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">ยังไม่มี audit rows ล่าสุดจาก backend</p>
                    )}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                  <h3 className="font-heading font-bold mb-4 flex items-center gap-2 text-primary">
                    <ShieldCheck className="w-5 h-5" /> Release Guard จาก backend
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <MiniMetric label="Checks" value={String(releaseGuard.total_checks)} />
                    <MiniMetric label="Passed" value={String(releaseGuard.passed)} />
                    <MiniMetric label="Failed" value={String(releaseGuard.failed)} />
                    <MiniMetric label="Required" value={releaseGuard.required_all_passed ? "PASS" : "FAIL"} />
                  </div>
                  <div className="space-y-2">
                    {releaseGuard.checks.map((check) => (
                      <div key={check.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm">
                        <div>
                          <p className="font-medium text-foreground">{check.id}</p>
                          <p className="text-xs text-muted-foreground">{check.check}</p>
                        </div>
                        <span className={check.passed ? "text-teal" : "text-destructive"}>{check.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                  <h3 className="font-heading font-bold mb-2 flex items-center gap-2 text-teal">
                    <Shield className="w-5 h-5" /> PII Masking ตรวจจับและปกปิดข้อมูลส่วนบุคคล
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    เครื่องมือนี้ใช้โมดูล PII ฝั่ง frontend สำหรับทดสอบ pattern masking แบบทันที
                  </p>
                  <textarea
                    value={piiInput}
                    onChange={(event) => setPiiInput(event.target.value)}
                    placeholder="วางข้อความเพื่อทดสอบการปกปิดข้อมูลส่วนบุคคล..."
                    rows={4}
                    className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={runPII}
                    disabled={!piiInput.trim()}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-teal px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <Shield className="w-4 h-4" /> ตรวจสอบและปกปิด
                  </button>

                  {piiResult && (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl bg-teal-light p-4 text-sm whitespace-pre-wrap">{piiResult.masked}</div>
                      {piiResult.spans.length > 0 && (
                        <div className="space-y-2">
                          {piiResult.spans.map((span, index) => (
                            <div key={`${span.type}-${span.start}-${index}`} className="flex items-center gap-3 rounded-lg bg-muted p-3 text-sm">
                              <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                                {PII_TYPE_LABELS[span.type]}
                              </span>
                              <span className="text-muted-foreground line-through">{span.original}</span>
                              <span>→</span>
                              <span className="font-medium text-teal">{span.masked}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
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
      {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
      {value}
    </span>
  </div>
);

const MiniMetric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-muted/30 p-4 text-center">
    <div className="text-lg font-bold text-foreground">{value}</div>
    <div className="text-[11px] text-muted-foreground">{label}</div>
  </div>
);

export default GovernmentDashboard;
