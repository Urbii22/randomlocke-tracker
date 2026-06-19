import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type MetricCardProps = {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone?: "amber" | "cyan" | "rose" | "zinc";
};

const toneStyles = {
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  rose: "border-rose-400/30 bg-rose-400/10 text-rose-100",
  zinc: "border-zinc-700 bg-zinc-900 text-zinc-100",
};

export function MetricCard({ label, value, detail, icon: Icon, tone = "zinc" }: MetricCardProps) {
  return (
    <section className={cn("rounded-md border p-4 shadow-sm", toneStyles[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-current/60">{label}</p>
          <p className="mt-3 text-3xl font-black tabular-nums text-current">{value}</p>
        </div>
        <span className="rounded-md border border-current/15 bg-black/20 p-2 text-current">
          <Icon size={18} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-sm text-current/70 text-pretty">{detail}</p>
    </section>
  );
}
