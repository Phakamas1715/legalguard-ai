import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, User, ShieldCheck, Database } from "lucide-react";
import ReactMarkdown from "react-markdown";
import botAvatar from "@/assets/nong-suesut.svg";
import chatbotHeaderBg from "@/assets/chatbot-header-bg.jpg";

import { apiClient } from "@/lib/apiClient";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { memory } from "@/lib/layeredMemory";
import { loadWorkspace, saveWorkspace, WORKSPACE_STORAGE_KEYS } from "@/lib/flowWorkspace";

// Anti-Hallucination 7 ชั้น ฝังใน System Prompt
const SYSTEM_PROMPT = `คุณคือ "น้องซื่อสัตย์" ผู้ช่วย AI ด้านกฎหมายไทย ระบบ Smart LegalGuard AI

=== กรอบ Anti-Hallucination 7 ชั้น ===

ชั้น 1 — RAG Grounding: ตอบจากข้อมูลกฎหมายไทยจริงเท่านั้น (ประมวลกฎหมาย, พ.ร.บ., คำพิพากษาศาลฎีกา)
ชั้น 2 — Citation Verification: อ้างอิงมาตรากฎหมายและเลขคดีจริงเสมอ ห้ามสร้างเลขปลอม
ชั้น 3 — Guardrails: ห้ามตอบเรื่องนอกกฎหมาย ห้ามให้คำแนะนำทางการแพทย์/การเงิน
ชั้น 4 — Unverified Flagging: ถ้าไม่แน่ใจ ต้องบอกว่า "ข้อมูลนี้ยังไม่ได้รับการยืนยัน กรุณาตรวจสอบกับทนายความ"
ชั้น 5 — "ไม่รู้" Policy: ถ้าไม่มีข้อมูล ต้องตอบว่า "ไม่พบข้อมูลที่เกี่ยวข้อง กรุณาปรึกษาทนายความ" ห้ามเดา
ชั้น 6 — Confidence Bound: ห้ามแสดงความมั่นใจเกิน 90% ในคำตอบ
ชั้น 7 — Disclaimer: ลงท้ายทุกคำตอบด้วย "⚖️ ข้อมูลเบื้องต้นเท่านั้น กรุณาปรึกษาทนายความสำหรับกรณีจริง"

=== กฎการตอบ ===
- ตอบเป็นภาษาไทยที่เข้าใจง่าย
- อ้างอิงมาตรากฎหมายเสมอ (เช่น ป.อ. มาตรา 341)
- ถ้าถูกถามเรื่องนอกกฎหมาย → ปฏิเสธสุภาพ + แนะนำให้ถามเรื่องกฎหมาย
- ถ้าเป็นคดีอาญา → แนะนำแจ้งความก่อน
- ถ้าเป็นคดีแพ่ง → แนะนำส่งหนังสือทวงถามก่อนฟ้อง
- AI ทำหน้าที่เป็นเครื่องมือช่วยสนับสนุนเท่านั้น ห้ามแทนดุลยพินิจของผู้มีอำนาจ`;

type Msg = { role: "user" | "assistant"; content: string };
const CHAT_WORKSPACE_STORAGE_KEY = WORKSPACE_STORAGE_KEYS.chat;

const BotAvatar = ({ size = "w-10 h-10" }: { size?: string }) => (
  <motion.img 
    src={botAvatar} 
    alt="น้องซื่อสัตย์" 
    className={`${size} object-contain mix-blend-screen brightness-110 flex-shrink-0`}
    animate={{ rotate: [0, -3, 3, -3, 0], y: [0, -4, 0] }} 
    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} 
  />
);

const BotAvatarSmall = () => (
  <motion.img 
    src={botAvatar} 
    alt="น้องซื่อสัตย์" 
    className="w-10 h-10 object-contain mix-blend-screen brightness-110 flex-shrink-0 mt-0.5"
    animate={{ y: [0, -1, 0] }} 
    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }} 
  />
);

