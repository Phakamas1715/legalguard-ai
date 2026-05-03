import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroCourthouseImg from "@/assets/hero-courthouse.jpg";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Briefcase,
  Clock3,
  Database,
  FileSearch,
  FileText,
  Gavel,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
} from "lucide-react";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { useBookmarks, useSearchHistory } from "@/hooks/useBookmarksHistory";
import { listWorkspaceSummaries } from "@/lib/flowWorkspace";
import { memory } from "@/lib/layeredMemory";

const suiteModules = [
  {
    title: "วิเคราะห์สำนวนคดี",
    description: "สรุปข้อเท็จจริง ประเด็นข้อกฎหมาย จุดแข็ง จุดอ่อน และข้อเสนอเชิงยุทธศาสตร์จากสำนวน",
    route: "/analyze",
    icon: FileText,
    badge: "Core Module",
  },
  {
    title: "พยากรณ์ผลคดี",
    description: "ประเมินแนวโน้ม outcome จากคดีที่มีข้อเท็จจริงใกล้เคียง พร้อมระดับความเชื่อถือ",
    route: "/predict",
    icon: Target,
    badge: "Advisory",
  },
  {
    title: "Prompt Templates",
    description: "แม่แบบงานทนาย เช่น cross-examination, witness consistency, precedent comparison",
    route: "/prompts",
    icon: Sparkles,
    badge: "Workflow",
  },
  {
    title: "ค้นคืนข้อมูลกฎหมาย",
    description: "ค้นคดีและข้อกฎหมายเพื่อเตรียมคดี วางกลยุทธ์ และตรวจสอบแหล่งอ้างอิง",
    route: "/search?role=judge",
    icon: FileSearch,
    badge: "Research",
  },
];

const quickWorkflows = [
  {
    title: "เตรียมกลยุทธ์ก่อนขึ้นศาล",
    steps: "ค้นคืนแนวคำพิพากษา → วิเคราะห์สำนวน → เตรียม prompt ซักค้าน",
    primaryRoute: "/search?role=judge",
    secondaryRoute: "/analyze",
  },
  {
    title: "ประเมินความเสี่ยงของคดี",
    steps: "สรุปข้อเท็จจริง → พยากรณ์ outcome → เทียบกับ precedent ที่ใกล้เคียง",
    primaryRoute: "/predict",
    secondaryRoute: "/search?role=judge",
  },
  {
    title: "สร้าง workflow ทีมคดี",
    steps: "เลือก template → แจกจ่ายงาน → ตรวจทานผลลัพธ์จาก traceable sources",
    primaryRoute: "/prompts",
    secondaryRoute: "/trust-center",
  },
];

const formatRelativeTime = (timestamp: number) => {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "เมื่อสักครู่";
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.round(hours / 24);
  return `${days} วันที่แล้ว`;
};

