import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BookmarkCheck, Trash2, Calendar, FileText, ExternalLink } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarksHistory";

const courtLabels: Record<string, string> = { supreme: "ศาลฎีกา", appeal: "ศาลอุทธรณ์", district: "ศาลชั้นต้น", admin: "ศาลปกครอง" };

const BookmarksPage = () => {
  const { bookmarks, removeBookmark } = useBookmarks();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16 flex-1">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gold-light flex items-center justify-center">
              <BookmarkCheck className="w-10 h-10 text-accent" />
            </div>
            <h1 className="font-heading text-3xl font-bold mb-3">บุ๊กมาร์กของคุณ</h1>
            <p className="text-muted-foreground text-lg">
              {bookmarks.length > 0
                ? `คุณมี ${bookmarks.length} รายการที่บันทึกไว้`
                : "คำพิพากษาและข้อมูลกฎหมายที่คุณบันทึกไว้จะแสดงที่นี่"}
            </p>
          </div>

          {bookmarks.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-10 shadow-card text-center">
              <p className="text-muted-foreground">ยังไม่มีบุ๊กมาร์ก — ลองค้นหาและบุ๊กมาร์กผลลัพธ์ที่สนใจ</p>
              <Link to="/search" className="inline-block mt-4 text-primary font-semibold hover:underline">ไปหน้าค้นหา →</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {bookmarks.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                          {courtLabels[item.courtType] || item.courtType}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> พ.ศ. {item.year}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> {item.caseNo}
                        </span>
                      </div>
                      <h3 className="font-heading text-base font-bold text-foreground mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.summary}</p>
                      <div className="flex gap-3 mt-3">
                        <Link to={`/judgment/${item.id}`} className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                          <ExternalLink className="w-3.5 h-3.5" /> ดูรายละเอียด
                        </Link>
                      </div>
                    </div>
                    <button
                      onClick={() => removeBookmark(item.id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                      aria-label="ลบบุ๊กมาร์ก"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
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

export default BookmarksPage;
