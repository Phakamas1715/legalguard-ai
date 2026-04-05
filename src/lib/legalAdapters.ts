import { logAuditEntry } from "./auditLog";

/**
 * Legal Query Planner (Juad RagQueryRouter)
 * Analyzes the query and decides the optimal retrieval strategy: Vector, Graph, SQL, or Hybrid.
 */

export type RetrievalStrategy = "VECTOR" | "GRAPH" | "SQL" | "HYBRID";

export interface LegalQueryPlan {
  strategy: RetrievalStrategy;
  reasoning: string;
  entities: string[];
  tables: string[];
}

export class LegalQueryPlanner {
  public static plan(query: string): LegalQueryPlan {
    const q = query.toLowerCase();
    
    // 1. SQL Strategy: Statistics/Count requests
    if (q.includes("กี่") || q.includes("สถิติ") || q.includes("จำนวน") || q.includes("เฉลี่ย")) {
      return {
        strategy: "SQL",
        reasoning: "Query indicates a statistical request (count/average), routing to SQL Statistics Engine.",
        entities: this.extractEntities(q),
        tables: ["case_statistics", "judgments"]
      };
    }

    // 2. Graph Strategy: Relationship/Citation requests
    if (q.includes("มาตรา") && (q.includes("อ้างอิง") || q.includes("เชื่อมโยง") || q.includes("บรรทัดฐาน"))) {
      return {
        strategy: "GRAPH",
        reasoning: "Query seeks relationships between statutes and judgments, routing to Legal Relationship Map.",
        entities: this.extractEntities(q),
        tables: ["rag_graph_nodes", "rag_graph_edges"]
      };
    }

    // 3. Hybrid/Vector: Default semantic search
    return {
      strategy: "HYBRID",
      reasoning: "Standard legal semantic query, using hybrid Vector (semantic) + BM25 (keyword) retrieval.",
      entities: this.extractEntities(q),
      tables: ["rag_documents", "rag_document_chunks"]
    };
  }

  private static extractEntities(query: string): string[] {
    const entities: string[] = [];
    const statuteMatch = query.match(/มาตรา\s*(\d+)/g);
    if (statuteMatch) entities.push(...statuteMatch);
    
    const keywords = ["ฉ้อโกง", "ลักทรัพย์", "157", "ปกครอง", "ภาษี"];
    keywords.forEach(k => {
      if (query.includes(k)) entities.push(k);
    });
    
    return entities;
  }
}

/**
 * Access Gatekeeper (GovernanceService)
 */
export class AccessGatekeeper {
  public static checkAccess(userId: string, documentId: string): boolean {
    // Simulated RBAC for Youth/Confidential cases
    if (documentId.startsWith("youth-") || documentId.includes("-ลับ")) {
      return userId === "judge_role" || userId === "system_admin";
    }
    return true;
  }
}

/**
 * Legal Statistics Engine (SqlAdapter)
 */
export class CaseStatisticsEngine {
  public static async query(plan: LegalQueryPlan): Promise<Record<string, unknown>> {
    // Simulated database query for stats
    return {
      total: 127800,
      matched: 450,
      avg_penalty: "2 ปี",
      distribution: { "2568": 120, "2567": 330 }
    };
  }
}
