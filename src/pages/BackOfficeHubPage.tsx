import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Gavel,
  Layers,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PartnerBar from "@/components/PartnerBar";
import BackOfficeSuiteNav from "@/components/BackOfficeSuiteNav";
import heroCourthouseImg from "@/assets/hero-courthouse.jpg";

const productCards = [
  {
    title: "Clerk Copilot",
    subtitle: "ธุรการรับคำร้องแบบ end-to-end",
    desc: "รับเรื่อง, ตรวจเอกสาร, แยกประเภท, route งาน, ติดตาม backlog และลดภาระ helpdesk หน้าเคาน์เตอร์",
    path: "/clerk-copilot",
    icon: Building2,
    accent: "bg-gold text-navy-deep",
    bullets: ["Intake validation", "PII-safe processing", "Service desk assist"],
  },
  {
    title: "Judge Workbench",
    subtitle: "ช่วยอ่าน ค้น และเตรียมร่าง",
    desc: "สรุปสำนวน, ค้นฎีกาคล้าย, เปรียบเทียบแนวคำพิพากษา, ตรวจมาตรา และโครงร่างคำพิพากษาแบบไม่ล้ำเส้น",
    path: "/judge-workbench",
    icon: Gavel,
    accent: "bg-primary text-white",
    bullets: ["Case brief", "Precedent view", "Human oversight first"],
  },
  {
    title: "AI Control Tower",
    subtitle: "คุมระบบหลังบ้านและ governance",
    desc: "ดู metrics, audit, benchmark, PII monitor, data classification และ release readiness ในมุม IT",
    path: "/ai-control-tower",
    icon: Server,
    accent: "bg-teal text-white",
    bullets: ["Observability", "Security & PDPA", "Data operations"],
  },
];

const workflowRows = [
  {
    stage: "1. Intake",
    owner: "Clerk Copilot",
    outcome: "รับคำร้องเข้า, ตรวจเอกสาร, จัดหมวดหมู่",
  },
  {
    stage: "2. Preparation",
    owner: "Clerk Copilot + Judge Workbench",
    outcome: "สกัด metadata, สรุปสำนวน, จัดข้อมูลพร้อมใช้งาน",
  },
  {
    stage: "3. Decision Support",
    owner: "Judge Workbench",
    outcome: "ค้นฎีกา, เปรียบเทียบแนวคำพิพากษา, ตรวจมาตรา",
  },
  {
    stage: "4. Governance",
    owner: "AI Control Tower",
    outcome: "audit, benchmark, PII, observability, release guard",
  },
];

const impactStats = [
  { label: "One Platform", value: "3", note: "role-specific dashboards" },
  { label: "Back Office", value: "E2E", note: "from intake to governance" },
  { label: "User Focus", value: "3 groups", note: "clerk, judge, IT" },
  { label: "Principles", value: "4", note: "human oversight, transparency, accountability, PDPA" },
];

const demoFlow = [
  {
    step: "Step 1",
    title: "เปิด Clerk Copilot",
    desc: "เริ่มจาก pain point ที่ชัดที่สุด คือรับคำร้อง ตรวจความครบถ้วน และลดภาระ helpdesk",
    path: "/clerk-copilot",
  },
  {
    step: "Step 2",
    title: "ต่อด้วย Judge Workbench",
    desc: "โชว์ว่า AI ช่วยอ่าน ค้น และเตรียมโครงร่างได้ โดยไม่แตะดุลยพินิจของผู้พิพากษา",
    path: "/judge-workbench",
  },
  {
    step: "Step 3",
    title: "ปิดที่ AI Control Tower",
    desc: "ยืนยันกับฝ่าย IT และผู้บริหารว่าระบบนี้ไม่ใช่ black box แต่มี observability และ governance รองรับ",
    path: "/ai-control-tower",
  },
];

