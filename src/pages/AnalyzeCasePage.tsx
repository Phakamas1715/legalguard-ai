import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Scale, Send, Loader2, AlertTriangle, CheckCircle2,
  FileText, Shield, ThumbsUp, ThumbsDown, Lightbulb
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { apiClient } from "@/lib/apiClient";

const EXAMPLE_CASES = [
  {
    label: "กู้ยืมเงินไม่คืน",
    text: "โจทก์ฟ้องว่าจำเลยกู้ยืมเงินจำนวน 500,000 บาท ทำสัญญากู้ยืมลงวันที่ 1 มกราคม 2567 กำหนดชำระคืนภายใน 6 เดือน พร้อมดอกเบี้ยร้อยละ 7.5 ต่อปี ครบกำหนดแล้วจำเลยไม่ชำระ โจทก์ทวงถามเป็นหนังสือ 3 ครั้ง จำเลยเพิกเฉย โจทก์มีสัญญากู้ยืมเงินลงลายมือชื่อจำเลย และหนังสือทวงถามพร้อมใบตอบรับไปรษณีย์เป็นหลักฐาน จำเลยให้การว่าได้ชำระเงินคืนแล้วบางส่วน 100,000 บาท แต่ไม่มีหลักฐานการชำระ",
  },
  {
    label: "ฉ้อโกงขายที่ดิน",
    text: "จำเลยที่ 1 แสดงตนเป็นเจ้าของที่ดิน 5 ไร่ ตำบลบางพลี จังหวัดสมุทรปราการ เสนอขายในราคา 10 ล้านบาท ผู้เสียหายตรวจสอบโฉนดพบว่าตรงกับชื่อจำเลย จึงโอนเงินมัดจำ 2 ล้านบาท ภายหลังพบว่าจำเลยปลอมโฉนดที่ดิน ที่ดินจริงเป็นของบุคคลอื่น จำเลยหลบหนี ผู้เสียหายแจ้งความและมีหลักฐานสลิปโอนเงิน สำเนาโฉนดปลอม และบันทึกแชทการเจรจา",
  },
  {
    label: "เลิกจ้างไม่เป็นธรรม",
    text: "โจทก์ทำงานเป็นพนักงานบริษัทจำเลยมา 10 ปี ตำแหน่งผู้จัดการฝ่ายขาย เงินเดือนสุดท้าย 65,000 บาท จำเลยเลิกจ้างโดยอ้างว่าผลประกอบการขาดทุน แต่ในไตรมาสเดียวกันบริษัทรับพนักงานใหม่ 5 คนในแผนกเดียวกัน โจทก์ไม่ได้รับค่าชดเชย 300 วัน ค่าบอกกล่าวล่วงหน้า และค่าวันหยุดพักผ่อนค้าง 15 วัน โจทก์มีสัญญาจ้าง สลิปเงินเดือน และหนังสือเลิกจ้างเป็นหลักฐาน",
  },
];

const AnalyzeCasePage = () => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult("");
    try {
      const messages = [
        {
          role: "system" as const,
          content: `คุณเป็นผู้ช่วย AI สำหรับทนายความไทย ช่วยวิเคราะห์สำนวนคดี โดยสรุปเป็นหัวข้อดังนี้:

## 📋 สรุปข้อเท็จจริง
สรุปข้อเท็จจริงสำคัญจากสำนวน

## ⚖️ ประเด็นข้อกฎหมาย
ระบุประเด็นข้อกฎหมายที่เกี่ยวข้อง พร้อมอ้างอิงมาตรา

## ✅ จุดแข็งของคดี
วิเคราะห์จุดแข็งที่เป็นประโยชน์

## ❌ จุดอ่อน / ความเสี่ยง
วิเคราะห์จุดอ่อนและความเสี่ยง

## 💡 คำแนะนำ
แนะนำแนวทางดำเนินคดี

⚠️ นี่เป็นการวิเคราะห์เบื้องต้นจาก AI เท่านั้น ไม่ใช่คำปรึกษาทางกฎหมาย`,
        },
        { role: "user" as const, content: `วิเคราะห์สำนวนคดีนี้:\n\n${input}` },
      ];
      const resp = await apiClient.chatStream(messages, "lawyer");
      if (!resp.ok || !resp.body) {
        setError("ไม่สามารถเชื่อมต่อ backend ได้");
        setLoading(false);
        return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "", full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) { full += c; setResult(full); }
          } catch { /* ignore */ }
        }
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อ backend ได้ กรุณาตรวจสอบว่า server ทำงานอยู่");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Scale className="w-8 h-8 text-accent-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">วิเคราะห์สำนวนคดี</h1>
            <p className="text-muted-foreground">AI สรุปข้อเท็จจริง ประเด็นสำคัญ จุดแข็ง-จุดอ่อน</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h2 className="font-heading font-bold mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> ใส่สำนวนคดี
              </h2>
              <textarea value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="วางข้อเท็จจริง คำฟ้อง คำให้การ หรือสรุปสำนวนคดีที่ต้องการวิเคราะห์..."
                rows={12} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y" />
              <button onClick={handleAnalyze} disabled={!input.trim() || loading}
                className="mt-3 w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:bg-navy-deep transition-colors disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {loading ? "กำลังวิเคราะห์..." : "วิเคราะห์สำนวน"}
              </button>
            </div>

            {/* Examples */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">💡 ตัวอย่างสำนวนคดี</p>
              <div className="space-y-2">
                {EXAMPLE_CASES.map((ex) => (
                  <button key={ex.label} onClick={() => { setInput(ex.text); setResult(""); setError(""); }}
                    className="w-full text-left p-3 bg-muted/50 border border-border rounded-xl hover:border-primary/30 transition-colors">
                    <span className="text-xs font-medium text-primary">{ex.label}</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{ex.text}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
              <p className="text-xs text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                การวิเคราะห์เป็นข้อมูลเบื้องต้นจาก AI เท่านั้น ทนายความต้องตรวจสอบก่อนใช้จริง
              </p>
            </div>
          </div>

          {/* Result */}
          <div>
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-sm text-destructive mb-4">{error}</div>
            )}
            {result ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-card">
                <h3 className="font-heading font-bold mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-accent-foreground" /> ผลวิเคราะห์
                </h3>
                <div className="prose prose-sm max-w-none [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_p]:my-1.5 [&_ul]:my-1.5 [&_li]:my-0.5">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
                {!loading && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-teal" />
                      ข้อมูลส่วนบุคคลถูกปกปิดอัตโนมัติก่อนประมวลผล AI
                    </p>
                  </div>
                )}
              </motion.div>
            ) : !loading ? (
              <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground shadow-card">
                <Scale className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>วางสำนวนคดีแล้วกด "วิเคราะห์สำนวน"</p>
                <p className="text-xs mt-2">AI จะสรุปข้อเท็จจริง ประเด็นกฎหมาย จุดแข็ง-จุดอ่อน</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                <div className="flex items-center gap-3 mb-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm font-medium">กำลังวิเคราะห์สำนวน...</span>
                </div>
                {result && (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{result}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AnalyzeCasePage;
