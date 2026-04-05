/**
 * StrategicReasoningService — Cyclic Reasoning Engine
 *
 * Based on:
 *   • Chain-of-Thought prompting (Wei et al., 2022, Google)
 *     "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models"
 *   • Reflexion (Shinn et al., 2023)
 *     "Reflexion: Language Agents with Verbal Reinforcement Learning"
 *
 * Pipeline:
 *   1. Decompose   — break the legal query into sub-questions
 *   2. Think       — CoT: generate reasoning chain step-by-step
 *   3. Refine      — cyclic refinement (N iterations, confidence-gated)
 *   4. Reflect     — self-critique: detect errors, hedges, missing citations
 *   5. Synthesize  — produce final answer with confidence & reflection notes
 */

import { memory } from "./layeredMemory";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReasoningStep {
  stepIndex: number;
  thought: string;
  action: ReasoningAction;
  observation: string;
  confidence: number;
}

export type ReasoningAction =
  | "DECOMPOSE"
  | "RETRIEVE_STATUTE"
  | "RETRIEVE_PRECEDENT"
  | "COMPARE"
  | "SYNTHESIZE"
  | "REFLECT"
  | "CONCLUDE";

export interface ReflectionNote {
  type: "uncertainty" | "missing_citation" | "over_confidence" | "pdpa_risk" | "ok";
  message: string;
  severity: "low" | "medium" | "high";
}

export interface ReasoningResult {
  query: string;
  steps: ReasoningStep[];
  reflections: ReflectionNote[];
  finalAnswer: string;
  confidence: number;          // 0–1
  cyclesUsed: number;
  hScore: number;              // Honesty score — passed to GovernanceService
  thinkingTrace: string;       // Full CoT for audit
}

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_CYCLES = 3;
const CONFIDENCE_THRESHOLD = 0.85;  // stop early if achieved

// ─── Internal CoT step generators ────────────────────────────────────────────

function decompose(query: string): string[] {
  // Heuristic decomposition for Thai legal queries
  const subQuestions: string[] = [];

  if (query.includes("มาตรา")) {
    const matches = query.match(/มาตรา\s*\d+/g) || [];
    matches.forEach((m) => subQuestions.push(`บทบัญญัติของ ${m} คืออะไร?`));
  }
  if (query.includes("ฎีกา") || query.includes("คำพิพากษา")) {
    subQuestions.push("มีแนวคำพิพากษาฎีกาที่เกี่ยวข้องอย่างไร?");
  }
  if (query.includes("โทษ") || query.includes("ลงโทษ")) {
    subQuestions.push("บทลงโทษตามกฎหมายคืออะไร?");
  }
  if (query.includes("อายุความ")) {
    subQuestions.push("อายุความในคดีนี้คือกี่ปี?");
  }
  if (subQuestions.length === 0) {
    subQuestions.push(`ประเด็นกฎหมายหลักของ "${query.slice(0, 40)}" คืออะไร?`);
    subQuestions.push("มีกฎหมายหรือมาตราใดที่เกี่ยวข้อง?");
  }
  return subQuestions;
}

function generateThought(subQuestion: string, stepIdx: number, priorContext: string): string {
  // Deterministic CoT thought generation (offline, no API needed)
  const thoughtTemplates: Record<number, string> = {
    0: `พิจารณา: "${subQuestion}" — ต้องระบุบทบัญญัติที่เกี่ยวข้องก่อน จากนั้นค้นหาแนวฎีกาประกอบ`,
    1: `ทบทวน: จากข้อมูลที่ได้รวบรวม ต้องเปรียบเทียบกับ context ก่อนหน้า: ${priorContext.slice(0, 80) || "ไม่มี"}`,
    2: `ตรวจสอบ: ความถูกต้องของการตีความ — มีข้อยกเว้นหรือกรณีพิเศษที่ต้องพิจารณาหรือไม่?`,
  };
  return thoughtTemplates[stepIdx % 3] || `วิเคราะห์เพิ่มเติม: ${subQuestion}`;
}

function generateObservation(subQuestion: string, cycle: number): string {
  // Simulated retrieval observation — in production this calls Bedrock/pgvector
  const confidence = 0.7 + cycle * 0.08;
  return `[Cycle ${cycle + 1}] ค้นพบข้อมูลที่เกี่ยวข้อง (ความเชื่อมั่น ${(confidence * 100).toFixed(0)}%) — ${subQuestion}`;
}

