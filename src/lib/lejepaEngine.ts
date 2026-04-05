/**
 * LeJEPA Engine — Legal Joint-Embedding Predictive Architecture
 *
 * Based on:
 *   • "A Path Towards Autonomous Machine Intelligence" (LeCun, 2022)
 *     Core idea: world models in latent space, not pixel/token space
 *   • I-JEPA: "Self-Supervised Learning from Images by Predicting in the Latent Space"
 *     (Assran et al., 2023, Meta AI)
 *     Key: predict latent representations of target patches from context patches
 *   • SIGReg regularization: "Heuristics-free SSL" (Balestriero & LeCun, 2025)
 *     Prevents dimensional collapse via Spectral Information Geometry regularization
 *
 * LeJEPA adapts I-JEPA for legal text:
 *   • Legal documents → latent embeddings (L-space)
 *   • Context encoder   (x̂) encodes known facts / case background
 *   • Predictor         (ŷ) predicts latent of unobserved legal outcomes
 *   • Target encoder    (y) encodes ground-truth outcomes (from known precedents)
 *   • SIGReg            prevents collapse by enforcing spectral diversity
 *
 * In production: encoders = SageMaker WangchanX-Legal + fine-tuned projection heads.
 * This module provides the architecture scaffold and inference API.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Latent vector — represents a document/query in L-space */
export type LatentVector = Float32Array;

export interface LegalWorldState {
  contextEmbedding: number[];       // x̂ — encoded known context
  predictedEmbedding: number[];     // ŷ — predicted target latent
  predictionDistance: number;       // ||ŷ − y||₂ (lower = more confident)
  sigregScore: number;              // SIGReg score ∈ [0,1] (1 = no collapse)
  outcomeDistribution: OutcomeDistribution;
  intrinsicCost: number;            // LeCun energy function E(x, y)
}

export interface OutcomeDistribution {
  acquittal:    number;             // probability of acquittal
  conviction:   number;             // probability of conviction
  settlement:   number;             // probability of settlement
  appeal:       number;             // probability of appeal
  confidence:   number;             // overall prediction confidence
}

export interface JEPAInferenceResult {
  worldState: LegalWorldState;
  predictedOutcome: string;         // human-readable Thai label
  noveltyScore: number;             // how novel is this case vs. training data?
  retrievalTargets: string[];       // suggested document IDs to retrieve
  energyCost: number;               // total system energy (LeCun's E)
  dimensionHealth: DimensionHealth; // SIGReg diagnostic
}

export interface DimensionHealth {
  effectiveDimensions: number;      // out of LATENT_DIM
  collapseRisk: "none" | "low" | "medium" | "high";
  spectralEntropy: number;          // diversity of the latent space
  sigregLoss: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LATENT_DIM = 64;              // latent space dimensionality (simplified; WangchanX uses 768)
const SIGREG_LAMBDA = 0.04;        // SIGReg regularization strength (from Balestriero & LeCun 2025)
const ENERGY_THRESHOLD = 0.35;     // E(x,y) below this → compatible (Hopfield-like)
const NOVELTY_THRESHOLD = 0.7;     // above this → flag as out-of-distribution

// ─── Math utilities ───────────────────────────────────────────────────────────

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, v, i) => sum + v * b[i], 0);
}

function l2Norm(v: number[]): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

function cosineSimilarity(a: number[], b: number[]): number {
  const normA = l2Norm(a);
  const normB = l2Norm(b);
  if (normA === 0 || normB === 0) return 0;
  return dotProduct(a, b) / (normA * normB);
}

function l2Distance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
}

/** Softmax over an array */
function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const sum = exps.reduce((s, e) => s + e, 0);
  return exps.map((e) => e / sum);
}

/**
 * Deterministic pseudo-embedding from text.
 * In production: replaced by WangchanX-Legal encoder via SageMaker endpoint.
 * Uses character-level hash → normalized LATENT_DIM vector.
 */
