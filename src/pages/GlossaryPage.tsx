import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  BookOpen, Search, Loader2, ExternalLink, Scale, FileText, Hash
} from "lucide-react";

import { API_BASE } from "@/lib/runtimeConfig";

interface GlossaryResult {
  term: string;
  definition: string;
  statute?: string;
  penalty?: string;
  synonyms?: string[];
  category?: string;
  found?: boolean;
}

interface LandmarkCase {
  case_no: string;
  topic: string;
  summary: string;
  year?: number;
}

interface DataSource {
  name: string;
  url: string;
  description: string;
  type: string;
}

const GlossaryPage = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GlossaryResult | null>(null);
  const [searchResults, setSearchResults] = useState<GlossaryResult[]>([]);
  const [landmarks, setLandmarks] = useState<LandmarkCase[]>([]);
  const [sources, setSources] = useState<DataSource[]>([]);
  const [activeTab, setActiveTab] = useState<"lookup" | "landmark" | "sources">("lookup");

  const handleLookup = async (searchTerm?: string) => {
    const term = searchTerm ?? query;
    if (!term.trim()) return;
    setLoading(true);
    setResult(null);
    setSearchResults([]);
    try {
      const [lookupResp, searchResp] = await Promise.all([
        fetch(`${API_BASE}/glossary/lookup?term=${encodeURIComponent(term)}`),
        fetch(`${API_BASE}/glossary/search?q=${encodeURIComponent(term)}&limit=10`),
      ]);
      const lookupData = await lookupResp.json();
      if (lookupData.found !== false) setResult(lookupData);
      const searchData = await searchResp.json();
      setSearchResults(searchData.results ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const loadLandmarks = async (topic?: string) => {
    try {
      const url = topic ? `${API_BASE}/glossary/landmark-cases?topic=${encodeURIComponent(topic)}` : `${API_BASE}/glossary/landmark-cases`;
      const resp = await fetch(url);
      const data = await resp.json();
      setLandmarks(data.cases ?? []);
    } catch { /* ignore */ }
  };

  const loadSources = async () => {
    try {
      const resp = await fetch(`${API_BASE}/glossary/data-sources`);
      const data = await resp.json();
      setSources(data.sources ?? []);
    } catch { /* ignore */ }
  };

  const tabs = [
    { id: "lookup" as const, label: "ค้นหาศัพท์", icon: Search },
    { id: "landmark" as const, label: "ฎีกาสำคัญ", icon: Scale },
    { id: "sources" as const, label: "แหล่งข้อมูล", icon: ExternalLink },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">พจนานุกรมศัพท์กฎหมาย</h1>
            <p className="text-muted-foreground">ค้นหาศัพท์ ฎีกาสำคัญ และแหล่งข้อมูลกฎหมายไทย</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === "landmark" && landmarks.length === 0) loadLandmarks();
              if (tab.id === "sources" && sources.length === 0) loadSources();
            }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-muted"
              }`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "lookup" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex gap-2">
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="พิมพ์ศัพท์กฎหมาย เช่น ฉ้อโกง, ยักยอก, หย่า..."
                className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleLookup()} />
              <button onClick={handleLookup} disabled={loading}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:bg-navy-deep transition-colors disabled:opacity-50 flex items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} ค้นหา
              </button>
            </div>
            {/* Quick search tags */}
            <div className="flex flex-wrap gap-2">
              {["ฉ้อโกง", "ยักยอก", "ลักทรัพย์", "หมิ่นประมาท", "หย่า", "กู้ยืม", "ค้ำประกัน", "จำนอง", "ครอบครองปรปักษ์", "ละเมิด", "ผิดสัญญา", "เช็คเด้ง"].map(term => (
                <button key={term} onClick={() => { setQuery(term); handleLookup(term); }}
                  className="text-[11px] bg-primary/10 text-primary px-2.5 py-1 rounded-full hover:bg-primary/20 transition-colors">{term}</button>
              ))}
            </div>

            {result && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-card">
                <h3 className="font-heading font-bold text-lg mb-3 text-primary">{result.term}</h3>
                <p className="text-sm mb-4">{result.definition}</p>
                {result.statute && (
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm"><span className="font-medium">มาตรา:</span> {result.statute}</span>
                  </div>
                )}
                {result.penalty && (
                  <div className="flex items-center gap-2 mb-2">
                    <Scale className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm"><span className="font-medium">โทษ:</span> {result.penalty}</span>
                  </div>
                )}
                {result.synonyms && result.synonyms.length > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    <div className="flex flex-wrap gap-1">
                      {result.synonyms.map(s => (
                        <button key={s} onClick={() => { setQuery(s); }}
                          className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full hover:bg-primary/20">{s}</button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">ผลลัพธ์ที่เกี่ยวข้อง</p>
                {searchResults.map((r, i) => (
                  <motion.button key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    onClick={() => { setQuery(r.term); setResult(r); }}
                    className="w-full text-left p-3 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors">
                    <span className="text-sm font-medium">{r.term}</span>
                    {r.category && <span className="ml-2 text-[11px] bg-muted px-2 py-0.5 rounded-full">{r.category}</span>}
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.definition}</p>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "landmark" && (
          <div className="max-w-3xl mx-auto space-y-4">
            {landmarks.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin opacity-30" />
                <p>กำลังโหลดฎีกาสำคัญ...</p>
              </div>
            ) : (
              landmarks.map((c, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-card border border-border rounded-xl p-4 shadow-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">{c.case_no}</span>
                    <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full">{c.topic}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.summary}</p>
                </motion.div>
              ))
            )}
          </div>
        )}

        {activeTab === "sources" && (
          <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3">
            {sources.length === 0 ? (
              <div className="col-span-2 text-center py-16 text-muted-foreground">
                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin opacity-30" />
              </div>
            ) : (
              sources.map((s, i) => (
                <motion.a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors flex items-center gap-3 group">
                  <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">{s.description}</p>
                    <span className="text-[11px] bg-muted px-1.5 py-0.5 rounded mt-1 inline-block">{s.type}</span>
                  </div>
                </motion.a>
              ))
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default GlossaryPage;
