# Requirements Document

## Introduction

Smart Court AI Enhancement เป็นการยกระดับระบบ Smart LegalGuard AI ของกระทรวงยุติธรรมให้รองรับข้อมูลศาลยุติธรรม (Set A) และศาลปกครอง (Set B) อย่างครบถ้วน พร้อมเพิ่มความสามารถ AI ขั้นสูงสำหรับการค้นหาเชิงความหมาย (Semantic Search), การร่างคำฟ้องอัจฉริยะ, การวิเคราะห์เชิงทำนาย, และ Smart Dashboard เพื่อลดเวลา ขั้นตอน กระดาษ ข้อผิดพลาด และต้นทุนในกระบวนการยุติธรรม

## Data Inventory (สถานะข้อมูลจริง ณ ปัจจุบัน)

### ชุด A — ศาลยุติธรรม

| รหัส | รายการ | สถานะ | รายละเอียด |
|------|--------|--------|------------|
| A1.1 | แบบฟอร์มคำฟ้อง e-Filing (87 แบบ) | ✅ มีแล้ว | PDF + Word, 98 ไฟล์ ใน `data/.../A1/` |
| A1.2 | Template คำฟ้อง (แพ่ง, อาญา, ครอบครัว, ผู้บริโภค) | ⚠️ มีบางส่วน | มีเฉพาะ 05 คำขอท้ายคำฟ้องแพ่ง และ 06 คำขอท้ายคำฟ้องอาญา |
| A1.3 | คำอธิบายแบบฟอร์มแต่ละฟิลด์ (87 ชุด) | ❌ รอรับจากศาล | — |
| A1.4 | ตัวอย่างการกรอกที่ถูกต้อง (50+ ตัวอย่าง) | ❌ รอรับจากศาล | — |
| A1.5 | ตัวอย่างหมายศาล (หมายเรียก, จับ, ค้น) | ❌ รอรับจากศาล | — |
| A1.6 | แบบฟอร์มเอกสารประกอบ (ใบมอบอำนาจ, บัญชีพยาน) | ✅ มีแล้ว | รวมอยู่ใน A1.1 |
| A2.1 | คู่มือ e-Filing v3 สำหรับประชาชน | ✅ มีแล้ว | 1 ไฟล์ PDF ใน `data/.../A2/` |
| A2.2 | คู่มือการยื่นฟ้องแต่ละประเภทคดี (5+ ฉบับ) | ❌ รอรับจากศาล | — |
| A2.3 | Flow Chart ขั้นตอน (10+ ชุด) | ❌ รอรับจากศาล | — |
| A2.4 | Checklist การเตรียมเอกสาร (20+ รายการ) | ❌ รอรับจากศาล | — |
| A2.5 | FAQ ศาลยุติธรรม (100+ ข้อ) | 🌐 เข้าถึงออนไลน์ | จากเว็บไซต์ศาลยุติธรรม coj.go.th/th/faq |
| A2.6 | วิดีโอสอนใช้งาน e-Filing | 🌐 เข้าถึงออนไลน์ | YouTube Channel ศาลยุติธรรม |
| A2.7 | คู่มือการอ่านหมายศาล | ❌ รอรับจากศาล | — |
| A3.1 | ระเบียบการยื่นฟ้อง | ❌ รอรับจากศาล | — |
| A3.2 | อัตราค่าธรรมเนียม | ❌ รอรับจากศาล | — |
| A3.3 | เกณฑ์การตรวจสอบเอกสาร | ❌ รอรับจากศาล | — |
| A3.4 | ระยะเวลามาตรฐานแต่ละขั้นตอน | ❌ รอรับจากศาล | — |
| A3.5 | XML Schema e-Filing (87 Schema) | ❌ รอรับจากศาล | — |
| A4.1 | คำพิพากษาศาลฎีกา (100,000+ คดี, 10 ปี) | ❌ รอรับจากศาล | สืบค้นได้ที่ deka.supremecourt.or.th |
| A4.2 | คำพิพากษาศาลอุทธรณ์ (50,000+ คดี, 5 ปี) | ❌ รอรับจากศาล | — |
| A4.3 | คำพิพากษาศาลชั้นต้น (10,000+ คดี, 3 ปี) | ❌ รอรับจากศาล | — |
| A5.1 | คำฟ้องที่ครบถ้วน (200+ ฉบับ) | ❌ รอรับจากศาล | — |
| A5.2 | คำฟ้องที่ถูกตีกลับพร้อมเหตุผล (100+ ฉบับ) | ❌ รอรับจากศาล | — |
| A5.3 | คำฟ้องก่อน-หลังแก้ไข (50+ คู่) | ❌ รอรับจากศาล | — |
| A5.4 | สำนวนคดีตัวอย่าง 100-500 หน้า (10+ สำนวน) | ❌ รอรับจากศาล | — |
| A5.5 | Chat log ตัวอย่าง (10+ ชุด) | ❌ รอรับจากศาล | — |
| A5.6 | Transaction record ตัวอย่าง (10+ ชุด) | ❌ รอรับจากศาล | — |
| A6.1 | สถิติคดีรับ (5 ปี) | ❌ รอรับจากศาล | — |
| A6.2 | สถิติการตีกลับสำนวน (3 ปี) | ❌ รอรับจากศาล | — |
| A6.3 | ระยะเวลาพิจารณาเฉลี่ย (3 ปี) | ❌ รอรับจากศาล | — |
| A6.4 | อัตราชนะ-แพ้ (3 ปี) | ❌ รอรับจากศาล | — |
| A7.1 | รายชื่อศาลทั้งหมด (ที่ตั้ง, GPS, เบอร์) | ✅ มีแล้ว | 1 ไฟล์ PDF ใน `data/.../A7/` (บางแห่งข้อมูลไม่ครบ) |
| A7.2 | ศาลที่เปิด e-Filing (29+ ศาล) | ✅ มีแล้ว | 2 ไฟล์ PDF (คดีผู้บริโภค + จัดการมรดก) |
| A7.3 | Call Center/สายด่วน | 🌐 เข้าถึงออนไลน์ | จากเว็บไซต์ศาลยุติธรรม |
| A7.4 | ศูนย์ยุติธรรมชุมชน | ⚠️ ข้อมูลไม่ครบ | ทราบว่ามี 7,000+ แห่ง แต่ไม่มีรายชื่อ |