const QUICK_ACTIONS = [
  { emoji: "🔍", label: "ถูกโกงเงินต้องทำอย่างไร?", category: "อาญา" },
  { emoji: "🚗", label: "ค่าปรับจราจรเท่าไหร่?", category: "จราจร" },
  { emoji: "💼", label: "ถูกเลิกจ้างไม่เป็นธรรม", category: "แรงงาน" },
  { emoji: "🏛️", label: "ฟ้องหน่วยงานรัฐได้ไหม?", category: "ปกครอง" },
  { emoji: "📱", label: "ถูกโกงออนไลน์ ไม่ส่งของ", category: "อาญา" },
  { emoji: "💰", label: "ยืมเงินแล้วไม่คืน ฟ้องได้ไหม?", category: "แพ่ง" },
  { emoji: "👨‍👩‍👧", label: "ฟ้องหย่าต้องเตรียมอะไร?", category: "ครอบครัว" },
  { emoji: "📄", label: "ขั้นตอนยื่นฟ้อง e-Filing", category: "คู่มือ" },
];

// Built-in knowledge base สำหรับ demo (ใช้เมื่อ API ไม่พร้อม)
const KNOWLEDGE: Record<string, string> = {
  "ฉ้อโกง|โกง|หลอกลวง": "**คดีฉ้อโกง** ป.อ. มาตรา 341\n\n1. **แจ้งความ** ที่สถานีตำรวจท้องที่\n2. **รวบรวมหลักฐาน** สลิปโอนเงิน แชท สัญญา\n3. **ยื่นฟ้อง** ศาลอาญา/ศาลแขวง\n\n**โทษ**: จำคุกไม่เกิน 3 ปี ปรับไม่เกิน 60,000 บาท\n**อายุความ**: 10 ปี",
  "จราจร|ค่าปรับ|ใบสั่ง|ฝ่าไฟแดง|เมาแล้วขับ": "**ค่าปรับจราจร** พ.ร.บ.จราจรทางบก\n\n- ฝ่าไฟแดง: ≤ 1,000 บาท\n- ไม่คาดเข็มขัด: ≤ 500 บาท\n- ขับเร็ว: ≤ 1,000 บาท\n- เมาแล้วขับ: จำคุก ≤ 1 ปี ปรับ 5,000-20,000 บาท\n- ไม่มีใบขับขี่: ≤ 1,000 บาท\n\nชำระได้ที่สถานีตำรวจ หรือแอป PTM",
  "เลิกจ้าง|แรงงาน|ค่าชดเชย|ค่าจ้าง|ล่วงเวลา": "**เลิกจ้างไม่เป็นธรรม** พ.ร.บ.คุ้มครองแรงงาน\n\n**ค่าชดเชยตามอายุงาน (มาตรา 118):**\n- 120 วัน - 1 ปี: 30 วัน\n- 1-3 ปี: 90 วัน\n- 3-6 ปี: 180 วัน\n- 6-10 ปี: 240 วัน\n- 10-20 ปี: 300 วัน\n- 20 ปีขึ้นไป: 400 วัน\n\n**ขั้นตอน:**\n1. ยื่นคำร้องต่อพนักงานตรวจแรงงาน\n2. ฟ้องศาลแรงงาน (ไม่เสียค่าธรรมเนียม)",
  "หย่า|ครอบครัว|มีชู้|อำนาจปกครอง|สินสมรส": "**ฟ้องหย่า** ป.พ.พ. มาตรา 1516\n\n**เหตุฟ้องหย่า 10 ข้อ** เช่น:\n- มีชู้ (มาตรา 1516(1))\n- ทำร้ายร่างกาย/จิตใจ\n- ทิ้งร้างเกิน 1 ปี\n- ไม่อุปการะเลี้ยงดู\n\n**สินสมรส:** แบ่งคนละครึ่ง\n**อำนาจปกครองบุตร:** ศาลพิจารณาประโยชน์สูงสุดของเด็ก\n\n**ค่าธรรมเนียม:** 200 บาท",
  "ปกครอง|หน่วยงานรัฐ|ฟ้องรัฐ|คำสั่งทางปกครอง": "**คดีปกครอง** พ.ร.บ.จัดตั้งศาลปกครอง มาตรา 9\n\n**ฟ้องได้เมื่อ:**\n- รัฐออกคำสั่งไม่ชอบด้วยกฎหมาย\n- ละเลยหน้าที่ตามกฎหมาย\n- ละเมิดทางปกครอง\n\n**ขั้นตอน:**\n1. ยื่น ปค.1 ต่อศาลปกครอง\n2. ภายใน 90 วัน นับแต่รู้เหตุ\n3. ไม่ต้องมีทนาย (แนะนำให้มี)\n\n**ค่าธรรมเนียม:** 2% ของทุนทรัพย์ (ไม่เกิน 200,000 บาท)",
  "ออนไลน์|ไม่ส่งของ|โกงเน็ต|แฮก|ข้อมูลส่วนบุคคล": "**โกงออนไลน์** ป.อ. มาตรา 341 + พ.ร.บ.คอมพิวเตอร์ มาตรา 14\n\n**ขั้นตอน:**\n1. แจ้งความที่ thaipoliceonline.com\n2. โทร 1441 (ศูนย์รับแจ้งอาชญากรรมออนไลน์)\n3. เก็บหลักฐาน: สลิป, แชท, โปรไฟล์ผู้ขาย\n4. แจ้งธนาคารอายัดบัญชี\n\n**PDPA:** หากข้อมูลส่วนบุคคลรั่วไหล แจ้ง สคส. ภายใน 72 ชม.",
  "e-filing|ยื่นฟ้อง|อีไฟลิ่ง|ยื่นออนไลน์": "**ยื่นฟ้อง e-Filing**\n\n1. สมัครที่ efiling.coj.go.th\n2. ยืนยันตัวตนด้วยบัตรประชาชน\n3. เลือกประเภทคดี + ศาล\n4. กรอกคำฟ้อง + แนบเอกสาร\n5. ชำระค่าธรรมเนียม\n6. รอเจ้าหน้าที่อนุมัติ\n\n**ศาลที่เปิด:** 29+ ศาล (คดีผู้บริโภค + จัดการมรดก)",
  "ยืมเงิน|ไม่คืน|กู้ยืม|หนี้": "**ยืมเงินไม่คืน** ป.พ.พ. มาตรา 653\n\n**หลักฐาน:** สัญญากู้ยืม, สลิปโอนเงิน, แชท, พยาน\n- กู้เกิน 2,000 บาท ต้องมีหลักฐานเป็นหนังสือ\n\n**ขั้นตอน:**\n1. ส่งหนังสือทวงถาม (ไปรษณีย์ลงทะเบียน)\n2. ฟ้องศาลแพ่ง/ศาลแขวง\n\n**อายุความ:** 10 ปี (กู้ยืม)",
  "ผู้บริโภค|สินค้า|ชำรุด|ไม่ตรง|ประกัน": "**คดีผู้บริโภค** พ.ร.บ.วิธีพิจารณาคดีผู้บริโภค\n\n**ข้อดี:**\n- ไม่ต้องมีทนาย\n- ไม่เสียค่าธรรมเนียมศาล\n- ฟ้องด้วยวาจาได้\n\n**ขั้นตอน:**\n1. ร้องเรียน สคบ. (โทร 1166)\n2. ฟ้องศาลแขวง/ศาลจังหวัด\n\n**อายุความ:** 3 ปี",
  "มรดก|พินัยกรรม|ทายาท": "**กฎหมายมรดก** ป.พ.พ. บรรพ 6\n\n**ทายาทโดยธรรม (มาตรา 1629):**\n1. ผู้สืบสันดาน (ลูก)\n2. บิดามารดา\n3. พี่น้องร่วมบิดามารดา\n4. พี่น้องร่วมบิดาหรือมารดา\n5. ปู่ย่าตายาย\n6. ลุงป้าน้าอา\n\n**คู่สมรส** ได้รับมรดกทุกกรณี\n\n**อายุความ:** 1 ปี นับแต่รู้ว่าเจ้ามรดกตาย",
  "ที่ดิน|บ้าน|เช่า|ขับไล่|ครอบครอง": "**คดีที่ดินและอสังหาริมทรัพย์**\n\n**ครอบครองปรปักษ์ (มาตรา 1382):**\n- ครอบครองโดยสงบ เปิดเผย 10 ปี → ได้กรรมสิทธิ์\n\n**สัญญาเช่า:**\n- เช่าเกิน 3 ปี ต้องจดทะเบียน\n- ผู้ให้เช่าต้องบอกเลิกล่วงหน้า\n\n**ฟ้องขับไล่:**\n- ผิดสัญญาเช่า → ฟ้องศาลแพ่ง",
  "ทำร้ายร่างกาย|ทำร้าย|ข่มขู่|คุกคาม": "**ทำร้ายร่างกาย** ป.อ. มาตรา 295\n\n**โทษ:** จำคุก ≤ 2 ปี ปรับ ≤ 40,000 บาท\n\n**ทำร้ายสาหัส (มาตรา 297):**\nจำคุก 6 เดือน - 10 ปี\n\n**ขั้นตอน:**\n1. ไปพบแพทย์ + ขอใบรับรองแพทย์\n2. แจ้งความที่สถานีตำรวจ\n3. ฟ้องคดีอาญา + เรียกค่าเสียหายทางแพ่ง",
  "หมิ่นประมาท|ด่า|เฟซบุ๊ก|โซเชียล|ไลน์": "**หมิ่นประมาท** ป.อ. มาตรา 326-328\n\n**หมิ่นประมาทธรรมดา (มาตรา 326):**\nจำคุก ≤ 1 ปี ปรับ ≤ 20,000 บาท\n\n**หมิ่นประมาทโดยการโฆษณา (มาตรา 328):**\nจำคุก ≤ 2 ปี ปรับ ≤ 200,000 บาท\n(รวมโพสต์ในโซเชียลมีเดีย)\n\n**+ พ.ร.บ.คอมพิวเตอร์ มาตรา 14** ถ้าเป็นออนไลน์\n\n**อายุความ:** 3 เดือน นับแต่รู้เรื่องและรู้ตัวผู้กระทำ",
  "ยาเสพติด|ยา|เสพ": "**คดียาเสพติด** พ.ร.บ.ยาเสพติดให้โทษ\n\n**เสพ:** จำคุก 1-3 ปี (ศาลอาจส่งบำบัดแทน)\n**ครอบครอง:** จำคุก 1-10 ปี\n**จำหน่าย:** จำคุก 5 ปี - ตลอดชีวิต\n\n**สิทธิผู้ต้องหา:**\n- มีทนายความ\n- ประกันตัวได้ (ยกเว้นคดีร้ายแรง)\n- ขอบำบัดแทนจำคุก (คดีเสพ)",
  "ประกันตัว|ปล่อยชั่วคราว|หลักทรัพย์": "**การประกันตัว** ป.วิ.อ. มาตรา 106-119\n\n**หลักทรัพย์ประกัน:**\n- เงินสด\n- โฉนดที่ดิน\n- สลากออมสิน/พันธบัตร\n- บุคคลค้ำประกัน\n\n**วงเงินประกัน (โดยประมาณ):**\n- คดีลหุโทษ: 10,000-50,000 บาท\n- คดีอาญาทั่วไป: 50,000-200,000 บาท\n- คดีร้ายแรง: 200,000+ บาท\n\nยื่นขอได้ที่ศาลหรือสถานีตำรวจ",
  "อายุความ": "**อายุความคดีสำคัญ**\n\n**คดีอาญา:**\n- ลหุโทษ: 1 ปี\n- จำคุก ≤ 1 ปี: 5 ปี\n- จำคุก 1-7 ปี: 10 ปี\n- จำคุก 7-20 ปี: 15 ปี\n- จำคุกตลอดชีวิต/ประหาร: 20 ปี\n\n**คดีแพ่ง:**\n- ละเมิด: 1 ปี\n- สัญญา: 10 ปี\n- ผู้บริโภค: 3 ปี\n- มรดก: 1 ปี",
  "ค่าธรรมเนียม|ค่าขึ้นศาล": "**ค่าธรรมเนียมศาล**\n\n**คดีแพ่ง:** 2% ของทุนทรัพย์ (ไม่เกิน 200,000 บาท)\n**คดีอาญา:** ไม่เสียค่าธรรมเนียม\n**คดีผู้บริโภค:** ไม่เสียค่าธรรมเนียม\n**คดีแรงงาน:** ไม่เสียค่าธรรมเนียม\n**คดีปกครอง:** 2% ของทุนทรัพย์\n\n**ค่าทนายความ:** ตามตกลง (ไม่มีอัตราบังคับ)",
  "สวัสดี|หวัดดี|ดี|hello|hi": "สวัสดีครับ! 🙏 ผม **น้องซื่อสัตย์** ผู้ช่วย AI ด้านกฎหมายไทย\n\nถามผมได้เลยครับ เช่น:\n- ถูกโกงเงินต้องทำอย่างไร?\n- ค่าปรับจราจรเท่าไหร่?\n- เลิกจ้างไม่เป็นธรรม มีสิทธิอะไร?\n- ฟ้องหย่าต้องเตรียมอะไร?\n- อายุความคดีต่างๆ\n\nหรือกดเลือกหัวข้อด้านบนได้เลย",
  "ขอบคุณ|ขอบใจ|thanks": "ยินดีครับ! 🙏 หากมีคำถามเพิ่มเติม ถามได้ตลอดเลยนะครับ\n\nน้องซื่อสัตย์พร้อมช่วยเสมอ ⚖️",
};

