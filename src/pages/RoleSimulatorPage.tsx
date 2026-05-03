import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { roleFeatureItems } from "@/lib/roleMenuConfig";
import { createFormalDocumentNumber, downloadWordDocument } from "@/lib/wordExport";
import {
  Activity,
  ArrowRight,
  Bot,
  Building2,
  ChevronRight,
  Clock3,
  FileSearch,
  Pause,
  Play,
  RefreshCw,
  Scale,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import demoBg from "@/assets/demo-bg.jpg";

type RoleKey = "citizen" | "clerk" | "judge" | "it";

interface SimulatorScene {
  id: string;
  role: RoleKey;
  title: string;
  subtitle: string;
  route: string;
  queryLabel: string;
  queryText: string;
  responseTitle: string;
  responseBody: string;
  chatbotPrompt?: string;
  chatbotReply?: string;
  metrics: Array<{ label: string; value: string }>;
  steps: string[];
  badges: string[];
  templateTitle?: string;
  templateDescription?: string;
  templateFields?: Array<{
    label: string;
    value: string;
    state?: "filled" | "pending" | "system";
  }>;
}

const roleStyles: Record<
  RoleKey,
  { label: string; icon: LucideIcon; accent: string; soft: string; glow: string }
> = {
  citizen: {
    label: "ประชาชน",
    icon: UserRound,
    accent: "text-sky-300",
    soft: "bg-sky-400/10 border-sky-300/20",
    glow: "shadow-[0_0_24px_rgba(56,189,248,0.18)]",
  },
  clerk: {
    label: "เจ้าหน้าที่ธุรการ",
    icon: Building2,
    accent: "text-emerald-300",
    soft: "bg-emerald-400/10 border-emerald-300/20",
    glow: "shadow-[0_0_24px_rgba(52,211,153,0.18)]",
  },
  judge: {
    label: "ผู้พิพากษา",
    icon: Scale,
    accent: "text-amber-300",
    soft: "bg-amber-400/10 border-amber-300/20",
    glow: "shadow-[0_0_24px_rgba(251,191,36,0.18)]",
  },
  it: {
    label: "ฝ่ายไอที",
    icon: Server,
    accent: "text-cyan-300",
    soft: "bg-cyan-400/10 border-cyan-300/20",
    glow: "shadow-[0_0_24px_rgba(34,211,238,0.18)]",
  },
};

const scenes: SimulatorScene[] = [
  {
    id: "citizen-search",
    role: "citizen",
    title: "ประชาชนค้นข้อมูลคดีและสิทธิของตน",
    subtitle: "จำลองการค้นหากฎหมายและคำพิพากษาที่เกี่ยวข้องด้วยภาษาธรรมดา",
    route: "/citizen",
    queryLabel: "คำค้นจากผู้ใช้งาน",
    queryText: "ถูกหลอกลงทุนออนไลน์ ต้องเตรียมเอกสารอะไรและควรยื่นฟ้องอย่างไร",
    responseTitle: "ผลลัพธ์ที่ระบบจัดเตรียม",
    responseBody:
      "ระบบสรุปขั้นตอนเบื้องต้น เอกสารที่ควรเตรียม แนวคำอธิบายสิทธิ และเส้นทางไปยังแบบฟอร์มคำฟ้อง โดยไม่ชี้ขาดผลคดีแทนผู้ใช้",
    chatbotPrompt: "น้องซื่อสัตย์ช่วยอธิบายเป็นภาษาง่าย ๆ ให้หน่อย",
    chatbotReply:
      "ได้ค่ะ เบื้องต้นควรเตรียมหลักฐานการโอนเงิน บทสนทนา และข้อมูลผู้เกี่ยวข้อง จากนั้นตรวจเขตอำนาจศาลก่อนยื่นคำฟ้องค่ะ",
    metrics: [
      { label: "โหมดการทำงาน", value: "Citizen Assistant" },
      { label: "ผลลัพธ์", value: "ค้นข้อมูล + แชตบอท" },
      { label: "การคุ้มครอง", value: "Mask PII ก่อนตอบ" },
    ],
    steps: [
      "รับคำถามภาษาธรรมดาจากประชาชน",
      "ค้นฐานความรู้กฎหมายและคู่มือที่เกี่ยวข้อง",
      "สรุปผลลัพธ์เป็นภาษาง่ายพร้อมแหล่งอ้างอิง",
      "ส่งต่อไปยังแบบฟอร์มคำฟ้องและช่องทางศาลที่เหมาะสม",
    ],
    badges: ["ค้นข้อมูลกฎหมาย", "แชตบอทประชาชน", "อธิบายภาษาง่าย"],
  },
  {
    id: "citizen-chatbot",
    role: "citizen",
    title: "ประชาชนใช้แชตบอทน้องซื่อสัตย์เพื่อถามขั้นตอน",
    subtitle: "จำลองการสนทนาเพื่ออธิบายสิทธิ เอกสาร และขั้นตอนเบื้องต้นด้วยภาษาที่เข้าใจง่าย",
    route: "/citizen",
    queryLabel: "บทสนทนาตัวอย่าง",
    queryText: "น้องซื่อสัตย์คะ ถ้าจะยื่นฟ้องคดีผู้บริโภค ต้องเริ่มจากตรงไหนก่อน",
    responseTitle: "สิ่งที่แชตบอทจัดเตรียม",
    responseBody:
      "แชตบอทสรุปขั้นตอนเบื้องต้น เอกสารที่ควรมี ช่องทางยื่นเรื่อง และข้อควรระวัง พร้อมเน้นว่าเป็นข้อมูลประกอบการเตรียมตัว ไม่ใช่คำวินิจฉัยทางกฎหมาย",
    chatbotPrompt: "ช่วยสรุปเป็นข้อ ๆ และบอกว่าถ้ายังเอกสารไม่ครบควรทำอย่างไร",
    chatbotReply:
      "ได้ค่ะ 1) ตรวจว่าคดีอยู่ในเขตอำนาจศาลใด 2) เตรียมหลักฐานการซื้อขายหรือข้อความโต้ตอบ 3) หากเอกสารยังไม่ครบ ให้รวบรวมหลักฐานการชำระเงินและข้อมูลคู่กรณีก่อนยื่นค่ะ",
    metrics: [
      { label: "ชื่อบริการ", value: "น้องซื่อสัตย์" },
      { label: "รูปแบบคำตอบ", value: "ภาษาง่าย + อ้างอิงได้" },
      { label: "การคุ้มครอง", value: "ลดคำตอบเกินขอบเขต" },
    ],
    steps: [
      "รับคำถามจากประชาชนด้วยภาษาธรรมชาติ",
      "ค้นฐานความรู้กฎหมายและคู่มือที่เกี่ยวข้อง",
      "ปรับถ้อยคำเป็นภาษาที่ประชาชนเข้าใจง่าย",
      "ใส่คำเตือนและชี้ช่องทางให้ไปทำรายการต่อในระบบจริง",
    ],
    badges: ["น้องซื่อสัตย์", "ถามตอบขั้นตอน", "ข้อมูลเบื้องต้น"],
  },
  {
    id: "citizen-template",
    role: "citizen",
    title: "ประชาชนเตรียมร่างคำฟ้องจากเทมเพลตตัวอย่าง",
    subtitle: "จำลองการกรอกข้อมูลตามแบบฟอร์มที่ระบบช่วยตรวจความครบถ้วนก่อนยื่น",
    route: "/complaint-form",
    queryLabel: "โจทย์การกรอกแบบฟอร์ม",
    queryText: "ช่วยเตรียมข้อมูลสำหรับยื่นคำฟ้องคดีฉ้อโกงออนไลน์ พร้อมตรวจว่าขาดข้อมูลส่วนใด",
    responseTitle: "ผลลัพธ์ที่ระบบจัดเตรียม",
    responseBody:
      "ระบบจัดเทมเพลตคำฟ้องเบื้องต้น แยกข้อมูลโจทก์ จำเลย ข้อเท็จจริง คำขอท้ายฟ้อง และแจ้งรายการข้อมูลที่ควรเติมเพิ่มก่อนยื่นจริง",
    chatbotPrompt: "ถ้าฉันยังไม่มีที่อยู่จำเลย ต้องกรอกส่วนไหนก่อนได้บ้าง",
    chatbotReply:
      "สามารถกรอกข้อมูลผู้ฟ้องคดี ข้อเท็จจริง วันเวลาเกิดเหตุ และหลักฐานที่มีอยู่ก่อนได้ค่ะ ระบบจะทำเครื่องหมายส่วนที่ยังขาดเพื่อให้กลับมาเติมภายหลัง",
    metrics: [
      { label: "โหมดการทำงาน", value: "แบบฟอร์มช่วยร่างคำฟ้อง" },
      { label: "ผลลัพธ์", value: "เทมเพลต + ตรวจความครบถ้วน" },
      { label: "การคุ้มครอง", value: "Mask PII ก่อนประมวลผล" },
    ],
    steps: [
      "รับข้อมูลพื้นฐานของคดีจากผู้ใช้งาน",
      "จัดข้อมูลลงเทมเพลตคำฟ้องตามลำดับที่ควรกรอก",
      "แจ้งช่องข้อมูลที่ยังขาดและเอกสารที่ควรแนบ",
      "ส่งต่อไปยังหน้าร่างคำฟ้องจริงเพื่อแก้ไขและยืนยัน",
    ],
    badges: ["เทมเพลตกรอกข้อมูล", "ร่างคำฟ้อง", "ตรวจความครบถ้วน"],
    templateTitle: "ตัวอย่างเทมเพลตคำฟ้องสำหรับประชาชน",
    templateDescription: "ตัวอย่างนี้ใช้สาธิตการเตรียมข้อมูลก่อนยื่นคำฟ้องจริงในระบบ",
    templateFields: [
      { label: "ชื่อผู้ฟ้องคดี", value: "นางสาวตัวอย่าง ผู้เสียหาย", state: "filled" },
      { label: "ประเภทคดี", value: "ฉ้อโกงออนไลน์ / ผู้บริโภค", state: "system" },
      { label: "ข้อเท็จจริงโดยสรุป", value: "โอนเงินซื้อสินค้าแล้วไม่ได้รับของ และคู่กรณีตัดการติดต่อ", state: "filled" },
      { label: "หลักฐานที่แนบ", value: "สลิปโอนเงิน, บันทึกแชต, รูปประกาศขาย", state: "filled" },
      { label: "ที่อยู่จำเลย", value: "ยังไม่ครบถ้วน ต้องติดตามเพิ่มเติม", state: "pending" },
    ],
  },
  {
    id: "clerk-intake",
    role: "clerk",
    title: "เจ้าหน้าที่ธุรการคัดกรองเอกสารและเตรียมคดี",
    subtitle: "จำลองการรับเรื่อง ตรวจความครบถ้วน และส่งต่อ workflow ในหลังบ้าน",
    route: "/clerk-copilot",
    queryLabel: "คำขอจากเจ้าหน้าที่",
    queryText: "ตรวจรับคำร้องนี้ แยกข้อมูลสำคัญ และแจ้งว่าขาดเอกสารส่วนใด",
    responseTitle: "ผลลัพธ์ที่ระบบจัดเตรียม",
    responseBody:
      "ระบบดึง metadata สำคัญจากเอกสาร ระบุรายการเอกสารที่ยังขาด จัดหมวดคดีเบื้องต้น และเตรียมข้อมูลสำหรับส่งต่อเข้าระบบงานหลัก",
    chatbotPrompt: "ถ้ามีผู้มาติดต่อถามขั้นตอนซ้ำ ๆ ระบบช่วยอะไรได้บ้าง",
    chatbotReply:
      "ระบบสามารถตอบขั้นตอนมาตรฐาน เอกสารที่ต้องใช้ และสถานะการดำเนินงานเบื้องต้น เพื่อลดภาระตอบคำถามซ้ำของเจ้าหน้าที่ค่ะ",
    metrics: [
      { label: "โหมดการทำงาน", value: "Clerk Copilot" },
      { label: "ผลลัพธ์", value: "คัดกรอง + เตรียมคดี" },
      { label: "การคุ้มครอง", value: "Audit ทุกขั้น" },
    ],
    steps: [
      "รับเอกสารคำร้องและตรวจความครบถ้วน",
      "แยกคู่ความ ประเภทคดี และเอกสารแนบอัตโนมัติ",
      "แจ้งรายการที่ยังขาดและงานที่ต้องส่งต่อ",
      "บันทึก audit และติดตาม ingestion job จากหลังบ้าน",
    ],
    badges: ["รับเรื่อง", "เตรียมคดี", "ลดงานซ้ำ"],
  },
  {
    id: "clerk-template",
    role: "clerk",
    title: "เจ้าหน้าที่ธุรการใช้เทมเพลตตรวจรับคำร้อง",
    subtitle: "จำลองแบบฟอร์มหลังบ้านที่ใช้เช็กรายการเอกสารและข้อมูลสำคัญก่อนส่งต่อ",
    route: "/clerk-copilot",
    queryLabel: "โจทย์ของเจ้าหน้าที่",
    queryText: "เปิดเทมเพลตตรวจรับคำร้องและระบุว่าต้องติดตามเอกสารส่วนใดเพิ่มเติม",
    responseTitle: "ผลลัพธ์ที่ระบบจัดเตรียม",
    responseBody:
      "ระบบจัดรายการตรวจรับเอกสาร อัปเดตสถานะความครบถ้วนของคู่ความ เอกสารแนบ และเขตอำนาจศาล เพื่อให้เจ้าหน้าที่ลดการเช็กซ้ำด้วยมือ",
    chatbotPrompt: "ถ้าผู้มาติดต่อยังไม่แนบสำเนาบัตรประชาชน ระบบควรช่วยอย่างไร",
    chatbotReply:
      "ระบบจะแสดงรายการที่ยังขาดในเทมเพลต พร้อมข้อความอธิบายให้เจ้าหน้าที่แจ้งผู้มาติดต่อได้ทันที และบันทึกว่าเป็นเรื่องรอติดตามเอกสารค่ะ",
    metrics: [
      { label: "โหมดการทำงาน", value: "เทมเพลตตรวจรับคำร้อง" },
      { label: "ผลลัพธ์", value: "Checklist + Metadata" },
      { label: "การคุ้มครอง", value: "Audit ทุกขั้นตอน" },
    ],
    steps: [
      "เปิดแบบฟอร์มตรวจรับเรื่องของงานธุรการ",
      "ติ๊กสถานะเอกสารและข้อมูลคู่ความจากรายการมาตรฐาน",
      "บันทึกสิ่งที่ยังขาดและเตรียมส่งต่อเข้าระบบคดี",
      "สร้างร่องรอยการทำงานเพื่อให้ตรวจย้อนหลังได้",
    ],
    badges: ["ตรวจรับเอกสาร", "เทมเพลตหลังบ้าน", "ติดตามงานค้าง"],
    templateTitle: "ตัวอย่างเทมเพลตตรวจรับคำร้องสำหรับธุรการ",
    templateDescription: "ใช้สาธิตรายการที่เจ้าหน้าที่ต้องเช็กก่อนส่งต่อคำร้องเข้าสู่กระบวนงานหลัก",
    templateFields: [
      { label: "เลขรับคำร้อง", value: "รับ-ปชช-02568-0142", state: "system" },
      { label: "ข้อมูลคู่ความ", value: "ครบถ้วน", state: "filled" },
      { label: "เอกสารแนบหลักฐาน", value: "ครบ 3 จาก 4 รายการ", state: "pending" },
      { label: "เขตอำนาจศาล", value: "ระบบแนะนำศาลจังหวัดสมมติ", state: "system" },
      { label: "สถานะการส่งต่อ", value: "รอสำเนาบัตรประชาชนเพิ่มเติม", state: "pending" },
    ],
  },
  {
    id: "judge-brief",
    role: "judge",
    title: "ผู้พิพากษาตรวจสำนวนและค้นคดีคล้าย",
    subtitle: "จำลองการสรุปสำนวน ค้นแนวคำพิพากษา และจัดทำโครงร่างเอกสาร",
    route: "/judge-workbench",
    queryLabel: "โจทย์จากผู้พิพากษา",
    queryText: "สรุปข้อเท็จจริงของสำนวนนี้ และค้นคดีคล้ายที่เกี่ยวกับการฉ้อโกงออนไลน์",
    responseTitle: "ผลลัพธ์ที่ระบบจัดเตรียม",
    responseBody:
      "ระบบสรุปข้อเท็จจริง ประเด็นสำคัญ มาตราที่เกี่ยวข้อง และคดีคล้ายที่ค้นพบ พร้อมแหล่งอ้างอิงและคำเตือนว่าผู้พิพากษาต้องตรวจสอบทุกครั้ง",
    chatbotPrompt: "ช่วยจัดโครงร่างคำพิพากษาเบื้องต้นโดยไม่แตะดุลยพินิจ",
    chatbotReply:
      "ได้ครับ ระบบจะจัดหัวข้อข้อเท็จจริง ประเด็นกฎหมาย และมาตราที่เกี่ยวข้องเป็นโครงร่างเบื้องต้นเพื่อให้ผู้พิพากษาตรวจแก้ต่อ",
    metrics: [
      { label: "โหมดการทำงาน", value: "Judge Workbench" },
      { label: "ผลลัพธ์", value: "สรุปสำนวน + คดีคล้าย" },
      { label: "การคุ้มครอง", value: "Human Oversight" },
    ],
    steps: [
      "สรุปข้อเท็จจริงและประเด็นสำคัญของสำนวน",
      "ค้นคำพิพากษาคล้ายด้วยข้อเท็จจริงและมาตรา",
      "จัดโครงร่างเอกสารพร้อม citation",
      "ส่งผลลัพธ์ภายใต้กรอบไม่ล้ำเส้นดุลยพินิจ",
    ],
    badges: ["สรุปสำนวน", "คดีคล้าย", "โครงร่างคำพิพากษา"],
  },
  {
    id: "judge-draft",
    role: "judge",
    title: "ผู้พิพากษาจัดทำโครงร่างเอกสารภายใต้การกำกับโดยมนุษย์",
    subtitle: "จำลองการเตรียมโครงร่างคำพิพากษาเบื้องต้น พร้อมคำเตือนและ citation ก่อนใช้งานจริง",
    route: "/judge-workbench",
    queryLabel: "คำขอเพื่อประกอบการพิจารณา",
    queryText: "สร้างโครงร่างคำพิพากษาเบื้องต้นจากข้อเท็จจริงที่สรุปแล้ว โดยไม่ชี้ขาดแทนมนุษย์",
    responseTitle: "ผลลัพธ์ที่ระบบจัดเตรียม",
    responseBody:
      "ระบบจัดโครงสร้างหัวข้อข้อเท็จจริง ประเด็นกฎหมาย และคำพิพากษาคล้ายเพื่อประกอบการตรวจทาน แต่คงหลักมนุษย์กำกับทุกขั้นและต้องตรวจต้นฉบับเสมอ",
    chatbotPrompt: "ช่วยเตือนสิ่งที่ต้องตรวจทานก่อนใช้โครงร่างนี้จริง",
    chatbotReply:
      "ควรตรวจแหล่งอ้างอิงทุกฉบับ ทบทวนข้อเท็จจริงในสำนวนจริง และตรวจว่ามาตราที่เกี่ยวข้องยังใช้บังคับอยู่ก่อนนำไปใช้ค่ะ",
    metrics: [
      { label: "โหมดการทำงาน", value: "Judgment Skeleton" },
      { label: "ผลลัพธ์", value: "โครงร่าง + Citation" },
      { label: "การคุ้มครอง", value: "Human Oversight" },
    ],
    steps: [
      "รับข้อเท็จจริงที่ผู้พิพากษาตรวจแล้วบางส่วน",
      "จัดโครงหัวข้อและแนวอ้างอิงที่เกี่ยวข้อง",
      "แสดงคำเตือนและเพดานความเชื่อมั่นก่อนใช้งาน",
      "ส่งต่อให้ผู้พิพากษาตรวจแก้และยืนยันด้วยตนเอง",
    ],
    badges: ["โครงร่างคำพิพากษา", "Citation First", "มนุษย์กำกับ"],
    templateTitle: "ตัวอย่างโครงร่างคำพิพากษาเบื้องต้น",
    templateDescription: "แสดงเป็นตัวอย่างเพื่อสาธิตโครงสร้างเอกสาร ไม่ใช่ผลลัพธ์ที่ใช้แทนการพิจารณาของผู้พิพากษา",
    templateFields: [
      { label: "ข้อเท็จจริงโดยสรุป", value: "ระบบสรุปจากเอกสารและคำให้การเบื้องต้น", state: "system" },
      { label: "ประเด็นข้อกฎหมาย", value: "การฉ้อโกงออนไลน์และความเสียหายของผู้เสียหาย", state: "filled" },
      { label: "คำพิพากษาคล้ายที่อ้างอิง", value: "ฎีกา/คำพิพากษาที่ข้อเท็จจริงใกล้เคียง 3 ฉบับ", state: "filled" },
      { label: "ส่วนรอผู้พิพากษาตรวจแก้", value: "ถ้อยคำวินิจฉัยและการชั่งน้ำหนักพยานหลักฐาน", state: "pending" },
    ],
  },
  {
    id: "it-control",
    role: "it",
    title: "ฝ่ายไอทีตรวจสอบระบบและการกำกับดูแล",
    subtitle: "จำลองการดู metrics, release guard, audit trail และความพร้อมก่อนปล่อยใช้งาน",
    route: "/ai-control-tower",
    queryLabel: "คำถามจากผู้ดูแลระบบ",
    queryText: "แสดงสถานะ release guard, recent audit, ingestion jobs และความพร้อมของ safety pipeline",
    responseTitle: "ผลลัพธ์ที่ระบบจัดเตรียม",
    responseBody:
      "ระบบรวม metrics, audit chain, ingestion monitor, release guard และ risk snapshot ไว้ในหน้าเดียว เพื่อให้ทีม IT รู้ว่าระบบพร้อมใช้งานหรือควรเฝ้าระวังจุดใด",
    chatbotPrompt: "ถ้าจะอธิบายให้ Mentor เห็นภาพใน 30 วินาที ควรพูดอะไร",
    chatbotReply:
      "สามารถอธิบายได้ว่าระบบไม่ใช่เพียง AI ที่ตอบได้ แต่เป็นแพลตฟอร์มที่ตรวจสอบย้อนหลังได้ ควบคุมสิทธิ์ และมี release guard ก่อนปล่อยใช้งานจริงค่ะ",
    metrics: [
      { label: "โหมดการทำงาน", value: "AI Control Tower" },
      { label: "ผลลัพธ์", value: "Observability + Governance" },
      { label: "การคุ้มครอง", value: "Release Guard" },
    ],
    steps: [
      "ดึง metrics runtime และการใช้งานล่าสุด",
      "แสดง audit trail และ hash chain integrity",
      "สรุป release guard และ risk tier",
      "ชี้จุดที่ควรดำเนินการก่อนขึ้น production",
    ],
    badges: ["Live Metrics", "Audit Trail", "Release Guard"],
  },
  {
    id: "it-release",
    role: "it",
    title: "ฝ่ายไอทีใช้เช็กลิสต์ปล่อยใช้งานก่อนขึ้นระบบจริง",
    subtitle: "จำลองการตรวจ release guard, audit trail, access matrix และ safety pipeline ในหน้าเดียว",
    route: "/ai-control-tower",
    queryLabel: "รายการตรวจของผู้ดูแลระบบ",
    queryText: "ก่อนปล่อยใช้งานวันนี้ ระบบผ่าน release guard, audit chain, access matrix และ ingestion monitor ครบหรือไม่",
    responseTitle: "ผลลัพธ์ที่ระบบจัดเตรียม",
    responseBody:
      "ระบบสรุปรายการตรวจที่ผ่านและไม่ผ่าน พร้อม evidence ที่ทีมไอทีใช้ตัดสินใจว่าจะปล่อยใช้งานหรือระงับไว้ก่อน เพื่อให้การขยายระบบอยู่ภายใต้ธรรมาภิบาล",
    chatbotPrompt: "ช่วยสรุปรายการที่ต้องตรวจในรอบปล่อยใช้งานวันนี้",
    chatbotReply:
      "ควรตรวจ release guard, audit chain integrity, การรั่วไหลของ PII, access matrix, ingestion jobs และเสถียรภาพของ safety pipeline ก่อนปล่อยใช้งานค่ะ",
    metrics: [
      { label: "โหมดการทำงาน", value: "Release Readiness" },
      { label: "ผลลัพธ์", value: "Checklist + Evidence" },
      { label: "การคุ้มครอง", value: "Governance Gate" },
    ],
    steps: [
      "ดึง evidence ล่าสุดจาก release guard และ audit chain",
      "ตรวจสิทธิ์เข้าถึงและสภาพของข้อมูลหลังบ้าน",
      "สรุป ingestion jobs และจุดเสี่ยงที่ต้องเฝ้าระวัง",
      "ตัดสินใจปล่อยใช้งานหรือระงับตามหลักฐานที่ตรวจได้",
    ],
    badges: ["Release Guard", "Evidence Based", "พร้อมก่อนปล่อยใช้งาน"],
    templateTitle: "ตัวอย่างเช็กลิสต์ก่อนปล่อยใช้งาน",
    templateDescription: "แสดงรายการที่ทีมไอทีต้องตรวจทุกครั้งก่อนขยายการใช้งานในระบบจริง",
    templateFields: [
      { label: "Release Guard", value: "ผ่าน 15/15 รายการ", state: "filled" },
      { label: "Audit Chain Integrity", value: "ผ่านการตรวจครบ", state: "filled" },
      { label: "PII Leakage", value: "0 เหตุการณ์ในรอบล่าสุด", state: "filled" },
      { label: "Ingestion Jobs", value: "มี 1 งานรอตรวจซ้ำ", state: "pending" },
      { label: "Access Matrix", value: "ดึงจาก backend source ปัจจุบัน", state: "system" },
    ],
  },
];

const SCENE_DURATION_MS = 4200;

const roleRouteKeyMap: Record<RoleKey, keyof typeof roleFeatureItems> = {
  citizen: "/citizen",
  clerk: "/clerk-copilot",
  judge: "/judge-workbench",
  it: "/ai-control-tower",
};

const RoleSimulatorPage = () => {
  const navigate = useNavigate();
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  const currentScene = scenes[currentSceneIndex];
  const currentRoleStyle = roleStyles[currentScene.role];
  const progressPercent = Math.min((elapsed / SCENE_DURATION_MS) * 100, 100);

  useEffect(() => {
    if (!isPlaying) return;

    const tick = window.setInterval(() => {
      setElapsed((previous) => {
        const next = previous + 100;
        if (next >= SCENE_DURATION_MS) {
          setCurrentSceneIndex((sceneIndex) => (sceneIndex + 1) % scenes.length);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => window.clearInterval(tick);
  }, [isPlaying]);

  useEffect(() => {
    setElapsed(0);
  }, [currentSceneIndex]);

  const groupedSummary = useMemo(
    () =>
      scenes.map((scene, index) => ({
        index,
        id: scene.id,
        roleLabel: roleStyles[scene.role].label,
        title: scene.title,
      })),
    []
  );
  const currentRoleFeatures = roleFeatureItems[roleRouteKeyMap[currentScene.role]] ?? [];

  const exportSceneTemplate = (scene: SimulatorScene) => {
    if (!scene.templateFields?.length) return;

    downloadWordDocument({
      fileName: `legalguard-${scene.id}-template`,
      title: scene.templateTitle ?? scene.title,
      subtitle: scene.templateDescription ?? scene.subtitle,
      header: {
        sealText: "ตราสำหรับเอกสารสาธิต",
        organization: "LegalGuard AI",
        suborganization: `ชุดสาธิตบทบาท ${roleStyles[scene.role].label}`,
        documentClass: "เอกสารสาธิตการทำงานของระบบ",
      },
      metaRows: [
        { label: "เลขที่เอกสาร", value: createFormalDocumentNumber(`LG-SIM-${scene.role.toUpperCase()}`) },
        { label: "เลขรับเอกสาร", value: `SIM-${scene.id.toUpperCase()}` },
        { label: "วันที่จัดทำ", value: new Date().toLocaleDateString("th-TH") },
        { label: "เรื่อง", value: scene.title },
        { label: "เส้นทางระบบ", value: scene.route },
      ],
      sections: [
        {
          heading: "บริบทการใช้งาน",
          bullets: [
            `บทบาท: ${roleStyles[scene.role].label}`,
            `เส้นทางระบบ: ${scene.route}`,
            `คำขอตัวอย่าง: ${scene.queryText}`,
          ],
        },
        {
          heading: "ข้อมูลในเทมเพลต",
          bullets: scene.templateFields.map(
            (field) =>
              `${field.label}: ${field.value} (${field.state === "pending" ? "ต้องติดตาม" : field.state === "system" ? "ระบบจัดเตรียม" : "กรอกแล้ว"})`,
          ),
        },
        {
          heading: "ขั้นตอนที่ระบบแนะนำ",
          bullets: scene.steps,
        },
        {
          heading: "ผลลัพธ์ที่ระบบจัดเตรียม",
          body: scene.responseBody,
        },
      ],
      signatories: [
        {
          nameLine: "(ผู้ใช้งาน / ผู้ตรวจทาน)",
          titleLine: `สำหรับบทบาท ${roleStyles[scene.role].label}`,
        },
        {
          nameLine: "(ผู้สาธิตระบบ)",
          titleLine: "ใช้รับรองการนำเสนอหรือการทดลองใช้งาน",
        },
      ],
    });
  };

  const jumpToScene = (index: number) => {
    setCurrentSceneIndex(index);
    setElapsed(0);
  };

  const restartSimulation = () => {
    setCurrentSceneIndex(0);
    setElapsed(0);
    setIsPlaying(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07111f] text-white">
      <Navbar />

      <div className="relative overflow-hidden border-b border-white/5 pt-20 pb-10">
        <div className="absolute inset-0">
          <img src={demoBg} alt="" className="h-full w-full object-cover opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#081426] via-transparent to-[#07111f]" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
            <div className="mx-auto max-w-5xl text-center">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-gold">
                <Activity className="h-3 w-3" /> Video Simulator
              </div>
            <h1 className="font-heading text-4xl font-black tracking-tight md:text-6xl">
              ซิมูเลเตอร์การใช้งาน <span className="text-gold">LegalGuard AI</span>
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/70 md:text-lg">
              จำลองการใช้งานของประชาชน เจ้าหน้าที่ธุรการ ผู้พิพากษา และฝ่ายไอที
              รวมถึงการสืบค้นข้อมูลและการใช้แชตบอทในรูปแบบวิดีโอสาธิตที่กดเล่นอัตโนมัติได้
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 flex-1">
        <div className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-12">
          <div className="xl:col-span-4 space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-gold/80">Scenario Timeline</p>
                  <h2 className="mt-1 font-heading text-2xl font-black text-white">ลำดับการสาธิต</h2>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                  ฉาก {currentSceneIndex + 1} / {scenes.length}
                </div>
              </div>

              <div className="space-y-3">
                {groupedSummary.map((scene) => {
                  const roleStyle = roleStyles[scenes[scene.index].role];
                  const Icon = roleStyle.icon;
                  const active = scene.index === currentSceneIndex;
                  return (
                    <button
                      key={scene.id}
                      type="button"
                      onClick={() => jumpToScene(scene.index)}
                      className={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition-all ${
                        active
                          ? `border-gold/30 bg-gold/10 ${roleStyle.glow}`
                          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`rounded-2xl border p-2.5 ${roleStyle.soft}`}>
                          <Icon className={`h-5 w-5 ${roleStyle.accent}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/50">{scene.roleLabel}</p>
                            {active && <Play className="h-4 w-4 fill-current text-gold" />}
                          </div>
                          <p className="mt-1 text-sm font-semibold leading-6 text-white">{scene.title}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gold/80">Playback Control</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlaying((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gold px-4 py-3 text-sm font-bold text-[#07111f] transition-transform hover:scale-[1.02]"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                  {isPlaying ? "หยุดชั่วคราว" : "เล่นต่อ"}
                </button>
                <button
                  type="button"
                  onClick={restartSimulation}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10"
                >
                  <RefreshCw className="h-4 w-4" /> เริ่มใหม่
                </button>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs text-white/50">
                  <span>ความคืบหน้าฉากปัจจุบัน</span>
                  <span>{Math.round(progressPercent)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gold transition-[width] duration-100"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-[#0d1729] p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-gold/80">
                  <Users className="h-4 w-4" /> บทบาทที่ครอบคลุม
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(["citizen", "clerk", "judge", "it"] as RoleKey[]).map((roleKey) => {
                    const roleStyle = roleStyles[roleKey];
                    return (
                      <button
                        key={`role-${roleKey}`}
                        type="button"
                        onClick={() => jumpToScene(scenes.findIndex((scene) => scene.role === roleKey))}
                        className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors ${
                          currentScene.role === roleKey
                            ? "border-gold/30 bg-gold/10"
                            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                        }`}
                      >
                        <div className={`rounded-xl border p-2 ${roleStyle.soft}`}>
                          <roleStyle.icon className={`h-4 w-4 ${roleStyle.accent}`} />
                        </div>
                        <span className="text-sm font-semibold text-white">{roleStyle.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="xl:col-span-8">
            <div className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#081221] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-2xl border p-2.5 ${currentRoleStyle.soft}`}>
                    <currentRoleStyle.icon className={`h-5 w-5 ${currentRoleStyle.accent}`} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-white/50">Live Demo</p>
                    <p className="text-lg font-bold text-white">{currentRoleStyle.label}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(currentScene.route)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  เปิดหน้าจริง <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-0 xl:grid-cols-[1.3fr_0.9fr]">
                <div className="border-b border-white/10 p-6 xl:border-b-0 xl:border-r">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentScene.id}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -18 }}
                      transition={{ duration: 0.28 }}
                    >
                      <div className="mb-5 flex flex-wrap items-center gap-2">
                        {currentScene.badges.map((badge) => (
                          <span
                            key={badge}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/70"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>

                      <h2 className="font-heading text-3xl font-black text-white">{currentScene.title}</h2>
                      <p className="mt-3 text-sm leading-7 text-white/65">{currentScene.subtitle}</p>

                      <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
                        <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-gold/80">
                          <Search className="h-4 w-4" /> {currentScene.queryLabel}
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-[#0d1729] px-4 py-4 text-sm leading-7 text-white">
                          {currentScene.queryText}
                        </div>
                      </div>

                      <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
                        <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-300/90">
                          <FileSearch className="h-4 w-4" /> {currentScene.responseTitle}
                        </div>
                        <p className="text-sm leading-7 text-white/80">{currentScene.responseBody}</p>
                      </div>

                      {currentScene.templateTitle && currentScene.templateFields && (
                        <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
                          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-gold/80">
                              <Sparkles className="h-4 w-4" /> {currentScene.templateTitle}
                            </div>
                            <button
                              type="button"
                              onClick={() => exportSceneTemplate(currentScene)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-gold/20 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold hover:bg-gold/15"
                            >
                              <ArrowRight className="h-4 w-4" /> ส่งออกเทมเพลต Word
                            </button>
                          </div>
                          {currentScene.templateDescription && (
                            <p className="mb-4 text-sm leading-7 text-white/65">{currentScene.templateDescription}</p>
                          )}
                          <div className="space-y-3">
                            {currentScene.templateFields.map((field) => (
                              <div key={`${currentScene.id}-${field.label}`} className="rounded-2xl border border-white/10 bg-[#0d1729] px-4 py-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
                                      {field.label}
                                    </span>
                                    <p className="mt-2 text-sm leading-7 text-white">{field.value}</p>
                                  </div>
                                  <span
                                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                                      field.state === "pending"
                                        ? "bg-gold/10 text-gold"
                                        : field.state === "system"
                                          ? "bg-sky-400/10 text-sky-200"
                                          : "bg-emerald-400/10 text-emerald-200"
                                    }`}
                                  >
                                    {field.state === "pending" ? "ต้องติดตาม" : field.state === "system" ? "ระบบจัดเตรียม" : "กรอกแล้ว"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {currentScene.chatbotPrompt && currentScene.chatbotReply && (
                        <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
                          <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-sky-300/90">
                            <Bot className="h-4 w-4" /> {currentScene.role === "citizen" ? "การใช้แชตบอทน้องซื่อสัตย์" : "การใช้แชตบอทจำลอง"}
                          </div>
                          <div className="space-y-3">
                            <div className="rounded-2xl border border-white/10 bg-[#0d1729] px-4 py-4 text-sm leading-7 text-white">
                              <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">ผู้ใช้งานถาม</span>
                              {currentScene.chatbotPrompt}
                            </div>
                            <div className="rounded-2xl border border-sky-300/15 bg-sky-400/10 px-4 py-4 text-sm leading-7 text-white">
                              <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-sky-200/75">แชตบอทตอบ</span>
                              {currentScene.chatbotReply}
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="p-6">
                  <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
                    <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-gold/80">
                      <Clock3 className="h-4 w-4" /> ขั้นตอนจำลอง
                    </div>
                    <div className="space-y-3">
                      {currentScene.steps.map((step, index) => (
                        <div
                          key={`${currentScene.id}-${step}`}
                          className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                            index === 0
                              ? "border-gold/20 bg-gold/10 text-white"
                              : "border-white/10 bg-white/[0.03] text-white/75"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white/70">
                              {index + 1}
                            </div>
                            <div className="flex-1">{step}</div>
                            <ChevronRight className="mt-1 h-4 w-4 text-white/30" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
                    <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-gold/80">
                      <ShieldCheck className="h-4 w-4" /> Snapshot ของฉากนี้
                    </div>
                    <div className="grid gap-3">
                      {currentScene.metrics.map((metric) => (
                        <div key={metric.label} className="rounded-2xl border border-white/10 bg-[#0d1729] px-4 py-4">
                          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/45">{metric.label}</p>
                          <p className="mt-2 text-sm font-semibold text-white">{metric.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
                    <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-gold/80">
                      <Users className="h-4 w-4" /> ฟีเจอร์ในบทบาทนี้
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {currentRoleFeatures.map((feature) => (
                        <button
                          key={`${currentScene.role}-${feature.label}`}
                          type="button"
                          onClick={() => navigate(feature.path)}
                          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0d1729] px-3 py-3 text-left transition-colors hover:bg-white/[0.08]"
                        >
                          <feature.icon className="h-4 w-4 text-gold" />
                          <span className="text-sm text-white/75">{feature.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
                    <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-gold/80">
                      <ArrowRight className="h-4 w-4" /> กระโดดไปหน้าจริงของแต่ละบทบาท
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {([
                        { label: "ประชาชน", path: "/citizen", icon: UserRound },
                        { label: "ธุรการ", path: "/clerk-copilot", icon: Building2 },
                        { label: "ผู้พิพากษา", path: "/judge-workbench", icon: Scale },
                        { label: "ฝ่ายไอที", path: "/ai-control-tower", icon: Server },
                      ] as const).map((link) => (
                        <button
                          key={`jump-${link.path}`}
                          type="button"
                          onClick={() => navigate(link.path)}
                          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0d1729] px-3 py-3 text-left transition-colors hover:bg-white/[0.08]"
                        >
                          <link.icon className="h-4 w-4 text-gold" />
                          <span className="text-sm text-white/75">{link.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default RoleSimulatorPage;