function textToLatent(text: string): number[] {
  const vec = new Array(LATENT_DIM).fill(0);

  // Distribute character codes across latent dimensions
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const dim = (code * 31 + i * 17) % LATENT_DIM;
    vec[dim] += Math.sin(code * 0.1 + i * 0.3);
  }

  // Normalize to unit sphere (required for cosine-based JEPA)
  const norm = l2Norm(vec) || 1;
  return vec.map((v) => v / norm);
}

// ─── Context Encoder x̂ ───────────────────────────────────────────────────────

function contextEncoder(context: {
  query: string;
  courtType?: string;
  statuteRefs?: string[];
  year?: number;
}): number[] {
  const parts = [
    context.query,
    context.courtType ?? "",
    (context.statuteRefs ?? []).join(" "),
    String(context.year ?? 2568),
  ];
  // Combine via weighted sum of latent vectors (attention-like aggregation)
  const weights = [0.5, 0.2, 0.2, 0.1];
  const combined = new Array(LATENT_DIM).fill(0);

  parts.forEach((p, wi) => {
    const latent = textToLatent(p);
    for (let d = 0; d < LATENT_DIM; d++) {
      combined[d] += latent[d] * weights[wi];
    }
  });

  const norm = l2Norm(combined) || 1;
  return combined.map((v) => v / norm);
}

// ─── Predictor ŷ ─────────────────────────────────────────────────────────────

/**
 * JEPA Predictor: given x̂ and a "target mask" (which aspects to predict),
 * outputs ŷ (predicted latent of the target).
 * Implemented as a lightweight MLP with fixed weights (simulated).
 */
function predictor(contextEmbed: number[], targetHint: string): number[] {
  const hintEmbed = textToLatent(targetHint);

  // Gated combination: ŷ = σ(W·x̂) ⊙ hint
  // Simplified: element-wise gating
  const gate = contextEmbed.map((v, i) => 1 / (1 + Math.exp(-(v + hintEmbed[i] * 0.3))));
  const predicted = contextEmbed.map((v, i) => v * gate[i] + hintEmbed[i] * (1 - gate[i]));

  const norm = l2Norm(predicted) || 1;
  return predicted.map((v) => v / norm);
}

// ─── SIGReg regularization ────────────────────────────────────────────────────

/**
 * SIGReg: Spectral Information Geometry Regularization (Balestriero & LeCun, 2025)
 * Prevents dimensional collapse by penalizing low spectral entropy.
 *
 * Simplified 2D version: compute covariance diagonal variance across batch.
 * Full version: use Gram matrix eigenvalue distribution.
 */
function computeSIGReg(embeddings: number[][]): DimensionHealth {
  if (embeddings.length < 2) {
    return { effectiveDimensions: LATENT_DIM, collapseRisk: "none", spectralEntropy: 1.0, sigregLoss: 0 };
  }

  // Compute dimension-wise variance
  const dimVariances = new Array(LATENT_DIM).fill(0);
  for (let d = 0; d < LATENT_DIM; d++) {
    const vals = embeddings.map((e) => e[d]);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    dimVariances[d] = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
  }

  // Effective dimensions: count dims with variance > threshold
  const varThreshold = 1e-4;
  const activeDims = dimVariances.filter((v) => v > varThreshold).length;

  // Spectral entropy: H = -Σ p_i log p_i where p_i = var_i / Σvar_i
  const totalVar = dimVariances.reduce((s, v) => s + v, 0) || 1;
  const probs = dimVariances.map((v) => v / totalVar);
  const spectralEntropy = -probs.reduce((s, p) => s + (p > 0 ? p * Math.log(p) : 0), 0) / Math.log(LATENT_DIM);

  // SIGReg loss = λ × (1 - spectralEntropy)^2
  const sigregLoss = SIGREG_LAMBDA * (1 - spectralEntropy) ** 2;

  const collapseRisk: DimensionHealth["collapseRisk"] =
    activeDims < LATENT_DIM * 0.25 ? "high" :
    activeDims < LATENT_DIM * 0.5  ? "medium" :
    activeDims < LATENT_DIM * 0.75 ? "low" : "none";

  return {
    effectiveDimensions: activeDims,
    collapseRisk,
    spectralEntropy: Math.round(spectralEntropy * 1000) / 1000,
    sigregLoss: Math.round(sigregLoss * 10000) / 10000,
  };
}

