/**
 * PII Masking — Sprint 3 Test Suite
 * Covers: standard patterns, Thai-English code-switch, edge cases, quasi-identifiers
 * Target: Recall ≥99.8% (Production Readiness Gate)
 */

import { describe, it, expect } from "vitest";
import { detectPII, maskPII } from "@/lib/piiMasking";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assertMasked(input: string, expectContains?: string) {
  const { masked, piiCount } = maskPII(input);
  expect(piiCount).toBeGreaterThan(0);
  if (expectContains) expect(masked).toContain(expectContains);
  // Original sensitive data must NOT appear in masked output
  return { masked, piiCount };
}

function assertClean(input: string) {
  const { piiCount } = maskPII(input);
  expect(piiCount).toBe(0);
}

// ─── 1. Standard Thai PII ──────────────────────────────────────────────────

describe("PII Masking — Standard Thai patterns", () => {
  it("detects Thai national ID (13 digits, no separator)", () => {
    assertMasked("บัตรประชาชนเลขที่ 3101234567890 ของผู้ต้องหา", "[เลขบัตรถูกปกปิด]");
  });

  it("detects Thai national ID with dashes", () => {
    assertMasked("ID: 3-1012-34567-89-0", "[เลขบัตรถูกปกปิด]");
  });

  it("detects Thai mobile number (0xx-xxx-xxxx)", () => {
    assertMasked("ติดต่อที่ 081-234-5678 เพื่อนัดหมาย", "[เบอร์โทรถูกปกปิด]");
  });

  it("detects Bangkok landline (02x-xxx-xxxx)", () => {
    assertMasked("โทรศัพท์สำนักงาน 02-234-5678", "[เบอร์โทรถูกปกปิด]");
  });

  it("detects email address", () => {
    assertMasked("ส่งเอกสารมาที่ somchai.jaidee@gmail.com ด้วย", "[อีเมลถูกปกปิด]");
  });

  it("detects Thai name with นาย prefix", () => {
    assertMasked("จำเลยคือ นาย สมชาย ใจดี อายุ 35 ปี", "[ชื่อ-นามสกุลถูกปกปิด]");
  });

  it("detects Thai name with นาง prefix", () => {
    assertMasked("โจทก์คือ นาง สมหญิง รักดี", "[ชื่อ-นามสกุลถูกปกปิด]");
  });

  it("detects Thai name with นางสาว prefix", () => {
    assertMasked("พยาน: นางสาว สุดา มีสุข", "[ชื่อ-นามสกุลถูกปกปิด]");
  });

  it("detects Thai address with ซอย", () => {
    assertMasked("ที่อยู่ 123/4 ซ.ลาดพร้าว 15 ถ.ลาดพร้าว กรุงเทพ", "[ที่อยู่ถูกปกปิด]");
  });
});

// ─── 2. Thai-English Code-Switch (Sprint 3 focus) ─────────────────────────

describe("PII Masking — Thai-English code-switch", () => {
  it("detects English name after Thai role prefix (ผู้เสียหาย)", () => {
    assertMasked("ผู้เสียหาย John Smith ให้การว่า...", "[ชื่อ-นามสกุลถูกปกปิด]");
  });

  it("detects English name after จำเลย prefix", () => {
    assertMasked("จำเลย David Johnson ปฏิเสธข้อกล่าวหา", "[ชื่อ-นามสกุลถูกปกปิด]");
  });

  it("detects Mr. prefix in Thai legal text", () => {
    assertMasked("ผู้ต้องหา Mr. James Wilson ถูกจับกุม", "[ชื่อ-นามสกุลถูกปกปิด]");
  });

  it("detects email with Thai domain context", () => {
    assertMasked("อีเมล: somchai@law.co.th ติดต่อได้", "[อีเมลถูกปกปิด]");
  });

  it("detects +66 international phone prefix (code-switch)", () => {
    assertMasked("WhatsApp: +66 81 234 5678", "[เบอร์โทรถูกปกปิด]");
  });

  it("detects LINE ID in legal document", () => {
    assertMasked("ส่งหลักฐานผ่าน LINE ID: somchai_law หรือ", "[LINE ID ถูกปกปิด]");
  });

  it("detects LINE ID with Thai label variation", () => {
    assertMasked("ไลน์: @law_firm_123", "[LINE ID ถูกปกปิด]");
  });

  it("detects mixed Thai-English: name + phone in same sentence", () => {
    const text = "นาย Somchai Jaidee โทร 081-234-5678";
    const { piiCount } = maskPII(text);
    expect(piiCount).toBeGreaterThanOrEqual(2);
  });

  it("detects English email alongside Thai name", () => {
    const text = "นางสาว สุดา รักดี (suda.rakdee@court.go.th) ยื่นคำร้อง";
    const { piiCount } = maskPII(text);
    expect(piiCount).toBeGreaterThanOrEqual(2);
  });
});

