import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Send, CheckCircle2, AlertCircle, Scale, User, MapPin, Gavel,
  Loader2, Sparkles, Download, ArrowLeft, ArrowRight, AlertTriangle
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const CASE_TYPES = [
  { value: "civil", label: "คดีแพ่ง", desc: "สัญญา ละเมิด หนี้สิน มรดก" },
  { value: "criminal", label: "คดีอาญา", desc: "ฉ้อโกง ลักทรัพย์ ทำร้ายร่างกาย" },
  { value: "administrative", label: "คดีปกครอง", desc: "ฟ้องหน่วยงานรัฐ เพิกถอนคำสั่ง" },
  { value: "consumer", label: "คดีผู้บริโภค", desc: "สินค้าชำรุด บริการไม่ตรงสัญญา" },
  { value: "labor", label: "คดีแรงงาน", desc: "เลิกจ้าง ค่าจ้าง สวัสดิการ" },
  { value: "family", label: "คดีครอบครัว", desc: "หย่า อำนาจปกครองบุตร" },
];

const COURTS = [
  { value: "civil_court", label: "ศาลแพ่ง", desc: "คดีแพ่งทั่วไป สัญญา ละเมิด หนี้สิน" },
  { value: "criminal_court", label: "ศาลอาญา", desc: "คดีอาญาทั่วไป ฉ้อโกง ลักทรัพย์" },
  { value: "admin_court", label: "ศาลปกครองกลาง", desc: "ฟ้องหน่วยงานรัฐ เพิกถอนคำสั่ง" },
  { value: "consumer_court", label: "ศาลแขวง (คดีผู้บริโภค)", desc: "สินค้าชำรุด บริการไม่ตรงสัญญา" },
  { value: "labor_court", label: "ศาลแรงงานกลาง", desc: "เลิกจ้าง ค่าจ้าง สวัสดิการ" },
  { value: "family_court", label: "ศาลเยาวชนและครอบครัว", desc: "หย่า อำนาจปกครองบุตร" },
  { value: "provincial_court", label: "ศาลจังหวัด", desc: "คดีทั่วไปในต่างจังหวัด" },
];

// Mapping: ประเภทคดี → ศาลหลัก (primary) + ศาลทางเลือก
const CASE_COURT_MAP: Record<string, { primary: string; courts: string[]; hint: string }> = {
  civil: {
    primary: "civil_court",
    courts: ["civil_court", "provincial_court"],
    hint: "คดีแพ่ง → ยื่นศาลแพ่ง (กรุงเทพฯ) หรือศาลจังหวัด (ต่างจังหวัด)",
  },
  criminal: {
    primary: "criminal_court",
    courts: ["criminal_court", "provincial_court"],
    hint: "คดีอาญา → ยื่นศาลอาญา (กรุงเทพฯ) หรือศาลจังหวัด (ต่างจังหวัด)",
  },
  administrative: {
    primary: "admin_court",
    courts: ["admin_court"],
    hint: "คดีปกครอง → ยื่นศาลปกครองกลาง หรือศาลปกครองภูมิภาค",
  },
  consumer: {
    primary: "consumer_court",
    courts: ["consumer_court", "provincial_court"],
    hint: "คดีผู้บริโภค → ยื่นศาลแขวง (ไม่ต้องมีทนาย ไม่เสียค่าธรรมเนียม)",
  },
  labor: {
    primary: "labor_court",
    courts: ["labor_court"],
    hint: "คดีแรงงาน → ยื่นศาลแรงงานกลาง (ไม่เสียค่าธรรมเนียม)",
  },
  family: {
    primary: "family_court",
    courts: ["family_court", "provincial_court"],
    hint: "คดีครอบครัว → ยื่นศาลเยาวชนและครอบครัว",
  },
};

