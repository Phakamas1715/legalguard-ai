# 🎤 Pitch 7 นาที — Smart LegalGuard AI
## ETDA Responsible AI Innovation Hackathon 2026 — Challenge 3: Efficiency and Privacy for Justice Work
### ทีม Honest Predictor

---

## 📋 ปัญหา → ฟีเจอร์ → ผลลัพธ์ (Problem-Solution Map)

### กลุ่ม 1: ประชาชน — "เข้าไม่ถึงกระบวนการยุติธรรม"

| ปัญหาจริง | ฟีเจอร์ที่แก้ | ผลลัพธ์ |
|-----------|-------------|---------|
| ยื่นฟ้องด้วยตัวเอง ถูกตีกลับ 60% เพราะเอกสารไม่ครบ | Complaint Drafting Assistant — AI ช่วยร่างคำฟ้อง + ตรวจความครบถ้วน (Completeness Score) + บอกว่าขาดอะไร | ลดอัตราตีกลับจาก 60% → < 10% |
| ไม่รู้ว่าคดีตัวเองเป็นแพ่ง อาญา หรือปกครอง | Case Classification — กรอกข้อเท็จจริง → AI จำแนกประเภทคดี + แนะนำศาลที่ถูกต้อง | ประชาชนเลือกศาลถูกตั้งแต่แรก |
| ค้นกฎหมายไม่เจอ ภาษากฎหมายยากเกินไป | น้องซื่อสัตย์ Chatbot — ตอบภาษาง่าย อ้างอิงมาตราจริง + "ไม่รู้" Policy ถ้าไม่มีข้อมูล | เข้าถึงข้อมูลกฎหมายจากที่บ้าน |
| ไม่รู้ขั้นตอนยื่นฟ้อง e-Filing | Chatbot + คู่มือ RAG — ดึงคู่มือ e-Filing, checklist, ค่าธรรมเนียม มาตอบอัตโนมัติ | ลดเวลาเตรียมเอกสารจากวัน → ชั่วโมง |
| ยื่นฟ้องแล้วไม่รู้สถานะ | Case Tracking — ติดตามสถานะคดี วันนัด ขั้นตอนถัดไป | ลดการโทรถามศาล |
| กลัวข้อมูลส่วนตัวรั่ว | PII Masking 9 รูปแบบ — ปกปิดชื่อ เลขบัตร เบอร์โทร ก่อนส่ง AI | PII Recall ≥ 99.2% |

### กลุ่ม 2: ทนายความ — "ค้นคว้าช้า ผลลัพธ์ไม่ตรง"

| ปัญหาจริง | ฟีเจอร์ที่แก้ | ผลลัพธ์ |
|-----------|-------------|---------|
| ค้นคำพิพากษาใช้เวลา 30 นาที/ครั้ง ผลไม่ตรง | Hybrid RAG Search — FAISS 70% + BM25 30% + LeJEPA Reranking + Query Rewriting | ลดเวลาจาก 30 นาที → 3 นาที, Hit@3 = 93.7% |
| ค้นด้วย keyword ไม่เจอ ต้องรู้เลขฎีกาแน่นอน | Semantic Search — ค้นด้วยข้อเท็จจริง ไม่ต้องรู้เลขคดี + BM25 จับมาตราเฉพาะ | ค้นด้วยภาษาธรรมชาติได้ |
| ผลลัพธ์ไม่มีสรุป ต้องอ่านเองทั้งหมด | Role-based Formatting — ทนายเห็นมาตราเต็ม + dissenting opinions + cross-references | ลดเวลาอ่านต่อคดี |
| ไม่มั่นใจว่าผลลัพธ์ถูกต้อง | Confidence Badge (🟢🟡🔴) + Honesty Score + Citation Verification | 100% ของผู้ใช้เห็นระดับความเชื่อถือ |
| อยากรู้แนวโน้มผลคดี | Case Outcome Prediction — วิเคราะห์จากคดีคล้ายกัน + Confidence Cap 85% + disclaimer | ประกอบการตัดสินใจ (ไม่ใช่คำปรึกษากฎหมาย) |
| ค้นซ้ำบ่อย เสียเวลา | Semantic Cache — RapidFuzz threshold 0.85 + Redis TTL | คำค้นซ้ำ/คล้ายกัน ตอบทันที |

### กลุ่ม 3: เจ้าหน้าที่ศาล / ธุรการ — "งานซ้ำเยอะ มองไม่เห็นภาพรวม"

| ปัญหาจริง | ฟีเจอร์ที่แก้ | ผลลัพธ์ |
|-----------|-------------|---------|
| คัดกรองคำฟ้องด้วยมือ ใช้เวลานาน | Complaint Verification — AI ตรวจความครบถ้วน + สรุปประเด็น + Completeness Score | ลดเวลาคัดกรองต่อฉบับ |
| ไม่เห็นภาพรวมคดีค้าง / bottleneck | Smart Dashboard — สถิติ real-time + Bottleneck Detection (> 1.5× standard) | ระบุคอขวดอัตโนมัติ ลดคดีค้าง 10-25% |
| นำเข้าข้อมูลเอกสารศาลยุ่งยาก | Data Ingestion Pipeline — PDF → OCR → Thai Chunking → Embedding → Vector DB | Ingest 315 เอกสาร + 176K คำพิพากษา |
| ตรวจสอบย้อนหลังไม่ได้ | CAL-130 Audit Log — SHA-256 Hash Chain ทุก action | Audit Coverage 100% |
| ไม่รู้ว่า AI ทำงานยังไง | Agent Steps Display — แสดงขั้นตอน Orchestrator → Retriever → Reviewer → Compliance | โปร่งใส ตรวจสอบได้ |
| รายงานสถิติทำด้วยมือ | Dashboard PDF Report — สร้างรายงานอัตโนมัติ + CFS Fairness Monitoring | ลดเวลาทำรายงาน |

### กลุ่ม 4: ผู้พิพากษา / ตุลาการ — "ค้นฎีกาช้า ร่างคำพิพากษานาน"

| ปัญหาจริง | ฟีเจอร์ที่แก้ | ผลลัพธ์ |
|-----------|-------------|---------|
| ค้นแนวคำพิพากษาที่เกี่ยวข้องใช้เวลานาน | Precedent Retrieval — ดึง Top 10 คดีคล้ายกัน + Citation Verification | ค้นเร็วขึ้น 10 เท่า |
| ยกร่างคำพิพากษาเบื้องต้นใช้เวลามาก | Judgment Drafting Agent — ร่างโครงสร้าง (ข้อเท็จจริง, วิเคราะห์, มาตรา, คำวินิจฉัย) | ลดเวลายกร่าง 30-50% |
| กลัว AI อ้างอิงคดีที่ไม่มีจริง (hallucination) | Citation Verification + Unverified Flagging — ตรวจทุก citation ว่ามีใน KB จริง | Hallucination Rate < 1% |
| ถอดความบันทึกไต่สวนด้วยมือ | Speech-to-Text — ถอดเสียง + Speaker Diarization + PII Masking | รองรับเสียงยาว 120 นาที |
| กังวลว่า AI จะล้ำเส้นดุลยพินิจ | Risk Tier R4 + R5 — ร่างได้แต่ตุลาการต้องอนุมัติ / AI ห้ามตัดสินคดี | Human-in-the-Loop เข้มงวด |
| กังวลเรื่อง bias ในผลลัพธ์ | CFS Fairness Score — ตรวจ bias 5 มิติ (ภูมิศาสตร์, ศาล, คดี, เวลา, บทบาท) | CFS ≥ 93.5% |

### สรุป: ฟีเจอร์ทั้งหมดที่สร้างแล้ว (31 services)

