import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, Menu, X, Shield, FileText, Home, Users, Server, Eye, Scale, Bookmark, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/legalguard-logo.png";

const navItems = [
  { path: "/", label: "หน้าแรก", icon: Home },
  { path: "/search", label: "สืบค้น", icon: Search },
  { path: "/complaint-form", label: "ร่างคำฟ้อง", icon: FileText },
  { path: "/demo", label: "ขั้นตอนระบบ", icon: Eye },
];

const userItems = [
  { path: "/bookmarks", label: "บุ๊กมาร์ก", icon: Bookmark },
  { path: "/history", label: "ประวัติ", icon: Clock },
];

const roleItems = [
  { path: "/citizen", label: "ประชาชน", icon: Users },
  { path: "/lawyer", label: "ทนายความ", icon: Scale },
  { path: "/government", label: "เจ้าหน้าที่", icon: Shield },
  { path: "/it", label: "ระบบ IT", icon: Server },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setRoleOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentRole = roleItems.find(r => location.pathname.startsWith(r.path));

  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src={logo}
              alt="LegalGuard AI"
              className="w-10 h-10 md:w-12 md:h-12 rounded-full"
              width={48}
              height={48}
            />
            <div className="hidden sm:block">
              <div className="font-heading text-lg font-bold text-primary leading-tight">
                Smart LegalGuard AI
              </div>
              <div className="text-xs text-muted-foreground leading-tight">
                กระทรวงยุติธรรม
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "text-primary bg-secondary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full"
                    />
                  )}
                </Link>
              );
            })}

            {/* Role selector dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setRoleOpen(!roleOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentRole
                    ? "text-primary bg-secondary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Users className="w-4 h-4" />
                {currentRole ? currentRole.label : "แดชบอร์ด"}
                <svg className={`w-3 h-3 transition-transform ${roleOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <AnimatePresence>
                {roleOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute top-full right-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50"
                  >
                    {roleItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setRoleOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                          location.pathname === item.path
                            ? "text-primary bg-secondary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* User icon buttons — bookmarks & history */}
          <div className="hidden md:flex items-center gap-1">
            {userItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={item.label}
                  className={`relative p-2 rounded-lg transition-colors ${
                    isActive
                      ? "text-primary bg-secondary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator-user"
                      className="absolute bottom-0 left-1 right-1 h-0.5 bg-accent rounded-full"
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Trust badge */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground bg-teal-light px-3 py-1.5 rounded-full">
            <Shield className="w-3.5 h-3.5 text-teal" />
            <span className="text-teal font-medium">ข้อมูลปลอดภัย PDPA</span>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="เปิดเมนู"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-border bg-card overflow-hidden"
          >
            <div className="container mx-auto px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                      isActive
                        ? "text-primary bg-secondary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
              <div className="border-t border-border pt-2 mt-2">
                <p className="px-4 py-1 text-xs text-muted-foreground">บัญชีของฉัน</p>
                {userItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        isActive
                          ? "text-primary bg-secondary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
              <div className="border-t border-border pt-2 mt-2">
                <p className="px-4 py-1 text-xs text-muted-foreground">แดชบอร์ดตามบทบาท</p>
                {roleItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        isActive
                          ? "text-primary bg-secondary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
