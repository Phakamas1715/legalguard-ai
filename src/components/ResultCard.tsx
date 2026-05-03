import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Calendar,
  FileText,
  Eye,
  FileCheck2,
  ShieldCheck,
  CircleAlert,
} from "lucide-react";
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
  sourceCode?: string;
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

const getUsageGuidance = (score: number, role: UserRole) => {
  if (score >= 0.8) {
    return role === "judge"
      ? "เหมาะสำหรับใช้เป็นจุดตั้งต้นในการเทียบแนวคำวินิจฉัยและตรวจต่อกับสำนวนจริง"
      : "เหมาะสำหรับใช้เป็นข้อมูลตั้งต้นก่อนอ่านคำพิพากษาฉบับเต็มหรือเอกสารต้นฉบับ";
  }
  if (score >= 0.55) {
    return "ควรใช้ร่วมกับการอ่านรายละเอียดเต็มและตรวจสอบข้อกฎหมายที่อ้างอิงเพิ่มเติม";
  }
  return "ควรใช้เพื่อสำรวจประเด็นเบื้องต้นเท่านั้น และตรวจทานกับแหล่งข้อมูลต้นฉบับก่อนใช้อ้างอิง";
};

const getVerificationLabel = (result: SearchResult) => {
  if (result.link) return "มีลิงก์ต้นฉบับสำหรับตรวจทาน";
  if (result.sourceCode) return "มีรหัสแหล่งข้อมูลในระบบ";
  return "ควรตรวจสอบ metadata เพิ่มเติม";
};

const getSourceLabel = (result: SearchResult) => {
  if (result.sourceCode) return result.sourceCode;
  if (result.link) return "external_reference";
  return "metadata_pending";
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
  const guidance = getUsageGuidance(result.confidence, role);
  const verificationLabel = getVerificationLabel(result);
  const sourceLabel = getSourceLabel(result);
  const verificationTone =
    result.confidence >= 0.7
      ? "border-teal/20 bg-teal/5 text-teal"
      : result.confidence >= 0.4
      ? "border-accent/30 bg-accent/5 text-accent-foreground"
      : "border-destructive/20 bg-destructive/5 text-destructive";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="float-card bg-card border border-border/70 rounded-2xl shadow-card hover:shadow-xl transition-all overflow-hidden"
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
            {result.sourceCode && (
              <span className="text-[11px] bg-primary/5 text-primary px-1.5 py-0.5 rounded font-mono">
                {result.sourceCode}
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

        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <TraceabilityItem
            label="แหล่งข้อมูล"
            value={sourceLabel}
            icon={<FileCheck2 className="w-3.5 h-3.5 text-primary" />}
          />
          <TraceabilityItem
            label="การตรวจสอบ"
            value={verificationLabel}
            icon={<ShieldCheck className="w-3.5 h-3.5 text-teal" />}
          />
          <TraceabilityItem
            label="คำแนะนำ"
            value={result.confidence >= 0.7 ? "พร้อมใช้อ้างอิงเบื้องต้น" : "ควรตรวจทานเพิ่มเติม"}
            icon={<CircleAlert className="w-3.5 h-3.5 text-accent-foreground" />}
          />
        </div>

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

        <div className={`mb-4 rounded-xl border px-3 py-3 ${verificationTone}`}>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em]">Professional Guidance</p>
          <p className="text-sm leading-relaxed">{guidance}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-3 border-t border-border/60">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-navy-deep transition-colors group/expand"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {expanded ? "ย่อ" : "อ่านเพิ่มเติม"}
          </button>
          <Link
            to={`/judgment/${result.id}`}
            state={{ result }}
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
      <div className="h-1.5 bg-muted">
        <div
          className={`h-full transition-all duration-500 ${
            result.confidence >= 0.7
              ? "bg-gradient-to-r from-confidence-high to-confidence-high/60"
              : result.confidence >= 0.4
              ? "bg-gradient-to-r from-confidence-medium to-confidence-medium/60"
              : "bg-gradient-to-r from-confidence-low to-confidence-low/60"
          }`}
          style={{ width: `${result.confidence * 100}%` }}
        />
      </div>
    </motion.div>
  );
};

const TraceabilityItem = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) => (
  <div className="rounded-xl border border-border/60 bg-gradient-to-br from-muted/40 to-muted/20 px-3 py-2.5 transition-all hover:shadow-sm">
    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
      {icon}
      {label}
    </div>
    <p className="break-words text-sm font-medium text-foreground">{value}</p>
  </div>
);

export default ResultCard;
