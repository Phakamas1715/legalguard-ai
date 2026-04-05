import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  FileText, Search, Loader2, Copy, CheckCircle2, ChevronDown, ChevronUp, Sparkles
} from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:8000") + "/api/v1";

interface PromptTemplate {
  id: string;
  name: string;
  name_en: string;
  category: string;
  target_role: string;
  description: string;
}

interface TemplateDetail {
  id: string;
  name: string;
  name_en: string;
  category: string;
  target_role: string;
  description: string;
  template: string;
  variables: string[];
  disclaimer: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  case_summary: "สรุปคดี",
  evidence_analysis: "วิเคราะห์พยานหลักฐาน",
  witness_exam: "ซักถามพยาน",
  admin: "งานธุรการ",
};

const ROLE_LABELS: Record<string, string> = {
  judge: "ผู้พิพากษา",
  admin_judge: "ตุลาการศาลปกครอง",
  lawyer: "ทนายความ",
  government: "เจ้าหน้าที่",
  all: "ทุกบทบาท",
};

const MOCK_TEMPLATES: PromptTemplate[] = [
  { id: "case_summary_1", name: "สรุปข้อเท็จจริงคดี", name_en: "Case Facts Summary", category: "case_summary", target_role: "judge", description: "สรุปข้อเท็จจริงสำคัญจากคำฟ้อง คำให้การ และพยานหลักฐาน" },
  { id: "case_summary_2", name: "สรุปประเด็นข้อพิพาท", name_en: "Dispute Issues Summary", category: "case_summary", target_role: "judge", description: "ระบุประเด็นข้อพิพาทหลักและข้อกฎหมายที่เกี่ยวข้อง" },
  { id: "evidence_1", name: "วิเคราะห์น้ำหนักพยานหลักฐาน", name_en: "Evidence Weight Analysis", category: "evidence_analysis", target_role: "judge", description: "ประเมินน้ำหนักพยานหลักฐานแต่ละชิ้น" },
  { id: "evidence_2", name: "ตรวจสอบความสอดคล้องพยาน", name_en: "Witness Consistency Check", category: "evidence_analysis", target_role: "lawyer", description: "เปรียบเทียบคำให้การพยานแต่ละปากว่าสอดคล้องกันหรือไม่" },
  { id: "witness_1", name: "เตรียมคำถามซักค้าน", name_en: "Cross-Examination Prep", category: "witness_exam", target_role: "lawyer", description: "เตรียมคำถามซักค้านจากข้อเท็จจริงและพยานหลักฐาน" },
  { id: "witness_2", name: "สรุปคำเบิกความ", name_en: "Testimony Summary", category: "witness_exam", target_role: "judge", description: "สรุปสาระสำคัญจากคำเบิกความพยาน" },
  { id: "admin_1", name: "ร่างหนังสือนัดความ", name_en: "Court Summons Draft", category: "admin", target_role: "government", description: "ร่างหนังสือนัดความตามแบบฟอร์มศาล" },
  { id: "admin_2", name: "ร่างรายงานกระบวนพิจารณา", name_en: "Proceedings Report", category: "admin", target_role: "government", description: "ร่างรายงานกระบวนพิจารณาคดี" },
  { id: "case_summary_3", name: "เปรียบเทียบแนวฎีกา", name_en: "Precedent Comparison", category: "case_summary", target_role: "all", description: "เปรียบเทียบข้อเท็จจริงกับแนวคำพิพากษาฎีกาที่คล้ายกัน" },
  { id: "admin_3", name: "ร่างคำสั่งศาล", name_en: "Court Order Draft", category: "admin", target_role: "judge", description: "ร่างคำสั่งศาลตามประเภทคำร้อง" },
];

