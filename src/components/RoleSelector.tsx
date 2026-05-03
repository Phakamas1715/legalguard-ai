import { motion } from "framer-motion";
import { Scale, Users, Building2, ArrowRight, ShieldCheck, Check, Sparkles, Server } from "lucide-react";

export type UserRole = "citizen" | "government" | "judge" | "it";

interface RoleSelectorProps {
  onSelect: (role: UserRole) => void;
  selected?: UserRole;
}

const roles = [
  {
    id: "citizen" as UserRole,
    icon: Users,
    title: "ภาคประชาชน",
    subtitle: "ประชาชนทั่วไป / ผู้เสียหาย",
    desc: "ค้นหาข้อมูลกฎหมายและขั้นตอนการดำเนินคดีด้วยภาษาที่เข้าใจง่าย เพื่อช่วยให้ประชาชนเข้าถึงกระบวนการยุติธรรมได้สะดวกขึ้น",
    features: ["ค้นหาด้วยภาษาธรรมชาติ", "ช่วยเตรียมคำฟ้องเบื้องต้น", "ผู้ช่วยตอบข้อมูลกฎหมายเบื้องต้น"],
    color: "teal",
    accent: "bg-teal text-white shadow-teal/30",
  },
  {
    id: "government" as UserRole,
    icon: Building2,
    title: "ภาคธุรการศาล",
    subtitle: "เจ้าหน้าที่ศาล / ข้าราชการธุรการ",
    desc: "ระบบสนับสนุนงานธุรการศาล สำหรับจัดการสำนวนคดี รับคำฟ้อง คัดกรองเอกสาร และติดตามสถานะคดีอย่างเป็นระบบ",
    features: ["คัดกรองคำฟ้องด้วย AI", "จัดการสำนวนและติดตามคดี", "นำเข้าข้อมูลและตรวจสอบบันทึกย้อนหลัง"],
    color: "accent",
    accent: "bg-gold text-navy-deep shadow-gold/30",
  },
  {
    id: "judge" as UserRole,
    icon: Scale,
    title: "ระบบตุลาการ",
    subtitle: "ผู้พิพากษา / ตุลาการศาลปกครอง",
    desc: "เครื่องมือสนับสนุนการพิจารณาคดี ช่วยสืบค้นแนวคำพิพากษา วิเคราะห์ประเด็น และจัดเตรียมโครงร่างคำพิพากษาเบื้องต้น",
    features: ["สืบค้นแนวฎีกาและคำวินิจฉัย", "จัดเตรียมโครงร่างคำพิพากษา", "แสดงหลักเกณฑ์ความเป็นธรรมของระบบ"],
    color: "primary",
    accent: "bg-navy-deep text-white shadow-navy/30",
  },
  {
    id: "it" as UserRole,
    icon: Server,
    title: "ฝ่ายเทคโนโลยีสารสนเทศ",
    subtitle: "ฝ่ายไอที / ผู้ดูแลระบบ",
    desc: "ศูนย์ควบคุมสำหรับติดตามระบบ ตรวจสอบย้อนหลัง ประเมินคุณภาพ และเตรียมความพร้อมก่อนขยายการใช้งาน AI ในศาล",
    features: ["ติดตามตัวชี้วัดและเหตุผิดปกติ", "ตรวจบันทึกย้อนหลัง PII และการปล่อยใช้งาน", "กำกับการนำเข้าข้อมูลและผลประเมินระบบ"],
    color: "teal",
    accent: "bg-teal text-white shadow-teal/30",
  },
];

const RoleSelector = ({ onSelect, selected }: RoleSelectorProps) => {
  return (
    <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
      {roles.map((role, i) => {
        const isSelected = selected === role.id;
        return (
          <motion.div
            key={role.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.6 }}
            className="flex h-full"
          >
            <button
              onClick={() => onSelect(role.id)}
              className={`group relative flex flex-col w-full text-left bg-white/95 backdrop-blur-md rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden shadow-xl float-card ${
                isSelected
                  ? "border-primary ring-8 ring-primary/5 scale-[1.03]"
                  : "border-white/30 hover:border-primary/40"
              }`}
            >
              {/* ขีดเส้นสีประจำหมวด */}
              <div className={`h-1.5 w-full ${
                  role.color === 'teal' ? 'bg-gradient-to-r from-teal to-teal/40' : role.color === 'accent' ? 'bg-gradient-to-r from-gold to-gold/40' : 'bg-gradient-to-r from-primary to-primary/40'
              }`} />

              <div className="p-8 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-8">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${
                    role.color === 'teal' ? 'bg-teal/10 text-teal' : role.color === 'accent' ? 'bg-gold/10 text-gold' : 'bg-primary/10 text-primary'
                  }`}>
                    <role.icon className="w-8 h-8" />
                  </div>
                  {isSelected && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="p-2 rounded-full bg-primary/10 text-primary border border-primary/20">
                      <ShieldCheck className="w-5 h-5" />
                    </motion.div>
                  )}
                </div>

                <div className="mb-2">
                  <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${
                    role.color === 'teal' ? 'text-teal' : role.color === 'accent' ? 'text-gold' : 'text-primary'
                  }`}>
                    {role.title}
                  </div>
                  <h3 className="font-heading text-2xl font-black text-navy-deep leading-tight">
                    {role.subtitle}
                  </h3>
                </div>

                <p className="text-muted-foreground text-sm mb-8 leading-relaxed font-medium">
                  {role.desc}
                </p>

                <div className="space-y-3 mb-8 flex-1">
                  {role.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3 text-xs font-bold text-navy-deep/70">
                      <div className="w-5 h-5 rounded-lg bg-muted/50 flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary" strokeWidth={4} />
                      </div>
                      {feature}
                    </div>
                  ))}
                </div>

                {/* ปุ่มเข้าสู่ระบบแบบไทย */}
                <div className={`mt-auto w-full py-4 px-6 rounded-2xl flex items-center justify-between font-black text-sm transition-all duration-300 shadow-lg ${
                  isSelected ? role.accent : "bg-muted text-muted-foreground group-hover:bg-navy-deep group-hover:text-white group-hover:shadow-xl"
                }`}>
                  {isSelected ? "เปิดการทำงานแล้ว" : "เข้าสู่พื้นที่ปฏิบัติงาน"}
                  <ArrowRight className={`w-5 h-5 transition-transform duration-300 ${isSelected ? "translate-x-0" : "group-hover:translate-x-1"}`} />
                </div>
              </div>

              {/* ตราสัญลักษณ์พื้นหลัง */}
              <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <Sparkles className="w-32 h-32 text-primary" />
              </div>
            </button>
          </motion.div>
        );
      })}
    </div>
  );
};

export default RoleSelector;
