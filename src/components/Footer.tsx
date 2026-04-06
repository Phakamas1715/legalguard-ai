import { Shield, Mail, Phone, ExternalLink, Scale, MapPin } from "lucide-react";
import logo from "@/assets/logos/legalguard-logo.png";
import footerBg from "@/assets/footer-bg.jpg";

const Footer = () => (
  <footer className="relative bg-navy-deep text-white mt-24 overflow-hidden border-t-4 border-gold">
    {/* Background Image with Overlay */}
    <div className="absolute inset-0 z-0">
      <img 
        src={footerBg} 
        alt="Institutional Background" 
        className="w-full h-full object-cover opacity-20 contrast-125"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-deep via-navy-deep/95 to-navy-deep/80"></div>
    </div>

    <div className="container mx-auto px-4 py-16 relative z-10">
      <div className="grid md:grid-cols-4 gap-12">
        <div className="md:col-span-1 flex flex-col items-center md:items-start text-center md:text-left">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <img src={logo} alt="LegalGuard Logo" className="w-12 h-12 rounded-xl" width={48} height={48} />
            </div>
            <div className="text-left">
              <div className="font-heading text-xl font-bold tracking-tight text-white">Smart LegalGuard AI</div>
              <div className="text-xs text-gold font-bold uppercase tracking-widest">กระทรวงยุติธรรม</div>
            </div>
          </div>
          <p className="text-sm text-white leading-relaxed mb-6 font-medium">
            ระบบสืบค้นข้อมูลกฎหมายไทยอัจฉริยะ โครงสร้างพื้นฐานเทคโนโลยีระดับชาติ เพื่อมอบความยุติธรรมที่ทันสมัยและเข้าถึงได้ง่ายสำหรับประชาชนทุกคน
          </p>
          <div className="flex items-center gap-2 text-xs font-bold bg-white/10 border border-white/20 px-4 py-2.5 rounded-xl w-fit shadow-lg">
            <Shield className="w-4 h-4 text-gold" />
            <span className="text-white">มาตรฐานความปลอดภัย PDPA & RAAIA</span>
          </div>
        </div>

        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <h4 className="font-heading font-bold text-lg mb-6 flex items-center gap-2 border-b border-gold/30 pb-2 w-full md:w-auto text-white">
            <Scale className="w-5 h-5 text-gold" /> บริการหลัก
          </h4>
          <ul className="space-y-4 text-sm font-bold">
            <li><a href="/search?role=citizen" className="text-white hover:text-gold transition-all flex items-center gap-2 justify-center md:justify-start">» สืบค้นกฎหมายภาคประชาชน</a></li>
            <li><a href="/trust-center" className="text-white hover:text-gold transition-all flex items-center gap-2 justify-center md:justify-start">» ศูนย์รวมความน่าเชื่อถือของระบบ</a></li>
            <li><a href="/government" className="text-white hover:text-gold transition-all flex items-center gap-2 justify-center md:justify-start">» ระบบเจ้าหน้าที่ธุรการศาล</a></li>
            <li><a href="/judge" className="text-white hover:text-gold transition-all flex items-center gap-2 justify-center md:justify-start">» ระบบสนับสนุนตุลาการ</a></li>
            <li><span className="text-white/60 flex items-center gap-2 justify-center md:justify-start">» โซลูชันสำหรับนักกฎหมาย (Private Offering)</span></li>
          </ul>
        </div>

        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <h4 className="font-heading font-bold text-lg mb-6 flex items-center gap-2 border-b border-gold/30 pb-2 w-full md:w-auto text-white">
            <ExternalLink className="w-5 h-5 text-gold" /> ลิงก์หน่วยงาน
          </h4>
          <ul className="space-y-4 text-sm font-bold">
            <li><a href="https://www.coj.go.th" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gold transition-all flex items-center gap-2 justify-center md:justify-start">ศาลยุติธรรม <ExternalLink className="w-3 h-3 opacity-50" /></a></li>
            <li><a href="https://www.admincourt.go.th" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gold transition-all flex items-center gap-2 justify-center md:justify-start">ศาลปกครอง <ExternalLink className="w-3 h-3 opacity-50" /></a></li>
            <li><a href="https://www.ratchakitcha.soc.go.th" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gold transition-all flex items-center gap-2 justify-center md:justify-start">ราชกิจจานุเบกษา <ExternalLink className="w-3 h-3 opacity-50" /></a></li>
            <li><a href="https://www.etda.or.th" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gold transition-all flex items-center gap-2 justify-center md:justify-start">ETDA (สพธอ.) <ExternalLink className="w-3 h-3 opacity-50" /></a></li>
          </ul>
        </div>

        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <h4 className="font-heading font-bold text-lg mb-6 flex items-center gap-2 border-b border-gold/30 pb-2 w-full md:w-auto text-white">
            <MapPin className="w-5 h-5 text-gold" /> ช่องทางการติดต่อ
          </h4>
          <div className="space-y-5 text-sm font-bold">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-3">
              <Phone className="w-5 h-5 text-gold flex-shrink-0" />
              <div>
                <p className="text-white/60 text-[10px] uppercase tracking-widest mb-1">สายด่วนกฎหมาย</p>
                <p className="text-white">02-141-5100</p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-center md:items-start gap-3">
              <Mail className="w-5 h-5 text-gold flex-shrink-0" />
              <div>
                <p className="text-white/60 text-[10px] uppercase tracking-widest mb-1">อีเมลติดต่อ</p>
                <p className="text-white">info@legalguard.go.th</p>
              </div>
            </div>
            <div className="pt-6 border-t border-white/10 w-full">
              <p className="text-[11px] text-gold font-bold leading-relaxed italic">
                สำนักงานนวัตกรรมดิจิทัลเพื่อกระบวนการยุติธรรม 
                (National Digital Justice Innovation Office)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-20 pt-10 border-t border-white/10 text-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-xs text-white font-bold tracking-widest uppercase mb-1">
            © 2569 Smart LegalGuard AI — ศูนย์รวมนวัตกรรม AI เพื่อความยุติธรรม
          </p>
          <div className="flex items-center gap-2 group cursor-pointer">
            <span className="text-[11px] text-white/50 uppercase tracking-widest">Designed & Developed by</span>
            <span className="text-gold font-heading font-bold text-sm group-hover:text-gold-light transition-colors">Honest Predictor</span>
            <Scale className="w-4 h-4 text-gold group-hover:rotate-12 transition-transform" />
          </div>
          <p className="text-[11px] text-gold/60 font-medium max-w-xl">
            ETDA Responsible AI Innovation Hackathon 2026 | พัฒนาภายใต้มาตรฐานความปลอดภัยระดับชาติ RAAIA
          </p>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
