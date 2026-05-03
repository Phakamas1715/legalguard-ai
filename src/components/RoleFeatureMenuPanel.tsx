import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface RoleFeatureMenuItem {
  title: string;
  desc: string;
  icon: LucideIcon;
  accent?: string;
}

interface RoleFeatureMenuPanelProps {
  eyebrow: string;
  title: string;
  description: string;
  menus: RoleFeatureMenuItem[];
  activeTitle: string;
  onSelect: (title: string) => void;
  activeSummary?: ReactNode;
  getCount?: (title: string) => number;
  children: ReactNode;
}

const RoleFeatureMenuPanel = ({
  eyebrow,
  title,
  description,
  menus,
  activeTitle,
  onSelect,
  activeSummary,
  getCount,
  children,
}: RoleFeatureMenuPanelProps) => (
  <section className="mt-8 rounded-[2rem] border border-border bg-card p-6 shadow-card">
    <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary/70">{eyebrow}</p>
        <h2 className="font-heading text-2xl font-black text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {activeSummary ? (
        <div className="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
          {activeSummary}
        </div>
      ) : null}
    </div>

    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="space-y-3">
        {menus.map((menu) => (
          <button
            key={menu.title}
            type="button"
            onClick={() => onSelect(menu.title)}
            className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${
              activeTitle === menu.title
                ? "border-primary/30 bg-primary/5 shadow-sm"
                : "border-border bg-background hover:border-primary/20 hover:bg-muted/40"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 rounded-xl bg-background p-2 ${menu.accent ?? "text-primary"}`}>
                <menu.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{menu.title}</p>
                  {getCount ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {getCount(menu.title)} ฟีเจอร์
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{menu.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div>{children}</div>
    </div>
  </section>
);

export default RoleFeatureMenuPanel;
