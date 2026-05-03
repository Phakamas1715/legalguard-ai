# Design: Lawyer Professional Suite — LegalGuard AI Commercial Product

## สถานะปัจจุบัน vs สิ่งที่ต้องสร้าง

### ✅ มีแล้ว (Foundation)
- Semantic Search (FAISS + BM25 + LeJEPA) — Hit@3 = 93.7%
- Case Analysis Page (`/analyze`) — วิเคราะห์สำนวนด้วย AI
- Precedent Compare (`/precedent-compare`) — เปรียบเทียบคดีคล้าย
- Case Outcome Prediction (`/predict`) — พยากรณ์ผลคดี
- Case Brief (`/case-brief`) — สรุปคดี 1 หน้า
- Prompt Templates — ซักค้าน, ตรวจพยาน
- Professional Dashboard (`/private-offering`) — หน้า landing
- RAG Chatbot น้องซื่อสัตย์
- PII Masking 9 รูปแบบ
- Anti-Hallucination 7 ชั้น

### ❌ ยังไม่มี (ต้องสร้างเพื่อขาย)
1. **Auth + Subscription** — ไม่มี login, ไม่มี payment, ไม่มี tier
2. **Lawyer role ใน backend** — มีแค่ใน UI, ไม่มีใน access_policy_service
3. **Case Workspace** — ไม่มีที่เก็บ case files ของทนายแต่ละคน
4. **Document Upload + OCR** — ทนายต้อง upload สำนวนเอง
5. **Contract/Document Drafting** — ร่างสัญญา, หนังสือทวงถาม, คำฟ้อง
6. **Legal Research History** — ประวัติค้นหา + bookmark
7. **Client Management** — จัดการลูกความ + คดี
8. **Export** — PDF report, Word document
9. **Billing Tracker** — บันทึกชั่วโมงทำงาน + ค่าทนาย

---

## Product Tiers

| Tier | ราคา/เดือน | ฟีเจอร์ |
|------|-----------|---------|
| Free | ฿0 | Search 10 ครั้ง/วัน, Chatbot, Case Brief (3/เดือน) |
| Pro | ฿990 | Unlimited search, Analyze, Predict, Precedent Compare, Prompt Templates, Export PDF |
| Team | ฿2,490 | Pro + 5 users, Client Management, Shared Workspace, Billing Tracker |
| Enterprise | Custom | Team + API access, Custom KB, On-premise, SLA |

---

## Phase 1 — MVP สำหรับขาย (2-3 สัปดาห์)

### 1.1 Auth + User Management

```
เทคโนโลยี: Supabase Auth (มีอยู่แล้ว) + Row Level Security
- Email/Password login
- Google OAuth
- สภาทนายความ ID (Phase 2)
```

### 1.2 Subscription + Payment
```
เทคโนโลยี: Stripe Checkout + Supabase
- Stripe Checkout สำหรับ Pro/Team
- Webhook → update user tier ใน Supabase
- Usage tracking (search count, analysis count)
- Free tier rate limiting
```

### 1.3 Lawyer Role ใน Backend
```python
# เพิ่มใน access_policy_service.py
"lawyer": {
    "classifications": {
        "public": True, "internal": True, "restricted": False,
        "sealed": False, "youth": False, "pii": False, "audit": False
    },
    "quality": 65,
    "features": {
        "search": True, "analyze": True, "predict": True,
        "precedent_compare": True, "case_brief": True,
        "prompt_templates": True, "document_draft": True,
        "judgment_draft": False,  # เฉพาะ judge
    }
}
```