const findAnswer = (query: string): string => {
  const q = query.toLowerCase();
  for (const [keys, answer] of Object.entries(KNOWLEDGE)) {
    if (keys.split("|").some(k => q.includes(k))) {
      return answer + "\n\n⚖️ ข้อมูลเบื้องต้นเท่านั้น กรุณาปรึกษาทนายความสำหรับกรณีจริง";
    }
  }
  return `ขอบคุณสำหรับคำถามครับ 🙏\n\nลองถามเกี่ยวกับ:\n- ถูกโกงเงิน / โกงออนไลน์\n- ค่าปรับจราจร\n- เลิกจ้างไม่เป็นธรรม\n- ฟ้องหย่า\n- ฟ้องหน่วยงานรัฐ\n- ยื่นฟ้อง e-Filing\n\n⚖️ ข้อมูลเบื้องต้นเท่านั้น กรุณาปรึกษาทนายความสำหรับกรณีจริง`;
};

const LegalChatbot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyDone, setSurveyDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);
  const backendStatus = useBackendStatus();
  const memoryStats = memory.getStats();

  useEffect(() => { if (scrollRef.current) { scrollRef.current.scrollTop = scrollRef.current.scrollHeight; } }, [messages, isLoading]);
  useEffect(() => { const h = () => setOpen(true); window.addEventListener("open-legal-chat", h); return () => window.removeEventListener("open-legal-chat", h); }, []);
  useEffect(() => { if (messages.filter(m => m.role === "assistant").length >= 3 && !surveyDone) setShowSurvey(true); }, [messages, surveyDone]);
  useEffect(() => {
    const saved = loadWorkspace<{ messages: Msg[]; surveyDone: boolean }>(CHAT_WORKSPACE_STORAGE_KEY);
    if (!saved) return;
    setMessages(saved.messages ?? []);
    setSurveyDone(Boolean(saved.surveyDone));
    hydratedRef.current = true;
  }, []);
  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    saveWorkspace(CHAT_WORKSPACE_STORAGE_KEY, { messages: messages.slice(-12), surveyDone });
  }, [messages, surveyDone]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setInput("");
    setIsLoading(true);
    memory.write("working", `[chat] ${msg}`, { concept: "citizen_chat", importance: 0.7 });

    const allMsgs = [...messages, { role: "user" as const, content: msg }];
    let reply = "";

    // Try backend API (keys are server-side only)
    try {
      const data = await apiClient.chat(allMsgs, "citizen");
      reply = data.content || "";
    } catch { /* fallback to local knowledge */ }

    // Fallback to built-in knowledge base
    if (!reply) {
      await new Promise(r => setTimeout(r, 400));
      reply = findAnswer(msg);
    }

    memory.write("episodic", `Chat question: ${msg.slice(0, 90)}`, { concept: "chat_turn", importance: 0.65 });
    memory.write("episodic", `Chat answer: ${reply.slice(0, 120)}`, { concept: "chat_response", importance: 0.55 });
    if (allMsgs.length >= 4) {
      memory.summarizeToL5(
        `Citizen chat session | latest question="${msg.slice(0, 80)}" | turns=${allMsgs.length + 1}`,
        "citizen_chat_session",
      );
    }
    setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    setIsLoading(false);
  };

  const handleSurvey = (rating: number) => {
    setSurveyDone(true); setShowSurvey(false);
    setMessages(prev => [...prev, { role: "assistant", content: `ขอบคุณสำหรับคะแนน ${rating}/5 ครับ! 🙏` }]);
  };

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!open && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            className="fixed bottom-3 right-3 z-40 flex flex-col items-center gap-0 cursor-pointer group" onClick={() => setOpen(true)}>
            <motion.div initial={{ opacity: 0, y: 10 }} className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg mb-1 max-w-[160px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <p className="text-[10px] font-medium">สวัสดีครับ! 🙏</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">กดคุยกับน้องซื่อสัตย์ได้เลย</p>
            </motion.div>
            <BotAvatar size="w-16 h-16" />
            <span className="bg-navy-deep text-white text-[8px] font-black tracking-wider uppercase px-3 py-1 rounded-full shadow-xl -mt-1 relative z-10 border border-white/10">น้องซื่อสัตย์ AI</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-6rem)] bg-card border border-border/60 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden">
            {/* Header — Clean & Trustworthy */}
            <div className="relative overflow-hidden">
              {/* Background Image with Overlay */}
              <div className="absolute inset-0 z-0">
                <img 
                  src={chatbotHeaderBg} 
                  alt="" 
                  className="w-full h-full object-cover opacity-50"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-navy-deep/95 via-navy-deep/85 to-primary/60" />
              </div>
              
              <div className="relative p-4 flex items-center gap-3 z-10">
                <div className="relative flex-shrink-0">
                  <BotAvatar size="w-12 h-12" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 border-2 border-navy-deep rounded-full z-20" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-white text-base tracking-tight">น้องซื่อสัตย์</span>
                    <span className="text-[9px] bg-gold/90 text-navy-deep font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">AI</span>
                  </div>
                  <p className="text-[11px] text-white/70 mt-0.5">ผู้ช่วยกฎหมายไทย • Smart LegalGuard</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className={`text-[9px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-full ${backendStatus.online ? "bg-green-500/20 text-green-300 border border-green-400/20" : "bg-red-500/20 text-red-300 border border-red-400/20"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${backendStatus.online ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
                      {backendStatus.online ? "RAG พร้อมใช้งาน" : "โหมดออฟไลน์"}
                    </span>
                    <span className="text-[9px] text-white/50 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                      <ShieldCheck className="w-3 h-3" /> Anti-Hallucination 7 ชั้น
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setOpen(false)} 
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white/80 hover:text-white" 
                  aria-label="ปิดแชท"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Area — Refresh to Bright & Friendly */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#F8FAFC]">
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative inline-block mb-6"
                  >
                     <div className="absolute inset-0 bg-gold/10 rounded-full blur-2xl animate-pulse" />
                     <BotAvatar size="w-24 h-24 mx-auto relative z-10" />
                  </motion.div>
                  <h3 className="text-xl font-black mb-2 text-navy-deep tracking-tight">สวัสดีครับ! ผม "น้องซื่อสัตย์" 🙏</h3>
                  <p className="text-sm text-slate-500 mb-8 max-w-[280px] mx-auto leading-relaxed">ผมเป็น AI ผู้ช่วยกฎหมายไทย<br/>ยินดีให้ข้อมูลและข้อแนะนำเบื้องต้นครับ</p>
                  <div className="mb-5 flex flex-wrap items-center justify-center gap-2 text-[11px]">
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${backendStatus.online ? "bg-teal/10 text-teal" : "bg-accent/10 text-accent-foreground"}`}>
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {backendStatus.online ? "Connected to backend" : "Local guidance mode"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-500">
                      <Database className="h-3.5 w-3.5" />
                      Workspace memory active
                    </span>
                  </div>
                  {!backendStatus.online && (
                    <p className="mt-2 text-[11px] text-slate-500">
                      โหมดนี้ใช้คำตอบสำรองในเครื่องเพื่อสาธิตประสบการณ์ใช้งาน ไม่ใช่ผลจาก retrieval backend แบบเต็มรูป
                    </p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {QUICK_ACTIONS.map((a, idx) => (
                      <motion.button 
                        key={a.label} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => sendMessage(a.label)}
                        className="bg-white hover:bg-gold/5 border border-slate-200 hover:border-gold/30 rounded-2xl p-4 text-left transition-all duration-300 group shadow-sm hover:shadow-md hover:-translate-y-0.5"
                      >
                        <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">{a.emoji}</span>
                        <p className="text-[11px] font-black leading-tight text-navy-deep group-hover:text-primary mb-1 uppercase tracking-tight">{a.label}</p>
                        <span className="text-[9px] uppercase tracking-[0.1em] text-slate-400 font-black">{a.category}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && <BotAvatarSmall />}
                  <div className={`max-w-[85%] rounded-3xl px-5 py-3.5 text-[13px] leading-relaxed shadow-sm transition-all ${
                    msg.role === "user" 
                      ? "bg-navy-deep text-white rounded-br-lg shadow-navy-deep/20 font-medium" 
                      : "bg-white border border-slate-200 text-slate-700 rounded-bl-lg shadow-slate-200/50"
                  }`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none text-slate-700 [&_strong]:text-primary [&_strong]:font-black [&_strong]:underline [&_strong]:decoration-gold/30">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-9 h-9 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                       <User className="w-4 h-4 text-gold font-bold" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3"><BotAvatarSmall />
                  <div className="bg-white border border-slate-100 rounded-3xl px-5 py-4 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              {showSurvey && !surveyDone && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-accent/10 border border-accent/20 rounded-xl p-3">
                  <p className="text-xs font-medium text-center mb-2">น้องซื่อสัตย์ช่วยได้ดีแค่ไหน?</p>
                  <div className="flex justify-center gap-1">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => handleSurvey(n)} className="w-10 h-10 rounded-lg bg-card border border-border hover:border-accent hover:bg-accent/10 transition-colors flex items-center justify-center text-lg">
                        {["😞","😐","🙂","😊","🤩"][n-1]}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Quick chips */}
            {messages.length > 0 && messages.length < 6 && !isLoading && (
              <div className="px-3 pb-1 flex gap-1.5 overflow-x-auto">
                {["ขั้นตอนฟ้องคดี?","ค่าธรรมเนียมศาล?","ปรึกษาทนาย"].map(c => (
                  <button key={c} onClick={() => sendMessage(c)} className="text-xs bg-muted border border-border text-muted-foreground px-3 py-2 rounded-full whitespace-nowrap hover:bg-secondary hover:text-foreground transition-colors">{c}</button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-border/60 bg-gradient-to-t from-white to-transparent">
              <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex items-center gap-2">
                <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="พิมพ์คำถามของคุณ..."
                  className="flex-1 bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                <button type="submit" disabled={!input.trim() || isLoading}
                  className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-navy-deep transition-all disabled:opacity-50 shadow-sm hover:shadow-md"><Send className="w-4 h-4" /></button>
              </form>
              <p className="text-xs text-muted-foreground mt-1.5 text-center">⚖️ ข้อมูลเบื้องต้น กรุณาปรึกษาทนายความสำหรับกรณีจริง</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LegalChatbot;
