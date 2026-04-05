import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Clock, Trash2, Search, X } from "lucide-react";
import { useSearchHistory } from "@/hooks/useBookmarksHistory";

const HistoryPage = () => {
  const { history, clearHistory, removeHistoryItem } = useSearchHistory();

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "เมื่อสักครู่";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} นาทีที่แล้ว`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ชั่วโมงที่แล้ว`;
    return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16 flex-1">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-secondary flex items-center justify-center">
              <Clock className="w-10 h-10 text-primary" />
            </div>
            <h1 className="font-heading text-3xl font-bold mb-3">ประวัติการค้นหา</h1>
            <p className="text-muted-foreground text-lg">
              {history.length > 0
                ? `คุณมี ${history.length} รายการค้นหาที่บันทึกไว้`
                : "ประวัติการค้นหาทั้งหมดของคุณจะแสดงที่นี่"}
            </p>
          </div>

          {history.length > 0 && (
            <div className="flex justify-end mb-4">
              <button
                onClick={clearHistory}
                className="text-sm text-destructive hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" /> ล้างประวัติทั้งหมด
              </button>
            </div>
          )}

          {history.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-10 shadow-card text-center">
              <p className="text-muted-foreground">ยังไม่มีประวัติการค้นหา — เริ่มค้นหาเพื่อบันทึกประวัติ</p>
              <Link to="/search" className="inline-block mt-4 text-primary font-semibold hover:underline">ไปหน้าค้นหา →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-card border border-border rounded-xl p-4 shadow-card hover:shadow-card-hover transition-shadow flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <Search className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/search?role=citizen&q=${encodeURIComponent(item.query)}`}
                      className="font-heading font-bold text-foreground hover:text-primary transition-colors block truncate"
                    >
                      "{item.query}"
                    </Link>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{formatTime(item.timestamp)}</span>
                      <span>พบ {item.resultCount} ผลลัพธ์</span>
                      {item.filters.courtType && <span>ศาล: {item.filters.courtType}</span>}
                      {item.filters.year && <span>ปี: {item.filters.year}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => removeHistoryItem(item.id)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                    aria-label="ลบ"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default HistoryPage;