const MOCK_DETAILS: Record<string, TemplateDetail> = {
  case_summary_1: {
    id: "case_summary_1", name: "สรุปข้อเท็จจริงคดี", name_en: "Case Facts Summary", category: "case_summary", target_role: "judge",
    description: "สรุปข้อเท็จจริงสำคัญจากคำฟ้อง คำให้การ และพยานหลักฐาน",
    template: "จากข้อเท็จจริงในสำนวนคดีต่อไปนี้:\n\n{case_facts}\n\nกรุณาสรุปข้อเท็จจริงสำคัญ โดยแบ่งเป็น:\n1. ข้อเท็จจริงที่คู่ความรับกัน\n2. ข้อเท็จจริงที่เป็นประเด็นข้อพิพาท\n3. พยานหลักฐานสำคัญ\n\nอ้างอิงมาตรากฎหมายที่เกี่ยวข้อง",
    variables: ["case_facts"],
    disclaimer: "ร่างเบื้องต้นจาก AI — ต้องตรวจสอบโดยตุลาการก่อนใช้จริง",
  },
  case_summary_2: {
    id: "case_summary_2", name: "สรุปประเด็นข้อพิพาท", name_en: "Dispute Issues Summary", category: "case_summary", target_role: "judge",
    description: "ระบุประเด็นข้อพิพาทหลักและข้อกฎหมายที่เกี่ยวข้อง",
    template: "จากคำฟ้องและคำให้การในคดี:\n\nคำฟ้อง: {plaintiff_claim}\nคำให้การ: {defendant_answer}\n\nกรุณาระบุ:\n1. ประเด็นข้อพิพาทหลัก\n2. ข้อกฎหมายที่เกี่ยวข้อง\n3. ภาระการพิสูจน์ของแต่ละฝ่าย",
    variables: ["plaintiff_claim", "defendant_answer"],
    disclaimer: "ร่างเบื้องต้นจาก AI — ต้องตรวจสอบโดยตุลาการก่อนใช้จริง",
  },
  evidence_1: {
    id: "evidence_1", name: "วิเคราะห์น้ำหนักพยานหลักฐาน", name_en: "Evidence Weight Analysis", category: "evidence_analysis", target_role: "judge",
    description: "ประเมินน้ำหนักพยานหลักฐานแต่ละชิ้น",
    template: "พยานหลักฐานในคดี:\n\n{evidence_list}\n\nกรุณาวิเคราะห์น้ำหนักพยานหลักฐานแต่ละชิ้น:\n1. ความน่าเชื่อถือ\n2. ความเกี่ยวข้องกับประเด็น\n3. ข้อจำกัดหรือจุดอ่อน\n\nอ้างอิง ป.วิ.แพ่ง / ป.วิ.อาญา ที่เกี่ยวข้อง",
    variables: ["evidence_list"],
    disclaimer: "ร่างเบื้องต้นจาก AI — ต้องตรวจสอบโดยตุลาการก่อนใช้จริง",
  },
  evidence_2: {
    id: "evidence_2", name: "ตรวจสอบความสอดคล้องพยาน", name_en: "Witness Consistency Check", category: "evidence_analysis", target_role: "lawyer",
    description: "เปรียบเทียบคำให้การพยานแต่ละปากว่าสอดคล้องกันหรือไม่",
    template: "คำเบิกความพยาน:\n\nพยานปากที่ 1: {witness_1}\nพยานปากที่ 2: {witness_2}\n\nกรุณาเปรียบเทียบ:\n1. จุดที่สอดคล้องกัน\n2. จุดที่ขัดแย้งกัน\n3. ข้อสังเกตสำคัญ",
    variables: ["witness_1", "witness_2"],
    disclaimer: "ร่างเบื้องต้นจาก AI — ทนายความต้องตรวจสอบก่อนใช้จริง",
  },
  witness_1: {
    id: "witness_1", name: "เตรียมคำถามซักค้าน", name_en: "Cross-Examination Prep", category: "witness_exam", target_role: "lawyer",
    description: "เตรียมคำถามซักค้านจากข้อเท็จจริงและพยานหลักฐาน",
    template: "ข้อเท็จจริงคดี: {case_facts}\nคำเบิกความพยาน: {testimony}\n\nกรุณาเตรียมคำถามซักค้าน:\n1. คำถามเพื่อทดสอบความน่าเชื่อถือ\n2. คำถามเพื่อชี้ให้เห็นข้อขัดแย้ง\n3. คำถามเพื่อสนับสนุนข้อต่อสู้ของฝ่ายเรา",
    variables: ["case_facts", "testimony"],
    disclaimer: "ร่างเบื้องต้นจาก AI — ทนายความต้องตรวจสอบก่อนใช้จริง",
  },
  witness_2: {
    id: "witness_2", name: "สรุปคำเบิกความ", name_en: "Testimony Summary", category: "witness_exam", target_role: "judge",
    description: "สรุปสาระสำคัญจากคำเบิกความพยาน",
    template: "คำเบิกความพยาน:\n\n{testimony}\n\nกรุณาสรุป:\n1. สาระสำคัญของคำเบิกความ\n2. ข้อเท็จจริงที่พยานยืนยัน\n3. ข้อที่ถูกซักค้านและคำตอบ",
    variables: ["testimony"],
    disclaimer: "ร่างเบื้องต้นจาก AI — ต้องตรวจสอบโดยตุลาการก่อนใช้จริง",
  },
  admin_1: {
    id: "admin_1", name: "ร่างหนังสือนัดความ", name_en: "Court Summons Draft", category: "admin", target_role: "government",
    description: "ร่างหนังสือนัดความตามแบบฟอร์มศาล",
    template: "ข้อมูลคดี:\nเลขคดี: {case_number}\nคู่ความ: {parties}\nวันนัด: {hearing_date}\nเรื่องที่นัด: {hearing_type}\n\nกรุณาร่างหนังสือนัดความตามแบบฟอร์มศาล",
    variables: ["case_number", "parties", "hearing_date", "hearing_type"],
    disclaimer: "ร่างเบื้องต้นจาก AI — เจ้าหน้าที่ต้องตรวจสอบก่อนใช้จริง",
  },
  admin_2: {
    id: "admin_2", name: "ร่างรายงานกระบวนพิจารณา", name_en: "Proceedings Report", category: "admin", target_role: "government",
    description: "ร่างรายงานกระบวนพิจารณาคดี",
    template: "ข้อมูลการพิจารณา:\nเลขคดี: {case_number}\nวันที่: {date}\nผู้พิพากษา: {judge}\nสิ่งที่ดำเนินการ: {proceedings}\n\nกรุณาร่างรายงานกระบวนพิจารณา",
    variables: ["case_number", "date", "judge", "proceedings"],
    disclaimer: "ร่างเบื้องต้นจาก AI — เจ้าหน้าที่ต้องตรวจสอบก่อนใช้จริง",
  },
  case_summary_3: {
    id: "case_summary_3", name: "เปรียบเทียบแนวฎีกา", name_en: "Precedent Comparison", category: "case_summary", target_role: "all",
    description: "เปรียบเทียบข้อเท็จจริงกับแนวคำพิพากษาฎีกาที่คล้ายกัน",
    template: "ข้อเท็จจริงคดีปัจจุบัน:\n{current_facts}\n\nกรุณา:\n1. ค้นหาแนวคำพิพากษาฎีกาที่มีข้อเท็จจริงคล้ายกัน\n2. เปรียบเทียบข้อเท็จจริงที่เหมือนและต่างกัน\n3. วิเคราะห์แนวโน้มคำพิพากษา\n4. อ้างอิงเลขฎีกาและมาตรากฎหมาย",
    variables: ["current_facts"],
    disclaimer: "ร่างเบื้องต้นจาก AI — ต้องตรวจสอบก่อนใช้จริง",
  },
  admin_3: {
    id: "admin_3", name: "ร่างคำสั่งศาล", name_en: "Court Order Draft", category: "admin", target_role: "judge",
    description: "ร่างคำสั่งศาลตามประเภทคำร้อง",
    template: "ข้อมูลคำร้อง:\nเลขคดี: {case_number}\nประเภทคำร้อง: {motion_type}\nเหตุผล: {reason}\n\nกรุณาร่างคำสั่งศาลตามประเภทคำร้อง อ้างอิงมาตรากฎหมายที่เกี่ยวข้อง",
    variables: ["case_number", "motion_type", "reason"],
    disclaimer: "ร่างเบื้องต้นจาก AI — ต้องตรวจสอบโดยตุลาการก่อนใช้จริง",
  },
};

