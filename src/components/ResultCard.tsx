import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Bookmark, BookmarkCheck, ExternalLink, ChevronDown, ChevronUp, Calendar, FileText, Eye } from "lucide-react";
import type { UserRole } from "./RoleSelector";

export interface SearchResult {
  id: string;
  caseNo: string;
  courtType: "supreme" | "appeal" | "district" | "admin";
  year: number;
  title: string;
  summary: string;
  fullText: string;
  statutes: string[];
  confidence: number;
  relevanceScore: number;
  province?: string;
  link?: string;
  relatedStatutes?: Array<{ statute: string; description: string; relatedCases?: string[] }>;
}

interface ResultCardProps {
  result: SearchResult;
  index: number;
  role: UserRole;
  query: string;
  isBookmarked?: boolean;
  onToggleBookmark: () => void;
}

const courtLabels: Record<string, string> = {
  supreme: "ศาลฎีกา",
  appeal: "ศาลอุทธรณ์",
  district: "ศาลชั้นต้น",
  admin: "ศาลปกครอง",
};

const courtColors: Record<string, string> = {
  supreme: "bg-primary/10 text-primary",
  appeal: "bg-teal/10 text-teal",
  district: "bg-accent/10 text-accent-foreground",
  admin: "bg-destructive/10 text-destructive",
};

const getConfidenceClass = (score: number) => {
  if (score >= 0.7) return "confidence-badge-high";
  if (score >= 0.4) return "confidence-badge-medium";
  return "confidence-badge-low";
};

const getConfidenceLabel = (score: number) => {
  if (score >= 0.7) return "มั่นใจสูง";
  if (score >= 0.4) return "มั่นใจปานกลาง";
  return "มั่นใจต่ำ";
};

const highlightQuery = (text: string, query: string) => {
  if (!query) return text;
  const words = query.split(/\s+/).filter(Boolean);
  let result = text;
  words.forEach((word) => {
    const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    result = result.replace(regex, `<mark class="bg-gold-light text-foreground px-0.5 rounded">$1</mark>`);
  });
  return result;
};

const ResultCard = ({ result, index, role, query, isBookmarked, onToggleBookmark }: ResultCardProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-card border border-border rounded-2xl shadow-card hover:shadow-card-hover transition-shadow overflow-hidden"
    >
      <div className="p-5 md:p-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${courtColors[result.courtType]}`}>
              {courtLabels[result.courtType]}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              พ.ศ. {result.year}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              {result.caseNo}
            </span>
            {(result as Record<string, unknown>).sourceCode && (
              <span className="text-[11px] bg-primary/5 text-primary px-1.5 py-0.5 rounded font-mono">
                {String((result as Record<string, unknown>).sourceCode)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={getConfidenceClass(result.confidence)}>
              {Math.round(result.confidence * 100)}% {getConfidenceLabel(result.confidence)}
            </span>
            <button
              onClick={() => onToggleBookmark()}
              className="p-2 rounded-lg text-muted-foreground hover:text-accent hover:bg-gold-light transition-colors"
              aria-label={isBookmarked ? "ลบบุ๊กมาร์ก" : "บุ๊กมาร์ก"}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-5 h-5 text-accent" />
              ) : (
                <Bookmark className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Title */}
        <h3
          className="font-heading text-lg font-bold text-foreground mb-2 leading-snug"
          dangerouslySetInnerHTML={{ __html: highlightQuery(result.title, query) }}
        />

        {/* Summary */}
        <p
          className="text-sm text-muted-foreground leading-relaxed mb-3"
          dangerouslySetInnerHTML={{ __html: highlightQuery(result.summary, query) }}
        />

        {/* Statutes */}
        {result.statutes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {result.statutes.map((s) => (
              <span
                key={s}
                className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md font-medium"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-navy-deep transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {expanded ? "ย่อ" : "อ่านเพิ่มเติม"}
          </button>
          <Link
            to={`/judgment/${result.id}`}
            className="flex items-center gap-1.5 text-sm font-medium text-teal hover:underline"
          >
            <Eye className="w-4 h-4" />
            ดูรายละเอียดเต็ม
          </Link>
          {result.link && (
            <a
              href={result.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground ml-auto"
            >
              <ExternalLink className="w-4 h-4" />
              ต้นฉบับ
            </a>
          )}
        </div>

        {/* Expanded content */}
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 pt-4 border-t border-border"
          >
            <p
              className="text-sm text-foreground leading-relaxed whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: highlightQuery(result.fullText, query) }}
            />
          </motion.div>
        )}
      </div>

      {/* Confidence bar */}
      <div className="h-1 bg-muted">
        <div
          className={`h-full transition-all ${
            result.confidence >= 0.7
              ? "bg-confidence-high"
              : result.confidence >= 0.4
              ? "bg-confidence-medium"
              : "bg-confidence-low"
          }`}
          style={{ width: `${result.confidence * 100}%` }}
        />
      </div>
    </motion.div>
  );
};

export default ResultCard;