| หมวด | ฟีเจอร์ | แก้ปัญหาให้ใคร |
|------|---------|---------------|
| Semantic Search (FAISS + BM25 + LeJEPA) | ค้นหาเชิงความหมาย + keyword | ทนาย, ผู้พิพากษา, ประชาชน |
| Query Rewriting | แปลงภาษาพูด → คำค้นกฎหมาย | ประชาชน, ทนาย |
| Semantic Cache (Redis + RapidFuzz) | ลด latency คำค้นซ้ำ | ทุกกลุ่ม |
| น้องซื่อสัตย์ RAG Chatbot | ตอบคำถามกฎหมายภาษาง่าย | ประชาชน |
| Complaint Drafting + Validation | ร่างคำฟ้อง + ตรวจความครบถ้วน | ประชาชน, เจ้าหน้าที่ |
| e-Filing XML Export | ส่งออกคำฟ้องสำหรับ e-Filing | ประชาชน |
| Case Classification | จำแนกประเภทคดี (แพ่ง/อาญา/ปกครอง) | ประชาชน |
| Complaint Verification | คัดกรองคำฟ้อง + สรุปประเด็น | เจ้าหน้าที่ศาล |
| Judgment Drafting Agent | ยกร่างคำพิพากษาเบื้องต้น | ผู้พิพากษา |
| Precedent Retrieval | ค้นคดีคล้ายกัน Top 10 | ผู้พิพากษา, ทนาย |
| Case Outcome Prediction | พยากรณ์แนวโน้มผลคดี | ทนาย |
| Speech-to-Text + Diarization | ถอดความเสียงไต่สวน | ผู้พิพากษา |
| Smart Dashboard + Bottleneck | สถิติ real-time + ระบุคอขวด | เจ้าหน้าที่ศาล |
| CFS Fairness Monitoring | ตรวจ bias 5 มิติ | ผู้พิพากษา, เจ้าหน้าที่ |
| PII Masking (9 patterns) | ปกปิดข้อมูลส่วนบุคคล | ทุกกลุ่ม |
| CAL-130 Audit Log (SHA-256) | บันทึกทุก action ตรวจสอบได้ | เจ้าหน้าที่, ผู้พิพากษา |
| LangGraph Multi-Agent (5 agents) | Orchestrate AI pipeline | ทุกกลุ่ม (backend) |
| Anti-Hallucination 7 ชั้น | ป้องกัน AI หลอน | ทุกกลุ่ม |
| Risk Tier R0-R5 | กำหนดขอบเขต AI | ผู้พิพากษา, เจ้าหน้าที่ |
| Circuit Breaker | เบรกฉุกเฉิน | ทุกกลุ่ม |
| Honesty Score (6 มิติ) | วัดความน่าเชื่อถือ AI | ทุกกลุ่ม |
| Legal Knowledge Graph | เชื่อมโยงมาตรา-คดี-บุคคล | ทนาย, ผู้พิพากษา |
| Case Tracking | ติดตามสถานะคดี | ประชาชน |
| Data Ingestion Pipeline | นำเข้าเอกสารศาล | เจ้าหน้าที่, IT |
| Geocoder + Court Lookup | ค้นหาศาลใกล้บ้าน | ประชาชน |
| NitiBench Benchmark | ทดสอบคุณภาพ AI | IT |
| Responsible AI Dashboard | แสดง governance score | เจ้าหน้าที่, IT |
| Role-based Access Control | แบ่งสิทธิ์ตามบทบาท | ทุกกลุ่ม |
| Ollama Local Fallback | AI ทำงานได้แม้ cloud ล่ม | ทุกกลุ่ม |
| Bedrock + Typhoon + SeaLLM | LLM chain สำหรับภาษาไทย | ทุกกลุ่ม (backend) |
| HuggingFace 6 Datasets | ข้อมูลฝึก/ทดสอบ AI | IT |

---

## 🔧 ปัญหาจริงของ IT + ธุรการศาล (2568-2569) → ระบบเราตอบยังไง

| # | ปัญหาจริงในศาล | สาเหตุ | LegalGuard AI ตอบยังไง | ฟีเจอร์ที่เกี่ยว |
|---|---------------|--------|----------------------|----------------|
| 1 | CIOS / e-Filing ล่มบ่อย ปิดปรับปรุงหลายวัน | ระบบ monolith, ไม่มี HA | Ollama Local Fallback — ถ้า cloud ล่ม AI ยังทำงานได้ในเครื่อง + EKS Auto Scaling 2-8 pods + RDS Multi-AZ | Ollama Fallback, HPA, Multi-AZ |
| 2 | e-Filing เปลี่ยนเวอร์ชันบ่อย เรียนรู้ยาก | ขาดคู่มือ + อบรม | น้องซื่อสัตย์ Chatbot — ถามวิธีใช้ e-Filing ได้ทันที + RAG ดึงคู่มือ e-Filing v3/v4 มาตอบ | Chatbot RAG, คู่มือ A2.1 |
| 3 | งาน Hybrid (ออนไลน์ + กระดาษ) ยังต้องพิมพ์ออกมา | ระบบไม่ครบวงจร | e-Filing XML Export — ร่างคำฟ้อง → export XML → ยื่นออนไลน์ ไม่ต้องพิมพ์ + Complaint Validation ตรวจก่อนยื่น | e-Filing XML, Complaint Validation |
| 4 | กลัวข้อมูลสำนวนรั่วเมื่อเชื่อม AI | ไม่มี PII protection | PII Masking 9 รูปแบบ ก่อนส่ง LLM ทุกครั้ง + KMS ศาลถือกุญแจ + Data Classification 4 ระดับ + VPC isolation | PII Masking, KMS, Security Middleware |
| 5 | ข้อมูลกระจัดกระจาย (Silo) วิเคราะห์ภาพรวมยาก | ไม่มี unified data layer | Data Ingestion Pipeline — รวมข้อมูลจากทุกแหล่ง (PDF, JSON, Web) เข้า Knowledge Base เดียว + Smart Dashboard แสดงภาพรวม | Ingestion Pipeline, Dashboard, Knowledge Graph |
| 6 | ภาระงานเพิ่มช่วงเปลี่ยนผ่าน ต้องทำทั้งระบบเก่า+ใหม่ | ไม่มี automation | Complaint Verification — AI คัดกรองคำฟ้องอัตโนมัติ + Case Tracking ติดตามสถานะ + Dashboard Bottleneck ระบุงานค้าง | Complaint Verification, Case Tracking, Bottleneck Detection |

### ฎีกา 1222/2568 — ระบบเราตอบโจทย์

> ฎีกานี้ยืนยันว่า "คำสั่งศาลต้องนำเข้าสู่ CIOS จึงถือว่าทราบ"
> → ระบบเรามี CAL-130 Audit Log ที่บันทึกทุก action ด้วย SHA-256 Hash Chain
> ทุกการทำงานของ AI ถูกบันทึกอย่างเป็นระบบ ตรวจสอบย้อนหลังได้ 100%
> สอดคล้องกับหลักการที่ว่า "ต้องมีหลักฐานว่าข้อมูลเข้าสู่ระบบแล้ว"

### สิ่งที่ระบบเราทำได้ที่ CIOS/e-Filing ยังไม่มี

| ความสามารถ | CIOS/e-Filing ปัจจุบัน | LegalGuard AI |
|-----------|----------------------|---------------|
| ค้นหาเชิงความหมาย | ❌ keyword เท่านั้น | ✅ Semantic + BM25 Hybrid |
| AI ช่วยร่างคำฟ้อง | ❌ กรอกเอง | ✅ Complaint Drafting + Validation |
| ตรวจความครบถ้วนอัตโนมัติ | ❌ เจ้าหน้าที่ตรวจมือ | ✅ Completeness Score + Missing Fields |
| Chatbot ช่วยตอบคำถาม | ❌ ไม่มี | ✅ น้องซื่อสัตย์ RAG |
| Dashboard สถิติ real-time | ⚠️ มีบางส่วน | ✅ Bottleneck Detection + CFS Fairness |
| PII Masking อัตโนมัติ | ❌ ไม่มี | ✅ 9 รูปแบบ, Recall ≥ 99.2% |
| Audit Log ตรวจสอบได้ | ⚠️ มีบางส่วน | ✅ SHA-256 Hash Chain 100% |
| ทำงานได้เมื่อ cloud ล่ม | ❌ ล่มทั้งระบบ | ✅ Ollama Local Fallback |
| AI วิเคราะห์แนวฎีกา | ❌ ไม่มี | ✅ Precedent Retrieval + Judgment Drafting |
| ถอดความเสียงไต่สวน | ❌ ไม่มี | ✅ Speech-to-Text + Speaker Diarization |

---

## 📌 LegalGuard AI กับ e-Filing v4 — เสริม ไม่ใช่แทน

### บริบท: e-Filing v4 เปิดใช้ 5 ม.ค. 2569

e-Filing v4 แก้ปัญหาโครงสร้างพื้นฐาน (infra, security, UX) แล้ว
LegalGuard AI เสริมในส่วนที่ e-Filing v4 ยังไม่มี — คือ AI layer