const PromptsPage = () => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TemplateDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rendered, setRendered] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadTemplates(); }, [filterCategory, filterRole]);

  const loadTemplates = async () => {
    setLoading(true);
    const mockFiltered = MOCK_TEMPLATES.filter(t =>
      (!filterCategory || t.category === filterCategory) && (!filterRole || t.target_role === filterRole || t.target_role === "all")
    );
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set("category", filterCategory);
      if (filterRole) params.set("role", filterRole);
      const resp = await fetch(`${API_BASE}/prompts/templates?${params}`);
      if (!resp.ok) throw new Error("not ok");
      const data = await resp.json();
      const fetched = data.templates ?? [];
      setTemplates(fetched.length > 0 ? fetched : mockFiltered);
    } catch {
      setTemplates(mockFiltered);
    }
    setLoading(false);
  };

  const loadDetail = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    setDetailLoading(true);
    setDetail(null);
    setRendered("");
    setVariables({});
    try {
      const resp = await fetch(`${API_BASE}/prompts/templates/${id}`);
      if (!resp.ok) throw new Error("not ok");
      const data = await resp.json();
      if (data.error || !data.template) throw new Error("no template");
      setDetail(data);
      const vars: Record<string, string> = {};
      (data.variables ?? []).forEach((v: string) => { vars[v] = ""; });
      setVariables(vars);
    } catch {
      // Fallback to mock detail
      const mock = MOCK_DETAILS[id];
      if (mock) {
        setDetail(mock);
        const vars: Record<string, string> = {};
        mock.variables.forEach((v) => { vars[v] = ""; });
        setVariables(vars);
      }
    }
    setDetailLoading(false);
  };

  const renderTemplate = async () => {
    if (!detail) return;
    try {
      const resp = await fetch(`${API_BASE}/prompts/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: detail.id, variables }),
      });
      if (!resp.ok) throw new Error("not ok");
      const data = await resp.json();
      setRendered(data.rendered_prompt ?? "");
    } catch {
      // Local fallback: simple variable replacement
      let text = detail.template;
      for (const [key, val] of Object.entries(variables)) {
        text = text.replaceAll(`{${key}}`, val || `[${key}]`);
      }
      setRendered(text);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-teal/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-teal" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Prompt Templates</h1>
            <p className="text-muted-foreground">ตัวอย่าง Prompt สำหรับงานสนับสนุนศาลไทย</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none">
            <option value="">ทุกหมวด</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
            className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none">
            <option value="">ทุกบทบาท</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <span className="text-sm text-muted-foreground self-center">{templates.length} templates</span>
        </div>

        {loading ? (
          <div className="text-center py-16"><Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-3 max-w-4xl">
            {templates.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                <button onClick={() => loadDetail(t.id)}
                  className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{t.name}</span>
                        <span className="text-[11px] text-muted-foreground">({t.name_en})</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-[11px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{CATEGORY_LABELS[t.category] ?? t.category}</span>
                        <span className="text-[11px] bg-muted px-1.5 py-0.5 rounded">{ROLE_LABELS[t.target_role] ?? t.target_role}</span>
                      </div>
                    </div>
                    {expandedId === t.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {expandedId === t.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    className="bg-card border border-t-0 border-border rounded-b-xl p-4 -mt-1">
                    {detailLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
                    ) : detail ? (
                      <div className="space-y-4">
                        <div className="bg-muted rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium">Prompt Template</span>
                            <button onClick={() => copyToClipboard(detail.template)} className="text-xs text-primary hover:underline flex items-center gap-1">
                              {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {copied ? "คัดลอกแล้ว" : "คัดลอก"}
                            </button>
                          </div>
                          <pre className="text-xs whitespace-pre-wrap text-muted-foreground">{detail.template}</pre>
                        </div>
                        {detail.variables.length > 0 && (
                          <div>
                            <p className="text-xs font-medium mb-2">ตัวแปร</p>
                            <div className="grid grid-cols-2 gap-2">
                              {detail.variables.map(v => (
                                <input key={v} type="text" placeholder={v}
                                  value={variables[v] ?? ""} onChange={(e) => setVariables(prev => ({ ...prev, [v]: e.target.value }))}
                                  className="bg-white border border-border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-primary focus:outline-none" />
                              ))}
                            </div>
                            <button onClick={renderTemplate}
                              className="mt-3 bg-teal text-white px-4 py-2 rounded-lg text-xs font-medium hover:opacity-90 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" /> Render
                            </button>
                          </div>
                        )}
                        {rendered && (
                          <div className="bg-teal/5 border border-teal/20 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-teal">Rendered Prompt</span>
                              <button onClick={() => copyToClipboard(rendered)} className="text-xs text-teal hover:underline flex items-center gap-1">
                                <Copy className="w-3.5 h-3.5" /> คัดลอก
                              </button>
                            </div>
                            <pre className="text-xs whitespace-pre-wrap">{rendered}</pre>
                          </div>
                        )}
                        {detail.disclaimer && (
                          <p className="text-[11px] text-muted-foreground bg-muted rounded-lg p-2">⚠️ {detail.disclaimer}</p>
                        )}
                      </div>
                    ) : null}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default PromptsPage;
