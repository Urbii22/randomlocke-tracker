import { pokemonStatusLabels } from "@/lib/game";
import { cn } from "@/lib/cn";
import type { PokemonStatus, RouteStatus } from "@/types/randomlocke";

const pokemonStyles: Record<PokemonStatus, string> = {
  alive: "border-emerald-400/40 bg-emerald-400/15 text-emerald-200",
  box: "border-sky-400/40 bg-sky-400/15 text-sky-200",
  dead: "border-rose-400/40 bg-rose-400/15 text-rose-200",
  candidate: "border-amber-300/40 bg-amber-300/15 text-amber-100",
  sacrificable: "border-orange-400/40 bg-orange-400/15 text-orange-200",
  forbidden: "border-zinc-500/60 bg-zinc-700/50 text-zinc-300",
  shiny_extra: "border-fuchsia-300/50 bg-fuchsia-400/15 text-fuchsia-100",
};

const routeLabels: Record<RouteStatus, string> = {
  pending: "Pendiente",
  one_used: "1 usada",
  completed: "Completa",
  failed: "Fallida",
  shiny_extra: "Shiny extra",
  legendary_ignored: "Legendario ignorado",
};

const routeStyles: Record<RouteStatus, string> = {
  pending: "border-zinc-500/60 bg-zinc-800 text-zinc-300",
  one_used: "border-cyan-300/40 bg-cyan-400/15 text-cyan-100",
  completed: "border-emerald-400/40 bg-emerald-400/15 text-emerald-200",
  failed: "border-rose-400/40 bg-rose-400/15 text-rose-200",
  shiny_extra: "border-fuchsia-300/50 bg-fuchsia-400/15 text-fuchsia-100",
  legendary_ignored: "border-violet-300/40 bg-violet-400/15 text-violet-100",
};

type StatusBadgeProps =
  | { kind: "pokemon"; status: PokemonStatus }
  | { kind: "route"; status: RouteStatus };

export function StatusBadge(props: StatusBadgeProps) {
  const label =
    props.kind === "pokemon"
      ? pokemonStatusLabels[props.status]
      : routeLabels[props.status];
  const className =
    props.kind === "pokemon" ? pokemonStyles[props.status] : routeStyles[props.status];

  return (
    <span className={cn("inline-flex items-center rounded-sm border px-2 py-1 text-xs font-semibold", className)}>
      {label}
    </span>
  );
}
