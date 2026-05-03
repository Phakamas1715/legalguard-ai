import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookOpen,
  ClipboardCheck,
  Database,
  Eye,
  FileSearch,
  FileText,
  Gavel,
  Info,
  LayoutDashboard,
  LifeBuoy,
  Search,
  Server,
  Shield,
  ShieldCheck,
  Users,
  Workflow,
  Sparkles,
} from "lucide-react";

export interface RoleItem {
  path: string;
  label: string;
  icon: LucideIcon;
  desc: string;
}

export interface FeatureItem {
  path: string;
  label: string;
  icon: LucideIcon;
  desc: string;
}

export interface RoleFeatureMenuConfig {
  title: string;
  desc: string;
  icon: LucideIcon;
  accent?: string;
}

export const roleItems: RoleItem[] = [
  { path: "/back-office", label: "ศูนย์รวมแดชบอร์ดหลังบ้าน", icon: LayoutDashboard, desc: "ศูนย์รวมแดชบอร์ดหลังบ้านแบบแยกตามบทบาท" },
  { path: "/citizen", label: "ประชาชน / ผู้เสียหาย", icon: Users, desc: "บริการข้อมูลและสิทธิ" },
  { path: "/clerk-copilot", label: "เจ้าหน้าที่ / ธุรการ", icon: Shield, desc: "พื้นที่ช่วยงานธุรการสำหรับขั้นตอนงานศาล" },
  { path: "/judge-workbench", label: "ตุลาการ / ผู้พิพากษา", icon: Gavel, desc: "พื้นที่ช่วยงานผู้พิพากษาสำหรับการพิจารณา" },
  { path: "/ai-control-tower", label: "ระบบไอที / ผู้ดูแล", icon: Server, desc: "ศูนย์ควบคุม AI สำหรับติดตามระบบและการกำกับดูแล" },
];

export const roleFeatureItems: Record<string, FeatureItem[]> = {
  "/back-office": [
    { path: "/back-office", label: "ศูนย์รวมแดชบอร์ดหลังบ้าน", icon: LayoutDashboard, desc: "ศูนย์รวมแดชบอร์ดหลังบ้านทั้งหมด" },
    { path: "/clerk-copilot", label: "พื้นที่ช่วยงานธุรการ", icon: Shield, desc: "งานธุรการแบบครบกระบวนงาน" },
    { path: "/judge-workbench", label: "พื้นที่ช่วยงานผู้พิพากษา", icon: Gavel, desc: "งานช่วยผู้พิพากษาแบบแยกบทบาท" },
    { path: "/ai-control-tower", label: "ศูนย์ควบคุม AI", icon: Server, desc: "มุมมองสำหรับทีมไอทีและการกำกับดูแล" },
  ],
  "/citizen": [
    { path: "/citizen", label: "หน้าบริการประชาชน", icon: Users, desc: "ศูนย์รวมบริการสำหรับประชาชน" },
    { path: "/search?role=citizen", label: "ค้นคำพิพากษา", icon: Search, desc: "ค้นกฎหมายและคดีด้วยภาษาธรรมชาติ" },
    { path: "/complaint-form", label: "ร่างคำฟ้อง", icon: FileText, desc: "ช่วยเตรียมแบบฟอร์มก่อนยื่น" },
    { path: "/glossary", label: "ศัพท์กฎหมาย", icon: BookOpen, desc: "ดูความหมายศัพท์ที่ใช้บ่อย" },
    { path: "/courts", label: "ค้นหาศาล", icon: Info, desc: "ดูข้อมูลศาลและช่องทางติดต่อ" },
  ],
  "/clerk-copilot": [
    { path: "/clerk-copilot", label: "เมนูพื้นที่ช่วยงานธุรการ", icon: Shield, desc: "ดูขั้นตอนงานธุรการแบบแยกหมวด" },
    { path: "/government-legacy", label: "มุมมองเดิมของเจ้าหน้าที่", icon: LayoutDashboard, desc: "เปิดแดชบอร์ดเดิมสำหรับตรวจสอบหรือเปรียบเทียบ" },
    { path: "/complaint-form", label: "คัดกรองคำฟ้อง", icon: FileText, desc: "เปิดฟอร์มยื่นเรื่องและตรวจความครบถ้วน" },
    { path: "/search?role=government", label: "ค้นกฎหมายสำหรับธุรการ", icon: Search, desc: "ค้นเอกสารและคำพิพากษาเพื่อสนับสนุนงาน" },
  ],
  "/judge-workbench": [
    { path: "/judge-workbench", label: "เมนูพื้นที่ช่วยงานผู้พิพากษา", icon: Gavel, desc: "ดูเครื่องมือผู้พิพากษาแบบแยกหมวด" },
    { path: "/judge-legacy", label: "มุมมองเดิมของตุลาการ", icon: LayoutDashboard, desc: "เปิดแดชบอร์ดเดิมสำหรับตรวจสอบหรือเปรียบเทียบ" },
    { path: "/search?role=government", label: "ค้นฎีกาและกฎหมาย", icon: Search, desc: "ค้นคดีคล้ายและมาตราที่เกี่ยวข้อง" },
    { path: "/responsible-ai", label: "การกำกับการใช้ AI", icon: ShieldCheck, desc: "ดูข้อกำกับความเสี่ยงของระบบ" },
  ],
  "/ai-control-tower": [
    { path: "/ai-control-tower", label: "เมนูศูนย์ควบคุม AI", icon: Server, desc: "ดูฟีเจอร์ไอทีแบบแยกหมวด" },
    { path: "/it-legacy", label: "มุมมองเดิมของฝ่ายไอที", icon: Activity, desc: "เปิดแดชบอร์ดเชิงลึกเดิมสำหรับตรวจสอบหรือเปรียบเทียบ" },
    { path: "/trace-console", label: "คอนโซลติดตามการทำงาน", icon: Eye, desc: "ตรวจ L0-L6 และร่องรอยการทำงานของเอเจนต์" },
    { path: "/benchmark", label: "ผลประเมินระบบ", icon: Sparkles, desc: "ดูผลประเมินการค้นคืนข้อมูลและการอ้างอิง" },
  ],
};

