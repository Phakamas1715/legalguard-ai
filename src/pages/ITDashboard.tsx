import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PartnerBar from "@/components/PartnerBar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Shield, Database, BarChart3, Hash, ShieldCheck, AlertTriangle,
  CheckCircle2, Cpu, Server, Activity, Terminal, Network, Layers, Lock, RefreshCw, Pin, Trash2, Pencil
} from "lucide-react";
import { maskPII, type PIISpan } from "@/lib/piiMasking";
import itBg from "@/assets/it-bg.jpg";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { API_BASE } from "@/lib/runtimeConfig";
const AUDIT_SELECTION_STORAGE_KEY = "lg-it-audit-selection";
const AUDIT_SAVED_SETS_STORAGE_KEY = "lg-it-audit-saved-sets";

interface LiveMetrics {
  timestamp: string;
  requests_1h: number;
  requests_24h: number;
  requests_by_action_1h: Record<string, number>;
  avg_confidence_1h: number;
  cache_hit_rate_1h: number;
  error_rate_1h: number;
  system_health: Record<string, string>;
  ai_metrics: { avg_honesty_score: number; hallucination_rate: number; pii_leak_count: number };
}

interface AuditRow {
  id: string;
  action: string;
  query_preview: string;
  entry_hash: string;
  created_at: string;
  confidence: number | null;
  result_count: number;
  agent_role?: string | null;
  metadata?: Record<string, unknown>;
}