```
e-Filing v4 (ศาลพัฒนาเอง)          LegalGuard AI (เราเสริม)
┌─────────────────────────┐      ┌─────────────────────────┐
│ ✅ ยื่นคำฟ้องออนไลน์      │      │ ✅ AI ช่วยร่างคำฟ้อง      │
│ ✅ ThaID ยืนยันตัวตน      │      │ ✅ ตรวจความครบถ้วนอัตโนมัติ │
│ ✅ ชำระเงินผ่าน KTB      │      │ ✅ Semantic Search ค้นฎีกา  │
│ ✅ e-Form ลดกระดาษ       │      │ ✅ RAG Chatbot ช่วยตอบ     │
│ ✅ เชื่อม CIOS           │      │ ✅ PII Masking อัตโนมัติ    │
│ ✅ ส่งหมายอิเล็กทรอนิกส์  │      │ ✅ Audit Log SHA-256       │
│                         │      │ ✅ Dashboard + Bottleneck   │
│ ❌ ไม่มี AI ช่วยร่าง      │  ←→  │ ✅ Judgment Drafting       │
│ ❌ ไม่มี Semantic Search  │  ←→  │ ✅ Hybrid FAISS+BM25       │
│ ❌ ไม่มี Chatbot         │  ←→  │ ✅ น้องซื่อสัตย์            │
│ ❌ ไม่มี Fairness Check  │  ←→  │ ✅ CFS 5 มิติ              │
└─────────────────────────┘      └─────────────────────────┘
         ↕ เชื่อมกันผ่าน API / XML Export ↕
```

### วิธี pitch ให้กรรมการเข้าใจ

> "e-Filing v4 ที่ศาลเพิ่งเปิดใช้เดือนมกราคม เป็นระบบที่ดีมาก
> แก้ปัญหาโครงสร้างพื้นฐาน ความปลอดภัย และ UX ได้แล้ว
>
> สิ่งที่เราทำคือ เสริม AI layer ที่ e-Filing v4 ยังไม่มี:
> - ช่วยประชาชนร่างคำฟ้องก่อนยื่นเข้า e-Filing
> - ตรวจความครบถ้วนอัตโนมัติ ลดอัตราตีกลับ
> - Export XML ที่ compatible กับ e-Filing schema
>
> เราไม่ได้สร้างระบบใหม่มาแทน — เราสร้าง AI ที่ทำงานร่วมกับระบบที่ศาลมีอยู่แล้ว"

### จุดเชื่อมต่อทางเทคนิค

| จุดเชื่อม | e-Filing v4 | LegalGuard AI | วิธีเชื่อม |
|-----------|------------|---------------|-----------|
| คำฟ้อง | รับ XML ผ่าน e-Filing | ร่าง + ตรวจ + export XML | XML Export endpoint |
| ยืนยันตัวตน | ThaID / Digital ID | รองรับ JWT + role-based | Cognito + ThaID integration |
| ข้อมูลคดี | CIOS database | Knowledge Base (RAG) | Data Ingestion Pipeline |
| สถิติ | รายงานภายใน | Smart Dashboard real-time | API + Materialized View |
| ความปลอดภัย | ตามมาตรฐานศาล | PII Masking + KMS + Audit | Security Middleware |

### คำถามที่กรรมการอาจถาม

> Q: "ศาลมี e-Filing v4 แล้ว ทำไมต้องมีระบบนี้อีก?"
>
> A: "e-Filing v4 เป็นระบบยื่นเอกสาร — เหมือนไปรษณีย์ดิจิทัล
> LegalGuard AI เป็นระบบช่วยคิด — เหมือนผู้ช่วยวิจัยที่ช่วยร่างเอกสารก่อนส่ง
> ทั้งสองทำงานร่วมกัน: AI ร่าง → ตรวจ → export XML → ยื่นผ่าน e-Filing v4"
>
> Q: "จะเชื่อมกับ CIOS ได้ไหม?"
>
> A: "ระบบออกแบบเป็น API-first — เชื่อมกับ CIOS ผ่าน REST API ได้
> Data Ingestion Pipeline รองรับ import ข้อมูลจาก CIOS format
> และ Audit Log ของเราสอดคล้องกับหลักการ CIOS ตามฎีกา 1222/2568"

---

## 📌 LegalGuard AI กับ CIOS — เสริม AI ให้ระบบติดตามสำนวน

### บริบท: CIOS กำลังพัฒนาต่อเนื่อง (2568-2569)

CIOS เป็นระบบ Tracking + ยื่นคำร้อง + คัดถ่ายเอกสาร
กำลังเพิ่มฟังก์ชันใหม่ (Take It Down ม.ค. 2569) + เชื่อม e-Filing v4 + ยกระดับ security
LegalGuard AI เสริมในส่วนที่ CIOS ยังไม่มี — คือ AI วิเคราะห์ + ค้นหาอัจฉริยะ

### ปัญหา CIOS → LegalGuard AI ช่วยอะไรได้

| ปัญหา CIOS ปัจจุบัน | LegalGuard AI เสริมยังไง |
|---------------------|------------------------|
| ระบบล่ม/ช้าช่วง peak | Ollama Local Fallback — AI ทำงานได้แม้ cloud ล่ม + Semantic Cache ลด load |
| ฟังก์ชันจำกัดหลังถูกโจมตีไซเบอร์ | Security Middleware + WAF + PII Masking — ป้องกันชั้นเพิ่ม ไม่ต้องลดฟังก์ชัน |
| ขั้นตอนซับซ้อนสำหรับผู้ไม่ถนัด IT | น้องซื่อสัตย์ Chatbot — ถามวิธีใช้ CIOS/e-Filing ได้ทันที ภาษาง่าย |
| เชื่อมกับ e-Filing ยังไม่ 100% | API-first design — เชื่อม CIOS + e-Filing ผ่าน REST API + XML Export |
| ขาดคู่มือ/อบรมครอบคลุม | RAG Chatbot ดึงคู่มือมาตอบ + Legal Glossary พจนานุกรมกฎหมาย |
| ติดตามสถานะคดีได้แต่ไม่มี AI วิเคราะห์ | Smart Dashboard — Bottleneck Detection + CFS Fairness + สถิติ real-time |

### CIOS vs LegalGuard AI — ทำคนละหน้าที่

```
CIOS (ระบบหลักของศาล)              LegalGuard AI (AI layer เสริม)
┌─────────────────────────┐      ┌─────────────────────────┐
│ ✅ ติดตามสำนวนคดี        │      │ ✅ ค้นหาคดีคล้ายกัน (RAG) │
│ ✅ ยื่นคำร้องออนไลน์      │      │ ✅ AI ช่วยร่างคำร้อง      │
│ ✅ คัดถ่ายเอกสาร         │      │ ✅ สรุปสำนวนอัตโนมัติ     │
│ ✅ Take It Down          │      │ ✅ ถอดความเสียงไต่สวน     │
│ ✅ เชื่อม e-Filing v4    │      │ ✅ ตรวจ bias + fairness   │
│ ✅ ThaID ยืนยันตัวตน     │      │ ✅ Audit Log SHA-256      │
│                         │      │                         │
│ ❌ ไม่มี AI ค้นหาฎีกา    │  ←→  │ ✅ Semantic Search        │
│ ❌ ไม่มี AI สรุปสำนวน    │  ←→  │ ✅ LangGraph 5 Agents     │
│ ❌ ไม่มี Chatbot ช่วย    │  ←→  │ ✅ น้องซื่อสัตย์           │
│ ❌ ไม่มี Bottleneck AI   │  ←→  │ ✅ Dashboard Analytics    │
│ ❌ ไม่มี PII Masking     │  ←→  │ ✅ 9 patterns, ≥99.2%    │
└─────────────────────────┘      └─────────────────────────┘
         ↕ เชื่อมผ่าน REST API + Data Ingestion ↕
```

### ประโยคสำหรับ pitch

> "CIOS เป็นระบบติดตามสำนวน — เหมือนตู้เก็บแฟ้มดิจิทัล
> LegalGuard AI เป็นผู้ช่วยวิจัยที่อ่านแฟ้มให้ สรุปให้ ค้นคดีคล้ายกันให้
> CIOS บอกว่าคดีอยู่ขั้นไหน — LegalGuard AI บอกว่าคดีคล้ายกันเคยตัดสินยังไง"

---

## ⚖️ ระบบเราสอดคล้องกับกรอบกฎหมาย AI ของศาลยุติธรรม

### คำแนะนำประธานศาลฎีกา พ.ศ. 2568 → LegalGuard AI ทำตามทุกข้อ

