/**
 * GovernanceService — AI Risk Management & Alignment Scoring
 *
 * Based on:
 *   • NIST AI Risk Management Framework (AI RMF 1.0, 2023)
 *     "GOVERN, MAP, MEASURE, MANAGE" functions
 *   • ISO/IEC 23894:2023 — AI Risk Management
 *   • EU AI Act (2024) — Risk classification & obligations
 *   • Responsible AI principles (Transparency, Fairness, Accountability)
 *
 * Computes:
 *   ξ  (Xi)    — Alignment Score: how aligned the response is with legal & ethical standards
 *   H          — Honesty Score: uncertainty quantification & proper hedging
 *   URAACF     — Multi-objective score: Usefulness, Reliability, Accountability,
 *                Accuracy, Compliance, Fairness
 */

import type { ReasoningResult } from "./strategicReasoning";
import type { SearchResult } from "@/components/ResultCard";
import { calculateCFS } from "./fairnessScoring";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AlignmentVector {
  xi: number;         // Alignment score ξ ∈ [0, 1]
  hScore: number;     // Honesty H ∈ [0, 1]
  uraacf: URAACFScore;
  riskLevel: RiskLevel;
  riskCategory: EUAIActCategory;
  nistFunction: NISTFunction;
  violations: GovernanceViolation[];
  recommendations: string[];
  timestamp: number;
}

export interface URAACFScore {
  usefulness: number;     // U — does it answer the question?
  reliability: number;    // R — is it consistent and sourced?
  accountability: number; // A — is there an audit trail?
  accuracy: number;       // A — factual correctness indicators
  compliance: number;     // C — PDPA, ETDA, CAL-130 adherence
  fairness: number;       // F — CFS score (from fairnessScoring.ts)
  composite: number;      // weighted average
}

export interface GovernanceViolation {
  code: string;
  description: string;
  severity: "critical" | "warning" | "info";
  framework: "NIST_RMF" | "ISO_23894" | "EU_AI_ACT" | "PDPA" | "CAL130";
  remediation: string;
}

export type RiskLevel = "minimal" | "limited" | "high" | "unacceptable";

/** EU AI Act Annex III risk categories (simplified for legal AI) */
export type EUAIActCategory =
  | "ANNEX3_ADMIN_JUSTICE"   // AI used in admin of justice — HIGH risk
  | "ANNEX3_LAW_ENFORCEMENT" // AI in law enforcement — HIGH risk
  | "GENERAL_PURPOSE"        // General legal info — LIMITED risk
  | "CITIZEN_CONSULTATION";  // Public legal guidance — LIMITED risk

export type NISTFunction = "GOVERN" | "MAP" | "MEASURE" | "MANAGE";

// ─── Weights for URAACF ───────────────────────────────────────────────────────

const URAACF_WEIGHTS = {
  usefulness:     0.20,
  reliability:    0.20,
  accountability: 0.15,
  accuracy:       0.20,
  compliance:     0.15,
  fairness:       0.10,
};

// ─── ξ Alignment Score calculator ────────────────────────────────────────────

function computeXi(params: {
  hasDisclaimer: boolean;
  hasSourceCitation: boolean;
  hScore: number;
  complianceScore: number;
  noHarmfulContent: boolean;
}): number {
  let xi = 0.0;

  // NIST MAP: identify intended use alignment
  if (params.hasDisclaimer) xi += 0.20;           // Transparency obligation (EU AI Act Art. 13)
  if (params.hasSourceCitation) xi += 0.25;        // Accuracy (NIST Measure)
  if (params.noHarmfulContent) xi += 0.25;         // Safety (NIST Govern)
  xi += params.hScore * 0.15;                      // Honesty contribution
  xi += params.complianceScore * 0.15;             // PDPA / CAL-130 compliance

  return Math.min(xi, 1.0);
}

// ─── Violation detector ───────────────────────────────────────────────────────