### ชุด B — ศาลปกครอง

| รหัส | รายการ | สถานะ | รายละเอียด |
|------|--------|--------|------------|
| B1.1 | แบบคำฟ้อง ปค.1 | ✅ มีแล้ว | PDF + Word ใน `data/.../B1/` |
| B1.2 | แบบคำร้องต่างๆ (10+ แบบ) | ✅ มีแล้ว | รวมอยู่ใน B1 (~90 ไฟล์ PDF) |
| B1.3 | แบบคำให้การ | ✅ มีแล้ว | รวมอยู่ใน B1 |
| B1.4 | Template คำฟ้องแต่ละประเภทคดีปกครอง | ✅ มีแล้ว | รวมอยู่ใน B1 |
| B1.5 | รายการเอกสารประกอบ/Checklist | ⚠️ มีบางส่วน | มีแยกประเภทคดี แต่ไม่มี checklist สำหรับแต่ละคดี |
| B1.6 | ตัวอย่างเอกสารรับรอง (20+ ตัวอย่าง) | ❌ รอรับจากศาล | — |
| B2.1 | คู่มือคดีปกครองสำหรับประชาชน | ✅ มีแล้ว | 1 ไฟล์ PDF ใน `data/.../B2/` |
| B2.2 | Flow Chart ขั้นตอนฟ้องคดี | ✅ มีแล้ว | 1 ไฟล์ JPG ใน `data/.../B2/` |
| B2.3 | FAQ คดีปกครอง (50-100 ข้อ) | ✅ มีแล้ว | 1 ไฟล์ PDF ใน `data/.../B2/` |
| B2.4 | Case Study สถานการณ์จำลอง (20-30 กรณี) | ❌ รอรับจากศาล | — |
| B2.5 | ตารางเปรียบเทียบ คดีปกครอง vs แพ่ง vs อาญา | ✅ มีแล้ว | 1 ไฟล์ JPG ใน `data/.../B2/` |
| B2.6 | คู่มือกลุ่มพิเศษ (ผู้สูงวัย, ผู้พิการ, อังกฤษ) | ❌ รอรับจากศาล | — |
| B2.7 | คู่มือบุคลากรศาล | 🌐 เข้าถึงออนไลน์ | จากเว็บไซต์ศาลปกครอง |
| B2.8 | วิดีโอสอนการยื่นฟ้อง e-Filing | ❌ รอรับจากศาล | — |
| B3.1 | พ.ร.บ.จัดตั้งศาลปกครอง พ.ศ. 2542 | ✅ มีแล้ว | 1 ไฟล์ PDF ใน `data/.../B2/` |
| B3.2 | พ.ร.บ.วิธีพิจารณาคดีปกครอง พ.ศ. 2542 | 🌐 เข้าถึงออนไลน์ | จากเว็บไซต์ศาลปกครอง |
| B3.3 | ระเบียบศาลปกครองสูงสุด | ✅ มีแล้ว | 1 ไฟล์ PDF ใน `data/.../B3/` |
| B3.4 | คำสั่งประธานศาลปกครองสูงสุด | ❌ รอรับจากศาล | — |
| B3.5 | อัตราค่าธรรมเนียม | ✅ มีแล้ว | 1 ไฟล์ JPG ใน `data/.../B3/` + เว็บไซต์ admincourt.go.th |
| B4.1 | Checklist การรับคำฟ้อง | ❌ รอรับจากศาล | — |
| B4.2 | เกณฑ์การตีกลับสำนวน + ตัวอย่าง | ❌ รอรับจากศาล | — |
| B4.3 | Validation Rules แต่ละฟิลด์ | ❌ รอรับจากศาล | — |
| B4.4 | องค์ประกอบคำฟ้อง มาตรา 56 | ❌ รอรับจากศาล | — |
| B4.5 | การตรวจสอบอำนาจศาล (Logic Tree) | ❌ รอรับจากศาล | — |
| B4.6 | การตรวจสอบส่วนได้เสีย (20+ กรณี) | ❌ รอรับจากศาล | — |
| B4.7 | การนับระยะเวลา 90 วัน | ❌ รอรับจากศาล | — |
| B5.1 | คำพิพากษาศาลปกครองสูงสุด (2,000+ คดี) | ❌ รอรับจากศาล | สืบค้นได้ที่ admincourt.go.th |
| B5.2 | คำพิพากษาศาลปกครองกลาง (1,000+ คดี) | ❌ รอรับจากศาล | — |
| B5.3 | คำพิพากษาศาลปกครองชั้นต้น (1,000+ คดี) | ❌ รอรับจากศาล | — |
| B5.4 | Landmark Cases (50-100 คดี) | ❌ รอรับจากศาล | — |

### เอกสารประกอบโครงการ (ระดับ root ของ `data/`)

| ไฟล์ | รายละเอียด |
|------|------------|
| `LegalGuard_Competition_Blueprint.docx` | Blueprint โครงการแข่งขัน |
| `LegalGuard_Dev_Architecture.html` | สถาปัตยกรรมระบบ |
| `กลยุทธ์_AI_Dataset_และการทำ_Fine-tuning_บน_AWS...pdf` | กลยุทธ์ AI/Fine-tuning บน AWS |
| `รายงานวิจัย_Agentic_AI_Governance...docx` | รายงานวิจัย Agentic AI Governance |
| `สรุปสถาปัตยกรรม_AWS...pdf` | สถาปัตยกรรม AWS แบบบูรณาการ |
| `สารบัญ...xlsx` | สารบัญชุดข้อมูลทั้งหมด (master index) |
| `case_2568_sample.json` | ตัวอย่างคดี 1 รายการ |
| `mockResults.ts` | Mock data สำหรับ frontend (25 คดี) |