const BackOfficeHubPage = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Navbar />

    <section className="relative overflow-hidden border-b border-border pt-14 pb-16">
      <div className="absolute inset-0">
        <img src={heroCourthouseImg} alt="" className="h-full w-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-br from-navy-deep/95 via-primary/85 to-background/95" />
      </div>
      <div className="container relative z-10 mx-auto px-4">
        <div className="max-w-5xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-gold">
            <Sparkles className="h-4 w-4" /> One Platform, Three Back-Office Dashboards
          </div>
          <h1 className="mt-6 font-heading text-5xl font-black tracking-tight text-white md:text-7xl">
            ระบบหลังบ้านที่แยกตามบทบาท
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-white/85">
            LegalGuard วางสถาปัตยกรรมหลังบ้านเป็นแพลตฟอร์มเดียว แต่แตกประสบการณ์การใช้งานเป็น 3 dashboard
            สำหรับธุรการศาล, ผู้พิพากษา และฝ่าย IT เพื่อให้แต่ละกลุ่มได้ workflow ที่ตรงงานจริงและควบคุมความเสี่ยงได้ตลอดเส้นทาง
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {impactStats.map((item) => (
            <div key={item.label} className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/60">{item.label}</p>
              <p className="mt-3 text-3xl font-black text-white">{item.value}</p>
              <p className="mt-2 text-sm text-white/75">{item.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <div className="container mx-auto flex-1 px-4 py-10">
      <BackOfficeSuiteNav />

      <section className="mt-8 grid gap-6 xl:grid-cols-3">
        {productCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="flex h-full flex-col rounded-[2rem] border border-border bg-card p-6 shadow-card"
          >
            <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${card.accent}`}>
              <card.icon className="h-7 w-7" />
            </div>
            <h2 className="font-heading text-2xl font-black text-foreground">{card.title}</h2>
            <p className="mt-2 text-sm font-semibold text-primary">{card.subtitle}</p>
            <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{card.desc}</p>
            <div className="mt-5 space-y-2">
              {card.bullets.map((bullet) => (
                <div key={bullet} className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-teal" />
                  {bullet}
                </div>
              ))}
            </div>
            <Link
              to={card.path}
              className="mt-6 inline-flex items-center justify-between rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              เปิด dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        ))}
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-3">
            <Layers className="h-6 w-6 text-primary" />
            <h3 className="font-heading text-2xl font-black text-foreground">End-to-End Workflow</h3>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            ออกแบบให้ปัญหาหน้างานไม่ได้จบที่ฟีเจอร์เดียว แต่ครอบคลุมตั้งแต่รับเอกสาร เตรียมข้อมูล สนับสนุนการตัดสินใจ และควบคุมความเสี่ยงระบบ
          </p>
          <div className="mt-6 space-y-4">
            {workflowRows.map((row) => (
              <div key={row.stage} className="grid gap-4 rounded-[1.5rem] border border-border bg-muted/15 p-4 md:grid-cols-[140px_220px_minmax(0,1fr)]">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{row.stage}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{row.owner}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{row.outcome}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-teal" />
            <h3 className="font-heading text-2xl font-black text-foreground">Design Principles</h3>
          </div>
          <div className="mt-6 space-y-4">
            {[
              ["Human Oversight", "AI ช่วยเตรียมงาน แต่คนยังเป็นผู้ตัดสินใจหลัก"],
              ["Transparency", "ทุกคำแนะนำต้องอธิบายได้และมีร่องรอยตรวจสอบ"],
              ["Accountability", "ทุก action ต้อง audit ได้ย้อนหลัง"],
              ["PDPA by Default", "ข้อมูลส่วนบุคคลต้องถูกปกปิดก่อนใช้กับ AI"],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-[1.5rem] border border-border bg-muted/10 p-4">
                <p className="text-sm font-bold text-foreground">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[1.5rem] border border-gold/20 bg-gold-light p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-foreground/70">Rollout Strategy</p>
            <p className="mt-2 text-sm font-bold text-accent-foreground">เริ่มจาก Clerk Copilot → Judge Workbench → AI Control Tower</p>
            <p className="mt-2 text-sm text-accent-foreground/80">เพื่อให้เห็น ROI จากงานธุรการก่อน แล้วค่อยขยายไปยัง workflow ที่ละเอียดอ่อนขึ้น</p>
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-[2rem] border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-3">
          <ArrowRight className="h-6 w-6 text-primary" />
          <h3 className="font-heading text-2xl font-black text-foreground">Demo Path พร้อมใช้</h3>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          ถ้าต้องเดโมภายใน 5-7 นาที ให้เดินตามลำดับนี้เพื่อเล่า pain point, workflow และ governance ให้ครบโดยไม่วกกลับไปมา
        </p>
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {demoFlow.map((item) => (
            <Link
              key={item.title}
              to={item.path}
              className="rounded-[1.5rem] border border-border bg-muted/10 p-5 transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">{item.step}</p>
              <p className="mt-3 text-lg font-bold">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold">
                เปิดเดโม
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>

    <PartnerBar />
    <Footer />
  </div>
);

export default BackOfficeHubPage;
