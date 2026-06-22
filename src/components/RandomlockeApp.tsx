"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import {
  Activity,
  Boxes,
  Brain,
  Cross,
  Download,
  Droplets,
  Dumbbell,
  Eye,
  Flame,
  Gauge,
  Ghost,
  HeartPulse,
  HardDrive,
  Leaf,
  Map as MapIcon,
  Moon,
  Mountain,
  Package,
  Plus,
  RotateCcw,
  RefreshCw,
  Settings,
  Shield,
  Skull,
  Snowflake,
  Sparkles,
  Swords,
  Upload,
  Users,
  Wind,
  Zap,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useLocalStorageGameState } from "@/hooks/useLocalStorageGameState";
import { getTeamCombatProfile, type PokemonType } from "@/lib/combat";
import { cn } from "@/lib/cn";
import {
  calculateDashboardSummary,
  isNormalCaptureLimitReached,
  pokemonStatusLabels,
  updatePokemonStatus,
  upsertInventoryItem,
  upsertRoute,
  upsertPokemon,
} from "@/lib/game";
import { mergeSaveSnapshot, type SaveSnapshot, type SaveSyncReport } from "@/lib/saveSync";
import { serializeGameState } from "@/lib/storage";
import type {
  Battle,
  InventoryCategory,
  InventoryItem,
  Pokemon,
  PokemonStatus,
  Route,
} from "@/types/randomlocke";
import {
  InventoryEditorPanel,
  inventoryCategoryLabels,
  inventoryStatusLabels,
} from "./InventoryForm";
import { MetricCard } from "./MetricCard";
import { PokemonEditorPanel } from "./PokemonForm";
import { RouteEditorPanel } from "./RouteForm";
import { StatusBadge } from "./StatusBadge";

type View = "dashboard" | "combat" | "pokemon" | "routes" | "inventory" | "dead" | "settings";

type SaveSyncApiResponse =
  | { snapshot: SaveSnapshot }
  | { error: string };

const navItems: { view: View; label: string; icon: typeof Gauge }[] = [
  { view: "dashboard", label: "Dashboard", icon: Gauge },
  { view: "combat", label: "Combate", icon: Swords },
  { view: "pokemon", label: "Pokémon", icon: Shield },
  { view: "routes", label: "Rutas", icon: MapIcon },
  { view: "inventory", label: "Bolsa", icon: Package },
  { view: "dead", label: "Muertos", icon: Skull },
  { view: "settings", label: "Ajustes", icon: Settings },
];

const typeVisuals: Record<
  PokemonType,
  { icon: typeof Gauge; classes: string; short: string }
> = {
  Normal: {
    icon: Activity,
    classes: "border-stone-400/50 bg-stone-300/15 text-stone-100",
    short: "No",
  },
  Fuego: {
    icon: Flame,
    classes: "border-red-400/60 bg-red-500/15 text-red-100",
    short: "Fu",
  },
  Agua: {
    icon: Droplets,
    classes: "border-sky-300/60 bg-sky-500/15 text-sky-100",
    short: "Ag",
  },
  Planta: {
    icon: Leaf,
    classes: "border-emerald-300/60 bg-emerald-500/15 text-emerald-100",
    short: "Pl",
  },
  Eléctrico: {
    icon: Zap,
    classes: "border-yellow-300/70 bg-yellow-300/15 text-yellow-100",
    short: "El",
  },
  Hielo: {
    icon: Snowflake,
    classes: "border-cyan-200/70 bg-cyan-300/15 text-cyan-50",
    short: "Hi",
  },
  Lucha: {
    icon: Dumbbell,
    classes: "border-orange-400/60 bg-orange-500/15 text-orange-100",
    short: "Lu",
  },
  Veneno: {
    icon: Sparkles,
    classes: "border-fuchsia-300/60 bg-fuchsia-500/15 text-fuchsia-100",
    short: "Ve",
  },
  Tierra: {
    icon: Mountain,
    classes: "border-amber-500/60 bg-amber-700/20 text-amber-100",
    short: "Ti",
  },
  Volador: {
    icon: Wind,
    classes: "border-indigo-200/60 bg-indigo-400/15 text-indigo-100",
    short: "Vo",
  },
  Psíquico: {
    icon: Brain,
    classes: "border-pink-300/60 bg-pink-500/15 text-pink-100",
    short: "Ps",
  },
  Bicho: {
    icon: Leaf,
    classes: "border-lime-300/60 bg-lime-500/15 text-lime-100",
    short: "Bi",
  },
  Roca: {
    icon: Mountain,
    classes: "border-yellow-700/70 bg-yellow-900/30 text-yellow-100",
    short: "Ro",
  },
  Fantasma: {
    icon: Ghost,
    classes: "border-violet-300/60 bg-violet-500/15 text-violet-100",
    short: "Fa",
  },
  Dragón: {
    icon: Sparkles,
    classes: "border-purple-300/60 bg-purple-500/15 text-purple-100",
    short: "Dr",
  },
  Siniestro: {
    icon: Moon,
    classes: "border-zinc-400/60 bg-zinc-700/30 text-zinc-100",
    short: "Si",
  },
  Acero: {
    icon: Shield,
    classes: "border-slate-300/60 bg-slate-400/15 text-slate-100",
    short: "Ac",
  },
  Hada: {
    icon: Sparkles,
    classes: "border-rose-200/70 bg-rose-300/15 text-rose-100",
    short: "Ha",
  },
};