### สรุปสถานะข้อมูล

- ✅ มีแล้ว: A1.1, A1.6, A2.1, A7.1, A7.2, B1.1-B1.4, B2.1-B2.3, B2.5, B3.1, B3.3, B3.5
- ⚠️ มีบางส่วน: A1.2, A7.4, B1.5
- 🌐 เข้าถึงออนไลน์: A2.5, A2.6, A7.3, B2.7, B3.2
- ❌ รอรับจากศาล: A1.3-A1.5, A2.2-A2.4, A2.7, A3.1-A3.5, A4.1-A4.3, A5.1-A5.6, A6.1-A6.4, B1.6, B2.4, B2.6, B2.8, B3.4, B4.1-B4.7, B5.1-B5.4

### Court Judgment Corpus (ข้อมูลคำพิพากษาจริง)

| แหล่ง | Records | สถานะ |
|-------|---------|--------|
| ศาลฎีกา (แผนกคดีพิเศษรวม) | ~15,000 | ✅ มีแล้ว |
| ศาลอุทธรณ์ (11 ศาล: กลาง + ภาค 1-9 + ชำนัญพิเศษ) | ~45,000 | ✅ มีแล้ว |
| ศาลชั้นต้น (262 ศาล: จังหวัด 111 + แขวง 39 + เยาวชน + สาขา) | ~67,800 | ✅ มีแล้ว |
| **Corpus รวม** | **176,543** | **6.03 GB** |
| FAISS Indexed (พร้อมค้นหา) | 127,800 | ✅ |
| Pending QC (รอตรวจสอบ) | 48,743 | ⏳ |

### HuggingFace Datasets (เปิดสาธารณะ — ใช้ได้ทันที)

| Dataset | URL | ใช้ทำอะไร |
|---------|-----|----------|
| WangchanX-Legal-ThaiCCL-RAG | huggingface.co/datasets/airesearch/WangchanX-Legal-ThaiCCL-RAG | Validation set (Q&A pairs + context) |
| WangchanX-Legal-ThaiCCL-Refusal | huggingface.co/datasets/panuthept/WangchanX-Legal-ThaiCCL-Refusal | สอน AI รู้จักปฏิเสธตอบ ("ไม่รู้" policy) |
| ThaiLaw (pythainlp) | huggingface.co/datasets/pythainlp/thailaw | กฎหมายไทยฉบับเต็ม (Domain Adaptation) |
| RAG Thai Laws (iapp) | huggingface.co/datasets/iapp/rag_thai_laws | Thai laws สำหรับ RAG pipeline |
| Thai Traffic Law RAG | huggingface.co/datasets/Apiwat01/thai-traffic-law-rag | Domain-specific (จราจร) |
| Thai Land Tax Legal QA | huggingface.co/datasets/monoboard/thai-land-tax-legal-qa | Domain-specific (ภาษีที่ดิน) |

### Custom Datasets (รอรับ/สร้างเอง)

| Dataset | Format | สถานะ |
|---------|--------|--------|
| Custom ชุด A — ศาลยุติธรรม (คำพิพากษา 100K+, e-Filing, คู่มือ) | JSONL (Prompt-Completion) | ⏳ รอ MOU กับ COJ |
| Custom ชุด B — ศาลปกครอง (คำพิพากษา, ปค.1, Landmark Cases) | JSONL (Instruction-based) | ⏳ รอรับจากศาลปกครอง |
| Legal Vocabulary Dataset (พจนานุกรมกฎหมายไทย) | Text/CSV | 🔧 สร้างเอง |

**ข้อมูลที่ขาดหายสำคัญที่สุด**: คำพิพากษาจริง (A4, B5), ข้อมูลฝึก AI (A5), สถิติคดี (A6), เกณฑ์ตรวจสอบคำฟ้อง (B4), และ XML Schema e-Filing (A3.5)

## Glossary