| ข้อกำหนดจากประธานศาลฎีกา | LegalGuard AI ปฏิบัติตามอย่างไร |
|--------------------------|-------------------------------|
| ใช้ AI ได้ แต่ต้องรับผิดชอบสูงสุด | Risk Tier R0-R5 กำหนดขอบเขตชัด + Honesty Score ทุก response + Circuit Breaker |
| ห้าม AI ชี้ขาดหรือแทนดุลยพินิจ | R5 = AI ห้ามตัดสินคดี/ออกหมาย + R4 = ตุลาการต้องอนุมัติ + disclaimer ทุกร่าง |
| ต้องเปิดเผยว่าใช้ AI | ทุก response มี badge "AI-Generated" + Agent Steps แสดงกระบวนการ + Confidence Badge |
| ห้ามนำข้อมูลลับ/PII ใส่ Prompt | PII Masking 9 รูปแบบ ก่อนส่ง LLM ทุกครั้ง + Data Classification 4 ระดับ |
| ผู้ใช้ต้องตรวจสอบผลลัพธ์ทุกครั้ง | Disclaimer ทุก response + Confidence Badge (🟢🟡🔴) + "ต้องตรวจสอบก่อนใช้" |
| ความโปร่งใส (Transparency) | CAL-130 Audit Log SHA-256 + Citation ทุกอ้างอิง + Debate Trail |
| ความรับผิดชอบ (Accountability) | Audit Log ตรวจสอบย้อนหลัง 100% + Proof-of-Routing ทุก agent decision |

### ข้อกำหนดศาลแพ่ง พ.ศ. 2568

> ข้อกำหนดนี้ย้ำเรื่อง Transparency + Accountability
> ระบบเรามี Agent Steps Display ที่แสดงทุกขั้นตอนการทำงานของ AI
> + CAL-130 Hash Chain ที่ไม่สามารถแก้ไขย้อนหลังได้

### Pathumma LLM (เนคเทค) vs LegalGuard AI — เสริมกันได้

| ด้าน | Pathumma LLM (เนคเทค) | LegalGuard AI (เรา) | ทำงานร่วมกันยังไง |
|------|----------------------|--------------------|--------------------|
| LLM หลัก | Pathumma (Thai-native) | Bedrock Claude + Typhoon + SeaLLM | เพิ่ม Pathumma เป็น provider ใน LLM chain ได้ทันที |
| RAG Pipeline | กำลังพัฒนา | ✅ สร้างเสร็จแล้ว (FAISS+BM25+LeJEPA) | Pathumma ใช้ RAG pipeline ของเราได้ |
| สรุปสำนวน | กำลังพัฒนา | ✅ LangGraph 5 Agents | Pathumma เป็น LLM ใน Drafter Agent ได้ |
| ถอดความ | กำลังพัฒนา | ✅ STT + Speaker Diarization | Pathumma ช่วย post-process ภาษาไทย |
| OCR | กำลังพัฒนา | ✅ PyMuPDF + EasyOCR | ใช้ร่วมกันได้ |
| ค้นหา Q&A | กำลังพัฒนา | ✅ Semantic Search + Chatbot | Pathumma เป็น LLM ใน Chatbot ได้ |
| Anti-Hallucination | ใช้ RAG | ✅ 7 ชั้น (RAG + Debate + CBB + Circuit Breaker) | เสริมความปลอดภัยให้ Pathumma |
| Responsible AI | ตามคำแนะนำศาลฎีกา | ✅ RAAIA 3.1 + Risk Tier + Honesty Score | Framework ที่ Pathumma ยังไม่มี |

### ประโยคสำหรับ pitch

> "ศาลกำลังพัฒนา AI ร่วมกับเนคเทคโดยใช้ Pathumma LLM — เราเห็นด้วยกับทิศทางนี้
>
> สิ่งที่เราสร้างคือ AI infrastructure ที่พร้อมรองรับ Pathumma:
> - RAG Pipeline ที่สร้างเสร็จแล้ว — Pathumma เสียบเข้าใช้ได้ทันที
> - Anti-Hallucination 7 ชั้น — เสริมความปลอดภัยให้ Pathumma
> - Responsible AI Framework (RAAIA 3.1) — ตอบโจทย์คำแนะนำประธานศาลฎีกาทุกข้อ
>
> เราไม่ได้แข่งกับเนคเทค — เราสร้าง infrastructure ที่ Pathumma ทำงานได้ดีขึ้น"

### ถ้ากรรมการถาม "ทำไมไม่ใช้ Pathumma อย่างเดียว?"

> "Pathumma เป็น LLM ที่ดีมากสำหรับภาษาไทย
> แต่ LLM อย่างเดียวไม่พอสำหรับงานศาล — ต้องมี:
>
> 1. RAG Pipeline — ดึงข้อมูลจริงมาอ้างอิง ไม่ใช่ให้ LLM แต่งเอง
> 2. Anti-Hallucination — ตรวจว่า citation มีจริง ไม่ใช่ AI สร้างขึ้น
> 3. PII Masking — ปกปิดข้อมูลก่อนส่ง LLM ตามคำแนะนำศาลฎีกา
> 4. Audit Log — บันทึกทุกการทำงานตรวจสอบได้
> 5. Risk Tier — กำหนดว่า AI ทำอะไรได้ ทำอะไรไม่ได้
>
> ทั้ง 5 อย่างนี้คือสิ่งที่เราสร้าง — Pathumma เป็น LLM ข้างใน เราเป็น framework ข้างนอก"

---

## 🌉 LegalGuard AI = Bridge ระหว่าง IT กับผู้ใช้จริง

### ปัญหาแท้จริงของ IT ศาล: ไม่ใช่แค่เทคนิค แต่คือ "ช่องว่างระหว่างระบบกับคน"

```
ปัญหาปัจจุบัน:

  IT ศาล ──→ สร้างระบบ (CIOS, e-Filing) ──→ ผู้ใช้ (ผู้พิพากษา, ธุรการ, ทนาย)
                                                    ↑
                                              ช่องว่าง:
                                              - ใช้ยาก
                                              - ไม่มี AI ช่วย
                                              - ต้องทำซ้ำ
                                              - ขาดคู่มือ

LegalGuard AI เป็น Bridge:

  IT ศาล ──→ CIOS / e-Filing v4 ──→ LegalGuard AI ──→ ผู้ใช้
                                         ↑
                                    เสริม:
                                    - AI ช่วยร่าง/ค้น/สรุป
                                    - Chatbot ตอบแทน helpdesk
                                    - PII Masking อัตโนมัติ
                                    - Audit ตรวจสอบได้
```

### 4 วิธีที่เราช่วย IT ศาลได้จริง

**1. ลดภาระ Helpdesk**

| ปัญหา | ปัจจุบัน | LegalGuard AI |
|-------|---------|---------------|
| ทนายถามวิธียื่น e-Filing | IT ต้องตอบทีละคน | น้องซื่อสัตย์ Chatbot ตอบ 24/7 |
| ธุรการไม่รู้วิธีใช้ CIOS ใหม่ | จัดอบรม + ทำคู่มือ | RAG ดึงคู่มือมาตอบทันที |
| ประชาชนถามขั้นตอนฟ้อง | โทรมาศาล → IT รับสาย | Chatbot + Complaint Drafting |

> ผลลัพธ์: IT ไม่ต้องเป็น helpdesk — AI ตอบคำถามซ้ำๆ แทน

**2. เสริมความปลอดภัยที่ IT ต้องการ**

| ปัญหา | ปัจจุบัน | LegalGuard AI |
|-------|---------|---------------|
| กลัว PII รั่วเมื่อเชื่อม AI | จำกัดฟังก์ชัน | PII Masking 9 รูปแบบ ก่อนส่ง LLM ทุกครั้ง |
| ถูกโจมตีไซเบอร์ | ลดฟังก์ชัน + ปิดระบบ | Prompt Injection Detection + WAF + Rate Limiting |
| ตรวจสอบย้อนหลังไม่ได้ | log กระจัดกระจาย | CAL-130 SHA-256 Hash Chain — tamper-proof |
| ไม่รู้ว่า AI ทำอะไร | ไม่มี observability | Live Metrics + Audit Log Viewer + PII Tester |

> ผลลัพธ์: IT มั่นใจเปิดฟังก์ชัน AI ได้ เพราะมีเครื่องมือ monitor ครบ

**3. แก้ปัญหา Data Silo**

| ปัญหา | ปัจจุบัน | LegalGuard AI |
|-------|---------|---------------|
| ข้อมูล CIOS + e-Filing + บัญชี ไม่เชื่อม | ดึงข้อมูลด้วยมือ | Data Ingestion Pipeline รวมเข้า Knowledge Base เดียว |
| สถิติคดีทำด้วยมือ | Excel + รายงานกระดาษ | Smart Dashboard real-time + PDF Report อัตโนมัติ |
| ไม่มี unified search | ค้นแยกแต่ละระบบ | Semantic Search ค้นข้ามทุกแหล่งข้อมูล |

> ผลลัพธ์: IT ไม่ต้องสร้าง data warehouse เอง — ใช้ Knowledge Base ของเราได้

**4. ลดภาระช่วงเปลี่ยนผ่าน (v3 → v4)**

