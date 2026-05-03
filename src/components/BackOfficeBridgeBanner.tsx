import { Link } from "react-router-dom";
import { ArrowRight, LayoutDashboard, type LucideIcon } from "lucide-react";

type Tone = "gold" | "primary" | "teal";

interface BridgeAction {
  label: string;
  path: string;
  icon?: LucideIcon;
}

interface BackOfficeBridgeBannerProps {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: BridgeAction;
  secondaryAction?: BridgeAction;
  tone?: Tone;
}

const toneClasses: Record<Tone, string> = {
  gold: "border-gold/25 bg-gold-light text-accent-foreground",
  primary: "border-primary/20 bg-primary/5 text-foreground",
  teal: "border-teal/25 bg-teal-light/60 text-foreground",
};

const BackOfficeBridgeBanner = ({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  tone = "primary",
}: BackOfficeBridgeBannerProps) => (
  <div className={`rounded-[1.75rem] border p-5 shadow-card ${toneClasses[tone]}`}>
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-current/10 bg-white/60 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em]">
          <LayoutDashboard className="h-3.5 w-3.5" />
          {eyebrow}
        </div>
        <h2 className="mt-3 font-heading text-2xl font-black">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <BridgeLink action={primaryAction} primary />
        {secondaryAction && <BridgeLink action={secondaryAction} />}
      </div>
    </div>
  </div>
);

const BridgeLink = ({
  action,
  primary = false,
}: {
  action: BridgeAction;
  primary?: boolean;
}) => {
  const Icon = action.icon ?? LayoutDashboard;

  return (
    <Link
      to={action.path}
      className={`inline-flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${
        primary
          ? "bg-navy-deep text-white hover:bg-primary"
          : "border border-border bg-card text-foreground hover:bg-muted"
      }`}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {action.label}
      </span>
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
};

export default BackOfficeBridgeBanner;