- **LegalGuard_System**: ระบบ Smart LegalGuard AI ทั้งหมด ประกอบด้วย Frontend (React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui) และ Backend (Supabase Edge Functions + Google Gemini)
- **Knowledge_Base**: ฐานข้อมูลเวกเตอร์ (Vector Store) ที่จัดเก็บข้อมูลคำพิพากษา กฎหมาย และเอกสารศาลในรูปแบบ embeddings สำหรับ Retrieval-Augmented Generation (RAG)
- **Data_Ingestion_Pipeline**: กระบวนการนำเข้า แปลง และจัดทำดัชนีข้อมูลจากแหล่งข้อมูลศาลยุติธรรม (Set A) และศาลปกครอง (Set B) เข้าสู่ Knowledge_Base
- **Semantic_Search_Engine**: เครื่องมือค้นหาเชิงความหมายที่เข้าใจบริบท ข้อเท็จจริง และบทบัญญัติกฎหมาย แทนการจับคู่คำ (keyword matching)
- **Complaint_Drafting_Assistant**: ระบบ AI ช่วยร่างคำฟ้องสำหรับประชาชน โดยตรวจสอบความครบถ้วนตามหลักเกณฑ์ศาลและรองรับ e-Filing XML Schema
- **Judgment_Drafting_Agent**: AI Agent สำหรับตุลาการ ช่วยยกร่างและทบทวนคำพิพากษาโดยอ้างอิงแนวคำพิพากษาที่เกี่ยวข้อง
- **Case_Outcome_Predictor**: โมเดลเชิงทำนายที่วิเคราะห์แนวโน้มผลคดีจากข้อเท็จจริงและแนวคำพิพากษาในอดีต
- **Smart_Dashboard**: แดชบอร์ดแสดงสถิติคดีแบบ real-time พร้อมการวิเคราะห์คอขวดและสร้างรายงานอัตโนมัติ
- **Speech_To_Text_Engine**: เครื่องมือแปลงเสียงเป็นข้อความสำหรับบันทึกการไต่สวน
- **PII_Masking_Engine**: เครื่องมือตรวจจับและปกปิดข้อมูลส่วนบุคคลในเอกสารศาล (มีอยู่แล้วบางส่วน)
- **Nong_Kot_Chatbot**: แชทบอท "น้องกฎ" ผู้ช่วย AI ด้านกฎหมายไทยสำหรับประชาชน (มีอยู่แล้วบางส่วน)
- **Set_A_Data**: ข้อมูลศาลยุติธรรม ประกอบด้วยคำพิพากษา สถิติคดี แบบฟอร์ม ข้อมูลฝึก AI ระเบียบ และคู่มือประชาชน
- **Set_B_Data**: ข้อมูลศาลปกครอง ประกอบด้วยเกณฑ์ตรวจสอบคำฟ้อง คู่มือ กรณีศึกษาจำลอง เอกสารที่เกี่ยวข้อง และคดีสำคัญ
- **e_Filing_Schema**: XML Schema มาตรฐานสำหรับการยื่นคำฟ้องผ่านระบบศาลออนไลน์
- **Citizen**: ประชาชนทั่วไปที่ใช้ระบบเพื่อค้นหาข้อมูลกฎหมายและร่างคำฟ้อง
- **Lawyer**: ทนายความหรือนักกฎหมายที่ใช้ระบบเพื่อค้นหาแนวคำพิพากษาและวิเคราะห์คดี
- **Government_Official**: เจ้าหน้าที่รัฐและตุลาการที่ใช้ระบบเพื่อยกร่างคำพิพากษาและบริหารจัดการคดี

## Requirements

### Requirement 1: Data Ingestion Pipeline for Justice Court Data (Set A)

**User Story:** As a Government_Official, I want the LegalGuard_System to ingest and index Justice Court data, so that AI capabilities can reference accurate and comprehensive court information.

#### Phase 1 — ข้อมูลที่มีแล้ว (พร้อม ingest ทันที)

1. WHEN the existing 98 court form PDFs (A1.1 + A1.6) are provided, THE Data_Ingestion_Pipeline SHALL parse each PDF, extract form structure and field names, and store them in the Knowledge_Base with metadata including form number, form name, and form category (คำฟ้อง/คำร้อง/หมาย/เอกสารประกอบ).
2. WHEN the e-Filing v3 citizen guide (A2.1) is provided, THE Data_Ingestion_Pipeline SHALL chunk the PDF into sections and store each section with topic metadata for RAG retrieval.
3. WHEN the court directory data (A7.1, A7.2) is provided, THE Data_Ingestion_Pipeline SHALL extract court names, addresses, phone numbers, GPS coordinates, and e-Filing availability into structured records.
4. WHEN FAQ data from the Justice Court website (A2.5) is scraped, THE Data_Ingestion_Pipeline SHALL store each question-answer pair as a separate record with topic classification.
5. WHEN the existing mock case data (`data/case_2568_sample.json`, `data/mockResults.ts`) is provided, THE Data_Ingestion_Pipeline SHALL index each case with case number, court type, year, statutes, summary, and full text.

#### Phase 2 — ข้อมูลที่รอรับจากศาล

6. WHEN Set_A_Data containing court judgments (A4.1-A4.3) is received, THE Data_Ingestion_Pipeline SHALL parse and store Supreme Court judgments (100,000+), Appeal Court judgments (50,000+), and First Instance Court judgments (10,000+) into the Knowledge_Base with metadata including case number, court type, year, statutes cited, and full text.
7. WHEN Set_A_Data containing case statistics (A6.1-A6.4) is received, THE Data_Ingestion_Pipeline SHALL extract and store case intake statistics, rejection statistics with reasons, average processing time by case type, and win/loss rates.
8. WHEN Set_A_Data containing form field descriptions (A1.3), fill examples (A1.4), and court summons examples (A1.5) is received, THE Data_Ingestion_Pipeline SHALL parse field explanations, correct fill examples, and court summons examples into structured records in the Knowledge_Base.
9. WHEN Set_A_Data containing AI training data (A5.1-A5.6) is received, THE Data_Ingestion_Pipeline SHALL process complete complaints (200+), rejected complaints with rejection reasons (100+), before/after comparison data (50+ pairs), sample case files, and digital evidence examples (chat logs, transaction records) into the Knowledge_Base.
10. WHEN Set_A_Data containing rules and regulations (A3.1-A3.5) is received, THE Data_Ingestion_Pipeline SHALL index filing procedures, fee schedules, document verification criteria, standard timelines, and e_Filing_Schema XML definitions (87 schemas).
11. WHEN Set_A_Data containing citizen guides (A2.2-A2.4, A2.7) is received, THE Data_Ingestion_Pipeline SHALL store filing guides per case type (5+), flow charts (10+), document checklists (20+), and court summons reading guides.

#### General

12. IF the Data_Ingestion_Pipeline encounters a malformed or unreadable document, THEN THE Data_Ingestion_Pipeline SHALL log the error with the document identifier and source dataset code (e.g. A1.3, A4.1) and continue processing remaining documents.
13. THE Data_Ingestion_Pipeline SHALL tag each ingested record with its source dataset code (A1.1 through A7.4) to enable traceability and incremental updates when new data arrives from the court.

### Requirement 2: Data Ingestion Pipeline for Administrative Court Data (Set B)

**User Story:** As a Government_Official, I want the LegalGuard_System to ingest Administrative Court data, so that the system can validate complaints and provide guidance specific to administrative law.

