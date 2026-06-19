"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import {
  Boxes,
  Cross,
  Download,
  Flame,
  Gauge,
  HeartPulse,
  Map as MapIcon,
  Package,
  Plus,
  RotateCcw,
  Settings,
  Shield,
  Skull,
  Swords,
  Upload,
  Users,
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

const navItems: { view: View; label: string; icon: typeof Gauge }[] = [
  { view: "dashboard", label: "Dashboard", icon: Gauge },
  { view: "combat", label: "Combate", icon: Swords },
  { view: "pokemon", label: "Pokémon", icon: Shield },
  { view: "routes", label: "Rutas", icon: MapIcon },
  { view: "inventory", label: "Bolsa", icon: Package },
  { view: "dead", label: "Muertos", icon: Skull },
  { view: "settings", label: "Ajustes", icon: Settings },
];

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
  return (
    <section className="grid gap-4">
      <div className="rounded-md border border-stone-800 bg-stone-900 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-balance text-stone-50">Hub de combate</h2>
            <p className="mt-1 text-sm text-pretty text-stone-400">
              Vista táctica del equipo activo: tipos, ataques reconocidos y matchups defensivos.
            </p>
          </div>
          <span className="rounded-sm border border-stone-700 px-2 py-1 font-mono text-xs font-bold tabular-nums text-stone-300">
            {profile.members.length}/6 activos
          </span>
        </div>

        {profile.members.length === 0 ? (
          <div className="mt-4 rounded-md border border-stone-800 bg-stone-950 p-5">
            <p className="font-semibold text-stone-100">No hay Pokémon en el equipo.</p>
            <p className="mt-1 text-sm text-pretty text-stone-400">
              Mete un Pokémon al equipo para generar la referencia de combate.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid gap-3 md:grid-cols-2">
              {profile.members.map((member) => (
                <article key={member.pokemon.id} className="rounded-md border border-stone-800 bg-stone-950 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-stone-50">{member.pokemon.nickname}</h3>
                      <p className="text-sm text-stone-400">
                        {member.pokemon.species} · Nv. {member.pokemon.level}
                      </p>
                    </div>
                    <button type="button" onClick={() => onEditPokemon(member.pokemon)} className="mini-button">
                      Editar
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {member.pokemon.types.map((type) => (
                      <TypeChip key={type} type={type} />
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3">
                    <CombatBlock title="Ataques">
                      {member.moveTypes.map((move) => (
                        <span key={move.move} className="inline-flex rounded-sm border border-stone-700 px-2 py-1 text-xs font-semibold text-stone-200">
                          {move.move}
                          {move.type ? <span className="ml-2 text-amber-200">{move.type}</span> : null}
                        </span>
                      ))}
                    </CombatBlock>
                    <CombatBlock title="Débil a">
                      <MultiplierList rows={member.defensiveProfile.weaknesses} />
                    </CombatBlock>
                    <CombatBlock title="Resiste / inmune">
                      <MultiplierList rows={[...member.defensiveProfile.immunities, ...member.defensiveProfile.resistances]} />
                    </CombatBlock>
                  </div>
                </article>
              ))}
            </div>

            <aside className="rounded-md border border-stone-800 bg-stone-950 p-4">
              <h3 className="font-black text-stone-50">Cobertura ofensiva actual</h3>
              <p className="mt-1 text-sm text-pretty text-stone-400">
                Tipos detectados por los ataques registrados.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.offensiveTypes.length > 0 ? (
                  profile.offensiveTypes.map((type) => <TypeChip key={type} type={type} />)
                ) : (
                  <span className="text-sm text-stone-400">Sin ataques tipados reconocidos.</span>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>

      <TeamDefenseTable rows={profile.defenseRows} />
    </section>
  );
}

function CombatBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-stone-500">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function MultiplierList({ rows }: { rows: { type: PokemonType; multiplier: number }[] }) {
  if (rows.length === 0) {
    return <span className="text-sm text-stone-500">-</span>;
  }

  return rows.map((row) => (
    <span key={row.type} className="inline-flex rounded-sm border border-stone-700 px-2 py-1 text-xs font-semibold text-stone-200">
      {row.type} <span className="ml-1 font-mono tabular-nums text-amber-200">x{row.multiplier}</span>
    </span>
  ));
}

function TypeChip({ type }: { type: string }) {
  return (
    <span className="inline-flex rounded-sm border border-amber-300/40 bg-amber-300/10 px-2 py-1 text-xs font-black text-amber-100">
      {type}
    </span>
  );
}

function TeamDefenseTable({ rows }: { rows: ReturnType<typeof getTeamCombatProfile>["defenseRows"] }) {
  return (
    <section className="rounded-md border border-stone-800 bg-stone-900 p-4">
      <h2 className="text-xl font-black text-balance text-stone-50">Tabla defensiva del equipo</h2>
      <p className="mt-1 text-sm text-pretty text-stone-400">
        Para cada tipo atacante, quién sufre, quién aguanta y quién entra gratis.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tipo rival</th>
              <th>Débiles</th>
              <th>Resisten</th>
              <th>Inmunes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.type}>
                <td className="font-black text-stone-50">{row.type}</td>
                <td>{row.weakTo.join(", ") || "-"}</td>
                <td>{row.resists.join(", ") || "-"}</td>
                <td>{row.immune.join(", ") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
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
      <p className="mt-2 line-clamp-2 text-xs text-stone-500">{pokemon.moves.join(" · ") || "Sin movimientos"}</p>
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
}: {
  exportJsonFile: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  importText: string;
  setImportText: (value: string) => void;
  importFromFile: (file?: File) => Promise<void>;
  applyImport: () => void;
  resetGame: () => void;
  stateJson: string;
}) {
  return (
    <section className="grid gap-4 rounded-md border border-stone-800 bg-stone-900 p-4">
      <h2 className="text-xl font-black text-balance text-stone-50">Ajustes</h2>
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
