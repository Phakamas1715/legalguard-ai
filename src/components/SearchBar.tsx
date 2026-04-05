import { useState, useRef, useEffect } from "react";
import { Search, SlidersHorizontal, X, Scale } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { UserRole } from "./RoleSelector";

interface SearchBarProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  role: UserRole;
  isLoading?: boolean;
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
  citizen: "พิมพ์คำถามของคุณ เช่น \"ถูกฉ้อโกงต้องทำอย่างไร\"",
  lawyer: "สืบค้น เช่น \"ฉ้อโกง มาตรา 341 ศาลฎีกา\"",
  government: "ค้นหากฎหมาย ระเบียบ เช่น \"พ.ร.บ. จัดตั้งศาลปกครอง\"",
};

const SearchBar = ({ onSearch, role, isLoading }: SearchBarProps) => {
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

  // Close court dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (courtRef.current && !courtRef.current.contains(e.target as Node)) {
        setShowCourtDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
        {/* Main search input */}
        <div className="relative group">
          <div className="absolute inset-0 bg-accent/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <div className="relative flex items-center bg-card border-2 border-border rounded-2xl shadow-card group-focus-within:border-primary group-focus-within:shadow-card-hover transition-all overflow-hidden">
            <Search className="w-6 h-6 text-muted-foreground ml-5 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholders[role]}
              className="flex-1 bg-transparent px-4 py-5 text-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              aria-label="ค้นหากฎหมาย"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="p-2 text-muted-foreground hover:text-foreground mr-1"
                aria-label="ล้างข้อความ"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`relative p-3 mr-1 rounded-xl transition-colors ${
                showFilters ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
              aria-label="ตัวกรอง"
            >
              <SlidersHorizontal className="w-5 h-5" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-5 font-semibold text-base hover:bg-navy-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ค้นหา...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  ค้นหา
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 p-5 bg-card/80 backdrop-blur-sm border border-border rounded-2xl shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Scale className="w-4 h-4 text-primary" />
                    ตัวกรองการค้นหา
                  </span>
                  {activeFilterCount > 0 && (
                    <button type="button" onClick={clearFilters} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                      ล้างตัวกรอง
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Court type — searchable dropdown */}
                  <div ref={courtRef} className="relative">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">ประเภทศาล</label>
                    <button
                      type="button"
                      onClick={() => setShowCourtDropdown(!showCourtDropdown)}
                      className="w-full flex items-center justify-between bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground hover:border-primary/50 transition-colors"
                    >
                      <span>{selectedCourtLabel}</span>
                      <svg className={`w-4 h-4 text-muted-foreground transition-transform ${showCourtDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <AnimatePresence>
                      {showCourtDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute z-50 mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden"
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
                            {filteredCourts.length === 0 && (
                              <p className="px-3 py-2 text-sm text-muted-foreground">ไม่พบศาลที่ค้นหา</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Year */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">ปี พ.ศ.</label>
                    <select
                      value={filters.year}
                      onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                      className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    >
                      {years.map((y) => (
                        <option key={y.value} value={y.value}>{y.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Statute */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">มาตรา / กฎหมาย</label>
                    <input
                      type="text"
                      value={filters.statute}
                      onChange={(e) => setFilters({ ...filters, statute: e.target.value })}
                      placeholder="เช่น 341, พ.ร.บ.คุ้มครองแรงงาน"
                      className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {role === "citizen" && (
          <>
            <QuickTag onClick={() => { setQuery("ถูกฉ้อโกงต้องทำอย่างไร"); }} label="🔍 ฉ้อโกง" />
            <QuickTag onClick={() => { setQuery("ค่าปรับจราจร"); }} label="🚗 ค่าปรับจราจร" />
            <QuickTag onClick={() => { setQuery("สิทธิผู้บริโภค"); }} label="🛒 สิทธิผู้บริโภค" />
            <QuickTag onClick={() => { setQuery("หย่า สิทธิเลี้ยงดูบุตร"); }} label="👨‍👩‍👧 ครอบครัว" />
            <QuickTag onClick={() => { setQuery("เลิกจ้างไม่เป็นธรรม"); }} label="💼 แรงงาน" />
          </>
        )}
        {role === "lawyer" && (
          <>
            <QuickTag onClick={() => { setQuery("ฉ้อโกง มาตรา 341"); }} label="⚖️ มาตรา 341" />
            <QuickTag onClick={() => { setQuery("คดีขับไล่ ศาลฎีกา"); }} label="🏠 คดีขับไล่" />
            <QuickTag onClick={() => { setQuery("อายุความฉ้อโกง"); }} label="⏰ อายุความ" />
            <QuickTag onClick={() => { setQuery("ครอบครองปรปักษ์ มาตรา 1382"); }} label="🏗️ ปรปักษ์" />
          </>
        )}
        {role === "government" && (
          <>
            <QuickTag onClick={() => { setQuery("พ.ร.บ. จัดตั้งศาลปกครอง"); }} label="🏛️ จัดตั้งศาลปกครอง" />
            <QuickTag onClick={() => { setQuery("ระเบียบการยื่นฟ้อง"); }} label="📋 ระเบียบยื่นฟ้อง" />
            <QuickTag onClick={() => { setQuery("สถิติคดี 2568"); }} label="📊 สถิติคดี" />
          </>
        )}
      </div>
    </div>
  );
};

const QuickTag = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button
    onClick={onClick}
    className="px-4 py-1.5 text-sm bg-secondary text-secondary-foreground rounded-full hover:bg-primary hover:text-primary-foreground transition-colors border border-border hover:border-primary"
  >
    {label}
  </button>
);

export default SearchBar;
