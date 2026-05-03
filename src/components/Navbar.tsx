import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Search, Menu, X, Shield, FileText, Home, Users, Server, Eye,
  Bookmark, Clock, Sparkles, Gavel, Layers, ChevronDown, ShieldCheck, Activity,
  LayoutDashboard, Info, BookOpen, ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logos/legalguard-logo.png";
import {
  roleItems,
  roleFeatureItems,
  resolveCurrentRoleKey,
  type FeatureItem,
  type RoleItem,
} from "@/lib/roleMenuConfig";

// ===== TYPES =====
interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface KnowledgeItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  external?: boolean;
}

// ===== CONSTANTS =====
const navItems: NavItem[] = [
  { path: "/", label: "หน้าแรก", icon: Home },
  { path: "/search", label: "สืบค้นกฎหมาย", icon: Search },
];

const knowledgeItems: KnowledgeItem[] = [
  { label: "สาระความรู้กฎหมาย", icon: BookOpen, path: "/glossary" },
  { label: "เว็บไซต์ศาลยุติธรรม", icon: ExternalLink, path: "https://coj.go.th/", external: true },
  { label: "คลังความรู้กฎหมาย (Kritsadika)", icon: ExternalLink, path: "https://www.krisdika.go.th/", external: true },
  { label: "คู่มือประชาชน", icon: Info, path: "/citizen" },
];

const userItems: NavItem[] = [
  { path: "/bookmarks", label: "บุ๊กมาร์ก", icon: Bookmark },
  { path: "/history", label: "ประวัติ", icon: Clock },
];

// ===== ANIMATION VARIANTS =====
const dropdownVariants = {
  initial: { opacity: 0, y: -10, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.95 }
};

const mobileMenuVariants = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0 }
};

const isFeaturePathActive = (pathname: string, search: string, path: string) => {
  const [targetPath, targetSearch] = path.split("?");
  if (pathname !== targetPath) return false;
  if (!targetSearch) return true;
  return search.replace(/^\?/, "") === targetSearch;
};

// ===== SUBCOMPONENTS =====
const Logo = () => (
  <Link to="/" className="flex items-center gap-4 group">
    <div className="relative">
      <img
        src={logo}
        alt="LegalGuard AI"
        className="w-12 h-12 md:w-14 md:h-14 rounded-2xl shadow-lg group-hover:scale-105 transition-transform duration-500"
        width={56}
        height={56}
        onError={(e) => {
          e.currentTarget.src = 'https://via.placeholder.com/56x56?text=LG';
        }}
      />
      <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-md bg-gold text-[9px] font-black text-navy-deep uppercase shadow-sm">
        ต้นแบบ
      </div>
    </div>
    <div className="hidden sm:block">
      <div className="font-heading text-xl font-black text-primary leading-tight tracking-tight group-hover:text-primary/80 transition-colors">
        LegalGuard <span className="text-gold">AI</span>
      </div>
      <div className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-[0.1em] flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
        แพลตฟอร์ม AI ด้านกฎหมายที่ตรวจสอบย้อนหลังได้
      </div>
    </div>
  </Link>
);

const TrustBadge = () => (
  <div className="hidden xl:flex items-center gap-3 px-5 py-3 rounded-2xl bg-teal-light/40 border border-teal/20 backdrop-blur-md shadow-sm pointer-events-none group">
    <div className="relative">
      <ShieldCheck className="w-4 h-4 text-teal animate-pulse" />
      <div className="absolute inset-0 bg-teal blur-md opacity-20" />
    </div>
      <div className="flex flex-col">
        <span className="text-[9px] font-black text-teal uppercase tracking-widest leading-none">ความเชื่อมั่นและความเป็นส่วนตัว</span>
        <span className="text-[10px] font-bold text-navy-deep/60 leading-tight">แสดงผลอย่างรับผิดชอบและตรวจสอบย้อนหลังได้</span>
      </div>
  </div>
);

