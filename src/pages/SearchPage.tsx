import { useState, useMemo, useEffect, useRef, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, BadgeCheck, Database, FileSearch, Info, Scale, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-courthouse.jpg";
import SearchBar, { type SearchFilters } from "@/components/SearchBar";
import ResultCard, { type SearchResult } from "@/components/ResultCard";
import { SkeletonList } from "@/components/SkeletonCard";
import type { UserRole } from "@/components/RoleSelector";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { useBookmarks, useSearchHistory } from "@/hooks/useBookmarksHistory";
import { WORKSPACE_STORAGE_KEYS } from "@/lib/flowWorkspace";
import { memory, type MemoryStats } from "@/lib/layeredMemory";
import { apiClient } from "@/lib/apiClient";
import { calculateCFS } from "@/lib/fairnessScoring";

type SortBy = "relevance" | "year" | "confidence";
const SEARCH_RESULTS_STORAGE_KEY = "lg-last-search-results";
const SEARCH_WORKSPACE_STORAGE_KEY = WORKSPACE_STORAGE_KEYS.search;
const EMPTY_SEARCH_RESULTS: SearchResult[] = [];
const TRUST_SIGNAL_COPY = [
  {
    title: "ค้นหาตามบริบท",
    detail: "ค้นหาตามบริบทกฎหมายและข้อเท็จจริง ไม่ใช่เฉพาะ keyword",
    icon: FileSearch,
  },
  {
    title: "ที่มาโปร่งใส",
    detail: "ผลลัพธ์แสดง source code, metadata และลิงก์ต้นฉบับเมื่อมีข้อมูล",
    icon: Database,
  },
  {
    title: "ใช้อย่างรับผิดชอบ",
    detail: "มีระดับความเชื่อถือและคำแนะนำการใช้งานทุกผลลัพธ์",
    icon: ShieldCheck,
  },
];

interface SearchWorkspaceState {
  role: UserRole;
  query: string;
  filters: SearchFilters;
  sortBy: SortBy;
  resultCount: number;
  updatedAt: number;
}

const normalizeCourtType = (value: unknown): SearchResult["courtType"] => {
  switch (String(value ?? "").toLowerCase()) {
    case "appeal":
      return "appeal";
    case "district":
      return "district";
    case "admin":
    case "administrative":
      return "admin";
    default:
      return "supreme";
  }
};

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
  const [sortBy, setSortBy] = useState<SortBy>("relevance");
  const [cfsResult, setCfsResult] = useState<ReturnType<typeof calculateCFS> | null>(null);
  const [agentSteps, setAgentSteps] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [cacheHit, setCacheHit] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [memoryStats, setMemoryStats] = useState<MemoryStats>(() => memory.getStats());
  const [restoredWorkspace, setRestoredWorkspace] = useState<SearchWorkspaceState | null>(null);
  const backendStatus = useBackendStatus();

  useEffect(() => {
    if (initializedRef.current) return;
    const q = searchParams.get("q");
    if (q) {
      initializedRef.current = true;
      handleSearch(q, { courtType: "", year: "", statute: "" });
      return;
    }
    if (typeof window === "undefined") return;

    const rawWorkspace = window.localStorage.getItem(SEARCH_WORKSPACE_STORAGE_KEY);
    if (!rawWorkspace) return;

    try {
      const parsed = JSON.parse(rawWorkspace) as SearchWorkspaceState;
      if (parsed.role !== role) return;
      setQuery(parsed.query);
      setFilters(parsed.filters);
      setSortBy(parsed.sortBy);
      setRestoredWorkspace(parsed);
    } catch {
      window.localStorage.removeItem(SEARCH_WORKSPACE_STORAGE_KEY);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restoredWorkspace || !query.trim()) return;
    const nextWorkspace: SearchWorkspaceState = {
      ...restoredWorkspace,
      role,
      query,
      filters,
      sortBy,
    };
    persistWorkspace(nextWorkspace);
    setRestoredWorkspace(nextWorkspace);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  const persistWorkspace = (workspace: SearchWorkspaceState) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SEARCH_WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
  };

  const handleSearch = async (q: string, f: SearchFilters) => {
    setQuery(q);
    setFilters(f);
    setIsLoading(true);
    setHasSearched(true);
    setAgentSteps([]);
    setSuggestions([]);
    setCacheHit(false);
    setErrorMessage("");
    setCfsResult(null);

    try {
      const data = await apiClient.search(q, f, role);
      const backendResults: SearchResult[] = (data.results ?? []).map((r: Record<string, unknown>) => ({
        id: String(r.id ?? ""),
        caseNo: String(r.case_no ?? ""),
        courtType: normalizeCourtType(r.court_type),
        year: Number(r.year ?? 0),
        title: String(r.title ?? ""),
        summary: String(r.summary ?? r.chunk_text ?? ""),
        fullText: String(r.chunk_text ?? ""),
        statutes: Array.isArray(r.statutes) ? (r.statutes as string[]) : [],
        relevanceScore: Number(r.rrf_score ?? r.relevance_score ?? 0),
        confidence: Number(r.relevance_score ?? 0),
        province: typeof r.province === "string" ? r.province : undefined,
        link: typeof r.link === "string" ? r.link : undefined,
        sourceCode: typeof r.source_code === "string" ? r.source_code : undefined,
      }));

      setAiResults(backendResults);
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions as string[] : []);
      setCacheHit(Boolean(data.cache_hit));
      addHistory(q, f, backendResults.length);

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(SEARCH_RESULTS_STORAGE_KEY, JSON.stringify(backendResults));
      }

      if (backendResults.length > 0) {
        const fairness = calculateCFS(backendResults);
        setCfsResult(fairness);
        memory.write("working", `[${role}] ${q}`, { concept: "search_query", importance: 0.8 });
        memory.write("episodic", `Retrieved ${backendResults.length} results for "${q.slice(0, 80)}"`, {
          concept: "search_result",
          importance: Math.min(0.9, 0.5 + backendResults.length / 20),
        });
        if (fairness.cfs >= 0.7) {
          memory.summarizeToL5(
            `Search ${role}: "${q.slice(0, 80)}" | results=${backendResults.length} | cfs=${fairness.cfs.toFixed(2)}`,
            `${role}_search_workspace`,
          );
        }
        setAgentSteps([
          "ระบบค้นหา backend วิเคราะห์คำค้นและส่งเข้า hybrid retrieval",
          `ดึงเอกสารอ้างอิงได้ ${backendResults.length} รายการจากคลังข้อมูลจริง`,
          `คำนวณ CFS ได้ ${(fairness.cfs * 100).toFixed(1)}% ก่อนแสดงผล`,
        ]);
      } else {
        setAgentSteps([
          "ระบบค้นหา backend ทำงานแล้ว แต่ยังไม่พบเอกสารที่ตรงกับคำค้นนี้",
        ]);
      }
      const workspace: SearchWorkspaceState = {
        role,
        query: q,
        filters: f,
        sortBy,
        resultCount: backendResults.length,
        updatedAt: Date.now(),
      };
      persistWorkspace(workspace);
      setRestoredWorkspace(workspace);
      setMemoryStats(memory.getStats());
    } catch (error) {
      console.error("Search backend error:", error);
      setAiResults(EMPTY_SEARCH_RESULTS);
      setSuggestions([]);
      setCacheHit(false);
      setErrorMessage("ไม่สามารถเชื่อมต่อระบบค้นหาหลักได้ กรุณาตรวจสอบว่า backend ทำงานอยู่ แล้วลองใหม่อีกครั้ง");
      memory.write("episodic", `Search failed for "${q.slice(0, 80)}"`, {
        concept: "search_failure",
        importance: 0.7,
      });
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(SEARCH_RESULTS_STORAGE_KEY);
      }
      addHistory(q, f, 0);
      const workspace: SearchWorkspaceState = {
        role,
        query: q,
        filters: f,
        sortBy,
        resultCount: 0,
        updatedAt: Date.now(),
      };
      persistWorkspace(workspace);
      setRestoredWorkspace(workspace);
      setMemoryStats(memory.getStats());
    } finally {
      setIsLoading(false);
    }
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
    government: "เจ้าหน้าที่ศาล / ธุรการ",
    judge: "ผู้พิพากษา / ตุลาการ",
    it: "ผู้ดูแลระบบ / IT Admin",
  };
  const roleHeadlines: Record<UserRole, string> = {
    citizen: "ค้นคำพิพากษาและข้อมูลกฎหมายพร้อมคำอธิบายที่เข้าใจง่าย",
    government: "สืบค้นข้อมูลกฎหมาย จัดการสำนวน และคัดกรองคำฟ้องเพื่อสนับสนุนงานธุรการศาล",
    judge: "สืบค้นแนวคำพิพากษา ประเด็นข้อกฎหมาย และคดีคล้ายกันเพื่อประกอบการพิจารณา",
    it: "ตรวจสอบความปลอดภัยของข้อมูล (Data Governance) และการทำงานของระบบ AI",
  };
  const roleDescriptions: Record<UserRole, string> = {
    citizen: "ระบบจะแสดงผลพร้อมระดับความเชื่อถือ แหล่งข้อมูล และคำแนะนำการใช้งาน เพื่อช่วยให้เริ่มต้นค้นข้อกฎหมายได้อย่างมั่นใจขึ้น",
    government: "ออกแบบสำหรับเจ้าหน้าที่ศาลและข้าราชการธุรการ รองรับงานรับคำฟ้อง คัดกรองเอกสาร ติดตามสถานะคดี และตรวจสอบ Audit Log",
    judge: "สนับสนุนผู้พิพากษาและตุลาการในการเปรียบเทียบแนวคำพิพากษา วิเคราะห์ประเด็นข้อกฎหมาย และยกร่างคำพิพากษาเบื้องต้น (ต้องตรวจสอบก่อนใช้)",
    it: "ศูนย์กลางการเฝ้าระวังความปลอดภัยของข้อมูล (PII Masking) และการตรวจสอบ Audit Logs เพื่อรับประกันความถูกต้องแม่นยำระดับองค์กร",
  };

  const lowConfidenceResults = sortedResults.filter((r) => r.confidence < 0.7);
  const highConfidenceResults = sortedResults.filter((r) => r.confidence >= 0.7);
  const averageConfidence = sortedResults.length
    ? sortedResults.reduce((sum, result) => sum + result.confidence, 0) / sortedResults.length
    : 0;
  const resultsWithTraceability = sortedResults.filter((result) => result.sourceCode || result.link).length;
  const traceabilityCoverage = sortedResults.length
    ? Math.round((resultsWithTraceability / sortedResults.length) * 100)
    : 0;
  const sourceCatalog = Array.from(
    new Set(
      sortedResults
        .map((result) => result.sourceCode ?? (result.link ? "external_reference" : null))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <section className="relative overflow-hidden pt-10 pb-12 md:pt-14 md:pb-16 transition-all duration-500">
        {/* Background image with high-contrast overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt=""
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-navy/95 via-navy/85 to-navy/75 border-b border-white/10" />
        </div>
        <div className="container relative z-10 mx-auto px-4">
          <div className="mx-auto mb-8 max-w-5xl text-center">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-sm text-primary-foreground">
              <BadgeCheck className="h-4 w-4" />
              {roleLabels[role]}
            </span>
            <h1 className="font-heading text-2xl font-bold text-primary-foreground md:text-4xl">
              {roleHeadlines[role]}
            </h1>
            <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-primary-foreground/80 md:text-base">
              {roleDescriptions[role]}
            </p>
          </div>
        </div>
      </section>

      {/* Main Search Experience: Moved out for prominence */}
      <section className="relative z-20 -mt-16 container mx-auto px-4 overflow-visible mb-8">
        <div className="max-w-5xl mx-auto">
          <SearchBar
            onSearch={handleSearch}
            role={role}
            isLoading={isLoading}
            initialQuery={query}
            initialFilters={filters}
          />
        </div>
      </section>

      <section className="container mx-auto px-4 py-6 flex-1">
        {!isLoading && errorMessage && (
          <div className="max-w-4xl mx-auto mb-6 rounded-3xl border border-destructive/20 bg-destructive/5 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-destructive">ระบบค้นหาหลักยังไม่พร้อมใช้งานในขณะนี้</p>
                <p className="mt-1 text-sm text-destructive/90">{errorMessage}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  เมื่อระบบกลับมาพร้อมใช้งาน หน้า search จะกลับมาแสดงผลพร้อมระดับความเชื่อถือและ source traceability ตามปกติ
                </p>
              </div>
            </div>
          </div>
        )}

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
            <p className="mt-4 text-center text-sm text-muted-foreground">ระบบกำลังวิเคราะห์คำค้นและตรวจสอบผลลัพธ์จากคลังข้อมูลกฎหมาย</p>
            <div className="max-w-4xl mx-auto mt-6">
              <SkeletonList count={3} />
            </div>
          </div>
        )}

        {!isLoading && hasSearched && sortedResults.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TrustSummaryCard
                title="ผลลัพธ์พร้อมตรวจทาน"
                value={`${sortedResults.length} รายการ`}
                note={`${highConfidenceResults.length} รายการอยู่ในช่วงความเชื่อถือสูง`}
                icon={<Scale className="h-4 w-4 text-primary" />}
              />
              <TrustSummaryCard
                title="Traceability Coverage"
                value={`${traceabilityCoverage}%`}
                note={sourceCatalog.length > 0 ? sourceCatalog.join(" / ") : "จะแสดงเมื่อผลลัพธ์มี source metadata"}
                icon={<Database className="h-4 w-4 text-teal" />}
              />
              <TrustSummaryCard
                title="Average Confidence"
                value={`${Math.round(averageConfidence * 100)}%`}
                note="ใช้ประกอบการอ่านผลลัพธ์ ไม่ใช่คำยืนยันข้อกฎหมายโดยลำพัง"
                icon={<ShieldCheck className="h-4 w-4 text-accent-foreground" />}
              />
              <TrustSummaryCard
                title="Layered Memory"
                value={`L1 ${memoryStats.l1Count} · L2 ${memoryStats.l2Count} · L5 ${memoryStats.l5Count}`}
                note={`Context estimate ${memoryStats.totalTokensEstimate} tokens`}
                icon={<BadgeCheck className="h-4 w-4 text-primary" />}
              />
            </div>

            {agentSteps.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="mb-8 rounded-[2rem] border border-white/60 bg-white/50 p-6 shadow-xl shadow-navy/5 backdrop-blur-xl relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-sm font-bold tracking-tight text-navy">
                    <div className="w-2 h-6 bg-gold rounded-full" />
                    กระบวนการตรวจสอบผลลัพธ์
                  </div>
                  <div className="rounded-full bg-navy/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-navy">
                    Governed Search Flow
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { role: "Orchestrator", status: "วิเคราะห์คำค้นและจัดลำดับงาน" },
                    { role: "Retriever", status: "ค้นคืนบริบทและเอกสารที่เกี่ยวข้อง" },
                    { role: "Reviewer", status: "ตรวจทาน metadata และความตรงของผลลัพธ์" },
                    { role: "Compliance", status: "กำกับความเป็นส่วนตัวและการใช้อย่างรับผิดชอบ" }
                  ].map((agent, idx) => (
                    <div key={idx} className="bg-white/80 border border-white p-3 rounded-2xl shadow-sm">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs font-bold text-navy">{agent.role}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-confidence-high rounded-full animate-pulse" />
                        <span className="text-[10px] font-medium text-muted-foreground">{agent.status}</span>
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
                  <span className="ml-2 rounded-full bg-teal-light px-2 py-0.5 text-xs text-teal">Cache</span>
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

            <div className="space-y-6 mt-8">
              {highConfidenceResults.map((r, i) => (
                <ResultCard key={r.id} result={r} index={i} role={role} query={query} isBookmarked={isBookmarked(r.id)} onToggleBookmark={() => handleToggleBookmark(r)} />
              ))}
            </div>

            {lowConfidenceResults.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center gap-2 p-4 bg-gold-light border border-accent/30 rounded-xl mb-6">
                  <AlertTriangle className="w-5 h-5 text-accent flex-shrink-0" />
                  <p className="text-sm text-accent-foreground"><strong>ความมั่นใจต่ำกว่า 70%</strong> — โปรดตรวจสอบข้อมูลเพิ่มเติม</p>
                </div>
                <div className="space-y-6">
                  {lowConfidenceResults.map((r, i) => (
                    <ResultCard key={r.id} result={r} index={i + highConfidenceResults.length} role={role} query={query} isBookmarked={isBookmarked(r.id)} onToggleBookmark={() => handleToggleBookmark(r)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!isLoading && hasSearched && sortedResults.length === 0 && (
          <div className="max-w-lg mx-auto py-16">
            <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-card">
              <Info className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
              <h3 className="font-heading text-xl font-bold mb-2">
                {errorMessage ? "ระบบค้นหายังไม่พร้อมใช้งาน" : "ไม่พบผลลัพธ์"}
              </h3>
              {errorMessage && (
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
              )}
              {!errorMessage && (
                <p className="text-sm text-muted-foreground">
                  ลองเพิ่มข้อเท็จจริงสำคัญ ชื่อมาตรา หรือจำกัดประเภทศาลเพื่อให้ผลลัพธ์ตรงมากขึ้น
                </p>
              )}
              {suggestions.length > 0 && (
                <div className="mt-4 rounded-xl border border-accent/30 bg-gold-light p-4 text-left">
                  <p className="mb-2 text-sm font-medium">คำค้นที่ระบบแนะนำ</p>
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
          </div>
        )}

        {!hasSearched && !isLoading && (
          <div className="max-w-3xl mx-auto py-16">
            <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                backendStatus.online ? "bg-teal-light text-teal" : "bg-destructive/10 text-destructive"
              }`}>
                <ShieldCheck className="h-3.5 w-3.5" />
                {backendStatus.online ? `${backendStatus.service} พร้อมใช้งาน` : "Backend ยังไม่ตอบสนอง"}
              </span>
              {restoredWorkspace && (
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                  คืนค่า workspace ล่าสุด: "{restoredWorkspace.query}"
                </span>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <TrustSummaryCard
                title="เริ่มต้นจากข้อเท็จจริง"
                value="Natural Language"
                note="พิมพ์คำถามเหมือนเล่าเหตุการณ์ ระบบจะช่วยจับประเด็นสำคัญให้"
                icon={<FileSearch className="h-4 w-4 text-primary" />}
              />
              <TrustSummaryCard
                title="ตรวจสอบได้"
                value="Traceable Results"
                note="ผลลัพธ์จะแสดง source metadata และระดับความเชื่อถือเมื่อค้นหาแล้ว"
                icon={<Database className="h-4 w-4 text-teal" />}
              />
              <TrustSummaryCard
                title="ใช้อย่างรับผิดชอบ"
                value="Review Before Use"
                note="เหมาะสำหรับค้นข้อมูลและเตรียมตัวก่อนอ่านเอกสารฉบับเต็มหรือปรึกษาผู้เชี่ยวชาญ"
                icon={<ShieldCheck className="h-4 w-4 text-accent-foreground" />}
              />
            </div>
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
};

const TrustSummaryCard = ({
  title,
  value,
  note,
  icon,
}: {
  title: string;
  value: string;
  note: string;
  icon: ReactNode;
}) => (
    <div className="float-card rounded-3xl border border-border/60 bg-card p-5 shadow-card relative overflow-hidden">
    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-gold to-teal" />
    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
      {icon}
      {title}
    </div>
    <p className="text-xl font-bold text-foreground">{value}</p>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">{note}</p>
  </div>
);

export default SearchPage;
