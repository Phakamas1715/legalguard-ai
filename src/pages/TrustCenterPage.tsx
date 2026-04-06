import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Activity,
  BadgeCheck,
  Clock3,
  Database,
  Download,
  Eye,
  FileSearch,
  GitBranch,
  Hash,
  Lock,
  RefreshCw,
  Shield,
  ShieldCheck,
  Trash2,
  Upload,
  Workflow,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { API_BASE } from "@/lib/runtimeConfig";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { memory, type MemoryLayer, type MemoryStats } from "@/lib/layeredMemory";
import {
  clearWorkspace,
  listWorkspaceSummaries,
  type WorkspaceFlow,
  type WorkspaceSummary,
} from "@/lib/flowWorkspace";

interface LiveMetricsPayload {
  requests_1h: number;
  requests_24h: number;
  avg_confidence_1h: number;
  cache_hit_rate_1h: number;
  error_rate_1h: number;
  total_audit_entries: number;
  system_health: Record<string, string>;
  ai_metrics: {
    avg_honesty_score: number;
    hallucination_rate: number;
    pii_leak_count: number;
  };
}

interface ReleaseGuardPayload {
  passed?: boolean;
  release_allowed?: boolean;
  required_all_passed?: boolean;
  checks: Array<{
    id?: string;
    name?: string;
    check?: string;
    detail?: string;
    passed: boolean;
    status?: string;
  }>;
}

interface AuditRow {
  id: string;
  action: string;
  query_preview: string;
  confidence: number | null;
  agent_role: string | null;
  created_at: string;
  result_count?: number;
  entry_hash?: string;
  metadata?: Record<string, unknown>;
}

interface RecentAuditPayload {
  chain_valid: boolean;
  entries: AuditRow[];
}

interface AuditEntryDetail extends AuditRow {
  user_id: string | null;
  query_hash: string;
  prev_hash: string;
  metadata: Record<string, unknown>;
  query_storage: string;
}

interface AuditDetailResponse {
  entry: AuditEntryDetail;
  chain_valid: boolean;
  broken_at: number | null;
}

interface TlagfPayload {
  pillar: string;
  name_th: string;
  score: number;
  status: string;
  details: string;
}

interface IngestionJob {
  job_id: string;
  source_code: string;
  total_documents: number;
  processed_documents: number;
  failed_documents: number;
  total_chunks: number;
  status: string;
  retry_mode?: string | null;
  retry_of?: string | null;
  retried_file_count?: number | null;
}

interface RecentJobsPayload {
  jobs: IngestionJob[];
}

interface RetryChainNode {
  job_id: string;
  created_at?: string | null;
  source_code: string;
  status: string;
  total_documents: number;
  processed_documents: number;
  failed_documents: number;
  total_chunks: number;
  retry_mode?: string | null;
  retry_of?: string | null;
  retried_file_count?: number | null;
  retried_file_paths: string[];
  failed_file_paths: string[];
}

interface RetryChainRoundMetric {
  round: number;
  job_id: string;
  retry_mode?: string | null;
  retried_file_count: number;
  recovered_count: number;
  remaining_failed_count: number;
  recovery_rate: number | null;
  elapsed_seconds_from_root: number | null;
  elapsed_seconds_from_previous: number | null;
  fully_recovered: boolean;
}

interface RetryChainMetrics {
  total_rounds: number;
  retry_rounds: number;
  root_failed_file_count: number;
  current_remaining_failed_count: number;
  total_retried_files: number;
  overall_recovery_rate: number | null;
  recovery_completed: boolean;
  time_to_full_recovery_seconds: number | null;
  rounds: RetryChainRoundMetric[];
}

interface RetryChainResponse {
  selected_job_id: string;
  root_job_id: string;
  nodes: RetryChainNode[];
  metrics: RetryChainMetrics | null;
}

const MOCK_LIVE: LiveMetricsPayload = {
  requests_1h: 12,
  requests_24h: 188,
  avg_confidence_1h: 0.87,
  cache_hit_rate_1h: 0.31,
  error_rate_1h: 0.01,
  total_audit_entries: 256,
  system_health: {
    api: "healthy",
    search_pipeline: "healthy",
    audit: "healthy",
    governance: "healthy",
  },
  ai_metrics: {
    avg_honesty_score: 0.91,
    hallucination_rate: 0.01,
    pii_leak_count: 0,
  },
};

