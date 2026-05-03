import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check, Scale, Zap, Users, Building2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";

const tiers = [
  {
    name: "Free",
    price: "฿0",
    period: "ตลอดไป",
    icon: Scale,
    accent: "border-border",
    cta: "เริ่มต้นฟรี",
    ctaStyle: "border border-border text-foreground hover:bg-muted",
    features: [
      "ค้นหาคำพิพากษา 10 ครั้ง/วัน",
      "น้องซื่อสัตย์ Chatbot",
      "Case Brief 3 ฉบับ/เดือน",
      "พจนานุกรมกฎหมาย",
      "Anti-Hallucination 7 ชั้น",
    ],
  },
  {
    name: "Pro",
    price: "฿990",
    period: "/เดือน",
    icon: Zap,
    accent: "border-primary ring-2 ring-primary/20",
    badge: "แนะนำ",
    cta: "อัปเกรด Pro",
    ctaStyle: "bg-primary text-primary-foreground hover:bg-navy-deep",
    features: [
      "ค้นหาไม่จำกัด",
      "วิเคราะห์สำนวนคดี (AI)",
      "พยากรณ์ผลคดี",
      "เปรียบเทียบแนวฎีกา",
      "Prompt Templates ทั้งหมด",
      "Export PDF",
      "Case Workspace 50 คดี",
      "อัปโหลดเอกสาร 100 MB/เดือน",
      "ประวัติค้นหา + Bookmarks",
    ],
  },
  {
    name: "Team",
    price: "฿2,490",
    period: "/เดือน",
    icon: Users,
    accent: "border-teal",
    cta: "เริ่มต้น Team",
    ctaStyle: "bg-teal text-white hover:bg-teal/90",
    features: [
      "ทุกอย่างใน Pro",
      "5 users ต่อทีม",
      "จัดการลูกความ",
      "Shared Workspace",
      "บันทึกชั่วโมงทำงาน",
      "สร้างใบแจ้งหนี้",
      "Case Workspace ไม่จำกัด",
      "อัปโหลด 1 GB/เดือน",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    icon: Building2,
    accent: "border-border",
    cta: "ติดต่อเรา",
    ctaStyle: "border border-border text-foreground hover:bg-muted",
    features: [
      "ทุกอย่างใน Team",
      "API Access",
      "Custom Knowledge Base",
      "On-premise Deploy",
      "SLA 99.9%",
      "Dedicated Support",
      "SSO / LDAP",
    ],
  },
];

const PricingPage = () => {
  const { isAuthenticated, profile } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl font-bold text-foreground">เลือกแพ็กเกจที่เหมาะกับคุณ</h1>
          <p className="mt-3 text-muted-foreground">เริ่มต้นฟรี อัปเกรดเมื่อพร้อม</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 max-w-6xl mx-auto">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl border bg-card p-6 shadow-sm ${tier.accent}`}
            >
              {tier.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                  {tier.badge}
                </span>
              )}
              <tier.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-heading text-xl font-bold">{tier.name}</h3>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold">{tier.price}</span>
                <span className="text-sm text-muted-foreground">{tier.period}</span>
              </div>
              <ul className="space-y-2.5 mb-6">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={isAuthenticated ? "/private-offering" : "/auth"}
                className={`block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${tier.ctaStyle}`}
              >
                {profile?.tier === tier.name.toLowerCase() ? "แพ็กเกจปัจจุบัน" : tier.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>ยกเลิกได้ทุกเมื่อ • ไม่มีค่าธรรมเนียมซ่อน • ข้อมูลอยู่ในไทย</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PricingPage;
