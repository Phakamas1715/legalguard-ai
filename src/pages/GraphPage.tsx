import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Network, Send, Loader2, Search, BarChart3, Circle, ArrowRight
} from "lucide-react";

import { API_BASE } from "@/lib/runtimeConfig";

interface GraphNode {
  id: string;
  label: string;
  node_type: string;
  attributes: Record<string, unknown>;
}

interface GraphEdge {
  source_id: string;
  target_id: string;
  label: string;
  attributes: Record<string, unknown>;
}

interface GraphStats {
  total_nodes: number;
  total_edges: number;
  node_types: Record<string, number>;
}

const NODE_COLORS: Record<string, string> = {
  person: "bg-primary/20 text-primary border-primary/30",
  law: "bg-teal/20 text-teal border-teal/30",
  statute: "bg-teal/20 text-teal border-teal/30",
  organization: "bg-accent/20 text-accent-foreground border-accent/30",
  concept: "bg-secondary text-foreground border-border",
  default: "bg-muted text-foreground border-border",
};

const EXAMPLE_TEXTS = [
  { label: "สัญญากู้ยืมเงิน", text: "นายสมชายกู้ยืมเงินจากธนาคารกรุงไทย จำนวน 1,000,000 บาท ตามสัญญากู้ยืมเงินเลขที่ กท-2567/001 ลงวันที่ 1 มกราคม 2567 มีนายสมหญิงเป็นผู้ค้ำประกัน โดยจำนองที่ดินโฉนดเลขที่ 12345 ตำบลบางรัก เขตบางรัก กรุงเทพมหานคร เป็นหลักประกัน" },
  { label: "คดีฉ้อโกง", text: "จำเลยที่ 1 นายวิชัย ร่วมกับจำเลยที่ 2 นางสาวมาลี หลอกลวงผู้เสียหายว่าจะขายที่ดิน 5 ไร่ ตำบลบางพลี จังหวัดสมุทรปราการ ในราคา 10 ล้านบาท ผู้เสียหายโอนเงินมัดจำ 2 ล้านบาท แต่ที่ดินดังกล่าวเป็นที่ดินของบุคคลอื่น อันเป็นความผิดตาม ป.อ. มาตรา 341 และ 343" },
  { label: "คดีแรงงาน", text: "โจทก์ทำงานเป็นพนักงานบริษัท ABC จำกัด ตำแหน่งวิศวกร เงินเดือน 60,000 บาท ตั้งแต่วันที่ 1 มิถุนายน 2560 จำเลยเลิกจ้างโจทก์เมื่อวันที่ 15 มีนาคม 2568 โดยไม่จ่ายค่าชดเชยตาม พ.ร.บ.คุ้มครองแรงงาน มาตรา 118 และไม่บอกกล่าวล่วงหน้าตามมาตรา 17" },
];

const GraphPage = () => {
  const [text, setText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"extract" | "search" | "stats">("extract");

  const handleTextToGraph = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/graph/text-to-graph`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, embed: false }),
      });
      const data = await resp.json();
      setNodes(data.nodes ?? []);
      setEdges(data.edges ?? []);
      setStats(data.stats ?? null);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/graph/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, limit: 10, depth: 2 }),
      });
      const data = await resp.json();
      setNodes(data.nodes ?? []);
      setEdges(data.edges ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const resp = await fetch(`${API_BASE}/graph/stats`);
      setStats(await resp.json());
    } catch { /* ignore */ }
  };

  const tabs = [
    { id: "extract" as const, label: "สร้างกราฟ", icon: Network },
    { id: "search" as const, label: "ค้นหา Subgraph", icon: Search },
    { id: "stats" as const, label: "สถิติ", icon: BarChart3 },
  ];

  const getNodeColor = (type: string) => NODE_COLORS[type.toLowerCase()] ?? NODE_COLORS.default;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Network className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Knowledge Graph</h1>
            <p className="text-muted-foreground">แปลงข้อความกฎหมายเป็นกราฟความรู้</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === "stats") loadStats(); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-muted"
              }`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="space-y-4">
            {activeTab === "extract" && (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                <h3 className="font-heading font-bold mb-3">ใส่ข้อความกฎหมาย</h3>
                <textarea value={text} onChange={(e) => setText(e.target.value)}
                  placeholder="เช่น นายสมชายกู้ยืมเงินจากธนาคารกรุงไทย จำนวน 1,000,000 บาท ตามสัญญากู้ยืมเงิน ลงวันที่ 1 มกราคม 2567..."
                  rows={8} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y" />
                <button onClick={handleTextToGraph} disabled={!text.trim() || loading}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:bg-navy-deep transition-colors disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {loading ? "กำลังวิเคราะห์..." : "สร้าง Knowledge Graph"}
                </button>
                <div className="mt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">💡 ตัวอย่างข้อความ</p>
                  <div className="space-y-2">
                    {EXAMPLE_TEXTS.map((ex, i) => (
                      <button key={i} onClick={() => setText(ex.text)}
                        className="w-full text-left p-2.5 bg-muted/50 border border-border rounded-lg hover:border-primary/30 transition-colors">
                        <span className="text-xs font-medium text-primary">{ex.label}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{ex.text}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "search" && (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                <h3 className="font-heading font-bold mb-3">ค้นหา Subgraph</h3>
                <div className="flex gap-2">
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="เช่น สัญญากู้ยืม, ฉ้อโกง..."
                    className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
                  <button onClick={handleSearch} disabled={loading}
                    className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:bg-navy-deep transition-colors disabled:opacity-50">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "stats" && stats && (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                <h3 className="font-heading font-bold mb-4">สถิติ Knowledge Graph</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-primary/5 rounded-xl text-center">
                    <div className="text-2xl font-bold text-primary">{stats.total_nodes}</div>
                    <div className="text-[11px] text-muted-foreground">Nodes</div>
                  </div>
                  <div className="p-3 bg-teal/5 rounded-xl text-center">
                    <div className="text-2xl font-bold text-teal">{stats.total_edges}</div>
                    <div className="text-[11px] text-muted-foreground">Edges</div>
                  </div>
                </div>
                {stats.node_types && Object.keys(stats.node_types).length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-2">ประเภท Node</p>
                    <div className="space-y-2">
                      {Object.entries(stats.node_types).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between text-sm">
                          <span className={`px-2 py-0.5 rounded text-[11px] border ${getNodeColor(type)}`}>{type}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Graph Visualization */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <h3 className="font-heading font-bold mb-4">กราฟ</h3>
            {nodes.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Network className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>ยังไม่มีข้อมูล — สร้างกราฟจากข้อความหรือค้นหา</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Nodes */}
                <div>
                  <p className="text-xs font-medium mb-2">Nodes ({nodes.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {nodes.map((n) => (
                      <span key={n.id} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${getNodeColor(n.node_type)}`}>
                        <Circle className="w-2.5 h-2.5 inline mr-1" /> {n.label}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Edges */}
                {edges.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-2">Edges ({edges.length})</p>
                    <div className="space-y-1">
                      {edges.map((e, i) => {
                        const src = nodes.find(n => n.id === e.source_id);
                        const tgt = nodes.find(n => n.id === e.target_id);
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs p-2 bg-muted rounded-lg">
                            <span className="font-medium">{src?.label ?? e.source_id}</span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <span className="text-primary">{e.label || "เกี่ยวข้อง"}</span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <span className="font-medium">{tgt?.label ?? e.target_id}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default GraphPage;
