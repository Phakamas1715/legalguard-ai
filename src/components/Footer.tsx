import { Shield, Mail, Phone } from "lucide-react";
import logo from "@/assets/legalguard-logo.png";

const Footer = () => (
  <footer className="bg-primary text-primary-foreground mt-16">
    <div className="container mx-auto px-4 py-10">
      <div className="grid md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <img src={logo} alt="" className="w-10 h-10 rounded-full" width={40} height={40} loading="lazy" />
            <div>
              <div className="font-heading text-lg font-bold">Smart LegalGuard AI</div>
              <div className="text-sm opacity-75">กระทรวงยุติธรรม</div>
            </div>
          </div>
          <p className="text-sm opacity-75 leading-relaxed">
            ระบบสืบค้นข้อมูลกฎหมายไทยอัจฉริยะ พัฒนาเพื่อให้บริการประชาชนและหน่วยงานภาครัฐ
            ด้วยเทคโนโลยี AI ที่น่าเชื่อถือและปลอดภัย
          </p>
        </div>
        <div>
          <h4 className="font-heading font-bold mb-3">ลิงก์สำคัญ</h4>
          <ul className="space-y-2 text-sm opacity-75">
            <li><a href="https://www.coj.go.th" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 hover:underline">ศาลยุติธรรม</a></li>
            <li><a href="https://www.admincourt.go.th" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 hover:underline">ศาลปกครอง</a></li>
            <li><a href="https://www.ratchakitcha.soc.go.th" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 hover:underline">ราชกิจจานุเบกษา</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading font-bold mb-3">ติดต่อ</h4>
          <div className="space-y-2 text-sm opacity-75">
            <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> 02-141-5100</div>
            <div className="flex items-center gap-2"><Mail className="w-4 h-4" /> info@legalguard.go.th</div>
          </div>
          <div className="flex items-center gap-2 mt-4 text-xs opacity-60">
            <Shield className="w-4 h-4" />
            ข้อมูลปลอดภัยตาม PDPA | ปกป้องข้อมูลส่วนบุคคล
          </div>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t border-primary-foreground/20 text-center text-xs opacity-50">
        © 2569 Smart LegalGuard AI | ETDA Responsible AI Innovation Hackathon 2026 — AI for Justice
      </div>
    </div>
  </footer>
);

export default Footer;
