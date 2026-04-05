/**
 * Lake Formation RBAC Layer
 *
 * Implements the access control model described in:
 *   • AWS Lake Formation: fine-grained table/column/row permissions
 *   • NIST SP 800-162: ABAC (Attribute-Based Access Control)
 *   • Thai PDPA มาตรา 26: sensitive personal data requires explicit consent
 *
 * Maps to Production Readiness Gate: ETDA Compliance 100%
 *
 * Role hierarchy:
 *   anonymous → citizen → government → judge → system_admin
 *
 * Resources:
 *   Buckets (S3/Lake Formation): judgments_public, judgments_restricted,
 *             judgments_sealed, pii_vault, audit_logs
 *   Tables:   judgments, audit_logs, pii_masks, metadata, vector_index_mapping
 *   Columns:  embedding (ML-sensitive), content (full text), pii_spans
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type LFRole =
  | "anonymous"
  | "citizen"
  | "government"
  | "judge"
  | "system_admin";

export type LFResource =
  | "judgments_public"
  | "judgments_restricted"
  | "judgments_sealed"
  | "judgments_youth"
  | "pii_vault"
  | "audit_logs"
  | "vector_embeddings"
  | "statistics_aggregate";

export type LFAction = "read" | "write" | "delete" | "export" | "admin";

export type DataClassification =
  | "public"         // no restrictions
  | "internal"       // government officials only
  | "restricted"     // specific role required
  | "sealed"         // court-sealed, judge + admin only
  | "youth"          // youth court cases — strict access
  | "pii"            // personal data — PDPA controlled
  | "audit"          // immutable audit trail — read: admin; write: system

export interface LFPermission {
  resource: LFResource;
  actions: LFAction[];
}

export interface LFPolicy {
  role: LFRole;
  permissions: LFPermission[];
  rowFilters: RowFilter[];          // Lake Formation row-level security
  columnMasks: ColumnMask[];        // Lake Formation column masking
  dataQualityLevel: number;         // 0–100 (how much data the role sees)
}

export interface RowFilter {
  table: string;
  condition: string;                // SQL-like predicate
  description: string;
}

export interface ColumnMask {
  table: string;
  column: string;
  maskType: "hash" | "redact" | "null" | "truncate";
  description: string;
}

export interface AccessDecision {
  allowed: boolean;
  role: LFRole;
  resource: LFResource;
  action: LFAction;
  reason: string;
  appliedFilters: string[];
  appliedMasks: string[];
  pdpaArticle?: string;
  auditRequired: boolean;
}

// ─── Policy Definitions ───────────────────────────────────────────────────────

const LAKE_FORMATION_POLICIES: LFPolicy[] = [
  // ── anonymous ────────────────────────────────────────────────────────────
  {
    role: "anonymous",
    permissions: [
      { resource: "statistics_aggregate", actions: ["read"] },
    ],
    rowFilters: [
      { table: "judgments", condition: "pii_masked = TRUE AND classification = 'public'", description: "Only fully masked public records" },
    ],
    columnMasks: [
      { table: "judgments", column: "content",   maskType: "truncate", description: "Limit to 500 chars" },
      { table: "judgments", column: "embedding", maskType: "null",     description: "Hide ML embeddings" },
    ],
    dataQualityLevel: 20,
  },

  // ── citizen ──────────────────────────────────────────────────────────────
  {
    role: "citizen",
    permissions: [
      { resource: "judgments_public",    actions: ["read"] },
      { resource: "statistics_aggregate", actions: ["read"] },
    ],
    rowFilters: [
      { table: "judgments", condition: "pii_masked = TRUE AND classification IN ('public')", description: "Public, PII-masked judgments only" },
      { table: "audit_logs", condition: "user_id = CURRENT_USER", description: "Own audit logs only" },
    ],
    columnMasks: [
      { table: "judgments", column: "embedding",  maskType: "null",    description: "ML embeddings hidden from public" },
      { table: "judgments", column: "case_officer", maskType: "redact", description: "PDPA: officer identity masked" },
    ],
    dataQualityLevel: 50,
  },

  // ── government ───────────────────────────────────────────────────────────
  {
    role: "government",
    permissions: [
      { resource: "judgments_public",      actions: ["read", "export"] },
      { resource: "judgments_restricted",  actions: ["read"] },
      { resource: "statistics_aggregate",  actions: ["read", "export"] },
      { resource: "audit_logs",            actions: ["read"] },
    ],
    rowFilters: [
      { table: "judgments", condition: "classification IN ('public','internal') AND pii_masked = TRUE", description: "Public + internal, always masked" },
      { table: "judgments", condition: "classification NOT IN ('sealed','youth')", description: "Exclude sealed & youth cases" },
    ],
    columnMasks: [
      { table: "judgments", column: "embedding", maskType: "null",    description: "Vector embeddings are ML-internal only" },
      { table: "pii_masks", column: "spans",     maskType: "redact",  description: "PDPA มาตรา 26: sensitive data restricted" },
    ],
    dataQualityLevel: 75,
  },

  // ── judge ────────────────────────────────────────────────────────────────
  {
    role: "judge",
    permissions: [
      { resource: "judgments_public",     actions: ["read", "export"] },
      { resource: "judgments_restricted", actions: ["read", "export"] },
      { resource: "judgments_sealed",     actions: ["read"] },
      { resource: "judgments_youth",      actions: ["read"] },
      { resource: "statistics_aggregate", actions: ["read", "export"] },
      { resource: "audit_logs",           actions: ["read"] },
    ],
    rowFilters: [
      { table: "judgments", condition: "classification IN ('public','internal','restricted','sealed','youth')", description: "Full case access" },
      { table: "pii_masks",  condition: "TRUE", description: "Full PII span access for judicial review" },
    ],
    columnMasks: [
      // Judges see full content — no column masks
    ],
    dataQualityLevel: 95,
  },

  // ── system_admin ─────────────────────────────────────────────────────────
  {
    role: "system_admin",
    permissions: [
      { resource: "judgments_public",     actions: ["read", "write", "admin"] },
      { resource: "judgments_restricted", actions: ["read", "write", "admin"] },
      { resource: "judgments_sealed",     actions: ["read", "write", "admin"] },
      { resource: "judgments_youth",      actions: ["read", "write", "admin"] },
      { resource: "pii_vault",            actions: ["read", "admin"] },
      { resource: "audit_logs",           actions: ["read"] },  // NO delete — immutable
      { resource: "vector_embeddings",    actions: ["read", "write", "admin"] },
      { resource: "statistics_aggregate", actions: ["read", "write", "export", "admin"] },
    ],
    rowFilters: [],
    columnMasks: [],
    dataQualityLevel: 100,
  },
];

// ─── Resource classification map ──────────────────────────────────────────────

const RESOURCE_CLASSIFICATION: Record<LFResource, DataClassification> = {
  judgments_public:      "public",
  judgments_restricted:  "restricted",
  judgments_sealed:      "sealed",
  judgments_youth:       "youth",
  pii_vault:             "pii",
  audit_logs:            "audit",
  vector_embeddings:     "restricted",
  statistics_aggregate:  "public",
};

// ─── PDPA Article reference ───────────────────────────────────────────────────

function getPDPAReference(classification: DataClassification): string | undefined {
  const map: Partial<Record<DataClassification, string>> = {
    pii:        "PDPA มาตรา 26 — ข้อมูลส่วนบุคคลที่มีความอ่อนไหว",
    youth:      "PDPA มาตรา 22 + พ.ร.บ.ศาลเยาวชน มาตรา 78",
    sealed:     "ประมวลกฎหมายวิธีพิจารณาความแพ่ง มาตรา 36 (ปิดคดี)",
    restricted: "PDPA มาตรา 24 — ต้องมีฐานการประมวลผลที่ชอบด้วยกฎหมาย",
  };
  return map[classification];
}

// ─── Core access control engine ───────────────────────────────────────────────

export class LakeFormationRBAC {
  private static instance: LakeFormationRBAC;
  private policyMap: Map<LFRole, LFPolicy>;

  private constructor() {
    this.policyMap = new Map(LAKE_FORMATION_POLICIES.map((p) => [p.role, p]));
  }

  public static getInstance(): LakeFormationRBAC {
    if (!LakeFormationRBAC.instance) {
      LakeFormationRBAC.instance = new LakeFormationRBAC();
    }
    return LakeFormationRBAC.instance;
  }

  /**
   * Main access check — replaces AccessGatekeeper with full RBAC.
   */
  public checkAccess(
    role: LFRole,
    resource: LFResource,
    action: LFAction = "read"
  ): AccessDecision {
    const policy = this.policyMap.get(role);

    if (!policy) {
      return this.deny(role, resource, action, "Unknown role");
    }

    const permission = policy.permissions.find((p) => p.resource === resource);

    if (!permission || !permission.actions.includes(action)) {
      const classification = RESOURCE_CLASSIFICATION[resource];
      const pdpaArticle    = getPDPAReference(classification);

      return this.deny(
        role, resource, action,
        `Role '${role}' does not have '${action}' permission on '${resource}' (${classification})`,
        policy, pdpaArticle
      );
    }

    const appliedFilters = policy.rowFilters.map((f) => f.condition);
    const appliedMasks   = policy.columnMasks.map((m) => `${m.table}.${m.column}:${m.maskType}`);

    return {
      allowed: true,
      role,
      resource,
      action,
      reason: `Permitted by Lake Formation policy for role '${role}'`,
      appliedFilters,
      appliedMasks,
      pdpaArticle: getPDPAReference(RESOURCE_CLASSIFICATION[resource]),
      auditRequired: resource !== "statistics_aggregate",
    };
  }

  /**
   * Check if a role can access a specific document classification.
   */
  public canAccessClassification(role: LFRole, classification: DataClassification): boolean {
    const resourceMap: Record<DataClassification, LFResource> = {
      public:     "judgments_public",
      internal:   "judgments_restricted",
      restricted: "judgments_restricted",
      sealed:     "judgments_sealed",
      youth:      "judgments_youth",
      pii:        "pii_vault",
      audit:      "audit_logs",
    };
    const resource = resourceMap[classification];
    return this.checkAccess(role, resource, "read").allowed;
  }

  /**
   * Get the effective row filter SQL for a role (inject into DB queries).
   */
  public getRowFilters(role: LFRole, table: string): string {
    const policy = this.policyMap.get(role);
    if (!policy) return "1=0"; // deny all if unknown role
    const filters = policy.rowFilters
      .filter((f) => f.table === table)
      .map((f) => `(${f.condition})`);
    return filters.length > 0 ? filters.join(" AND ") : "1=1";
  }

  /**
   * Get columns that should be masked for a role.
   */
  public getMaskedColumns(role: LFRole, table: string): ColumnMask[] {
    const policy = this.policyMap.get(role);
    if (!policy) return [];
    return policy.columnMasks.filter((m) => m.table === table);
  }

  /**
   * Get the data quality level (0–100) for a role.
   * Used in GovernanceService URAACF compliance scoring.
   */
  public getDataQualityLevel(role: LFRole): number {
    return this.policyMap.get(role)?.dataQualityLevel ?? 0;
  }

  /**
   * Resolve role from userId pattern (bridges Supabase Auth → Lake Formation).
   * In production: use Cognito group claims.
   */
  public resolveRole(userId: string): LFRole {
    if (userId === "system" || userId === "system_admin") return "system_admin";
    if (userId.startsWith("judge_"))                       return "judge";
    if (userId.startsWith("gov_") || userId.startsWith("government")) return "government";
    if (userId === "anonymous" || userId === "")           return "anonymous";
    return "citizen";
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private deny(
    role: LFRole,
    resource: LFResource,
    action: LFAction,
    reason: string,
    policy?: LFPolicy,
    pdpaArticle?: string
  ): AccessDecision {
    return {
      allowed: false,
      role,
      resource,
      action,
      reason,
      appliedFilters: policy?.rowFilters.map((f) => f.condition) ?? [],
      appliedMasks:   policy?.columnMasks.map((m) => `${m.table}.${m.column}:${m.maskType}`) ?? [],
      pdpaArticle,
      auditRequired: true,
    };
  }
}

export const lakeFormation = LakeFormationRBAC.getInstance();
