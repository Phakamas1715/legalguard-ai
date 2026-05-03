import { useState, useRef, useEffect } from "react";
import { Search, SlidersHorizontal, X, Scale, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { UserRole } from "./RoleSelector";

interface SearchBarProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  role: UserRole;
  isLoading?: boolean;
  initialQuery?: string;
  initialFilters?: SearchFilters;
}

export interface SearchFilters {
  courtType: string;
  year: string;
  statute: string;
}

const courtTypes = [
  { value: "", label: "ทุกศาล", icon: "⚖️" },
  { value: "supreme", label: "ศาลฎีกา", icon: "🏛️" },
  { value: "appeal", label: "ศาลอุทธรณ์", icon: "📋" },
  { value: "district", label: "ศาลชั้นต้น", icon: "🏢" },
  { value: "admin", label: "ศาลปกครอง", icon: "🏗️" },
];

const years = [
  { value: "", label: "ทุกปี" },
  ...Array.from({ length: 10 }, (_, i) => {
    const y = 2569 - i;
    return { value: String(y), label: `พ.ศ. ${y}` };
  }),
];

const placeholders: Record<UserRole, string> = {
  citizen: "พิมพ์คำถามกฎหมายหรือข้อเท็จจริง เช่น \"ถูกฉ้อโกงต้องทำอย่างไร\"",
  government: "ค้นหากฎหมาย ระเบียบ หรือข้อมูลคำวินิจฉัยที่เกี่ยวข้อง",
  judge: "ค้นหาคดีคล้ายกัน บทบัญญัติ หรือประเด็นข้อกฎหมายที่เกี่ยวข้อง",
  it: "ตรวจสอบสถานะระบบและความปลอดภัยของข้อมูล (IT Admin)",
};

