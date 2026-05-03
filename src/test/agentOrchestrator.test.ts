import { beforeEach, describe, expect, it } from "vitest";
import { orchestrator } from "@/lib/agentOrchestrator";

describe("LegalMultiAgentOrchestrator", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns runtime metadata showing Feynman at L6", async () => {
    const { result } = await orchestrator.orchestrateWithTrace("ค้นหาคำพิพากษาฉ้อโกงออนไลน์มาตรา 341", "government");

    expect(result.engineRuntime).toBe("Feynman Multi-Agent Engine");
    expect(result.engineLayer).toBe("L6");
    expect(result.agentTimeline.length).toBeGreaterThanOrEqual(6);
  });

  it("emits real L0-L6 spans and nested L6 agent spans", async () => {
    const execution = await orchestrator.orchestrateWithTrace("สรุปแนวคำพิพากษาเกี่ยวกับการกู้ยืมเงินไม่คืน", "government");

    expect(execution.trace.spans.some((span) => span.layer === "L0")).toBe(true);
    expect(execution.trace.spans.some((span) => span.layer === "L1")).toBe(true);
    expect(execution.trace.spans.some((span) => span.layer === "L2")).toBe(true);
    expect(execution.trace.spans.some((span) => span.layer === "L3")).toBe(true);
    expect(execution.trace.spans.some((span) => span.layer === "L4")).toBe(true);
    expect(execution.trace.spans.some((span) => span.layer === "L5")).toBe(true);
    expect(execution.trace.spans.some((span) => span.layer === "L6")).toBe(true);

    const agentRoles = execution.trace.spans
      .filter((span) => span.layer === "L6" && typeof span.attributes.agentRole === "string")
      .map((span) => span.attributes.agentRole);

    expect(agentRoles).toContain("REASONING");
    expect(agentRoles).toContain("RESEARCHER");
    expect(agentRoles).toContain("COMPLIANCE");
    expect(agentRoles).toContain("REVIEWER");
    expect(agentRoles).toContain("SKEPTIC");
    expect(agentRoles).toContain("CONSENSUS");
  });
});