function detectViolations(
  query: string,
  answer: string,
  hScore: number,
  hasAuditTrail: boolean
): GovernanceViolation[] {
  const violations: GovernanceViolation[] = [];

  // V001: Missing disclaimer (EU AI Act + NIST)
  if (!answer.includes("หมายเหตุ") && !answer.includes("disclaimer") && !answer.includes("⚠️")) {
    violations.push({
      code: "GOV-V001",
      description: "AI output lacks required legal disclaimer",
      severity: "warning",
      framework: "EU_AI_ACT",
      remediation: "เพิ่มข้อความ disclaimer ว่าผลลัพธ์เป็นเพียงข้อมูลเบื้องต้น ไม่ใช่คำปรึกษาทางกฎหมาย",
    });
  }

  // V002: Low H-Score (ISO 23894 — Uncertainty communication)
  if (hScore < 0.5) {
    violations.push({
      code: "GOV-V002",
      description: `H-Score ต่ำ (${hScore.toFixed(2)}) — ความไม่แน่นอนไม่ได้รับการสื่อสารอย่างเพียงพอ`,
      severity: "warning",
      framework: "ISO_23894",
      remediation: "เพิ่มการระบุระดับความเชื่อมั่นและข้อจำกัดของการวิเคราะห์",
    });
  }

  // V003: No audit trail (CAL-130)
  if (!hasAuditTrail) {
    violations.push({
      code: "GOV-V003",
      description: "ไม่มีการบันทึก audit trail สำหรับการตัดสินใจ AI",
      severity: "critical",
      framework: "CAL130",
      remediation: "เปิดใช้งาน CAL-130 logAuditEntry() สำหรับทุก AI decision",
    });
  }

  // V004: PII in query (PDPA)
  if (query.match(/(นาย|นาง|นางสาว)\s*[ก-๙]+|[0-9]{13}|[0-9]{10}/)) {
    violations.push({
      code: "GOV-V004",
      description: "Query อาจมีข้อมูลส่วนบุคคล (PII) ที่ยังไม่ได้รับการ mask",
      severity: "critical",
      framework: "PDPA",
      remediation: "ใช้ maskPII() ก่อนส่ง query เข้า AI pipeline ทุกครั้ง",
    });
  }

  // V005: Over-confidence without evidence (NIST Measure)
  if (hScore > 0.97 && !answer.includes("มาตรา") && !answer.includes("ฎีกา")) {
    violations.push({
      code: "GOV-V005",
      description: "AI แสดงความเชื่อมั่นสูงโดยไม่มีการอ้างอิงหลักฐาน",
      severity: "warning",
      framework: "NIST_RMF",
      remediation: "บังคับให้ระบุแหล่งอ้างอิงทุกครั้งที่ความเชื่อมั่น > 95%",
    });
  }

  return violations;
}

// ─── EU AI Act risk categorizer ───────────────────────────────────────────────

function categorizeEUAIAct(query: string, userId: string): EUAIActCategory {
  if (userId === "judge_role" || query.includes("พิพากษา") || query.includes("ตัดสิน")) {
    return "ANNEX3_ADMIN_JUSTICE"; // HIGH risk
  }
  if (query.includes("จับกุม") || query.includes("ออกหมาย") || query.includes("ตำรวจ")) {
    return "ANNEX3_LAW_ENFORCEMENT"; // HIGH risk
  }
  if (userId === "citizen" || query.includes("สิทธิ") || query.includes("ยื่นคำร้อง")) {
    return "CITIZEN_CONSULTATION"; // LIMITED risk
  }
  return "GENERAL_PURPOSE"; // LIMITED risk
}

function getRiskLevel(category: EUAIActCategory, violations: GovernanceViolation[]): RiskLevel {
  const hasCritical = violations.some((v) => v.severity === "critical");
  if (hasCritical) return "high";

  if (category === "ANNEX3_ADMIN_JUSTICE" || category === "ANNEX3_LAW_ENFORCEMENT") {
    return violations.length > 2 ? "high" : "limited";
  }
  return violations.length > 3 ? "limited" : "minimal";
}