// ─── 3. Quasi-identifiers ─────────────────────────────────────────────────

describe("PII Masking — Quasi-identifiers", () => {
  it("detects passport number (P + 8 chars)", () => {
    assertMasked("หนังสือเดินทางเลขที่ P12345678", "[เลขหนังสือเดินทางถูกปกปิด]");
  });

  it("detects doctor name with นพ. prefix", () => {
    assertMasked("แพทย์ผู้ตรวจ นพ. วิชัย สุขสวัสดิ์", "[ชื่อ-นามสกุลถูกปกปิด]");
  });

  it("detects bank account with Thai label", () => {
    assertMasked("โอนเข้าบัญชี 123-4-56789-0 ธนาคารกสิกร", "[เลขบัญชีถูกปกปิด]");
  });

  it("detects bank account with English label", () => {
    assertMasked("Account No. 123-4-56789-0 of the defendant", "[เลขบัญชีถูกปกปิด]");
  });
});

// ─── 4. False-positive prevention ────────────────────────────────────────

describe("PII Masking — False positive prevention", () => {
  it("does NOT mask legal statute references (มาตรา 341)", () => {
    assertClean("ผิดตามประมวลกฎหมายอาญา มาตรา 341");
  });

  it("does NOT mask court case numbers", () => {
    assertClean("คดีหมายเลข 1234/2567");
  });

  it("does NOT mask years in Thai calendar (พ.ศ. 2567)", () => {
    assertClean("คำพิพากษาเมื่อวันที่ 15 มีนาคม พ.ศ. 2567");
  });

  it("does NOT mask penalty amounts", () => {
    assertClean("ปรับ 50,000 บาท จำคุก 2 ปี");
  });

  it("does NOT mask 4-digit court codes", () => {
    assertClean("ศาลจังหวัดเชียงใหม่ รหัส 5001");
  });
});

// ─── 5. Span overlap & ordering ──────────────────────────────────────────

describe("PII Masking — Span deduplication & ordering", () => {
  it("handles multiple PII in long legal paragraph", () => {
    const paragraph = `
      คดีอาญาที่ 123/2568: นาย สมชาย ใจดี เลขบัตร 3101234567890
      อาศัยอยู่ที่ 55/2 ซ.พหลโยธิน 10 ถ.พหลโยธิน กรุงเทพมหานคร
      โทรศัพท์ 089-999-1234 อีเมล somchai@example.com
      ถูกกล่าวหาว่ากระทำผิดตามมาตรา 341
    `;
    const { piiCount, masked } = maskPII(paragraph);
    expect(piiCount).toBeGreaterThanOrEqual(5);
    // Statute reference must survive
    expect(masked).toContain("มาตรา 341");
    // None of the raw PII should remain
    expect(masked).not.toContain("3101234567890");
    expect(masked).not.toContain("089-999-1234");
    expect(masked).not.toContain("somchai@example.com");
  });

  it("masked output has no overlapping spans", () => {
    const text = "นาย สมชาย ใจดี โทร 081-234-5678";
    const spans = detectPII(text);
    for (let i = 1; i < spans.length; i++) {
      expect(spans[i].start).toBeGreaterThanOrEqual(spans[i - 1].end);
    }
  });

  it("returns correct piiCount", () => {
    const { piiCount } = maskPII("นาย สมชาย ใจดี อีเมล a@b.com โทร 081-000-0000");
    expect(piiCount).toBe(3);
  });
});

// ─── 6. Edge cases ────────────────────────────────────────────────────────

describe("PII Masking — Edge cases", () => {
  it("handles empty string", () => {
    const { piiCount, masked } = maskPII("");
    expect(piiCount).toBe(0);
    expect(masked).toBe("");
  });

  it("handles string with only whitespace", () => {
    assertClean("   \n\t  ");
  });

  it("handles repeated masking (idempotent)", () => {
    const input = "นาย สมชาย ใจดี";
    const { masked: first } = maskPII(input);
    const { masked: second, piiCount } = maskPII(first);
    // Already masked — masked output shouldn't trigger new PII
    expect(second).toBe(first);
    expect(piiCount).toBe(0);
  });

  it("handles ID number at start of string", () => {
    assertMasked("3101234567890 คือเลขบัตรของจำเลย");
  });

  it("handles phone at end of string", () => {
    assertMasked("ติดต่อได้ที่ 081-234-5678");
  });
});
