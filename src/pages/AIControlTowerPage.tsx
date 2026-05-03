import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Database,
  FileCheck,
  Eye,
  Hash,
  Loader2,
  Network,
  Server,
  Shield,
  ShieldCheck,
  Target,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PartnerBar from "@/components/PartnerBar";
import BackOfficeSuiteNav from "@/components/BackOfficeSuiteNav";
import RoleFeatureMenuPanel from "@/components/RoleFeatureMenuPanel";
import { API_BASE } from "@/lib/runtimeConfig";
import { towerFeatureMenus } from "@/lib/roleMenuConfig";

interface DashboardLiveMetrics {
  requests_1h: number;
  requests_24h: number;
  cache_hit_rate_1h: number;
  error_rate_1h: number;
  total_audit_entries: number;
  ai_metrics: {
    avg_honesty_score: number;
    hallucination_rate: number;
    pii_leak_count: number;
  };
}

interface ReleaseGuardResponse {
  release_allowed?: boolean;
  passed_checks?: number;
  failed_checks?: number;
  mode?: string;
  checks?: Array<{
    check?: string;
    name?: string;
    passed: boolean;
    detail?: string;
    status?: string;
  }>;
}

interface RecentAuditResponse {
  entries: Array<{
    id: string;
    action: string;
    query_preview: string;
    created_at: string;
  }>;
  chain_valid: boolean;
}

interface GraphStatsResponse {
  total_nodes: number;
  total_edges: number;
  storage_mode?: string;
  persisted_at?: string | null;
}

interface AccessMatrixResponse {
  source: string;
  quality_by_role: Array<{
    role: string;
    label: string;
    quality: number;
  }>;
}

