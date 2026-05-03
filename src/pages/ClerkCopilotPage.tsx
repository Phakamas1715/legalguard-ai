import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  ClipboardCheck,
  Clock,
  Download,
  FileCheck,
  FileSearch,
  FolderKanban,
  LifeBuoy,
  Loader2,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PartnerBar from "@/components/PartnerBar";
import BackOfficeSuiteNav from "@/components/BackOfficeSuiteNav";
import RoleFeatureMenuPanel from "@/components/RoleFeatureMenuPanel";
import { API_BASE } from "@/lib/runtimeConfig";
import { clerkFeatureMenus } from "@/lib/roleMenuConfig";
import { createFormalDocumentNumber, downloadWordDocument } from "@/lib/wordExport";

interface DashboardLiveMetrics {
  requests_1h: number;
  error_rate_1h: number;
  ai_metrics: {
    avg_honesty_score: number;
    pii_leak_count: number;
  };
}

interface BottlenecksResponse {
  bottlenecks: Array<{
    case_type: string;
    avg_processing_days: number;
    threshold_days: number;
    sample_count: number;
  }>;
}

interface RecentAuditResponse {
  entries: Array<{
    id: string;
    action: string;
    query_preview: string;
    created_at: string;
    metadata: Record<string, unknown>;
  }>;
}

interface RecentIngestionJobsResponse {
  jobs: Array<{
    job_id: string;
    source_code: string;
    processed_documents: number;
    total_documents: number;
    failed_documents: number;
    status: string;
  }>;
}

const workflowCards = [
  {
    title: "คัดกรองคำร้องเข้า",
    desc: "รับคำร้อง, แยกประเภทเอกสาร, ตรวจความครบถ้วน และแจ้งสิ่งที่ยังขาดก่อนคีย์เข้าระบบ",
    icon: ClipboardCheck,
    menu: "รับเรื่อง",
  },
  {
    title: "เตรียมข้อมูลคดี",
    desc: "สกัดข้อมูลสำคัญ จัดเส้นทางงานต่อ และเตรียมข้อมูลให้พร้อมสำหรับผู้พิพากษาหรือหน่วยงานถัดไป",
    icon: FolderKanban,
    menu: "เตรียมคดี",
  },
  {
    title: "ผู้ช่วยตอบคำถามหน้างาน",
    desc: "ตอบคำถามซ้ำ ๆ ของทนายและประชาชน เพื่อลดภาระจุดบริการหน้าเคาน์เตอร์",
    icon: LifeBuoy,
    menu: "ติดตามและช่วยเหลือ",
  },
];

const toolLinks = [
  {
    menu: "รับเรื่อง",
    title: "งานถัดไปที่ควรทำ",
    desc: "ใช้เมื่อกำลังตรวจรับคำร้องและต้องการยืนยันว่าข้อมูลครบก่อนส่งต่อ",
    links: [
      { label: "เปิดฟอร์มคัดกรองคำฟ้อง", path: "/complaint-form", icon: Scale },
      { label: "ค้นกฎหมายหรือแบบฟอร์มที่เกี่ยวข้อง", path: "/search?role=government", icon: FileCheck },
    ],
  },
  {
    menu: "เตรียมคดี",
    title: "งานถัดไปที่ควรทำ",
    desc: "ใช้เมื่อเจ้าหน้าที่ต้องตรวจแฟ้มงานและอ้างอิงข้อมูลก่อนส่งต่อคดี",
    links: [
      { label: "ค้นกฎหมายสำหรับประกอบแฟ้มคดี", path: "/search?role=government", icon: FileCheck },
      { label: "เปิดมุมมองเดิมเพื่อเทียบข้อมูล", path: "/government-legacy", icon: FileSearch },
    ],
  },
  {
    menu: "ติดตามและช่วยเหลือ",
    title: "งานถัดไปที่ควรทำ",
    desc: "ใช้เมื่อหน้าจุดบริการต้องตอบคำถามซ้ำหรือย้อนกลับไปตรวจสถานะงาน",
    links: [
      { label: "ค้นข้อมูลเพื่อช่วยตอบคำถามหน้างาน", path: "/search?role=government", icon: FileCheck },
      { label: "เปิดมุมมองเดิมเพื่อดูสถานะงานเชิงลึก", path: "/government-legacy", icon: FileSearch },
    ],
  },
];