const EXAMPLE_COMPLAINTS = [
  {
    label: "ฉ้อโกงออนไลน์",
    icon: "🛒",
    plaintiff: "นายสมชาย ใจดี",
    defendant: "นางสาวมาลี ขายดี",
    location: "เขตบางกะปิ กรุงเทพมหานคร",
    description: "ผู้ถูกฟ้องลงประกาศขายกระเป๋าแบรนด์เนมในเว็บไซต์ราคา 25,000 บาท ผู้ฟ้องโอนเงินผ่านบัญชีธนาคารกรุงไทย เมื่อวันที่ 10 มกราคม 2568 แต่ผู้ถูกฟ้องไม่ส่งสินค้าและบล็อกการติดต่อทุกช่องทาง ผู้ฟ้องมีหลักฐานสลิปโอนเงิน แชทสนทนา และภาพหน้าจอประกาศขาย",
  },
  {
    label: "กู้ยืมเงินไม่คืน",
    icon: "💰",
    plaintiff: "นางวิภา รักษ์เงิน",
    defendant: "นายประเสริฐ ยืมดี",
    location: "อำเภอเมือง จังหวัดเชียงใหม่",
    description: "ผู้ถูกฟ้องกู้ยืมเงินจากผู้ฟ้องจำนวน 300,000 บาท ทำสัญญากู้ยืมเงินลงวันที่ 15 มีนาคม 2567 กำหนดชำระคืนภายใน 1 ปี พร้อมดอกเบี้ยร้อยละ 7.5 ต่อปี ครบกำหนดแล้วผู้ถูกฟ้องไม่ชำระ ผู้ฟ้องทวงถามเป็นหนังสือ 3 ครั้ง ผู้ถูกฟ้องเพิกเฉย มีสัญญากู้ยืมเงินและหนังสือทวงถามเป็นหลักฐาน",
  },
  {
    label: "เลิกจ้างไม่เป็นธรรม",
    icon: "💼",
    plaintiff: "นายอนุชา ทำงานดี",
    defendant: "บริษัท เอบีซี จำกัด",
    location: "เขตสาทร กรุงเทพมหานคร",
    description: "ผู้ฟ้องทำงานเป็นพนักงานบริษัทผู้ถูกฟ้องมา 8 ปี ตำแหน่งหัวหน้าแผนกบัญชี เงินเดือน 45,000 บาท ผู้ถูกฟ้องเลิกจ้างเมื่อวันที่ 1 กุมภาพันธ์ 2568 โดยอ้างว่าปรับโครงสร้างองค์กร แต่ภายหลังรับพนักงานใหม่ตำแหน่งเดียวกัน ผู้ฟ้องไม่ได้รับค่าชดเชยตาม พ.ร.บ.คุ้มครองแรงงาน มาตรา 118 และไม่ได้รับค่าบอกกล่าวล่วงหน้า",
  },
  {
    label: "สินค้าชำรุดบกพร่อง",
    icon: "📱",
    plaintiff: "นางสาวพิมพ์ใจ ซื้อดี",
    defendant: "บริษัท อิเล็กทรอนิกส์ไทย จำกัด",
    location: "เขตจตุจักร กรุงเทพมหานคร",
    description: "ผู้ฟ้องซื้อโทรศัพท์มือถือรุ่น X จากผู้ถูกฟ้องราคา 35,000 บาท เมื่อวันที่ 5 ธันวาคม 2567 ใช้งานได้เพียง 2 สัปดาห์ หน้าจอเกิดเส้นสีเขียวและแบตเตอรี่บวม ผู้ฟ้องนำไปเคลมภายในระยะประกัน แต่ผู้ถูกฟ้องปฏิเสธโดยอ้างว่าเป็นความเสียหายจากผู้ใช้ ทั้งที่ไม่มีรอยตกหรือเปียกน้ำ",
  },
  {
    label: "ฟ้องหย่า + แบ่งสินสมรส",
    icon: "👨‍👩‍👧",
    plaintiff: "นางสุดา รักจริง",
    defendant: "นายวิทยา รักจริง",
    location: "อำเภอเมือง จังหวัดนนทบุรี",
    description: "ผู้ฟ้องและผู้ถูกฟ้องจดทะเบียนสมรสเมื่อวันที่ 14 กุมภาพันธ์ 2560 มีบุตรร่วมกัน 1 คน อายุ 5 ปี ผู้ถูกฟ้องทิ้งร้างไม่อุปการะเลี้ยงดูครอบครัวมากกว่า 1 ปี และมีพฤติกรรมนอกใจ ผู้ฟ้องขอหย่า ขอเป็นผู้ใช้อำนาจปกครองบุตร และขอแบ่งสินสมรสคือบ้านและที่ดินที่ซื้อร่วมกัน",
  },
];

