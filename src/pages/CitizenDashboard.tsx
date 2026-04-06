import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Search, FileText, MessageCircle, Clock, BookOpen,
  ArrowRight, CheckCircle2, AlertCircle, MapPin, Phone,
  Shield, HelpCircle, ExternalLink, Mic, Scale,
  ChevronRight, Star, FileDown, Bookmark, History,
  Handshake, Volume2, MessageSquare, Gavel, ShieldCheck, Building2
} from "lucide-react";
import nongSuesutImg from "@/assets/nong-suesut.svg";
import heroCourthouseImg from "@/assets/hero-courthouse.jpg";

const CitizenDashboard = () => {
  const navigate = useNavigate();
  const [caseNo, setCaseNo] = useState("");
  const [activeGuideCategory, setActiveGuideCategory] = useState("ทั้งหมด");

  const quickActions = [
    { icon: Gavel, title: "ค้นหาคำพิพากษา", desc: "สืบค้นคดีด้วย semantic search พร้อมระดับความเชื่อถือ", path: "/search?role=citizen", color: "bg-primary/10 text-primary", badge: "บริการหลัก" },
    { icon: FileText, title: "ร่างคำฟ้อง", desc: "ช่วยร่างคำฟ้องและตรวจความครบถ้วนก่อนยื่น", path: "/complaint-form", color: "bg-teal/10 text-teal", badge: "พร้อมใช้งาน" },
    { icon: ShieldCheck, title: "ถามน้องซื่อสัตย์", desc: "Chatbot สำหรับอธิบายข้อกฎหมายและขั้นตอนเบื้องต้น", path: "#open-chat", color: "bg-accent/10 text-accent-foreground", badge: "บริการประชาชน" },
    { icon: Bookmark, title: "บุ๊กมาร์กของฉัน", desc: "คำพิพากษาที่บันทึกไว้", path: "/bookmarks", color: "bg-secondary text-foreground", badge: null },
    { icon: Handshake, title: "ไกล่เกลี่ยออนไลน์", desc: "แนวทางบริการ ODR สำหรับยุติข้อพิพาทก่อนศาล", path: "#odr", color: "bg-teal/10 text-teal", badge: "Roadmap" },
    { icon: History, title: "ประวัติการค้นหา", desc: "ย้อนดูการค้นหาที่ผ่านมา", path: "/history", color: "bg-accent/10 text-accent-foreground", badge: null },
    { icon: Mic, title: "พูดเพื่อค้นหา", desc: "ค้นหาด้วยเสียงสำหรับการเข้าถึงที่สะดวกขึ้น", path: "/search?role=citizen", color: "bg-primary/5 text-primary", badge: "Roadmap" },
    { icon: Scale, title: "พยากรณ์ผลคดี", desc: "วิเคราะห์แนวโน้มจากคดีที่มีข้อเท็จจริงคล้ายกัน", path: "/predict", color: "bg-accent/10 text-accent-foreground", badge: "เครื่องมือวิเคราะห์" },
    { icon: BookOpen, title: "ศัพท์กฎหมาย", desc: "ค้นหาความหมายศัพท์ + ฎีกาสำคัญ", path: "/glossary", color: "bg-teal/10 text-teal", badge: null },
    { icon: MapPin, title: "ค้นหาศาล", desc: "ค้นหาศาลใกล้เคียงจาก GPS", path: "/courts", color: "bg-primary/10 text-primary", badge: null },
  ];

  const guideCategories = ["ทั้งหมด", "อาญา", "แพ่ง", "ครอบครัว", "แรงงาน", "ผู้บริโภค", "ปกครอง", "จราจร"];

  const guides = [
    { title: "ถูกฉ้อโกงต้องทำอย่างไร?", category: "อาญา", icon: Scale, desc: "ป.อ. มาตรา 341 — ขั้นตอนแจ้งความและฟ้องคดี" },
    { title: "ฟ้องหย่าต้องเตรียมอะไรบ้าง?", category: "ครอบครัว", icon: Handshake, desc: "เอกสาร ค่าธรรมเนียม และขั้นตอนทั้งหมด" },
    { title: "นายจ้างเลิกจ้างไม่เป็นธรรม", category: "แรงงาน", icon: Building2, desc: "พ.ร.บ.คุ้มครองแรงงาน — สิทธิที่ควรรู้" },
    { title: "สินค้าไม่ตรงตามโฆษณา", category: "ผู้บริโภค", icon: ShieldCheck, desc: "ฟ้องคดีผู้บริโภค ไม่ต้องมีทนาย" },
    { title: "ฟ้องหน่วยงานรัฐได้ไหม?", category: "ปกครอง", icon: Gavel, desc: "คดีปกครอง มาตรา 9 — เขตอำนาจศาล" },
    { title: "ยืมเงินแล้วไม่คืน", category: "แพ่ง", icon: FileText, desc: "ป.พ.พ. มาตรา 653 — หลักฐานที่ต้องมี" },
    { title: "ค่าปรับจราจรเท่าไหร่?", category: "จราจร", icon: AlertCircle, desc: "อัตราค่าปรับตาม พ.ร.บ.จราจรทางบก" },
    { title: "ถูกโกงออนไลน์ ไม่ส่งของ", category: "อาญา", icon: Shield, desc: "ป.อ. มาตรา 341 + พ.ร.บ.คอมพิวเตอร์ มาตรา 14" },
    { title: "ค่าเสียหายจากอุบัติเหตุ", category: "แพ่ง", icon: Scale, desc: "เรียกค่าสินไหมทดแทน — ขั้นตอนและเอกสาร" },
  ];

  const filteredGuides = activeGuideCategory === "ทั้งหมด"
    ? guides
    : guides.filter(g => g.category === activeGuideCategory);

  const emergencyContacts = [
    { name: "สายด่วนยุติธรรม", number: "1111 กด 77", icon: Phone, url: "tel:1111" },
    { name: "ศูนย์ช่วยเหลือทางกฎหมาย", number: "1157", icon: HelpCircle, url: "tel:1157" },
    { name: "ศูนย์ยุติธรรมชุมชน", number: "7,000+ แห่งทั่วประเทศ", icon: MapPin, url: "https://www.moj.go.th/view/80170" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero */}
      <section className="bg-hero-gradient pt-16 pb-16 relative overflow-hidden flex items-center min-h-[400px]">
        {/* Background Decorative Pattern */}
        <div 
          className="absolute inset-0 opacity-15 bg-cover bg-center mix-blend-overlay"
          style={{ backgroundImage: `url(${heroCourthouseImg})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80 md:opacity-0 mix-blend-multiply"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 max-w-6xl mx-auto">
            <div className="text-center md:text-left text-primary-foreground flex-1">
              <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                ศูนย์บริการกฎหมายดิจิทัลสำหรับประชาชน
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-lg md:text-xl lg:text-2xl opacity-90 mb-8 max-w-xl font-light">
                ค้นหาคำพิพากษา ร่างคำฟ้อง ตรวจขั้นตอน และรับคำอธิบายทางกฎหมายอย่างเป็นระบบ พร้อมแนวทางใช้งานอย่างรับผิดชอบ
              </motion.p>
              
              {/* Quick search bar */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="max-w-xl mt-2 mx-auto md:mx-0">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="พิมพ์คำถามกฎหมาย เช่น ถูกโกงเงินต้องทำยังไง..."
                    className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-5 py-4 text-base text-primary-foreground placeholder:text-primary-foreground/70 focus:ring-2 focus:ring-gold focus:outline-none shadow-lg"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.target as HTMLInputElement).value) {
                        navigate(`/search?role=citizen&q=${encodeURIComponent((e.target as HTMLInputElement).value)}`);
                      }
                    }}
                  />
                  <button onClick={(e) => {
                    const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                    navigate(`/search?role=citizen${input?.value ? `&q=${encodeURIComponent(input.value)}` : ""}`);
                  }}
                    className="bg-gold text-foreground px-8 py-4 rounded-xl font-bold hover:bg-gold-light transition-all flex items-center justify-center gap-2 shadow-gold whitespace-nowrap">
                    <Search className="w-5 h-5" /> ค้นหาเลย
                  </button>
                </div>
              </motion.div>
            </div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9, x: 20 }} 
              animate={{ opacity: 1, scale: 1, x: 0 }} 
              transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
              className="hidden md:flex w-64 lg:w-96 justify-center"
            >
              <img src={nongSuesutImg} alt="น้องซื่อสัตย์" className="w-full h-auto drop-shadow-2xl object-contain" />
            </motion.div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 flex-1">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => {
                if (action.path === "#open-chat") {
                  // Trigger chatbot open via custom event
                  window.dispatchEvent(new CustomEvent("open-legal-chat"));
                } else {
                  navigate(action.path);
                }
              }}
              className="bg-card border border-border rounded-2xl p-4 text-left hover:shadow-card-hover transition-shadow group relative"
            >
              {action.badge && (
                <span className="absolute top-2 right-2 text-[11px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full font-bold">
                  {action.badge}
                </span>
              )}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${action.color}`}>
                <action.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-xs mb-0.5">{action.title}</h3>
              <p className="text-[11px] text-muted-foreground leading-tight">{action.desc}</p>
            </motion.button>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Case Tracking */}
          <div className="md:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-card">
            <h2 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> ติดตามสถานะคดี
            </h2>
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={caseNo}
                onChange={(e) => setCaseNo(e.target.value)}
                placeholder="พิมพ์เลขคดี เช่น ฎ.1234/2568"
                className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <button
                onClick={() => caseNo && navigate(`/search?role=citizen`)}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:bg-navy-deep transition-colors"
              >
                ค้นหา
              </button>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-teal-light rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-teal flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">ฎ.1234/2568</p>
                  <p className="text-xs text-muted-foreground">อยู่ระหว่างพิจารณา — นัดสืบพยาน 15 ก.ค. 2569</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="p-3 bg-gold-light rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-accent-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">ปค.45/2565</p>
                  <p className="text-xs text-muted-foreground">พิพากษาแล้ว — คดีถึงที่สุด</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-border bg-muted/40 px-4 py-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                การ์ดสถานะด้านบนเป็นตัวอย่างการแสดงผลเพื่อสาธิตรูปแบบบริการประชาชน การเชื่อมต่อข้อมูลคดีจริงจะขึ้นกับระบบต้นทางของศาล
              </p>
            </div>
            <button className="mt-4 w-full bg-[#00B900]/10 text-[#00B900] border border-[#00B900]/20 px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[#00B900]/20 transition-colors">
              <MessageSquare className="w-4 h-4" /> รับการแจ้งเตือนพิจารณาคดีผ่าน LINE
            </button>
          </div>

          {/* Emergency Contacts */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <h2 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-destructive" /> ช่องทางช่วยเหลือ
            </h2>
            <div className="space-y-3">
              {emergencyContacts.map((c) => (
                <a key={c.name} href={c.url} target={c.url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                  className="p-3 bg-muted rounded-xl flex items-center gap-3 hover:bg-muted/80 transition-colors block">
                  <c.icon className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.number}</p>
                  </div>
                  {c.url.startsWith("http") && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground ml-auto flex-shrink-0" />}
                </a>
              ))}
            </div>
            <div className="mt-4 p-3 bg-primary/5 border border-primary/10 rounded-xl">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-teal" />
                ข้อมูลส่วนบุคคลของคุณได้รับการปกป้องตาม PDPA
              </p>
            </div>
          </div>
        </div>

        {/* FAQ / Guides */}
        <div className="mb-8">
          <h2 className="font-heading font-bold text-lg mb-4">📚 คำถามที่พบบ่อย</h2>
          {/* Category filter */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {guideCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveGuideCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  activeGuideCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-secondary"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredGuides.map((g, i) => (
              <motion.button
                key={g.title}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/search?role=citizen&q=${encodeURIComponent(g.title)}`)}
                className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                    <g.icon className="w-6 h-6 text-primary/70 group-hover:text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium mb-1 group-hover:text-primary transition-colors">{g.title}</h3>
                    <p className="text-[11px] text-muted-foreground leading-tight mb-2">{g.desc}</p>
                    <div className="flex gap-2">
                       <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{g.category}</span>
                       <span className="text-[10px] bg-primary/5 text-primary px-1.5 py-0.5 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Volume2 className="w-3 h-3" /> ฟัง</span>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* AI Confidence Notice */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="rounded-2xl border border-teal/20 bg-teal-light p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-teal">
              <Shield className="h-4 w-4" />
              โปร่งใสในการใช้งาน
            </div>
            <p className="text-xs leading-6 text-muted-foreground">
              ผลลัพธ์สำคัญจะแสดงระดับความเชื่อถือ แหล่งข้อมูล และคำแนะนำก่อนนำไปใช้อ้างอิง
            </p>
          </div>
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" />
              คุ้มครองข้อมูลส่วนบุคคล
            </div>
            <p className="text-xs leading-6 text-muted-foreground">
              ระบบออกแบบให้ปกปิดข้อมูลส่วนบุคคลก่อนประมวลผล และลดความเสี่ยงในการเผยแพร่ข้อมูลเกินจำเป็น
            </p>
          </div>
          <div className="rounded-2xl border border-accent/20 bg-gold-light p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-accent-foreground">
              <Star className="h-4 w-4" />
              ใช้เพื่อประกอบการตัดสินใจ
            </div>
            <p className="text-xs leading-6 text-muted-foreground">
              เหมาะสำหรับเตรียมตัวก่อนดำเนินคดีหรือรับบริการศาล และควรอ่านเอกสารต้นฉบับหรือปรึกษาผู้เชี่ยวชาญเพิ่มเติมเมื่อจำเป็น
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CitizenDashboard;
