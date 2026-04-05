// CAL-130 Audit Log — SHA-256 hash chain for immutable query logging

export interface AuditEntry {
  id: string;
  queryHash: string;
  query: string;
  userId: string;
  action: "search" | "chat" | "view_judgment" | "bookmark" | "export" | "agent_decision";
  agentRole?: string;
  status?: "pending" | "success" | "denied";
  resultCount: number;
  hScore: number;
  timestamp: number;
  prevHash: string;
  entryHash: string;
}

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const STORAGE_KEY = "lg-audit-log";

function getAuditLog(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAuditLog(log: AuditEntry[]) {
  try {
    // Keep last 500 entries (3-year retention simulated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log.slice(0, 500)));
  } catch (e) { console.warn("Audit log save failed:", e); }
}

export async function logAuditEntry(
  query: string,
  action: AuditEntry["action"],
  resultCount: number = 0,
  hScore: number = 0,
  userId: string = "anonymous",
  agentRole?: string,
  status: AuditEntry["status"] = "success"
): Promise<AuditEntry> {
  const log = getAuditLog();
  const prevHash = log.length > 0 ? log[0].entryHash : "genesis";
  const queryHash = await sha256(query);
  const entryData = `${queryHash}|${prevHash}|${Date.now()}|${action}|${agentRole || ""}|${status}`;
  const entryHash = await sha256(entryData);

  const entry: AuditEntry = {
    id: `cal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    queryHash,
    query: query.slice(0, 100),
    userId,
    action,
    agentRole,
    status,
    resultCount,
    hScore,
    timestamp: Date.now(),
    prevHash,
    entryHash,
  };

  log.unshift(entry);
  saveAuditLog(log);
  return entry;
}

export function getAuditEntries(): AuditEntry[] {
  return getAuditLog();
}

export async function verifyChainIntegrity(): Promise<{ valid: boolean; brokenAt?: number }> {
  const log = getAuditLog();
  if (log.length <= 1) return { valid: true };

  for (let i = 0; i < log.length - 1; i++) {
    if (log[i].prevHash !== log[i + 1].entryHash) {
      return { valid: false, brokenAt: i };
    }
  }
  return { valid: true };
}

export function getAuditStats() {
  const log = getAuditLog();
  const now = Date.now();
  const day = 86400000;
  return {
    total: log.length,
    today: log.filter((e) => now - e.timestamp < day).length,
    thisWeek: log.filter((e) => now - e.timestamp < 7 * day).length,
    avgHScore: log.length > 0 ? log.reduce((s, e) => s + e.hScore, 0) / log.length : 0,
    byAction: {
      search: log.filter((e) => e.action === "search").length,
      chat: log.filter((e) => e.action === "chat").length,
      view: log.filter((e) => e.action === "view_judgment").length,
    },
  };
}