// ─── Main service ─────────────────────────────────────────────────────────────

export class GovernanceService {
  private static instance: GovernanceService;

  private constructor() {}

  public static getInstance(): GovernanceService {
    if (!GovernanceService.instance) {
      GovernanceService.instance = new GovernanceService();
    }
    return GovernanceService.instance;
  }

  /**
   * Full governance evaluation of an AI decision.
   * Call this after StrategicReasoningService.reason() completes.
   */
  public evaluate(params: {
    query: string;
    answer: string;
    userId: string;
    reasoning?: ReasoningResult;
    searchResults?: SearchResult[];
    hasAuditTrail?: boolean;
  }): AlignmentVector {
    const hScore = params.reasoning?.hScore ?? 0.7;
    const hasDisclaimer = params.answer.includes("⚠️") || params.answer.includes("หมายเหตุ");
    const hasSourceCitation =
      params.answer.includes("มาตรา") ||
      params.answer.includes("ฎีกา") ||
      params.answer.includes("คำพิพากษา");
    const noHarmfulContent = !this.detectHarmfulContent(params.answer);

    // Compute PDPA compliance score
    const complianceScore = this.computeComplianceScore(params.query, params.answer, params.hasAuditTrail ?? false);

    // ξ Alignment Score
    const xi = computeXi({ hasDisclaimer, hasSourceCitation, hScore, complianceScore, noHarmfulContent });

    // Fairness score via CFS
    const fairness = params.searchResults && params.searchResults.length > 0
      ? calculateCFS(params.searchResults).cfs
      : 0.75; // default neutral

    // URAACF
    const uraacf = this.computeURAACF({
      hScore,
      hasSourceCitation,
      hasAuditTrail: params.hasAuditTrail ?? false,
      complianceScore,
      fairness,
      reasoning: params.reasoning,
    });

    // Violations
    const violations = detectViolations(params.query, params.answer, hScore, params.hasAuditTrail ?? false);

    // EU AI Act classification
    const riskCategory = categorizeEUAIAct(params.query, params.userId);
    const riskLevel = getRiskLevel(riskCategory, violations);

    // NIST function: which phase are we in?
    const nistFunction = this.mapNISTFunction(riskLevel, violations);

    // Recommendations
    const recommendations = this.generateRecommendations(violations, riskCategory);

    return {
      xi: Math.round(xi * 1000) / 1000,
      hScore: Math.round(hScore * 1000) / 1000,
      uraacf,
      riskLevel,
      riskCategory,
      nistFunction,
      violations,
      recommendations,
      timestamp: Date.now(),
    };
  }

  // ── URAACF computation ────────────────────────────────────────────────────

  private computeURAACF(params: {
    hScore: number;
    hasSourceCitation: boolean;
    hasAuditTrail: boolean;
    complianceScore: number;
    fairness: number;
    reasoning?: ReasoningResult;
  }): URAACFScore {
    const cyclesBonus = params.reasoning ? Math.min(params.reasoning.cyclesUsed / MAX_CYCLES_REF, 1) : 0.5;

    const usefulness    = params.reasoning ? Math.min(params.reasoning.confidence + 0.1, 1) : 0.7;
    const reliability   = params.hasSourceCitation ? 0.85 : 0.5;
    const accountability = params.hasAuditTrail ? 0.95 : 0.3;
    const accuracy      = params.hScore * 0.9 + cyclesBonus * 0.1;
    const compliance    = params.complianceScore;
    const fairness      = params.fairness;

    const composite =
      usefulness    * URAACF_WEIGHTS.usefulness +
      reliability   * URAACF_WEIGHTS.reliability +
      accountability * URAACF_WEIGHTS.accountability +
      accuracy      * URAACF_WEIGHTS.accuracy +
      compliance    * URAACF_WEIGHTS.compliance +
      fairness      * URAACF_WEIGHTS.fairness;

    const round = (n: number) => Math.round(n * 1000) / 1000;

    return {
      usefulness: round(usefulness),
      reliability: round(reliability),
      accountability: round(accountability),
      accuracy: round(accuracy),
      compliance: round(compliance),
      fairness: round(fairness),
      composite: round(composite),
    };
  }

