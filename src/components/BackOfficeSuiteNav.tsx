import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Building2, Scale, Server } from "lucide-react";

const suiteItems = [
  {
    title: "ศูนย์รวมแดชบอร์ดหลังบ้าน",
    desc: "ภาพรวมระบบหลังบ้านทั้งหมด",
    path: "/back-office",
    icon: LayoutDashboard,
  },
  {
    title: "พื้นที่ช่วยงานธุรการ",
    desc: "งานรับคำร้องและงานธุรการศาล",
    path: "/clerk-copilot",
    icon: Building2,
  },
  {
    title: "พื้นที่ช่วยงานผู้พิพากษา",
    desc: "เครื่องมือสนับสนุนผู้พิพากษา",
    path: "/judge-workbench",
    icon: Scale,
  },
  {
    title: "ศูนย์ควบคุมการใช้ AI",
    desc: "ติดตามระบบ บันทึกย้อนหลัง และกำกับดูแลการใช้งาน",
    path: "/ai-control-tower",
    icon: Server,
  },
];

const BackOfficeSuiteNav = () => {
  const location = useLocation();

  return (
    <div className="rounded-[2rem] border border-border bg-white/80 p-3 shadow-card backdrop-blur-xl">
      <div className="grid gap-3 md:grid-cols-4">
        {suiteItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`rounded-[1.5rem] border px-4 py-4 transition-all ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-lg"
                  : "border-border bg-card hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                  isActive ? "bg-white/15" : "bg-primary/10 text-primary"
                }`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-tight">{item.title}</p>
                  <p className={`mt-1 text-xs leading-relaxed ${
                    isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                  }`}>
                    {item.desc}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BackOfficeSuiteNav;
