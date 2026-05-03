import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Shield, ArrowRight, Gavel, Server, Lock, ShieldCheck, Sparkles, BarChart3, Users, Activity } from "lucide-react";
import heroImage from "@/assets/hero-courthouse.jpg";
import enterpriseBg from "@/assets/enterprise-bg.jpg";
import RoleSelector, { type UserRole } from "@/components/RoleSelector";
import StatsBar from "@/components/StatsBar";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PartnerBar from "@/components/PartnerBar";
import SafetyPipelinePreview from "@/components/SafetyPipelinePreview";
import roleSelectionBg from "@/assets/institutional_role_selector_bg.jpg";
const kpiHighlights = [
  { value: "30-50%", label: "ลดเวลายกร่างและตรวจร่าง", note: "ตัวอย่างเป้าหมายระยะนำร่องจากระบบช่วยยกร่างและทบทวนเอกสาร" },
  { value: "10-25%", label: "ลดคดีค้างสะสม", note: "ตัวอย่างเป้าหมายระยะนำร่องจากการวิเคราะห์คอขวดและจัดสรรงาน" },
  { value: ">= 85%", label: "การค้นคืนใน 5 อันดับแรก", note: "ตัวอย่างเป้าหมายสำหรับการค้นคืนคำพิพากษาที่เกี่ยวข้อง" },
  { value: ">= 95%", label: "ความแม่นยำของการอ้างอิง", note: "ตัวอย่างเป้าหมายด้านการอ้างอิงมาตราและคำพิพากษา" },
  { value: "0 การรั่วไหล", label: "ความเสี่ยงข้อมูล PII", note: "ตัวอย่างเป้าหมายที่ผลลัพธ์ต้องไม่รั่วข้อมูลส่วนบุคคล" },
  { value: "< 1 day", label: "เข้าถึงบริการประชาชน", note: "ตัวอย่างเป้าหมายเพื่อลดระยะเวลาการเข้าถึงบริการ" },
];



