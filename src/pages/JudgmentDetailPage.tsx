import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, FileText, Building, ExternalLink, Scale, BookOpen, Link2, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { mockResults } from "@/data/mockResults";

// Extended statute relationship data
const statuteRelations: Record<string, { description: string; law: string; relatedStatutes: string[]; relatedCases: string[] }> = {
  "มาตรา 341": {
    description: "ผู้ใดโดยทุจริต หลอกลวงผู้อื่นด้วยการแสดงข้อความอันเป็นเท็จ หรือปกปิดข้อความจริงซึ่งควรบอกให้แจ้ง และโดยการหลอกลวงดังว่านั้นได้ไปซึ่งทรัพย์สินจากผู้ถูกหลอกลวงหรือบุคคลที่สาม หรือทำให้ผู้ถูกหลอกลวงหรือบุคคลที่สามทำ ถอน หรือทำลายเอกสารสิทธิ ผู้นั้นกระทำความผิดฐานฉ้อโกง ต้องระวางโทษจำคุกไม่เกินสามปี หรือปรับไม่เกินหกหมื่นบาท หรือทั้งจำทั้งปรับ",
    law: "ประมวลกฎหมายอาญา",
    relatedStatutes: ["มาตรา 342", "มาตรา 343", "มาตรา 95"],
    relatedCases: ["ฎ.1234/2568", "ฎ.5678/2567", "อ.2345/2568"],
  },
  "มาตรา 343": {
    description: "ถ้าการกระทำความผิดตามมาตรา 341 ได้กระทำด้วยการแสดงตนเป็นคนอื่น หรือโดยอาศัยความเบาปัญญาของผู้ถูกหลอกลวง ซึ่งเป็นเด็ก หรือเป็นการฉ้อโกงประชาชน ผู้กระทำต้องระวางโทษจำคุกไม่เกินห้าปี หรือปรับไม่เกินหนึ่งแสนบาท หรือทั้งจำทั้งปรับ",
    law: "ประมวลกฎหมายอาญา",
    relatedStatutes: ["มาตรา 341", "มาตรา 342"],
    relatedCases: ["อ.2345/2568"],
  },
  "มาตรา 95": {
    description: "ในคดีอาญา ถ้ามิได้ฟ้องและได้ตัวผู้กระทำความผิดมายังศาลภายในกำหนดดังต่อไปนี้ นับแต่วันกระทำความผิด เป็นอันขาดอายุความ:\n(1) ยี่สิบปี สำหรับความผิดที่มีโทษจำคุกตลอดชีวิต\n(2) สิบห้าปี สำหรับความผิดที่มีโทษจำคุกเกินเจ็ดปี\n(3) สิบปี สำหรับความผิดที่มีโทษจำคุกเกินหนึ่งปีถึงเจ็ดปี\n(4) ห้าปี สำหรับความผิดที่มีโทษจำคุกเกินหนึ่งเดือนถึงหนึ่งปี",
    law: "ประมวลกฎหมายอาญา",
    relatedStatutes: ["มาตรา 96", "มาตรา 341"],
    relatedCases: ["ฎ.5678/2567"],
  },
  "มาตรา 9": {
    description: "ศาลปกครองมีอำนาจพิจารณาพิพากษาหรือมีคำสั่งในเรื่องดังต่อไปนี้:\n(1) คดีพิพาทเกี่ยวกับการที่หน่วยงานทางปกครองหรือเจ้าหน้าที่ของรัฐกระทำการโดยไม่ชอบด้วยกฎหมาย\n(4) คดีพิพาทเกี่ยวกับสัญญาทางปกครอง",
    law: "พ.ร.บ. จัดตั้งศาลปกครองและวิธีพิจารณาคดีปกครอง พ.ศ. 2542",
    relatedStatutes: ["มาตรา 11", "มาตรา 42"],
    relatedCases: ["ปค.789/2568"],
  },
};

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

const JudgmentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const result = mockResults.find((r) => r.id === id);

  if (!result) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="font-heading text-2xl font-bold mb-2">ไม่พบคำพิพากษา</h2>
            <Link to="/search" className="text-primary hover:underline">กลับไปหน้าค้นหา</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const relatedStatuteData = result.statutes
    .map((s) => {
      const key = Object.keys(statuteRelations).find((k) => s.includes(k) || k.includes(s));
      return key ? { statute: s, ...statuteRelations[key] } : null;
    })
    .filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Header */}
      <section className="bg-hero-gradient py-8">
        <div className="container mx-auto px-4">
          <Link
            to="/search"
            className="inline-flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับไปผลการค้นหา
          </Link>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary-foreground mb-3">
            {result.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${courtColors[result.courtType]}`}>
              {courtLabels[result.courtType]}
            </span>
            <span className="text-primary-foreground/70 text-sm flex items-center gap-1">
              <Calendar className="w-4 h-4" /> พ.ศ. {result.year}
            </span>
            <span className="text-primary-foreground/70 text-sm flex items-center gap-1">
              <FileText className="w-4 h-4" /> {result.caseNo}
            </span>
            {result.province && (
              <span className="text-primary-foreground/70 text-sm flex items-center gap-1">
                <Building className="w-4 h-4" /> {result.province}
              </span>
            )}
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
              result.confidence >= 0.7 ? "bg-confidence-high/20 text-confidence-high" : "bg-confidence-medium/20 text-confidence-medium"
            }`}>
              ความมั่นใจ {Math.round(result.confidence * 100)}%
            </span>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-6 shadow-card"
            >
              <h2 className="font-heading text-xl font-bold mb-3 flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" /> สรุปคำพิพากษา
              </h2>
              <p className="text-foreground leading-relaxed text-base">{result.summary}</p>
            </motion.div>

            {/* Full text */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-2xl p-6 shadow-card"
            >
              <h2 className="font-heading text-xl font-bold mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" /> เนื้อหาคำพิพากษา
              </h2>
              <div className="text-foreground leading-relaxed whitespace-pre-line text-base border-l-4 border-primary/20 pl-4">
                {result.fullText}
              </div>
            </motion.div>

            {/* Statute relationships */}
            {relatedStatuteData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-card"
              >
                <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-primary" /> ความเชื่อมโยงมาตรากฎหมาย
                </h2>
                <div className="space-y-4">
                  {relatedStatuteData.map((item: { statute: string; description: string; law: string; relatedStatutes: string[]; relatedCases: string[] }, i: number) => (
                    <div key={i} className="border border-border rounded-xl overflow-hidden">
                      <div className="bg-secondary/50 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-heading font-bold text-foreground">
                            {item.statute}
                          </h3>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {item.law}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                          {item.description}
                        </p>

                        {/* Related statutes */}
                        {item.relatedStatutes?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
                              มาตราที่เกี่ยวข้อง
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {item.relatedStatutes.map((s: string) => (
                                <span key={s} className="text-xs bg-gold-light text-accent-foreground px-2.5 py-1 rounded-full font-medium">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Related cases */}
                        {item.relatedCases?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
                              คดีที่อ้างอิง
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {item.relatedCases.map((c: string) => (
                                <span key={c} className="text-xs bg-teal-light text-teal px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                                  <FileText className="w-3 h-3" /> {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Visual relationship map */}
                <div className="mt-6 p-4 bg-secondary/30 rounded-xl">
                  <h4 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">
                    แผนผังความเชื่อมโยง
                  </h4>
                  <div className="flex items-center justify-center flex-wrap gap-2">
                    {result.statutes.map((s, i) => (
                      <div key={s} className="flex items-center gap-2">
                        <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-semibold">
                          {s}
                        </div>
                        {i < result.statutes.length - 1 && (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <div className="bg-accent text-accent-foreground px-3 py-1.5 rounded-lg text-xs font-semibold">
                      {result.caseNo}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Info card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-card border border-border rounded-2xl p-5 shadow-card"
            >
              <h3 className="font-heading font-bold mb-3">ข้อมูลคดี</h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">เลขคดี</dt>
                  <dd className="font-medium text-foreground">{result.caseNo}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">ประเภทศาล</dt>
                  <dd className="font-medium text-foreground">{courtLabels[result.courtType]}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">ปี พ.ศ.</dt>
                  <dd className="font-medium text-foreground">{result.year}</dd>
                </div>
                {result.province && (
                  <div>
                    <dt className="text-muted-foreground">จังหวัด</dt>
                    <dd className="font-medium text-foreground">{result.province}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground">ค่าความมั่นใจ</dt>
                  <dd className="font-medium text-foreground">{Math.round(result.confidence * 100)}%</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">ค่าความเกี่ยวข้อง</dt>
                  <dd className="font-medium text-foreground">{Math.round(result.relevanceScore * 100)}%</dd>
                </div>
              </dl>
            </motion.div>

            {/* Statutes list */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border rounded-2xl p-5 shadow-card"
            >
              <h3 className="font-heading font-bold mb-3">มาตราที่เกี่ยวข้อง</h3>
              <div className="space-y-2">
                {result.statutes.map((s) => (
                  <div key={s} className="flex items-center gap-2 text-sm bg-secondary rounded-lg px-3 py-2">
                    <Scale className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-medium">{s}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* External link */}
            {result.link && (
              <a
                href={result.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-teal text-primary-foreground rounded-xl px-4 py-3 font-semibold text-sm hover:brightness-110 transition-all w-full"
              >
                <ExternalLink className="w-4 h-4" />
                ดูเอกสารต้นฉบับ
              </a>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default JudgmentDetailPage;