#### Phase 1 — ข้อมูลที่มีแล้ว (พร้อม ingest ทันที)

1. WHEN the existing ~90 Administrative Court form PDFs (B1.1-B1.4) are provided, THE Data_Ingestion_Pipeline SHALL parse each PDF, extract form structure and field names, and store them in the Knowledge_Base with metadata including form number, form name, and form category.
2. WHEN the citizen guide for administrative cases (B2.1), FAQ (B2.3), flow chart (B2.2), and comparison table (B2.5) are provided, THE Data_Ingestion_Pipeline SHALL chunk and store each document with topic metadata for RAG retrieval.
3. WHEN the Administrative Court Regulations (B3.3), Administrative Court Establishment Act (B3.1), and fee schedule (B3.5) are provided, THE Data_Ingestion_Pipeline SHALL index the full text with section-level granularity.
4. WHEN the Academic paper on administrative court procedures (B3 `Academic_140225_141554.pdf`) is provided, THE Data_Ingestion_Pipeline SHALL extract and index legal principles and procedural guidelines.

#### Phase 2 — ข้อมูลที่รอรับจากศาล

5. WHEN Set_B_Data containing validation criteria (B4.1-B4.7) is received, THE Data_Ingestion_Pipeline SHALL parse and store complaint acceptance checklists, rejection criteria with examples, validation rules per field, complaint elements per Section 56, jurisdiction verification logic trees, interest verification examples (20+ cases), and the 90-day counting method.
6. WHEN Set_B_Data containing case studies and special group guides (B2.4, B2.6, B2.8) is received, THE Data_Ingestion_Pipeline SHALL store 20-30 simulated case studies, guides for special groups (elderly, disabled, English-speaking users), and e-Filing video tutorial metadata.
7. WHEN Set_B_Data containing certification examples and Chief Justice orders (B1.6, B3.4) is received, THE Data_Ingestion_Pipeline SHALL index 20+ certification examples and Chief Justice orders on document filing.
8. WHEN Set_B_Data containing court judgments (B5.1-B5.3) is received, THE Data_Ingestion_Pipeline SHALL store Supreme Administrative Court judgments (2,000+), Central Administrative Court judgments (1,000+), and First Instance Administrative Court judgments (1,000+).
9. WHEN Set_B_Data containing landmark cases (B5.4) is received, THE Data_Ingestion_Pipeline SHALL store 50-100 important cases with case summaries, legal principles, and referenced statutes.

#### General

10. IF the Data_Ingestion_Pipeline encounters duplicate records across Set_A_Data and Set_B_Data, THEN THE Data_Ingestion_Pipeline SHALL deduplicate records based on case number and court type, retaining the most recent version.
11. THE Data_Ingestion_Pipeline SHALL tag each ingested record with its source dataset code (B1.1 through B5.4) to enable traceability.
12. WHEN online data sources are available (e.g. admincourt.go.th judgment search), THE Data_Ingestion_Pipeline SHALL support web scraping with rate limiting and store results in the same Knowledge_Base format as file-based ingestion.

### Requirement 3: Advanced Semantic Search

**User Story:** As a Lawyer, I want to search for legal precedents using natural language describing facts and legal provisions, so that I can find relevant cases without relying on exact keyword matches.

#### Acceptance Criteria

1. WHEN a user submits a natural language query, THE Semantic_Search_Engine SHALL convert the query into a vector embedding and retrieve relevant documents from the Knowledge_Base using cosine similarity.
2. WHEN search results are returned, THE Semantic_Search_Engine SHALL rank results by semantic relevance score, with results that match both factual context and legal provisions ranked higher than partial matches.
3. WHILE a user with the Lawyer role is searching, THE Semantic_Search_Engine SHALL include full statute references, dissenting opinions, and cross-references to related cases in the results.
4. WHILE a user with the Citizen role is searching, THE Semantic_Search_Engine SHALL present results in simplified Thai language with plain-language summaries.
5. WHEN a query references a specific legal provision, THE Semantic_Search_Engine SHALL retrieve all cases citing that provision from both Justice Court and Administrative Court data.
6. THE Semantic_Search_Engine SHALL return search results within 2 seconds for 95th percentile queries.
7. IF the Semantic_Search_Engine cannot find results with a relevance score above 0.3, THEN THE Semantic_Search_Engine SHALL display a message suggesting alternative search terms.

### Requirement 4: AI-Assisted Complaint Drafting for e-Filing

**User Story:** As a Citizen, I want AI to help me draft a legal complaint step by step, so that I can file a correct and complete complaint through the e-Filing system without needing a lawyer.

#### Acceptance Criteria

1. WHEN a Citizen provides case facts in natural language, THE Complaint_Drafting_Assistant SHALL classify the case type (civil, criminal, administrative) and recommend the appropriate court.
2. WHEN a case type is determined, THE Complaint_Drafting_Assistant SHALL generate a structured complaint draft following the court form template for that case type, pre-filling fields based on the provided facts.
3. THE Complaint_Drafting_Assistant SHALL validate each field of the draft complaint against the court's document verification criteria from Set_A_Data.
4. WHEN the draft complaint is complete, THE Complaint_Drafting_Assistant SHALL export the complaint in e_Filing_Schema-compliant XML format.
5. IF a required field is missing or invalid, THEN THE Complaint_Drafting_Assistant SHALL highlight the field and provide a specific instruction on how to correct the entry, referencing the relevant form description from Set_A_Data.
6. WHEN drafting a complaint for Administrative Court, THE Complaint_Drafting_Assistant SHALL verify complaint elements per Section 56, jurisdiction, legal interest, and the 90-day filing deadline using validation rules from Set_B_Data.
7. THE Complaint_Drafting_Assistant SHALL apply PII_Masking_Engine to mask personal information in any preview or AI-processed text before sending data to the AI model.

### Requirement 5: Enhanced Judgment Drafting Agent

