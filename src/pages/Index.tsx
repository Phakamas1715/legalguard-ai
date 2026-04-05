import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Shield, ArrowRight, Gavel } from "lucide-react";
import heroImage from "@/assets/hero-courthouse.jpg";
import RoleSelector, { type UserRole } from "@/components/RoleSelector";
import StatsBar from "@/components/StatsBar";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const Index = () => {
  const navigate = useNavigate();

  const handleRoleSelect = (role: UserRole) => {
    const dashboardMap: Record<UserRole, string> = {
      citizen: "/citizen",
      lawyer: "/lawyer",
      government: "/government",
    };
    navigate(dashboardMap[role]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background image with overlay */}
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt=""
            className="w-full h-full object-cover"
            width={1920}
            height={800}
          />
          <div className="absolute inset-0 bg-hero-gradient opacity-90" />
        </div>

        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center text-primary-foreground">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 text-sm mb-6"
            >
              <Gavel className="w-4 h-4 text-gold" />
              <span>ETDA Responsible AI Innovation Hackathon 2026 — AI for Justice</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight"
            >
              Smart{" "}
              <span className="text-gradient-gold">LegalGuard</span>{" "}
              AI
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-xl mb-8 leading-relaxed max-w-3xl mx-auto text-primary-foreground/95"
            >
              ระบบสืบค้นคำพิพากษาและข้อกฎหมายไทยด้วย AI — ค้นหาด้วยภาษาธรรมชาติ
              อ้างอิงมาตราและเลขฎีกาจริง พร้อมระบบป้องกัน AI หลอน
              ข้อมูลเก็บในประเทศไทย ปกป้องข้อมูลส่วนบุคคลตาม PDPA
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button
                onClick={() => navigate("/search?role=citizen")}
                className="flex items-center gap-2 bg-accent text-accent-foreground px-8 py-4 rounded-xl font-bold text-lg shadow-gold hover:brightness-110 transition-all"
              >
                <Search className="w-5 h-5" />
                เริ่มค้นหาเลย
              </button>
              <a
                href="#roles"
                className="flex items-center gap-2 px-6 py-4 rounded-xl font-semibold text-base border border-primary-foreground/30 hover:bg-primary-foreground/10 transition-colors"
              >
                เลือกประเภทผู้ใช้
                <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4 -mt-8 relative z-10">
        <StatsBar />
      </section>

      {/* Role Selection */}
      <section id="roles" className="container mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="font-heading text-3xl font-bold text-foreground mb-3">
            เลือกประเภทผู้ใช้งาน
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            ระบบจะปรับผลลัพธ์และรูปแบบการแสดงผลให้เหมาะสมกับความต้องการของคุณ
          </p>
        </div>
        <RoleSelector onSelect={handleRoleSelect} />
      </section>

      {/* Features — หลักการสำคัญ */}
      <section className="bg-secondary/50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="font-heading text-3xl font-bold text-foreground text-center mb-3">
            หลักการสำคัญของระบบ
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
            ออกแบบตามหลัก AI Ethics by Design และหลักธรรมาภิบาลปัญญาประดิษฐ์ในกระบวนการยุติธรรม
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: Shield,
                title: "โปร่งใสและตรวจสอบได้",
                desc: "ทุกผลลัพธ์อ้างอิงมาตรากฎหมายและเลขคดีจริง บันทึกการใช้งานทุกครั้งด้วยระบบ Audit Log",
              },
              {
                icon: Search,
                title: "แม่นยำด้วย AI",
                desc: "ค้นหาเชิงความหมาย เข้าใจบริบทกฎหมายไทย ไม่ใช่แค่จับคู่คำ พร้อมระบบป้องกัน AI หลอน 7 ชั้น",
              },
              {
                icon: Gavel,
                title: "ปลอดภัยตามมาตรฐาน",
                desc: "ข้อมูลเก็บในประเทศไทย ปกป้องข้อมูลส่วนบุคคลตาม PDPA ผ่านเกณฑ์ความเป็นธรรมของผลค้นหา",
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card p-8 rounded-2xl shadow-card border border-border"
              >
                <div className="w-14 h-14 mb-5 rounded-xl bg-primary/10 flex items-center justify-center">
                  <f.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-heading text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust indicators */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center items-center gap-8 text-muted-foreground">
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
