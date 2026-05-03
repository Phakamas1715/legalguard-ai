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
  const [activeFeatureMenu, setActiveFeatureMenu] = useState("ค้นข้อมูล");

  const quickActions = [
    { icon: Gavel, title: "ค้นหาคำพิพากษา", desc: "สืบค้นคดีด้วยการค้นหาตามความหมาย พร้อมระดับความน่าเชื่อถือ", path: "/search?role=citizen", color: "bg-primary/10 text-primary", badge: "บริการหลัก", menu: "ค้นข้อมูล" },
    { icon: BookOpen, title: "ศัพท์กฎหมาย", desc: "ค้นหาความหมายศัพท์ + ฎีกาสำคัญ", path: "/glossary", color: "bg-teal/10 text-teal", badge: null, menu: "ค้นข้อมูล" },
    { icon: MapPin, title: "ค้นหาศาล", desc: "ค้นหาศาลใกล้เคียงจากตำแหน่งที่ตั้ง", path: "/courts", color: "bg-primary/10 text-primary", badge: null, menu: "ค้นข้อมูล" },
    { icon: Mic, title: "พูดเพื่อค้นหา", desc: "ค้นหาด้วยเสียงเพื่อให้เข้าถึงบริการได้สะดวกขึ้น", path: "/search?role=citizen", color: "bg-primary/5 text-primary", badge: "แผนพัฒนา", disabled: true, menu: "ค้นข้อมูล" },
    { icon: FileText, title: "ร่างคำฟ้อง", desc: "ช่วยร่างคำฟ้องและตรวจความครบถ้วนก่อนยื่น", path: "/complaint-form", color: "bg-teal/10 text-teal", badge: "พร้อมใช้งาน", menu: "ยื่นเรื่องและติดตาม" },
    { icon: Bookmark, title: "บุ๊กมาร์กของฉัน", desc: "คำพิพากษาที่บันทึกไว้", path: "/bookmarks", color: "bg-secondary text-foreground", badge: null, menu: "ยื่นเรื่องและติดตาม" },
    { icon: History, title: "ประวัติการค้นหา", desc: "ย้อนดูการค้นหาที่ผ่านมา", path: "/history", color: "bg-accent/10 text-accent-foreground", badge: null, menu: "ยื่นเรื่องและติดตาม" },
    { icon: Scale, title: "พยากรณ์ผลคดี", desc: "วิเคราะห์แนวโน้มจากคดีที่มีข้อเท็จจริงคล้ายกัน", path: "/predict", color: "bg-accent/10 text-accent-foreground", badge: "เครื่องมือวิเคราะห์", menu: "ยื่นเรื่องและติดตาม" },
    { icon: ShieldCheck, title: "ถามน้องซื่อสัตย์", desc: "ผู้ช่วยอธิบายข้อกฎหมายและขั้นตอนเบื้องต้นสำหรับประชาชน", path: "#open-chat", color: "bg-accent/10 text-accent-foreground", badge: "บริการประชาชน", menu: "ขอความช่วยเหลือ" },
    { icon: Handshake, title: "ไกล่เกลี่ยออนไลน์", desc: "แนวทางบริการไกล่เกลี่ยออนไลน์ก่อนเข้าสู่กระบวนการศาล", path: "#odr", color: "bg-teal/10 text-teal", badge: "แผนพัฒนา", disabled: true, menu: "ขอความช่วยเหลือ" },
  ];

  const featureMenus = [
    {
      title: "ค้นข้อมูล",
      desc: "ค้นคำพิพากษา ศัพท์กฎหมาย ศาล และข้อมูลอ้างอิงเบื้องต้น",
      icon: Search,
      accent: "text-primary",
    },
    {
      title: "ยื่นเรื่องและติดตาม",
      desc: "เตรียมเอกสาร ติดตามสถานะ และเก็บงานที่ใช้บ่อยไว้ในที่เดียว",
      icon: FileDown,
      accent: "text-teal",
    },
    {
      title: "ขอความช่วยเหลือ",
      desc: "รับคำอธิบายเบื้องต้นและบริการสนับสนุนก่อนเข้ากระบวนการศาล",
      icon: MessageCircle,
      accent: "text-accent-foreground",
    },
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

  const activeMenuMeta = featureMenus.find((menu) => menu.title === activeFeatureMenu) ?? featureMenus[0];
  const visibleQuickActions = quickActions.filter((action) => action.menu === activeFeatureMenu);
  const availableQuickActions = visibleQuickActions.filter((action) => !action.disabled);
  const plannedQuickActions = visibleQuickActions.filter((action) => action.disabled);

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
        {/* Feature Menu */}
        <section className="mb-8 rounded-[2rem] border border-border bg-card p-6 shadow-card">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-primary/70">เมนูบริการผู้ใช้งาน</p>
              <h2 className="font-heading text-2xl font-bold text-foreground">เลือกฟีเจอร์ตามงานที่ต้องการ</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                แยกเมนูตามลักษณะงาน เพื่อให้ประชาชนค้นหาฟีเจอร์ได้ง่ายขึ้น และแยกบริการที่พร้อมใช้งานออกจากแผนพัฒนาอย่างชัดเจน
              </p>
            </div>
            <div className="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{activeMenuMeta.title}</span>
              {" • "}
              {activeMenuMeta.desc}
              <div className="mt-1 text-xs">
                พร้อมใช้งาน {availableQuickActions.length} รายการ{plannedQuickActions.length > 0 ? ` · แผนพัฒนา ${plannedQuickActions.length} รายการ` : ""}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="space-y-3">
              {featureMenus.map((menu) => (
                <button
                  key={menu.title}
                  onClick={() => setActiveFeatureMenu(menu.title)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${
                    activeFeatureMenu === menu.title
                      ? "border-primary/30 bg-primary/5 shadow-sm"
                      : "border-border bg-background hover:border-primary/20 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 rounded-xl bg-background p-2 ${menu.accent}`}>
                      <menu.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{menu.title}</p>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          {quickActions.filter((action) => action.menu === menu.title).length} ฟีเจอร์
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{menu.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {availableQuickActions.map((action, i) => (
                <motion.button
                  key={action.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => {
                    if (action.path === "#open-chat") {
                      window.dispatchEvent(new CustomEvent("open-legal-chat"));
                    } else if (!action.disabled) {
                      navigate(action.path);
                    }
                  }}
                  disabled={Boolean(action.disabled)}
                  className="relative rounded-2xl border border-border bg-background p-4 text-left transition-shadow hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-none"
                >
                  {action.badge && (
                    <span className="absolute right-3 top-3 rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold text-accent-foreground">
                      {action.badge}
                    </span>
                  )}
                  <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${action.color}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <h3 className="pr-14 text-sm font-bold text-foreground">{action.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{action.desc}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs font-medium text-primary">
                    <span>{action.disabled ? "อยู่ในแผนพัฒนา" : "เปิดใช้งานฟีเจอร์"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </motion.button>
                ))}
              </div>

              {plannedQuickActions.length > 0 && (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-foreground">บริการในแผนพัฒนา</p>
                      <p className="text-xs text-muted-foreground">ยังไม่เปิดใช้งานในรอบสาธิตนี้ แต่แสดงไว้เพื่อให้เห็นทิศทางการขยายระบบ</p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                      {plannedQuickActions.length} รายการ
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {plannedQuickActions.map((action) => (
                      <div
                        key={`planned-${action.title}`}
                        className="relative rounded-2xl border border-border bg-background/80 p-4 text-left opacity-75"
                      >
                        {action.badge && (
                          <span className="absolute right-3 top-3 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                            {action.badge}
                          </span>
                        )}
                        <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${action.color}`}>
                          <action.icon className="h-5 w-5" />
                        </div>
                        <h3 className="pr-14 text-sm font-bold text-foreground">{action.title}</h3>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{action.desc}</p>
                        <div className="mt-4 text-xs font-medium text-muted-foreground">ยังไม่เปิดใช้งานในระบบปัจจุบัน</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Case Tracking */}
          <div className="md:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-card">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h2 className="font-heading font-bold text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> ติดตามสถานะคดี
              </h2>
              <span className="inline-flex w-fit rounded-full bg-gold-light px-3 py-1 text-[11px] font-bold text-accent-foreground">
                ตัวอย่างรูปแบบการแสดงผล
              </span>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              ส่วนนี้ใช้สาธิตรูปแบบบริการติดตามสถานะคดีสำหรับประชาชน การเชื่อมต่อข้อมูลจริงจะขึ้นกับระบบต้นทางของศาลที่ได้รับอนุญาตให้เชื่อมต่อ
            </p>
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={caseNo}
                onChange={(e) => setCaseNo(e.target.value)}
                placeholder="พิมพ์เลขคดี เช่น ฎ.1234/2568"
                className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <button
                onClick={() => caseNo && navigate(`/search?role=citizen&q=${encodeURIComponent(caseNo)}`)}
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
                  <p className="text-xs text-muted-foreground">ตัวอย่างสถานะ — อยู่ระหว่างพิจารณา นัดสืบพยาน 15 ก.ค. 2569</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="p-3 bg-gold-light rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-accent-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">ปค.45/2565</p>
                  <p className="text-xs text-muted-foreground">ตัวอย่างสถานะ — พิพากษาแล้ว คดีถึงที่สุด</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-border bg-muted/40 px-4 py-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                การ์ดสถานะด้านบนเป็นตัวอย่างเพื่อสาธิตรูปแบบบริการประชาชน ไม่ใช่ข้อมูลคดีจริงในระบบขณะนี้
              </p>
            </div>
            <button className="mt-4 w-full bg-[#00B900]/10 text-[#00B900] border border-[#00B900]/20 px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors opacity-70 cursor-not-allowed" disabled>
              <MessageSquare className="w-4 h-4" /> แนวคิดการแจ้งเตือนผ่าน LINE (แผนพัฒนา)
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