| ปัญหา | ปัจจุบัน | LegalGuard AI |
|-------|---------|---------------|
| ต้องดูแลทั้งระบบเก่า+ใหม่ | IT ทำเอง | API-first — เชื่อม CIOS/e-Filing ผ่าน REST API |
| ต้องอบรมผู้ใช้ทุกครั้งที่เปลี่ยนเวอร์ชัน | จัดอบรม + คู่มือ | Chatbot สอนใช้ระบบใหม่ได้ทันที |
| ศาลต่างจังหวัดขาดบุคลากร IT | ส่งคนไปอบรม | AI ทำงานผ่าน web — ไม่ต้องติดตั้ง ไม่ต้องส่งคน |

> ผลลัพธ์: IT focus พัฒนาระบบหลัก ไม่ต้องเป็นทั้ง developer + helpdesk + trainer

### ประโยคสำหรับ pitch (ถ้ากรรมการเป็นฝ่าย IT)

> "เราไม่ได้มาแทนระบบที่ IT ศาลสร้าง — เรามาช่วยให้ระบบที่มีอยู่ทำงานได้ดีขึ้น
>
> IT ศาลเก่งเรื่อง infrastructure — CIOS, e-Filing, ThaID
> เราเก่งเรื่อง AI layer — RAG, PII Masking, Anti-Hallucination
>
> รวมกันแล้วได้ Smart Court ที่ครบวงจร:
> CIOS จัดการสำนวน + e-Filing ยื่นเอกสาร + LegalGuard AI ช่วยคิด"

---

## ⏱️ Timeline (7:00 นาที)

| เวลา | ช่วง | เนื้อหา | สไลด์ |
|-------|------|---------|-------|
| 0:00–0:45 | Opening Hook | ปัญหา + สถิติ Pain Point | 1–2 |
| 0:45–1:30 | Vision | Smart LegalGuard AI คืออะไร | 3 |
| 1:30–3:00 | Solution | 5 มิติหลัก + สถาปัตยกรรม | 4–6 |
| 3:00–4:30 | Demo | Live Demo 3 flows | 7–9 |
| 4:30–5:30 | Responsible AI | RAAIA 3.1 + Anti-Hallucination 7 ชั้น | 10–11 |
| 5:30–6:15 | Impact & KPI | ตัวเลขผลลัพธ์ + Roadmap | 12–13 |
| 6:15–7:00 | Closing | Call to Action + Q&A Ready | 14 |

---

## 📝 สคริปต์เต็ม

---

### สไลด์ 1 — Opening Hook (0:00–0:30)

**[แสดงตัวเลขบนจอ]**

> "ทุกปี ศาลไทยรับคดีใหม่กว่า 1.8 ล้านคดี
> ทนายความใช้เวลาเฉลี่ย 30 นาทีต่อการค้นคำพิพากษาหนึ่งครั้ง
> ประชาชนกว่า 60% ที่ยื่นฟ้องด้วยตัวเอง ถูกตีกลับเพราะเอกสารไม่ครบ
>
> ปัญหาไม่ใช่คนไม่มีสิทธิ์ แต่คนเข้าไม่ถึงกระบวนการ"

---

### สไลด์ 2 — Pain Points (0:30–0:45)

**[แสดง 4 Pain Points จาก User Research 17 คน]**

> "จากการสำรวจผู้ใช้จริง 17 คน — ทนาย ประชาชน เจ้าหน้าที่รัฐ — ปัญหาหลักคือ:
>
> 1. **ค้นหาไม่เจอ หรือเจอแต่ไม่ตรง** — 76% บอกว่าผลลัพธ์ไม่ตรงประเด็น
> 2. **ต้องอ่านเองทั้งหมด** — ไม่มีสรุป ไม่มี AI ช่วยวิเคราะห์
> 3. **ใช้เวลานาน** — ค้นคว้าคดีเฉลี่ย 30 นาที ยกร่างคำฟ้องเป็นชั่วโมง
> 4. **ไม่มั่นใจในผลลัพธ์** — 100% ต้องการ Confidence Score"

---

### สไลด์ 3 — Vision (0:45–1:30)

**[แสดงหน้า Landing Page — Smart LegalGuard AI]**

> "Smart LegalGuard AI คือโครงสร้างพื้นฐานกฎหมายอัจฉริยะระดับชาติ
> ที่ออกแบบมาเพื่อตอบโจทย์ Challenge 3 ทั้ง 4 มิติ:
>
> - **Efficiency** — ลดเวลาค้นคว้าจาก 30 นาทีเหลือ 3 นาที
> - **Accuracy** — Citation Accuracy ≥ 95% ด้วย RAG + Multi-Agent Debate
> - **Privacy** — PII Masking 9 รูปแบบ + ข้อมูลอยู่ในไทย + PDPA compliant
> - **Responsible AI** — Anti-Hallucination 7 ชั้น + Honesty Score ทุก response
>
> ระบบรองรับ 4 กลุ่มผู้ใช้: ประชาชน ทนายความ เจ้าหน้าที่ศาล และตุลาการ
> แต่ละกลุ่มเห็น UI และผลลัพธ์ที่ปรับตามบทบาท"

---

### สไลด์ 4 — Solution: 5 มิติ (1:30–2:15)

**[แสดง 5 Strategic Dimensions]**

> "ระบบถูกออกแบบรอบ 5 มิติ:
>
> **1. Efficiency & Speed** — AI ช่วยร่างคำฟ้อง ตรวจเอกสาร ลดเวลา 30-50%
>
> **2. Consistency & Accuracy** — Hybrid RAG Search: FAISS 70% + BM25 30%
> ผ่าน Ablation Study บน Thai Legal Corpus ได้ Hit@3 = 93.7%
> พร้อม LeJEPA Reranking ที่มี OOD Detection ตรวจจับข้อมูลนอก distribution
>
> **3. Data-Driven Management** — Dashboard real-time สำหรับผู้บริหารศาล
> ระบุ bottleneck อัตโนมัติ ลดคดีค้าง 10-25%
>
> **4. Public Service** — น้องซื่อสัตย์ แชทบอท RAG ตอบภาษาง่าย อ้างอิงมาตราจริง
> ประชาชนเข้าถึงบริการจากที่บ้าน
>
> **5. Transparency & Trust** — CAL-130 Audit Log ด้วย SHA-256 Hash Chain
> ตรวจสอบย้อนหลังได้ 100%"

---

### สไลด์ 5 — สถาปัตยกรรม (2:15–3:00)

**[แสดง Architecture Diagram]**

> "สถาปัตยกรรมทั้งหมดอยู่บน AWS ap-southeast-1
>
> - **Frontend**: React 18 + TypeScript + Vite → Amplify + CloudFront
> - **Backend**: Python FastAPI + LangGraph → EKS
> - **AI**: Amazon Bedrock (Claude) → Typhoon (Thai LLM) → Ollama (Fallback)
> - **Data**: 176,543 คำพิพากษา + 315 เอกสารศาล + 6 HuggingFace Datasets
> - **Vector DB**: FAISS + BM25 (Tantivy) → Weighted RRF → LeJEPA Rerank
> - **Security**: KMS encryption + VPC isolation + WAF + PII Masking
>
> ทั้งหมดนี้ ข้อมูลไม่ออกนอกประเทศไทย
> ถ้า Cloud ล่ม ระบบ fallback ไป Ollama local — ข้อมูลไม่ออกนอก VPC"

---

### สไลด์ 6–8 — Live Demo (3:00–4:30)

#### Demo 1: Semantic Search (45 วินาที)

**[เปิดหน้า /search]**

> "สมมติทนายค้นหา 'ฉ้อโกงสินเชื่อรถยนต์ ศาลฎีกา'
>
> ระบบทำงาน 5 ขั้นตอนภายใน 2 วินาที:
> 1. PII Masking → ปกปิดข้อมูลส่วนตัวในคำค้น
> 2. Query Rewriting → แปลงเป็นคำค้นกฎหมาย + ระบุมาตรา 341
> 3. Hybrid Search → FAISS (semantic) 70% + BM25 (keyword) 30%
> 4. LeJEPA Reranking → เรียงตามความเกี่ยวข้องเชิงบริบท
> 5. Citation Verification → ตรวจว่าทุกอ้างอิงมีอยู่จริง
>
> ผลลัพธ์แสดง: สรุปสั้น, มาตรา, ปี+ศาล, Confidence Score, Source Badge
> ถ้าผลลัพธ์ไม่มั่นใจ → แสดง Honesty Score + แนะนำปรึกษาทนาย"

#### Demo 2: น้องซื่อสัตย์ Chatbot (30 วินาที)

**[เปิด Chatbot]**