const ComplaintFormPage = () => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    caseType: string;
    court: string;
    statutes: string[];
    summary: string;
  } | null>(null);
  const [aiError, setAiError] = useState(false);
  const [formData, setFormData] = useState({
    plaintiff: "",
    defendant: "",
    location: "",
    caseType: "",
    court: "",
    description: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      // Auto-select primary court when case type changes
      if (field === "caseType" && value in CASE_COURT_MAP) {
        next.court = CASE_COURT_MAP[value].primary;
      }
      return next;
    });
  };

  const handleAnalyze = async () => {
    if (!formData.description) {
      toast.error("กรุณาระบุรายละเอียดเหตุการณ์");
      return;
    }
    setIsSubmitting(true);
    setAiError(false);
    setAiSuggestion(null);

    try {
      const data = await apiClient.search(formData.description, {}, "citizen", 5);

      if (data) {
        const results = data.results || [];
        const statutes = results.flatMap((r: Record<string, unknown>) => (r.statutes as string[]) || []).filter(Boolean);
        const uniqueStatutes = [...new Set(statutes)].slice(0, 5) as string[];

        // Simple heuristic for case type suggestion
        const text = formData.description.toLowerCase();
        let suggestedType = "civil";
        let suggestedCourt = "civil_court";
        if (text.includes("ฉ้อโกง") || text.includes("ลักทรัพย์") || text.includes("ทำร้าย") || text.includes("อาญา")) {
          suggestedType = "criminal"; suggestedCourt = "criminal_court";
        } else if (text.includes("หน่วยงานรัฐ") || text.includes("ปกครอง") || text.includes("คำสั่งทางปกครอง")) {
          suggestedType = "administrative"; suggestedCourt = "admin_court";
        } else if (text.includes("เลิกจ้าง") || text.includes("ค่าจ้าง") || text.includes("แรงงาน")) {
          suggestedType = "labor"; suggestedCourt = "labor_court";
        } else if (text.includes("สินค้า") || text.includes("ผู้บริโภค") || text.includes("ออนไลน์")) {
          suggestedType = "consumer"; suggestedCourt = "consumer_court";
        } else if (text.includes("หย่า") || text.includes("บุตร") || text.includes("ครอบครัว")) {
          suggestedType = "family"; suggestedCourt = "family_court";
        }

        setAiSuggestion({
          caseType: suggestedType,
          court: suggestedCourt,
          statutes: uniqueStatutes,
          summary: results[0]?.summary || "ระบบได้วิเคราะห์ข้อเท็จจริงเบื้องต้นแล้ว กรุณาตรวจสอบประเภทคดีและศาลที่แนะนำ",
        });
        setFormData(prev => ({ ...prev, caseType: suggestedType, court: suggestedCourt }));
      }
      setStep(2);
    } catch {
      setAiError(true);
      setStep(2);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepLabels = ["ข้อมูลเบื้องต้น", "ตรวจสอบ / เลือกประเภท", "ยืนยัน / ส่งออก"];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="font-heading text-3xl font-bold text-primary mb-3">ร่างคำฟ้องอัจฉริยะ</h1>
            <p className="text-muted-foreground">AI ช่วยตรวจสอบและแนะนำข้อกฎหมายเบื้องต้น</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center mb-12">
            <div className="flex items-center w-full max-w-lg">
              {stepLabels.map((label, i) => (
                <div key={i} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 text-sm font-bold transition-colors ${
                      step > i + 1 ? "bg-teal border-teal text-white" :
                      step === i + 1 ? "bg-primary border-primary text-primary-foreground" :
                      "border-muted text-muted-foreground"
                    }`}>
                      {step > i + 1 ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 text-center w-20">{label}</span>
                  </div>
                  {i < 2 && <div className={`flex-1 h-1 mx-2 rounded ${step > i + 1 ? "bg-teal" : "bg-muted"}`} />}
                </div>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: ข้อมูลเบื้องต้น */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card className="border-border shadow-card overflow-hidden">
                  <CardHeader className="bg-muted/30">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      ข้อมูลเบื้องต้น
                    </CardTitle>
                    <CardDescription>ระบุรายละเอียดเพื่อเริ่มต้นการร่างคำฟ้อง</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="plaintiff">ชื่อ-นามสกุล ผู้ฟ้อง</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                          <Input id="plaintiff" placeholder="ระบุชื่อผู้ฟ้อง" className="pl-10"
                            value={formData.plaintiff} onChange={(e) => handleInputChange("plaintiff", e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="defendant">ชื่อ-นามสกุล ผู้ถูกฟ้อง</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                          <Input id="defendant" placeholder="ระบุชื่อผู้ถูกฟ้อง" className="pl-10"
                            value={formData.defendant} onChange={(e) => handleInputChange("defendant", e.target.value)} />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">สถานที่เกิดเหตุ</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                        <Input id="location" placeholder="เช่น เขตหลักสี่ กรุงเทพมหานคร" className="pl-10"
                          value={formData.location} onChange={(e) => handleInputChange("location", e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">รายละเอียดเหตุการณ์</Label>
                      <Textarea id="description" placeholder="บรรยายข้อเท็จจริงที่เกิดขึ้น เช่น ถูกโกงเงินจากการซื้อของออนไลน์..."
                        className="min-h-[150px] resize-none"
                        value={formData.description} onChange={(e) => handleInputChange("description", e.target.value)} />
                    </div>
                    {/* Example complaints */}
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-2">💡 ตัวอย่างคำฟ้อง (กดเพื่อเติมอัตโนมัติ)</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {EXAMPLE_COMPLAINTS.map((ex) => (
                          <button key={ex.label} onClick={() => setFormData({
                            plaintiff: ex.plaintiff,
                            defendant: ex.defendant,
                            location: ex.location,
                            caseType: "",
                            court: "",
                            description: ex.description,
                          })}
                            className="p-2.5 bg-muted/50 border border-border rounded-xl hover:border-primary/30 transition-colors text-left group">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base">{ex.icon}</span>
                              <span className="text-xs font-medium text-primary group-hover:text-primary/80">{ex.label}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">{ex.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/10 border-t border-border flex justify-between p-6">
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <AlertCircle className="w-4 h-4" /> ข้อมูลส่วนบุคคลจะถูกปกปิดอัตโนมัติ
                    </p>
                    <Button onClick={handleAnalyze} disabled={isSubmitting}>
                      {isSubmitting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> กำลังวิเคราะห์...</>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-2" /> วิเคราะห์ด้วย AI</>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}

            {/* Step 2: ตรวจสอบ / เลือกประเภท */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                {/* AI error banner */}
                {aiError && (
                  <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-accent-foreground flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-accent-foreground">ระบบ AI ไม่สามารถวิเคราะห์ได้ในขณะนี้</p>
                      <p className="text-xs text-muted-foreground mt-1">กรุณาเลือกประเภทคดีและศาลด้วยตนเอง หรือลองใหม่อีกครั้ง</p>
                    </div>
                  </div>
                )}

                {/* AI suggestion */}
                {aiSuggestion && !aiError && (
                  <Card className="border-teal/30 bg-teal-light/30">
                    <CardContent className="pt-6">
                      <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-teal">
                        <Sparkles className="w-4 h-4" /> AI แนะนำ
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">{aiSuggestion.summary}</p>
                      {aiSuggestion.statutes.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {aiSuggestion.statutes.map(s => (
                            <span key={s} className="text-[10px] bg-teal/10 text-teal px-2 py-0.5 rounded-full">{s}</span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card className="border-border shadow-card overflow-hidden">
                  <CardHeader className="bg-muted/30">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Gavel className="w-5 h-5 text-primary" />
                      เลือกประเภทคดีและศาล
                    </CardTitle>
                    <CardDescription>
                      {aiSuggestion ? "ระบบแนะนำไว้แล้ว คุณสามารถเปลี่ยนได้" : "กรุณาเลือกประเภทคดีและศาลที่ต้องการยื่น"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    <div className="space-y-2">
                      <Label>ประเภทคดี</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {CASE_TYPES.map(ct => (
                          <button key={ct.value} onClick={() => handleInputChange("caseType", ct.value)}
                            className={`p-3 rounded-xl border text-left transition-colors ${
                              formData.caseType === ct.value
                                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                : "border-border hover:border-primary/30"
                            }`}>
                            <p className="text-sm font-medium">{ct.label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{ct.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>ศาลที่ยื่นฟ้อง</Label>
                      {formData.caseType && CASE_COURT_MAP[formData.caseType] && (
                        <div className="bg-teal/5 border border-teal/20 rounded-lg p-2.5 mb-2">
                          <p className="text-xs text-teal flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                            {CASE_COURT_MAP[formData.caseType].hint}
                          </p>
                        </div>
                      )}
                      <Select value={formData.court} onValueChange={(v) => handleInputChange("court", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกศาล" />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            const mapping = formData.caseType ? CASE_COURT_MAP[formData.caseType] : null;
                            const recommendedIds = mapping?.courts ?? [];
                            const recommended = COURTS.filter(c => recommendedIds.includes(c.value));
                            const others = COURTS.filter(c => !recommendedIds.includes(c.value));
                            return (
                              <>
                                {recommended.length > 0 && (
                                  <>
                                    <div className="px-2 py-1.5 text-[10px] font-medium text-teal">⭐ แนะนำสำหรับ{CASE_TYPES.find(ct => ct.value === formData.caseType)?.label ?? "คดีนี้"}</div>
                                    {recommended.map(c => (
                                      <SelectItem key={c.value} value={c.value}>
                                        {c.label} {c.value === mapping?.primary ? "✓" : ""}
                                      </SelectItem>
                                    ))}
                                  </>
                                )}
                                {others.length > 0 && (
                                  <>
                                    <div className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground border-t border-border mt-1">ศาลอื่น</div>
                                    {others.map(c => (
                                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                    ))}
                                  </>
                                )}
                                {recommendedIds.length === 0 && COURTS.map(c => (
                                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                              </>
                            );
                          })()}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Preview */}
                    <div className="p-4 bg-muted/30 rounded-xl border border-border">
                      <h4 className="text-xs text-muted-foreground mb-2">สรุปข้อมูล</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-muted-foreground">ผู้ฟ้อง:</span> <span className="font-medium">{formData.plaintiff || "—"}</span></div>
                        <div><span className="text-muted-foreground">ผู้ถูกฟ้อง:</span> <span className="font-medium">{formData.defendant || "—"}</span></div>
                        <div><span className="text-muted-foreground">สถานที่:</span> <span className="font-medium">{formData.location || "—"}</span></div>
                        <div><span className="text-muted-foreground">ประเภท:</span> <span className="font-medium">{CASE_TYPES.find(c => c.value === formData.caseType)?.label || "—"}</span></div>
                        <div className="col-span-2"><span className="text-muted-foreground">ศาล:</span> <span className="font-medium">{COURTS.find(c => c.value === formData.court)?.label || "—"}</span>
                          {formData.court && formData.caseType && CASE_COURT_MAP[formData.caseType]?.primary === formData.court && (
                            <span className="ml-1.5 text-[10px] bg-teal/10 text-teal px-1.5 py-0.5 rounded">แนะนำ</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> ย้อนกลับ
                    </Button>
                    <Button onClick={() => {
                      if (!formData.caseType) { toast.error("กรุณาเลือกประเภทคดี"); return; }
                      if (!formData.court) { toast.error("กรุณาเลือกศาล"); return; }
                      setStep(3);
                    }}>
                      ดำเนินการต่อ <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}

            {/* Step 3: ยืนยัน / ส่งออก */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <Card className="border-border shadow-card overflow-hidden">
                  <CardHeader className="bg-teal/5">
                    <CardTitle className="text-xl flex items-center gap-2 text-teal">
                      <CheckCircle2 className="w-6 h-6" />
                      พร้อมส่งออกคำฟ้อง
                    </CardTitle>
                    <CardDescription>ตรวจสอบข้อมูลแล้วเลือกรูปแบบการส่งออก</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-3">
                        <div><span className="text-muted-foreground">ผู้ฟ้อง:</span> {formData.plaintiff || "—"}</div>
                        <div><span className="text-muted-foreground">ผู้ถูกฟ้อง:</span> {formData.defendant || "—"}</div>
                        <div><span className="text-muted-foreground">ประเภทคดี:</span> {CASE_TYPES.find(c => c.value === formData.caseType)?.label}</div>
                        <div><span className="text-muted-foreground">ศาล:</span> {COURTS.find(c => c.value === formData.court)?.label}</div>
                      </div>
                      <div className="pt-2 border-t border-border">
                        <span className="text-muted-foreground">ข้อเท็จจริง:</span>
                        <p className="mt-1">{formData.description.slice(0, 200)}{formData.description.length > 200 ? "..." : ""}</p>
                      </div>
                    </div>

                    <div className="bg-accent/10 border border-accent/20 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-accent-foreground" />
                        เอกสารนี้เป็นร่างเบื้องต้นจาก AI กรุณาตรวจสอบกับทนายความก่อนยื่นต่อศาล
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" onClick={() => setStep(2)} className="sm:mr-auto">
                      <ArrowLeft className="w-4 h-4 mr-2" /> ย้อนกลับ
                    </Button>
                    <Button variant="outline" onClick={() => toast.success("ดาวน์โหลด XML สำเร็จ (จำลอง)")}>
                      <Download className="w-4 h-4 mr-2" /> ส่งออก e-Filing XML
                    </Button>
                    <Button className="bg-teal hover:bg-teal/90" asChild>
                      <a href="https://efiling.coj.go.th" target="_blank" rel="noopener noreferrer">
                        <Send className="w-4 h-4 mr-2" /> ยื่นผ่าน e-Filing ศาลยุติธรรม
                      </a>
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ComplaintFormPage;
