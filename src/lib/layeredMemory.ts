/**
 * Layered Memory System — MemGPT-inspired (Packer et al., 2023)
 * "MemGPT: Towards LLMs as Operating Systems"
 *
 * 5 memory layers, analogous to OS memory hierarchy:
 *   L1 WorkingMemory    — in-context, token-limited, current turn
 *   L2 EpisodicMemory   — recent session events, auto-summarized
 *   L3 SemanticMemory   — factual legal knowledge, indexed by concept
 *   L4 PolicyMemory     — PDPA/access-control rules, immutable
 *   L5 PersistentMemory — long-term cross-session, summarized to avoid overflow
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MemoryEntry {
  id: string;
  content: string;
  layer: MemoryLayer;
  concept?: string;       // L3: concept key
  importance: number;     // 0–1, used for eviction policy
  createdAt: number;
  expiresAt?: number;     // L1/L2 can expire
  accessCount: number;
}

export type MemoryLayer = "working" | "episodic" | "semantic" | "policy" | "persistent";

export interface MemoryRecallResult {
  entry: MemoryEntry;
  relevanceScore: number;
  fromLayer: MemoryLayer;
}

export interface MemoryStats {
  l1Count: number;
  l2Count: number;
  l3Count: number;
  l4Count: number;
  l5Count: number;
  totalTokensEstimate: number;
  evictionsTotal: number;
}

export interface MemoryRetentionRule {
  layer: MemoryLayer;
  storageKey: string;
  limit: number;
  ttlMs: number | null;
}

export interface MemorySnapshot {
  version: 1;
  exportedAt: string;
  retentionPolicy: MemoryRetentionRule[];
  stats: MemoryStats;
  layers: Record<MemoryLayer, MemoryEntry[]>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEYS: Record<MemoryLayer, string> = {
  working:    "jm-l1-working",
  episodic:   "jm-l2-episodic",
  semantic:   "jm-l3-semantic",
  policy:     "jm-l4-policy",
  persistent: "jm-l5-persistent",
};

const LAYER_LIMITS: Record<MemoryLayer, number> = {
  working:    8,    // ~2k tokens in context
  episodic:   32,
  semantic:   200,
  policy:     50,   // policy entries are stable, rarely evicted
  persistent: 100,
};

const LAYER_TTL_MS: Record<MemoryLayer, number | null> = {
  working:    5 * 60 * 1000,   // 5 minutes
  episodic:   30 * 60 * 1000,  // 30 minutes
  semantic:   null,             // immortal
  policy:     null,             // immortal
  persistent: null,             // immortal
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

function load(layer: MemoryLayer): MemoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[layer]);
    return raw ? (JSON.parse(raw) as MemoryEntry[]) : [];
  } catch {
    return [];
  }
}

function save(layer: MemoryLayer, entries: MemoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS[layer], JSON.stringify(entries));
  } catch {
    // Storage full — evict oldest and retry
    const trimmed = entries.slice(0, Math.floor(LAYER_LIMITS[layer] / 2));
    try { localStorage.setItem(STORAGE_KEYS[layer], JSON.stringify(trimmed)); } catch { /* */ }
  }
}