### 1.4 Case Workspace (ที่เก็บงานของทนาย)
```sql
CREATE TABLE lawyer_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,           -- "คดีนายสมชาย กู้ยืม"
    case_type TEXT,               -- แพ่ง/อาญา/ปกครอง
    client_name TEXT,             -- ชื่อลูกความ (encrypted)
    status TEXT DEFAULT 'active', -- active/archived/closed
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workspace_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES lawyer_workspaces(id),
    item_type TEXT NOT NULL,      -- search/analysis/prediction/brief/document
    title TEXT,
    content JSONB,                -- ผลลัพธ์จาก AI
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.5 Document Upload + Analysis
```
- Upload PDF/Word → PyMuPDF extract → Thai chunking → embed
- ทนาย upload สำนวนคดี → AI วิเคราะห์ทันที
- เก็บใน S3 + link กับ workspace
- PII masking ก่อน process
```

### 1.6 Export PDF/Word
```
- ผลวิเคราะห์ → PDF report (WeasyPrint)
- Case Brief → 1-page PDF
- Precedent Compare → ตาราง PDF
- ใส่ watermark "AI-Generated — ต้องตรวจสอบก่อนใช้"
```

---

## Phase 2 — Professional Features (เดือนที่ 2-3)

### 2.1 Contract/Document Drafting
- ร่างสัญญากู้ยืม, สัญญาเช่า, สัญญาจ้าง
- ร่างหนังสือทวงถาม (ไปรษณีย์ลงทะเบียน)
- ร่างคำฟ้อง (แพ่ง/อาญา/ปกครอง)
- ร่างคำให้การ
- Template library + AI fill-in

### 2.2 Legal Research History + Bookmarks
- บันทึกทุกการค้นหา + ผลลัพธ์
- Bookmark คำพิพากษาสำคัญ
- Tag + categorize
- Share กับทีม (Team tier)

### 2.3 Client Management (Team tier)
- เพิ่มลูกความ + link กับ workspace
- Timeline คดี (วันนัด, deadline, เหตุการณ์สำคัญ)
- เอกสารลูกความ (encrypted)
- Conflict of interest check

### 2.4 Billing Tracker (Team tier)
- บันทึกชั่วโมงทำงานต่อคดี
- คำนวณค่าทนาย (hourly / flat fee / contingency)
- สร้างใบแจ้งหนี้ PDF
- รายงานรายได้รายเดือน

---

## Phase 3 — Enterprise (เดือนที่ 4+)

### 3.1 API Access
- REST API สำหรับ integrate กับระบบสำนักงานกฎหมาย
- Webhook สำหรับ case updates
- Bulk search API

### 3.2 Custom Knowledge Base
- สำนักงานกฎหมาย upload เอกสารภายใน
- Private vector index แยกต่อองค์กร
- ค้นหาข้ามทั้ง public KB + private KB

### 3.3 On-premise Deployment
- Docker compose สำหรับ deploy ในเครือข่ายสำนักงาน
- ข้อมูลไม่ออกนอกองค์กร
- Ollama local LLM

---

## Revenue Projection

| เดือน | Free Users | Pro (฿990) | Team (฿2,490) | MRR |
|-------|-----------|-----------|--------------|-----|
| 1 | 100 | 10 | 0 | ฿9,900 |
| 3 | 500 | 50 | 5 | ฿62,350 |
| 6 | 2,000 | 200 | 20 | ฿247,800 |
| 12 | 5,000 | 500 | 50 | ฿619,500 |

Break-even: ~฿25,000/เดือน (AWS $690 + Stripe fees + misc)
→ ประมาณ 26 Pro users หรือ 10 Team users

---

## Target Market

- ทนายความในไทย: ~80,000 คน (สภาทนายความ)
- สำนักงานกฎหมาย: ~5,000 แห่ง
- ที่ปรึกษากฎหมายองค์กร: ~10,000 คน
- นักศึกษากฎหมาย: ~50,000 คน (Free tier → convert to Pro)

TAM: 80,000 × ฿990 = ฿79.2M/ปี (Pro only)
SAM: 8,000 × ฿990 = ฿7.9M/ปี (10% penetration)
SOM Year 1: 500 × ฿990 = ฿5.9M/ปี