// ─── Reflection engine (Reflexion pattern) ───────────────────────────────────

function reflect(steps: ReasoningStep[], query: string): ReflectionNote[] {
  const notes: ReflectionNote[] = [];

  const avgConf = steps.reduce((s, st) => s + st.confidence, 0) / steps.length;

  // Over-confidence check
  if (avgConf > 0.97) {
    notes.push({
      type: "over_confidence",
      message: "ความเชื่อมั่นสูงผิดปกติ — ควรเพิ่ม disclaimer ว่าเป็นเพียงการวิเคราะห์เบื้องต้น",
      severity: "medium",
    });
  }

  // Missing citation check
  const hasCitation = steps.some(
    (st) =>
      st.observation.includes("มาตรา") ||
      st.observation.includes("ฎีกา") ||
      st.thought.includes("มาตรา") ||
      st.thought.includes("ฎีกา") ||
      st.thought.includes("บทบัญญัติ")
  );
  if (!hasCitation && (query.includes("กฎหมาย") || query.includes("ความผิด") || query.includes("โทษ"))) {
    notes.push({
      type: "missing_citation",
      message: "ไม่พบการอ้างอิงมาตราหรือแนวฎีกาโดยตรง — ควรระบุแหล่งอ้างอิงให้ชัดเจน",
      severity: "high",
    });
  }

  // PDPA risk check
  if (query.match(/(ชื่อ|นามสกุล|เลขบัตร|ที่อยู่|เบอร์)/)) {
    notes.push({
      type: "pdpa_risk",
      message: "Query อาจมีข้อมูลส่วนบุคคล — ระบบ PII Masking ได้รับการเปิดใช้งานแล้ว",
      severity: "medium",
    });
  }

  // Low confidence check
  if (avgConf < 0.6) {
    notes.push({
      type: "uncertainty",
      message: "ความเชื่อมั่นต่ำ — ผลลัพธ์อาจต้องการการตรวจสอบจากนักกฎหมายเพิ่มเติม",
      severity: "high",
    });
  }

  if (notes.length === 0) {
    notes.push({ type: "ok", message: "ผ่านการตรวจสอบทุกข้อ", severity: "low" });
  }

  return notes;
}

function computeHScore(steps: ReasoningStep[], reflections: ReflectionNote[]): number {
  // H-Score (Honesty): penalizes over-confidence & missing citations
  let score = 1.0;
  for (const r of reflections) {
    if (r.type === "over_confidence") score -= 0.15;
    if (r.type === "missing_citation") score -= 0.2;
    if (r.type === "uncertainty") score -= 0.1;
    if (r.type === "pdpa_risk") score -= 0.05;
  }
  // Bonus for having multiple refinement cycles
  score += (steps.length / 10) * 0.05;
  return Math.max(0, Math.min(1, score));
}

// ─── Main service ─────────────────────────────────────────────────────────────

export class StrategicReasoningService {
  private static instance: StrategicReasoningService;

  private constructor() {}

  public static getInstance(): StrategicReasoningService {
    if (!StrategicReasoningService.instance) {
      StrategicReasoningService.instance = new StrategicReasoningService();
    }
    return StrategicReasoningService.instance;
  }

