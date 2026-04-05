import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Search, Scale, BarChart3, FileText, BookOpen, Gavel,
  TrendingUp, Clock, ArrowRight, Bookmark, History,
  Star, Shield, FileDown, AlertTriangle,
  CheckCircle2, ExternalLink, Upload, MessageCircle, Bell, Trash2, X
} from "lucide-react";
import { useBookmarks, useSearchHistory } from "@/hooks/useBookmarksHistory";

type Tab = "tools" | "recent" | "tracking" | "bookmarks";

const LawyerDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("tools");
  const [heroQuery, setHeroQuery] = useState("");
  const { bookmarks, removeBookmark } = useBookmarks();
  const { history, removeHistoryItem, clearHistory } = useSearchHistory();

  // 6 โมดูลหลักสำหรับทนาย — ภาษาไทยล้วน ไม่มีศัพท์เทคนิค
  const tools = [
    { icon: Search, title: "ค้นหาฎีกาและกฎหมาย", desc: "ค้นหาคำพิพากษาด้วยภาษาธรรมชาติ อ้างอิงมาตราและเลขฎีกา", path: "/search?role=lawyer", color: "bg-primary/10 text-primary", badge: "หลัก" },
    { icon: FileText, title: "ร่างคำฟ้อง / คำร้อง", desc: "AI ช่วยร่าง + ตรวจความครบถ้วน + ส่งออก e-Filing XML", path: "/complaint-form", color: "bg-teal/10 text-teal", badge: null },
    { icon: Scale, title: "วิเคราะห์สำนวนคดี", desc: "สรุปข้อเท็จจริง ประเด็นสำคัญ จุดแข็ง-จุดอ่อน", path: "/analyze", color: "bg-accent/10 text-accent-foreground", badge: null },
    { icon: TrendingUp, title: "พยากรณ์แนวโน้มคดี", desc: "วิเคราะห์โอกาสจากแนวคำพิพากษาที่คล้ายกัน", path: "/predict", color: "bg-accent/10 text-accent-foreground", badge: "AI" },
    { icon: FileDown, title: "ส่งออก e-Filing", desc: "ส่งออกคำฟ้อง XML ตามมาตรฐานศาล", path: "/complaint-form", color: "bg-secondary text-foreground", badge: null },
    { icon: MessageCircle, title: "ถามน้องซื่อสัตย์", desc: "AI ช่วยตอบคำถามกฎหมาย + อ้างอิงฎีกา", path: "#open-chat", color: "bg-primary/5 text-primary", badge: "AI" },
    { icon: BookOpen, title: "ศัพท์กฎหมาย", desc: "ค้นหาศัพท์ + ฎีกาสำคัญ + แหล่งข้อมูล", path: "/glossary", color: "bg-teal/10 text-teal", badge: null },
    { icon: Star, title: "Prompt Templates", desc: "ตัวอย่าง Prompt สำหรับงานกฎหมาย", path: "/prompts", color: "bg-accent/10 text-accent-foreground", badge: null },
    { icon: Upload, title: "Knowledge Graph", desc: "แปลงข้อความเป็นกราฟความรู้", path: "/graph", color: "bg-primary/10 text-primary", badge: null },
  ];

  const trackedCases = [
    { caseNo: "ฎ.1234/2568", status: "อยู่ระหว่างพิจารณา", next: "นัดสืบพยาน 15 ก.ค. 2569", color: "bg-teal-light text-teal" },
    { caseNo: "ปค.45/2565", status: "พิพากษาแล้ว", next: "คดีถึงที่สุด", color: "bg-gold-light text-accent-foreground" },
    { caseNo: "อ.789/2567", status: "รอนัดไกล่เกลี่ย", next: "นัด 20 พ.ค. 2569", color: "bg-primary/10 text-primary" },
  ];

  const tabs: { id: Tab; label: string; icon: typeof Search }[] = [
    { id: "tools", label: "เครื่องมือ", icon: Scale },
    { id: "recent", label: "ค้นหาล่าสุด", icon: History },
    { id: "tracking", label: "ติดตามคดี", icon: Bell },
    { id: "bookmarks", label: "บุ๊กมาร์ก", icon: Bookmark },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <section className="bg-hero-gradient py-10">
        <div className="container mx-auto px-4 text-center text-primary-foreground">
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-heading text-3xl font-bold mb-2">
            เครื่องมือสำหรับทนายความ
          </motion.h1>
          <p className="opacity-80">ค้นหาฎีกา ร่างเอกสาร วิเคราะห์คดี ด้วย AI</p>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="max-w-2xl mx-auto mt-6">
            <div className="flex gap-2">
              <input type="text" value={heroQuery} onChange={(e) => setHeroQuery(e.target.value)}
                placeholder="ค้นหาแนวคำพิพากษา เช่น ยักยอกเสื้อผ้าโดยไม่ส่งมอบคืน..."
                className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-sm text-primary-foreground placeholder:text-primary-foreground/50 focus:ring-2 focus:ring-gold focus:outline-none"
                onKeyDown={(e) => { if (e.key === "Enter" && heroQuery) navigate(`/search?role=lawyer&q=${encodeURIComponent(heroQuery)}`); }} />
              <button onClick={() => navigate(`/search?role=lawyer${heroQuery ? `&q=${encodeURIComponent(heroQuery)}` : ""}`)}
                className="bg-accent text-accent-foreground px-6 py-3 rounded-xl font-medium hover:brightness-110 transition-all flex items-center gap-2">
                <Search className="w-4 h-4" /> ค้นหา
              </button>
            </div>
            <div className="flex gap-2 mt-3 justify-center flex-wrap">
              {["ฉ้อโกง มาตรา 341", "เลิกจ้างไม่เป็นธรรม", "ครอบครองปรปักษ์", "คดีผู้บริโภค"].map(tag => (
                <button key={tag} onClick={() => navigate(`/search?role=lawyer&q=${encodeURIComponent(tag)}`)}
                  className="text-[11px] bg-white/10 border border-white/20 text-primary-foreground/80 px-3 py-1 rounded-full hover:bg-white/20 transition-colors">{tag}</button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-muted"
              }`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* เครื่องมือ */}
        {activeTab === "tools" && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {tools.map((t, i) => (
              <motion.button key={t.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => {
                  if (t.path === "#open-chat") { window.dispatchEvent(new CustomEvent("open-legal-chat")); }
                  else { navigate(t.path); }
                }}
                className="bg-card border border-border rounded-2xl p-5 text-left hover:shadow-card-hover transition-shadow relative">
                {t.badge && <span className={`absolute top-3 right-3 text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                  t.badge === "เร็วๆ นี้" ? "bg-muted text-muted-foreground" : "bg-accent text-accent-foreground"
                }`}>{t.badge}</span>}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${t.color}`}><t.icon className="w-6 h-6" /></div>
                <h3 className="font-bold text-sm mb-1">{t.title}</h3>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </motion.button>
            ))}
          </div>
        )}

        {/* ค้นหาล่าสุด */}
        {activeTab === "recent" && (
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>ยังไม่มีประวัติการค้นหา</p>
                <button onClick={() => navigate("/search?role=lawyer")} className="mt-3 text-sm text-primary hover:underline">เริ่มค้นหาเลย →</button>
              </div>
            ) : (
              <>
                <div className="flex justify-end mb-2">
                  <button onClick={clearHistory} className="text-xs text-destructive hover:underline flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> ล้างประวัติทั้งหมด
                  </button>
                </div>
                {history.map((s, i) => (
                  <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors group">
                    <button onClick={() => navigate(`/search?role=lawyer&q=${encodeURIComponent(s.query)}`)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left">
                      <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{s.query}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.timestamp).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })} — {s.resultCount} ผลลัพธ์
                        </p>
                      </div>
                    </button>
                    <button onClick={() => removeHistoryItem(s.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ติดตามคดี */}
        {activeTab === "tracking" && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="font-heading font-bold mb-4 flex items-center gap-2"><Bell className="w-5 h-5 text-primary" /> คดีที่กำลังดำเนินการ</h3>
              <div className="space-y-3">
                {trackedCases.map((c) => (
                  <div key={c.caseNo} className={`p-4 rounded-xl flex items-center justify-between ${c.color}`}>
                    <div>
                      <p className="text-sm font-bold">{c.caseNo}</p>
                      <p className="text-xs opacity-80">{c.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">{c.next}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="font-heading font-bold mb-4 flex items-center gap-2"><ExternalLink className="w-5 h-5 text-primary" /> ลิงก์ระบบศาล</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { name: "CIOS ศาลยุติธรรม", url: "https://cios.coj.go.th", desc: "ติดตามสำนวนคดี" },
                  { name: "e-Filing ศาลยุติธรรม", url: "https://efiling.coj.go.th", desc: "ยื่นฟ้องออนไลน์" },
                  { name: "ฎีกาศาลฎีกา", url: "https://deka.supremecourt.or.th", desc: "ค้นหาคำพิพากษา" },
                  { name: "ศาลปกครอง", url: "https://www.admincourt.go.th", desc: "คำพิพากษาศาลปกครอง" },
                ].map(link => (
                  <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="p-3 border border-border rounded-xl hover:border-primary/30 transition-colors flex items-center gap-3 group">
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">{link.name}</p>
                      <p className="text-[11px] text-muted-foreground">{link.desc}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* บุ๊กมาร์ก */}
        {activeTab === "bookmarks" && (
          <div className="space-y-3">
            {bookmarks.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>ยังไม่มีบุ๊กมาร์ก</p>
                <button onClick={() => navigate("/search?role=lawyer")} className="mt-3 text-sm text-primary hover:underline">ค้นหาและบุ๊กมาร์กคำพิพากษา →</button>
              </div>
            ) : (
              bookmarks.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                  className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors group">
                  <div className="flex items-start justify-between mb-2">
                    <button onClick={() => navigate(`/judgment/${c.id}`)} className="flex-1 text-left">
                      <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">{c.caseNo}</span>
                      <h3 className="text-sm font-medium mt-1 group-hover:text-primary transition-colors">{c.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.summary}</p>
                    </button>
                    <button onClick={() => removeBookmark(c.id)} className="p-1.5 ml-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {c.statutes.map(s => (
                      <span key={s} className="text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{s}</span>
                    ))}
                    <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{c.courtType} · {c.year}</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-8 bg-accent/10 border border-accent/20 rounded-xl p-3">
          <p className="text-xs text-muted-foreground text-center">
            ⚖️ ข้อมูลจาก AI เพื่อประกอบการตัดสินใจเท่านั้น ทนายความต้องตรวจสอบและรับผิดชอบก่อนยื่นศาล
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default LawyerDashboard;
