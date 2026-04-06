import { motion } from "framer-motion";
import { Scale, Users, Building2, ArrowRight } from "lucide-react";

export type UserRole = "citizen" | "lawyer" | "government" | "judge";

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
    id: "government" as UserRole,
    icon: Building2,
    title: "เจ้าหน้าที่รัฐ / ธุรการ",
    desc: "ระบบบริหารจัดการข้อมูลศาล คัดกรองคำฟ้อง และดูรายงานสถิติ",
    features: ["คัดกรองคำฟ้องด้วย AI", "ถอดความเสียง", "นำเข้าข้อมูล OpenLaw", "ตรวจสอบ Audit Log"],
    color: "accent",
  },
  {
    id: "judge" as UserRole,
    icon: Scale,
    title: "ตุลาการ / ผู้พิพากษา",
    desc: "เครื่องมือช่วยพิจารณาคดี ร่างคำพิพากษา และค้นหาฎีกาประยุกต์",
    features: ["ร่างคำพิพากษา AI", "ค้นหาฎีกาประยุกต์", "ตรวจความเป็นธรรม (Bias)", "แม่แบบคำสั่ง AI"],
    color: "primary",
  },
];

const colorMap: Record<string, string> = {
  teal: "border-teal bg-teal-light",
  navy: "border-primary bg-secondary",
  accent: "border-accent bg-gold-light",
  primary: "border-primary bg-primary/5",
};

const iconColorMap: Record<string, string> = {
  teal: "text-teal bg-teal-light",
  navy: "text-primary bg-secondary",
  accent: "text-accent bg-gold-light",
  primary: "text-primary bg-primary/10",
};

const RoleSelector = ({ onSelect, selected }: RoleSelectorProps) => {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
