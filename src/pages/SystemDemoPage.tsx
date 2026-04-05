import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Database, Search, FileText, Shield, Scale, BarChart3,
  ArrowRight, CheckCircle2, Cpu, Layers, Eye, Lock,
  MessageCircle, Mic, AlertTriangle, ExternalLink, Zap
} from "lucide-react";

type Phase = "ingestion" | "search" | "agents" | "safety" | "output";

const SystemDemoPage = () => {
  const [activePhase, setActivePhase] = useState<Phase>("ingestion");
  const navigate = useNavigate();

  const phases: { id: Phase; label: string; icon: typeof Database; desc: string }[] = [
    { id: "ingestion", label: "1. นำเข้าข้อมูล", icon: Database, desc: "Data Ingestion Pipeline" },
    { id: "search", label: "2. ค้นหาอัจฉริยะ", icon: Search, desc: "Hybrid RAG Search" },
    { id: "agents", label: "3. AI วิเคราะห์", icon: Cpu, desc: "Multi-Agent System" },
    { id: "safety", label: "4. ตรวจสอบความปลอดภัย", icon: Shield, desc: "Anti-Hallucination 7 ชั้น" },
    { id: "output", label: "5. แสดงผลลัพธ์", icon: Eye, desc: "Output + Audit" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold text-primary mb-2">ขั้นตอนการทำงานของระบบ</h1>
          <p className="text-muted-foreground">Smart LegalGuard AI — ETDA Responsible AI Innovation Hackathon 2026</p>
        </div>

        {/* Phase selector */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 justify-center">
          {phases.map((p) => (
            <button key={p.id} onClick={() => setActivePhase(p.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                activePhase === p.id ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-muted"
              }`}>
              <p.icon className="w-4 h-4" /> {p.label}
            </button>
          ))}
        </div>

        {/* Phase 1: Data Ingestion */}
        {activePhase === "ingestion" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <Card title="Data Ingestion Pipeline" icon={Database} desc="นำเข้าข้อมูลจากแหล่งต่างๆ เข้าสู่ฐานข้อมูล">
              <div className="space-y-4">
                <Step num={1} title="รับเอกสาร" desc="PDF ~188 ไฟล์ (แบบฟอร์มศาลยุติธรรม ~98 + ศาลปกครอง ~90) + คู่มือ + FAQ + คดีตัวอย่าง 25 คดี" />
                <Step num={2} title="OCR + แยกข้อความ" desc="PyMuPDF สำหรับ PDF ปกติ / EasyOCR สำหรับเอกสารสแกน" />
                <Step num={3} title="ตัดข้อความเป็นชิ้นเล็ก" desc="PyThaiNLP ตัดประโยคภาษาไทย → ชิ้นละ 512 tokens ซ้อนทับ 64 tokens" />
                <Step num={4} title="ปกปิดข้อมูลส่วนบุคคล" desc="PII Masking 9 รูปแบบ (เลขบัตร, เบอร์โทร, ชื่อ, ที่อยู่ ฯลฯ)" />
                <Step num={5} title="สร้าง Embedding + จัดทำดัชนี" desc="Vector Index (Qdrant/FAISS) + BM25 Keyword Index (Tantivy)" />
                <Step num={6} title="บันทึกลงฐานข้อมูล" desc="PostgreSQL (metadata) + Qdrant (vectors) + Redis (cache)" />
              </div>
            </Card>
            <StatsRow items={[
              { label: "PDF เอกสาร", value: "~188" },
              { label: "คดีตัวอย่าง", value: "25" },
              { label: "HuggingFace Datasets", value: "10" },
              { label: "Phase 2 เป้าหมาย", value: "160K+ คดี" },
            ]} />
          </div>
        )}

        {/* Phase 2: Search */}
        {activePhase === "search" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <Card title="Hybrid RAG Search Pipeline" icon={Search} desc="ค้นหาเชิงความหมาย + คำสำคัญ รวมผลลัพธ์ด้วย Weighted RRF">
              <div className="space-y-4">
                <Step num={1} title="รับคำถามจากผู้ใช้" desc="เช่น 'ถูกโกงเงินออนไลน์ ฟ้องยังไง'" />
                <Step num={2} title="ปกปิดข้อมูลส่วนบุคคล" desc="PII Masking ก่อนส่งเข้าระบบ" />
                <Step num={3} title="แปลงคำถาม (Query Rewriting)" desc="แปลงภาษาพูด → ศัพท์กฎหมาย เช่น 'โกงเงิน' → 'ฉ้อโกง ป.อ. มาตรา 341'" />
                <Step num={4} title="ตรวจ Cache" desc="Redis Semantic Cache — ถ้าเคยถามคล้ายกัน ตอบทันที" />
                <Step num={5} title="ค้นหาแบบ Hybrid" desc="FAISS (ความหมาย 70%) + BM25 (คำสำคัญ 30%) → รวมด้วย Reciprocal Rank Fusion" />
                <Step num={6} title="จัดอันดับใหม่ (Reranking)" desc="LeJEPA Reranking + OOD Detection — ตรวจจับข้อมูลนอกขอบเขต" />
              </div>
            </Card>
            <StatsRow items={[
              { label: "Hit@3 เป้าหมาย", value: "93.7%" },
              { label: "เวลาค้นหา P95", value: "< 2 วินาที" },
              { label: "สัดส่วน FAISS:BM25", value: "70:30" },
              { label: "Cache Hit Rate", value: "~40%" },
            ]} />
            <DemoButton label="ทดลองค้นหา" onClick={() => navigate("/search?role=citizen")} />
          </div>
        )}

        {/* Phase 3: Multi-Agent */}
        {activePhase === "agents" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <Card title="LangGraph Multi-Agent System" icon={Cpu} desc="5 AI Agents ทำงานร่วมกัน ตรวจสอบซึ่งกันและกัน">
              <div className="grid md:grid-cols-2 gap-4">
                <AgentCard name="Manager Agent" role="จัดการ" desc="รับคำถาม → จำแนกประเภท → ส่งต่อให้ Agent ที่เหมาะสม" color="bg-primary/10 text-primary" />
                <AgentCard name="Researcher Agent" role="ค้นหา" desc="ค้นหาข้อมูลจากฐานข้อมูลกฎหมาย ดึงคำพิพากษาที่เกี่ยวข้อง" color="bg-teal/10 text-teal" />
                <AgentCard name="Reviewer Agent" role="ตรวจสอบ" desc="ตรวจว่าอ้างอิงมาตรา/เลขคดีถูกต้อง แยก verified/unverified" color="bg-accent/10 text-accent-foreground" />
                <AgentCard name="Compliance Agent" role="ปกป้อง" desc="ตรวจ PII + สิทธิการเข้าถึง + บล็อกถ้าไม่ผ่าน" color="bg-destructive/10 text-destructive" />
                <AgentCard name="Drafter Agent" role="ร่าง" desc="ร่างคำฟ้อง/คำพิพากษา ตาม template ศาล + ข้อมูลที่ค้นได้" color="bg-secondary text-foreground" />
              </div>
              <div className="mt-4 p-4 bg-muted/50 rounded-xl">
                <p className="text-sm font-medium mb-2">Commit-Reveal Protocol (ป้องกัน AI ฮั้วกัน)</p>
                <p className="text-xs text-muted-foreground">Researcher และ Skeptic ต่างคนต่างค้นหา → lock คำตอบด้วย SHA-256 → เปิดเผยพร้อมกัน → Reviewer ตัดสิน</p>
              </div>
            </Card>
          </div>
        )}

        {/* Phase 4: Safety */}
        {activePhase === "safety" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <Card title="Anti-Hallucination 7 ชั้น" icon={Shield} desc="ป้องกัน AI สร้างข้อมูลเท็จ ตามหลัก Responsible AI">
              <div className="space-y-3">
                {[
                  { num: 1, title: "RAG Grounding", desc: "ตอบจากข้อมูลจริงในฐานข้อมูลเท่านั้น ไม่ใช้ความรู้ในตัว AI", color: "bg-primary" },
                  { num: 2, title: "Citation Verification", desc: "ตรวจว่ามาตรากฎหมายและเลขคดีที่อ้างมีอยู่จริง", color: "bg-teal" },
                  { num: 3, title: "NeMo Guardrails", desc: "กรองเนื้อหาอันตราย + บังคับ disclaimer + บล็อกคำถามนอกขอบเขต", color: "bg-accent" },
                  { num: 4, title: "Unverified Flagging", desc: "ถ้าอ้างอิงไม่ได้ยืนยัน → แสดงคำเตือน 'ยังไม่ได้รับการยืนยัน'", color: "bg-destructive" },
                  { num: 5, title: "นโยบาย 'ไม่รู้'", desc: "ถ้าไม่มีข้อมูล → ตอบว่า 'ไม่พบข้อมูล กรุณาปรึกษาทนายความ' ห้ามเดา", color: "bg-primary" },
                  { num: 6, title: "Confidence Bound", desc: "จำกัดเพดานความมั่นใจ เช่น พยากรณ์คดี ≤ 85%, ร่างคำพิพากษา ≤ 80%", color: "bg-teal" },
                  { num: 7, title: "Disclaimer อัตโนมัติ", desc: "ทุกคำตอบลงท้ายด้วย 'ข้อมูลเบื้องต้น กรุณาปรึกษาทนายความ'", color: "bg-accent" },
                ].map(layer => (
                  <div key={layer.num} className="flex items-start gap-3 p-3 bg-card border border-border rounded-xl">
                    <div className={`w-8 h-8 rounded-lg ${layer.color} text-white flex items-center justify-center text-sm font-bold flex-shrink-0`}>{layer.num}</div>
                    <div>
                      <p className="text-sm font-medium">{layer.title}</p>
                      <p className="text-xs text-muted-foreground">{layer.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Responsible AI Compliance" icon={Lock} desc="สอดคล้องกับหลักธรรมาภิบาลปัญญาประดิษฐ์ในกระบวนการยุติธรรมและ ETDA AI Governance">
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  { label: "ข้อมูลเก็บในไทย", desc: "PDPA Compliant", ok: true },
                  { label: "ปกปิดข้อมูลส่วนบุคคล", desc: "PII Masking 9 รูปแบบ", ok: true },
                  { label: "บันทึกการใช้งาน", desc: "SHA-256 Audit Log", ok: true },
                  { label: "ความเป็นธรรม", desc: "CFS Monitoring 3 มิติ", ok: true },
                  { label: "AI ช่วยสนับสนุนเท่านั้น", desc: "ห้ามแทนดุลยพินิจ", ok: true },
                  { label: "เปิดเผยการใช้ AI", desc: "Disclaimer ทุกผลลัพธ์", ok: true },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-teal flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Phase 5: Output */}
        {activePhase === "output" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <Card title="ผลลัพธ์สำหรับผู้ใช้แต่ละกลุ่ม" icon={Eye} desc="ปรับรูปแบบตามบทบาท — ประชาชน / ทนาย / เจ้าหน้าที่">
              <div className="space-y-4">
                <OutputCard role="ประชาชน" features={["สรุปสั้นเข้าใจง่าย", "แนะนำขั้นตอนดำเนินคดี", "ช่องทางช่วยเหลือ (สายด่วน 1111)", "น้องซื่อสัตย์ Chatbot 24 ชม."]}
                  action={() => navigate("/citizen")} color="bg-teal/10" />
                <OutputCard role="ทนายความ" features={["อ้างอิงมาตรา + เลขฎีกาเต็ม", "ร่างคำฟ้อง + e-Filing XML Export", "เปรียบเทียบแนวคำพิพากษา", "ติดตามคดี + ลิงก์ CIOS/e-Filing"]}
                  action={() => navigate("/lawyer")} color="bg-primary/10" />
                <OutputCard role="เจ้าหน้าที่ / ตุลาการ" features={["คัดกรองคำฟ้อง AI Triage", "ร่างคำพิพากษา", "สถิติคดี + รายงาน", "แหล่งข้อมูล (ราชกิจจานุเบกษา/ฎีกา)"]}
                  action={() => navigate("/government")} color="bg-accent/10" />
              </div>
            </Card>
            <Card title="NitiBench — มาตรฐานวัดคุณภาพ" icon={BarChart3} desc="Benchmark สำหรับ RAG กฎหมายไทย — ค่าด้านล่างเป็นเป้าหมาย">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Hit@3 เป้าหมาย", value: "93.7%" },
                  { label: "Halluc. เป้าหมาย", value: "< 1%" },
                  { label: "PII Recall เป้าหมาย", value: "99.2%" },
                  { label: "CFS เป้าหมาย", value: "93.5%" },
                ].map(m => (
                  <div key={m.label} className="p-3 bg-muted/50 rounded-xl text-center">
                    <div className="text-xl font-bold text-primary">{m.value}</div>
                    <div className="text-xs text-muted-foreground">{m.label}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

// Reusable components
const Card = ({ title, icon: Icon, desc, children }: { title: string; icon: typeof Database; desc: string; children: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
    <div className="p-6 border-b border-border">
      <h3 className="font-heading font-bold text-lg flex items-center gap-2 text-primary"><Icon className="w-5 h-5" /> {title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const Step = ({ num, title, desc }: { num: number; title: string; desc: string }) => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">{num}</div>
    <div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  </div>
);

const StatsRow = ({ items }: { items: { label: string; value: string }[] }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    {items.map(i => (
      <div key={i.label} className="p-3 bg-card border border-border rounded-xl text-center">
        <div className="text-xl font-bold text-primary">{i.value}</div>
        <div className="text-xs text-muted-foreground">{i.label}</div>
      </div>
    ))}
  </div>
);

const AgentCard = ({ name, role, desc, color }: { name: string; role: string; desc: string; color: string }) => (
  <div className={`p-4 rounded-xl border border-border ${color}`}>
    <div className="flex items-center gap-2 mb-2">
      <Cpu className="w-4 h-4" />
      <span className="text-sm font-bold">{name}</span>
      <span className="text-xs bg-card px-2 py-0.5 rounded-full">{role}</span>
    </div>
    <p className="text-xs text-muted-foreground">{desc}</p>
  </div>
);

const OutputCard = ({ role, features, action, color }: { role: string; features: string[]; action: () => void; color: string }) => (
  <div className={`p-4 rounded-xl border border-border ${color}`}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-bold">{role}</span>
      <button onClick={action} className="text-xs text-primary hover:underline flex items-center gap-1">ดูแดชบอร์ด <ArrowRight className="w-3 h-3" /></button>
    </div>
    <ul className="space-y-1">
      {features.map(f => <li key={f} className="text-xs text-muted-foreground flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-teal" />{f}</li>)}
    </ul>
  </div>
);

const DemoButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <div className="text-center">
    <button onClick={onClick} className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-medium hover:bg-navy-deep transition-colors inline-flex items-center gap-2">
      <Zap className="w-4 h-4" /> {label}
    </button>
  </div>
);

export default SystemDemoPage;