export function RandomlockeApp() {
  const [view, setView] = useState<View>("dashboard");
  const [editing, setEditing] = useState<Pokemon | undefined>();
  const [isPokemonPanelOpen, setIsPokemonPanelOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | undefined>();
  const [isRoutePanelOpen, setIsRoutePanelOpen] = useState(false);
  const [editingInventoryItem, setEditingInventoryItem] = useState<InventoryItem | undefined>();
  const [isInventoryPanelOpen, setIsInventoryPanelOpen] = useState(false);
  const [filter, setFilter] = useState<PokemonStatus | "all">("all");
  const [inventoryFilter, setInventoryFilter] = useState<InventoryCategory | "all">("all");
  const [importText, setImportText] = useState("");
  const [isSyncingSave, setIsSyncingSave] = useState(false);
  const [saveSyncError, setSaveSyncError] = useState("");
  const [saveSyncReport, setSaveSyncReport] = useState<SaveSyncReport | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const game = useLocalStorageGameState();
  const summary = useMemo(() => calculateDashboardSummary(game.state), [game.state]);
  const combatProfile = useMemo(
    () => getTeamCombatProfile(game.state.pokemon),
    [game.state.pokemon],
  );

  const filteredPokemon = useMemo(() => {
    if (filter === "all") return game.state.pokemon;
    return game.state.pokemon.filter((pokemon) => pokemon.status === filter);
  }, [filter, game.state.pokemon]);

  const filteredInventory = useMemo(() => {
    if (inventoryFilter === "all") return game.state.inventory;
    return game.state.inventory.filter((item) => item.category === inventoryFilter);
  }, [game.state.inventory, inventoryFilter]);

  function setPokemonStatus(pokemonId: string, status: PokemonStatus) {
    game.setState((state) => updatePokemonStatus(state, pokemonId, status));
  }

  function savePokemon(pokemon: Pokemon) {
    game.setState((state) => upsertPokemon(state, pokemon));
    setEditing(undefined);
  }

  function saveRoute(route: Route) {
    game.setState((state) => upsertRoute(state, route));
    setEditingRoute(undefined);
  }

  function saveInventoryItem(item: InventoryItem) {
    game.setState((state) => upsertInventoryItem(state, item));
    setEditingInventoryItem(undefined);
  }

  function exportJsonFile() {
    const blob = new Blob([game.exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "randomlocke-tracker.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importFromFile(file?: File) {
    if (!file) return;
    const text = await file.text();
    setImportText(text);
    game.importJson(text);
  }

  function resetGame() {
    game.reset();
    setEditing(undefined);
    setSaveSyncReport(undefined);
    setSaveSyncError("");
  }

  function updateSaveFilePath(saveFilePath: string) {
    game.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        saveFilePath,
      },
      updatedAt: new Date().toISOString(),
    }));
  }

  async function syncFromSave() {
    setIsSyncingSave(true);
    setSaveSyncError("");

    try {
      const response = await fetch("/api/save/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savePath: game.state.settings.saveFilePath }),
      });
      const payload = (await response.json()) as SaveSyncApiResponse;

      if (!response.ok || "error" in payload) {
        setSaveSyncError("error" in payload ? payload.error : "No se pudo sincronizar el save.");
        return;
      }

      const result = mergeSaveSnapshot(game.state, payload.snapshot);
      game.setState(result.state);
      setSaveSyncReport(result.report);
    } catch {
      setSaveSyncError("No se pudo conectar con la API local de sincronizacion.");
    } finally {
      setIsSyncingSave(false);
    }
  }

  return (
    <div className="min-h-dvh bg-stone-950 text-stone-100">
      <div className="mx-auto grid max-w-[1600px] gap-0 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-stone-800 bg-stone-950 px-4 py-4 lg:sticky lg:top-0 lg:min-h-dvh lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="rounded-md border border-amber-400/30 bg-stone-900 p-4">
            <p className="font-mono text-xs font-bold uppercase text-amber-300">Kalos field file</p>
            <h1 className="mt-3 text-3xl font-black leading-8 text-balance text-stone-50">
              Randomlocke Tracker
            </h1>
            <p className="mt-3 text-sm text-pretty text-stone-400">
              1 vida, 2 capturas por zona, mote obligatorio y cero legendarios.
            </p>
          </div>

          <nav className="mt-4 grid gap-2" aria-label="Pantallas">
            {navItems.map(({ view: itemView, label, icon: Icon }) => {
              const active = view === itemView;
              return (
                <button
                  key={itemView}
                  type="button"
                  onClick={() => setView(itemView)}
                  className={cn(
                    "flex min-h-11 items-center justify-between rounded-md border px-3 py-2 text-sm font-bold transition-colors",
                    active
                      ? "border-amber-300 bg-amber-300 text-stone-950"
                      : "border-stone-800 bg-stone-900 text-stone-300 hover:border-stone-600 hover:text-stone-50",
                  )}
                  title={label}
                >
                  <span className="flex items-center gap-2">
                    <Icon size={16} aria-hidden="true" />
                    {label}
                  </span>
                  <span className="font-mono text-xs tabular-nums">{navCount(itemView, game.state.pokemon, game.state.routes, game.state.inventory)}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center lg:grid-cols-1 lg:text-left">
            <SideStat label="Cap" value={summary.currentLevelCap} />
            <SideStat label="Equipo" value={`${summary.teamCount}/6`} />
            <SideStat label="Muertos" value={summary.deadCount} />
          </div>
        </aside>

        <main className="grid gap-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          {!game.isReady ? (
            <div className="rounded-md border border-stone-800 bg-stone-900 p-5 text-stone-300">
              Cargando partida local...
            </div>
          ) : null}

          <RunHeader nextGym={summary.nextGym} nextFriendBattle={summary.nextFriendBattle} />

          {view === "dashboard" ? (
            <Dashboard pokemon={game.state.pokemon} battles={game.state.battles} summary={summary} />
          ) : null}
          {view === "combat" ? (
            <>
              <CombatHub
                profile={combatProfile}
                onEditPokemon={(pokemon) => {
                  setEditing(pokemon);
                  setIsPokemonPanelOpen(true);
                }}
              />
              <PokemonEditorPanel
                open={isPokemonPanelOpen}
                onOpenChange={(open) => {
                  setIsPokemonPanelOpen(open);
                  if (!open) setEditing(undefined);
                }}
                editing={editing}
                onSubmit={savePokemon}
                onCancel={() => setEditing(undefined)}
              />
            </>
          ) : null}
          {view === "pokemon" ? (
            <>
              <PokemonTable
                pokemon={filteredPokemon}
                filter={filter}
                onFilterChange={setFilter}
                onAdd={() => {
                  setEditing(undefined);
                  setIsPokemonPanelOpen(true);
                }}
                onEdit={(pokemon) => {
                  setEditing(pokemon);
                  setIsPokemonPanelOpen(true);
                }}
                onStatusChange={setPokemonStatus}
              />
              <PokemonEditorPanel
                open={isPokemonPanelOpen}
                onOpenChange={(open) => {
                  setIsPokemonPanelOpen(open);
                  if (!open) setEditing(undefined);
                }}
                editing={editing}
                onSubmit={savePokemon}
                onCancel={() => setEditing(undefined)}
              />
            </>
          ) : null}
          {view === "routes" ? (
            <>
              <RoutesTable
                pokemon={game.state.pokemon}
                routes={game.state.routes}
                onAdd={() => {
                  setEditingRoute(undefined);
                  setIsRoutePanelOpen(true);
                }}
                onEdit={(route) => {
                  setEditingRoute(route);
                  setIsRoutePanelOpen(true);
                }}
              />
              <RouteEditorPanel
                open={isRoutePanelOpen}
                onOpenChange={(open) => {
                  setIsRoutePanelOpen(open);
                  if (!open) setEditingRoute(undefined);
                }}
                editing={editingRoute}
                pokemon={game.state.pokemon}
                onSubmit={saveRoute}
                onCancel={() => setEditingRoute(undefined)}
              />
            </>
          ) : null}
          {view === "inventory" ? (
            <>
              <InventoryTable
                items={filteredInventory}
                pokemon={game.state.pokemon}
                filter={inventoryFilter}
                onFilterChange={setInventoryFilter}
                onAdd={() => {
                  setEditingInventoryItem(undefined);
                  setIsInventoryPanelOpen(true);
                }}
                onEdit={(item) => {
                  setEditingInventoryItem(item);
                  setIsInventoryPanelOpen(true);
                }}
              />
              <InventoryEditorPanel
                open={isInventoryPanelOpen}
                onOpenChange={(open) => {
                  setIsInventoryPanelOpen(open);
                  if (!open) setEditingInventoryItem(undefined);
                }}
                editing={editingInventoryItem}
                pokemon={game.state.pokemon}
                onSubmit={saveInventoryItem}
                onCancel={() => setEditingInventoryItem(undefined)}
              />
            </>
          ) : null}
          {view === "dead" ? <Graveyard pokemon={game.state.pokemon} /> : null}
          {view === "settings" ? (
            <SettingsPanel
              exportJsonFile={exportJsonFile}
              fileInputRef={fileInputRef}
              importText={importText}
              setImportText={setImportText}
              importFromFile={importFromFile}
              applyImport={() => game.importJson(importText)}
              resetGame={resetGame}
              stateJson={serializeGameState(game.state)}
              saveFilePath={game.state.settings.saveFilePath}
              onSaveFilePathChange={updateSaveFilePath}
              onSyncFromSave={() => void syncFromSave()}
              isSyncingSave={isSyncingSave}
              saveSyncError={saveSyncError}
              saveSyncReport={saveSyncReport}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}

function navCount(view: View, pokemon: Pokemon[], routes: Route[], inventory: InventoryItem[]) {
  if (view === "combat") return pokemon.filter((entry) => entry.status === "alive").length;
  if (view === "pokemon") return pokemon.length;
  if (view === "routes") return routes.length;
  if (view === "inventory") return inventory.length;
  if (view === "dead") return pokemon.filter((entry) => entry.status === "dead").length;
  return "";
}

function SideStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-stone-800 bg-stone-900 px-3 py-2">
      <p className="text-xs font-semibold uppercase text-stone-500">{label}</p>
      <p className="font-mono text-xl font-black tabular-nums text-stone-50">{value}</p>
    </div>
  );
}

function CombatHub({
  profile,
  onEditPokemon,
}: {
  profile: ReturnType<typeof getTeamCombatProfile>;
  onEditPokemon: (pokemon: Pokemon) => void;
}) {
  const dangerRows = profile.defenseRows
    .filter((row) => row.weakTo.length > 0)
    .toSorted((a, b) => b.weakTo.length - a.weakTo.length);
  const safeRows = profile.defenseRows
    .filter((row) => row.resists.length > 0 || row.immune.length > 0)
    .toSorted((a, b) => b.immune.length + b.resists.length - (a.immune.length + a.resists.length));
  const bestSwitchType = safeRows[0];

  return (
    <section className="grid gap-4">
      <section className="rounded-md border border-stone-800 bg-stone-900 p-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_460px]">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-black uppercase text-amber-300">Mesa de combate</p>
                <h2 className="mt-1 text-xl font-black text-balance text-stone-50">Vista de un vistazo</h2>
              </div>
              <span className="rounded-sm border border-stone-700 bg-stone-950 px-2 py-1 font-mono text-xs font-bold tabular-nums text-stone-300">
                {profile.members.length}/6 activos
              </span>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <CombatSignal
                icon={Swords}
                label="Cobertura"
                value={`${profile.offensiveTypes.length}/18`}
                detail="tipos ofensivos"
                tone="amber"
              />
              <CombatSignal
                icon={Eye}
                label="Peor entrada"
                value={dangerRows[0]?.type ?? "-"}
                detail={dangerRows[0] ? `${dangerRows[0].weakTo.length} débiles` : "sin amenazas"}
                tone="rose"
              />
              <CombatSignal
                icon={Shield}
                label="Mejor cambio"
                value={bestSwitchType?.type ?? "-"}
                detail={
                  bestSwitchType
                    ? `${bestSwitchType.immune.length} inmunes · ${bestSwitchType.resists.length} resisten`
                    : "sin resistencias"
                }
                tone="cyan"
              />
            </div>
          </div>

          <div className="rounded-md border border-stone-800 bg-stone-950 p-2.5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-black uppercase text-stone-300">Cobertura ofensiva</h3>
              <span className="font-mono text-xs font-bold text-stone-500">
                {profile.offensiveTypes.length} tipos
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile.offensiveTypes.length > 0 ? (
                profile.offensiveTypes.map((type) => <TypeBadge key={type} type={type} compact />)
              ) : (
                <span className="text-sm text-stone-400">Sin ataques tipados reconocidos.</span>
              )}
            </div>
          </div>
        </div>

        {profile.members.length === 0 ? (
          <div className="mt-4 rounded-md border border-stone-800 bg-stone-950 p-5">
            <p className="font-semibold text-stone-100">No hay Pokémon en el equipo.</p>
            <p className="mt-1 text-sm text-pretty text-stone-400">
              Mete un Pokémon al equipo para generar la referencia de combate.
            </p>
          </div>
        ) : (
          <CombatRosterTable members={profile.members} onEditPokemon={onEditPokemon} />
        )}
      </section>

      <TeamDefenseTable rows={profile.defenseRows} />
    </section>
  );
}

function CombatSignal({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Gauge;
  label: string;
  value: string | number;
  detail: string;
  tone: "amber" | "rose" | "cyan";
}) {
  const toneClass = {
    amber: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    rose: "border-rose-300/30 bg-rose-400/10 text-rose-100",
    cyan: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
  }[tone];

  return (
    <div className={cn("rounded-md border p-2.5", toneClass)}>
      <div className="flex items-center gap-2">
        <Icon size={14} aria-hidden="true" />
        <p className="text-[0.65rem] font-black uppercase opacity-75">{label}</p>
      </div>
      <p className="mt-1.5 font-mono text-xl font-black leading-none tabular-nums">{value}</p>
      <p className="mt-1 text-xs font-semibold opacity-80">{detail}</p>
    </div>
  );
}

function CombatRosterTable({
  members,
  onEditPokemon,
}: {
  members: ReturnType<typeof getTeamCombatProfile>["members"];
  onEditPokemon: (pokemon: Pokemon) => void;
}) {
  return (
    <div className="mt-3 overflow-hidden rounded-md border border-stone-800 bg-stone-950">
      <div className="hidden grid-cols-[1.05fr_1fr_1.6fr_1.5fr_1.15fr_auto] gap-2 border-b border-stone-800 px-2.5 py-2 text-[0.65rem] font-black uppercase text-stone-600 xl:grid">
        <span>Pokémon</span>
        <span>Tipos</span>
        <span>Movimientos</span>
        <span>Sufre</span>
        <span>Entra</span>
        <span />
      </div>
      <div className="divide-y divide-stone-800">
        {members.map((member) => (
          <CombatRosterRow
            key={member.pokemon.id}
            member={member}
            onEditPokemon={onEditPokemon}
          />
        ))}
      </div>
    </div>
  );
}

function CombatRosterRow({
  member,
  onEditPokemon,
}: {
  member: ReturnType<typeof getTeamCombatProfile>["members"][number];
  onEditPokemon: (pokemon: Pokemon) => void;
}) {
  return (
    <article className="grid gap-2 px-2.5 py-2.5 xl:grid-cols-[1.05fr_1fr_1.6fr_1.5fr_1.15fr_auto] xl:items-center">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 xl:block">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black leading-5 text-stone-50">{member.pokemon.nickname}</h3>
          <p className="text-xs text-stone-400">
            {member.pokemon.species} · Nv. {member.pokemon.level}
          </p>
        </div>
        <div className="xl:hidden">
          <button type="button" onClick={() => onEditPokemon(member.pokemon)} className="mini-button min-h-8 px-2 py-1 text-xs">
            Editar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {member.pokemon.types.map((type) => (
          <TypeBadge key={type} type={type} compact />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-2">
        {member.moveTypes.map((move) => (
          <MovePill key={move.move.name} move={move.move} type={move.type} />
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <TypeCount count={member.defensiveProfile.weaknesses.length} tone="danger" />
        <CompactTypeList rows={member.defensiveProfile.weaknesses} tone="danger" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <TypeCount
          count={member.defensiveProfile.resistances.length + member.defensiveProfile.immunities.length}
          tone="safe"
        />
        <CompactTypeList
          rows={[...member.defensiveProfile.immunities, ...member.defensiveProfile.resistances]}
          tone="safe"
        />
      </div>

      <button type="button" onClick={() => onEditPokemon(member.pokemon)} className="mini-button hidden min-h-8 px-2 py-1 text-xs xl:inline-flex">
        Editar
      </button>
    </article>
  );
}

function TypeCount({
  count,
  tone,
}: {
  count: number;
  tone: "danger" | "safe";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-sm border px-1.5 font-mono text-[0.65rem] font-black tabular-nums",
        tone === "danger"
          ? "border-rose-400/30 bg-rose-500/10 text-rose-100"
          : "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
      )}
    >
      {count}
    </span>
  );
}

function CompactTypeList({
  rows,
  tone,
}: {
  rows: { type: PokemonType; multiplier: number }[];
  tone: "danger" | "safe";
}) {
  if (rows.length === 0) {
    return <span className="text-xs font-semibold text-stone-600">-</span>;
  }

  return rows.map((row) => (
    <TypeBadge
      key={row.type}
      type={row.type}
      compact
      suffix={tone === "danger" || row.multiplier !== 0 ? `x${row.multiplier}` : "0"}
    />
  ));
}

function MovePill({
  move,
  type,
}: {
  move: Pokemon["moves"][number];
  type?: PokemonType;
}) {
  return (
    <div className="flex h-7 min-w-0 items-center justify-between gap-1.5 rounded-sm border border-stone-800 bg-stone-900 px-1.5">
      <span className="min-w-0 truncate text-[0.68rem] font-bold text-stone-200">{move.name}</span>
      <span className="flex shrink-0 items-center gap-1">
        <MoveCategoryBadge category={move.category} />
        {move.power ? <span className="font-mono text-[0.62rem] font-black text-amber-100">{move.power}</span> : null}
        {move.accuracy ? <span className="font-mono text-[0.62rem] font-black text-stone-400">{move.accuracy}%</span> : null}
        {type ? <TypeBadge type={type} compact /> : <span className="text-xs text-stone-600">?</span>}
      </span>
    </div>
  );
}

function MoveCategoryBadge({ category }: { category: Pokemon["moves"][number]["category"] }) {
  if (category === "unknown") return null;

  const label = {
    physical: "F",
    special: "E",
    status: "St",
  }[category];
  const className = {
    physical: "border-orange-400/40 bg-orange-500/10 text-orange-100",
    special: "border-cyan-300/40 bg-cyan-500/10 text-cyan-100",
    status: "border-violet-300/40 bg-violet-500/10 text-violet-100",
  }[category];

  return (
    <span className={cn("rounded-sm border px-1 font-mono text-[0.6rem] font-black", className)}>
      {label}
    </span>
  );
}

function TypeBadge({
  type,
  compact = false,
  iconOnly = false,
  suffix,
}: {
  type: string;
  compact?: boolean;
  iconOnly?: boolean;
  suffix?: string;
}) {
  const knownType = normalizeTypeForUi(type);
  const visual = knownType ? typeVisuals[knownType] : undefined;
  const Icon = visual?.icon ?? Activity;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-sm border font-black",
        visual?.classes ?? "border-stone-700 bg-stone-800 text-stone-100",
        compact ? "gap-1 px-1.5 py-1 text-[0.65rem]" : "gap-1.5 px-2 py-1 text-xs",
      )}
      title={type}
    >
      <Icon size={compact ? 12 : 14} aria-hidden="true" />
      {iconOnly ? (
        <span className="sr-only">{type}</span>
      ) : (
        <span>{compact ? visual?.short ?? type.slice(0, 2) : type}</span>
      )}
      {suffix ? <span className="font-mono opacity-80">{suffix}</span> : null}
    </span>
  );
}

function TeamDefenseTable({ rows }: { rows: ReturnType<typeof getTeamCombatProfile>["defenseRows"] }) {
  const visibleRows = rows.filter(
    (row) => row.weakTo.length > 0 || row.resists.length > 0 || row.immune.length > 0,
  );

  return (
    <section className="rounded-md border border-stone-800 bg-stone-900 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-balance text-stone-50">Matriz defensiva</h2>
          <p className="mt-1 text-sm text-pretty text-stone-400">
            Rojo es peligro, verde es cambio cómodo y azul entra gratis.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <LegendChip className="border-rose-400/40 bg-rose-500/10 text-rose-100" label="Débil" />
          <LegendChip className="border-emerald-300/40 bg-emerald-400/10 text-emerald-100" label="Resiste" />
          <LegendChip className="border-cyan-300/40 bg-cyan-400/10 text-cyan-100" label="Inmune" />
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {visibleRows.map((row) => (
          <div
            key={row.type}
            className="grid gap-2 rounded-md border border-stone-800 bg-stone-950 p-2 lg:grid-cols-[8.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"
          >
            <div className="flex items-center">
              <TypeBadge type={row.type} />
            </div>
            <DefenseBucket label="Sufren" names={row.weakTo} tone="danger" />
            <DefenseBucket label="Resisten" names={row.resists} tone="safe" />
            <DefenseBucket label="Inmunes" names={row.immune} tone="immune" />
          </div>
        ))}
      </div>
    </section>
  );
}

function DefenseBucket({
  label,
  names,
  tone,
}: {
  label: string;
  names: string[];
  tone: "danger" | "safe" | "immune";
}) {
  const toneClass = {
    danger: "border-rose-400/30 bg-rose-500/10 text-rose-100",
    safe: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
    immune: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
  }[tone];

  return (
    <div className="min-w-0">
      <p className="mb-1 text-[0.65rem] font-black uppercase text-stone-600">{label}</p>
      <div className="flex min-h-7 flex-wrap gap-1.5">
        {names.length > 0 ? (
          names.map((name) => (
            <span key={name} className={cn("rounded-sm border px-2 py-1 text-xs font-bold", toneClass)}>
              {name}
            </span>
          ))
        ) : (
          <span className="text-xs font-semibold text-stone-600">-</span>
        )}
      </div>
    </div>
  );
}

function LegendChip({ className, label }: { className: string; label: string }) {
  return <span className={cn("rounded-sm border px-2 py-1", className)}>{label}</span>;
}

function normalizeTypeForUi(type: string): PokemonType | undefined {
  return Object.keys(typeVisuals).find((entry) => entry === type) as PokemonType | undefined;
}

function RunHeader({ nextGym, nextFriendBattle }: { nextGym?: Battle; nextFriendBattle?: Battle }) {
  return (
    <section className="grid gap-3 rounded-md border border-stone-800 bg-stone-900 p-4 md:grid-cols-[1fr_auto]">
      <div>
        <p className="text-sm font-bold uppercase text-amber-300">Próxima decisión crítica</p>
        <h2 className="mt-1 text-2xl font-black text-balance text-stone-50">
          {nextGym?.name ?? "Ruta final sin gimnasio pendiente"}
        </h2>
        <p className="mt-2 text-sm text-pretty text-stone-400">
          Combate de amigos en cola: {nextFriendBattle?.name ?? "sin pendiente"}.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 md:min-w-72">
        <div className="rounded-md border border-amber-400/30 bg-amber-400/10 p-3">
          <p className="text-xs font-semibold uppercase text-amber-200/70">Level cap</p>
          <p className="font-mono text-4xl font-black tabular-nums text-amber-100">{nextGym?.levelCap ?? "-"}</p>
        </div>
        <div className="rounded-md border border-stone-700 bg-stone-950 p-3">
          <p className="text-xs font-semibold uppercase text-stone-500">Regla</p>
          <p className="mt-1 text-sm font-bold text-stone-200">No revivir</p>
          <p className="text-sm font-bold text-stone-200">No legendarios</p>
        </div>
      </div>
    </section>
  );
}

function Dashboard({ pokemon, battles, summary }: { pokemon: Pokemon[]; battles: Battle[]; summary: ReturnType<typeof calculateDashboardSummary> }) {
  const team = pokemon.filter((entry) => entry.status === "alive");
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Level cap" value={summary.currentLevelCap} detail={summary.nextGym?.name ?? "Liga pendiente"} icon={Flame} tone="amber" />
        <MetricCard label="Equipo" value={`${summary.teamCount}/6`} detail="Slots activos con una vida" icon={HeartPulse} tone="cyan" />
        <MetricCard label="Caja" value={summary.boxCount} detail={`${summary.candidateCount} candidatos listos`} icon={Boxes} tone="zinc" />
        <MetricCard label="Muertos" value={summary.deadCount} detail="Cementerio permanente" icon={Cross} tone="rose" />
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_420px]">
        <div className="rounded-md border border-stone-800 bg-stone-900 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-balance text-stone-50">Equipo actual</h2>
            <span className="rounded-sm border border-stone-700 px-2 py-1 font-mono text-xs font-bold tabular-nums text-stone-400">
              {team.length}/6
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {team.map((entry) => <RosterCard key={entry.id} pokemon={entry} />)}
          </div>
        </div>

        <div className="grid gap-4">
          <BattleCard title="Próximo gimnasio" battle={summary.nextGym} icon={Swords} />
          <BattleCard title="Próximo combate contra amigos" battle={summary.nextFriendBattle} icon={Users} />
          <section className="rounded-md border border-stone-800 bg-stone-900 p-4">
            <h2 className="text-lg font-black text-stone-50">Cola de combates</h2>
            <div className="mt-3 grid gap-2">
              {battles.filter((battle) => !battle.completed).slice(0, 6).map((battle) => (
                <div key={battle.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-md border border-stone-800 bg-stone-950 px-3 py-2 text-sm">
                  <span className="truncate font-semibold text-stone-200">{battle.name}</span>
                  <span className="font-mono tabular-nums text-amber-200">{battle.levelCap ?? "-"}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </>
  );
}

function RosterCard({ pokemon }: { pokemon: Pokemon }) {
  return (
    <article className="rounded-md border border-stone-800 bg-stone-950 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black text-stone-50">{pokemon.nickname}</p>
          <p className="text-sm text-stone-400">{pokemon.species} · Nv. {pokemon.level}</p>
        </div>
        <span className="rounded-sm bg-amber-300 px-2 py-1 font-mono text-sm font-black tabular-nums text-stone-950">
          {pokemon.value}/10
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {pokemon.types.map((type) => (
          <span key={type} className="rounded-sm border border-stone-700 px-2 py-1 text-xs font-bold text-stone-300">
            {type}
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm font-semibold text-pretty text-stone-200">{pokemon.role || "Sin rol asignado"}</p>
      <p className="mt-2 line-clamp-2 text-xs text-stone-500">
        {pokemon.moves.map((move) => move.name).join(" · ") || "Sin movimientos"}
      </p>
    </article>
  );
}

function BattleCard({ title, battle, icon: Icon }: { title: string; battle?: Battle; icon: typeof Gauge }) {
  return (
    <section className="rounded-md border border-stone-800 bg-stone-900 p-4">
      <div className="flex items-center gap-2 text-amber-200">
        <Icon size={18} aria-hidden="true" />
        <h2 className="text-sm font-black uppercase">{title}</h2>
      </div>
      <p className="mt-3 text-lg font-black text-balance text-stone-50">{battle?.name ?? "Sin pendiente"}</p>
      <p className="mt-1 text-sm text-pretty text-stone-400">Cap {battle?.levelCap ?? "-"} · {battle?.notes || "Sin notas"}</p>
    </section>
  );
}

function PokemonTable({ pokemon, filter, onFilterChange, onAdd, onEdit, onStatusChange }: {
  pokemon: Pokemon[];
  filter: PokemonStatus | "all";
  onFilterChange: (status: PokemonStatus | "all") => void;
  onAdd: () => void;
  onEdit: (pokemon: Pokemon) => void;
  onStatusChange: (pokemonId: string, status: PokemonStatus) => void;
}) {
  const statuses = Object.keys(pokemonStatusLabels) as PokemonStatus[];
  return (
    <section className="rounded-md border border-stone-800 bg-stone-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black text-balance text-stone-50">Pokémon registrados</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onAdd} className="action-button">
            <Plus size={16} aria-hidden="true" />
            Añadir Pokémon
          </button>
          <select value={filter} onChange={(event) => onFilterChange(event.target.value as PokemonStatus | "all")} className="rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm font-semibold text-stone-100">
            <option value="all">Todos</option>
            {statuses.map((status) => <option key={status} value={status}>{pokemonStatusLabels[status]}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Pokémon</th><th>Estado</th><th>Tipos</th><th>Rol</th><th>Ruta</th><th>Valor</th><th>Acciones</th></tr></thead>
          <tbody>
            {pokemon.map((entry) => (
              <tr key={entry.id}>
                <td><button className="text-left" onClick={() => onEdit(entry)} type="button"><span className="block font-black text-stone-50">{entry.nickname}</span><span className="text-sm text-stone-400">{entry.species} · Nv. {entry.level}</span></button></td>
                <td><StatusBadge kind="pokemon" status={entry.status} /></td>
                <td>{entry.types.join(", ") || "-"}</td>
                <td>{entry.role || "-"}</td>
                <td>{entry.routeCaught || "-"}</td>
                <td className="font-mono tabular-nums text-amber-200">{entry.value}/10</td>
                <td><div className="flex min-w-64 flex-wrap gap-2"><button className="mini-button" onClick={() => onStatusChange(entry.id, "alive")} type="button">Equipo</button><button className="mini-button" onClick={() => onStatusChange(entry.id, "box")} type="button">Caja</button><button className="mini-button danger" onClick={() => onStatusChange(entry.id, "dead")} type="button">Muerto</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RoutesTable({
  pokemon,
  routes,
  onAdd,
  onEdit,
}: {
  pokemon: Pokemon[];
  routes: Route[];
  onAdd: () => void;
  onEdit: (route: Route) => void;
}) {
  const byId = new Map(pokemon.map((entry) => [entry.id, entry]));
  const nameFor = (id: string) => byId.get(id)?.nickname ?? "-";
  return (
    <section className="rounded-md border border-stone-800 bg-stone-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black text-balance text-stone-50">Rutas y capturas</h2>
        <button type="button" onClick={onAdd} className="action-button">
          <Plus size={16} aria-hidden="true" />
          Crear ruta
        </button>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Ruta</th><th>Captura 1</th><th>Captura 2</th><th>Estado</th><th>Límite</th><th>Notas</th></tr></thead>
          <tbody>
            {routes.map((route) => (
              <tr key={route.id}>
                <td>
                  <button type="button" onClick={() => onEdit(route)} className="text-left">
                    <span className="block font-black text-stone-50">{route.name}</span>
                    <span className="text-sm text-stone-500">Editar ruta</span>
                  </button>
                </td>
                <td>{nameFor(route.capture1PokemonId)}</td>
                <td>{nameFor(route.capture2PokemonId)}</td>
                <td><StatusBadge kind="route" status={route.status} /></td>
                <td><CaptureLimitBadge route={route} /></td>
                <td className="max-w-md text-pretty text-stone-400">{route.notes || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CaptureLimitBadge({ route }: { route: Route }) {
  if (route.status === "shiny_extra") {
    return (
      <span className="inline-flex rounded-sm border border-fuchsia-300/50 bg-fuchsia-400/15 px-2 py-1 text-xs font-semibold text-fuchsia-100">
        Shiny extra permitido
      </span>
    );
  }

  if (isNormalCaptureLimitReached(route)) {
    return (
      <span className="inline-flex rounded-sm border border-amber-300/50 bg-amber-300/15 px-2 py-1 text-xs font-semibold text-amber-100">
        2/2 normales
      </span>
    );
  }

  const used = Number(Boolean(route.capture1PokemonId)) + Number(Boolean(route.capture2PokemonId));
  return (
    <span className="inline-flex rounded-sm border border-stone-700 bg-stone-950 px-2 py-1 text-xs font-semibold text-stone-300">
      {used}/2 normales
    </span>
  );
}

function InventoryTable({
  items,
  pokemon,
  filter,
  onFilterChange,
  onAdd,
  onEdit,
}: {
  items: InventoryItem[];
  pokemon: Pokemon[];
  filter: InventoryCategory | "all";
  onFilterChange: (category: InventoryCategory | "all") => void;
  onAdd: () => void;
  onEdit: (item: InventoryItem) => void;
}) {
  const byId = new Map(pokemon.map((entry) => [entry.id, entry]));
  const holderName = (id: string) => byId.get(id)?.nickname ?? "-";
  const categories = Object.entries(inventoryCategoryLabels) as [InventoryCategory, string][];

  return (
    <section className="rounded-md border border-stone-800 bg-stone-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-balance text-stone-50">Bolsa y MTs</h2>
          <p className="mt-1 text-sm text-pretty text-stone-400">
            Trackea MTs, objetos equipables, consumibles y hallazgos clave.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onAdd} className="action-button">
            <Plus size={16} aria-hidden="true" />
            Añadir objeto
          </button>
          <select
            value={filter}
            onChange={(event) => onFilterChange(event.target.value as InventoryCategory | "all")}
            className="rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm font-semibold text-stone-100"
          >
            <option value="all">Todo</option>
            {categories.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 rounded-md border border-stone-800 bg-stone-950 p-5">
          <p className="font-semibold text-stone-100">La bolsa aún está vacía.</p>
          <p className="mt-1 text-sm text-pretty text-stone-400">
            Añade la primera MT u objeto importante cuando lo encuentres.
          </p>
          <button type="button" onClick={onAdd} className="action-button mt-4">
            <Plus size={16} aria-hidden="true" />
            Añadir objeto
          </button>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Objeto</th>
                <th>Categoría</th>
                <th>Cantidad</th>
                <th>Estado</th>
                <th>Asignado</th>
                <th>Ubicación</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <button type="button" onClick={() => onEdit(item)} className="text-left">
                      <span className="block font-black text-stone-50">{item.name}</span>
                      <span className="text-sm text-stone-500">Editar objeto</span>
                    </button>
                  </td>
                  <td>{inventoryCategoryLabels[item.category]}</td>
                  <td className="font-mono tabular-nums text-amber-200">{item.quantity}</td>
                  <td>{inventoryStatusLabels[item.status]}</td>
                  <td>{holderName(item.holderPokemonId)}</td>
                  <td>{item.location || "-"}</td>
                  <td className="max-w-md text-pretty text-stone-400">{item.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Graveyard({ pokemon }: { pokemon: Pokemon[] }) {
  const dead = pokemon.filter((entry) => entry.status === "dead");
  return (
    <section className="rounded-md border border-stone-800 bg-stone-900 p-4">
      <h2 className="text-xl font-black text-balance text-stone-50">Cementerio</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {dead.map((entry) => (
          <article key={entry.id} className="rounded-md border border-rose-500/30 bg-stone-950 p-4">
            <p className="text-lg font-black text-stone-50">{entry.nickname}</p>
            <p className="text-sm text-stone-400">{entry.species} · Nv. {entry.level}</p>
            <div className="mt-4 grid gap-2 text-sm">
              <p><span className="font-bold text-rose-200">Causa:</span> {entry.deathCause || "-"}</p>
              <p><span className="font-bold text-rose-200">Lugar:</span> {entry.deathLocation || "-"}</p>
              <p className="text-pretty text-stone-400">{entry.notes || "Sin comentario."}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SettingsPanel({
  exportJsonFile,
  fileInputRef,
  importText,
  setImportText,
  importFromFile,
  applyImport,
  resetGame,
  stateJson,
  saveFilePath,
  onSaveFilePathChange,
  onSyncFromSave,
  isSyncingSave,
  saveSyncError,
  saveSyncReport,
}: {
  exportJsonFile: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  importText: string;
  setImportText: (value: string) => void;
  importFromFile: (file?: File) => Promise<void>;
  applyImport: () => void;
  resetGame: () => void;
  stateJson: string;
  saveFilePath: string;
  onSaveFilePathChange: (value: string) => void;
  onSyncFromSave: () => void;
  isSyncingSave: boolean;
  saveSyncError: string;
  saveSyncReport?: SaveSyncReport;
}) {
  return (
    <section className="grid gap-4 rounded-md border border-stone-800 bg-stone-900 p-4">
      <h2 className="text-xl font-black text-balance text-stone-50">Ajustes</h2>

      <section className="grid gap-3 rounded-md border border-amber-300/30 bg-stone-950 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-amber-200">
              <HardDrive size={18} aria-hidden="true" />
              <h3 className="text-sm font-black uppercase">Actualizar desde save</h3>
            </div>
            <p className="mt-1 text-sm text-pretty text-stone-400">
              Lee una copia temporal del archivo main y fusiona equipo/caja sin tocar el save original.
            </p>
          </div>
          <button
            type="button"
            className="action-button"
            onClick={onSyncFromSave}
            disabled={isSyncingSave}
            title="Actualizar desde save"
          >
            <RefreshCw size={16} aria-hidden="true" className={isSyncingSave ? "animate-spin" : ""} />
            {isSyncingSave ? "Leyendo..." : "Actualizar desde save"}
          </button>
        </div>

        <label className="grid gap-2 text-sm font-semibold text-stone-300">
          Ruta del archivo main
          <input
            value={saveFilePath}
            onChange={(event) => onSaveFilePathChange(event.target.value)}
            placeholder="D:\\...\\title\\...\\data\\00000001\\main"
            className="rounded-md border border-stone-700 bg-stone-900 px-3 py-2 font-mono text-sm text-stone-100 outline-none focus:border-amber-300"
          />
        </label>

        {saveSyncError ? (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm font-semibold text-rose-100">
            {saveSyncError}
          </div>
        ) : null}

        {saveSyncReport ? <SaveSyncReportPanel report={saveSyncReport} /> : null}
      </section>

      <div className="flex flex-wrap gap-3">
        <button className="action-button" onClick={exportJsonFile} type="button"><Download size={16} /> Exportar JSON</button>
        <button className="action-button" onClick={() => fileInputRef.current?.click()} type="button"><Upload size={16} /> Importar archivo</button>
        <ResetDialog onConfirm={resetGame} />
      </div>
      <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={(event) => void importFromFile(event.target.files?.[0])} />
      <label className="grid gap-2 text-sm font-semibold text-stone-300">
        Importar pegando JSON
        <textarea value={importText} onChange={(event) => setImportText(event.target.value)} className="min-h-40 rounded-md border border-stone-700 bg-stone-950 p-3 font-mono text-sm text-stone-100 outline-none focus:border-amber-300" />
      </label>
      <button className="action-button w-fit" onClick={applyImport} type="button">Aplicar JSON pegado</button>
      <pre className="max-h-96 overflow-auto rounded-md border border-stone-800 bg-stone-950 p-3 text-xs text-stone-300">{stateJson}</pre>
    </section>
  );
}

function SaveSyncReportPanel({ report }: { report: SaveSyncReport }) {
  return (
    <div className="grid gap-3 rounded-md border border-stone-800 bg-stone-900 p-3">
      <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <SideStat label="Leidos" value={new Date(report.readAt).toLocaleTimeString()} />
        <SideStat label="Pokemon nuevos" value={report.added} />
        <SideStat label="Pokemon act." value={report.updated} />
        <SideStat label="Obj. nuevos" value={report.inventoryAdded} />
        <SideStat label="Obj. act." value={report.inventoryUpdated} />
        <SideStat label="Prohibidos" value={report.forbidden} />
      </div>

      {report.candidatesBetterThanSixth.length > 0 ? (
        <div>
          <p className="text-xs font-black uppercase text-amber-200">Candidatos por encima del sexto</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {report.candidatesBetterThanSixth.map((pokemon) => (
              <span
                key={pokemon.id}
                className="rounded-sm border border-amber-300/40 bg-amber-300/10 px-2 py-1 text-xs font-bold text-amber-100"
              >
                {pokemon.nickname} ({pokemon.value}/10)
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {report.warnings.length > 0 ? (
        <div className="grid gap-2">
          {report.warnings.map((warning) => (
            <p
              key={warning.message}
              className={cn(
                "rounded-sm border px-2 py-1 text-xs font-semibold",
                warning.level === "danger"
                  ? "border-rose-400/40 bg-rose-500/10 text-rose-100"
                  : warning.level === "warning"
                    ? "border-amber-300/40 bg-amber-300/10 text-amber-100"
                    : "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
              )}
            >
              {warning.message}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ResetDialog({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <button className="danger-button" type="button"><RotateCcw size={16} /> Resetear partida</button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 grid w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-md border border-stone-700 bg-stone-950 p-5 shadow-xl">
          <AlertDialog.Title className="text-xl font-black text-stone-50">Resetear partida</AlertDialog.Title>
          <AlertDialog.Description className="text-sm text-pretty text-stone-400">
            Esto reemplaza la partida guardada por los datos de ejemplo iniciales.
          </AlertDialog.Description>
          <div className="flex justify-end gap-2">
            <AlertDialog.Cancel className="mini-button">Cancelar</AlertDialog.Cancel>
            <AlertDialog.Action className="danger-button" onClick={onConfirm}>Resetear</AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