> "ประชาชนถาม 'ถูกโกงเงินออนไลน์ต้องทำยังไง'
>
> น้องซื่อสัตย์ ตอบภาษาง่าย:
> - อ้างอิง ป.อ. มาตรา 341 + พ.ร.บ.คอมพิวเตอร์ มาตรา 14
> - แนะนำขั้นตอน: แจ้งความ → รวบรวมหลักฐาน → ยื่นฟ้อง
> - แสดง Confidence Badge 🟢 + disclaimer
>
> ถ้าไม่มีข้อมูล → ตอบตรงๆ ว่า 'ไม่มีข้อมูลเพียงพอ กรุณาปรึกษาทนาย'
> นี่คือ 'ไม่รู้' Policy — AI ซื่อสัตย์ ไม่แต่งเรื่อง"

#### Demo 3: Complaint Drafting + e-Filing (30 วินาที)

**[เปิดหน้า /complaint-form]**

> "ประชาชนกรอกข้อเท็จจริง → AI จำแนกประเภทคดี → ร่างคำฟ้องอัตโนมัติ
> → ตรวจความครบถ้วน (Completeness Score) → Export XML สำหรับ e-Filing
>
> ถ้าเอกสารไม่ครบ → ระบบบอกว่าขาดอะไร พร้อมวิธีแก้ไข
> ลดอัตราถูกตีกลับจาก 60% เหลือต่ำกว่า 10%"

---

### สไลด์ 9–10 — Responsible AI (4:30–5:30)

**[แสดง RAAIA 3.1 Framework]**

> "หัวใจของระบบคือ Responsible AI 6 หลักการ:
>
> 1. **Fairness First** — CFS Score ≥ 93.5% ตรวจ bias 5 มิติ
> 2. **Explain Everything** — ทุกคำตอบมี citation + debate trail
> 3. **Human Decides** — Risk Tier R0-R5 กำหนดว่า AI ทำได้แค่ไหน
>    - R5 (ตัดสินคดี, ออกหมาย) → AI ห้ามทำ มนุษย์เท่านั้น
> 4. **Zero Hallucination** — Anti-Hallucination 7 ชั้น
> 5. **Data in Thailand** — ข้อมูลไม่ออกนอกประเทศ
> 6. **Log Everything** — CAL-130 Hash Chain ตรวจสอบได้ 100%"

**[แสดง Anti-Hallucination 7 Layers]**

> "7 ชั้นป้องกัน AI หลอน:
>
> | ชั้น | กลไก |
> |------|-------|
> | 1 | RAG Grounding — ดึงข้อมูลจริงจาก Knowledge Base |
> | 2 | Citation Verification — ตรวจว่าอ้างอิงมีอยู่จริง |
> | 3 | Bedrock Guardrails — กรอง PII + ข้อมูลผิด |
> | 4 | Multi-Agent Debate — Researcher vs Skeptic คานอำนาจ |
> | 5 | Confidence Bounding — จำกัดเพดานความมั่นใจ |
> | 6 | Unverified Flagging — flag สิ่งที่ไม่มีใน KB |
> | 7 | 'ไม่รู้' Policy — ตอบตรงๆ ว่าไม่มีข้อมูล |
>
> ระบบยังมี Circuit Breaker — ถ้า Honesty Score < 0.50 หรือ PII รั่ว
> → บล็อกคำตอบทันที ส่งมนุษย์ตรวจ"

---

### สไลด์ 11 — Multi-Agent Debate (5:00–5:30)

**[แสดง Commit-Reveal Protocol Diagram]**

> "สิ่งที่ทำให้เราต่างจากทีมอื่น คือ Anti-Collusion Debate Protocol
>
> - **Knowledge Partition** — แบ่งข้อมูลให้ Researcher กับ Skeptic เห็นคนละชุด
> - **Commit-Reveal** — Agent lock คำตอบด้วย SHA-256 ก่อนเปิดเผย ป้องกันฮั้ว
> - **Bias Convergence Detection** — ถ้าเห็นตรงกัน > 95% ตั้งแต่รอบแรก → สงสัยฮั้ว → inject adversarial prompt
>
> ทุก routing ถูกบันทึกเป็น Proof-of-Routing ใน audit log
> กรรมการสามารถตรวจสอบได้ว่า AI ตัดสินใจอย่างไรในทุกขั้นตอน"

---

### สไลด์ 12 — Impact & KPI (5:30–6:15)

**[แสดงตาราง KPI]**

> "ผลลัพธ์ที่วัดได้:
>
> | ตัวชี้วัด | เป้าหมาย |
> |-----------|----------|
> | ลดเวลาค้นคว้า | 30 นาที → 3 นาที (90%) |
> | Citation Accuracy | ≥ 95% |
> | PII Masking Recall | ≥ 99.2% |
> | CFS Fairness Score | ≥ 93.5% |
> | Honesty Score เฉลี่ย | ≥ 0.85 |
> | Hallucination Rate | < 1% |
> | ลดอัตราตีกลับคำฟ้อง | จาก 60% → < 10% |
> | Audit Chain Integrity | 100% |
>
> ต้นทุน production ประมาณ $690/เดือน (Reserved Instance)
> คุ้มค่ากว่าจ้างคนเพิ่ม 1 ตำแหน่ง"

---

### สไลด์ 13 — Roadmap (6:00–6:15)

> "Roadmap 3 เฟส:
>
> - **Phase 1** ✅ เสร็จแล้ว — Core RAG + Search + Chatbot + Complaint + Dashboard
> - **Phase 2** ⏳ รอข้อมูลศาล — Judgment Drafting + Prediction + 176K คำพิพากษา
> - **Phase 3** 📋 แผน — LatentMAS ลด token cost 80% เร็วขึ้น 5 เท่า"

---

### สไลด์ 14 — Closing (6:15–7:00)

> "Smart LegalGuard AI ไม่ใช่แค่เว็บค้นกฎหมาย
>
> มันคือโครงสร้างพื้นฐานที่ทำให้:
> - **ประชาชน** เข้าถึงความยุติธรรมได้จากที่บ้าน
> - **ทนายความ** ค้นคว้าเร็วขึ้น 10 เท่า
> - **เจ้าหน้าที่ศาล** มองเห็น bottleneck แบบ real-time
> - **ตุลาการ** มีเครื่องมือช่วยยกร่างที่อ้างอิงได้
>
> และทั้งหมดนี้ ทำงานภายใต้ Responsible AI ที่ตรวจสอบได้ทุกขั้นตอน
>
> **AI ไม่ตัดสินคดี มนุษย์ตัดสิน — AI แค่ช่วยให้ตัดสินได้ดีขึ้น**
>
> ขอบคุณครับ"

---

## 🛡️ ตอบโจทย์คนที่ยังไม่มั่นใจเรื่อง AI ในศาล

### ความกังวลที่ 1: "AI จะมาแทนผู้พิพากษาหรือเปล่า?"

> ตอบ: ไม่ — ระบบมี Risk Tier R5 ที่ห้าม AI ตัดสินคดี ออกหมาย หรือลงโทษ โดยเด็ดขาด
>
> AI ทำได้แค่:
> - ค้นหาคำพิพากษาที่เกี่ยวข้อง (เหมือนผู้ช่วยวิจัยค้นหนังสือให้)
> - ยกร่างเบื้องต้น (เหมือนเสมียนร่างให้ ผู้พิพากษาต้องตรวจและแก้เอง)
> - สรุปสำนวน (เหมือนย่อเรื่องให้อ่านเร็วขึ้น)
>
> **เปรียบเทียบที่กรรมการเข้าใจ:**
> "AI เหมือนผู้ช่วยวิจัยที่ค้นฎีกาให้เร็วขึ้น ไม่ใช่ผู้พิพากษาคนใหม่
> ปากกาที่เซ็นคำพิพากษายังอยู่ในมือท่านเสมอ"
>
> **หลักฐานในระบบ:**
> - Risk Tier R5 = AI ห้ามทำ (ตัดสินคดี, ออกหมายจับ/ค้น, ลงโทษ)
> - Risk Tier R4 = AI ร่างได้ แต่ตุลาการต้องอนุมัติเท่านั้น
> - ทุก response มี disclaimer: "ต้องได้รับการตรวจสอบจากเจ้าหน้าที่ก่อนใช้จริง"
> - Confidence Cap 80% สำหรับร่างคำพิพากษา — AI ไม่มีวันบอกว่ามั่นใจ 100%

### ความกังวลที่ 2: "ข้อมูลคดีจะรั่วไหลไปต่างประเทศไหม?"

