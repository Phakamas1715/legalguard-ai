import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Shield, ArrowRight, Gavel, Cpu, Server, Lock, Database, ShieldCheck, Sparkles, BarChart3, FileText, Users, Activity } from "lucide-react";
import heroImage from "@/assets/hero-courthouse.jpg";
import enterpriseBg from "@/assets/enterprise-bg.jpg";
import RoleSelector, { type UserRole } from "@/components/RoleSelector";
import StatsBar from "@/components/StatsBar";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PartnerBar from "@/components/PartnerBar";

const strategicDimensions = [
  {
    icon: Cpu,
    title: "Efficiency & Speed",
    summary: "ลดเวลายกร่าง ตรวจร่าง และคัดกรองคำฟ้อง เพื่อลดคอขวดในกระบวนพิจารณา",
    systems: ["Drafting Assistant", "Complaint Verification", "Workflow Automation"],
    target: "ลดเวลายกร่าง 30-50%",
  },
  {
    icon: Search,
    title: "Consistency & Accuracy",
    summary: "ยกระดับการค้นคืนคำพิพากษาและข้อกฎหมายให้สม่ำเสมอ เข้าใจบริบท และอ้างอิงได้จริง",
    systems: ["Semantic Search", "Precedent Recommendation", "Predictive Model"],
    target: "Citation Accuracy >= 95%",
  },
  {
    icon: BarChart3,
    title: "Data-Driven Management",
    summary: "มองเห็นสถานการณ์คดีแบบใกล้ real-time ระบุ bottleneck และช่วยจัดสรรสำนวนตามภาระงาน",
    systems: ["Executive Dashboard", "Bottleneck Analytics", "Workload Allocation"],
    target: "ลดคดีค้าง 10-25%",
  },
  {
    icon: Users,
    title: "Public Service & Accessibility",
    summary: "ให้ประชาชนเข้าถึงบริการศาลได้จากที่บ้าน พร้อม AI ช่วยอธิบายสิทธิ ขั้นตอน และศาลที่เกี่ยวข้อง",
    systems: ["e-Filing", "Citizen Chatbot", "Court Lookup"],
    target: "เข้าถึงบริการภายในวันเดียว",
  },
  {
    icon: Shield,
    title: "Transparency & Trust",
    summary: "ทำให้ทุกการตัดสินใจของระบบตรวจสอบย้อนหลังได้ พร้อมปกปิดข้อมูลส่วนบุคคลอย่างเป็นระบบ",
    systems: ["Audit Log", "PII Masking", "Explainability", "Access Control"],
    target: "Audit Coverage 100%",
  },
];

const kpiHighlights = [
  { value: "30-50%", label: "ลดเวลายกร่าง/ตรวจร่าง", note: "จาก drafting assistant และ review automation" },
  { value: "10-25%", label: "ลดคดีค้างสะสม", note: "จาก bottleneck analytics และ allocation" },
  { value: ">= 85%", label: "Top-5 Recall", note: "สำหรับการค้นคืนคำพิพากษาที่เกี่ยวข้อง" },
  { value: ">= 95%", label: "Citation Accuracy", note: "อ้างอิงมาตราและคำพิพากษาได้แม่นยำ" },
  { value: "0 leakage", label: "PII Exposure", note: "ผลลัพธ์ต้องไม่รั่วข้อมูลส่วนบุคคล" },
  { value: "< 1 day", label: "เข้าถึงบริการประชาชน", note: "ลดระยะเวลาจากวันหรือสัปดาห์ให้ทันทีขึ้น" },
];

const productTracks = [
  {
    icon: Search,
    title: "Citizen Service Stack",
    summary: "ค้นกฎหมาย, ยื่นเรื่อง, แชตบอตภาคประชาชน, ค้นหาศาล และคำอธิบายภาษาง่าย",
    cta: "เปิดประสบการณ์ประชาชน",
    path: "/citizen",
  },
  {
    icon: Database,
    title: "Court Operations Stack",
    summary: "คัดกรองคำฟ้อง, ingest ข้อมูล, audit monitoring, dashboard ผู้บริหาร และ bottleneck analysis",
    cta: "ดูระบบเจ้าหน้าที่",
    path: "/government",
  },
  {
    icon: Gavel,
    title: "Judicial Decision Stack",
    summary: "ร่างคำพิพากษา, ตรวจ fairness, knowledge support และ precedent workflows สำหรับตุลาการ",
    cta: "ดูระบบตุลาการ",
    path: "/judge",
  },
  {
    icon: FileText,
    title: "Legal Professional Suite",
    summary: "ชุดเครื่องมือสำหรับนักกฎหมายถูกแยกเป็น private offering เพื่อพร้อมต่อยอดเป็น commercial bundle",
    cta: "ค้นหาในโหมดมืออาชีพ",
    path: "/search?role=lawyer",
  },
];

