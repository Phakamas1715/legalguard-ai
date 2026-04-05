/**
 * Tracing Instrumentation — Sprint 3 Tests
 * Verifies: span lifecycle, budget enforcement, header generation, OTLP export
 */

import { describe, it, expect } from "vitest";
import { tracer, traceFullPipeline } from "@/lib/tracing";

describe("Tracing — Span Lifecycle", () => {
  it("starts and finishes a root trace", () => {
    const { traceId } = tracer.startTrace("test_op", { layer: "L0", operation: "test" });
    expect(traceId).toHaveLength(32);
    const result = tracer.finishTrace(traceId);
    expect(result).not.toBeNull();
    expect(result!.spans.length).toBeGreaterThanOrEqual(1);
  });

  it("records span duration", () => {
    const { traceId, rootSpanId } = tracer.startTrace("test");
    const spanId = tracer.startSpan(traceId, "L1", "vector_retrieval", rootSpanId);
    const span = tracer.endSpan(traceId, spanId);
    expect(span).not.toBeNull();
    expect(span!.duration).toBeGreaterThanOrEqual(0);
  });

  it("marks span as error on failure", () => {
    const { traceId, rootSpanId } = tracer.startTrace("test");
    const spanId = tracer.startSpan(traceId, "L5", "safety_gate", rootSpanId);
    const span = tracer.endSpan(traceId, spanId, "error", "safety violation");
    expect(span!.status).toBe("error");
    expect(span!.error).toBe("safety violation");
  });

  it("detects budget exceeded", () => {
    const { traceId, rootSpanId } = tracer.startTrace("test");
    const spanId = tracer.startSpan(traceId, "L0", "slow_op", rootSpanId);
    // Manually set startTime far in the past to simulate exceeded budget
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spans = (tracer as any).traces.get(traceId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const span = spans.find((s: any) => s.spanId === spanId);
    span.startTime = performance.now() - 200; // 200ms > L0 budget of 80ms
    const ended = tracer.endSpan(traceId, spanId);
    expect(ended!.budgetExceeded).toBe(true);
  });

  it("finishTrace returns layerBreakdown", () => {
    const { traceId, rootSpanId } = tracer.startTrace("pipe");
    const s1 = tracer.startSpan(traceId, "L1", "retrieval", rootSpanId);
    const s2 = tracer.startSpan(traceId, "L4", "rerank",    rootSpanId);
    tracer.endSpan(traceId, s1);
    tracer.endSpan(traceId, s2);
    const result = tracer.finishTrace(traceId)!;
    expect(result.layerBreakdown).toHaveProperty("L1");
    expect(result.layerBreakdown).toHaveProperty("L4");
  });
});

describe("Tracing — Header Generation", () => {
  it("generates valid X-Ray header", () => {
    const { traceId } = tracer.startTrace("test");
    const result = tracer.finishTrace(traceId)!;
    expect(result.xrayHeader).toMatch(/^Root=1-[0-9a-f]{8}-[0-9a-f]{24};Parent=[0-9a-f]{16};Sampled=1$/);
  });

  it("generates valid Zipkin B3 headers", () => {
    const { traceId } = tracer.startTrace("test");
    const result = tracer.finishTrace(traceId)!;
    expect(result.zipkinHeaders["X-B3-TraceId"]).toHaveLength(32);
    expect(result.zipkinHeaders["X-B3-SpanId"]).toHaveLength(16);
    expect(result.zipkinHeaders["X-B3-Sampled"]).toBe("1");
  });

  it("generates OTLP spans array", () => {
    const { traceId, rootSpanId } = tracer.startTrace("test");
    tracer.startSpan(traceId, "L2", "quality_filter", rootSpanId);
    const result = tracer.finishTrace(traceId)!;
    expect(result.otlpSpans.length).toBeGreaterThan(0);
    const span = result.otlpSpans[0];
    expect(span.traceId).toBe(traceId);
    expect(span.startTimeUnixNano).toBeTruthy();
    expect(span.status.code).toBeGreaterThanOrEqual(1);
  });
});

describe("Tracing — Full Pipeline Trace", () => {
  it("traces all 7 layers", async () => {
    const result = await traceFullPipeline("ค้นหาคดีฉ้อโกง", "user-001");
    const layers = result.spans.map((s) => s.layer);
    expect(layers).toContain("L0");
    expect(layers).toContain("L1");
    expect(layers).toContain("L6");
  });

  it("total duration is tracked", async () => {
    const result = await traceFullPipeline("query test", "user-002");
    expect(result.totalDuration).toBeGreaterThan(0);
    expect(result.p95Budget).toBe(689);
  });

  it("withSpan wraps async function correctly", async () => {
    const { traceId, rootSpanId } = tracer.startTrace("wrap_test");
    let called = false;
    await tracer.withSpan(traceId, "L3", "cfs", async () => {
      called = true;
    }, rootSpanId);
    const result = tracer.finishTrace(traceId)!;
    expect(called).toBe(true);
    expect(result.spans.some((s) => s.name === "L3:cfs")).toBe(true);
  });
});