const AIControlTowerPage = () => {
  const [activeFeatureMenu, setActiveFeatureMenu] = useState("มองเห็นระบบ");
  const [liveMetrics, setLiveMetrics] = useState<DashboardLiveMetrics | null>(null);
  const [releaseGuard, setReleaseGuard] = useState<ReleaseGuardResponse | null>(null);
  const [recentAudit, setRecentAudit] = useState<RecentAuditResponse | null>(null);
  const [graphStats, setGraphStats] = useState<GraphStatsResponse | null>(null);
  const [accessMatrix, setAccessMatrix] = useState<AccessMatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [liveResp, releaseResp, auditResp, graphResp, accessResp] = await Promise.all([
          fetch(`${API_BASE}/dashboard/live`).catch(() => null),
          fetch(`${API_BASE}/responsible-ai/release-guard`).catch(() => null),
          fetch(`${API_BASE}/dashboard/audit/recent?limit=5`).catch(() => null),
          fetch(`${API_BASE}/graph/stats`).catch(() => null),
          fetch(`${API_BASE}/responsible-ai/access-matrix`).catch(() => null),
        ]);

        if (liveResp?.ok) setLiveMetrics(await liveResp.json());
        if (releaseResp?.ok) setReleaseGuard(await releaseResp.json());
        if (auditResp?.ok) setRecentAudit(await auditResp.json());
        if (graphResp?.ok) setGraphStats(await graphResp.json());
        if (accessResp?.ok) setAccessMatrix(await accessResp.json());
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const guardChecks = useMemo(() => (releaseGuard?.checks ?? []).slice(0, 5), [releaseGuard]);
  const activeMenuMeta = towerFeatureMenus.find((menu) => menu.title === activeFeatureMenu) ?? towerFeatureMenus[0];
  const demoSteps = [
    { title: "1. รับเรื่องของธุรการ", desc: "เปิดพื้นที่ช่วยงานธุรการแล้วแสดงการรับคำร้องและตรวจความครบถ้วน", path: "/clerk-copilot" },
    { title: "2. ทบทวนคดีของผู้พิพากษา", desc: "เปิดพื้นที่ช่วยงานผู้พิพากษาแล้วแสดงสรุปสำนวนและค้นฎีกาคล้าย", path: "/judge-workbench" },
    { title: "3. ติดตามร่องรอยการทำงาน", desc: "เปิดคอนโซลติดตามการทำงานเพื่อแสดง L0-L6 และตำแหน่งจริงของ Feynman Multi-Agent Engine", path: "/trace-console" },
    { title: "4. กำกับดูแลโดยฝ่ายไอที", desc: "ปิดเดโมด้วยศูนย์ควบคุม AI เพื่อยืนยันว่าทุกอย่างตรวจสอบย้อนหลังได้", path: "/ai-control-tower" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <section className="border-b border-border bg-gradient-to-br from-teal via-navy-deep to-background">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-5xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-gold">
              <Shield className="h-4 w-4" /> ศูนย์ควบคุม AI
            </div>
            <h1 className="mt-5 font-heading text-5xl font-black tracking-tight text-white md:text-6xl">
              ศูนย์ควบคุม AI หลังบ้านสำหรับฝ่าย IT
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-relaxed text-white/80">
              มองเห็นระบบทุกชั้น ตั้งแต่ตัวชี้วัดการทำงาน บันทึกย้อนหลัง การปกปิด PII ผลประเมินระบบ ไปจนถึงการกำกับดูแลและการจัดการข้อมูล เพื่อให้ทีมไอทีควบคุมการขยายใช้งานได้จริง
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto flex-1 px-4 py-10">
        <BackOfficeSuiteNav />

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <TowerMetric label="คำขอใช้งาน / 1 ชม." value={liveMetrics ? String(liveMetrics.requests_1h) : "—"} icon={Activity} />
          <TowerMetric label="อัตราความผิดพลาด" value={liveMetrics ? `${(liveMetrics.error_rate_1h * 100).toFixed(1)}%` : "—"} icon={Network} />
          <TowerMetric label="รายการบันทึกย้อนหลัง" value={liveMetrics ? String(liveMetrics.total_audit_entries) : "—"} icon={Hash} />
          <TowerMetric label="จำนวนโหนดในกราฟ" value={graphStats ? String(graphStats.total_nodes) : "—"} icon={Database} />
        </div>

        <RoleFeatureMenuPanel
          eyebrow="เมนูฟีเจอร์สำหรับฝ่าย IT"
          title="เลือกมุมมองตามหน้าที่ของทีมดูแลระบบ"
          description="แยกเมนูเป็น observability, governance และ data operations เพื่อให้ทีม IT เข้าถึงเครื่องมือได้ตรงงาน"
          menus={towerFeatureMenus}
          activeTitle={activeFeatureMenu}
          onSelect={setActiveFeatureMenu}
          activeSummary={
            <>
              <span className="font-semibold text-foreground">{activeMenuMeta.title}</span>
              {" • "}
              {activeMenuMeta.desc}
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            {activeMenuMeta.links.map((link) => (
              <Link
                key={`${activeMenuMeta.title}-${link.label}`}
                to={link.path}
                className="rounded-[1.5rem] border border-border bg-muted/10 p-4 transition-colors hover:border-primary/25 hover:bg-primary/5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <link.icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-lg font-bold text-foreground">{link.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{link.note}</p>
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-primary">
                  <span>เปิดมุมมองนี้</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </RoleFeatureMenuPanel>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Eye className="h-6 w-6 text-primary" />
                <h2 className="font-heading text-2xl font-black text-foreground">ภาพรวมการมองเห็นระบบ</h2>
              </div>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <ControlCard
                title="คุณภาพของ AI"
                lines={[
                  `ดัชนีความซื่อสัตย์: ${liveMetrics ? `${Math.round(liveMetrics.ai_metrics.avg_honesty_score * 100)}%` : "—"}`,
                  `อัตราคำตอบคลาดเคลื่อน: ${liveMetrics ? `${(liveMetrics.ai_metrics.hallucination_rate * 100).toFixed(1)}%` : "—"}`,
                  `การรั่วไหลของ PII: ${liveMetrics ? String(liveMetrics.ai_metrics.pii_leak_count) : "—"}`,
                ]}
              />
              <ControlCard
                title="ปริมาณงานและแคช"
                lines={[
                  `คำขอใช้งาน / 24 ชม.: ${liveMetrics ? String(liveMetrics.requests_24h) : "—"}`,
                  `อัตราแคชที่ใช้ได้ผล: ${liveMetrics ? `${(liveMetrics.cache_hit_rate_1h * 100).toFixed(1)}%` : "—"}`,
                  `จำนวนเส้นเชื่อมในกราฟ: ${graphStats ? String(graphStats.total_edges) : "—"}`,
                ]}
              />
            </div>
            <div className="mt-6 rounded-[1.5rem] border border-border bg-muted/10 p-4">
              <p className="text-sm font-bold text-foreground">การนำทางหลักใช้เมนูด้านบนเป็น source เดียว</p>
              <p className="mt-2 text-sm text-muted-foreground">
                ทางลัดไปยังแดชบอร์ดไอที คอนโซลติดตามการทำงาน หน้าผลประเมิน และหน้าการกำกับการใช้ AI ถูกจัดรวมไว้ในเมนูหลักด้านบนแล้ว เพื่อลดการซ้ำของปุ่มนำทางในหน้าเดียวกัน
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-teal" />
              <h2 className="font-heading text-2xl font-black text-foreground">การปล่อยใช้งานและการกำกับดูแล</h2>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <ControlCard
                title="สถานะการปล่อยใช้งาน"
                lines={[releaseGuard?.release_allowed ? "พร้อมตามเงื่อนไขที่กำหนด" : "ยังไม่ผ่านเงื่อนไขที่กำหนด"]}
              />
              <ControlCard
                title="ผลการตรวจ"
                lines={[`ผ่าน ${releaseGuard?.passed_checks ?? 0}`, `ไม่ผ่าน ${releaseGuard?.failed_checks ?? 0}`]}
              />
              <ControlCard
                title="โหมดการทำงาน"
                lines={[releaseGuard?.mode ?? "ไม่ทราบ", graphStats?.storage_mode ? `กราฟ ${graphStats.storage_mode}` : "ไม่ทราบโหมดกราฟ"]}
              />
            </div>
            <div className="mt-6 space-y-3">
              {guardChecks.length > 0 ? guardChecks.map((check, index) => (
                <div key={`${check.check ?? check.name ?? "check"}-${index}`} className="flex items-start justify-between gap-3 rounded-[1.5rem] border border-border bg-muted/10 p-4">
                  <div>
                    <p className="text-sm font-bold text-foreground">{check.name ?? check.check ?? "รายการตรวจที่ไม่ระบุชื่อ"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{check.detail ?? check.status ?? "ไม่มีรายละเอียดเพิ่มเติม"}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${check.passed ? "bg-teal/10 text-teal" : "bg-destructive/10 text-destructive"}`}>
                    {check.passed ? "ผ่าน" : "ไม่ผ่าน"}
                  </span>
                </div>
              )) : (
                <p className="rounded-[1.5rem] border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                  ยังไม่มีภาพรวมการตรวจปล่อยใช้งานจากระบบหลังบ้าน
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3">
              <Hash className="h-6 w-6 text-primary" />
              <h2 className="font-heading text-2xl font-black text-foreground">บันทึกการตรวจสอบย้อนหลังล่าสุด</h2>
            </div>
            <div className="mt-5 space-y-3">
              {(recentAudit?.entries ?? []).length > 0 ? recentAudit!.entries.map((entry) => (
                <div key={entry.id} className="rounded-[1.5rem] border border-border bg-muted/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-foreground">{entry.action}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(entry.created_at).toLocaleString("th-TH")}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{entry.query_preview || "ไม่มีตัวอย่างคำค้น"}</p>
                </div>
              )) : (
                <p className="rounded-[1.5rem] border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                  ยังไม่มีรายการบันทึกย้อนหลังจากระบบหลังบ้าน
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-gold" />
              <h2 className="font-heading text-2xl font-black text-foreground">ประเด็นหลักที่ฝ่ายไอทีต้องเฝ้าระวัง</h2>
            </div>
            <div className="mt-5 space-y-3">
              {[
                "ดูแลระบบเก่าและใหม่พร้อมกันโดยไม่เสีย observability",
                "รู้ว่าระบบ AI พังตรงไหนก่อนผู้ใช้จะเจอปัญหา",
                "ควบคุม PDPA, audit และ release governance ในหน้าเดียว",
                "เชื่อม data ingestion, benchmark และ incident response เข้าด้วยกัน",
              ].map((item) => (
                <div key={item} className="rounded-[1.5rem] border border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-[1.5rem] border border-border bg-muted/10 p-4">
              <p className="text-sm font-bold text-foreground">หลักฐานความพร้อมจากระบบรันจริง</p>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>แหล่งที่มาของนโยบายสิทธิ์เข้าถึง: {accessMatrix?.source ?? "ระบบหลังบ้านไม่พร้อมใช้งาน"}</p>
                <p>การจัดเก็บกราฟความรู้: {graphStats?.storage_mode ?? "ไม่ทราบ"}</p>
                <p>Last graph snapshot: {graphStats?.persisted_at ? new Date(graphStats.persisted_at).toLocaleString("th-TH") : "ยังไม่มี"}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-3">
            <FileCheck className="h-6 w-6 text-primary" />
            <h2 className="font-heading text-2xl font-black text-foreground">ลำดับการสาธิต</h2>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            ถ้าจะเดโมให้ผู้บริหารเห็นภาพครบ แนะนำให้เดินตามลำดับด้านล่าง แล้วจบที่หน้านี้เพื่อยืนยันว่า workflow ทั้งเส้นยังถูก monitor และ govern ได้จริง
          </p>
          <div className="mt-5 grid gap-4 xl:grid-cols-4">
            {demoSteps.map((step) => (
              <Link
                key={step.title}
                to={step.path}
                className="rounded-[1.5rem] border border-border bg-muted/10 p-4 transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <p className="text-sm font-bold">{step.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground hover:text-primary-foreground">{step.desc}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <PartnerBar />
      <Footer />
    </div>
  );
};

const TowerMetric = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
}) => (
  <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-card">
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
      <Icon className="h-5 w-5" />
    </div>
    <p className="mt-4 text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    <p className="mt-2 text-3xl font-black text-foreground">{value}</p>
  </div>
);

const ControlCard = ({ title, lines }: { title: string; lines: string[] }) => (
  <div className="rounded-[1.5rem] border border-border bg-muted/10 p-4">
    <p className="text-sm font-bold text-foreground">{title}</p>
    <div className="mt-3 space-y-2">
      {lines.map((line) => (
        <p key={line} className="text-sm text-muted-foreground">{line}</p>
      ))}
    </div>
  </div>
);

export default AIControlTowerPage;