> ตอบ: ไม่ — ข้อมูลทั้งหมดอยู่ใน AWS ap-southeast-1 (สิงคโปร์/กรุงเทพ)
>
> **3 ชั้นป้องกัน:**
> 1. PII Masking — ข้อมูลส่วนบุคคลถูกปกปิดก่อนส่งไป LLM ทุกครั้ง (9 รูปแบบ)
> 2. Ollama Fallback — ถ้า cloud ล่ม ระบบสลับไปใช้ AI ในเครื่อง ข้อมูลไม่ออกนอก VPC
> 3. KMS Encryption — ศาลเป็นผู้ถือกุญแจเข้ารหัส ไม่ใช่ผู้ให้บริการ cloud
>
> **เปรียบเทียบ:**
> "เหมือนตู้เซฟที่กุญแจอยู่กับท่านเลขาธิการศาล ไม่ใช่กับบริษัท cloud"
>
> **ระดับชั้นความลับ 4 ระดับ:**
> - สาธารณะ (FAQ, คู่มือ) → ทุกคนเข้าถึงได้
> - ภายใน (แบบฟอร์ม, ระเบียบ) → เจ้าหน้าที่ + ทนาย
> - ลับ (คำพิพากษา anonymized) → เจ้าหน้าที่ที่ได้รับอนุญาต
> - ลับมาก (ข้อมูลดิบ, PII) → ตุลาการ + admin เท่านั้น

### ความกังวลที่ 3: "AI ตอบผิดแล้วใครรับผิดชอบ?"

> ตอบ: ระบบออกแบบมาให้ "ผิดไม่ได้แบบเงียบๆ"
>
> **กลไกป้องกัน:**
> - Honesty Score ทุก response — ถ้าต่ำกว่า 0.50 → บล็อกคำตอบทันที
> - Circuit Breaker — PII รั่ว = บล็อกทันที, Hallucination > 5% = หยุดระบบ
> - CAL-130 Audit Log — ทุกการทำงานของ AI ถูกบันทึกด้วย SHA-256 Hash Chain
>   ตรวจสอบย้อนหลังได้ 100% ว่า AI ตอบอะไร เมื่อไหร่ อ้างอิงอะไร
> - Confidence Badge (🟢🟡🔴) — ผู้ใช้เห็นทันทีว่าควรเชื่อแค่ไหน
>
> **เปรียบเทียบ:**
> "เหมือนกล้องวงจรปิดที่บันทึกทุกการทำงานของ AI
> ถ้า AI ตอบผิด เราย้อนดูได้ว่าผิดตรงไหน เพราะอะไร"
>
> **ความรับผิดชอบ:**
> - AI ไม่มีอำนาจตัดสินใจ → ไม่มีความรับผิดทางกฎหมาย
> - มนุษย์เป็นผู้ตัดสินใจสุดท้ายเสมอ (Human-in-the-Loop)
> - ทุก action ที่ risk สูง (R3-R4) ต้องมีมนุษย์ approve

### วิธีพูดกับกรรมการที่ยังไม่มั่นใจ

> **อย่าพูดว่า:** "AI ฉลาดกว่าคน" / "AI แม่นยำ 99%" / "AI จะเปลี่ยนศาล"
>
> **ให้พูดว่า:**
> - "AI เป็นเครื่องมือ ไม่ใช่ผู้ตัดสินใจ"
> - "ผู้พิพากษายังเป็นผู้ถืออำนาจตุลาการเสมอ"
> - "ระบบช่วยให้ทำงานเร็วขึ้น ไม่ใช่ทำแทน"
> - "ข้อมูลอยู่ในมือศาล กุญแจเข้ารหัสอยู่กับท่าน"
> - "ทุกการทำงานของ AI ตรวจสอบย้อนหลังได้ 100%"
> - "ถ้า AI ไม่มั่นใจ มันจะบอกตรงๆ ว่าไม่รู้ ไม่แต่งเรื่อง"
>
> **ประโยคปิดที่ทรงพลัง:**
> "ระบบนี้ไม่ได้ออกแบบมาเพื่อแทนที่ท่าน
> แต่ออกแบบมาเพื่อให้ท่านมีเวลาพิจารณาคดีอย่างถี่ถ้วนมากขึ้น
> เพราะงานค้นคว้าที่เคยใช้เวลา 30 นาที ตอนนี้ใช้แค่ 3 นาที"

---

## 🎯 เตรียมรับคำถามกรรมการ (Q&A Cheat Sheet)

### ฟีเจอร์สำหรับ IT ศาล (กลุ่มผู้ขับเคลื่อน — อำนาจสนับสนุน + สนใจสูง)

ปัญหาจริงของ IT ศาล → ฟีเจอร์ที่ตอบโจทย์:

| ปัญหา IT ศาล | ฟีเจอร์ LegalGuard AI | หน้าจอ |
|-------------|---------------------|--------|
| ไม่รู้ว่า AI ทำงานยังไง ผิดตรงไหน | Live Metrics Dashboard — requests/1h, error rate, avg honesty, hallucination rate, cache hit | `/it` |
| ตรวจสอบย้อนหลังไม่ได้ | Audit Log Viewer — filter by action/role/case type, hash chain validation, export CSV | `/it` |
| กลัวข้อมูล PII รั่ว | PII Masking Tester — ทดสอบ mask ข้อความจริง + ดู spans ที่ตรวจเจอ | `/it` |
| Ingestion job ล้มเหลวไม่รู้ | Ingestion Job Monitor — สถานะ job, error log, retry chain, recovery chart | `/it` |
| ไม่มี benchmark วัดคุณภาพ AI | NitiBench Benchmark — Hit@K, MRR, Citation Accuracy จาก HuggingFace datasets | `/benchmark` |
| ไม่รู้ว่า AI มี bias ไหม | Responsible AI Dashboard — governance score, risk tier distribution, CFS trends | `/responsible-ai` |
| ระบบถูกโจมตี ต้องลดฟังก์ชัน | Security Middleware — rate limiting 120 req/min, WAF, role-based access, prompt injection detection | backend middleware |
| ข้อมูล silo กระจัดกระจาย | Knowledge Graph Stats — nodes, edges, entity types, NetworkX export | `/graph` |
| ต้องช่วย user ที่ไม่ถนัด IT | น้องซื่อสัตย์ Chatbot — ถามวิธีใช้ระบบได้ทันที ลดภาระ helpdesk | ทุกหน้า |
| ต้องดูแลทั้งระบบเก่า+ใหม่ | API-first design — เชื่อม CIOS/e-Filing ผ่าน REST API ไม่ต้องเขียนใหม่ | backend API |

สิ่งที่ IT ศาลจะชอบมากที่สุด:
- Audit Log Hash Chain Validation — กดปุ่มเดียวตรวจว่า log ถูกแก้ไขหรือไม่
- PII Masking Tester — paste ข้อความจริง ดูว่า mask ได้ครบไหม ก่อน deploy
- Ingestion Retry Chain — เห็น recovery path เมื่อ job ล้มเหลว ไม่ต้องเดา
- Live Metrics — เห็น system health real-time ไม่ต้องรอรายงาน

### Stakeholder Power-Interest Matrix (ใช้ประกอบ pitch)

```
                    ความสนใจต่ำ                    ความสนใจสูง
                ┌─────────────────────┬─────────────────────┐
  อำนาจสูง     │ ผู้พิพากษาศาลฎีกา    │ ผู้พิพากษาทั่วไป      │
  (ตัดสินใจ)   │ ตุลาการอาวุโส        │ ตุลาการศาลปกครอง     │
                │                     │                     │
                │ ⚠️ กลุ่มวิกฤต        │ ✅ กลุ่มพันธมิตร      │
                │ กังวลเรื่องอิสระ      │ ต้องการช่วยงาน       │
                │ ตุลาการ             │ แต่กังวลดุลยพินิจ     │
                ├─────────────────────┼─────────────────────┤
  อำนาจ        │ เจ้าหน้าที่ธุรการ     │ ทนายความ ⭐          │
  สนับสนุน     │ ประชาชนทั่วไป        │ เจ้าหน้าที่ IT        │
                │                     │                     │
                │ 📋 แจ้งข้อมูล        │ 🚀 ผู้ขับเคลื่อน      │
                │ ให้ใช้ง่าย           │ สนใจสูงสุด           │
                └─────────────────────┴─────────────────────┘
```

**กลยุทธ์ต่อแต่ละกลุ่ม:**