interface RecentAuditResponse {
  entries: AuditRow[];
  chain_valid: boolean;
  broken_at: number | null;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface AuditEntryDetail extends AuditRow {
  user_id: string | null;
  query_hash: string;
  agent_role: string | null;
  prev_hash: string;
  metadata: Record<string, unknown>;
  query_storage: string;
}

interface AuditDetailResponse {
  entry: AuditEntryDetail;
  chain_valid: boolean;
  broken_at: number | null;
}

interface IngestionJob {
  job_id: string;
  source_code: string;
  total_documents: number;
  processed_documents: number;
  failed_documents: number;
  total_chunks: number;
  error_log: Array<Record<string, unknown>>;
  status: string;
  retry_available: boolean;
  retry_reason: string | null;
  retry_failed_available: boolean;
  retry_failed_reason: string | null;
  retry_mode?: string | null;
  retry_of?: string | null;
  retried_file_count?: number | null;
  retried_file_paths?: string[];
}

interface RecentJobsResponse {
  jobs: IngestionJob[];
}

interface RetryJobResponse {
  job_id: string;
  retry_mode?: string | null;
  retry_of?: string | null;
  retried_file_count?: number | null;
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

interface SavedAuditSet {
  id: string;
  name: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  rows: AuditRow[];
}

const toAuditRowMap = (rows: AuditRow[]) => (
  rows.reduce<Record<string, AuditRow>>((accumulator, row) => {
    accumulator[row.id] = row;
    return accumulator;
  }, {})
);

const mergeAuditRowsById = (...rowGroups: AuditRow[][]) => (
  Object.values(rowGroups.reduce<Record<string, AuditRow>>((accumulator, rows) => {
    for (const row of rows) {
      accumulator[row.id] = row;
    }
    return accumulator;
  }, {}))
);

const formatDuration = (seconds: number | null | undefined) => {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const formatPercent = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(0)}%`;
};

const sanitizeFilenameBase = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "saved";
  return trimmed.replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
};

const ITDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [chainValid, setChainValid] = useState<boolean | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditRow[]>([]);
  const [selectedAuditRows, setSelectedAuditRows] = useState<Record<string, AuditRow>>({});
  const [savedAuditSets, setSavedAuditSets] = useState<SavedAuditSet[]>([]);
  const [auditSetName, setAuditSetName] = useState("");
  const [renamingSavedSetId, setRenamingSavedSetId] = useState("");
  const [renamingSavedSetName, setRenamingSavedSetName] = useState("");
  const [recoveryChartMode, setRecoveryChartMode] = useState<"percent" | "files">("percent");
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize] = useState(10);
  const [selectedAuditEntryId, setSelectedAuditEntryId] = useState("");
  const [selectedAuditEntry, setSelectedAuditEntry] = useState<AuditEntryDetail | null>(null);
  const [auditDetailLoading, setAuditDetailLoading] = useState(false);
  const [auditFilterAction, setAuditFilterAction] = useState("all");
  const [auditFilterAgentRole, setAuditFilterAgentRole] = useState("");
  const [auditFilterCaseType, setAuditFilterCaseType] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [piiInput, setPiiInput] = useState("");
  const [piiResult, setPiiResult] = useState<{ masked: string; spans: PIISpan[]; piiCount: number } | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null);
  const [liveError, setLiveError] = useState("");
  const [adminError, setAdminError] = useState("");
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedJob, setSelectedJob] = useState<IngestionJob | null>(null);
  const [retryChain, setRetryChain] = useState<RetryChainResponse | null>(null);
  const [retryChainLoading, setRetryChainLoading] = useState(false);
  const [adminRefreshTick, setAdminRefreshTick] = useState(0);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobDetailLoading, setJobDetailLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryFailedLoading, setRetryFailedLoading] = useState(false);
  const [confirmRetryFailedOpen, setConfirmRetryFailedOpen] = useState(false);
  const [auditExportScope, setAuditExportScope] = useState<"current_page" | "all_filtered">("all_filtered");
  const [jobFilterSource, setJobFilterSource] = useState("all");
  const [jobFilterStatus, setJobFilterStatus] = useState("all");
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const requestedAuditId = searchParams.get("audit") ?? "";
  const requestedJobId = searchParams.get("job") ?? "";

  useEffect(() => {
    const actions = ["POST /api/v1/search/hybrid", "GET /api/v1/cases", "POST /api/v1/rag/predict", "GET /api/v1/auth/verify", "POST /api/v1/pii/mask"];
    const statuses = ["200 OK", "201 Created", "200 OK", "304 Not Modified"];
    const interval = setInterval(() => {
      setSimLogs(prev => {
        const action = actions[Math.floor(Math.random() * actions.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const time = new Date().toLocaleTimeString("en-GB", { hour12: false });
        const latency = Math.floor(Math.random() * (250 - 45) + 45);
        const newLog = `[${time}] ${action} - ${status} (${latency}ms)`;
        return [newLog, ...prev].slice(0, 5);
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AUDIT_SELECTION_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, AuditRow>;
      if (parsed && typeof parsed === "object") {
        setSelectedAuditRows(parsed);
      }
    } catch (error) {
      console.error("IT audit selection restore error:", error);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AUDIT_SAVED_SETS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedAuditSet[];
      if (Array.isArray(parsed)) {
        setSavedAuditSets(parsed.filter((entry) => (
          entry
          && typeof entry === "object"
          && typeof entry.id === "string"
          && typeof entry.name === "string"
          && Array.isArray(entry.rows)
        )));
      }
    } catch (error) {
      console.error("IT audit saved sets restore error:", error);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(AUDIT_SELECTION_STORAGE_KEY, JSON.stringify(selectedAuditRows));
    } catch (error) {
      console.error("IT audit selection persist error:", error);
    }
  }, [selectedAuditRows]);

  useEffect(() => {
    try {
      window.localStorage.setItem(AUDIT_SAVED_SETS_STORAGE_KEY, JSON.stringify(savedAuditSets));
    } catch (error) {
      console.error("IT audit saved sets persist error:", error);
    }
  }, [savedAuditSets]);

  useEffect(() => {
    if (!requestedAuditId) return;
    setSelectedAuditEntryId(requestedAuditId);
  }, [requestedAuditId]);

  useEffect(() => {
    if (!requestedJobId) return;
    setSelectedJobId(requestedJobId);
  }, [requestedJobId]);

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
        const data = (await response.json()) as AuditDetailResponse;
        setSelectedAuditEntry(data.entry);
      } catch (error) {
        console.error("IT audit detail error:", error);
        setSelectedAuditEntry(null);
      } finally {
        setAuditDetailLoading(false);
      }
    };

    void loadAuditDetail();
  }, [selectedAuditEntryId]);

  useEffect(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (selectedAuditEntryId) {
        next.set("audit", selectedAuditEntryId);
      } else {
        next.delete("audit");
      }
      return next;
    }, { replace: true });
  }, [selectedAuditEntryId, setSearchParams]);

  useEffect(() => {
    const fetchLive = async () => {
      try {
        const resp = await fetch(`${API_BASE}/dashboard/live`);
        if (resp.ok) {
          setLiveMetrics(await resp.json());
          setLiveError("");
        } else {
          throw new Error("Backend not OK");
        }
      } catch (err) {
        setLiveError("Working in Simulation Mode (Backend Offline)");
        // Elegant Fallback for Demo Clarity
        setLiveMetrics({
          timestamp: new Date().toISOString(),
          requests_1h: 124,
          requests_24h: 2840,
          requests_by_action_1h: { "search": 45, "predict": 22 },
          avg_confidence_1h: 0.94,
          cache_hit_rate_1h: 0.96,
          error_rate_1h: 0.01,
          system_health: { "eks": "Healthy", "bedrock": "Active", "rds": "Nominal" },
          ai_metrics: { avg_honesty_score: 0.88, hallucination_rate: 0.005, pii_leak_count: 0 }
        });
      }
    };
    fetchLive();
    const interval = setInterval(fetchLive, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadAdminData = async () => {
      setJobsLoading(true);
      try {
        const auditParams = new URLSearchParams({
          limit: String(auditPageSize),
          page: String(auditPage),
          page_size: String(auditPageSize),
        });
        if (auditFilterAction !== "all") auditParams.set("action", auditFilterAction);
        if (auditFilterAgentRole.trim()) auditParams.set("agent_role", auditFilterAgentRole.trim());
        if (auditFilterCaseType.trim()) auditParams.set("case_type", auditFilterCaseType.trim());
        if (auditSearch.trim()) auditParams.set("q", auditSearch.trim());
        const [auditResp, jobsResp] = await Promise.all([
          fetch(`${API_BASE}/dashboard/audit/recent?${auditParams.toString()}`),
          fetch(`${API_BASE}/ingest/recent?limit=20`),
        ]);
        if (!auditResp.ok || !jobsResp.ok) {
          throw new Error("admin backend not available");
        }
        const auditData = (await auditResp.json()) as RecentAuditResponse;
        const jobsData = (await jobsResp.json()) as RecentJobsResponse;
        setAuditEntries(auditData.entries);
        setAuditTotal(auditData.total);
        setChainValid(auditData.chain_valid);
        setJobs(jobsData.jobs);
        setSelectedJobId((prev) => (
          jobsData.jobs.some((job) => job.job_id === prev)
            ? prev
            : (jobsData.jobs[0]?.job_id ?? "")
        ));
        setAdminError("");
      } catch (error) {
        console.error("IT admin data error:", error);
        setAdminError("ไม่สามารถดึง audit rows หรือ ingestion jobs จาก backend ได้");
        setAuditEntries([]);
        setAuditTotal(0);
        setChainValid(null);
        setJobs([]);
        setSelectedJobId("");
      } finally {
        setJobsLoading(false);
      }
    };

    void loadAdminData();
    const interval = setInterval(() => void loadAdminData(), 30000);
    return () => clearInterval(interval);
  }, [adminRefreshTick, auditFilterAction, auditFilterAgentRole, auditFilterCaseType, auditPage, auditPageSize, auditSearch]);

  useEffect(() => {
    setAuditPage(1);
  }, [auditFilterAction, auditFilterAgentRole, auditFilterCaseType, auditSearch]);

  useEffect(() => {
    if (!selectedJobId) {
      setSelectedJob(null);
      setRetryChain(null);
      return;
    }

    const loadJobDetail = async () => {
      setJobDetailLoading(true);
      try {
        const response = await fetch(`${API_BASE}/ingest/status/${selectedJobId}`);
        if (!response.ok) {
          throw new Error(`status ${response.status}`);
        }
        const data = (await response.json()) as IngestionJob;
        setSelectedJob(data);
      } catch (error) {
        console.error("IT job detail error:", error);
        setSelectedJob(null);
      } finally {
        setJobDetailLoading(false);
      }
    };

    void loadJobDetail();
  }, [adminRefreshTick, selectedJobId]);

  useEffect(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (selectedJobId) {
        next.set("job", selectedJobId);
      } else {
        next.delete("job");
      }
      return next;
    }, { replace: true });
  }, [selectedJobId, setSearchParams]);

  useEffect(() => {
    if (!selectedJob) {
      setRetryChain(null);
      return;
    }

    const loadRetryChain = async () => {
      setRetryChainLoading(true);
      try {
        const response = await fetch(`${API_BASE}/ingest/chain/${selectedJob.job_id}`);
        if (!response.ok) {
          throw new Error(`chain status ${response.status}`);
        }
        const data = (await response.json()) as RetryChainResponse;
        setRetryChain(data);
      } catch (error) {
        console.error("IT retry chain error:", error);
        setRetryChain(null);
      } finally {
        setRetryChainLoading(false);
      }
    };

    void loadRetryChain();
  }, [selectedJob]);

  const runPII = () => { if (piiInput.trim()) setPiiResult(maskPII(piiInput)); };

  const filteredJobs = useMemo(() => (
    jobs.filter((job) => {
      const sourceMatch = jobFilterSource === "all" || job.source_code === jobFilterSource;
      const statusMatch = jobFilterStatus === "all" || job.status === jobFilterStatus;
      return sourceMatch && statusMatch;
    })
  ), [jobFilterSource, jobFilterStatus, jobs]);

  const uniqueSources = useMemo(
    () => Array.from(new Set(jobs.map((job) => job.source_code))).sort(),
    [jobs],
  );

  const failedFilePaths = useMemo(() => {
    if (!selectedJob) return [];
    return Array.from(new Set(
      selectedJob.error_log
        .map((entry) => entry["file_path"])
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ));
  }, [selectedJob]);

  const comparisonSummary = useMemo(() => {
    if (!selectedJob || !retryChain) return null;

    const retryNode = retryChain.nodes.find((node) => node.job_id === selectedJob.job_id && node.retry_of);
    if (!retryNode) return null;
    const originalNode = retryChain.nodes.find((node) => node.job_id === retryNode.retry_of);
    if (!originalNode) return null;

    const retriedPaths = Array.from(new Set(retryNode.retried_file_paths ?? []));
    if (retriedPaths.length === 0) return null;

    const retryFailedSet = new Set(retryNode.failed_file_paths);
    const recovered = retriedPaths.filter((path) => !retryFailedSet.has(path));
    const stillFailing = retriedPaths.filter((path) => retryFailedSet.has(path));

    return {
      originalJob: originalNode,
      retryJob: retryNode,
      recovered,
      stillFailing,
      retriedPaths,
    };
  }, [retryChain, selectedJob]);

  const auditTotalPages = Math.max(1, Math.ceil(auditTotal / auditPageSize));
  const selectedAuditCount = Object.keys(selectedAuditRows).length;
  const currentPageSelectedCount = auditEntries.filter((entry) => selectedAuditRows[entry.id]).length;
  const allCurrentPageSelected = auditEntries.length > 0 && currentPageSelectedCount === auditEntries.length;
  const sortedSavedAuditSets = useMemo(() => (
    [...savedAuditSets].sort((left, right) => {
      if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
      return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
    })
  ), [savedAuditSets]);

  const buildUniqueSavedSetName = (baseName: string, excludeSetId?: string) => {
    const normalizedExistingNames = new Set(
      savedAuditSets
        .filter((entry) => entry.id !== excludeSetId)
        .map((entry) => entry.name.trim().toLowerCase()),
    );

    let candidate = baseName.trim() || "Saved Set";
    let suffix = 2;
    while (normalizedExistingNames.has(candidate.toLowerCase())) {
      candidate = `${baseName.trim() || "Saved Set"} ${suffix}`;
      suffix += 1;
    }
    return candidate;
  };

  const saveSelectedAuditsAsSet = (pinned: boolean) => {
    const selectedRows = Object.values(selectedAuditRows);
    if (selectedRows.length === 0) return;

    const generatedName = `${pinned ? "Pinned" : "Saved"} ${new Date().toLocaleString("sv-SE").replaceAll(":", "-").replace(" ", "-")}`;
    const name = auditSetName.trim() || generatedName;
    const now = new Date().toISOString();

    setSavedAuditSets((current) => {
      const existing = current.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        return current.map((entry) => (
          entry.id === existing.id
            ? {
                ...entry,
                rows: selectedRows,
                pinned: entry.pinned || pinned,
                updated_at: now,
              }
            : entry
        ));
      }

      return [
        ...current,
        {
          id: globalThis.crypto?.randomUUID?.() ?? `audit-set-${Date.now()}`,
          name,
          pinned,
          created_at: now,
          updated_at: now,
          rows: selectedRows,
        },
      ];
    });
    setAuditSetName("");
  };

  const exportAuditRows = (rows: AuditRow[], format: "json" | "csv", filenameBase: string) => {
    if (rows.length === 0) return;

    let blob: Blob;
    if (format === "json") {
      blob = new Blob([JSON.stringify({ entries: rows, total: rows.length }, null, 2)], {
        type: "application/json;charset=utf-8",
      });
    } else {
      const header = ["id", "created_at", "action", "agent_role", "query_preview", "result_count", "confidence", "entry_hash", "case_type"];
      const lines = rows.map((row) => {
        const cells = [
          row.id,
          row.created_at,
          row.action,
          row.agent_role ?? "",
          row.query_preview ?? "",
          String(row.result_count),
          row.confidence == null ? "" : String(row.confidence),
          row.entry_hash,
          String(row.metadata?.["case_type"] ?? ""),
        ];
        return cells.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",");
      });
      blob = new Blob([[header.join(","), ...lines].join("\n")], {
        type: "text/csv;charset=utf-8",
      });
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${filenameBase}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const loadSavedAuditSet = (savedSet: SavedAuditSet) => {
    setSelectedAuditRows(toAuditRowMap(savedSet.rows));
  };

  const duplicateSavedAuditSet = (savedSet: SavedAuditSet) => {
    const now = new Date().toISOString();
    const duplicateName = buildUniqueSavedSetName(`${savedSet.name} copy`);

    setSavedAuditSets((current) => [
      ...current,
      {
        ...savedSet,
        id: globalThis.crypto?.randomUUID?.() ?? `audit-set-${Date.now()}`,
        name: duplicateName,
        pinned: false,
        created_at: now,
        updated_at: now,
        rows: [...savedSet.rows],
      },
    ]);
  };

  const mergeSelectedRowsIntoSavedSet = (savedSetId: string) => {
    const selectedRows = Object.values(selectedAuditRows);
    if (selectedRows.length === 0) return;

    setSavedAuditSets((current) => current.map((entry) => (
      entry.id === savedSetId
        ? {
            ...entry,
            rows: mergeAuditRowsById(entry.rows, selectedRows),
            updated_at: new Date().toISOString(),
          }
        : entry
    )));
  };

  const startRenamingSavedSet = (savedSet: SavedAuditSet) => {
    setRenamingSavedSetId(savedSet.id);
    setRenamingSavedSetName(savedSet.name);
  };

  const commitSavedSetRename = () => {
    const nextName = renamingSavedSetName.trim();
    if (!renamingSavedSetId || !nextName) {
      setRenamingSavedSetId("");
      setRenamingSavedSetName("");
      return;
    }
    const uniqueName = buildUniqueSavedSetName(nextName, renamingSavedSetId);

    setSavedAuditSets((current) => current.map((entry) => (
      entry.id === renamingSavedSetId
        ? {
            ...entry,
            name: uniqueName,
            updated_at: new Date().toISOString(),
          }
        : entry
    )));
    setRenamingSavedSetId("");
    setRenamingSavedSetName("");
  };

  const cancelSavedSetRename = () => {
    setRenamingSavedSetId("");
    setRenamingSavedSetName("");
  };

  const toggleSavedAuditSetPin = (savedSetId: string) => {
    setSavedAuditSets((current) => current.map((entry) => (
      entry.id === savedSetId
        ? {
            ...entry,
            pinned: !entry.pinned,
            updated_at: new Date().toISOString(),
          }
        : entry
    )));
  };

  const deleteSavedAuditSet = (savedSetId: string) => {
    setSavedAuditSets((current) => current.filter((entry) => entry.id !== savedSetId));
  };

  const exportErrorLogJson = () => {
    if (!selectedJob || selectedJob.error_log.length === 0) return;
    const blob = new Blob([JSON.stringify(selectedJob.error_log, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ingestion-errors-${selectedJob.job_id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportAuditEntries = async (
    format: "json" | "csv",
    scope: "current_page" | "all_filtered",
  ) => {
    try {
      const params = new URLSearchParams({
        format,
        scope,
        page: String(auditPage),
        page_size: String(auditPageSize),
      });
      if (auditFilterAction !== "all") params.set("action", auditFilterAction);
      if (auditFilterAgentRole.trim()) params.set("agent_role", auditFilterAgentRole.trim());
      if (auditFilterCaseType.trim()) params.set("case_type", auditFilterCaseType.trim());
      if (auditSearch.trim()) params.set("q", auditSearch.trim());

      const response = await fetch(`${API_BASE}/dashboard/audit/export?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`audit export ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `audit-export-${scope}.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("audit export error:", error);
      setAdminError("ไม่สามารถ export audit list ตาม filter ปัจจุบันได้");
    }
  };

  const exportSelectedAuditRows = (format: "json" | "csv") => {
    const selectedRows = Object.values(selectedAuditRows);
    exportAuditRows(selectedRows, format, "audit-selected");
  };

  const exportErrorLogCsv = () => {
    if (!selectedJob || selectedJob.error_log.length === 0) return;
    const rows = selectedJob.error_log.map((entry) => {
      const normalized = Object.entries(entry).map(([key, value]) => `${key}=${String(value ?? "")}`).join(" | ");
      return `"${normalized.replaceAll('"', '""')}"`;
    });
    const csv = ["error_log", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ingestion-errors-${selectedJob.job_id}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const retrySelectedJob = async () => {
    if (!selectedJob || !selectedJob.retry_available || retryLoading) return;
    setRetryLoading(true);
    try {
      const response = await fetch(`${API_BASE}/ingest/retry/${selectedJob.job_id}`, { method: "POST" });
      if (!response.ok) {
        throw new Error(`retry ${response.status}`);
      }
      const result = (await response.json()) as RetryJobResponse;
      setSelectedJobId(result.job_id);
      setAdminRefreshTick((value) => value + 1);
      setAdminError("");
    } catch (error) {
      console.error("retry job error:", error);
      setAdminError("ไม่สามารถ retry job นี้จาก backend ได้");
    } finally {
      setRetryLoading(false);
    }
  };

  const retryFailedItems = async () => {
    if (!selectedJob || !selectedJob.retry_failed_available || retryFailedLoading) return;
    setRetryFailedLoading(true);
    try {
      const response = await fetch(`${API_BASE}/ingest/retry-failed/${selectedJob.job_id}`, { method: "POST" });
      if (!response.ok) {
        throw new Error(`retry failed ${response.status}`);
      }
      const result = (await response.json()) as RetryJobResponse;
      setSelectedJobId(result.job_id);
      setAdminRefreshTick((value) => value + 1);
      setConfirmRetryFailedOpen(false);
      setAdminError("");
    } catch (error) {
      console.error("retry failed items error:", error);
      setAdminError("ไม่สามารถ retry เฉพาะเอกสารที่ล้มเหลวได้");
    } finally {
      setRetryFailedLoading(false);
    }
  };

  const refreshAdminData = () => {
    setAdminRefreshTick((value) => value + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <div className="relative overflow-hidden pt-16 pb-16 mb-12">
        {/* Modern IT Background with improved visibility */}
        <div className="absolute inset-0 z-0">
          <img
            src={itBg}
            alt="IT Infrastructure"
            className="w-full h-full object-cover opacity-50 contrast-110 saturate-125"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-navy-deep/80 via-navy-deep/60 to-background/90"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-8 max-w-5xl">
            <div className="w-24 h-24 rounded-[2rem] bg-gold/10 border-2 border-gold/40 backdrop-blur-xl flex items-center justify-center shadow-2xl shadow-gold/10 group hover:border-gold transition-all duration-500">
              <Server className="w-12 h-12 text-gold group-hover:scale-110 transition-transform drop-shadow-[0_0_15px_rgba(255,183,0,0.5)]" />
            </div>
            <div className="text-center md:text-left">
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1 bg-gold text-white border border-gold rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 shadow-gold"
              >
                System Administrator Console
              </motion.div>
              <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="font-heading text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                ระบบ IT / <span className="text-gold">ผู้ดูแลระบบ</span>
              </motion.h1>
              <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="text-white font-medium text-base md:text-lg max-w-2xl leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                ศูนย์ควบคุมโครงสร้างพื้นฐานเทคโนโลยีระดับชาติ ประสิทธิภาพ และความปลอดภัยระดับสูงสุด
              </motion.p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-8 flex-1">

        <div className="space-y-6 max-w-5xl">
          {/* Live Command Center */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Live Terminal */}
            <div className="md:col-span-2 bg-[#0B1120] text-white border border-[#1E293B] rounded-2xl p-6 shadow-card relative overflow-hidden">
              <div className="absolute -top-4 -right-4 p-4 opacity-5"><Terminal className="w-32 h-32" /></div>
              <div className="flex items-center justify-between mb-5 relative z-10">
                <h3 className="font-heading font-bold text-lg flex items-center gap-2"><Terminal className="w-5 h-5 text-gold" /> Live System Monitor</h3>
                <div className="flex items-center gap-2 text-xs bg-[#00ff00]/10 border border-[#00ff00]/20 px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-[#00ff00] animate-pulse"></span>
                  <span className="text-[#00ff00] font-mono tracking-widest">
                    {liveError ? "SIMULATION MODE" : "SYSTEMS NOMINAL"}
                  </span>
                </div>
              </div>
              {liveError && (
                <div className="mb-4 rounded-xl border border-gold/20 bg-gold/10 px-4 py-3 text-xs text-gold">
                  {liveError}
                </div>
              )}

              {/* Metrics Mini-cards */}
              <div className="grid grid-cols-3 gap-4 mb-5 relative z-10">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-colors">
                  <div className="text-xs text-white/50 mb-1 flex items-center gap-1"><Cpu className="w-3 h-3" /> CPU Load</div>
                  <div className="text-2xl font-mono text-white flex items-end gap-1">
                    {liveMetrics ? liveMetrics.requests_1h * 0.05 : Math.floor(Math.random() * 5 + 35)}<span className="text-sm text-white/50 mb-1">%</span>
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-colors">
                  <div className="text-xs text-white/50 mb-1 flex items-center gap-1"><Database className="w-3 h-3" /> Memory Usage</div>
                  <div className="text-2xl font-mono text-white flex items-end gap-1">
                    4.2<span className="text-sm text-white/50 mb-1">GB / 16GB</span>
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-colors">
                  <div className="text-xs text-white/50 mb-1 flex items-center gap-1"><Activity className="w-3 h-3" /> Cache Hit Rate</div>
                  <div className="text-2xl font-mono text-teal flex items-end gap-1">
                    {liveMetrics ? (liveMetrics.cache_hit_rate_1h * 100).toFixed(1) : "94.2"}<span className="text-sm text-teal/50 mb-1">%</span>
                  </div>
                </div>
              </div>

              {/* Terminal Output */}
              <div className="bg-black/80 rounded-xl p-4 font-mono text-xs text-[#00ff22] h-[140px] overflow-hidden border border-white/20 shadow-inner">
                {simLogs.length === 0 && <span className="text-white/40 italic">Waiting for secure connection...</span>}
                {simLogs.map((log, i) => (
                  <motion.div key={log + i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mb-2 truncate flex items-center gap-2">
                    <span className="text-gold/60 font-bold">»</span> <span className="text-white font-medium">{log}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Node Status */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card flex flex-col">
              <h3 className="font-heading font-bold mb-5 flex items-center gap-2"><Network className="w-5 h-5 text-primary" /> Cloud Infrastructure (AWS EKS Cluster)</h3>
              <div className="flex-1 flex flex-col justify-between gap-3">
                {[
                  { name: "AWS EKS Cluster (ap-southeast-1)", status: "Active", ping: "8ms", load: "bg-teal" },
                  { name: "Amazon RDS (Multi-AZ Master)", status: "Steady", ping: "2ms", load: "bg-teal" },
                  { name: "Amazon S3 (Objects Service)", status: "Nominal", ping: "45ms", load: "bg-teal" },
                  { name: "AWS WAF & CloudFront", status: "Protecting", ping: "1ms", load: "bg-teal" },
                  { name: "Amazon Bedrock (LLM Gateway)", status: "Integrated", ping: "242ms", load: "bg-gold" },
                ].map((node, i) => (
                  <motion.div key={node.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted border border-border hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${node.load} shadow-[0_0_8px_rgba(0,0,0,0.2)] animate-pulse`}></span>
                      <div>
                        <div className="text-xs font-bold leading-none mb-1">{node.name}</div>
                        <div className="text-[10px] text-muted-foreground">{node.status}</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono bg-background px-2 py-1 rounded-md border border-border">{node.ping}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* 7-Layer Legal Safety Pipeline — High-Impact Professional Version */}
          <div className="relative border border-[#1E293B] rounded-[3rem] p-10 shadow-2xl overflow-hidden group min-h-[500px]">
            {/* National Professional IT Background */}
            <div className="absolute inset-0 z-0">
              <img
                src={itBg}
                alt="High-Tech Pipeline Background"
                className="w-full h-full object-cover opacity-70 contrast-125 saturate-150"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-navy-deep/95 via-navy-deep/80 to-[#0B1120]/90 backdrop-blur-[1px]"></div>
            </div>

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
                <div>
                  <h3 className="font-heading font-black text-3xl text-white flex items-center gap-3 drop-shadow-xl">
                    <Shield className="w-8 h-8 text-gold" /> ระบบคัดกรองความปลอดภัย 7 ชั้น (7-Layer Safety Pipeline)
                  </h3>
                  <p className="text-white font-bold text-sm mt-2 opacity-90 drop-shadow-md">สถาปัตยกรรมป้องกันข้อมูลระดับชาติ ออกแบบโดย Honest Predictor Enterprise</p>
                </div>
                <div className="flex items-center gap-3 px-6 py-3 bg-gold/20 border-2 border-gold/40 rounded-2xl backdrop-blur-xl shadow-2xl">
                  <Lock className="w-5 h-5 text-gold" />
                  <span className="text-xs font-black text-gold tracking-[0.2em] uppercase">Certified Security Layer</span>
                </div>
              </div>

              {/* Dynamic Connector Path for 7 steps */}
              <div className="hidden lg:block absolute top-[55px] left-[5%] right-[5%] h-[2px] bg-gradient-to-r from-blue-500 via-gold to-teal opacity-40">
                <motion.div
                  animate={{ x: ["0%", "100%"] }}
                  transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
                  className="w-60 h-full bg-white shadow-[0_0_30px_#fff] blur-[1px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
                {[
                  { step: "STEP 01", title: "PII Sanitization", desc: "ดักจับและปกปิดข้อมูลส่วนตัว (PDPA) ทันทีที่รับข้อมูล", icon: Shield, color: "text-blue-400", bg: "bg-blue-400/20" },
                  { step: "STEP 02", title: "Intent Routing", desc: "วิเคราะห์เจตนาและส่งไปยัง AI Agent เฉพาะทางกฎหมาย", icon: Terminal, color: "text-blue-300", bg: "bg-blue-300/20" },
                  { step: "STEP 03", title: "Hybrid Retrieval", desc: "สืบค้นกฎหมาย 160k+ ฉบับด้วย Semantic & Keyword", icon: Database, color: "text-gold", bg: "bg-gold/20" },
                  { step: "STEP 04", title: "Context Filter", desc: "คัดกรองเฉพาะเนื้อหาที่เกี่ยวข้องและถูกต้องแม่นยำที่สุด", icon: Layers, color: "text-orange-400", bg: "bg-orange-400/20" },
                  { step: "STEP 05", title: "AI Guardrails", desc: "AWS Bedrock ตรวจสอบระเบียบวินัย ความลำเอียง และพิษของคำ", icon: ShieldCheck, color: "text-teal", bg: "bg-teal/20" },
                  { step: "STEP 06", title: "Halluc. Audit", desc: "ตรวจสอบการมโน และระบุมาตราอ้างอิงจริง 100%", icon: CheckCircle2, color: "text-purple-400", bg: "bg-purple-400/20" },
                  { step: "STEP 07", title: "Crypto Log", desc: "ประทับตรา Hash ลง Audit Log ป้องกันการแก้ไขย้อนหลัง", icon: Hash, color: "text-red-400", bg: "bg-red-400/20" }
                ].map((step, i) => (
                  <motion.div key={step.title} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                    className="flex flex-col items-center text-center relative p-2">
                    <div className={`w-16 h-16 rounded-[1.5rem] ${step.bg} border-2 border-white/20 flex items-center justify-center mb-4 shadow-2xl backdrop-blur-xl hover:scale-110 transition-transform`}>
                      <step.icon className={`w-8 h-8 ${step.color} drop-shadow-[0_0_10px_currentColor]`} />
                      <div className={`absolute -top-1 -right-1 px-2 py-1 rounded-lg bg-black/60 border border-white/20 text-[9px] font-black tracking-widest ${step.color}`}>{step.step}</div>
                    </div>
                    <h4 className="text-white font-black text-[11px] mb-2 tracking-tighter uppercase drop-shadow-md">{step.title}</h4>
                    <p className="text-white font-bold text-[10px] leading-relaxed drop-shadow-lg">{step.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Pipeline Status Indicator with High Contrast */}
            <div className="mt-12 flex items-center justify-center gap-8 py-5 bg-black/40 backdrop-blur-3xl rounded-[2rem] border border-white/10 shadow-2xl relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-[#00ff22] animate-pulse shadow-[0_0_15px_#00ff22]"></div>
                <span className="text-xs text-[#00ff22] font-black tracking-[0.2em] uppercase">E2E Encryption Active</span>
              </div>
              <div className="w-px h-6 bg-white/20"></div>
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-gold" />
                <span className="text-xs text-white font-black tracking-[0.2em] uppercase">System Integrity: 99.99%</span>
              </div>
            </div>
          </div>

          {/* Technical Stats */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="font-heading font-bold mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Performance Metrics (เป้าหมาย)</h3>
              <p className="text-xs text-muted-foreground mb-3">ค่าด้านล่างเป็นเป้าหมายจาก design doc — ค่าจริงจะวัดเมื่อ ingest ข้อมูลครบ</p>
              <div className="space-y-3">
                {[
                  { label: "Hit@3 Accuracy", value: "93.7%" },
                  { label: "P95 Latency", value: "689ms" },
                  { label: "Hallucination Rate", value: "< 1%" },
                  { label: "PII Recall", value: "99.2%" },
                  { label: "CFS Fairness", value: "93.5%" },
                  { label: "Honesty Score", value: "≥ 0.85" },
                  { label: "Hybrid Search Ratio", value: "Semantic + Keyword Focus" },
                  { label: "Reranking Engine", value: "Advanced Safety Models" },
                ].map(m => (
                  <div key={m.label} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="font-medium font-mono">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="font-heading font-bold mb-4 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-teal" /> CFS Fairness Monitoring (เป้าหมาย)</h3>
              <p className="text-xs text-muted-foreground mb-3">ค่าจริงจะคำนวณจาก search results — ใช้ POST /dashboard/fairness</p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-teal-light rounded-xl text-center"><div className="text-lg font-bold text-teal">93.5%</div><div className="text-[11px] text-muted-foreground">CFS</div></div>
                <div className="p-3 bg-gold-light rounded-xl text-center"><div className="text-lg font-bold text-accent-foreground">0.85</div><div className="text-[11px] text-muted-foreground">H-Score</div></div>
                <div className="p-3 bg-secondary rounded-xl text-center"><div className="text-lg font-bold text-primary">&lt;1%</div><div className="text-[11px] text-muted-foreground">Halluc.</div></div>
              </div>
              <div className="space-y-2">
                {[{ label: "F_geo (ภูมิศาสตร์)", value: 92, color: "bg-teal" }, { label: "F_court (ประเภทศาล)", value: 88, color: "bg-primary" }, { label: "F_time (ช่วงเวลา)", value: 95, color: "bg-accent" }].map(b => (
                  <div key={b.label} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-36">{b.label}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full ${b.color} rounded-full`} style={{ width: `${b.value}%` }} /></div>
                    <span className="text-xs font-bold w-10 text-right">{b.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* LLM Providers */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <h3 className="font-heading font-bold mb-4 flex items-center gap-2"><Cpu className="w-5 h-5 text-primary" /> Infrastructure Persistence & AWS Cloud Management</h3>
            <div className="flex flex-wrap gap-3">
              {["AWS EKS (Kubernetes)", "Amazon RDS (PostgreSQL)", "Amazon S3 (Data Lake)", "Amazon Bedrock (LLM)", "AWS Lambda (Async PII)"].map((p, i) => (
                <div key={p} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm">
                  <span className="text-xs font-bold text-primary">{i + 1}</span>
                  <span>{p}</span>
                  {i < 4 && <span className="text-muted-foreground">→</span>}
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-teal/5 border border-teal/10 rounded-xl">
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-teal flex-shrink-0" />
                ระบบทำงานบน AWS Cloud (Region: ap-southeast-1) พร้อมระบบ High Availability และ Auto-Scaling เพื่อรองรับการใช้งานระดับประเทศ
              </p>
            </div>
          </div>

          {/* Audit Log */}
          <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold flex items-center gap-2"><Hash className="w-5 h-5 text-primary" /> Secure Auditing Log</h3>
                <p className="mt-1 text-xs text-muted-foreground">filter/search ตาม action, agent role, case type และคำค้นจาก query preview</p>
              </div>
              <div className="text-right">
                <span className="block text-xs text-muted-foreground font-mono">Cryptographic Verification | {chainValid === null ? "..." : chainValid ? "✅ Valid" : "❌ Broken"}</span>
                <span className="mt-1 block text-xs text-muted-foreground">ทั้งหมด {auditTotal} รายการ</span>
              </div>
            </div>
            <div className="grid gap-3 border-b border-border bg-muted/20 p-5 md:grid-cols-4">
              <select
                value={auditFilterAction}
                onChange={(event) => setAuditFilterAction(event.target.value)}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
              >
                <option value="all">ทุก action</option>
                <option value="search">search</option>
                <option value="chat">chat</option>
                <option value="judgment_draft">judgment_draft</option>
                <option value="complaint_verification">complaint_verification</option>
                <option value="stt">stt</option>
              </select>
              <input
                value={auditFilterAgentRole}
                onChange={(event) => setAuditFilterAgentRole(event.target.value)}
                placeholder="agent_role"
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
              />
              <input
                value={auditFilterCaseType}
                onChange={(event) => setAuditFilterCaseType(event.target.value)}
                placeholder="metadata.case_type"
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
              />
              <div className="flex gap-2">
                <input
                  value={auditSearch}
                  onChange={(event) => setAuditSearch(event.target.value)}
                  placeholder="ค้นหา query preview"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                />
                <button
                  type="button"
                  onClick={() => {
                    setAuditFilterAction("all");
                    setAuditFilterAgentRole("");
                    setAuditFilterCaseType("");
                    setAuditSearch("");
                  }}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
                >
                  ล้าง
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-5 py-3">
              <p className="text-xs text-muted-foreground">
                หน้า {auditPage} / {auditTotalPages}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={auditExportScope}
                  onChange={(event) => setAuditExportScope(event.target.value as "current_page" | "all_filtered")}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"
                >
                  <option value="all_filtered">export all filtered</option>
                  <option value="current_page">export current page</option>
                </select>
                <button
                  type="button"
                  onClick={() => void exportAuditEntries("json", auditExportScope)}
                  disabled={auditTotal === 0}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                >
                  export JSON
                </button>
                <button
                  type="button"
                  onClick={() => void exportAuditEntries("csv", auditExportScope)}
                  disabled={auditTotal === 0}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                >
                  export CSV
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/10 px-5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (allCurrentPageSelected) {
                      setSelectedAuditRows((current) => {
                        const next = { ...current };
                        for (const entry of auditEntries) {
                          delete next[entry.id];
                        }
                        return next;
                      });
                    } else {
                      setSelectedAuditRows((current) => {
                        const next = { ...current };
                        for (const entry of auditEntries) {
                          next[entry.id] = entry;
                        }
                        return next;
                      });
                    }
                  }}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
                >
                  {allCurrentPageSelected ? "ยกเลิกเลือกหน้านี้" : "เลือกทั้งหน้า"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAuditRows({})}
                  disabled={selectedAuditCount === 0}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                >
                  ล้างที่เลือก
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  selected {selectedAuditCount} rows
                </span>
                <button
                  type="button"
                  onClick={() => exportSelectedAuditRows("json")}
                  disabled={selectedAuditCount === 0}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                >
                  export selected JSON
                </button>
                <button
                  type="button"
                  onClick={() => exportSelectedAuditRows("csv")}
                  disabled={selectedAuditCount === 0}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                >
                  export selected CSV
                </button>
              </div>
            </div>
            <div className="border-b border-border bg-card px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={auditSetName}
                  onChange={(event) => setAuditSetName(event.target.value)}
                  placeholder="ตั้งชื่อ saved set หรือ pinned set"
                  className="min-w-[220px] flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                />
                <button
                  type="button"
                  onClick={() => saveSelectedAuditsAsSet(false)}
                  disabled={selectedAuditCount === 0}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                >
                  save named set
                </button>
                <button
                  type="button"
                  onClick={() => saveSelectedAuditsAsSet(true)}
                  disabled={selectedAuditCount === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                >
                  <Pin className="h-3.5 w-3.5" />
                  pin selection
                </button>
              </div>

              {sortedSavedAuditSets.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">ยังไม่มี saved audit sets</p>
              ) : (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {sortedSavedAuditSets.map((savedSet) => (
                    <div key={savedSet.id} className="rounded-xl border border-border bg-muted/10 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          {renamingSavedSetId === savedSet.id ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                value={renamingSavedSetName}
                                onChange={(event) => setRenamingSavedSetName(event.target.value)}
                                className="min-w-[180px] rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                              />
                              <button
                                type="button"
                                onClick={commitSavedSetRename}
                                className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
                              >
                                บันทึกชื่อ
                              </button>
                              <button
                                type="button"
                                onClick={cancelSavedSetRename}
                                className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
                              >
                                ยกเลิก
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium text-foreground">{savedSet.name}</p>
                              {savedSet.pinned && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                  <Pin className="h-3 w-3" />
                                  pinned
                                </span>
                              )}
                            </div>
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {savedSet.rows.length} rows • อัปเดต {new Date(savedSet.updated_at).toLocaleString("th-TH")}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleSavedAuditSetPin(savedSet.id)}
                          className="rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
                        >
                          {savedSet.pinned ? "unpin" : "pin"}
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => loadSavedAuditSet(savedSet)}
                          className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
                        >
                          load selection
                        </button>
                        <button
                          type="button"
                          onClick={() => startRenamingSavedSet(savedSet)}
                          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          rename
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateSavedAuditSet(savedSet)}
                          className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
                        >
                          duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => mergeSelectedRowsIntoSavedSet(savedSet.id)}
                          disabled={selectedAuditCount === 0}
                          className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                        >
                          merge selected
                        </button>
                        <button
                          type="button"
                          onClick={() => exportAuditRows(savedSet.rows, "json", `audit-set-${sanitizeFilenameBase(savedSet.name)}`)}
                          className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
                        >
                          export JSON
                        </button>
                        <button
                          type="button"
                          onClick={() => exportAuditRows(savedSet.rows, "csv", `audit-set-${sanitizeFilenameBase(savedSet.name)}`)}
                          className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
                        >
                          export CSV
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSavedAuditSet(savedSet.id)}
                          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {auditEntries.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">ยังไม่มี audit entry</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted"><tr><th className="px-4 py-3 text-left font-medium">เลือก</th><th className="px-4 py-3 text-left font-medium">เวลา</th><th className="px-4 py-3 text-left font-medium">Action</th><th className="px-4 py-3 text-left font-medium">Query</th><th className="px-4 py-3 text-left font-medium">Hash</th><th className="px-4 py-3 text-right font-medium">Detail</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {auditEntries.map(e => (
                      <tr key={e.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={Boolean(selectedAuditRows[e.id])}
                            onChange={(event) => {
                              setSelectedAuditRows((current) => {
                                const next = { ...current };
                                if (event.target.checked) {
                                  next[e.id] = e;
                                } else {
                                  delete next[e.id];
                                }
                                return next;
                              });
                            }}
                            className="h-4 w-4 rounded border-border"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{new Date(e.created_at).toLocaleString("th-TH")}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">{e.action}</span></td>
                        <td className="px-4 py-3 max-w-[200px] truncate">{e.query_preview || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{e.entry_hash.slice(0, 12)}…</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedAuditEntryId(e.id)}
                            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                          >
                            ดูรายละเอียด
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border bg-muted/10 px-5 py-3">
              <p className="text-xs text-muted-foreground">
                แสดง {auditEntries.length} รายการในหน้านี้
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAuditPage((page) => Math.max(1, page - 1))}
                  disabled={auditPage <= 1}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                >
                  ก่อนหน้า
                </button>
                <button
                  type="button"
                  onClick={() => setAuditPage((page) => Math.min(auditTotalPages, page + 1))}
                  disabled={auditPage >= auditTotalPages}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          </div>

          {/* Ingestion Job Explorer */}
          <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" /> Ingestion Job Explorer
                </h3>
                <p className="text-xs text-muted-foreground mt-1">ดูสถานะราย job และ error log เต็มจาก backend</p>
              </div>
              <button
                type="button"
                onClick={refreshAdminData}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-xs font-medium text-foreground hover:bg-accent"
              >
                <RefreshCw className="w-4 h-4" /> รีเฟรชข้อมูล
              </button>
            </div>

            {adminError && (
              <div className="mx-5 mt-5 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                {adminError}
              </div>
            )}

            <div className="grid lg:grid-cols-[360px_minmax(0,1fr)] gap-0">
              <div className="border-r border-border">
                <div className="p-4 border-b border-border bg-muted/30">
                  <h4 className="font-medium text-foreground">Recent Jobs</h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    แสดง {filteredJobs.length} จาก {jobs.length} jobs
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <select
                      value={jobFilterSource}
                      onChange={(event) => setJobFilterSource(event.target.value)}
                      className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"
                    >
                      <option value="all">ทุก source</option>
                      {uniqueSources.map((source) => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                    </select>
                    <select
                      value={jobFilterStatus}
                      onChange={(event) => setJobFilterStatus(event.target.value)}
                      className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"
                    >
                      <option value="all">ทุกสถานะ</option>
                      <option value="in_progress">in_progress</option>
                      <option value="completed">completed</option>
                      <option value="completed_with_errors">completed_with_errors</option>
                      <option value="failed">failed</option>
                    </select>
                  </div>
                </div>
                {jobsLoading ? (
                  <div className="p-6 text-sm text-muted-foreground">กำลังโหลดรายการ jobs...</div>
                ) : filteredJobs.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">ยังไม่มี ingestion jobs จาก backend</div>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto">
                    {filteredJobs.map((job) => (
                      <button
                        key={job.job_id}
                        type="button"
                        onClick={() => setSelectedJobId(job.job_id)}
                        className={`w-full text-left p-4 border-b border-border transition-colors ${
                          selectedJobId === job.job_id ? "bg-primary/5" : "hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <span className="font-mono text-xs text-muted-foreground">{job.job_id.slice(0, 8)}...</span>
                          <span className={`text-[11px] font-medium ${
                            job.status === "completed" ? "text-teal" :
                            job.status === "in_progress" ? "text-primary" :
                            "text-destructive"
                          }`}>
                            {job.status}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground">{job.source_code}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {job.processed_documents}/{job.total_documents} docs • {job.total_chunks} chunks
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {job.retry_reason ?? (job.retry_available ? "retry ได้" : "ยัง retry ไม่ได้")}
                        </p>
                        {job.retry_failed_reason && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {job.retry_failed_reason}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-5">
                {!selectedJobId ? (
                  <div className="text-sm text-muted-foreground">เลือก ingestion job ทางซ้ายเพื่อดูรายละเอียด</div>
                ) : jobDetailLoading ? (
                  <div className="text-sm text-muted-foreground">กำลังโหลดรายละเอียด job...</div>
                ) : !selectedJob ? (
                  <div className="text-sm text-muted-foreground">ไม่พบรายละเอียด job นี้จาก backend</div>
                ) : (
                  <div className="space-y-5">
                    <div className="grid md:grid-cols-4 gap-3">
                      <Stat icon={Database} value={selectedJob.source_code} label="Source" color="text-primary" />
                      <Stat icon={Activity} value={`${selectedJob.processed_documents}/${selectedJob.total_documents}`} label="Documents" color="text-teal" />
                      <Stat icon={Hash} value={String(selectedJob.total_chunks)} label="Chunks" color="text-accent-foreground" />
                      <Stat icon={selectedJob.failed_documents > 0 ? AlertTriangle : CheckCircle2} value={selectedJob.status} label="Status" color={selectedJob.failed_documents > 0 ? "text-destructive" : "text-teal"} />
                    </div>

                    <div className="rounded-2xl border border-border bg-muted/20 p-4">
                      <p className="text-xs text-muted-foreground mb-2">Job ID</p>
                      <p className="font-mono text-sm text-foreground break-all">{selectedJob.job_id}</p>
                    </div>

                    {selectedJob.retry_mode && selectedJob.retry_of && (
                      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                        <p className="text-xs text-muted-foreground mb-2">Retry Summary</p>
                        <p className="text-sm text-foreground">
                          job นี้ถูกสร้างจาก <span className="font-mono">{selectedJob.retry_of}</span>
                          {" "}ผ่านโหมด{" "}
                          <span className="font-medium">
                            {selectedJob.retry_mode === "failed_only" ? "retry failed items" : "retry เต็มทั้ง job"}
                          </span>
                          {typeof selectedJob.retried_file_count === "number" ? (
                            <> และมีทั้งหมด <span className="font-medium">{selectedJob.retried_file_count}</span> ไฟล์</>
                          ) : null}
                        </p>
                      </div>
                    )}

                    {retryChainLoading ? (
                      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                        กำลังโหลด retry chain...
                      </div>
                    ) : (
                      <>
                        {retryChain?.metrics && retryChain.metrics.retry_rounds > 0 ? (
                          <div className="rounded-2xl border border-border bg-card overflow-hidden">
                            <div className="border-b border-border bg-muted/30 px-4 py-3">
                              <h4 className="font-medium text-foreground">Retry Chain Metrics</h4>
                            </div>
                            <div className="grid gap-3 p-4 md:grid-cols-4">
                              <div className="rounded-xl border border-border bg-muted/20 p-4">
                                <p className="text-xs text-muted-foreground">Retry Rounds</p>
                                <p className="mt-2 text-2xl font-bold text-foreground">{retryChain.metrics.retry_rounds}</p>
                              </div>
                              <div className="rounded-xl border border-border bg-muted/20 p-4">
                                <p className="text-xs text-muted-foreground">Overall Recovery</p>
                                <p className="mt-2 text-2xl font-bold text-teal">{formatPercent(retryChain.metrics.overall_recovery_rate)}</p>
                              </div>
                              <div className="rounded-xl border border-border bg-muted/20 p-4">
                                <p className="text-xs text-muted-foreground">Remaining Failed Files</p>
                                <p className="mt-2 text-2xl font-bold text-foreground">{retryChain.metrics.current_remaining_failed_count}</p>
                              </div>
                              <div className="rounded-xl border border-border bg-muted/20 p-4">
                                <p className="text-xs text-muted-foreground">Time To Recovery</p>
                                <p className="mt-2 text-2xl font-bold text-foreground">{formatDuration(retryChain.metrics.time_to_full_recovery_seconds)}</p>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  {retryChain.metrics.recovery_completed ? "recover ครบแล้ว" : "ยังมีไฟล์ที่ต้อง retry ต่อ"}
                                </p>
                              </div>
                            </div>
                            <div className="border-t border-border p-4">
                              <h5 className="text-sm font-medium text-foreground">Per-Round Recovery Rate</h5>
                              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                {retryChain.metrics.rounds.map((round) => (
                                  <div key={round.job_id} className="rounded-xl border border-border bg-muted/10 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-sm font-medium text-foreground">
                                        Round {round.round}
                                      </p>
                                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                        round.fully_recovered ? "bg-teal/10 text-teal" : "bg-gold/10 text-accent-foreground"
                                      }`}>
                                        {formatPercent(round.recovery_rate)}
                                      </span>
                                    </div>
                                    <p className="mt-2 text-xs text-muted-foreground">
                                      retry {round.retried_file_count} ไฟล์ • recover {round.recovered_count} • ยังเหลือ {round.remaining_failed_count}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      จากรอบก่อนหน้า {formatDuration(round.elapsed_seconds_from_previous)} • รวม {formatDuration(round.elapsed_seconds_from_root)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="border-t border-border p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <h5 className="text-sm font-medium text-foreground">Recovery Trend Chart</h5>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    แนวโน้มการ recover ต่อรอบจาก retry chain ที่เลือกอยู่
                                  </p>
                                </div>
                                <div className="inline-flex rounded-lg border border-border bg-card p-1">
                                  <button
                                    type="button"
                                    onClick={() => setRecoveryChartMode("percent")}
                                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                      recoveryChartMode === "percent"
                                        ? "bg-primary text-primary-foreground"
                                        : "text-foreground hover:bg-muted"
                                    }`}
                                  >
                                    เปอร์เซ็นต์
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRecoveryChartMode("files")}
                                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                      recoveryChartMode === "files"
                                        ? "bg-primary text-primary-foreground"
                                        : "text-foreground hover:bg-muted"
                                    }`}
                                  >
                                    จำนวนไฟล์
                                  </button>
                                </div>
                              </div>
                              <div className="mt-4 rounded-xl border border-border bg-muted/10 p-3">
                                <ChartContainer
                                  config={recoveryChartMode === "percent"
                                    ? {
                                        recovery_rate: {
                                          label: "Recovery Rate",
                                          color: "hsl(var(--chart-2))",
                                        },
                                        remaining_failure_rate: {
                                          label: "Remaining Failure Rate",
                                          color: "hsl(var(--destructive))",
                                        },
                                      }
                                    : {
                                        recovered_count: {
                                          label: "Recovered Files",
                                          color: "hsl(var(--chart-2))",
                                        },
                                        remaining_failed: {
                                          label: "Remaining Failed",
                                          color: "hsl(var(--destructive))",
                                        },
                                      }}
                                  className="h-[280px] w-full"
                                >
                                  <LineChart
                                    data={retryChain.metrics.rounds.map((round) => ({
                                      round: `R${round.round}`,
                                      recovery_rate: round.recovery_rate == null ? 0 : Number((round.recovery_rate * 100).toFixed(2)),
                                      remaining_failure_rate: round.retried_file_count > 0
                                        ? Number(((round.remaining_failed_count / round.retried_file_count) * 100).toFixed(2))
                                        : 0,
                                      recovered_count: round.recovered_count,
                                      remaining_failed: round.remaining_failed_count,
                                    }))}
                                    margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
                                  >
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                      dataKey="round"
                                      tickLine={false}
                                      axisLine={false}
                                    />
                                    <YAxis
                                      yAxisId="left"
                                      domain={recoveryChartMode === "percent" ? [0, 100] : ["auto", "auto"]}
                                      tickLine={false}
                                      axisLine={false}
                                      allowDecimals={recoveryChartMode === "files"}
                                      tickFormatter={(value) => (
                                        recoveryChartMode === "percent" ? `${value}%` : String(value)
                                      )}
                                    />
                                    <YAxis
                                      yAxisId="right"
                                      orientation="right"
                                      allowDecimals={false}
                                      tickLine={false}
                                      axisLine={false}
                                    />
                                    <ChartTooltip
                                      content={(
                                        <ChartTooltipContent
                                          formatter={(value, name) => {
                                            if (recoveryChartMode === "percent" && name === "recovery_rate") {
                                              return (
                                                <div className="flex min-w-[9rem] items-center justify-between gap-3">
                                                  <span className="text-muted-foreground">Recovery Rate</span>
                                                  <span className="font-medium text-foreground">{String(value)}%</span>
                                                </div>
                                              );
                                            }
                                            if (recoveryChartMode === "percent" && name === "remaining_failure_rate") {
                                              return (
                                                <div className="flex min-w-[9rem] items-center justify-between gap-3">
                                                  <span className="text-muted-foreground">Remaining Failure Rate</span>
                                                  <span className="font-medium text-foreground">{String(value)}%</span>
                                                </div>
                                              );
                                            }
                                            if (recoveryChartMode === "files" && name === "recovered_count") {
                                              return (
                                                <div className="flex min-w-[9rem] items-center justify-between gap-3">
                                                  <span className="text-muted-foreground">Recovered Files</span>
                                                  <span className="font-medium text-foreground">{String(value)}</span>
                                                </div>
                                              );
                                            }
                                            return (
                                              <div className="flex min-w-[9rem] items-center justify-between gap-3">
                                                <span className="text-muted-foreground">Remaining Failed</span>
                                                <span className="font-medium text-foreground">{String(value)}</span>
                                              </div>
                                            );
                                          }}
                                        />
                                      )}
                                    />
                                    <Line
                                      yAxisId="left"
                                      type="monotone"
                                      dataKey={recoveryChartMode === "percent" ? "recovery_rate" : "recovered_count"}
                                      stroke={recoveryChartMode === "percent" ? "var(--color-recovery_rate)" : "var(--color-recovered_count)"}
                                      strokeWidth={3}
                                      dot={{ r: 4 }}
                                      activeDot={{ r: 6 }}
                                    />
                                    <Line
                                      yAxisId="right"
                                      type="monotone"
                                      dataKey={recoveryChartMode === "percent" ? "remaining_failure_rate" : "remaining_failed"}
                                      stroke={recoveryChartMode === "percent" ? "var(--color-remaining_failure_rate)" : "var(--color-remaining_failed)"}
                                      strokeWidth={2}
                                      dot={{ r: 3 }}
                                      strokeDasharray="6 4"
                                    />
                                  </LineChart>
                                </ChartContainer>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        {retryChain && retryChain.nodes.length > 1 ? (
                          <div className="rounded-2xl border border-border bg-card overflow-hidden">
                            <div className="border-b border-border bg-muted/30 px-4 py-3">
                              <h4 className="font-medium text-foreground">Retry Chain Timeline</h4>
                            </div>
                            <div className="space-y-3 p-4">
                              {retryChain.nodes.map((node, index) => (
                                <div key={node.job_id} className="flex gap-3">
                                  <div className="flex flex-col items-center pt-1">
                                    <div className={`h-3 w-3 rounded-full ${node.job_id === selectedJob.job_id ? "bg-primary" : "bg-muted-foreground/40"}`}></div>
                                    {index < retryChain.nodes.length - 1 && <div className="mt-2 h-full min-h-8 w-px bg-border"></div>}
                                  </div>
                                  <div className={`flex-1 rounded-xl border p-4 ${node.job_id === selectedJob.job_id ? "border-primary/30 bg-primary/5" : "border-border bg-muted/10"}`}>
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="font-mono text-sm break-all text-foreground">{node.job_id}</p>
                                      <span className="text-xs text-muted-foreground">{node.status}</span>
                                    </div>
                                    {node.created_at && (
                                      <p className="mt-2 text-xs text-muted-foreground">
                                        created {new Date(node.created_at).toLocaleString("th-TH")}
                                      </p>
                                    )}
                                    <p className="mt-2 text-xs text-muted-foreground">
                                      {node.retry_of
                                        ? `retry จาก ${node.retry_of} ด้วยโหมด ${node.retry_mode ?? "unknown"}`
                                        : "original job"}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      processed {node.processed_documents}/{node.total_documents} docs • failed {node.failed_documents}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {comparisonSummary ? (
                          <div className="rounded-2xl border border-border bg-card overflow-hidden">
                            <div className="border-b border-border bg-muted/30 px-4 py-3">
                              <h4 className="font-medium text-foreground">Retry Compare View</h4>
                            </div>
                            <div className="grid gap-3 p-4 md:grid-cols-2">
                              <div className="rounded-xl border border-border bg-muted/20 p-4">
                                <p className="text-xs text-muted-foreground mb-1">Original Job</p>
                                <p className="font-mono text-sm break-all text-foreground">{comparisonSummary.originalJob.job_id}</p>
                                <p className="mt-2 text-xs text-muted-foreground">
                                  failed เดิม {comparisonSummary.originalJob.failed_documents} ไฟล์
                                </p>
                              </div>
                              <div className="rounded-xl border border-border bg-muted/20 p-4">
                                <p className="text-xs text-muted-foreground mb-1">Retry Job</p>
                                <p className="font-mono text-sm break-all text-foreground">{comparisonSummary.retryJob.job_id}</p>
                                <p className="mt-2 text-xs text-muted-foreground">
                                  retry {comparisonSummary.retriedPaths.length} ไฟล์
                                </p>
                              </div>
                              <div className="rounded-xl border border-teal/20 bg-teal/5 p-4">
                                <p className="text-xs text-muted-foreground mb-2">Recovered Successfully</p>
                                {comparisonSummary.recovered.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">ยังไม่มีไฟล์ที่ recover สำเร็จ</p>
                                ) : (
                                  <div className="space-y-2">
                                    {comparisonSummary.recovered.map((filePath) => (
                                      <p key={filePath} className="font-mono text-xs break-all text-foreground">{filePath}</p>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                                <p className="text-xs text-muted-foreground mb-2">Still Failing</p>
                                {comparisonSummary.stillFailing.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">ไม่มีไฟล์ที่ยัง fail หลัง retry</p>
                                ) : (
                                  <div className="space-y-2">
                                    {comparisonSummary.stillFailing.map((filePath) => (
                                      <p key={filePath} className="font-mono text-xs break-all text-foreground">{filePath}</p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={retrySelectedJob}
                        disabled={!selectedJob.retry_available || retryLoading}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-navy-deep disabled:opacity-50"
                      >
                        {retryLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        retry job
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRetryFailedOpen(true)}
                        disabled={!selectedJob.retry_failed_available || retryFailedLoading}
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                      >
                        {retryFailedLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                        retry failed items
                      </button>
                      <button
                        type="button"
                        onClick={exportErrorLogJson}
                        disabled={selectedJob.error_log.length === 0}
                        className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                      >
                        export JSON
                      </button>
                      <button
                        type="button"
                        onClick={exportErrorLogCsv}
                        disabled={selectedJob.error_log.length === 0}
                        className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                      >
                        export CSV
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedJob.retry_reason ?? "ไม่มีข้อมูลเหตุผลสำหรับ retry"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedJob.retry_failed_reason ?? "ไม่มีข้อมูลเหตุผลสำหรับ retry failed items"}
                    </p>

                    <div className="rounded-2xl border border-border bg-card overflow-hidden">
                      <div className="px-4 py-3 border-b border-border bg-muted/30">
                        <h4 className="font-medium text-foreground">Failed Files Preview</h4>
                      </div>
                      {failedFilePaths.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground">job นี้ไม่มีรายชื่อไฟล์ที่ล้มเหลวแบบระบุไฟล์</div>
                      ) : (
                        <div className="max-h-[180px] divide-y divide-border overflow-auto">
                          {failedFilePaths.map((filePath) => (
                            <div key={filePath} className="px-4 py-3 text-sm text-foreground">
                              <p className="font-mono break-all">{filePath}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-border bg-card overflow-hidden">
                      <div className="px-4 py-3 border-b border-border bg-muted/30">
                        <h4 className="font-medium text-foreground">Error Log</h4>
                      </div>
                      {selectedJob.error_log.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground">job นี้ไม่มี error log</div>
                      ) : (
                        <div className="divide-y divide-border">
                          {selectedJob.error_log.map((entry, index) => (
                            <pre key={index} className="p-4 text-xs whitespace-pre-wrap text-foreground font-mono bg-card overflow-x-auto">
                              {JSON.stringify(entry, null, 2)}
                            </pre>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PII Masking */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <h3 className="font-heading font-bold mb-2 flex items-center gap-2"><Shield className="w-5 h-5 text-teal" /> Privacy Protection (PDPA) Test</h3>
            <textarea value={piiInput} onChange={e => setPiiInput(e.target.value)}
              placeholder="วางข้อความเพื่อทดสอบระบบเซ็นเซอร์ข้อมูลส่วนบุคคล..." rows={3}
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y" />
            <button onClick={runPII} disabled={!piiInput.trim()} className="mt-3 flex items-center gap-2 bg-teal text-white px-6 py-2.5 rounded-xl font-medium hover:opacity-90 disabled:opacity-50">
              <Shield className="w-4 h-4" /> ทดสอบ
            </button>
            {piiResult && (
              <div className="mt-4 bg-teal-light rounded-xl p-4 text-sm whitespace-pre-wrap">{piiResult.masked}
                {piiResult.spans.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {piiResult.spans.map((s, i) => (
                      <div key={i} className="text-xs"><span className="text-destructive line-through">{s.original}</span> → <span className="text-teal font-medium">{s.masked}</span></div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <Dialog open={Boolean(selectedAuditEntryId)} onOpenChange={(open) => {
        if (!open) {
          setSelectedAuditEntryId("");
        }
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Audit Entry Detail</DialogTitle>
            <DialogDescription>
              ดู query metadata, hash chain และรายละเอียดผลลัพธ์จาก backend โดยตรง
            </DialogDescription>
          </DialogHeader>

          {auditDetailLoading ? (
            <div className="py-8 text-sm text-muted-foreground">กำลังโหลดรายละเอียด audit entry...</div>
          ) : !selectedAuditEntry ? (
            <div className="py-8 text-sm text-muted-foreground">ไม่พบรายละเอียด audit entry นี้</div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Action</p>
                  <p className="font-medium text-foreground">{selectedAuditEntry.action}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Created At</p>
                  <p className="font-medium text-foreground">{new Date(selectedAuditEntry.created_at).toLocaleString("th-TH")}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Result Count</p>
                  <p className="font-medium text-foreground">{selectedAuditEntry.result_count}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                  <p className="font-medium text-foreground">{selectedAuditEntry.confidence ?? "—"}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">Query Preview</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{selectedAuditEntry.query_preview || "—"}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Query storage policy: {selectedAuditEntry.query_storage}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground mb-1">Entry Hash</p>
                  <p className="font-mono text-xs break-all text-foreground">{selectedAuditEntry.entry_hash}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground mb-1">Previous Hash</p>
                  <p className="font-mono text-xs break-all text-foreground">{selectedAuditEntry.prev_hash}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground mb-1">Query Hash</p>
                  <p className="font-mono text-xs break-all text-foreground">{selectedAuditEntry.query_hash}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground mb-1">Agent Role</p>
                  <p className="text-sm text-foreground">{selectedAuditEntry.agent_role ?? "—"}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="border-b border-border bg-muted/30 px-4 py-3">
                  <p className="font-medium text-foreground">Metadata</p>
                </div>
                <pre className="max-h-[320px] overflow-auto p-4 text-xs whitespace-pre-wrap font-mono text-foreground">
                  {JSON.stringify(selectedAuditEntry.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={confirmRetryFailedOpen} onOpenChange={setConfirmRetryFailedOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Retry Failed Items</DialogTitle>
            <DialogDescription>
              ตรวจสอบรายชื่อไฟล์ที่ล้มเหลวก่อนเริ่ม retry เฉพาะรายการที่มีปัญหา
            </DialogDescription>
          </DialogHeader>

          {!selectedJob ? (
            <div className="py-6 text-sm text-muted-foreground">ไม่พบ job ที่เลือกอยู่ในขณะนี้</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-sm text-foreground">{selectedJob.retry_failed_reason ?? "ไม่มีข้อมูลเหตุผลสำหรับ retry failed items"}</p>
              </div>

              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="border-b border-border bg-muted/30 px-4 py-3">
                  <p className="font-medium text-foreground">ไฟล์ที่จะถูก retry</p>
                  <p className="text-xs text-muted-foreground mt-1">{failedFilePaths.length} รายการ</p>
                </div>
                {failedFilePaths.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">ไม่มีรายการไฟล์ที่พร้อมสำหรับ retry failed items</div>
                ) : (
                  <div className="max-h-[260px] divide-y divide-border overflow-auto">
                    {failedFilePaths.map((filePath) => (
                      <div key={filePath} className="px-4 py-3 text-sm font-mono text-foreground break-all">
                        {filePath}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmRetryFailedOpen(false)}
                  className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => void retryFailedItems()}
                  disabled={!selectedJob.retry_failed_available || failedFilePaths.length === 0 || retryFailedLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-navy-deep disabled:opacity-50"
                >
                  {retryFailedLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  ยืนยัน retry failed items
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <PartnerBar />
      <Footer />
    </div>
  );
};

const Stat = ({ icon: Icon, value, label, color }: { icon: typeof Database; value: string; label: string; color: string }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-4 text-center shadow-card">
    <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
    <div className={`font-heading text-2xl font-bold ${color}`}>{value}</div>
    <div className="text-xs text-muted-foreground mt-1">{label}</div>
  </motion.div>
);

export default ITDashboard;