const PrivateOfferingPage = () => {
  const backendStatus = useBackendStatus();
  const { bookmarks } = useBookmarks();
  const { history } = useSearchHistory();
  const memoryStats = memory.getStats();

  const workspaceSummaries = useMemo(
    () => listWorkspaceSummaries().filter((workspace) => workspace.exists),
    [],
  );

  const recentMatters = useMemo(
    () => history.slice(0, 4).map((item) => ({
      id: item.id,
      title: item.query,
      subtitle: `${item.resultCount} ผลลัพธ์ · ${formatRelativeTime(item.timestamp)}`,
      route: `/search?role=judge&q=${encodeURIComponent(item.query)}`,
      type: "Research matter",
    })),
    [history],
  );

  const recentAuthorities = useMemo(
    () => bookmarks.slice(0, 3).map((bookmark) => ({
      id: bookmark.id,
      title: bookmark.title,
      subtitle: `${bookmark.caseNo} · ${bookmark.year || "n/a"}`,
      route: `/judgment/${bookmark.id}`,
      type: "Saved authority",
    })),
    [bookmarks],
  );

  const liveSummaryCards = [
    {
      title: "Saved Authorities",
      value: `${bookmarks.length}`,
      note: bookmarks.length > 0 ? "อ้างอิงที่บันทึกไว้พร้อมเปิดดูต่อ" : "ยังไม่มีคำพิพากษาที่บันทึกไว้",
      icon: Scale,
    },
    {
      title: "Recent Matters",
      value: `${history.length}`,
      note: history.length > 0 ? "อิงจากประวัติการค้นและการเตรียมคดีล่าสุด" : "ยังไม่มีประวัติการสืบค้น",
      icon: Gavel,
    },
    {
      title: "Workspace State",
      value: `${workspaceSummaries.length}`,
      note: workspaceSummaries.length > 0 ? "มี session ที่พร้อมทำงานต่อ" : "ยังไม่มี workspace ที่ persist ไว้",
      icon: Workflow,
    },
    {
      title: "Backend Readiness",
      value: backendStatus.online ? "Online" : "Offline",
      note: backendStatus.online ? `${backendStatus.service} พร้อมใช้งาน` : "หน้า dashboard ยังเปิดได้ แต่โมดูลหลักบางส่วนจะอาศัย backend",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <section className="relative overflow-hidden pt-16 pb-14 md:pt-20 md:pb-20">
        <div className="absolute inset-0">
          <img
            src={heroCourthouseImg}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-navy/85 to-background" />
        </div>

        <div className="container relative z-10 mx-auto px-4">
          <div className="mx-auto max-w-5xl text-center text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-gold">
              <Briefcase className="h-4 w-4" />
              Private Offering
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 font-heading text-4xl font-black tracking-tight md:text-6xl"
            >
              Professional Dashboard สำหรับนักกฎหมาย
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mx-auto mt-5 max-w-4xl text-base leading-8 text-white/90 md:text-xl"
            >
              พื้นที่ทำงานเชิงวิชาชีพสำหรับการค้นคืนข้อมูลกฎหมาย วิเคราะห์สำนวน วางกลยุทธ์คดี
              และจัดการ workflow ที่ต้องการความแม่นยำและการตรวจสอบย้อนกลับ
            </motion.p>
          </div>
        </div>
      </section>

      <main className="container mx-auto flex-1 px-4 py-10">
        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {liveSummaryCards.map((card) => (
            <div key={card.title} className="rounded-[2rem] border border-border bg-card p-6 shadow-card">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <card.icon className="h-4 w-4 text-primary" />
                {card.title}
              </div>
              <div className="text-3xl font-black tracking-tight text-foreground">{card.value}</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.note}</p>
            </div>
          ))}
        </section>

        <section className="mb-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card md:p-8">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                  <BadgeCheck className="h-4 w-4" />
                  Recent Matters
                </div>
                <h2 className="mt-3 font-heading text-3xl font-bold text-foreground">เรื่องที่กำลังทำล่าสุด</h2>
              </div>
              <Link
                to="/history"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
              >
                ดูประวัติทั้งหมด
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentMatters.length > 0 ? recentMatters.map((matter) => (
                <Link
                  key={matter.id}
                  to={matter.route}
                  className="block rounded-2xl border border-border bg-muted/20 px-4 py-4 transition hover:border-primary/30 hover:bg-primary/5"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{matter.type}</p>
                  <h3 className="mt-1 text-lg font-bold text-foreground">{matter.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{matter.subtitle}</p>
                </Link>
              )) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                  ยังไม่มี recent matters จากการใช้งานจริง ลองเริ่มจากค้นคดีหรือวิเคราะห์สำนวน แล้วหน้า dashboard นี้จะเริ่มสะท้อน session ล่าสุดให้
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-accent-foreground">
              <Database className="h-4 w-4" />
              Workspace Snapshot
            </div>
            <h2 className="mt-3 font-heading text-3xl font-bold text-foreground">สถานะการทำงานล่าสุด</h2>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-border bg-muted/20 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Layered Memory</p>
                <p className="mt-1 text-lg font-bold text-foreground">
                  L1 {memoryStats.l1Count} · L2 {memoryStats.l2Count} · L5 {memoryStats.l5Count}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">ประมาณ {memoryStats.totalTokensEstimate} tokens ของ retained context</p>
              </div>

              {workspaceSummaries.length > 0 ? workspaceSummaries.map((workspace) => (
                <div key={workspace.flow} className="rounded-2xl border border-border bg-muted/20 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{workspace.flow} workspace</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{workspace.preview}</p>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                  ยังไม่มี workspace ที่ persist อยู่ในเครื่อง
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card md:p-8">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-teal/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-teal">
                  <Scale className="h-4 w-4" />
                  Saved Authorities
                </div>
                <h2 className="mt-3 font-heading text-3xl font-bold text-foreground">คำพิพากษาที่บันทึกไว้</h2>
              </div>
              <Link
                to="/bookmarks"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
              >
                เปิด bookmark
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {recentAuthorities.length > 0 ? recentAuthorities.map((authority) => (
                <Link
                  key={authority.id}
                  to={authority.route}
                  className="block rounded-2xl border border-border bg-muted/20 px-4 py-4 transition hover:border-primary/30 hover:bg-primary/5"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">{authority.type}</p>
                  <h3 className="mt-1 text-base font-bold text-foreground">{authority.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{authority.subtitle}</p>
                </Link>
              )) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                  ยังไม่มี saved authorities ใน workspace นี้
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <Workflow className="h-4 w-4" />
              Quick Workflow Panel
            </div>
            <h2 className="mt-3 font-heading text-3xl font-bold text-foreground">เริ่มงานแบบเป็นขั้นตอน</h2>
            <div className="mt-5 space-y-3">
              {quickWorkflows.map((workflow) => (
                <div key={workflow.title} className="rounded-2xl border border-border bg-muted/20 p-4">
                  <h3 className="text-base font-bold text-foreground">{workflow.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{workflow.steps}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      to={workflow.primaryRoute}
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-navy-deep"
                    >
                      เปิด workflow
                    </Link>
                    <Link
                      to={workflow.secondaryRoute}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
                    >
                      เปิดขั้นถัดไป
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-[2rem] border border-border bg-card p-6 shadow-card md:p-8">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-gold-light px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-accent-foreground">
              <BarChart3 className="h-4 w-4" />
              Professional Modules
            </div>
            <h2 className="mt-3 font-heading text-3xl font-bold text-foreground">โมดูลที่พร้อมใช้ต่อยอด</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
              หน้านี้ทำหน้าที่เป็นประตูเข้าสู่ private suite ของนักกฎหมาย โดยใช้โมดูลจริงที่มีอยู่แล้วในระบบ
              และหลีกเลี่ยงการปะปนกับเส้นทาง public ของประชาชน
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {suiteModules.map((module, index) => (
              <motion.div
                key={module.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className="h-full"
              >
                <Link
                  to={module.route}
                  className="group flex h-full flex-col rounded-[2rem] border border-border bg-background p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-card-hover"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <module.icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      {module.badge}
                    </span>
                  </div>
                  <h3 className="font-heading text-xl font-bold text-foreground">{module.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">{module.description}</p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    เปิดโมดูล
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-border bg-muted/30 p-6 md:p-8">
          <div className="max-w-3xl">
            <h3 className="font-heading text-2xl font-bold text-foreground">หมายเหตุการใช้งาน</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
              พื้นที่นี้ถูกตั้งใจให้เป็น private offering สำหรับการใช้งานเชิงวิชาชีพและการนำเสนอเชิงพาณิชย์
              จึงเข้าถึงผ่าน footer เท่านั้นในรอบนี้ และยังไม่ถูกเพิ่มกลับเข้าเมนู public หลักของระบบ
            </p>
            <div className="mt-5">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
              >
                <Scale className="h-4 w-4" />
                กลับสู่หน้าแรก
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PrivateOfferingPage;