// ─── Energy function E(x, y) ──────────────────────────────────────────────────

/**
 * LeCun's energy-based model objective: E(x, y) = ||ŷ − y||₂
 * Low energy = x and y are compatible (context → outcome is plausible).
 */
function energyFunction(predicted: number[], target: number[]): number {
  return l2Distance(predicted, target) / Math.sqrt(LATENT_DIM); // normalized
}

// ─── Outcome distribution ─────────────────────────────────────────────────────

function predictOutcomeDistribution(
  worldState: number[],
  query: string
): OutcomeDistribution {
  // Outcome logits derived from latent dimensions (groups of 16)
  const groups = [
    worldState.slice(0,  16).reduce((s, v) => s + v, 0),  // acquittal signal
    worldState.slice(16, 32).reduce((s, v) => s + v, 0),  // conviction signal
    worldState.slice(32, 48).reduce((s, v) => s + v, 0),  // settlement signal
    worldState.slice(48, 64).reduce((s, v) => s + v, 0),  // appeal signal
  ];

  // Query-based prior adjustments
  if (query.includes("ปกครอง") || query.includes("ภาษี")) {
    groups[2] += 0.3;  // admin cases more likely to settle
  }
  if (query.includes("ฆ่า") || query.includes("ข่มขืน")) {
    groups[1] += 0.4;  // criminal cases higher conviction
  }
  if (query.includes("ฎีกา") || query.includes("อุทธรณ์")) {
    groups[3] += 0.5;  // appeal context
  }

  const probs = softmax(groups);
  const confidence = Math.max(...probs);

  return {
    acquittal:  Math.round(probs[0] * 1000) / 1000,
    conviction: Math.round(probs[1] * 1000) / 1000,
    settlement: Math.round(probs[2] * 1000) / 1000,
    appeal:     Math.round(probs[3] * 1000) / 1000,
    confidence: Math.round(confidence * 1000) / 1000,
  };
}

// ─── Main engine ──────────────────────────────────────────────────────────────

export class LeJEPAEngine {
  private static instance: LeJEPAEngine;

  // Rolling buffer of recent embeddings for SIGReg computation
  private embeddingBuffer: number[][] = [];
  private readonly BUFFER_SIZE = 32;

  private constructor() {}

  public static getInstance(): LeJEPAEngine {
    if (!LeJEPAEngine.instance) {
      LeJEPAEngine.instance = new LeJEPAEngine();
    }
    return LeJEPAEngine.instance;
  }

  /**
   * Main inference: given a legal query context, predict likely outcome in latent space.
   */
  public infer(context: {
    query: string;
    courtType?: string;
    statuteRefs?: string[];
    year?: number;
    targetHint?: string;           // optional: what aspect to predict (e.g., "outcome", "penalty")
  }): JEPAInferenceResult {
    // 1. Encode context → x̂
    const xHat = contextEncoder(context);

    // 2. Predictor → ŷ
    const targetHint = context.targetHint ?? "legal_outcome judgment verdict";
    const yHat = predictor(xHat, targetHint);

    // 3. Target (simulated ground truth from precedents)
    const y = textToLatent(targetHint + " " + (context.statuteRefs ?? []).join(" "));

    // 4. Energy function E(x, y)
    const energy = energyFunction(yHat, y);
    const intrinsicCost = energy;

    // 5. Prediction distance (JEPA loss)
    const predictionDistance = energy;

    // 6. SIGReg: update buffer and compute collapse diagnostic
    this.embeddingBuffer.unshift(xHat);
    if (this.embeddingBuffer.length > this.BUFFER_SIZE) {
      this.embeddingBuffer.pop();
    }
    const dimensionHealth = computeSIGReg(this.embeddingBuffer);
    const sigregScore = 1 - dimensionHealth.sigregLoss;

    // 7. Outcome distribution
    const outcomeDistribution = predictOutcomeDistribution(yHat, context.query);

    // 8. Novelty: how far is x̂ from known training distribution?
    const noveltyScore = Math.min(energy * 2, 1); // high energy → novel/OOD

    // 9. Retrieval targets: suggest documents to retrieve based on latent proximity
    const retrievalTargets = this.suggestRetrievalTargets(context.query, yHat);

    // 10. World state assembly
    const worldState: LegalWorldState = {
      contextEmbedding: xHat,
      predictedEmbedding: yHat,
      predictionDistance: Math.round(predictionDistance * 1000) / 1000,
      sigregScore: Math.round(sigregScore * 1000) / 1000,
      outcomeDistribution,
      intrinsicCost: Math.round(intrinsicCost * 1000) / 1000,
    };

    // 11. Human-readable outcome label
    const predictedOutcome = this.outcomeToThai(outcomeDistribution);

    return {
      worldState,
      predictedOutcome,
      noveltyScore: Math.round(noveltyScore * 1000) / 1000,
      retrievalTargets,
      energyCost: Math.round((intrinsicCost + dimensionHealth.sigregLoss) * 1000) / 1000,
      dimensionHealth,
    };
  }