**User Story:** As a Government_Official, I want an AI agent to help draft and review court judgments by referencing relevant precedents, so that I can produce consistent and well-referenced judgments faster.

#### Acceptance Criteria

1. WHEN a Government_Official provides case facts, THE Judgment_Drafting_Agent SHALL retrieve the top 10 most relevant precedent cases from the Knowledge_Base and present them as references.
2. WHEN instructed to draft a judgment, THE Judgment_Drafting_Agent SHALL generate a draft following the standard court judgment format, including sections for facts, legal analysis, statute references, and ruling.
3. THE Judgment_Drafting_Agent SHALL cite specific case numbers and statutes from the Knowledge_Base in the generated draft.
4. WHEN a draft judgment is generated, THE Judgment_Drafting_Agent SHALL apply PII_Masking_Engine to redact personal information before displaying the draft.
5. IF the Judgment_Drafting_Agent references a case that is not present in the Knowledge_Base, THEN THE Judgment_Drafting_Agent SHALL flag the reference as unverified and display a warning to the Government_Official.
6. THE Judgment_Drafting_Agent SHALL log each drafting session to the CAL-130 audit log with action type "judgment_draft", including the case facts hash and referenced precedent case numbers.

### Requirement 6: Case Outcome Prediction

**User Story:** As a Lawyer, I want to see a predictive analysis of likely case outcomes based on historical data, so that I can advise clients on the strength of their case.

#### Acceptance Criteria

1. WHEN a Lawyer provides case facts and the applicable legal provisions, THE Case_Outcome_Predictor SHALL analyze historical judgment data from the Knowledge_Base and return a predicted outcome with a confidence score between 0 and 1.
2. THE Case_Outcome_Predictor SHALL provide a breakdown of factors contributing to the prediction, including the number of similar cases analyzed, win/loss ratio for the case type, and the most influential precedent cases.
3. THE Case_Outcome_Predictor SHALL display a disclaimer stating that the prediction is for informational purposes only and does not constitute legal advice.
4. IF fewer than 10 similar cases exist in the Knowledge_Base for the given case type, THEN THE Case_Outcome_Predictor SHALL display a low-confidence warning and state the limited data basis.
5. WHEN presenting prediction results, THE Case_Outcome_Predictor SHALL include links to the top 5 most similar historical cases used in the analysis.

### Requirement 7: Enhanced Nong Kot Chatbot with RAG

**User Story:** As a Citizen, I want the "น้องกฎ" chatbot to answer my legal questions using verified court data, so that I receive accurate and up-to-date legal guidance.

#### Acceptance Criteria

1. WHEN a Citizen asks a legal question, THE Nong_Kot_Chatbot SHALL retrieve relevant context from the Knowledge_Base using RAG before generating a response.
2. THE Nong_Kot_Chatbot SHALL cite the source case number or regulation for each factual claim in the response.
3. WHILE responding to a Citizen, THE Nong_Kot_Chatbot SHALL use simplified Thai language and avoid legal jargon.
4. WHEN the Nong_Kot_Chatbot cannot find relevant information in the Knowledge_Base, THE Nong_Kot_Chatbot SHALL state that the information is not available and recommend consulting a lawyer or the Legal Aid Office.
5. THE Nong_Kot_Chatbot SHALL log each conversation turn to the CAL-130 audit log with action type "chat".
6. WHEN a Citizen asks about filing procedures, THE Nong_Kot_Chatbot SHALL retrieve and present the relevant filing guide, document checklist, and fee schedule from Set_A_Data or Set_B_Data.

### Requirement 8: Smart Dashboard with Real-Time Analytics

**User Story:** As a Government_Official, I want a dashboard showing real-time case statistics and bottleneck analysis, so that I can identify and address delays in case processing.

#### Acceptance Criteria

1. THE Smart_Dashboard SHALL display real-time case intake counts, categorized by case type, court level, and time period (daily, weekly, monthly).
2. THE Smart_Dashboard SHALL display average case processing time by case type and court, with visual indicators for cases exceeding the standard timeline.
3. WHEN a bottleneck is detected (average processing time exceeds 1.5 times the standard timeline for a case type), THE Smart_Dashboard SHALL highlight the bottleneck and display the contributing factors.
4. WHEN a Government_Official requests a report, THE Smart_Dashboard SHALL generate a PDF report containing case statistics, trend analysis, and bottleneck summary for the selected time period.
5. THE Smart_Dashboard SHALL display case rejection rates with the top 5 rejection reasons for each case type.
6. THE Smart_Dashboard SHALL refresh statistics data at intervals no longer than 5 minutes.

### Requirement 9: Speech-to-Text for Court Hearings

**User Story:** As a Government_Official, I want to convert court hearing audio to text, so that I can create accurate hearing transcripts without manual transcription.

#### Acceptance Criteria

1. WHEN an audio file of a court hearing is uploaded, THE Speech_To_Text_Engine SHALL transcribe the audio into Thai text.
2. THE Speech_To_Text_Engine SHALL identify and label different speakers in the transcript when multiple speakers are present.
3. WHEN the transcription is complete, THE Speech_To_Text_Engine SHALL apply PII_Masking_Engine to redact personal information in the transcript.
4. IF the audio quality results in a transcription confidence below 0.7 for a segment, THEN THE Speech_To_Text_Engine SHALL flag that segment for manual review.
5. THE Speech_To_Text_Engine SHALL support audio files up to 120 minutes in duration.
6. THE Speech_To_Text_Engine SHALL log each transcription session to the CAL-130 audit log.

### Requirement 10: Complaint Verification and Summarization

**User Story:** As a Government_Official, I want AI to automatically verify and summarize incoming complaints, so that I can triage cases faster and identify incomplete filings early.

#### Acceptance Criteria

