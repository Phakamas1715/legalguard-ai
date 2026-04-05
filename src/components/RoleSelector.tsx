import { motion } from "framer-motion";
import { Scale, Users, Building2, ArrowRight } from "lucide-react";

export type UserRole = "citizen" | "lawyer" | "government";

interface RoleSelectorProps {
  onSelect: (role: UserRole) => void;
  selected?: UserRole;
}

const roles = [
  {
    id: "citizen" as UserRole,
    icon: Users,
    title: "ประชาชนทั่วไป",
    desc: "ค้นหาข้อมูลกฎหมาย คำพิพากษา และขั้นตอนการดำเนินคดีอย่างง่าย",
    features: ["ค้นหาด้วยภาษาธรรมชาติ", "ร่างคำฟ้องอัจฉริยะ", "พยากรณ์ผลคดี", "ค้นหาศาลใกล้เคียง", "ศัพท์กฎหมาย"],
    color: "teal",
  },
  {
    id: "lawyer" as UserRole,
    icon: Scale,
    title: "ทนายความ / นักกฎหมาย",
    desc: "สืบค้นคำพิพากษาเชิงลึก วิเคราะห์สำนวน พร้อมอ้างอิงมาตราและแนวฎีกา",
    features: ["วิเคราะห์สำนวนคดี AI", "พยากรณ์แนวโน้มคดี", "Knowledge Graph", "Prompt Templates", "ส่งออก e-Filing XML"],
    color: "navy",
  },
  {
    id: "government" as UserRole,
    icon: Building2,
    title: "เจ้าหน้าที่รัฐ / ตุลาการ",
    desc: "ร่างคำพิพากษา คัดกรองคำฟ้อง ตรวจสอบความเป็นธรรม พร้อม Audit Log",
    features: ["ร่างคำพิพากษา AI", "PII Masking อัตโนมัติ", "Responsible AI Dashboard", "OpenLaw 160K+ คดี", "Audit Log SHA-256"],
    color: "accent",
  },
];

const colorMap: Record<string, string> = {
  teal: "border-teal bg-teal-light",
  navy: "border-primary bg-secondary",
  accent: "border-accent bg-gold-light",
};

const iconColorMap: Record<string, string> = {
  teal: "text-teal bg-teal-light",
  navy: "text-primary bg-secondary",
  accent: "text-accent bg-gold-light",
};

const RoleSelector = ({ onSelect, selected }: RoleSelectorProps) => {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {roles.map((role, i) => {
        const isSelected = selected === role.id;
        return (
          <motion.button
            key={role.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onSelect(role.id)}
            className={`group relative text-left p-6 rounded-2xl border-2 transition-all duration-300 shadow-card hover:shadow-card-hover ${
              isSelected
                ? `${colorMap[role.color]} border-opacity-100`
                : "bg-card border-border hover:border-primary/30"
            }`}
          >
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${iconColorMap[role.color]}`}>
              <role.icon className="w-7 h-7" />
            </div>
            <h3 className="font-heading text-xl font-bold text-foreground mb-2">
              {role.title}
            </h3>
            <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
              {role.desc}
            </p>
            <ul className="space-y-1.5 mb-4">
              {role.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all">
              เริ่มใช้งาน <ArrowRight className="w-4 h-4" />
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

export default RoleSelector;