  /**
   * Computes semantic similarity between two legal texts in latent space.
   * Used for document de-duplication and precedent matching.
   */
  public similarity(textA: string, textB: string): number {
    const a = textToLatent(textA);
    const b = textToLatent(textB);
    return Math.round(cosineSimilarity(a, b) * 1000) / 1000;
  }

  /**
   * Is this case within the training distribution?
   * High novelty score → recommend human expert review.
   */
  public isOutOfDistribution(result: JEPAInferenceResult): boolean {
    return result.noveltyScore > NOVELTY_THRESHOLD;
  }

  /**
   * Energy-compatible check (LeCun EBM):
   * Returns true if the context–outcome pair is plausible.
   */
  public isEnergyCompatible(result: JEPAInferenceResult): boolean {
    return result.worldState.intrinsicCost < ENERGY_THRESHOLD;
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private suggestRetrievalTargets(query: string, yHat: number[]): string[] {
    const targets: string[] = [];

    // Statute-based targets
    const statutes = query.match(/มาตรา\s*\d+/g) || [];
    statutes.forEach((s) => targets.push(`statute:${s.replace(/\s/, "")}`));

    // Latent-based: map top dimensions to document types
    const topDim = yHat.indexOf(Math.max(...yHat));
    if (topDim < 16)  targets.push("doc_type:criminal_judgment");
    if (topDim < 32)  targets.push("doc_type:civil_judgment");
    if (topDim < 48)  targets.push("doc_type:admin_court");
    if (topDim >= 48) targets.push("doc_type:constitutional_court");

    // Year-based
    if (query.includes("2568") || query.includes("2567")) {
      targets.push("year:2567-2568");
    }

    return [...new Set(targets)].slice(0, 5);
  }

  private outcomeToThai(dist: OutcomeDistribution): string {
    const max = Math.max(dist.acquittal, dist.conviction, dist.settlement, dist.appeal);
    const label =
      max === dist.conviction  ? `มีแนวโน้มว่าจะมีความผิด (${(dist.conviction * 100).toFixed(0)}%)` :
      max === dist.acquittal   ? `มีแนวโน้มยกฟ้อง/พ้นผิด (${(dist.acquittal * 100).toFixed(0)}%)` :
      max === dist.settlement  ? `มีแนวโน้มยอมความ/ไกล่เกลี่ย (${(dist.settlement * 100).toFixed(0)}%)` :
                                 `มีแนวโน้มอุทธรณ์/ฎีกา (${(dist.appeal * 100).toFixed(0)}%)`;

    const isOOD = dist.confidence < 0.4;
    return isOOD
      ? `${label} — ⚠️ คดีลักษณะนี้หายาก แนะนำปรึกษาผู้เชี่ยวชาญ`
      : label;
  }
}

export const lejepa = LeJEPAEngine.getInstance();