const SearchBar = ({ onSearch, role, isLoading, initialQuery = "", initialFilters }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState<SearchFilters>({
    courtType: "",
    year: "",
    statute: "",
  });
  const [courtSearch, setCourtSearch] = useState("");
  const [showCourtDropdown, setShowCourtDropdown] = useState(false);
  const courtRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (courtRef.current && !courtRef.current.contains(e.target as Node)) {
        setShowCourtDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (!initialFilters) return;
    setFilters(initialFilters);
  }, [initialFilters]);

  const filteredCourts = courtTypes.filter(
    (c) => c.label.includes(courtSearch) || c.value.includes(courtSearch.toLowerCase())
  );

  const selectedCourtLabel = courtTypes.find((c) => c.value === filters.courtType)?.label || "ทุกศาล";

  const activeFilterCount = [filters.courtType, filters.year, filters.statute].filter(Boolean).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), filters);
    }
  };

  const clearFilters = () => {
    setFilters({ courtType: "", year: "", statute: "" });
    setCourtSearch("");
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="relative group">
          <div className="absolute inset-0 bg-accent/20 rounded-[1.25rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <div className="relative flex items-center bg-card border-2 border-border rounded-[1.25rem] shadow-card group-focus-within:border-primary group-focus-within:shadow-lg group-focus-within:shadow-primary/10 transition-all duration-300 overflow-visible gradient-border">
            <Search className="w-6 h-6 text-muted-foreground ml-5 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholders[role]}
              className="flex-1 bg-transparent px-4 py-5 text-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="p-2 text-muted-foreground hover:text-foreground mr-1"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`relative flex items-center justify-center gap-2 h-[52px] px-5 mr-1 rounded-xl transition-all duration-300 ${
                showFilters 
                ? "bg-accent text-accent-foreground shadow-lg shadow-gold/20" 
                : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <SlidersHorizontal className={`w-4.5 h-4.5 ${showFilters ? "animate-pulse" : ""}`} />
              <span className="text-[11px] font-black uppercase tracking-[0.15em] hidden sm:inline leading-none mt-0.5">ตัวกรอง</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 bg-navy-deep text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shrink-0">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="shimmer-overlay flex items-center justify-center gap-2 bg-primary text-primary-foreground h-[72px] px-10 rounded-r-[1.1rem] font-bold text-base hover:bg-navy-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[-10px_0_30px_rgba(0,0,0,0.1)]"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  <span className="leading-none">ค้นหา...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span className="leading-none">ค้นหา</span>
                </>
              )}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-visible !overflow-visible"
            >
              <div className="mt-4 p-5 pt-4 bg-white/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-xl relative overflow-visible">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-gold to-teal rounded-t-2xl" />
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <Scale className="w-5 h-5 text-primary" />
                    <div>
                      <h4 className="text-sm font-bold text-navy-deep uppercase tracking-wider">เงื่อนไขสืบค้น</h4>
                      <p className="text-xs text-muted-foreground">จำกัดขอบเขตผลลัพธ์ให้แม่นยำขึ้น</p>
                    </div>
                  </div>
                  {activeFilterCount > 0 && (
                    <button 
                      type="button" 
                      onClick={clearFilters} 
                      className="px-3 py-1.5 bg-destructive/5 hover:bg-destructive/10 text-destructive rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-destructive/10"
                    >
                      <X className="w-3.5 h-3.5" /> ล้างทั้งหมด
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div ref={courtRef} className="relative">
                    <label className="block text-xs font-bold text-navy-deep mb-1.5 ml-1">ประเภทศาล</label>
                    <button
                      type="button"
                      onClick={() => setShowCourtDropdown(!showCourtDropdown)}
                      className="w-full flex items-center justify-between bg-slate-50/80 border border-border rounded-xl px-4 h-[50px] text-sm text-foreground hover:border-primary/50 transition-all font-semibold"
                    >
                      <span className="truncate leading-none">{selectedCourtLabel}</span>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${showCourtDropdown ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {showCourtDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute z-[100] mt-1 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden"
                        >
                          <div className="p-2">
                            <input
                              type="text"
                              value={courtSearch}
                              onChange={(e) => setCourtSearch(e.target.value)}
                              placeholder="พิมพ์ค้นหาศาล..."
                              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredCourts.map((c) => (
                              <button
                                key={c.value}
                                type="button"
                                onClick={() => {
                                  setFilters({ ...filters, courtType: c.value });
                                  setShowCourtDropdown(false);
                                  setCourtSearch("");
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-muted transition-colors ${
                                  filters.courtType === c.value ? "bg-primary/10 text-primary font-medium" : "text-foreground"
                                }`}
                              >
                                <span>{c.icon}</span>
                                <span>{c.label}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-navy-deep mb-1.5 ml-1">ปี พ.ศ.</label>
                    <div className="relative">
                      <select
                        value={filters.year}
                        onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                        className="w-full bg-slate-50/80 border border-border rounded-xl px-4 h-[50px] text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold appearance-none leading-none"
                      >
                        {years.map((y) => (
                          <option key={y.value} value={y.value} className="bg-white text-foreground">{y.label}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-navy-deep mb-1.5 ml-1">มาตรา / กฎหมาย</label>
                    <input
                      type="text"
                      value={filters.statute}
                      onChange={(e) => setFilters({ ...filters, statute: e.target.value })}
                      placeholder="เช่น 341, พ.ร.บ.คุ้มครองแรงงาน"
                      className="w-full bg-slate-50/80 border border-border rounded-xl px-4 h-[50px] text-sm text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold leading-none"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {role === "citizen" && (
          <>
            <QuickTag onClick={() => setQuery("ถูกฉ้อโกงต้องทำอย่างไร")} label="ฉ้อโกง" />
            <QuickTag onClick={() => setQuery("ค่าปรับจราจร")} label="ค่าปรับจราจร" />
            <QuickTag onClick={() => setQuery("สิทธิผู้บริโภค")} label="สิทธิผู้บริโภค" />
            <QuickTag onClick={() => setQuery("หย่า สิทธิเลี้ยงดูบุตร")} label="ครอบครัว" />
            <QuickTag onClick={() => setQuery("เลิกจ้างไม่เป็นธรรม")} label="แรงงาน" />
          </>
        )}
        {role === "government" && (
          <>
            <QuickTag onClick={() => setQuery("พ.ร.บ. จัดตั้งศาลปกครอง")} label="จัดตั้งศาลปกครอง" />
            <QuickTag onClick={() => setQuery("ระเบียบการยื่นฟ้อง")} label="ระเบียบยื่นฟ้อง" />
            <QuickTag onClick={() => setQuery("สถิติคดี 2568")} label="สถิติคดี" />
          </>
        )}
        {role === "judge" && (
          <>
            <QuickTag onClick={() => setQuery("แนววินิจฉัยคดีปกครอง มาตรา 9")} label="แนววินิจฉัยคดีปกครอง" />
            <QuickTag onClick={() => setQuery("พยานหลักฐานน้ำหนักรับฟังได้")} label="น้ำหนักพยานหลักฐาน" />
            <QuickTag onClick={() => setQuery("คดีคล้ายกันเกี่ยวกับสัญญาทางปกครอง")} label="สัญญาทางปกครอง" />
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/20 bg-teal/5 px-4 py-1.5 font-medium text-teal shadow-sm">
          <ShieldCheck className="h-4 w-4" />
          แสดงระดับความเชื่อถือของผลลัพธ์
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 font-medium text-primary shadow-sm">
          <Scale className="h-4 w-4" />
          แสดงแหล่งข้อมูลและคำแนะนำการใช้งาน
        </span>
      </div>
    </div>
  );
};

const QuickTag = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button
    onClick={onClick}
    className="px-5 py-2 text-sm font-semibold bg-white text-navy-deep rounded-full hover:bg-primary hover:text-primary-foreground transition-all duration-300 border border-border/80 hover:border-primary shadow-sm hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 active:translate-y-0"
  >
    {label}
  </button>
);

const ChevronDown = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export default SearchBar;
