// PII Masking Engine — detect and mask personal information in Thai legal text

export interface PIISpan {
  start: number;
  end: number;
  type: "name" | "id_card" | "phone" | "address" | "email" | "bank_account";
  original: string;
  masked: string;
}

const PII_PATTERNS: { type: PIISpan["type"]; regex: RegExp; mask: string }[] = [
  // Thai national ID: 13 digits with optional dashes/spaces
  { type: "id_card", regex: /\b[0-9]{1}[-\s]?[0-9]{4}[-\s]?[0-9]{5}[-\s]?[0-9]{2}[-\s]?[0-9]{1}\b/g, mask: "[เลขบัตรถูกปกปิด]" },
  // Thai phone: +66, 0x-xxx-xxxx (mobile/landline), 0x-xxxx-xxxx (Bangkok 02x)
  { type: "phone", regex: /(\+66[-\s]?[0-9]{1,2}[-\s]?[0-9]{3,4}[-\s]?[0-9]{4}|0[2689][-\s]?[0-9]{3,4}[-\s]?[0-9]{4}|0[0-9]{2}[-\s]?[0-9]{3}[-\s]?[0-9]{4}|0[0-9]{2}[-\s]?[0-9]{7})/g, mask: "[เบอร์โทรถูกปกปิด]" },
  // Email — including Thai-subdomain and code-switch patterns
  { type: "email", regex: /\b[A-Za-z0-9._%+-ก-๙]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, mask: "[อีเมลถูกปกปิด]" },
  // Bank account: 10-digit Thai bank pattern (may appear with Thai labels)
  { type: "bank_account", regex: /(?:บัญชี(?:เลขที่)?|account\s*no\.?|acct\.?)[:\s]*([0-9]{3}[-\s]?[0-9]{1}[-\s]?[0-9]{5}[-\s]?[0-9]{1})|(?<!\d)[0-9]{3}[-\s]?[0-9]{1}[-\s]?[0-9]{5}[-\s]?[0-9]{1}(?!\d)/gi, mask: "[เลขบัญชีถูกปกปิด]" },
  // Thai address patterns (standard + abbreviated)
  { type: "address", regex: /\d{1,4}\/\d{1,4}\s+(หมู่|ม\.|ซ\.|ซอย|ถ\.|ถนน|ต\.|ตำบล|อ\.|อำเภอ|จ\.|จังหวัด)[^\n]{5,60}/g, mask: "[ที่อยู่ถูกปกปิด]" },
  // Thai names with prefix — pure Thai, pure English, or code-switch mixed
  { type: "name", regex: /(นาย|นาง(?:สาว)?|น\.ส\.|ด\.ช\.|ด\.ญ\.|Mr\.|Mrs\.|Ms\.|Miss|นพ\.|พญ\.)\s*[ก-๙A-Za-z]{2,}(?:\s+[ก-๙A-Za-z]{2,})+/g, mask: "[ชื่อ-นามสกุลถูกปกปิด]" },
  // Code-switch: English name pattern after Thai case prefix (e.g., "ผู้เสียหาย John Smith")
  { type: "name", regex: /(?:ผู้(?:เสียหาย|กล่าวหา|ต้องหา|ถูกกล่าวหา)|จำเลย|โจทก์|พยาน)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/g, mask: "[ชื่อ-นามสกุลถูกปกปิด]" },
  // Thai passport number (P + 8 alphanumeric) — quasi-identifier
  { type: "id_card", regex: /\b[Pp][A-Za-z0-9]{8}\b/g, mask: "[เลขหนังสือเดินทางถูกปกปิด]" },
  // LINE ID / social handle appearing in legal docs (code-switch context, with or without @)
  { type: "phone", regex: /(?:LINE\s*(?:ID)?|line\s*(?:id)?|ไลน์\s*(?:ID|id)?)[:\s]+@?[A-Za-z0-9._\-ก-๙]{3,30}/gi, mask: "[LINE ID ถูกปกปิด]" },
];

export function detectPII(text: string): PIISpan[] {
  const spans: PIISpan[] = [];
  for (const pattern of PII_PATTERNS) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    while ((match = regex.exec(text)) !== null) {
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        type: pattern.type,
        original: match[0],
        masked: pattern.mask,
      });
    }
  }
  // Sort by start position and remove overlaps
  spans.sort((a, b) => a.start - b.start);
  const filtered: PIISpan[] = [];
  let lastEnd = -1;
  for (const span of spans) {
    if (span.start >= lastEnd) {
      filtered.push(span);
      lastEnd = span.end;
    }
  }
  return filtered;
}

export function maskPII(text: string): { masked: string; spans: PIISpan[]; piiCount: number } {
  const spans = detectPII(text);
  if (spans.length === 0) return { masked: text, spans: [], piiCount: 0 };

  let result = "";
  let cursor = 0;
  for (const span of spans) {
    result += text.slice(cursor, span.start) + span.masked;
    cursor = span.end;
  }
  result += text.slice(cursor);

  return { masked: result, spans, piiCount: spans.length };
}

export const PII_TYPE_LABELS: Record<PIISpan["type"], string> = {
  name: "ชื่อ-นามสกุล",
  id_card: "เลขบัตรประชาชน",
  phone: "เบอร์โทรศัพท์",
  address: "ที่อยู่",
  email: "อีเมล",
  bank_account: "เลขบัญชีธนาคาร",
};