1. WHEN a complaint document is submitted, THE LegalGuard_System SHALL verify the complaint against the acceptance checklist from Set_A_Data (Justice Court) or Set_B_Data (Administrative Court) based on the target court.
2. WHEN verification is complete, THE LegalGuard_System SHALL generate a structured summary containing: case type classification, key facts, cited statutes, parties involved, and a completeness score between 0 and 1.
3. IF the completeness score is below 0.7, THEN THE LegalGuard_System SHALL list the specific missing or incomplete elements with references to the relevant acceptance criteria.
4. WHEN verifying an Administrative Court complaint, THE LegalGuard_System SHALL check Section 56 elements, jurisdiction, legal interest, and the 90-day filing deadline.
5. THE LegalGuard_System SHALL log each verification to the CAL-130 audit log with action type "complaint_verification".

### Requirement 11: e-Filing XML Export and Validation

**User Story:** As a Citizen, I want my drafted complaint to be exported in the correct e-Filing format, so that I can submit it directly to the court's online system.

#### Acceptance Criteria

1. WHEN a complaint draft is finalized, THE Complaint_Drafting_Assistant SHALL serialize the complaint into XML conforming to the e_Filing_Schema.
2. THE Complaint_Drafting_Assistant SHALL validate the generated XML against the e_Filing_Schema before presenting the export to the user.
3. IF the XML validation fails, THEN THE Complaint_Drafting_Assistant SHALL display the specific validation errors and the fields that need correction.
4. FOR ALL valid complaint objects, serializing to XML then parsing back SHALL produce an equivalent complaint object (round-trip property).

### Requirement 12: Data Sovereignty and Security (Responsible AI Principle 5)

**User Story:** As a Government_Official, I want all case-related data to be stored within Thailand with court-controlled encryption keys, so that data sovereignty and PDPA compliance are maintained.

#### Acceptance Criteria

1. THE LegalGuard_System SHALL store all case-related data (Knowledge_Base, audit logs, complaint drafts, judgment drafts, transcriptions) in data centers located within Thailand (AWS ap-southeast-1 Bangkok or equivalent).
2. THE LegalGuard_System SHALL encrypt all data at rest using AES-256 encryption with encryption keys managed by the court through AWS KMS or equivalent key management service.
3. THE LegalGuard_System SHALL encrypt all data in transit using TLS 1.3.
4. THE LegalGuard_System SHALL classify all data into security levels: "สาธารณะ" (public), "ภายใน" (internal), "ลับ" (confidential), "ลับมาก" (highly confidential), and enforce access controls per classification level.
5. WHEN sending text to external LLM APIs, THE LegalGuard_System SHALL apply PII_Masking_Engine to remove all personal information before the API call, and SHALL NOT send raw case data containing PII to any external service.
6. THE LegalGuard_System SHALL maintain a data processing register documenting all data flows, including which data is sent to external services and in what form (masked/anonymized).
7. IF an external LLM API is unavailable, THE LegalGuard_System SHALL fallback to a locally-hosted model (Ollama) to ensure no data leaves the controlled environment.

### Requirement 13: Bias Testing and Fairness Monitoring (Responsible AI Principle 1)

**User Story:** As a Government_Official, I want the system to continuously monitor and report on AI bias across multiple dimensions, so that I can ensure the system treats all users and case types fairly.

#### Acceptance Criteria

1. THE LegalGuard_System SHALL compute the Composite Fairness Score (CFS) for every search result set and display it to the user.
2. THE LegalGuard_System SHALL monitor bias across dimensions: geographic (province), court type, case type, time period, and user role.
3. WHEN the CFS score drops below 0.7 for any search result set, THE LegalGuard_System SHALL display a fairness warning and log the event.
4. THE Smart_Dashboard SHALL include a Fairness Monitoring panel showing CFS trends over time, bias breakdown by dimension, and alerts for bias threshold violations.
5. THE LegalGuard_System SHALL generate a monthly Fairness Report summarizing bias metrics, CFS distribution, and any corrective actions taken.

### Requirement 14: Responsible AI Engine (RAAIA 3.1)

**User Story:** As a Government_Official, I want the system to enforce ethical AI constraints automatically, so that AI responses are bounded by confidence limits, auditable, and safe for legal use.

#### Acceptance Criteria

1. THE LegalGuard_System SHALL enforce Risk Tiers (R0-R5) per action type, where R0 (FAQ) allows 99% confidence, R4 (judgment draft) caps at 80%, and R5 (case ruling) is blocked entirely.
2. THE LegalGuard_System SHALL apply Confidence-Bounded Bayesian (CBB) framework to cap AI confidence per task type and generate automatic ethical disclaimers.
3. THE LegalGuard_System SHALL compute a 6-dimension Honesty Score (citation accuracy, confidence calibration, debate transparency, disclaimer presence, PII cleanliness, data completeness) for every AI response.
4. THE LegalGuard_System SHALL implement a Circuit Breaker that blocks responses when Honesty Score < 0.50 or PII leakage is detected, and warns when confidence < 0.50 or conflicting precedents are found.
5. THE LegalGuard_System SHALL implement a Commit-Reveal Protocol (SHA-256) for multi-agent debate to prevent agent collusion, with Knowledge Partition and Bias Convergence Detection.
6. THE LegalGuard_System SHALL compute Legal Risk Score (P_risk) and GLUE-RAAIA Governance Fusion Score for response quality assessment.
7. THE LegalGuard_System SHALL expose Responsible AI metrics via API endpoints (`/api/v1/responsible-ai/`) for risk-tier, honesty-score, circuit-breaker, governance-score, and legal-risk checks.

### Requirement 15: Legal Knowledge Graph

**User Story:** As a Lawyer, I want the system to represent legal relationships as a knowledge graph, so that I can explore connections between statutes, cases, courts, and legal concepts.

#### Acceptance Criteria

