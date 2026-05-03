import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
  FileSearch,
  FileText,
  Gavel,
  Loader2,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PartnerBar from "@/components/PartnerBar";
import BackOfficeSuiteNav from "@/components/BackOfficeSuiteNav";
import RoleFeatureMenuPanel from "@/components/RoleFeatureMenuPanel";
import { apiClient, type DashboardLiveResponse, type RiskTier } from "@/lib/apiClient";
import { judgeFeatureMenus } from "@/lib/roleMenuConfig";
import { createFormalDocumentNumber, downloadWordDocument } from "@/lib/wordExport";

const workbenchModules = [
  {
    title: "สรุปสำนวน 1 หน้า",
    desc: "ย่อสำนวนขนาดยาวให้เหลือภาพรวม 1 หน้า โดยสรุปข้อเท็จจริง ประเด็นกฎหมาย คู่ความ และมาตราที่เกี่ยว",
    icon: FileText,
    menu: "อ่านและสรุป",
  },
  {
    title: "ค้นคดีคล้ายจากข้อเท็จจริง",
    desc: "ค้นคดีคล้ายจากข้อเท็จจริงจริง ไม่ใช่แค่ keyword เพื่อช่วยให้ผู้พิพากษาเห็นแนวคำพิพากษาได้เร็วขึ้น",
    icon: FileSearch,
    menu: "ค้นและเปรียบเทียบ",
  },
  {
    title: "โครงร่างคำพิพากษา",
    desc: "สร้างโครงร่างคำพิพากษาเบื้องต้นพร้อมคำเตือนและเพดานความเชื่อมั่น เพื่อย้ำว่าเป็นเพียงเครื่องมือช่วยร่าง",
    icon: Gavel,
    menu: "ร่างและกำกับ",
  },
];

const actionLinks = [
  {
    menu: "อ่านและสรุป",
    title: "งานถัดไปที่ควรทำ",
    desc: "เมื่ออ่านภาพรวมสำนวนแล้ว ให้เปิดเครื่องมือค้นข้อมูลที่เกี่ยวข้องต่อทันที",
    links: [
      { label: "ค้นฎีกาและกฎหมาย", path: "/search?role=government", icon: BookOpen },
      { label: "เปิดมุมมองเดิมเพื่อเทียบข้อมูล", path: "/judge-legacy", icon: Scale },
    ],
  },
  {
    menu: "ค้นและเปรียบเทียบ",
    title: "งานถัดไปที่ควรทำ",
    desc: "ใช้ต่อเมื่อจำเป็นต้องอ้างอิงคดีคล้ายหรือย้อนดูข้อมูลจากหน้าตรวจสอบเดิม",
    links: [
      { label: "ค้นฎีกาและกฎหมาย", path: "/search?role=government", icon: BookOpen },
      { label: "เปิดหน้ากำกับการใช้ AI", path: "/responsible-ai", icon: ShieldCheck },
    ],
  },
  {
    menu: "ร่างและกำกับ",
    title: "งานถัดไปที่ควรทำ",
    desc: "ใช้ต่อเมื่อกำลังตรวจร่างและต้องการยืนยันข้อกำกับหรือเทียบข้อมูลจากมุมมองเดิม",
    links: [
      { label: "เปิดหน้ากำกับการใช้ AI", path: "/responsible-ai", icon: ShieldCheck },
      { label: "เปิดมุมมองเดิมของตุลาการ", path: "/judge-legacy", icon: Scale },
    ],
  },
];