const MOCK_RELEASE: ReleaseGuardPayload = {
  release_allowed: true,
  checks: [
    { name: "PII Masking", detail: "ปกปิดข้อมูลส่วนบุคคลผ่านเกณฑ์", passed: true },
    { name: "Audit Integrity", detail: "hash chain ถูกต้อง", passed: true },
    { name: "Risk Tier Caps", detail: "confidence cap ทำงานครบ", passed: true },
    { name: "Governance Checks", detail: "release guard พร้อมใช้งาน", passed: true },
  ],
};

const MOCK_AUDIT: RecentAuditPayload = {
  chain_valid: true,
  entries: [
    { id: "1", action: "search", query_preview: "ค้นหาคดีฉ้อโกง", confidence: 0.84, agent_role: "researcher", created_at: "ล่าสุด" },
    { id: "2", action: "chat", query_preview: "ถามขั้นตอนการฟ้องคดี", confidence: 0.76, agent_role: "assistant", created_at: "ล่าสุด" },
    { id: "3", action: "complaint_verification", query_preview: "ตรวจคำฟ้องคดีแพ่ง", confidence: 0.91, agent_role: "reviewer", created_at: "ล่าสุด" },
  ],
};

const MOCK_TLAGF: TlagfPayload[] = [
  { pillar: "transparency", name_th: "ความโปร่งใส", score: 0.92, status: "active", details: "แสดงความเชื่อถือและ source traceability" },
  { pillar: "privacy", name_th: "ความเป็นส่วนตัว", score: 0.97, status: "active", details: "PII masking + PDPA-by-default" },
  { pillar: "accountability", name_th: "ความรับผิดชอบ", score: 0.95, status: "active", details: "audit log + release guard" },
];

const WORKSPACE_LABELS: Record<WorkspaceFlow, string> = {
  search: "Search Workspace",
  chat: "Chat Workspace",
  complaint: "Complaint Workspace",
  predict: "Predict Workspace",
};

const MEMORY_LAYER_LABELS: Record<MemoryLayer, string> = {
  working: "L1 Working",
  episodic: "L2 Episodic",
  semantic: "L3 Semantic",
  policy: "L4 Policy",
  persistent: "L5 Persistent",
};