const Index = () => {
  const navigate = useNavigate();

  const handleRoleSelect = (role: UserRole) => {
    const dashboardMap: Record<UserRole, string> = {
      citizen: "/citizen",
      lawyer: "/search?role=lawyer",
      government: "/government",
      judge: "/judge",
    };
    navigate(dashboardMap[role]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background image with overlay */}
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt=""
            className="w-full h-full object-cover"
            width={1920}
            height={800}
          />
          <div className="absolute inset-0 bg-hero-gradient opacity-90" />
        </div>

        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center text-primary-foreground">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 text-sm mb-6"
            >
              <Gavel className="w-4 h-4 text-gold" />
              <span>ETDA Responsible AI Innovation Hackathon 2026 — AI for Justice</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight tracking-tighter"
            >
              Smart{" "}
              <span className="text-gradient-gold">LegalGuard</span>{" "}
              AI
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-2xl mb-10 leading-relaxed max-w-4xl mx-auto text-primary-foreground font-light"
            >
              โครงสร้างพื้นฐานกฎหมายอัจฉริยะระดับชาติ
              <br className="hidden md:block" /> ที่ออกแบบมาเพื่อลดคดีค้าง ยกระดับมาตรฐานคำวินิจฉัย และเปิดบริการประชาชนแบบตรวจสอบได้
            </motion.p>

            <motion.div
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: 0.25 }}
               className="inline-flex items-center gap-3 px-5 py-2 mb-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
            >
               <ShieldCheck className="w-5 h-5 text-teal" />
               <span className="text-xs font-bold uppercase tracking-widest text-white/80">Cloud Governance & National Infrastructure Certified</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button
                onClick={() => navigate("/search?role=citizen")}
                className="flex items-center gap-2 bg-accent text-accent-foreground px-8 py-4 rounded-xl font-bold text-lg shadow-gold hover:brightness-110 transition-all"
              >
                <Search className="w-5 h-5" />
                เริ่มค้นหาเลย
              </button>
              <a
                href="#kpis"
                className="flex items-center gap-2 px-6 py-4 rounded-xl font-semibold text-base border border-primary-foreground/30 hover:bg-primary-foreground/10 transition-colors"
              >
                ดู KPI และผลลัพธ์
                <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs font-bold uppercase tracking-widest text-white/80"
            >
              {["Semantic Search", "AI Drafting", "Executive Dashboard", "Citizen Chatbot", "CAL-130 Audit"].map((chip) => (
                <span key={chip} className="rounded-full border border-white/15 bg-white/5 px-4 py-2 backdrop-blur-sm">
                  {chip}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4 -mt-8 relative z-20">
        <StatsBar />
      </section>

      <PartnerBar />

      {/* Role Selection */}
      <section id="roles" className="container mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="font-heading text-3xl font-bold text-foreground mb-3">
            เลือกประเภทผู้ใช้งาน
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            ระบบจะปรับผลลัพธ์และรูปแบบการแสดงผลให้เหมาะสมกับความต้องการของคุณ
          </p>
        </div>
        <RoleSelector onSelect={handleRoleSelect} />
      </section>

      <section className="container mx-auto px-4 pb-8">
        <div className="rounded-[2rem] border border-border bg-gradient-to-r from-primary/5 via-white to-gold-light p-8 shadow-card">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                <FileText className="h-4 w-4" /> Private Commercial Track
              </div>
              <h3 className="mt-4 font-heading text-3xl font-bold text-foreground">
                ชุดนักกฎหมายถูกแยกเป็น <span className="text-primary">Private Offering</span>
              </h3>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                หน้า public มุ่งเน้นภาคประชาชน ศาล และผู้บริหารศาล ส่วน Legal Professional Suite ถูกเก็บเป็น commercial bundle
                สำหรับการขาย, private deployment, หรือ feature flag เฉพาะลูกค้าองค์กร
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/search?role=lawyer")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-white px-6 py-4 text-sm font-bold text-primary shadow-card hover:bg-primary hover:text-primary-foreground"
            >
              เปิดโหมดค้นหามืออาชีพ
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="mb-12 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-gold-light px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-accent-foreground">
            <Sparkles className="h-4 w-4 text-gold" /> Mission Architecture
          </div>
          <h2 className="mt-4 font-heading text-4xl md:text-5xl font-bold text-foreground">
            5 มิติที่ระบบนี้ถูกออกแบบมาเพื่อเปลี่ยนเกม
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            ไม่ใช่แค่เว็บค้นกฎหมาย แต่เป็น platform สำหรับลดคอขวดของศาล สร้างมาตรฐานแนววินิจฉัย ยกระดับบริการประชาชน
            และทำให้การใช้ AI ในกระบวนการยุติธรรมตรวจสอบได้จริง
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {strategicDimensions.map((dimension, index) => (
            <motion.div
              key={dimension.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="flex h-full flex-col rounded-[2rem] border border-border bg-card p-6 shadow-card hover:-translate-y-1 hover:shadow-card-hover"
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                <dimension.icon className="h-7 w-7" />
              </div>
              <h3 className="font-heading text-2xl font-bold text-foreground">{dimension.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{dimension.summary}</p>
              <div className="mt-5 space-y-2">
                {dimension.systems.map((system) => (
                  <div key={system} className="rounded-xl bg-muted/60 px-3 py-2 text-sm font-medium text-foreground">
                    {system}
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-gold/20 bg-gold-light px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-foreground/70">Target KPI</p>
                <p className="mt-1 text-sm font-bold text-accent-foreground">{dimension.target}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="kpis" className="container mx-auto px-4 py-16">
        <div className="rounded-[2.5rem] border border-border bg-gradient-to-br from-white via-secondary/60 to-gold-light p-8 md:p-12 shadow-card">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                <BarChart3 className="h-4 w-4" /> KPI Blueprint
              </div>
              <h2 className="mt-4 font-heading text-4xl font-bold text-foreground">ผลลัพธ์ที่ระบบควรถูกวัดจริง</h2>
              <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
                KPI ด้านล่างออกแบบให้เชื่อมตรงกับ pain point ของศาลและประชาชน เพื่อใช้เป็น baseline สำหรับ pilot, rollout และการประเมินผลเชิงนโยบาย
              </p>
            </div>
            <div className="rounded-2xl border border-primary/15 bg-white px-5 py-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/70">Evaluation Lens</p>
              <p className="mt-1 text-sm font-semibold text-foreground">Speed · Accuracy · Equity · Access · Trust</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {kpiHighlights.map((item) => (
              <div key={item.label} className="rounded-[1.75rem] border border-white/80 bg-white/90 p-6 shadow-sm">
                <div className="text-3xl font-black tracking-tighter text-primary">{item.value}</div>
                <div className="mt-2 text-base font-bold text-foreground">{item.label}</div>
                <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="mb-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-light px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-teal">
            <Activity className="h-4 w-4" /> Product Tracks
          </div>
          <h2 className="mt-4 font-heading text-4xl font-bold text-foreground">แพลตฟอร์มเดียว แต่แตกได้หลายเส้นธุรกิจ</h2>
          <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
            หน้าเว็บนี้ถูกยกระดับให้สื่อทั้งภาพ mission ระดับชาติและ product segmentation สำหรับการใช้งานจริงในภาคประชาชน ศาล และ commercial bundles
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {productTracks.map((track, index) => (
            <motion.button
              key={track.title}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              onClick={() => navigate(track.path)}
              className="group flex h-full flex-col rounded-[2rem] border border-border bg-card p-6 text-left shadow-card hover:-translate-y-1 hover:border-primary/30 hover:shadow-card-hover"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-deep text-white">
                <track.icon className="h-7 w-7" />
              </div>
              <h3 className="mt-5 font-heading text-2xl font-bold text-foreground">{track.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{track.summary}</p>
              <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary group-hover:gap-3 transition-all">
                {track.cta}
                <ArrowRight className="h-4 w-4" />
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Features — หลักการสำคัญ */}
      <section className="relative py-24 overflow-hidden">
        {/* Dark High-Tech Background - Adjusted Contrast for visibility */}
        <div className="absolute inset-0 z-0">
          <img 
            src={enterpriseBg} 
            alt="Infrastructure Background" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-navy-deep/80 via-navy-deep/60 to-background/90 backdrop-blur-[2px]"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
             <div className="inline-flex items-center gap-3 px-6 py-2 bg-gradient-to-r from-gold to-yellow-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] mb-8 shadow-2xl shadow-gold/20">
                <Sparkles className="w-3.5 h-3.5" /> ENGINEERED BY HONEST PREDICTOR
             </div>
             <h2 className="font-heading text-5xl md:text-7xl font-bold text-white mb-8 tracking-tight drop-shadow-2xl">
               สถาปัตยกรรมระดับ <span className="text-gold underline decoration-white/20 underline-offset-8">Enterprise</span>
             </h2>
             <p className="text-white/80 text-xl md:text-2xl max-w-4xl mx-auto leading-relaxed font-light">
               เทคโนโลยีที่ผ่านการตรวจสอบโดยผู้เชี่ยวชาญ เพื่อพิทักษ์ความยุติธรรมและข้อมูลส่วนบุคคลตามมาตรฐานสากล
             </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {[
              {
                icon: Shield,
                title: "Secure Audit Log System",
                desc: "บันทึกการทำงานและการตัดสินใจของ AI ทุกขั้นตอนด้วยเทคโนโลยีความปลอดภัยขั้นสูง สามารถตรวจสอบย้อนหลังได้ 100% ป้องกันการแก้ไขหรือปลอมแปลง",
              },
              {
                icon: Lock,
                title: "Privacy Protection System",
                desc: "ระบบเซ็นเซอร์และปกปิดข้อมูลส่วนบุคคล เช่น ชื่อ เลขประจำตัว หรือข้อมูลตระหนักรู้แบบอัตโนมัติ สอดคล้องตามมาตรฐาน PDPA อย่างเคร่งครัด",
              },
              {
                icon: Server,
                title: "High Availability & Offline Ready",
                desc: "รักษาความต่อเนื่องด้วยระบบสลับเครือข่ายศูนย์ข้อมูลอัตโนมัติ รองรับการประมวลผลออฟไลน์สำหรับหน่วยงานหรือศาลที่มีข้อจำกัดด้านอินเทอร์เน็ต",
              },
              {
                icon: Cpu,
                title: "Multi-Layer AI Guardrails",
                desc: "ตรวจสอบและคัดกรองความถูกต้องด้วยเครือข่าย AI หลายชั้น เพื่อป้องกันข้อมูลคลาดเคลื่อนและรับประกันความน่าเชื่อถือระดับสูงสุดก่อนแสดงผลลัพธ์",
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-navy-deep/60 backdrop-blur-2xl p-10 rounded-[2.5rem] border border-white/20 hover:border-gold/50 transition-all group shadow-2xl hover:-translate-y-2 flex flex-col items-center text-center h-full"
              >
                <div className="w-20 h-20 mb-8 rounded-3xl bg-gradient-to-br from-gold/50 to-gold/10 flex items-center justify-center border border-gold/40 group-hover:border-gold/80 transition-colors shadow-lg shadow-gold/10">
                  <f.icon className="w-10 h-10 text-gold drop-shadow-md" />
                </div>
                <h3 className="font-heading text-2xl font-bold mb-5 text-white drop-shadow-md leading-tight">{f.title}</h3>
                <p className="text-base text-white/90 font-medium leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust indicators */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center items-center gap-8 text-muted-foreground">
            {[
              "ค้นหาด้วยภาษาธรรมชาติ",
              "อ้างอิงมาตราและเลขฎีกาจริง",
              "ปกป้องข้อมูลตาม PDPA",
              "ข้อมูลเก็บในประเทศไทย",
              "ระบบป้องกัน AI หลอน",
            ].map(text => (
              <div key={text} className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-teal" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