const JudgeWorkbenchPage = () => {
  const [activeFeatureMenu, setActiveFeatureMenu] = useState("อ่านและสรุป");
  const [riskTiers, setRiskTiers] = useState<Record<string, RiskTier>>({});
  const [liveMetrics, setLiveMetrics] = useState<DashboardLiveResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [riskResp, liveResp] = await Promise.all([
          apiClient.getRiskTiers().catch(() => null),
          apiClient.getDashboardLive().catch(() => null),
        ]);
        if (riskResp) setRiskTiers(riskResp);
        if (liveResp) setLiveMetrics(liveResp);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const criticalTiers = useMemo(
    () => Object.entries(riskTiers).filter(([, tier]) => tier.risk_level === "R4").slice(0, 4),
    [riskTiers],
  );
  const activeMenuMeta = judgeFeatureMenus.find((menu) => menu.title === activeFeatureMenu) ?? judgeFeatureMenus[0];
  const visibleModules = workbenchModules.filter((module) => module.menu === activeFeatureMenu);
  const activeActionGroup = actionLinks.find((group) => group.menu === activeFeatureMenu) ?? actionLinks[0];
  const exportJudgeTemplate = () => {
    downloadWordDocument({
      fileName: `legalguard-judge-${activeFeatureMenu}`,
      title: `แบบฟอร์มช่วยงานผู้พิพากษา: ${activeFeatureMenu}`,
      subtitle: "เอกสารฉบับนี้จัดทำเพื่อใช้ประกอบการตรวจทานโดยผู้พิพากษาเท่านั้น",
      header: {
        sealText: "ตราสำหรับงานตุลาการ",
        organization: "LegalGuard AI",
        suborganization: "ชุดเอกสารช่วยค้น สรุป และเตรียมร่างสำหรับผู้พิพากษา",
        documentClass: "เอกสารประกอบการพิจารณาคดี",
      },
      metaRows: [
        { label: "เลขที่เอกสาร", value: createFormalDocumentNumber("LG-JDG") },
        { label: "เลขอ้างอิงสำนวน", value: createFormalDocumentNumber("REF-JDG") },
        { label: "วันที่จัดทำ", value: new Date().toLocaleDateString("th-TH") },
        { label: "เรื่อง", value: `แบบฟอร์มช่วยงานผู้พิพากษาหมวด ${activeFeatureMenu}` },
        { label: "ชั้นความเสี่ยง", value: "ใช้ประกอบการพิจารณาเท่านั้น" },
      ],
      sections: [
        {
          heading: "หมวดงาน",
          body: activeMenuMeta.desc,
        },
        {
          heading: "เครื่องมือในหมวดนี้",
          bullets: visibleModules.map((module) => `${module.title}: ${module.desc}`),
        },
        {
          heading: "งานถัดไปที่ควรทำ",
          bullets: activeActionGroup.links.map((link) => link.label),
        },
        {
          heading: "ข้อกำกับสำคัญ",
          bullets: [
            "ทุกผลลัพธ์ต้องอ้างอิงได้และตรวจสอบได้",
            "ห้ามใช้ AI ชี้ขาดคดีแทนมนุษย์",
            "โครงร่างเอกสารจากระบบต้องถูกตรวจแก้โดยผู้พิพากษาก่อนใช้งานจริง",
          ],
        },
      ],
      signatories: [
        {
          nameLine: "(ผู้พิพากษา / ตุลาการผู้ตรวจทาน)",
          titleLine: "ลงชื่อรับรองการพิจารณาเอกสารฉบับนี้",
        },
        {
          nameLine: "(ผู้ช่วยผู้พิพากษา / เจ้าหน้าที่วิชาการ)",
          titleLine: "ผู้จัดเตรียมข้อมูลประกอบการตรวจทาน",
        },
        {
          nameLine: "(หัวหน้าคณะ / ผู้มีอำนาจอนุมัติ)",
          titleLine: "รับทราบการใช้งานเอกสารประกอบการพิจารณา",
          note: "เอกสารฉบับนี้ไม่ใช่คำพิพากษาและไม่ใช้แทนดุลยพินิจของผู้พิพากษา",
        },
      ],
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <section className="border-b border-border bg-gradient-to-br from-primary via-navy-deep to-background">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-5xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-gold">
              <Sparkles className="h-4 w-4" /> พื้นที่ช่วยงานผู้พิพากษา
            </div>
            <h1 className="mt-5 font-heading text-5xl font-black tracking-tight text-white md:text-6xl">
              เครื่องมือช่วยผู้พิพากษาโดยไม่ล้ำเส้น
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-relaxed text-white/80">
              ออกแบบเพื่อช่วยอ่าน ค้น เปรียบเทียบ และเตรียมร่างเท่านั้น โดยยึดหลักมนุษย์กำกับทุกขั้น ตรวจสอบที่มาได้ และอ้างอิงก่อนใช้งาน
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto flex-1 px-4 py-10">
        <BackOfficeSuiteNav />

        <div className="mt-8 rounded-[1.75rem] border border-primary/15 bg-primary/5 p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/80">แนวทางใช้งานของหน้านี้</p>
          <h2 className="mt-2 font-heading text-2xl font-black text-foreground">เริ่มจากเลือกหมวดงาน แล้วใช้เครื่องมือประกอบการพิจารณาเฉพาะที่จำเป็น</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            หน้านี้เป็นหน้าหลักสำหรับผู้พิพากษา ส่วนมุมมองเดิมและหน้ากำกับการใช้ AI ใช้เป็นข้อมูลอ้างอิงเมื่อจำเป็น เพื่อลดการสลับหน้าจอและลดการตัดสินใจซ้ำ
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <WorkbenchMetric label="ความเชื่อมั่นเฉลี่ย" value={liveMetrics ? `${Math.round(liveMetrics.avg_confidence_1h * 100)}%` : "—"} />
          <WorkbenchMetric label="ดัชนีความซื่อสัตย์" value={liveMetrics ? `${Math.round(liveMetrics.ai_metrics.avg_honesty_score * 100)}%` : "—"} />
          <WorkbenchMetric label="อัตราคำตอบคลาดเคลื่อน" value={liveMetrics ? `${(liveMetrics.ai_metrics.hallucination_rate * 100).toFixed(1)}%` : "—"} />
          <WorkbenchMetric label="จำนวนการค้นหา / 1 ชม." value={liveMetrics ? String(liveMetrics.requests_by_action_1h.search ?? 0) : "—"} />
        </div>

        <RoleFeatureMenuPanel
          eyebrow="เมนูฟีเจอร์สำหรับผู้พิพากษา"
          title="เลือกงานที่ต้องการก่อนเข้าสู่รายละเอียด"
          description="แยกเครื่องมือออกเป็นหมวดงาน เพื่อให้ผู้พิพากษาเห็นเฉพาะสิ่งที่เกี่ยวกับขั้นตอนปัจจุบัน"
          menus={judgeFeatureMenus}
          activeTitle={activeFeatureMenu}
          onSelect={setActiveFeatureMenu}
          activeSummary={
            <>
              <span className="font-semibold text-foreground">{activeMenuMeta.title}</span>
              {" • "}
              {activeMenuMeta.desc}
            </>
          }
          getCount={(title) => workbenchModules.filter((module) => module.menu === title).length}
        >
          <div className="grid gap-4">
            {visibleModules.map((module) => (
              <div key={module.title} className="rounded-[1.5rem] border border-border bg-muted/10 p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <module.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{module.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{module.desc}</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="rounded-[1.5rem] border border-border bg-card p-4">
              <p className="text-sm font-bold text-foreground">{activeActionGroup.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{activeActionGroup.desc}</p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={exportJudgeTemplate}
                  className="inline-flex items-center gap-2 rounded-2xl border border-gold/20 bg-gold/10 px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-gold/15"
                >
                  <Download className="h-4 w-4" />
                  ส่งออกเทมเพลต Word ของหมวดนี้
                </button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {activeActionGroup.links.map((link) => (
                <Link
                  key={link.label}
                  to={link.path}
                  className="inline-flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  <span className="flex items-center gap-2">
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                ))}
              </div>
            </div>
          </div>
        </RoleFeatureMenuPanel>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3">
              <Scale className="h-6 w-6 text-primary" />
              <h2 className="font-heading text-2xl font-black text-foreground">สรุปการใช้งานของหมวดที่เลือก</h2>
            </div>
            <div className="mt-6 space-y-3">
              {visibleModules.map((module) => (
                <div key={module.title} className="flex items-start gap-3 rounded-[1.5rem] border border-border bg-muted/10 p-4">
                  <module.icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-bold text-foreground">{module.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{module.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-teal" />
              <h2 className="font-heading text-2xl font-black text-foreground">ข้อกำกับการใช้งานสำหรับผู้พิพากษา</h2>
            </div>
            <div className="mt-6 space-y-3">
              {[
                "ทุกผลลัพธ์ต้องอ้างอิงได้และตรวจสอบได้",
                "ฟีเจอร์ร่างเอกสารต้องถูกอธิบายว่าเป็นโครงร่างเบื้องต้นเท่านั้น",
                "ห้ามใช้ AI ชี้ขาดคดีแทนมนุษย์",
                "กรณีความเสี่ยงสูงต้องมีผู้ตรวจทานและเพดานความเชื่อมั่น",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-[1.5rem] border border-border bg-muted/10 p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal" />
                  <p className="text-sm text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-2xl font-black text-foreground">รายการงานความเสี่ยงสูง</h2>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <div className="mt-5 space-y-3">
              {criticalTiers.length > 0 ? criticalTiers.map(([action, tier]) => (
                <div key={action} className="flex items-center justify-between gap-3 rounded-[1.5rem] border border-border bg-muted/10 p-4">
                  <div>
                    <p className="text-sm font-bold text-foreground">{action}</p>
                    <p className="mt-1 text-xs text-muted-foreground">เพดานความเชื่อมั่น {(tier.confidence_cap * 100).toFixed(0)}%</p>
                  </div>
                  <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">
                    {tier.risk_level}
                  </span>
                </div>
              )) : (
                <p className="rounded-[1.5rem] border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                  ยังไม่มีข้อมูล risk tier จาก backend
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card">
              <h2 className="font-heading text-2xl font-black text-foreground">ข้อกำกับสำคัญก่อนใช้งาน</h2>
            <div className="mt-5 space-y-4">
              <div className="rounded-[1.5rem] border border-gold/20 bg-gold-light p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-foreground" />
                  <p className="text-sm text-accent-foreground">
                    อย่าเรียกว่า “AI ตัดสินคดี” แต่ให้เรียกว่า “พื้นที่ช่วยงานผู้พิพากษา” หรือ “ระบบช่วยงานประกอบการพิจารณา” เพื่อช่วยงานซ้ำที่กินเวลา
                  </p>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-border bg-muted/10 p-4">
                <p className="text-sm font-bold text-foreground">ลำดับการใช้งานที่แนะนำ</p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p>1. สรุปสำนวน</p>
                  <p>2. ค้นฎีกาคล้าย</p>
                  <p>3. เปรียบเทียบแนวคำพิพากษา</p>
                  <p>4. ตรวจมาตราและสร้าง skeleton draft</p>
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

const WorkbenchMetric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-card">
    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    <p className="mt-3 text-3xl font-black text-foreground">{value}</p>
  </div>
);

export default JudgeWorkbenchPage;