const formatPercent = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(0)}%`;
};

const formatDuration = (seconds: number | null | undefined) => {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const formatTtl = (ttlMs: number | null) => {
  if (ttlMs == null) return "retained";
  if (ttlMs < 60_000) return `${Math.round(ttlMs / 1000)}s`;
  return `${Math.round(ttlMs / 60_000)}m`;
};

const downloadJson = (payload: unknown, filename: string) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const TrustCenterPage = () => {
  const backendStatus = useBackendStatus();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetricsPayload>(MOCK_LIVE);
  const [releaseGuard, setReleaseGuard] = useState<ReleaseGuardPayload>(MOCK_RELEASE);
  const [recentAudit, setRecentAudit] = useState<RecentAuditPayload>(MOCK_AUDIT);
  const [tlagf, setTlagf] = useState<TlagfPayload[]>(MOCK_TLAGF);
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [memoryStats, setMemoryStats] = useState<MemoryStats>(() => memory.getStats());
  const [workspaceSummaries, setWorkspaceSummaries] = useState<WorkspaceSummary[]>(() => listWorkspaceSummaries());
  const [selectedAuditEntryId, setSelectedAuditEntryId] = useState("");
  const [selectedAuditEntry, setSelectedAuditEntry] = useState<AuditEntryDetail | null>(null);
  const [auditDetailLoading, setAuditDetailLoading] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [retryChain, setRetryChain] = useState<RetryChainResponse | null>(null);
  const [retryChainLoading, setRetryChainLoading] = useState(false);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [governanceMessage, setGovernanceMessage] = useState("");
  const retentionPolicy = useMemo(() => memory.getRetentionPolicy(), []);

  const refreshGovernance = useCallback(() => {
    setMemoryStats(memory.getStats());
    setWorkspaceSummaries(listWorkspaceSummaries());
  }, []);

  const loadOverview = useCallback(async () => {
    try {
      const [liveResp, releaseResp, auditResp, tlagfResp, jobsResp] = await Promise.all([
        fetch(`${API_BASE}/dashboard/live`).catch(() => null),
        fetch(`${API_BASE}/responsible-ai/release-guard`).catch(() => null),
        fetch(`${API_BASE}/dashboard/audit/recent?limit=5`).catch(() => null),
        fetch(`${API_BASE}/responsible-ai/tlagf`).catch(() => null),
        fetch(`${API_BASE}/ingest/recent?limit=6`).catch(() => null),
      ]);

      if (liveResp?.ok) setLiveMetrics((await liveResp.json()) as LiveMetricsPayload);
      if (releaseResp?.ok) setReleaseGuard((await releaseResp.json()) as ReleaseGuardPayload);
      if (auditResp?.ok) {
        const payload = (await auditResp.json()) as RecentAuditPayload;
        setRecentAudit(payload);
        setSelectedAuditEntryId((current) => (
          payload.entries.some((entry) => entry.id === current)
            ? current
            : (payload.entries[0]?.id || "")
        ));
      }
      if (tlagfResp?.ok) {
        const payload = await tlagfResp.json();
        const pillars = (payload.pillars ?? payload) as TlagfPayload[];
        if (Array.isArray(pillars) && pillars.length > 0) setTlagf(pillars);
      }
      if (jobsResp?.ok) {
        const payload = (await jobsResp.json()) as RecentJobsPayload;
        setJobs(payload.jobs);
        setSelectedJobId((current) => (
          payload.jobs.some((job) => job.job_id === current)
            ? current
            : (payload.jobs[0]?.job_id || "")
        ));
      }
    } catch {
      // Keep fallback data for resilient trust display.
    } finally {
      refreshGovernance();
    }
  }, [refreshGovernance]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (!selectedAuditEntryId) {
      setSelectedAuditEntry(null);
      return;
    }

    const loadAuditDetail = async () => {
      setAuditDetailLoading(true);
      try {
        const response = await fetch(`${API_BASE}/dashboard/audit/${selectedAuditEntryId}`);
        if (!response.ok) {
          throw new Error(`audit detail ${response.status}`);
        }
        const payload = (await response.json()) as AuditDetailResponse;
        setSelectedAuditEntry(payload.entry);
      } catch {
        setSelectedAuditEntry(null);
      } finally {
        setAuditDetailLoading(false);
      }
    };

    void loadAuditDetail();
  }, [selectedAuditEntryId]);

  useEffect(() => {
    if (!selectedJobId) {
      setRetryChain(null);
      return;
    }

    const loadRetryChain = async () => {
      setRetryChainLoading(true);
      try {
        const response = await fetch(`${API_BASE}/ingest/chain/${selectedJobId}`);
        if (!response.ok) {
          throw new Error(`retry chain ${response.status}`);
        }
        setRetryChain((await response.json()) as RetryChainResponse);
      } catch {
        setRetryChain(null);
      } finally {
        setRetryChainLoading(false);
      }
    };

    void loadRetryChain();
  }, [selectedJobId]);

  const passedChecks = useMemo(
    () => releaseGuard.checks.filter((check) => check.passed).length,
    [releaseGuard.checks],
  );

  const selectedJob = useMemo(
    () => jobs.find((job) => job.job_id === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );

  const handleClearWorkspace = (flow: WorkspaceFlow) => {
    clearWorkspace(flow);
    refreshGovernance();
    setGovernanceMessage(`ล้าง ${WORKSPACE_LABELS[flow]} แล้ว`);
  };

  const handleClearMemoryLayer = (layer: MemoryLayer) => {
    memory.clearLayer(layer);
    refreshGovernance();
    setGovernanceMessage(`ล้าง ${MEMORY_LAYER_LABELS[layer]} แล้ว`);
  };

  const handleClearRuntimeMemory = () => {
    memory.clearRuntimeLayers();
    refreshGovernance();
    setGovernanceMessage("ล้าง runtime memory layers แล้ว");
  };

  const handleExportSnapshot = () => {
    downloadJson(memory.exportSnapshot(), `legalguard-memory-snapshot-${new Date().toISOString()}.json`);
    setGovernanceMessage("ส่งออก memory snapshot แล้ว");
  };

  const handleImportSnapshot = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as unknown;
      memory.importSnapshot(parsed, importMode);
      refreshGovernance();
      setGovernanceMessage(`นำเข้า memory snapshot สำเร็จในโหมด ${importMode}`);
    } catch (error) {
      console.error("memory snapshot import error:", error);
      setGovernanceMessage("ไม่สามารถนำเข้า memory snapshot ได้");
    } finally {
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10">
        <section className="mb-10 rounded-[2rem] border border-border bg-card p-8 shadow-card">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <ShieldCheck className="h-4 w-4" />
                System Trust Center
              </div>
              <h1 className="font-heading text-3xl font-bold text-foreground">ศูนย์รวมความน่าเชื่อถือของระบบ</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                หน้ากลางสำหรับดูสถานะระบบ, audit detail, ingestion lineage, layered memory governance,
                privacy posture และ model governance ของ LegalGuard AI ในมุมที่ทั้งผู้บริหารและทีมเทคนิคใช้ร่วมกันได้จริง
              </p>
            </div>
            <div className={`rounded-2xl border px-5 py-4 ${backendStatus.online ? "border-teal/20 bg-teal-light" : "border-destructive/20 bg-destructive/5"}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Backend Status</p>
              <p className={`mt-1 text-sm font-bold ${backendStatus.online ? "text-teal" : "text-destructive"}`}>
                {backendStatus.online ? `${backendStatus.service} พร้อมใช้งาน` : "Backend ยังไม่ตอบสนอง"}
              </p>
              <button
                type="button"
                onClick={() => void loadOverview()}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TrustMetricCard
            icon={<Activity className="h-4 w-4 text-primary" />}
            title="Operational Readiness"
            value={`${liveMetrics.requests_1h} req / 1h`}
            note={`Error rate ${(liveMetrics.error_rate_1h * 100).toFixed(1)}% · Cache ${(liveMetrics.cache_hit_rate_1h * 100).toFixed(0)}%`}
          />
          <TrustMetricCard
            icon={<Hash className="h-4 w-4 text-teal" />}
            title="Audit Integrity"
            value={recentAudit.chain_valid ? "Chain Valid" : "Needs Review"}
            note={`${liveMetrics.total_audit_entries} audit entries tracked`}
          />
          <TrustMetricCard
            icon={<Database className="h-4 w-4 text-accent-foreground" />}
            title="Layered Memory"
            value={`L1 ${memoryStats.l1Count} · L2 ${memoryStats.l2Count} · L4 ${memoryStats.l4Count} · L5 ${memoryStats.l5Count}`}
            note={`Estimated ${memoryStats.totalTokensEstimate} tokens of retained context`}
          />
          <TrustMetricCard
            icon={<BadgeCheck className="h-4 w-4 text-primary" />}
            title="Governance Guard"
            value={`${passedChecks}/${releaseGuard.checks.length} checks passed`}
            note={`Honesty ${(liveMetrics.ai_metrics.avg_honesty_score * 100).toFixed(0)}% · PII leaks ${liveMetrics.ai_metrics.pii_leak_count}`}
          />
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-5">
          <div className="xl:col-span-3 space-y-6">
            <Panel title="System Health" icon={<Workflow className="h-5 w-5 text-primary" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(liveMetrics.system_health).map(([service, status]) => (
                  <div key={service} className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{service}</p>
                    <p className={`mt-1 text-sm font-bold ${status === "healthy" ? "text-teal" : "text-destructive"}`}>{status}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Recent Audit Signals" icon={<Eye className="h-5 w-5 text-teal" />}>
              <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
                <div className="space-y-3">
                  {recentAudit.entries.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setSelectedAuditEntryId(entry.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        selectedAuditEntryId === entry.id
                          ? "border-primary bg-primary/5"
                          : "border-border bg-muted/20 hover:border-primary/40"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{entry.action}</p>
                        <span className="text-xs text-muted-foreground">{entry.agent_role ?? "system"}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{entry.query_preview}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        confidence {entry.confidence !== null ? `${Math.round(entry.confidence * 100)}%` : "n/a"} · {entry.created_at}
                      </p>
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">Audit Detail</p>
                    {auditDetailLoading && <span className="text-xs text-muted-foreground">กำลังโหลด...</span>}
                  </div>
                  {selectedAuditEntry ? (
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <Link
                          to={`/it?audit=${encodeURIComponent(selectedAuditEntry.id)}`}
                          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Open in IT Dashboard
                        </Link>
                      </div>
                      <InfoRow label="Action" value={selectedAuditEntry.action} />
                      <InfoRow label="Agent Role" value={selectedAuditEntry.agent_role ?? "system"} />
                      <InfoRow label="Query Hash" value={selectedAuditEntry.query_hash} mono />
                      <InfoRow label="Prev Hash" value={selectedAuditEntry.prev_hash || "root"} mono />
                      <InfoRow label="Entry Hash" value={selectedAuditEntry.entry_hash ?? "—"} mono />
                      <InfoRow label="Query Preview" value={selectedAuditEntry.query_preview} />
                      <InfoRow label="Stored Query" value={selectedAuditEntry.query_storage || "—"} />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Metadata</p>
                        <pre className="mt-2 max-h-48 overflow-auto rounded-2xl bg-background p-3 text-xs leading-6 text-muted-foreground">
                          {JSON.stringify(selectedAuditEntry.metadata ?? {}, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">เลือก audit row เพื่อดู detail จริงจาก backend</p>
                  )}
                </div>
              </div>
            </Panel>
          </div>

          <div className="xl:col-span-2 space-y-6">
            <Panel title="Privacy & Governance" icon={<Lock className="h-5 w-5 text-accent-foreground" />}>
              <div className="space-y-3">
                {tlagf.map((pillar) => (
                  <div key={pillar.pillar} className="rounded-2xl border border-border bg-muted/20 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{pillar.name_th}</p>
                      <span className="text-xs font-semibold text-primary">{Math.round(pillar.score * 100)}%</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{pillar.details}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Release Guard" icon={<Shield className="h-5 w-5 text-primary" />}>
              <div className="space-y-3">
                {releaseGuard.checks.map((check, index) => (
                  <div key={`${check.name ?? check.check}-${index}`} className="rounded-2xl border border-border bg-muted/20 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{check.name ?? check.check ?? "guard_check"}</p>
                      <span className={`text-xs font-semibold ${check.passed ? "text-teal" : "text-destructive"}`}>
                        {check.passed ? "passed" : "failed"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{check.detail ?? check.status ?? "พร้อมใช้งาน"}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </section>

        <section className="mb-6">
          <Panel title="Ingestion Lineage" icon={<GitBranch className="h-5 w-5 text-primary" />}>
            <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
              <div className="space-y-3">
                {jobs.length > 0 ? jobs.map((job) => (
                  <button
                    key={job.job_id}
                    type="button"
                    onClick={() => setSelectedJobId(job.job_id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      selectedJobId === job.job_id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-muted/20 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{job.source_code}</p>
                      <span className={`text-xs font-semibold ${job.status === "completed" ? "text-teal" : job.status.includes("error") || job.status === "failed" ? "text-destructive" : "text-primary"}`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {job.job_id} · docs {job.processed_documents}/{job.total_documents} · chunks {job.total_chunks}
                    </p>
                    {(job.retry_mode || job.retry_of) && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {job.retry_mode ?? "retry"} จาก {job.retry_of ?? "unknown"} · files {job.retried_file_count ?? 0}
                      </p>
                    )}
                  </button>
                )) : (
                  <p className="text-sm text-muted-foreground">ยังไม่มี ingestion jobs ให้ตรวจ lineage</p>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">Retry Chain Detail</p>
                  {retryChainLoading && <span className="text-xs text-muted-foreground">กำลังโหลด...</span>}
                </div>
                {selectedJob && retryChain ? (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <Link
                        to={`/it?job=${encodeURIComponent(selectedJob.job_id)}`}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary"
                      >
                        <GitBranch className="h-3.5 w-3.5" />
                        Open in IT Dashboard
                      </Link>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SummaryMiniCard label="Selected Job" value={selectedJob.job_id} mono />
                      <SummaryMiniCard label="Root Job" value={retryChain.root_job_id} mono />
                      <SummaryMiniCard label="Recovery Rate" value={formatPercent(retryChain.metrics?.overall_recovery_rate)} />
                      <SummaryMiniCard label="Time to Recover" value={formatDuration(retryChain.metrics?.time_to_full_recovery_seconds)} />
                    </div>

                    <div className="space-y-2">
                      {retryChain.nodes.map((node, index) => (
                        <div key={node.job_id} className="rounded-2xl border border-border bg-background px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-foreground">
                              รอบ {index} · {node.retry_mode ?? "root"}
                            </p>
                            <span className={`text-xs font-semibold ${node.status === "completed" ? "text-teal" : node.status.includes("error") || node.status === "failed" ? "text-destructive" : "text-primary"}`}>
                              {node.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{node.job_id}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            docs {node.processed_documents}/{node.total_documents} · failed {node.failed_documents} · chunks {node.total_chunks}
                          </p>
                          {node.created_at && (
                            <p className="mt-1 text-xs text-muted-foreground">created {node.created_at}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {retryChain.metrics?.rounds?.length ? (
                      <div className="rounded-2xl border border-border bg-background p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Per-round recovery</p>
                        <div className="mt-3 space-y-2">
                          {retryChain.metrics.rounds.map((round) => (
                            <div key={round.job_id} className="flex items-center justify-between gap-4 text-sm">
                              <span className="text-foreground">Round {round.round}</span>
                              <span className="text-muted-foreground">
                                recover {round.recovered_count}/{round.retried_file_count} · remain {round.remaining_failed_count} · {formatPercent(round.recovery_rate)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">เลือก ingestion job เพื่อดู lineage จริงจาก backend</p>
                )}
              </div>
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-5">
          <div className="xl:col-span-3 space-y-6">
            <Panel title="Memory Governance" icon={<Database className="h-5 w-5 text-primary" />}>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportSnapshot}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
                >
                  <Download className="h-4 w-4" />
                  Export Snapshot
                </button>
                <select
                  value={importMode}
                  onChange={(event) => setImportMode(event.target.value as "merge" | "replace")}
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground"
                >
                  <option value="merge">Import Mode: merge</option>
                  <option value="replace">Import Mode: replace</option>
                </select>
                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
                >
                  <Upload className="h-4 w-4" />
                  Import Snapshot
                </button>
                <button
                  type="button"
                  onClick={handleClearRuntimeMemory}
                  className="inline-flex items-center gap-2 rounded-full border border-destructive/20 bg-destructive/5 px-4 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Runtime Memory
                </button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={handleImportSnapshot}
                />
              </div>

              {governanceMessage ? (
                <div className="mb-4 rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  {governanceMessage}
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                {retentionPolicy.map((rule) => (
                  <div key={rule.layer} className="rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{MEMORY_LAYER_LABELS[rule.layer]}</p>
                      <span className="text-xs text-muted-foreground">{rule.storageKey}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      limit {rule.limit} entries · TTL {formatTtl(rule.ttlMs)}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleClearMemoryLayer(rule.layer)}
                      disabled={rule.layer === "policy"}
                      className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {rule.layer === "policy" ? "Protected" : "Clear Layer"}
                    </button>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="xl:col-span-2 space-y-6">
            <Panel title="Workspace Governance" icon={<FileSearch className="h-5 w-5 text-teal" />}>
              <div className="space-y-3">
                {workspaceSummaries.map((workspace) => (
                  <div key={workspace.flow} className="rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{WORKSPACE_LABELS[workspace.flow]}</p>
                      <span className="text-xs text-muted-foreground">{workspace.sizeBytes} bytes</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {workspace.exists ? "workspace persisted" : "no saved workspace"}
                    </p>
                    <p className="mt-2 rounded-xl bg-background px-3 py-2 text-xs leading-6 text-muted-foreground">
                      {workspace.preview}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleClearWorkspace(workspace.flow)}
                      disabled={!workspace.exists}
                      className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Clear Flow Workspace
                    </button>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Governance Snapshot" icon={<Clock3 className="h-5 w-5 text-accent-foreground" />}>
              <div className="space-y-3">
                <SummaryMiniCard label="Memory Tokens" value={`${memoryStats.totalTokensEstimate}`} />
                <SummaryMiniCard label="Evictions" value={`${memoryStats.evictionsTotal}`} />
                <SummaryMiniCard label="Audit Chain" value={recentAudit.chain_valid ? "valid" : "review"} />
                <SummaryMiniCard label="Lineage Selected" value={selectedJobId || "—"} mono />
              </div>
            </Panel>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

const Panel = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) => (
  <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
    <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
      {icon}
      {title}
    </div>
    {children}
  </motion.section>
);

const TrustMetricCard = ({
  icon,
  title,
  value,
  note,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  note: string;
}) => (
  <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-card">
    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {icon}
      {title}
    </div>
    <p className="text-lg font-bold text-foreground">{value}</p>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">{note}</p>
  </div>
);

const InfoRow = ({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    <p className={`mt-1 break-all text-sm text-foreground ${mono ? "font-mono" : ""}`}>{value}</p>
  </div>
);

const SummaryMiniCard = ({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) => (
  <div className="rounded-2xl border border-border bg-muted/20 px-4 py-3">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    <p className={`mt-1 text-sm font-bold text-foreground ${mono ? "break-all font-mono text-xs" : ""}`}>{value}</p>
  </div>
);

export default TrustCenterPage;