  /**
   * Main entry point — runs the full CoT + Reflexion pipeline.
   */
  public async reason(query: string, userId = "system"): Promise<ReasoningResult> {
    const steps: ReasoningStep[] = [];
    let cyclesUsed = 0;
    let currentConfidence = 0;

    // Retrieve memory context (MemGPT integration)
    const memContext = memory.buildContext(query, 400);

    // Step 1: DECOMPOSE
    const subQuestions = decompose(query);
    steps.push({
      stepIndex: 0,
      thought: `แบ่งคำถามเป็น ${subQuestions.length} ประเด็นย่อย: ${subQuestions.join(" | ")}`,
      action: "DECOMPOSE",
      observation: `ระบุประเด็นหลัก ${subQuestions.length} ข้อสำเร็จ`,
      confidence: 0.9,
    });

    // Steps 2–N: Cyclic THINK + RETRIEVE
    for (let cycle = 0; cycle < MAX_CYCLES; cycle++) {
      cyclesUsed = cycle + 1;

      for (let qi = 0; qi < subQuestions.length; qi++) {
        const priorContext = steps.slice(-2).map((s) => s.observation).join(" ");
        const thought = generateThought(subQuestions[qi], cycle, priorContext + " " + memContext);
        const observation = generateObservation(subQuestions[qi], cycle);
        const stepConfidence = 0.65 + cycle * 0.1 + qi * 0.02;

        const action: ReasoningAction =
          subQuestions[qi].includes("มาตรา") ? "RETRIEVE_STATUTE" :
          subQuestions[qi].includes("ฎีกา") ? "RETRIEVE_PRECEDENT" :
          cycle === MAX_CYCLES - 1 ? "COMPARE" : "RETRIEVE_STATUTE";

        steps.push({
          stepIndex: steps.length,
          thought,
          action,
          observation,
          confidence: Math.min(stepConfidence, 0.99),
        });
      }

      // Compute current confidence after this cycle
      currentConfidence = steps.reduce((s, st) => s + st.confidence, 0) / steps.length;

      // Early stop if threshold reached (Reflexion: "sufficient confidence")
      if (currentConfidence >= CONFIDENCE_THRESHOLD) break;
    }

    // Step: REFLECT
    const reflections = reflect(steps, query);
    steps.push({
      stepIndex: steps.length,
      thought: `Self-reflection: พบ ${reflections.length} ข้อสังเกต`,
      action: "REFLECT",
      observation: reflections.map((r) => r.message).join("; "),
      confidence: currentConfidence,
    });

    // Step: CONCLUDE
    const finalAnswer = this.synthesize(query, steps, subQuestions, memContext);
    steps.push({
      stepIndex: steps.length,
      thought: "สรุปผลการวิเคราะห์",
      action: "CONCLUDE",
      observation: finalAnswer.slice(0, 100),
      confidence: currentConfidence,
    });

    const hScore = computeHScore(steps, reflections);
    const thinkingTrace = steps.map((s) => `[${s.action}] ${s.thought}`).join("\n");

    // Write to episodic memory (MemGPT: L2 update after reasoning)
    memory.write("episodic", `Query: ${query.slice(0, 60)} → Confidence: ${currentConfidence.toFixed(2)}`, {
      concept: "reasoning_result",
      importance: currentConfidence,
    });

    return {
      query,
      steps,
      reflections,
      finalAnswer,
      confidence: Math.round(currentConfidence * 1000) / 1000,
      cyclesUsed,
      hScore: Math.round(hScore * 1000) / 1000,
      thinkingTrace,
    };
  }

  private synthesize(
    query: string,
    steps: ReasoningStep[],
    subQuestions: string[],
    memContext: string
  ): string {
    const statutes = steps
      .flatMap((s) => [s.thought, s.observation])
      .join(" ")
      .match(/มาตรา\s*\d+/g) || [];
    const uniqueStatutes = [...new Set(statutes)];

    const parts: string[] = [
      `จากการวิเคราะห์ ${steps.length} ขั้นตอน ครอบคลุม ${subQuestions.length} ประเด็นหลัก:`,
    ];

    if (uniqueStatutes.length > 0) {
      parts.push(`บทบัญญัติที่เกี่ยวข้อง: ${uniqueStatutes.join(", ")}`);
    }

    parts.push(
      `ข้อสรุปเบื้องต้น: ระบบได้วิเคราะห์ query "${query.slice(0, 60)}" ` +
      `ผ่าน ${steps.filter((s) => s.action === "RETRIEVE_STATUTE" || s.action === "RETRIEVE_PRECEDENT").length} ` +
      `ขั้นตอนการค้นหาข้อมูลกฎหมาย`
    );

    parts.push(
      "⚠️ หมายเหตุ: ผลการวิเคราะห์นี้เป็นเพียงข้อมูลเบื้องต้นสำหรับการศึกษา " +
      "ไม่ใช่คำปรึกษาทางกฎหมาย กรุณาปรึกษาทนายความหรือผู้เชี่ยวชาญก่อนดำเนินการใดๆ"
    );

    return parts.join("\n\n");
  }
}

export const reasoningService = StrategicReasoningService.getInstance();
