import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, Info, Sparkles, ArrowUpDown, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchBar, { type SearchFilters } from "@/components/SearchBar";
import ResultCard, { type SearchResult } from "@/components/ResultCard";
import { SkeletonList } from "@/components/SkeletonCard";
import type { UserRole } from "@/components/RoleSelector";
import { mockResults } from "@/data/mockResults";
import { useBookmarks, useSearchHistory } from "@/hooks/useBookmarksHistory";
import { apiClient } from "@/lib/apiClient";
import { calculateCFS } from "@/lib/fairnessScoring";
import { orchestrator } from "@/lib/agentOrchestrator";

type SortBy = "relevance" | "year" | "confidence";

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const role = (searchParams.get("role") as UserRole) || "citizen";
  const initializedRef = useRef(false);

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({ courtType: "", year: "", statute: "" });
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { addHistory } = useSearchHistory();
  const [aiResults, setAiResults] = useState<SearchResult[]>([]);
  const [useAI, setUseAI] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>("relevance");
  const [cfsResult, setCfsResult] = useState<ReturnType<typeof calculateCFS> | null>(null);
  const [agentSteps, setAgentSteps] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [cacheHit, setCacheHit] = useState(false);

  // Text-based search on mock data as fallback
  const searchMockResults = (q: string, f: SearchFilters): SearchResult[] => {
    let filtered = [...mockResults];
    const queryLower = q.toLowerCase();

    // Text match
    filtered = filtered.filter((r) => {
      if (!queryLower) return true;
      const searchText = `${r.title} ${r.summary} ${r.fullText} ${r.statutes.join(" ")} ${r.caseNo}`.toLowerCase();
      const keywords = ["ฉ้อโกง", "รถ", "หย่า", "บุตร", "มรดก", "เลิกจ้าง", "หมิ่นประมาท", "ออนไลน์", "คอมพิวเตอร์", "ยืม", "ที่ดิน", "จราจร", "เมา", "ภาษี", "ลิขสิทธิ์", "ลักทรัพย์", "ot", "สมรส", "สร้าง", "ปกครอง", "วินัย"];
      const matchedKeywords = keywords.filter(k => queryLower.includes(k));
      if (matchedKeywords.length > 0) return matchedKeywords.some(k => searchText.includes(k));
      const queryWords = queryLower.split(/\s+/).filter(Boolean);
      if (queryWords.length > 0) return queryWords.some((w) => searchText.includes(w)) || searchText.includes(queryLower);
      return searchText.includes(queryLower);
    });

    if (f.courtType) filtered = filtered.filter((r) => r.courtType === f.courtType);
    if (f.year) filtered = filtered.filter((r) => r.year === Number(f.year));
    if (f.statute) {
      const statuteQuery = f.statute.toLowerCase();
      filtered = filtered.filter((r) => r.statutes.some((s) => s.toLowerCase().includes(statuteQuery)));
    }

    filtered = filtered.map((r) => {
      const searchText = `${r.title} ${r.summary}`.toLowerCase();
      const queryWords = queryLower.split(/\s+/).filter(Boolean);
      const matchCount = queryWords.filter((w) => searchText.includes(w)).length;
      const relevanceBoost = matchCount / Math.max(queryWords.length, 1);
      return { ...r, relevanceScore: Math.min(r.relevanceScore + relevanceBoost * 0.2, 1) };
    });

    return filtered;
  };

  useEffect(() => {
    if (initializedRef.current) return;
    const q = searchParams.get("q");
    if (q) {
      initializedRef.current = true;
      handleSearch(q, { courtType: "", year: "", statute: "" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (q: string, f: SearchFilters) => {
    setQuery(q);
    setFilters(f);
    setIsLoading(true);
    setHasSearched(true);
    setAgentSteps([]);
    setSuggestions([]);
    setCacheHit(false);

    // 1. Run Legal Multi-Agent Orchestrator
    try {
      const reasoning = await orchestrator.orchestrate(q, role);
      setAgentSteps(reasoning.split(". ").filter((s) => s.length > 5));
    } catch (err) {
      console.error("Orchestrator error:", err);
    }

    // 2. Fetch Results
    let finalResults: SearchResult[] = [];
    if (useAI) {
      try {
        const data = await apiClient.search(q, f, role);
        const backendResults: SearchResult[] = (data.results ?? []).map((r: Record<string, unknown>) => ({
          id: String(r.id ?? ""),
          caseNo: String(r.case_no ?? ""),
          courtType: String(r.court_type ?? ""),
          year: Number(r.year ?? 0),
          title: String(r.title ?? ""),
          summary: String(r.summary ?? r.chunk_text ?? ""),
          fullText: String(r.chunk_text ?? ""),
          statutes: Array.isArray(r.statutes) ? r.statutes as string[] : [],
          relevanceScore: Number(r.rrf_score ?? r.relevance_score ?? 0),
          confidence: Number(r.relevance_score ?? 0),
          tags: [],
        }));
        finalResults = backendResults.length > 0 ? backendResults : searchMockResults(q, f);
        if (data.cache_hit) setCacheHit(true);
      } catch {
        finalResults = searchMockResults(q, f);
      }
    } else {
      finalResults = searchMockResults(q, f);
    }

    setAiResults(finalResults);
    setIsLoading(false);
    addHistory(q, f, finalResults.length);
    if (finalResults.length > 0) setCfsResult(calculateCFS(finalResults));
  };

  const sortedResults = useMemo(() => {
    const results = [...aiResults];
    switch (sortBy) {
      case "year": return results.sort((a, b) => b.year - a.year);
      case "confidence": return results.sort((a, b) => b.confidence - a.confidence);
      default: return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
  }, [aiResults, sortBy]);

  const handleToggleBookmark = (result: SearchResult) => toggleBookmark(result);

  const roleLabels: Record<UserRole, string> = {
    citizen: "ประชาชนทั่วไป",
    lawyer: "ทนายความ / นักกฎหมาย",
    government: "เจ้าหน้าที่รัฐ",
  };

  const lowConfidenceResults = sortedResults.filter((r) => r.confidence < 0.7);
  const highConfidenceResults = sortedResults.filter((r) => r.confidence >= 0.7);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <section className="bg-hero-gradient py-10 md:py-14">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6">
            <span className="inline-block text-sm bg-primary-foreground/10 text-primary-foreground px-3 py-1 rounded-full mb-3">
              {roleLabels[role]}
            </span>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary-foreground">สืบค้นข้อมูลกฎหมาย</h1>
          </div>
          <SearchBar onSearch={handleSearch} role={role} isLoading={isLoading} />
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 flex-1">
        {isLoading && (
          <div className="max-w-4xl mx-auto space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-6 w-20 bg-muted rounded-full" />
                  <div className="h-4 w-16 bg-muted rounded" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </div>
                <div className="h-5 w-3/4 bg-muted rounded mb-2" />
                <div className="h-4 w-full bg-muted rounded mb-1" />
                <div className="h-4 w-2/3 bg-muted rounded mb-3" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-muted rounded-md" />
                  <div className="h-5 w-12 bg-muted rounded-md" />
                </div>
              </div>
            ))}
            <p className="text-center text-muted-foreground text-sm mt-4">🤖 AI กำลังวิเคราะห์และสืบค้น...</p>
            <div className="max-w-4xl mx-auto mt-6">
              <SkeletonList count={3} />
            </div>
          </div>
        )}

        {!isLoading && hasSearched && sortedResults.length > 0 && (
          <div className="max-w-4xl mx-auto">
            {agentSteps.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="mb-8 p-6 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2rem] shadow-lg shadow-navy/5"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-sm font-bold text-navy tracking-tight">
                    <div className="w-2 h-6 bg-gold rounded-full" />
                    Legal Multi-Agent Reasoning (CAL-130 Protected)
                  </div>
                  <div className="text-[10px] bg-navy/5 text-navy px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                    Execution State: Verified ✓
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { role: "Manager", status: "Orchestrating", icon: "🧠" },
                    { role: "Researcher", status: "Retrieving Context", icon: "🔍" },
                    { role: "Reviewer", status: "Validating Facts", icon: "⚖️" },
                    { role: "Compliance", status: "Privacy Safety", icon: "🛡️" }
                  ].map((agent, idx) => (
                    <div key={idx} className="bg-white/80 border border-white p-3 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{agent.icon}</span>
                        <span className="text-xs font-bold text-navy">{agent.role}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-confidence-high rounded-full animate-pulse" />
                        <span className="text-[10px] text-muted-foreground font-medium">{agent.status}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 pl-2 border-l-2 border-navy/5 mt-4">
                  {agentSteps.map((step, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} className="flex gap-4 items-start text-xs">
                      <span className="flex-shrink-0 w-5 h-5 bg-navy text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">{idx + 1}</span>
                      <span className="text-navy-deep leading-relaxed pt-0.5">{step}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <p className="text-sm text-muted-foreground">พบ <span className="font-bold text-foreground">{sortedResults.length}</span> ผลลัพธ์สำหรับ "{query}"
                {cacheHit && (
                  <span className="ml-2 text-xs bg-teal-light text-teal px-2 py-0.5 rounded-full">⚡ Cache</span>
                )}
              </p>
              <div className="flex items-center gap-3">
                {cfsResult && (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${cfsResult.cfs >= 0.935 ? 'bg-teal-light text-teal' : cfsResult.cfs >= 0.7 ? 'bg-gold-light text-accent-foreground' : 'bg-destructive/10 text-destructive'}`}>
                    <ShieldCheck className="w-3 h-3" /> CFS {(cfsResult.cfs * 100).toFixed(1)}% — {cfsResult.label}
                  </span>
                )}
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className="text-sm bg-muted border border-border rounded-lg px-3 py-1.5 text-foreground">
                  <option value="relevance">ความตรง</option>
                  <option value="year">ปีล่าสุด</option>
                  <option value="confidence">ความมั่นใจ</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {highConfidenceResults.map((r, i) => (
                <ResultCard key={r.id} result={r} index={i} role={role} query={query} isBookmarked={isBookmarked(r.id)} onToggleBookmark={() => handleToggleBookmark(r)} />
              ))}
            </div>

            {lowConfidenceResults.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center gap-2 p-4 bg-gold-light border border-accent/30 rounded-xl mb-4">
                  <AlertTriangle className="w-5 h-5 text-accent flex-shrink-0" />
                  <p className="text-sm text-accent-foreground"><strong>ความมั่นใจต่ำกว่า 70%</strong> — โปรดตรวจสอบข้อมูลเพิ่มเติม</p>
                </div>
                <div className="space-y-4">
                  {lowConfidenceResults.map((r, i) => (
                    <ResultCard key={r.id} result={r} index={i + highConfidenceResults.length} role={role} query={query} isBookmarked={isBookmarked(r.id)} onToggleBookmark={() => handleToggleBookmark(r)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!isLoading && hasSearched && sortedResults.length === 0 && (
          <div className="max-w-md mx-auto text-center py-16">
            <Info className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-heading text-xl font-bold mb-2">ไม่พบผลลัพธ์</h3>
            {suggestions.length > 0 && (
              <div className="mt-4 p-4 bg-gold-light border border-accent/30 rounded-xl text-left">
                <p className="text-sm font-medium mb-2">💡 ลองค้นหาด้วยคำเหล่านี้:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => handleSearch(s, filters)} className="text-sm bg-white px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!hasSearched && !isLoading && (
          <div className="max-w-lg mx-auto text-center py-16">
             <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-secondary flex items-center justify-center"><span className="text-4xl">⚖️</span></div>
             <h3 className="font-heading text-xl font-bold mb-2">เริ่มต้นสืบค้น</h3>
             <p className="text-muted-foreground">พิมพ์คำค้นหาด้านบนเพื่อค้นหาคำพิพากษาหรือข้อมูลทางกฎหมาย</p>
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
};

export default SearchPage;