function mkId(): string {
  return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Core class ───────────────────────────────────────────────────────────────

export class LayeredMemorySystem {
  private static instance: LayeredMemorySystem;
  private evictionsTotal = 0;
  private retentionIntervalId: number | null = null;

  private constructor() {
    this.initPolicyLayer();
  }

  public static getInstance(): LayeredMemorySystem {
    if (!LayeredMemorySystem.instance) {
      LayeredMemorySystem.instance = new LayeredMemorySystem();
    }
    return LayeredMemorySystem.instance;
  }

  // ── L4 Policy Layer bootstrap (PDPA + CAL-130 rules) ─────────────────────

  private initPolicyLayer(): void {
    const existing = load("policy");
    if (existing.length > 0) return; // already seeded

    const policies: Array<{ concept: string; content: string }> = [
      {
        concept: "PDPA_DATA_MINIMIZATION",
        content: "ข้อมูลส่วนบุคคลต้องถูกเก็บรวบรวมเท่าที่จำเป็นสำหรับวัตถุประสงค์ที่กำหนดไว้เท่านั้น (มาตรา 22 PDPA 2562)",
      },
      {
        concept: "PDPA_PURPOSE_LIMITATION",
        content: "ห้ามนำข้อมูลส่วนบุคคลไปใช้เพื่อวัตถุประสงค์อื่นนอกเหนือจากที่แจ้งแก่เจ้าของข้อมูล",
      },
      {
        concept: "CAL130_AUDIT_REQUIRED",
        content: "ทุก query และ agent decision ต้องถูกบันทึกใน immutable audit log พร้อม SHA-256 hash chain",
      },
      {
        concept: "ACCESS_YOUTH_CASES",
        content: "คดีที่เกี่ยวกับผู้เยาว์ (อายุต่ำกว่า 18 ปี) เข้าถึงได้เฉพาะ judge_role และ system_admin เท่านั้น",
      },
      {
        concept: "ETDA_DIGITAL_EVIDENCE",
        content: "พยานหลักฐานดิจิทัลต้องเป็นไปตามมาตรฐาน ETDA และ พ.ร.บ.ธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. 2544",
      },
      {
        concept: "AI_DISCLAIMER_REQUIRED",
        content: "AI ต้องระบุข้อความปฏิเสธความรับผิดชอบ (disclaimer) ทุกครั้งที่ให้คำแนะนำทางกฎหมาย",
      },
    ];

    const entries: MemoryEntry[] = policies.map((p) => ({
      id: mkId(),
      content: p.content,
      layer: "policy",
      concept: p.concept,
      importance: 1.0,
      createdAt: Date.now(),
      accessCount: 0,
    }));

    save("policy", entries);
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  public write(
    layer: MemoryLayer,
    content: string,
    options: { concept?: string; importance?: number } = {}
  ): MemoryEntry {
    if (layer === "policy") throw new Error("Policy layer is read-only at runtime.");

    const ttl = LAYER_TTL_MS[layer];
    const entry: MemoryEntry = {
      id: mkId(),
      content,
      layer,
      concept: options.concept,
      importance: options.importance ?? 0.5,
      createdAt: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : undefined,
      accessCount: 0,
    };

    const entries = this.getValid(layer);
    entries.unshift(entry);

    // Eviction: LRU + importance-based when over limit
    if (entries.length > LAYER_LIMITS[layer]) {
      entries.sort((a, b) => (b.importance * b.accessCount) - (a.importance * a.accessCount));
      const evicted = entries.splice(LAYER_LIMITS[layer]);
      this.evictionsTotal += evicted.length;

      // Cascade: summarize evicted L1 → L2
      if (layer === "working" && evicted.length > 0) {
        this.cascadeToEpisodic(evicted);
      }
    }

    save(layer, entries);
    return entry;
  }

  // ── Recall ────────────────────────────────────────────────────────────────

  /**
   * Recalls relevant entries across all 5 layers, ranked by relevance.
   * Simple TF-based relevance (no external embeddings required).
   */
  public recall(query: string, topK = 5): MemoryRecallResult[] {
    const layers: MemoryLayer[] = ["working", "episodic", "semantic", "policy", "persistent"];
    const results: MemoryRecallResult[] = [];

    for (const layer of layers) {
      const entries = this.getValid(layer);
      for (const entry of entries) {
        const score = this.relevance(query, entry);
        if (score > 0.1) {
          entry.accessCount += 1;
          results.push({ entry, relevanceScore: score, fromLayer: layer });
        }
      }
      save(layer, entries);
    }

    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return results.slice(0, topK);
  }

  /**
   * Retrieve a specific policy by concept key.
   */
  public getPolicy(concept: string): MemoryEntry | undefined {
    return load("policy").find((e) => e.concept === concept);
  }

  /**
   * Build the context string to inject into the LLM prompt (L1 + top recalls).
   * Summarizes to stay within token budget.
   */
  public buildContext(query: string, maxChars = 800): string {
    const working = this.getValid("working").slice(0, 4);
    const recalls = this.recall(query, 4).filter((r) => r.fromLayer !== "working");

    const lines: string[] = [];

    if (working.length > 0) {
      lines.push("## Working Memory (L1)");
      working.forEach((e) => lines.push(`- ${e.content.slice(0, 120)}`));
    }

    if (recalls.length > 0) {
      lines.push("## Retrieved Context");
      recalls.forEach((r) =>
        lines.push(`[${r.fromLayer.toUpperCase()}] ${r.entry.content.slice(0, 120)} (rel: ${r.relevanceScore.toFixed(2)})`)
      );
    }

    return lines.join("\n").slice(0, maxChars);
  }

  /**
   * Summarize and persist — called when context approaches overflow (MemGPT L5 pattern).
   */
  public summarizeToL5(summary: string, concept?: string): MemoryEntry {
    return this.write("persistent", summary, {
      concept: concept ?? "session_summary",
      importance: 0.8,
    });
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  public getStats(): MemoryStats {
    const layers: MemoryLayer[] = ["working", "episodic", "semantic", "policy", "persistent"];
    const counts = layers.map((l) => this.getValid(l).length);
    const totalChars = layers.reduce((sum, l) => sum + this.getValid(l).reduce((s, e) => s + e.content.length, 0), 0);
    return {
      l1Count: counts[0],
      l2Count: counts[1],
      l3Count: counts[2],
      l4Count: counts[3],
      l5Count: counts[4],
      totalTokensEstimate: Math.round(totalChars / 4), // ~4 chars/token
      evictionsTotal: this.evictionsTotal,
    };
  }

  public getRetentionPolicy(): MemoryRetentionRule[] {
    return (Object.keys(STORAGE_KEYS) as MemoryLayer[]).map((layer) => ({
      layer,
      storageKey: STORAGE_KEYS[layer],
      limit: LAYER_LIMITS[layer],
      ttlMs: LAYER_TTL_MS[layer],
    }));
  }

  public clearLayer(layer: MemoryLayer): void {
    if (layer === "policy") {
      return;
    }
    save(layer, []);
  }

  public clearRuntimeLayers(): void {
    const runtimeLayers: MemoryLayer[] = ["working", "episodic", "semantic", "persistent"];
    runtimeLayers.forEach((layer) => this.clearLayer(layer));
  }

  public pruneExpiredEntries(): MemoryStats {
    const layers: MemoryLayer[] = ["working", "episodic", "semantic", "policy", "persistent"];
    for (const layer of layers) {
      this.getValid(layer);
    }
    return this.getStats();
  }

  public startRetentionScheduler(intervalMs = 60_000): void {
    if (typeof window === "undefined") return;
    this.pruneExpiredEntries();
    if (this.retentionIntervalId !== null) {
      window.clearInterval(this.retentionIntervalId);
    }
    this.retentionIntervalId = window.setInterval(() => {
      this.pruneExpiredEntries();
    }, intervalMs);
  }

  public stopRetentionScheduler(): void {
    if (typeof window === "undefined") return;
    if (this.retentionIntervalId !== null) {
      window.clearInterval(this.retentionIntervalId);
      this.retentionIntervalId = null;
    }
  }

  public exportSnapshot(): MemorySnapshot {
    const layers = (Object.keys(STORAGE_KEYS) as MemoryLayer[]).reduce<Record<MemoryLayer, MemoryEntry[]>>(
      (accumulator, layer) => {
        accumulator[layer] = this.getValid(layer);
        return accumulator;
      },
      {
        working: [],
        episodic: [],
        semantic: [],
        policy: [],
        persistent: [],
      },
    );

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      retentionPolicy: this.getRetentionPolicy(),
      stats: this.getStats(),
      layers,
    };
  }

  public importSnapshot(snapshot: unknown, mode: "merge" | "replace" = "merge"): MemoryStats {
    const parsed = this.normalizeSnapshot(snapshot);
    if (!parsed) {
      throw new Error("Invalid memory snapshot");
    }

    const layers: MemoryLayer[] = ["working", "episodic", "semantic", "persistent"];
    for (const layer of layers) {
      const importedEntries = parsed.layers[layer] ?? [];
      if (mode === "replace") {
        save(layer, this.normalizeEntries(layer, importedEntries));
        continue;
      }

      const merged = this.mergeEntries(this.getValid(layer), importedEntries);
      save(layer, this.normalizeEntries(layer, merged));
    }

    // Policy layer remains seeded from runtime policy bootstrap.
    this.initPolicyLayer();
    return this.getStats();
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private getValid(layer: MemoryLayer): MemoryEntry[] {
    const now = Date.now();
    const rawEntries = load(layer);
    const entries = rawEntries.filter((e) => !e.expiresAt || e.expiresAt > now);
    if (entries.length !== rawEntries.length) {
      save(layer, entries);
    }
    return entries;
  }

  private cascadeToEpisodic(evicted: MemoryEntry[]): void {
    const summary = evicted.map((e) => e.content.slice(0, 60)).join("; ");
    this.write("episodic", `[Cascade from L1] ${summary}`, { importance: 0.4 });
  }

  /**
   * Token-free relevance: Jaccard-like overlap on Thai + English terms.
   */
  private relevance(query: string, entry: MemoryEntry): number {
    const normalize = (s: string) => s.toLowerCase().replace(/[^\u0E00-\u0E7Fa-z0-9\s]/g, " ");
    const qTokens = new Set(normalize(query).split(/\s+/).filter((t) => t.length > 1));
    const eTokens = new Set(normalize(entry.content).split(/\s+/).filter((t) => t.length > 1));

    if (qTokens.size === 0 || eTokens.size === 0) return 0;

    let overlap = 0;
    for (const t of qTokens) {
      if (eTokens.has(t)) overlap += 1;
    }

    const jaccard = overlap / (qTokens.size + eTokens.size - overlap);
    // Boost important entries
    return Math.min(jaccard * (1 + entry.importance * 0.5), 1);
  }

  private mergeEntries(existing: MemoryEntry[], incoming: MemoryEntry[]): MemoryEntry[] {
    const byId = new Map<string, MemoryEntry>();
    [...existing, ...incoming].forEach((entry) => {
      if (entry.id) {
        byId.set(entry.id, entry);
      }
    });
    return Array.from(byId.values()).sort((left, right) => right.createdAt - left.createdAt);
  }

  private normalizeEntries(layer: MemoryLayer, entries: MemoryEntry[]): MemoryEntry[] {
    const now = Date.now();
    const sanitized = entries
      .filter((entry): entry is MemoryEntry => this.isMemoryEntry(entry, layer))
      .filter((entry) => !entry.expiresAt || entry.expiresAt > now)
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, LAYER_LIMITS[layer]);

    return sanitized.map((entry) => ({
      ...entry,
      layer,
    }));
  }

  private normalizeSnapshot(snapshot: unknown): MemorySnapshot | null {
    if (!snapshot || typeof snapshot !== "object") return null;
    const candidate = snapshot as Partial<MemorySnapshot>;
    if (!candidate.layers || typeof candidate.layers !== "object") return null;

    const layers: Record<MemoryLayer, MemoryEntry[]> = {
      working: this.normalizeEntries("working", candidate.layers.working ?? []),
      episodic: this.normalizeEntries("episodic", candidate.layers.episodic ?? []),
      semantic: this.normalizeEntries("semantic", candidate.layers.semantic ?? []),
      policy: this.normalizeEntries("policy", candidate.layers.policy ?? []),
      persistent: this.normalizeEntries("persistent", candidate.layers.persistent ?? []),
    };

    return {
      version: 1,
      exportedAt: typeof candidate.exportedAt === "string" ? candidate.exportedAt : new Date().toISOString(),
      retentionPolicy: this.getRetentionPolicy(),
      stats: this.getStats(),
      layers,
    };
  }

  private isMemoryEntry(entry: unknown, layer: MemoryLayer): entry is MemoryEntry {
    if (!entry || typeof entry !== "object") return false;
    const candidate = entry as Partial<MemoryEntry>;
    return (
      typeof candidate.id === "string"
      && typeof candidate.content === "string"
      && typeof candidate.importance === "number"
      && typeof candidate.createdAt === "number"
      && (candidate.layer === undefined || candidate.layer === layer)
      && (candidate.expiresAt === undefined || typeof candidate.expiresAt === "number")
      && (candidate.concept === undefined || typeof candidate.concept === "string")
      && typeof candidate.accessCount === "number"
    );
  }
}

export const memory = LayeredMemorySystem.getInstance();