const ClerkCopilotPage = () => {
  const [activeFeatureMenu, setActiveFeatureMenu] = useState("รับเรื่อง");
  const [liveMetrics, setLiveMetrics] = useState<DashboardLiveMetrics | null>(null);
  const [bottlenecks, setBottlenecks] = useState<BottlenecksResponse | null>(null);
  const [recentAudit, setRecentAudit] = useState<RecentAuditResponse | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentIngestionJobsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [liveResp, bottleneckResp, auditResp, jobsResp] = await Promise.all([
          fetch(`${API_BASE}/dashboard/live`).catch(() => null),
          fetch(`${API_BASE}/dashboard/bottlenecks`).catch(() => null),
          fetch(`${API_BASE}/dashboard/audit/recent?limit=6`).catch(() => null),
          fetch(`${API_BASE}/ingest/recent?limit=6`).catch(() => null),
        ]);

        if (liveResp?.ok) setLiveMetrics(await liveResp.json());
        if (bottleneckResp?.ok) setBottlenecks(await bottleneckResp.json());
        if (auditResp?.ok) setRecentAudit(await auditResp.json());
        if (jobsResp?.ok) setRecentJobs(await jobsResp.json());
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const topBottlenecks = useMemo(() => (bottlenecks?.bottlenecks ?? []).slice(0, 3), [bottlenecks]);
  const clerkAuditRows = useMemo(
    () => (recentAudit?.entries ?? []).filter((entry) => ["complaint_verification", "search", "chat"].includes(entry.action)).slice(0, 4),
    [recentAudit],
  );
  const activeMenuMeta = clerkFeatureMenus.find((menu) => menu.title === activeFeatureMenu) ?? clerkFeatureMenus[0];
  const visibleWorkflowCards = workflowCards.filter((card) => card.menu === activeFeatureMenu);
  const activeToolGroup = toolLinks.find((group) => group.menu === activeFeatureMenu) ?? toolLinks[0];
  const exportClerkTemplate = () => {
    downloadWordDocument({
      fileName: `legalguard-clerk-${activeFeatureMenu}`,
      title: `เทมเพลตงานธุรการ: ${activeFeatureMenu}`,
      subtitle: "เอกสารฉบับนี้ใช้เป็นเช็กลิสต์ประกอบการปฏิบัติงานของเจ้าหน้าที่ธุรการ",
      header: {
        sealText: "ตราสำหรับงานธุรการ",
        organization: "LegalGuard AI",
        suborganization: "ชุดเอกสารสนับสนุนงานธุรการและการติดตามคำร้อง",
        documentClass: "เอกสารประกอบการปฏิบัติงานธุรการ",
      },
      metaRows: [
        { label: "เลขที่เอกสาร", value: createFormalDocumentNumber("LG-CLK") },
        { label: "เลขรับเอกสาร", value: createFormalDocumentNumber("RCV-CLK") },
        { label: "วันที่จัดทำ", value: new Date().toLocaleDateString("th-TH") },
        { label: "เรื่อง", value: `เทมเพลตงานธุรการหมวด ${activeFeatureMenu}` },
        { label: "หน่วยงาน", value: "เจ้าหน้าที่ศาล / ธุรการ" },
      ],
      sections: [
        {
          heading: "หมวดงาน",
          body: activeMenuMeta.desc,
        },
        {
          heading: "รายการงานที่ควรตรวจ",
          bullets: visibleWorkflowCards.map((card) => `${card.title}: ${card.desc}`),
        },
        {
          heading: "งานถัดไปที่ควรทำ",
          bullets: activeToolGroup.links.map((tool) => tool.label),
        },
        {
          heading: "จุดที่ต้องเฝ้าระวัง",
          bullets: [
            "ตรวจความครบถ้วนของข้อมูลและเอกสารก่อนส่งต่อ",
            "หลีกเลี่ยงการคีย์ข้อมูลซ้ำระหว่างระบบเดิมกับระบบใหม่",
            "ปกปิดข้อมูลส่วนบุคคลก่อนใช้งานระบบ AI หรือส่งต่อข้อมูล",
          ],
        },
      ],
      signatories: [
        {
          nameLine: "(เจ้าหน้าที่ผู้ปฏิบัติงาน)",
          titleLine: "ตำแหน่ง ........................................",
        },
        {
          nameLine: "(ผู้ตรวจทาน)",
          titleLine: "หัวหน้าส่วน / ผู้รับรองรายการ",
        },
        {
          nameLine: "(ผู้อนุมัติ)",
          titleLine: "ผู้มีอำนาจลงนามตามสายงาน",
        },
      ],
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <section className="border-b border-border bg-gradient-to-br from-gold-light via-background to-teal-light/40">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-5xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-accent-foreground">
              <Users className="h-4 w-4 text-gold" /> พื้นที่ช่วยงานธุรการ
            </div>
            <h1 className="mt-5 font-heading text-5xl font-black tracking-tight text-foreground md:text-6xl">
              หลังบ้านสำหรับธุรการศาลแบบครบกระบวนงาน
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted-foreground">
              ออกแบบเพื่อช่วยเจ้าหน้าที่รับคำร้อง ตรวจเอกสาร จัดหมวดหมู่ข้อมูล และลดภาระ helpdesk โดยยึดหลัก PDPA และตรวจสอบย้อนหลังได้
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto flex-1 px-4 py-10">
        <BackOfficeSuiteNav />

        <div className="mt-8">
          <div className="rounded-[1.75rem] border border-gold/25 bg-gold-light p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-accent-foreground">แนวทางใช้งานของหน้านี้</p>
            <h2 className="mt-2 font-heading text-2xl font-black text-foreground">เริ่มจากเลือกหมวดงาน แล้วค่อยเปิดเครื่องมือที่เกี่ยวข้อง</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              หน้านี้เป็นหน้าหลักสำหรับธุรการศาล ส่วนมุมมองเดิมเก็บไว้สำหรับตรวจสอบย้อนหลังหรือเทียบข้อมูลเท่านั้น เพื่อลดการสลับหน้าจอที่ไม่จำเป็น
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <ClerkMetric label="คำขอใช้งาน / 1 ชม." value={liveMetrics ? String(liveMetrics.requests_1h) : "—"} note="ปริมาณงานหลังบ้านล่าสุด" />
          <ClerkMetric label="อัตราความผิดพลาด" value={liveMetrics ? `${(liveMetrics.error_rate_1h * 100).toFixed(1)}%` : "—"} note="ยิ่งต่ำยิ่งดี" />
          <ClerkMetric label="ดัชนีความซื่อสัตย์" value={liveMetrics ? `${Math.round(liveMetrics.ai_metrics.avg_honesty_score * 100)}%` : "—"} note="ความน่าเชื่อถือของผลลัพธ์ AI" />
          <ClerkMetric label="การรั่วไหลของ PII" value={liveMetrics ? String(liveMetrics.ai_metrics.pii_leak_count) : "—"} note="ควรเป็นศูนย์ในระบบใช้งานจริง" />
        </div>

        <RoleFeatureMenuPanel
          eyebrow="เมนูฟีเจอร์สำหรับธุรการ"
          title="เลือกเมนูตามช่วงงานที่กำลังทำ"
          description="แยก workflow ให้ค้นหาฟีเจอร์ได้ตามหน้าที่จริงของเจ้าหน้าที่ ไม่ต้องไล่ดูทุกโมดูลพร้อมกัน"
          menus={clerkFeatureMenus}
          activeTitle={activeFeatureMenu}
          onSelect={setActiveFeatureMenu}
          activeSummary={
            <>
              <span className="font-semibold text-foreground">{activeMenuMeta.title}</span>
              {" • "}
              {activeMenuMeta.desc}
            </>
          }
          getCount={(title) => workflowCards.filter((card) => card.menu === title).length}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleWorkflowCards.map((card) => (
              <div key={card.title} className="rounded-[1.5rem] border border-border bg-muted/10 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <card.icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-lg font-bold text-foreground">{card.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.desc}</p>
              </div>
            ))}

            <div className="rounded-[1.5rem] border border-border bg-card p-4 md:col-span-2 xl:col-span-3">
              <p className="text-sm font-bold text-foreground">{activeToolGroup.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{activeToolGroup.desc}</p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={exportClerkTemplate}
                  className="inline-flex items-center gap-2 rounded-2xl border border-gold/20 bg-gold/10 px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-gold/15"
                >
                  <Download className="h-4 w-4" />
                  ส่งออกเทมเพลต Word ของหมวดนี้
                </button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {activeToolGroup.links.map((tool) => (
                  <Link
                    key={tool.label}
                    to={tool.path}
                    className="inline-flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <tool.icon className="h-4 w-4" />
                      {tool.label}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </RoleFeatureMenuPanel>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3">
              <Bot className="h-6 w-6 text-primary" />
              <h2 className="font-heading text-2xl font-black text-foreground">สรุปการใช้งานของหมวดที่เลือก</h2>
            </div>
            <div className="mt-6 space-y-3">
              {visibleWorkflowCards.map((card) => (
                <div key={card.title} className="flex items-start gap-3 rounded-[1.5rem] border border-border bg-muted/10 p-4">
                  <card.icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-bold text-foreground">{card.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-gold" />
              <h2 className="font-heading text-2xl font-black text-foreground">จุดที่ต้องเฝ้าระวังในการทำงาน</h2>
            </div>
            <div className="mt-6 space-y-3">
              {[
                "ระบบ hybrid ทำให้คีย์ข้อมูลซ้ำและต้องพิมพ์เอกสารอีกครั้ง",
                "เจ้าหน้าที่ต้องตอบคำถามซ้ำแทน helpdesk",
                "ช่วง peak time ถ้าระบบช้าจะเกิด backlog ทันที",
                "ต้องคุม PDPA โดยไม่มีเครื่องมือตรวจ PII ที่มองเห็นง่ายพอ",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-[1.5rem] border border-border bg-muted/10 p-4">
                  <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal" />
                  <p className="text-sm text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-2xl font-black text-foreground">บันทึกการใช้งานล่าสุดของงานธุรการ</h2>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <div className="mt-5 space-y-3">
              {clerkAuditRows.length > 0 ? clerkAuditRows.map((entry) => (
                <div key={entry.id} className="rounded-[1.5rem] border border-border bg-muted/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-foreground">{entry.action}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(entry.created_at).toLocaleString("th-TH")}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{entry.query_preview || "ไม่มี query preview"}</p>
                </div>
              )) : (
                <p className="rounded-[1.5rem] border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                  ยังไม่มี audit rows จาก backend สำหรับงานธุรการ
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card">
              <h2 className="font-heading text-2xl font-black text-foreground">รายการเฝ้าระวังการปฏิบัติงาน</h2>
            <div className="mt-5 space-y-4">
              <div className="rounded-[1.5rem] border border-border bg-muted/10 p-4">
                <p className="text-sm font-bold text-foreground">คอขวดของงาน</p>
                <div className="mt-3 space-y-3">
                  {topBottlenecks.length > 0 ? topBottlenecks.map((item) => (
                    <div key={item.case_type} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{item.case_type}</span>
                      <span className="font-bold text-foreground">{item.avg_processing_days.toFixed(0)}d / {item.threshold_days.toFixed(0)}d</span>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลคอขวดจากระบบหลังบ้าน</p>
                  )}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-border bg-muted/10 p-4">
                <p className="text-sm font-bold text-foreground">งานนำเข้าข้อมูลล่าสุด</p>
                <div className="mt-3 space-y-3">
                  {(recentJobs?.jobs ?? []).slice(0, 3).map((job) => (
                    <div key={job.job_id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{job.source_code}</span>
                      <span className="font-bold text-foreground">{job.processed_documents}/{job.total_documents}</span>
                    </div>
                  ))}
                  {(recentJobs?.jobs ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">ยังไม่มี ingestion jobs ล่าสุด</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <PartnerBar />
      <Footer />
    </div>
  );
};

const ClerkMetric = ({ label, value, note }: { label: string; value: string; note: string }) => (
  <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-card">
    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    <p className="mt-3 text-3xl font-black text-foreground">{value}</p>
    <p className="mt-2 text-sm text-muted-foreground">{note}</p>
  </div>
);

export default ClerkCopilotPage;
