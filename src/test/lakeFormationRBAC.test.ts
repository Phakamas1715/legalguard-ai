/**
 * Lake Formation RBAC — Sprint 3 Tests
 * Verifies: role permissions, row filters, column masks, PDPA compliance
 * Production gate: ETDA Compliance 100%
 */

import { describe, it, expect } from "vitest";
import { lakeFormation } from "@/lib/lakeFormationRBAC";
import type { LFRole, LFResource, LFAction } from "@/lib/lakeFormationRBAC";

// ─── 1. Basic role permissions ────────────────────────────────────────────────

describe("Lake Formation RBAC — Role Permissions", () => {
  it("anonymous can read statistics_aggregate only", () => {
    expect(lakeFormation.checkAccess("anonymous", "statistics_aggregate", "read").allowed).toBe(true);
    expect(lakeFormation.checkAccess("anonymous", "judgments_public",     "read").allowed).toBe(false);
    expect(lakeFormation.checkAccess("anonymous", "judgments_restricted",  "read").allowed).toBe(false);
    expect(lakeFormation.checkAccess("anonymous", "audit_logs",            "read").allowed).toBe(false);
  });

  it("citizen can read public judgments", () => {
    expect(lakeFormation.checkAccess("citizen", "judgments_public", "read").allowed).toBe(true);
  });

  it("citizen cannot access restricted or sealed judgments", () => {
    expect(lakeFormation.checkAccess("citizen", "judgments_restricted", "read").allowed).toBe(false);
    expect(lakeFormation.checkAccess("citizen", "judgments_sealed",     "read").allowed).toBe(false);
    expect(lakeFormation.checkAccess("citizen", "judgments_youth",      "read").allowed).toBe(false);
  });

  it("government can read restricted but not sealed/youth", () => {
    expect(lakeFormation.checkAccess("government", "judgments_restricted", "read").allowed).toBe(true);
    expect(lakeFormation.checkAccess("government", "judgments_sealed",     "read").allowed).toBe(false);
    expect(lakeFormation.checkAccess("government", "judgments_youth",      "read").allowed).toBe(false);
  });

  it("judge can read sealed and youth cases", () => {
    expect(lakeFormation.checkAccess("judge", "judgments_sealed", "read").allowed).toBe(true);
    expect(lakeFormation.checkAccess("judge", "judgments_youth",  "read").allowed).toBe(true);
  });

  it("judge cannot delete anything", () => {
    expect(lakeFormation.checkAccess("judge", "judgments_public",    "delete").allowed).toBe(false);
    expect(lakeFormation.checkAccess("judge", "judgments_restricted","delete").allowed).toBe(false);
  });

  it("system_admin has full access to all resources", () => {
    const resources: LFResource[] = [
      "judgments_public","judgments_restricted","judgments_sealed",
      "judgments_youth","vector_embeddings","statistics_aggregate",
    ];
    for (const r of resources) {
      expect(lakeFormation.checkAccess("system_admin", r, "read").allowed).toBe(true);
    }
  });

  it("system_admin cannot delete audit_logs (immutable)", () => {
    // audit_logs only allows "read" even for admin — no delete
    expect(lakeFormation.checkAccess("system_admin", "audit_logs", "delete").allowed).toBe(false);
  });
});

// ─── 2. PDPA compliance references ───────────────────────────────────────────

describe("Lake Formation RBAC — PDPA References", () => {
  it("returns PDPA reference for PII vault access denial", () => {
    const decision = lakeFormation.checkAccess("citizen", "pii_vault", "read");
    expect(decision.allowed).toBe(false);
    expect(decision.pdpaArticle).toContain("PDPA");
  });

  it("returns PDPA reference for youth case access denial", () => {
    const decision = lakeFormation.checkAccess("government", "judgments_youth", "read");
    expect(decision.allowed).toBe(false);
    expect(decision.pdpaArticle).toContain("PDPA");
  });

  it("allowed decision still includes PDPA note for sensitive resources", () => {
    const decision = lakeFormation.checkAccess("judge", "judgments_youth", "read");
    expect(decision.allowed).toBe(true);
    expect(decision.pdpaArticle).toBeTruthy();
  });
});

// ─── 3. Row filters ───────────────────────────────────────────────────────────