  private computeComplianceScore(query: string, answer: string, hasAuditTrail: boolean): number {
    let score = 1.0;
    if (!hasAuditTrail) score -= 0.3;
    if (query.match(/[0-9]{13}/)) score -= 0.2;  // raw national ID in query
    if (answer.match(/(นาย|นาง)\s[ก-๙]+\s[ก-๙]+/)) score -= 0.2;  // unmasked name in answer
    return Math.max(0, score);
  }

  private detectHarmfulContent(text: string): boolean {
    // Layer 3 Guardrails — ตรวจจับเนื้อหาที่เป็นอันตราย/ผิดกฎหมาย
    const harmPatterns = [
      // ความรุนแรงและการทำร้าย
      /ทำให้ตาย/,
      /วิธีฆ่า/,
      /ทำร้ายให้สาหัส.*ขั้นตอน/,
      // การหลบหนีและหลีกเลี่ยงกฎหมาย
      /หนีคดี/,
      /หลบหนีหมายจับ/,
      /วิธีหนี.*จับ/,
      // การปลอมแปลงและฉ้อโกง
      /ปลอมแปลง.*เอกสาร/,
      /วิธีปลอม.*ลายเซ็น/,
      /สร้างหลักฐาน.*เท็จ/,
      /วิธีโกง.*ประกัน/,
      // การซ่อนทรัพย์สิน
      /ซ่อนทรัพย์สิน/,
      /โอนทรัพย์.*หลบ.*หนี้/,
      /ย้าย.*ทรัพย์.*ก่อน.*ฟ้อง/,
      // การล้างเงินและทุจริต
      /ฟอกเงิน.*วิธี/,
      /สมคบ.*ทุจริต.*ขั้นตอน/,
      // ยาเสพติดและอาวุธ
      /วิธีทำ.*ยาบ้า/,
      /สังเคราะห์.*ยาเสพติด/,
      /ซื้อขาย.*อาวุธ.*ผิดกฎหมาย/,
    ];
    return harmPatterns.some((p) => p.test(text));
  }

  private mapNISTFunction(riskLevel: RiskLevel, violations: GovernanceViolation[]): NISTFunction {
    if (violations.some((v) => v.severity === "critical")) return "MANAGE";
    if (riskLevel === "high") return "MEASURE";
    if (violations.length > 0) return "MAP";
    return "GOVERN";
  }

  private generateRecommendations(
    violations: GovernanceViolation[],
    category: EUAIActCategory
  ): string[] {
    const recs: string[] = [];

    if (category === "ANNEX3_ADMIN_JUSTICE") {
      recs.push("ระบบ AI สำหรับงานยุติธรรมต้องผ่าน human oversight ก่อนนำไปใช้จริง (EU AI Act Art. 14)");
    }

    violations.forEach((v) => recs.push(v.remediation));

    if (recs.length === 0) {
      recs.push("ระบบผ่านการตรวจสอบ Governance ทุกข้อ — พร้อมสำหรับการใช้งาน");
    }

    return [...new Set(recs)]; // deduplicate
  }

  /**
   * Summarized label for display
   */
  public getRiskLabel(vector: AlignmentVector): { label: string; color: string } {
    const labels: Record<RiskLevel, { label: string; color: string }> = {
      minimal:      { label: "ความเสี่ยงต่ำมาก", color: "text-teal-600" },
      limited:      { label: "ความเสี่ยงจำกัด",  color: "text-yellow-600" },
      high:         { label: "ความเสี่ยงสูง",     color: "text-orange-600" },
      unacceptable: { label: "ยอมรับไม่ได้",       color: "text-red-700" },
    };
    return labels[vector.riskLevel];
  }
}

const MAX_CYCLES_REF = 3; // mirrors strategicReasoning.ts MAX_CYCLES

export const governanceService = GovernanceService.getInstance();
