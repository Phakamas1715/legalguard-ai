import { motion } from "framer-motion";
import cojLogo from "@/assets/logos/20200513d41d8cd98f00b204e9800998ecf8427e094310.png";
import tijLogo from "@/assets/logos/Logo_of_the_Thailand_Institute_of_Justice.svg.png";
import awsLogo from "@/assets/logos/Amazon_Web_Services_Logo.svg.png";
import etdaLogo from "@/assets/logos/Unknown.png";
import aigcLogo from "@/assets/logos/aigc-logo.png";

const PARTNERS = [
  { 
    name: "COJ", 
    label: "ศาลยุติธรรม", 
    logo: cojLogo,
    imageClassName: "max-h-12 md:max-h-14 w-auto",
    url: "https://www.coj.go.th" 
  },
  { 
    name: "TIJ", 
    label: "TIJ THAILAND", 
    logo: tijLogo,
    imageClassName: "max-h-11 md:max-h-12 w-auto",
    url: "https://www.tijthailand.org" 
  },
  { 
    name: "AWS", 
    label: "AWS Partner", 
    logo: awsLogo,
    imageClassName: "max-h-10 md:max-h-11 w-auto",
    url: "https://aws.amazon.com" 
  },
  { 
    name: "ETDA", 
    label: "สพธอ. (ETDA)", 
    logo: etdaLogo,
    imageClassName: "max-h-8 md:max-h-9 w-auto",
    url: "https://www.etda.or.th" 
  },
  { 
    name: "AIGC", 
    label: "AI Governance", 
    logo: aigcLogo,
    imageClassName: "max-h-6 md:max-h-7 w-auto",
    url: "https://aigc.etda.or.th" 
  },
];

const mobileSpanClass = (index: number) => {
  if (PARTNERS.length % 2 === 1 && index === PARTNERS.length - 1) {
    return "col-span-2 max-w-[220px] justify-self-center";
  }
  return "";
};

const PartnerCard = ({
  name,
  label,
  logo,
  url,
  imageClassName,
  index,
  mobile,
}: {
  name: string;
  label: string;
  logo: string;
  url: string;
  imageClassName?: string;
  index: number;
  mobile?: boolean;
}) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={name}
    className={`no-underline ${mobile ? mobileSpanClass(index) : ""}`}
  >
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ scale: 1.03, y: -4 }}
      className="group/item flex h-full min-h-[146px] flex-col items-center justify-start rounded-[1.75rem] border border-white/10 bg-white/5 px-4 py-5 text-center shadow-xl shadow-navy/5 backdrop-blur-md transition-all duration-500 hover:border-gold/40 hover:bg-white/10"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-black/5 md:h-[72px] md:w-[72px]">
        <img
          src={logo}
          alt={name}
          className={`h-auto object-contain drop-shadow-sm ${imageClassName ?? ""}`}
        />
      </div>
      <div className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-white transition-colors group-hover/item:text-gold md:text-sm">
        {name}
      </div>
      <div className="mt-1 max-w-[120px] text-[10px] font-bold uppercase tracking-[0.12em] leading-tight text-white/55 md:max-w-[140px]">
        {label}
      </div>
    </motion.div>
  </a>
);

const PartnerBar = () => {
  return (
    <div className="w-full bg-navy-deep/20 backdrop-blur-xl border-y border-white/5 py-10 overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-gold/5 to-teal/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center gap-8">
          <div className="flex items-center gap-4 w-full max-w-2xl text-center justify-center">
            <div className="h-px bg-gradient-to-r from-transparent to-gold/30 flex-1"></div>
            <p className="text-[10px] font-black tracking-[0.3em] uppercase text-gold/80 drop-shadow-sm whitespace-nowrap">Official Responsible AI Partners</p>
            <div className="h-px bg-gradient-to-l from-transparent to-gold/30 flex-1"></div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 opacity-95 transition-all duration-700 ease-in-out md:hidden">
            {PARTNERS.map((p, i) => (
              <PartnerCard
                key={p.name} 
                name={p.name}
                label={p.label}
                logo={p.logo}
                url={p.url}
                imageClassName={p.imageClassName}
                index={i}
                mobile
              />
            ))}
          </div>

          <div className="hidden grid-cols-5 gap-4 opacity-95 transition-all duration-700 ease-in-out md:grid lg:gap-5">
            {PARTNERS.map((p, i) => (
              <PartnerCard
                key={p.name}
                name={p.name}
                label={p.label}
                logo={p.logo}
                url={p.url}
                imageClassName={p.imageClassName}
                index={i}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerBar;