const Index = () => {
  const navigate = useNavigate();

  const handleRoleSelect = (role: UserRole) => {
    const dashboardMap: Record<UserRole | "it", string> = {
      citizen: "/citizen",
      government: "/clerk-copilot",
      judge: "/judge-workbench",
      it: "/ai-control-tower",
    };
    navigate(dashboardMap[role]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Background image with overlay */}
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt=""
            className="w-full h-full object-cover scale-105"
            width={1920}
            height={1080}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-navy/80 to-background" />
          
          {/* Decorative Particles / Nodes */}
          <div className="absolute inset-0 opacity-20">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: Math.random() * 100 + "%", y: Math.random() * 100 + "%" }}
                animate={{ 
                  opacity: [0.2, 0.5, 0.2],
                  y: ["-10%", "110%"],
                  transition: { duration: Math.random() * 20 + 10, repeat: Infinity, ease: "linear" }
                }}
                className="absolute w-1 h-1 bg-gold rounded-full blur-[1px]"
              />
            ))}
          </div>
        </div>

        <div className="relative container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center text-primary-foreground">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-gold/10 backdrop-blur-2xl border border-gold/30 text-xs font-black uppercase tracking-[0.3em] text-gold mb-10 shadow-lg shadow-gold/5"
            >
              <Sparkles className="w-4 h-4" />
              <span>ต้นแบบแพลตฟอร์มข้อมูลกฎหมายและกระบวนการยุติธรรม</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="font-heading text-6xl md:text-8xl lg:text-9xl font-black mb-8 leading-[0.9] tracking-tighter drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            >
              ระบบ <br/>
              <span className="text-gradient-gold drop-shadow-none">LegalGuard AI</span>
            </motion.h1>

	            <motion.p
	              initial={{ opacity: 0, y: 30 }}
	              animate={{ opacity: 1, y: 0 }}
	              transition={{ delay: 0.2, duration: 0.8 }}
	              className="text-base md:text-xl lg:text-[1.35rem] mb-12 leading-relaxed max-w-5xl mx-auto text-white font-medium tracking-wide"
	            >
	              ต้นแบบระบบข้อมูลกฎหมายด้วยเทคโนโลยี AI ที่ตรวจสอบย้อนหลังได้
	              <br className="hidden md:block" />
	              <span className="md:hidden"> </span>
	              เพื่อสนับสนุนความโปร่งใสในกระบวนการยุติธรรมและอำนวยความสะดวกแก่ประชาชน
	            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-6"
            >
              <button
                onClick={() => navigate("/search?role=citizen")}
                className="shimmer-overlay group relative flex items-center gap-3 bg-gold text-navy-deep px-10 py-5 rounded-2xl font-black text-xl shadow-[0_15px_40px_rgba(212,175,55,0.35)] hover:scale-105 active:scale-95 transition-all"
              >

                <Search className="w-6 h-6" />
                สืบค้นกฎหมาย
              </button>
              <a
                href="#roles"
	                className="flex items-center gap-3 px-10 py-5 rounded-2xl font-bold text-lg bg-black/35 backdrop-blur-xl border border-white/25 hover:bg-black/45 transition-all text-white shadow-xl"
	              >
                ดูพื้นที่ปฏิบัติงานตามบทบาท
                <ArrowRight className="w-5 h-5 text-gold" />
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
	              className="mt-16 flex flex-wrap items-center justify-center gap-4 text-[10px] font-black uppercase tracking-[0.25em] text-white/70"
	            >
	                <span className="flex items-center gap-2 bg-black/35 px-4 py-2 rounded-lg border border-white/10">
	                <ShieldCheck className="w-3 h-3 text-teal" /> ออกแบบเพื่อใช้งานในประเทศไทย
	              </span>
	              <span className="flex items-center gap-2 bg-black/35 px-4 py-2 rounded-lg border border-white/10">
	                <ShieldCheck className="w-3 h-3 text-gold" /> ตรวจสอบย้อนหลังได้และคำนึงถึงความเป็นส่วนตัว
	              </span>
	              <span className="flex items-center gap-2 bg-black/35 px-4 py-2 rounded-lg border border-white/10">
	                <ShieldCheck className="w-3 h-3 text-primary" /> พัฒนาตามแนวทางปัญญาประดิษฐ์อย่างรับผิดชอบ
	              </span>
            </motion.div>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/20"
        >
          <div className="w-6 h-10 border-2 border-white/10 rounded-full flex justify-center p-1">
            <div className="w-1 h-2 bg-gold rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4 -mt-8 relative z-20">
        <StatsBar />
      </section>

      <PartnerBar />

      {/* Role Selection with Institutional Background */}
      <section id="roles" className="relative py-24 overflow-hidden">
        {/* Background Layer */}
        <div className="absolute inset-0 z-0">
          <img
            src={roleSelectionBg}
            alt="Institutional Backdrop"
            className="w-full h-full object-cover opacity-80"
          />
	          <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-navy-deep/60 backdrop-blur-[2px]" />
        </div>

        <div className="container relative z-10 mx-auto px-4">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
	              className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-navy-deep/90 backdrop-blur-2xl border border-white/25 text-[10px] font-black uppercase tracking-[0.3em] text-gold mb-8 shadow-2xl"
            >
              <Users className="w-4 h-4" /> เลือกพื้นที่ปฏิบัติงานของคุณ
            </motion.div>
            <h2 className="font-heading text-6xl md:text-7xl font-bold text-foreground mb-6 tracking-tight">
              ระบบตอบสนองตาม <br/>
              <span className="text-primary">บทบาทของผู้ใช้งาน</span>
            </h2>
	            <p className="text-foreground/80 text-xl max-w-3xl mx-auto leading-relaxed font-medium">
	              LegalGuard AI ปรับสถาปัตยกรรมและข้อกำกับความปลอดภัยให้สอดคล้องกับภารกิจและระดับสิทธิ์ของแต่ละกลุ่มผู้ใช้งานในกระบวนการยุติธรรม
	            </p>
          </div>
          
          <div className="max-w-6xl mx-auto">
            <RoleSelector onSelect={handleRoleSelect} />
          </div>

          <div className="mt-16 flex flex-wrap justify-center items-center gap-6">
	             <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-navy-deep bg-white/70 px-4 py-2 rounded-full border border-white/30 shadow-sm">
	                <ShieldCheck className="w-4 h-4 text-teal" /> ความเป็นส่วนตัวตามบทบาท
	             </div>
             <div className="w-1 h-1 rounded-full bg-navy-deep/20" />
	             <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-navy-deep bg-white/70 px-4 py-2 rounded-full border border-white/30 shadow-sm">
	                <Lock className="w-4 h-4 text-primary" /> ปกป้องข้อมูลส่วนบุคคลตั้งแต่ขั้นตอนการออกแบบระบบ
	             </div>
             <div className="w-1 h-1 rounded-full bg-navy-deep/20" />
	             <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-navy-deep bg-white/70 px-4 py-2 rounded-full border border-white/30 shadow-sm">
	                <Activity className="w-4 h-4 text-gold" /> ความปลอดภัยระดับโครงสร้างพื้นฐาน
	             </div>
          </div>
        </div>
      </section>



      <section className="container mx-auto px-4 py-10">
        <SafetyPipelinePreview
          eyebrow="ชั้นความเชื่อมั่นของระบบ"
          title="ผู้ใช้งานทุกบทบาทอยู่ภายใต้โครงสร้างความปลอดภัยเดียวกัน"
          description="ตั้งแต่ประชาชนจนถึงผู้พิพากษา ทุกคำขอจะผ่านการคุ้มครองข้อมูล การกำหนดเส้นทางคำขอ การสืบค้นข้อมูล การคัดกรองความเสี่ยง การทบทวนหลายชั้น และบันทึกการตรวจสอบย้อนหลัง ก่อนแสดงผล เพื่อให้ระบบตรวจสอบได้และควบคุมความเสี่ยงได้จริง"
          primaryAction={{ label: "ดูคอนโซลติดตามการทำงาน", path: "/trace-console" }}
          secondaryAction={{ label: "ดูศูนย์ควบคุม AI", path: "/ai-control-tower" }}
        />
      </section>

      <section id="kpis" className="container mx-auto px-4 py-16 ambient-glow">
	        <div className="rounded-[2.5rem] border border-border bg-gradient-to-br from-white via-white to-gold-light/80 p-8 md:p-12 shadow-card">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                <BarChart3 className="h-4 w-4" /> กรอบตัวชี้วัดสำคัญ
              </div>
              <h2 className="mt-4 font-heading text-4xl font-bold text-foreground">ตัวอย่างเป้าหมายที่ควรใช้วัดผลในระยะนำร่อง</h2>
              <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
                ตัวชี้วัดด้านล่างเป็นกรอบตัวอย่างสำหรับการทดสอบและประเมินผลเชิงนโยบาย ยังไม่ใช่ผลลัพธ์ที่ยืนยันแล้วจากการใช้งานจริงทุกกรณี
              </p>
            </div>
            <div className="rounded-2xl border border-primary/15 bg-white px-5 py-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/70">สถานะข้อมูล</p>
              <p className="mt-1 text-sm font-semibold text-foreground">ตัวอย่างเป้าหมายสำหรับ pilot และการประเมินผล</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {kpiHighlights.map((item) => (
              <div key={item.label} className="float-card rounded-[1.75rem] border border-white/80 bg-white/90 p-6 shadow-sm">
                <div className="mb-3 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                  เป้าหมายตัวอย่าง
                </div>
                <div className="text-3xl font-black tracking-tighter text-primary">{item.value}</div>
                <div className="mt-2 text-base font-bold text-foreground">{item.label}</div>
                <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* Features — หลักการสำคัญ */}
      <section className="relative py-24 overflow-hidden">
        {/* Dark High-Tech Background - Adjusted Contrast for visibility */}
        <div className="absolute inset-0 z-0">
          <img 
            src={enterpriseBg} 
            alt="Infrastructure Background" 
            className="w-full h-full object-cover opacity-50"
          />
	          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-navy-deep/80 to-background/95 backdrop-blur-[1px]"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
             <div className="inline-flex items-center gap-3 px-6 py-2 bg-gradient-to-r from-gold to-yellow-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] mb-8 shadow-2xl shadow-gold/20">
                <Sparkles className="w-3.5 h-3.5" /> พัฒนาภายใต้แนวทางความรับผิดชอบด้าน AI
             </div>
             <h2 className="font-heading text-5xl md:text-7xl font-bold text-white mb-8 tracking-tight drop-shadow-2xl">
               สถาปัตยกรรม <span className="text-gold underline decoration-white/20 underline-offset-8">ระดับรัฐเอกภาพ</span>
             </h2>
	             <p className="text-white text-xl md:text-2xl max-w-4xl mx-auto leading-relaxed font-light">
	               เทคโนโลยีที่ออกแบบให้ตรวจสอบย้อนหลังได้ เพื่อลดความเสี่ยงและยกระดับความโปร่งใสของกระบวนการยุติธรรม
	             </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 max-w-7xl mx-auto">
            {[
              {
                icon: Users,
                title: "ระบบสนับสนุนภาคประชาชน",
                desc: "เครื่องมือช่วยสืบค้นข้อกฎหมายและระเบียบที่เกี่ยวข้อง พร้อมคำอธิบายเบื้องต้นเพื่อความเข้าใจที่ถูกต้อง",
              },
              {
                icon: Server,
                title: "ระบบสนับสนุนงานบริหารจัดการ",
                desc: "สนับสนุนการบริหารจัดการเอกสารและคัดกรองข้อมูลเบื้องต้น เพื่อเพิ่มประสิทธิภาพการทำงานของเจ้าหน้าที่",
              },
              {
                icon: Gavel,
                title: "ระบบสนับสนุนงานตุลาการ",
                desc: "เครื่องมือรวบรวมข้อกฎหมายและแนวทางคำพิพากษา เพื่อประกอบการพิจารณาและตรวจสอบความถูกต้องเชิงกฎหมาย",
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
	                className="float-card bg-black/55 backdrop-blur-2xl p-10 rounded-[2.5rem] border border-white/25 hover:border-gold/50 transition-all group shadow-2xl flex flex-col items-center text-center h-full w-full md:w-[calc(33.33%-2rem)] min-w-[320px]"
              >
                <div className="w-20 h-20 mb-8 rounded-3xl bg-gradient-to-br from-gold/50 to-gold/10 flex items-center justify-center border border-gold/40 group-hover:border-gold/80 transition-colors shadow-lg shadow-gold/10">
                  <f.icon className="w-10 h-10 text-gold drop-shadow-md" />
                </div>
                <h3 className="font-heading text-2xl font-bold mb-5 text-white drop-shadow-md leading-tight">{f.title}</h3>
	                <p className="text-base text-white/95 font-medium leading-relaxed opacity-100">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust indicators */}
      <section className="py-12">
        <div className="container mx-auto px-4">
	          <div className="flex flex-wrap justify-center items-center gap-8 text-foreground/80">
            {[
              "ค้นหาด้วยภาษาธรรมชาติ",
              "อ้างอิงมาตราและเลขฎีกาจริง",
              "ปกป้องข้อมูลตาม PDPA",
              "ข้อมูลเก็บในประเทศไทย",
              "ระบบป้องกัน AI หลอน",
            ].map(text => (
              <div key={text} className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-teal" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