export const clerkFeatureMenus: RoleFeatureMenuConfig[] = [
  {
    title: "รับเรื่อง",
    desc: "เริ่มจากรับคำร้อง ตรวจเอกสาร และคัดกรองความครบถ้วนก่อนเข้าสู่ระบบ",
    icon: ClipboardCheck,
    accent: "text-primary",
  },
  {
    title: "เตรียมคดี",
    desc: "จัดแฟ้ม สกัด metadata และส่งต่อภารกิจไปยังขั้นตอนถัดไปอย่างเป็นระบบ",
    icon: Workflow,
    accent: "text-teal",
  },
  {
    title: "ติดตามและช่วยเหลือ",
    desc: "ดู backlog ช่วยตอบคำถามซ้ำ และติดตามสถานะงานหน้าเคาน์เตอร์",
    icon: LifeBuoy,
    accent: "text-accent-foreground",
  },
];

export const judgeFeatureMenus: RoleFeatureMenuConfig[] = [
  {
    title: "อ่านและสรุป",
    desc: "เริ่มจากทำความเข้าใจข้อเท็จจริงและภาพรวมของสำนวนให้เร็วขึ้น",
    icon: FileText,
    accent: "text-primary",
  },
  {
    title: "ค้นและเปรียบเทียบ",
    desc: "ค้นคดีคล้ายและเทียบแนวคำพิพากษาเพื่อประกอบการพิจารณา",
    icon: FileSearch,
    accent: "text-teal",
  },
  {
    title: "ร่างและกำกับ",
    desc: "ใช้โครงร่างเบื้องต้นภายใต้การกำกับโดยมนุษย์และข้อกำกับความเสี่ยง",
    icon: ShieldCheck,
    accent: "text-accent-foreground",
  },
];

export const towerFeatureMenus: Array<RoleFeatureMenuConfig & { links: Array<{ label: string; path: string; icon: LucideIcon; note: string }> }> = [
  {
    title: "มองเห็นระบบ",
    desc: "ติดตามการทำงานของระบบแบบรันจริง ทั้งปริมาณงาน ร่องรอยการทำงาน บันทึกย้อนหลัง และสุขภาพระบบ",
    icon: Eye,
    accent: "text-primary",
    links: [
      { label: "เปิดแดชบอร์ดไอทีเชิงลึก", path: "/it-legacy", icon: Server, note: "ดูตัวชี้วัด บันทึกย้อนหลัง การนำเข้าข้อมูล และชั้นความปลอดภัย" },
      { label: "เปิดคอนโซลติดตามการทำงาน", path: "/trace-console", icon: Activity, note: "ตรวจ L0-L6 และตำแหน่งของ Feynman Multi-Agent Engine" },
    ],
  },
  {
    title: "กำกับความเสี่ยง",
    desc: "ตรวจการปล่อยใช้งาน การกำกับการใช้ AI และหลักฐานว่าระบบพร้อมใช้งานหรือยัง",
    icon: ShieldCheck,
    accent: "text-teal",
    links: [
      { label: "เปิดหน้าการกำกับการใช้ AI", path: "/responsible-ai", icon: ShieldCheck, note: "ดูคะแนนธรรมาภิบาล ระดับความเสี่ยง และวงจรหยุดฉุกเฉิน" },
      { label: "เปิดหน้าผลประเมินระบบ", path: "/benchmark", icon: Sparkles, note: "ยืนยันคุณภาพการค้นคืนข้อมูลและการอ้างอิงก่อนขยายใช้งาน" },
    ],
  },
  {
    title: "จัดการข้อมูล",
    desc: "ติดตามกราฟความรู้ ตารางสิทธิ์เข้าถึง และคุณภาพของชั้นข้อมูลที่ระบบใช้อ้างอิง",
    icon: Database,
    accent: "text-accent-foreground",
    links: [
      { label: "เปิดแดชบอร์ดไอทีเชิงลึก", path: "/it-legacy", icon: Database, note: "ดูสถิติกราฟ ตารางสิทธิ์เข้าถึง และงานนำเข้าข้อมูล" },
      { label: "เปิดคอนโซลติดตามการทำงาน", path: "/trace-console", icon: FileText, note: "ตรวจหลักฐานรันจริงของชั้นที่พึ่งพาข้อมูล" },
    ],
  },
];

export const resolveCurrentRoleKey = (pathname: string): string | undefined => {
  if (pathname.startsWith("/government") || pathname.startsWith("/clerk-copilot")) return "/clerk-copilot";
  if (pathname.startsWith("/judge") || pathname.startsWith("/judge-workbench")) return "/judge-workbench";
  if (
    pathname.startsWith("/it") ||
    pathname.startsWith("/ai-control-tower") ||
    pathname.startsWith("/trace-console") ||
    pathname.startsWith("/benchmark") ||
    pathname.startsWith("/responsible-ai")
  ) return "/ai-control-tower";
  if (
    pathname.startsWith("/citizen") ||
    pathname.startsWith("/complaint-form") ||
    pathname.startsWith("/courts") ||
    pathname.startsWith("/glossary")
  ) return "/citizen";
  if (pathname.startsWith("/back-office")) return "/back-office";
  return roleItems.find((role) => pathname === role.path)?.path;
};