| กลุ่ม | กลยุทธ์ | ระบบตอบโจทย์อย่างไร |
|-------|---------|-------------------|
| ผู้พิพากษา (อำนาจสูง + สนใจต่ำ) | เริ่มจาก Low-Risk ก่อน แสดง Proof of Value | R5 ห้าม AI ตัดสิน, เริ่มจากค้นฎีกา/สรุปสำนวน, Judge-centric training |
| ตุลาการทั่วไป (อำนาจสูง + สนใจสูง) | ให้เครื่องมือที่โปร่งใส | Citation ชัดเจน, Confidence Badge, Disclaimer ทุก response |
| ทนายความ (สนใจสูงสุด) | ให้เครื่องมือเต็มที่ | Semantic Search, Case Prediction, Complaint Drafting |
| เจ้าหน้าที่ศาล (สนับสนุน) | ทำให้ใช้ง่าย ลดงานซ้ำ | Dashboard, คัดกรองคำฟ้อง, ติดตามคดี |
| ประชาชน (สนับสนุน + สนใจต่ำ) | ภาษาง่าย เข้าถึงได้ | น้องซื่อสัตย์ chatbot, ค้นหาด้วยภาษาธรรมชาติ |
| IT (สนับสนุน + สนใจสูง) | ให้ control เต็มที่ | Audit Log, PII monitoring, System health dashboard |

**สำหรับกลุ่มวิกฤต (ผู้พิพากษาอาวุโส — อำนาจสูง + สนใจต่ำ):**

> 4 ขั้นตอนทำให้ยอมรับ:
>
> 1. เริ่มจากงาน Low-Risk — ค้นฎีกา สรุปสำนวน ถอดความเสียง (ไม่แตะดุลยพินิจ)
> 2. แสดง Proof of Value — "30 นาที → 3 นาที" ให้เห็นด้วยตา ไม่ใช่แค่ตัวเลข
> 3. Judge-centric Training — ผู้พิพากษาสอนผู้พิพากษา ไม่ใช่ IT มาสอน
> 4. Human Oversight เข้มงวด — ตามคำแนะนำประธานศาลฎีกา 2568 + UNESCO
>
> **ประโยคสำคัญ:**
> "เราไม่ได้ขอให้ท่านเชื่อ AI — เราขอให้ท่านลองใช้ AI ค้นฎีกาแค่ครั้งเดียว
> แล้วท่านจะเห็นเองว่ามันช่วยประหยัดเวลาได้จริง
> โดยที่ดุลยพินิจยังอยู่ในมือท่าน 100%"

### Q: ข้อมูลจากศาลยังมาไม่ครบ ระบบทำงานได้จริงไหม?

> "ระบบมี Missing Data Penalty — เมื่อข้อมูลขาด ระบบปรับลดเพดานความมั่นใจอัตโนมัติ
> และแสดงคำเตือนว่าข้อมูลจากแหล่งใดยังไม่พร้อม
> ตอนนี้มี 176,543 คำพิพากษา + 315 เอกสารศาล + 6 HuggingFace datasets
> Phase 2 รองรับ ingest เพิ่มได้ทันทีเมื่อข้อมูลมา"

### Q: ทำไมไม่ใช้ Bedrock Knowledge Bases สำเร็จรูป?

> "Bedrock KB ดีสำหรับ general use แต่กฎหมายไทยต้องการ:
> 1. PyThaiNLP tokenization สำหรับ chunking ภาษาไทย
> 2. BM25 สำหรับจับคู่มาตรา/เลขคดีที่ semantic search พลาด
> 3. LeJEPA reranking ที่มี OOD detection
> 4. Multi-Agent Debate ที่ Bedrock KB ไม่รองรับ
> เราใช้ Bedrock Claude เป็น LLM หลัก แต่ pipeline เป็น custom"

### Q: PII Masking ครอบคลุมแค่ไหน?

> "9 รูปแบบ: เลขบัตรประชาชน, เบอร์โทร, อีเมล, ที่อยู่, คำนำหน้าชื่อ,
> เลขบัญชีธนาคาร, หนังสือเดินทาง, LINE ID, ชื่อ-นามสกุล
> Recall ≥ 99.2% — ทดสอบด้วย test suite 60+ cases
> PII ถูก mask ก่อนส่งไป LLM ทุกครั้ง ไม่มีข้อยกเว้น"

### Q: ถ้า AI ตอบผิดล่ะ?

> "7 ชั้นป้องกัน + Circuit Breaker
> ถ้า Honesty Score < 0.50 → บล็อกคำตอบทันที
> ถ้า PII รั่ว → บล็อกทันที + alert admin
> ถ้า Hallucination > 5% → หยุดระบบ
> ทุก response มี Confidence Badge (🟢🟡🔴) ให้ผู้ใช้ตัดสินใจ
> และ Risk Tier R5 (ตัดสินคดี, ออกหมาย) → AI ห้ามทำ มนุษย์เท่านั้น"

### Q: ต้นทุนเท่าไหร่?

> "Production: ~$690/เดือน (Reserved 1 ปี) หรือ ~$1,150 On-Demand
> รวม EKS, RDS Multi-AZ, Redis, Qdrant, ALB, WAF, S3, KMS
> คุ้มค่ากว่าจ้างเจ้าหน้าที่เพิ่ม 1 ตำแหน่ง
> Phase 3 LatentMAS จะลด API cost อีก 80%"

### Q: ทำไมเลือก Typhoon + Bedrock ไม่ใช้ GPT-4?

> "Bedrock Claude เป็น primary — อยู่ใน AWS region ข้อมูลไม่ออกนอก
> Typhoon เป็น Thai-optimized LLM จาก SCB 10X — เข้าใจภาษาไทยดีกว่า
> Fallback chain: Bedrock → Typhoon → SeaLLM → Anthropic → Ollama
> ถ้า cloud ล่มทั้งหมด → Ollama local ข้อมูลไม่ออกนอก VPC"

### Q: User Research มาจากไหน?

> "สำรวจ 17 คน: ทนาย 3, ประชาชน 8, เจ้าหน้าที่รัฐ 4, อื่นๆ 2
> ผ่าน Google Forms — ถามเรื่องพฤติกรรมค้นหา ปัญหา ความต้องการ
> 90% ของ requirements ตอบโจทย์แล้ว
> 3 items pending: ราชกิจจานุเบกษา API, Knowledge Graph, มาตรา linking
> Knowledge Graph เสร็จแล้ว — เหลือ 2 items"

### Q: Fairness วัดยังไง?

> "CFS (Composite Fairness Score) วัด 5 มิติ:
> ภูมิศาสตร์, ประเภทศาล, ประเภทคดี, ช่วงเวลา, บทบาทผู้ใช้
> ถ้า CFS < 0.7 → แสดง fairness warning
> Dashboard มี Fairness Monitoring tab แสดง CFS trends + bias breakdown"

### Q: ระบบรองรับ scale ได้แค่ไหน?

> "EKS Auto Scaling: 2-8 pods, scale on CPU > 70%
> RDS Multi-AZ + ElastiCache Multi-AZ
> FAISS รองรับ 100M+ vectors
> Semantic Cache ลด load ซ้ำ (RapidFuzz threshold 0.85)
> Rate limiting 120 req/min per IP"

---

## 💡 เคล็ดลับการนำเสนอ

1. **เปิดด้วยตัวเลข** — กรรมการจำตัวเลขได้ดีกว่าคำพูด
2. **Demo สด** — เปิดหน้าเว็บจริง ไม่ใช่ screenshot
3. **พูดช้าตอน Responsible AI** — นี่คือจุดที่ทำให้ชนะ
4. **เน้น "AI ห้ามตัดสินคดี"** — กรรมการจากกระทรวงยุติธรรมจะชอบ
5. **จบด้วย vision** — ไม่ใช่แค่ demo แต่คือโครงสร้างพื้นฐานระดับชาติ
6. **เตรียม backup** — ถ้า internet ล่ม มี screenshot/video สำรอง
7. **ใช้ภาษาที่กรรมการเข้าใจ** — หลีกเลี่ยงศัพท์ tech เกินไป ใช้ "ระบบตรวจสอบ" แทน "Circuit Breaker"

---

## 📊 ตัวเลขสำคัญที่ต้องจำ

| ตัวเลข | ความหมาย |
|--------|----------|
| 176,543 | คำพิพากษาใน corpus |
| 315 | เอกสารศาลที่ ingest แล้ว |
| 6 | HuggingFace datasets |
| 7 | ชั้นป้องกัน AI หลอน |
| 93.7% | Hit@3 จาก Ablation Study (FAISS 70% + BM25 30%) |
| 95% | Citation Accuracy เป้าหมาย |
| 93.5% | CFS Fairness Score เป้าหมาย |
| 99.2% | PII Masking Recall |
| 30 → 3 นาที | ลดเวลาค้นคว้า 90% |
| $690/เดือน | ต้นทุน production (Reserved) |
| 458 | Unit tests ที่ผ่าน |
| 31 | Services ใน backend |
| 14 | API routers |
| 4 | กลุ่มผู้ใช้ (ประชาชน/ทนาย/เจ้าหน้าที่/ตุลาการ) |
| R0-R5 | Risk Tiers (R5 = AI ห้ามทำ) |