const DesktopNavItem = ({ item, isActive }: { item: NavItem; isActive: boolean }) => (
  <Link
    to={item.path}
    className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${isActive
        ? "text-white shadow-xl"
        : "text-muted-foreground hover:text-foreground hover:bg-white/50"
      }`}
  >
    {isActive && (
      <motion.div
        layoutId="active-pill"
        className="absolute inset-0 bg-navy-deep rounded-xl -z-10"
        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      />
    )}
    <item.icon className={`w-4 h-4 ${isActive ? "text-gold" : ""}`} />
    {item.label}
  </Link>
);

const KnowledgeDropdown = ({
  isOpen,
  onToggle,
  onClose
}: {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="สาระความรู้เมนู"
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${isOpen ? "text-primary bg-white shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
      >
        <BookOpen className="w-4 h-4" />
        สาระความรู้
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={dropdownVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50 p-2"
          >
            {knowledgeItems.map((item, idx) => (
              item.external ? (
                <a
                  key={idx}
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-colors"
                  onClick={onClose}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </a>
              ) : (
                <Link
                  key={idx}
                  to={item.path}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-colors"
                  onClick={onClose}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const RoleSelector = ({
  isOpen,
  onToggle,
  onClose,
  currentRole
}: {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  currentRole?: RoleItem;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="เลือกบทบาทการใช้งาน"
        className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-black transition-all shadow-md group ${currentRole
            ? "text-white bg-navy-deep hover:bg-black"
            : "text-primary bg-primary/5 hover:bg-primary/10 border border-primary/10"
          }`}
      >
        <LayoutDashboard className={`w-4 h-4 ${currentRole ? "text-gold" : "text-primary"}`} />
        {currentRole ? currentRole.label : "ศูนย์รวมแดชบอร์ด"}
        <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-500 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={dropdownVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 25 }}
            className="absolute top-full right-0 mt-3 w-80 bg-card/95 backdrop-blur-2xl border border-border rounded-[2rem] shadow-2xl p-3 z-50 origin-top-right overflow-hidden shadow-navy-deep/20"
          >
            <div className="px-4 py-3 mb-2 border-b border-border">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">เลือกพื้นที่ปฏิบัติงาน</p>
              <p className="text-xs text-muted-foreground font-medium">เข้าสู่ระบบตามขอบเขตภารกิจของคุณ</p>
            </div>
            {roleItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-start gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group/item ${location.pathname === item.path
                    ? "bg-navy-deep text-white shadow-lg"
                    : "hover:bg-primary/5 text-foreground"
                  }`}
              >
                <div className={`p-2.5 rounded-xl transition-colors ${location.pathname === item.path
                    ? "bg-white/10 text-gold"
                    : "bg-primary/10 text-primary group-hover/item:bg-primary group-hover/item:text-white"
                  }`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm mb-0.5">{item.label}</div>
                  <div className={`text-[10px] font-medium leading-tight ${location.pathname === item.path ? "text-white/70" : "text-muted-foreground"}`}>
                    {item.desc}
                  </div>
                </div>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FeatureDropdown = ({
  items,
  currentRoleLabel,
}: {
  items: FeatureItem[];
  currentRoleLabel: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div className="relative" data-feature-dropdown ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="เมนูฟีเจอร์ตามบทบาท"
        className="flex items-center gap-2.5 rounded-2xl border border-primary/10 bg-primary/5 px-5 py-3 text-sm font-black text-primary transition-all hover:bg-primary/10"
      >
        <Layers className="h-4 w-4" />
        เมนูฟีเจอร์
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={dropdownVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 z-50 mt-3 w-80 overflow-hidden rounded-[2rem] border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-2xl"
          >
            <div className="mb-2 border-b border-border px-4 py-3">
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">ทางลัดตามบทบาท</p>
              <p className="text-xs font-medium text-muted-foreground">{currentRoleLabel}</p>
            </div>
            {items.map((item) => (
              <Link
                key={`${currentRoleLabel}-${item.path}`}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`group/item flex items-start gap-4 rounded-2xl px-4 py-4 transition-all duration-300 ${
                  isFeaturePathActive(location.pathname, location.search, item.path)
                    ? "bg-navy-deep text-white shadow-lg"
                    : "text-foreground hover:bg-primary/5"
                }`}
              >
                <div className={`rounded-xl p-2.5 transition-colors ${
                  isFeaturePathActive(location.pathname, location.search, item.path)
                    ? "bg-white/10 text-gold"
                    : "bg-primary/10 text-primary group-hover/item:bg-primary group-hover/item:text-white"
                }`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="mb-0.5 text-sm font-bold">{item.label}</div>
                  <div className={`text-[10px] font-medium leading-tight ${
                    isFeaturePathActive(location.pathname, location.search, item.path) ? "text-white/70" : "text-muted-foreground"
                  }`}>{item.desc}</div>
                </div>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MobileMenu = ({
  isOpen,
  onClose,
  currentRole,
  featureItems,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentRole?: RoleItem;
  featureItems: FeatureItem[];
}) => {
  const location = useLocation();

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={mobileMenuVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="md:hidden border-t border-border bg-card/95 backdrop-blur-2xl overflow-hidden shadow-2xl"
        >
          <div className="container mx-auto px-6 py-8 space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-muted/50 border border-border shadow-sm text-center group active:bg-primary transition-colors"
                >
                  <item.icon className="w-6 h-6 text-primary group-active:text-white" />
                  <span className="text-sm font-black text-foreground group-active:text-white">{item.label}</span>
                </Link>
              ))}
            </div>

            <div className="pt-6 border-t border-border">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">เลือกบทบาทการใช้งาน</p>
              <div className="space-y-2">
                {roleItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-border shadow-sm group active:bg-navy-deep transition-all"
                  >
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-active:bg-white/10 group-active:text-gold">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-foreground group-active:text-white">{item.label}</span>
                      <p className="text-xs text-muted-foreground group-active:text-white/70 mt-0.5">{item.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-border">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">บันทึกและประวัติ</p>
              <div className="flex gap-3">
                {userItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className="flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted/50 border border-border shadow-sm hover:bg-primary/5 transition-colors"
                  >
                    <item.icon className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {currentRole && featureItems.length > 0 && (
              <div className="pt-6 border-t border-border">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">
                  เมนูฟีเจอร์ของ {currentRole.label}
                </p>
                <div className="space-y-2">
                  {featureItems.map((item) => (
                    <Link
                      key={`mobile-${item.path}`}
                      to={item.path}
                      onClick={onClose}
                      className={`flex items-center gap-4 p-4 rounded-2xl border shadow-sm group transition-all ${
                        isFeaturePathActive(location.pathname, location.search, item.path)
                          ? "bg-navy-deep border-navy-deep"
                          : "bg-white border-border active:bg-navy-deep"
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl ${
                        isFeaturePathActive(location.pathname, location.search, item.path)
                          ? "bg-white/10 text-gold"
                          : "bg-primary/10 text-primary group-active:bg-white/10 group-active:text-gold"
                      }`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className={`font-bold ${isFeaturePathActive(location.pathname, location.search, item.path) ? "text-white" : "text-foreground group-active:text-white"}`}>{item.label}</span>
                        <p className={`text-xs mt-0.5 ${isFeaturePathActive(location.pathname, location.search, item.path) ? "text-white/70" : "text-muted-foreground group-active:text-white/70"}`}>{item.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ===== MAIN COMPONENT =====
const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const location = useLocation();

  // Handle client-side mounting to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const roleElement = document.querySelector('[data-role-selector]');
      const knowledgeElement = document.querySelector('[data-knowledge-dropdown]');
      const featureElement = document.querySelector('[data-feature-dropdown]');

      if (roleElement && !roleElement.contains(target)) {
        setRoleOpen(false);
      }
      if (knowledgeElement && !knowledgeElement.contains(target)) {
        setKnowledgeOpen(false);
      }
      if (featureElement && !featureElement.contains(target)) {
        const featureButton = featureElement.querySelector("button");
        if (featureButton) {
          (featureButton as HTMLButtonElement).blur();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setRoleOpen(false);
    setKnowledgeOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRoleOpen(false);
        setKnowledgeOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isActivePath = useCallback((path: string) => {
    if (path === "/") return location.pathname === path;
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  const currentRoleKey = useMemo(() => {
    return resolveCurrentRoleKey(location.pathname) ?? roleItems.find((r) => isActivePath(r.path))?.path;
  }, [location.pathname, isActivePath]);

  const currentRole = useMemo(() => roleItems.find((r) => r.path === currentRoleKey), [currentRoleKey]);
  const currentFeatureItems = useMemo(() => (currentRoleKey ? roleFeatureItems[currentRoleKey] ?? [] : []), [currentRoleKey]);

  // Don't render role-specific UI during SSR to avoid hydration mismatch
  const showRoleUI = mounted;

  return (
    <nav className="sticky top-0 z-50 bg-card/85 backdrop-blur-2xl border-b border-border/60 shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-20 md:h-24">
          <Logo />

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1 p-1.5 bg-muted/30 rounded-2xl border border-border/50">
              {navItems.map((item) => (
                <DesktopNavItem
                  key={item.path}
                  item={item}
                  isActive={isActivePath(item.path)}
                />
              ))}

              <div data-knowledge-dropdown>
                <KnowledgeDropdown
                  isOpen={knowledgeOpen}
                  onToggle={() => setKnowledgeOpen(!knowledgeOpen)}
                  onClose={() => setKnowledgeOpen(false)}
                />
              </div>
            </div>

            <div className="h-8 w-px bg-border/60 mx-4" />

            <div data-role-selector>
              <RoleSelector
                isOpen={roleOpen}
                onToggle={() => setRoleOpen(!roleOpen)}
                onClose={() => setRoleOpen(false)}
                currentRole={showRoleUI ? currentRole : undefined}
              />
            </div>

            {showRoleUI && currentRole && currentFeatureItems.length > 0 && (
              <FeatureDropdown items={currentFeatureItems} currentRoleLabel={currentRole.label} />
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* User Action Buttons */}
            <div className="hidden lg:flex items-center gap-2">
              {userItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  title={item.label}
                  className="p-3 rounded-xl bg-muted/50 border border-border/50 text-muted-foreground hover:text-primary hover:bg-white transition-all shadow-sm"
                  aria-label={item.label}
                >
                  <item.icon className="w-5 h-5" />
                </Link>
              ))}
            </div>

            <TrustBadge />

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-3 rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 transition-transform active:scale-95"
              aria-label={mobileOpen ? "ปิดเมนู" : "เปิดเมนู"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        currentRole={showRoleUI ? currentRole : undefined}
        featureItems={showRoleUI ? currentFeatureItems : []}
      />
    </nav>
  );
};

export default Navbar;