1. THE LegalGuard_System SHALL convert Thai legal text into a knowledge graph with entity extraction (persons, statutes, cases, courts, crime concepts) and relationship extraction (ฟ้อง, ฐานความผิด, อ้างอิง, พิพากษา).
2. THE LegalGuard_System SHALL provide similarity-based search on the knowledge graph with configurable threshold and depth for subgraph retrieval.
3. THE LegalGuard_System SHALL support merge-by-similarity to deduplicate graph nodes with high vector similarity.
4. THE LegalGuard_System SHALL export the knowledge graph to NetworkX format for GNN analysis and import from NetworkX.
5. THE LegalGuard_System SHALL expose Knowledge Graph operations via API endpoints (`/api/v1/graph/`) for text-to-graph, search, node/edge CRUD, merge, stats, and NetworkX export.

### Requirement 16: NitiBench Benchmark Integration

**User Story:** As a Government_Official, I want to measure RAG pipeline quality using standardized benchmarks, so that I can track system accuracy over time and compare with other systems.

#### Acceptance Criteria

1. THE LegalGuard_System SHALL integrate NitiBench benchmark datasets from HuggingFace (VISAI-AI/nitibench-ccl, nitibench-statute, WangchanX-Legal-ThaiCCL-RAG).
2. THE LegalGuard_System SHALL run benchmark evaluations computing Hit@K, MRR, Citation Accuracy, and Hallucination Rate against the search pipeline.
3. THE LegalGuard_System SHALL expose benchmark operations via API endpoints (`/api/v1/benchmark/`) for listing cases, loading HF datasets, and running benchmarks.

### Requirement 17: RAG Evaluation Metrics

**User Story:** As a Government_Official, I want comprehensive evaluation metrics for the RAG pipeline, so that I can assess system quality across performance, privacy, fairness, and governance dimensions.

#### Acceptance Criteria

1. THE LegalGuard_System SHALL compute 5 metric groups: Core Performance (success rate, accuracy), Privacy (PII precision/recall/leakage), Fairness (CFS), RAG-specific (hallucination rate, source attribution), and Governance (ETDA compliance, circuit breaker triggers).
2. THE LegalGuard_System SHALL provide benchmark comparison data against ChatGPT and Google Search for answer accuracy, hallucination rate, privacy protection, and fairness monitoring.
3. THE LegalGuard_System SHALL expose evaluation metrics via `GET /api/v1/dashboard/metrics` and per-query evaluation via `POST /api/v1/dashboard/metrics/evaluate`.

### Requirement 18: Open Law Data Thailand Integration

**User Story:** As a Government_Official, I want the system to ingest Thai court judgments from Open Law Data Thailand, so that the knowledge base grows without waiting for direct court data transfers.

#### Acceptance Criteria

1. THE LegalGuard_System SHALL provide an API client for Open Law Data Thailand with graceful degradation (return empty results when API is unavailable).
2. THE LegalGuard_System SHALL normalize API responses to internal document format, extracting province (77 จังหวัด), court level, and year automatically.
3. THE LegalGuard_System SHALL ingest Open Law Data through the full pipeline: API fetch → PII masking → Thai chunking → multilingual-e5-large embedding → Qdrant upsert → BM25 index → CFS computation.

### Requirement 19: Self-Hosted Geocoding (Data Sovereignty)

**User Story:** As a Government_Official, I want court and police station locations resolved from GPS coordinates without sending data to external cloud services, so that location data stays within the controlled environment.

#### Acceptance Criteria

1. THE LegalGuard_System SHALL provide self-hosted reverse geocoding via traccar-geocoder using OpenStreetMap Thailand data, with sub-millisecond query latency.
2. THE LegalGuard_System SHALL maintain a known court locations database with GPS coordinates for quick lookup without geocoder dependency.
3. THE LegalGuard_System SHALL expose geocoding via API endpoints (`/api/v1/geocoder/`) for reverse geocoding, court lookup by name, nearest court search, and court listing.

### Requirement 20: Case Tracking

**User Story:** As a Citizen, I want to track my case status through the system, so that I can monitor progress without visiting the court in person.

#### Acceptance Criteria

1. THE LegalGuard_System SHALL provide case status lookup by case number, returning current step, next hearing date, timeline, and estimated completion.
2. THE LegalGuard_System SHALL expose case tracking via API endpoints (`/api/v1/tracking/`) for single case lookup and case listing.

### Requirement 21: Authentication and Authorization

**User Story:** As a Government_Official, I want the system to enforce authentication and role-based access control, so that sensitive endpoints (judgment drafting, case prediction) are protected from unauthorized access.

#### Acceptance Criteria

1. THE LegalGuard_System SHALL support JWT Bearer token authentication with configurable enable/disable via environment variable (`AUTH_ENABLED`).
2. THE LegalGuard_System SHALL enforce role-based endpoint restrictions: judgment endpoints require government/admin role, prediction requires lawyer/government/admin role.
3. THE LegalGuard_System SHALL return 401 Unauthorized for missing/invalid tokens and 403 Forbidden for insufficient role permissions, with Thai-language error messages.
4. THE LegalGuard_System SHALL add OWASP security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Permissions-Policy, Cache-Control) to all responses.

### Requirement 22: Thai-Optimized AI Models

**User Story:** As a Government_Official, I want the system to use AI models optimized for Thai language, so that legal text understanding and generation quality is maximized for Thai content.

#### Acceptance Criteria

1. THE LegalGuard_System SHALL support WangchanBERTa embeddings (768-dim, Thai-specific) as an embedding provider option, with local sentence-transformers and HuggingFace API fallback.
2. THE LegalGuard_System SHALL include SeaLLM-7B-v2 (Southeast Asian LLM) in the LLM fallback chain for Thai-optimized text generation.
3. THE LegalGuard_System SHALL implement a 5-provider LLM fallback chain: Bedrock Claude → Typhoon → SeaLLM → Anthropic → Ollama (local), ensuring service continuity and data sovereignty.