describe("Lake Formation RBAC — Row Filters", () => {
  it("anonymous gets restrictive filter on judgments", () => {
    const filter = lakeFormation.getRowFilters("anonymous", "judgments");
    expect(filter).toContain("pii_masked = TRUE");
    expect(filter).toContain("public");
  });

  it("citizen filter excludes sealed and youth", () => {
    const filter = lakeFormation.getRowFilters("citizen", "judgments");
    expect(filter).toContain("pii_masked = TRUE");
    expect(filter).not.toContain("sealed");
  });

  it("government filter excludes sealed and youth rows", () => {
    const filter = lakeFormation.getRowFilters("government", "judgments");
    expect(filter).toContain("NOT IN");
  });

  it("judge filter includes all classification types", () => {
    const filter = lakeFormation.getRowFilters("judge", "judgments");
    expect(filter).toContain("sealed");
    expect(filter).toContain("youth");
  });

  it("system_admin gets no filter (empty → 1=1)", () => {
    const filter = lakeFormation.getRowFilters("system_admin", "judgments");
    expect(filter).toBe("1=1");
  });

  it("unknown role gets deny-all filter", () => {
    const filter = lakeFormation.getRowFilters("hacker" as LFRole, "judgments");
    expect(filter).toBe("1=0");
  });
});

// ─── 4. Column masking ────────────────────────────────────────────────────────

describe("Lake Formation RBAC — Column Masking", () => {
  it("citizen has embedding column masked", () => {
    const masks = lakeFormation.getMaskedColumns("citizen", "judgments");
    const embeddingMask = masks.find((m) => m.column === "embedding");
    expect(embeddingMask).toBeTruthy();
    expect(embeddingMask?.maskType).toBe("null");
  });

  it("government has pii_masks.spans redacted", () => {
    const masks = lakeFormation.getMaskedColumns("government", "pii_masks");
    const spansMask = masks.find((m) => m.column === "spans");
    expect(spansMask).toBeTruthy();
    expect(spansMask?.maskType).toBe("redact");
  });

  it("judge has no column masks (full access)", () => {
    const masks = lakeFormation.getMaskedColumns("judge", "judgments");
    expect(masks).toHaveLength(0);
  });

  it("system_admin has no column masks", () => {
    const masks = lakeFormation.getMaskedColumns("system_admin", "judgments");
    expect(masks).toHaveLength(0);
  });
});

// ─── 5. Data quality levels ───────────────────────────────────────────────────

describe("Lake Formation RBAC — Data Quality Levels", () => {
  it("role hierarchy has increasing data quality", () => {
    const levels = (["anonymous", "citizen", "government", "judge", "system_admin"] as LFRole[])
      .map((r) => lakeFormation.getDataQualityLevel(r));
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBeGreaterThan(levels[i - 1]);
    }
  });

  it("system_admin has 100% data quality", () => {
    expect(lakeFormation.getDataQualityLevel("system_admin")).toBe(100);
  });

  it("anonymous has lowest data quality", () => {
    expect(lakeFormation.getDataQualityLevel("anonymous")).toBeLessThan(30);
  });
});

// ─── 6. Role resolution ───────────────────────────────────────────────────────

describe("Lake Formation RBAC — Role Resolution", () => {
  it("resolves judge_ prefix to judge role", () => {
    expect(lakeFormation.resolveRole("judge_001")).toBe("judge");
  });

  it("resolves gov_ prefix to government role", () => {
    expect(lakeFormation.resolveRole("gov_department_a")).toBe("government");
  });

  it("resolves anonymous userId to anonymous", () => {
    expect(lakeFormation.resolveRole("anonymous")).toBe("anonymous");
    expect(lakeFormation.resolveRole("")).toBe("anonymous");
  });

  it("resolves system to system_admin", () => {
    expect(lakeFormation.resolveRole("system")).toBe("system_admin");
  });

  it("resolves unknown userId to citizen (default)", () => {
    expect(lakeFormation.resolveRole("user-12345")).toBe("citizen");
  });
});

// ─── 7. Audit requirement ─────────────────────────────────────────────────────

describe("Lake Formation RBAC — Audit Requirements", () => {
  it("statistics access does not require audit", () => {
    const decision = lakeFormation.checkAccess("citizen", "statistics_aggregate", "read");
    expect(decision.auditRequired).toBe(false);
  });

  it("judgment access requires audit", () => {
    const decision = lakeFormation.checkAccess("citizen", "judgments_public", "read");
    expect(decision.auditRequired).toBe(true);
  });

  it("denied access requires audit", () => {
    const decision = lakeFormation.checkAccess("anonymous", "judgments_public", "read");
    expect(decision.allowed).toBe(false);
    expect(decision.auditRequired).toBe(true);
  });
});
