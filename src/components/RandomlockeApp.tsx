"use client";

import {
  Boxes,
  Cross,
  Download,
  Flame,
  Gauge,
  HeartPulse,
  Map as MapIcon,
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
import {
  calculateDashboardSummary,
  pokemonStatusLabels,
  updatePokemonStatus,
  upsertPokemon,
} from "@/lib/game";
import { serializeGameState } from "@/lib/storage";
import type { Battle, Pokemon, PokemonStatus, Route } from "@/types/randomlocke";
import { MetricCard } from "./MetricCard";
import { PokemonForm } from "./PokemonForm";
import { StatusBadge } from "./StatusBadge";

type View = "dashboard" | "pokemon" | "routes" | "dead" | "settings";

const navItems: { view: View; label: string; icon: typeof Gauge }[] = [
  { view: "dashboard", label: "Dashboard", icon: Gauge },
  { view: "pokemon", label: "Pokémon", icon: Shield },
  { view: "routes", label: "Rutas", icon: MapIcon },
  { view: "dead", label: "Muertos", icon: Skull },
  { view: "settings", label: "Ajustes", icon: Settings },
];

export function RandomlockeApp() {
  const [view, setView] = useState<View>("dashboard");
  const [editing, setEditing] = useState<Pokemon | undefined>();
  const [filter, setFilter] = useState<PokemonStatus | "all">("all");
  const [importText, setImportText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const game = useLocalStorageGameState();
  const summary = useMemo(() => calculateDashboardSummary(game.state), [game.state]);

  const filteredPokemon = useMemo(() => {
    if (filter === "all") return game.state.pokemon;
    return game.state.pokemon.filter((pokemon) => pokemon.status === filter);
  }, [filter, game.state.pokemon]);

  function setPokemonStatus(pokemonId: string, status: PokemonStatus) {
    game.setState((state) => updatePokemonStatus(state, pokemonId, status));
  }

  function savePokemon(pokemon: Pokemon) {
    game.setState((state) => upsertPokemon(state, pokemon));
    setEditing(undefined);
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
    if (window.confirm("¿Resetear la partida y volver a los datos de ejemplo?")) {
      game.reset();
      setEditing(undefined);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_34rem),linear-gradient(135deg,_#09090b_0%,_#111318_48%,_#09090b_100%)] text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.32em] text-cyan-300">Pokémon Y randomlocke</p>
              <h1 className="mt-2 text-3xl font-black text-zinc-50 sm:text-4xl">Randomlocke Tracker</h1>
            </div>
            <div className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm font-bold text-cyan-100">
              2 capturas por ruta · 1 vida · sin legendarios
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Pantallas">
            {navItems.map(({ view: itemView, label, icon: Icon }) => {
              const active = view === itemView;
              return (
                <button
                  key={itemView}
                  type="button"
                  onClick={() => setView(itemView)}
                  className={`flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold transition ${
                    active
                      ? "border-cyan-300 bg-cyan-300 text-zinc-950"
                      : "border-zinc-800 bg-zinc-950/80 text-zinc-300 hover:border-zinc-600 hover:text-zinc-50"
                  }`}
                  title={label}
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
        {!game.isReady ? <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 text-zinc-300">Cargando partida local...</div> : null}
        {view === "dashboard" ? <Dashboard pokemon={game.state.pokemon} battles={game.state.battles} summary={summary} /> : null}
        {view === "pokemon" ? (
          <>
            <PokemonForm key={editing?.id ?? "new"} editing={editing} onSubmit={savePokemon} onCancelEdit={() => setEditing(undefined)} />
            <PokemonTable pokemon={filteredPokemon} filter={filter} onFilterChange={setFilter} onEdit={setEditing} onStatusChange={setPokemonStatus} />
          </>
        ) : null}
        {view === "routes" ? <RoutesTable pokemon={game.state.pokemon} routes={game.state.routes} /> : null}
        {view === "dead" ? <Graveyard pokemon={game.state.pokemon} /> : null}
        {view === "settings" ? (
          <section className="grid gap-4 rounded-lg border border-zinc-800 bg-zinc-950/90 p-4">
            <h2 className="text-xl font-black text-zinc-50">Ajustes</h2>
            <div className="flex flex-wrap gap-3">
              <button className="action-button" onClick={exportJsonFile} type="button"><Download size={16} /> Exportar JSON</button>
              <button className="action-button" onClick={() => fileInputRef.current?.click()} type="button"><Upload size={16} /> Importar archivo</button>
              <button className="danger-button" onClick={resetGame} type="button"><RotateCcw size={16} /> Resetear partida</button>
            </div>
            <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={(event) => void importFromFile(event.target.files?.[0])} />
            <label className="grid gap-2 text-sm font-semibold text-zinc-300">
              Importar pegando JSON
              <textarea value={importText} onChange={(event) => setImportText(event.target.value)} className="min-h-40 rounded-md border border-zinc-800 bg-zinc-900 p-3 font-mono text-sm text-zinc-100 outline-none focus:border-cyan-300" />
            </label>
            <button className="action-button w-fit" onClick={() => game.importJson(importText)} type="button">Aplicar JSON pegado</button>
            <pre className="max-h-96 overflow-auto rounded-md border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-300">{serializeGameState(game.state)}</pre>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function Dashboard({ pokemon, battles, summary }: { pokemon: Pokemon[]; battles: Battle[]; summary: ReturnType<typeof calculateDashboardSummary> }) {
  const team = pokemon.filter((entry) => entry.status === "alive");
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Level cap" value={summary.currentLevelCap} detail={summary.nextGym?.name ?? "Liga pendiente"} icon={Flame} />
        <MetricCard label="Equipo" value={`${summary.teamCount}/6`} detail="Pokémon activos con una vida" icon={HeartPulse} />
        <MetricCard label="Caja" value={summary.boxCount} detail={`${summary.candidateCount} candidatos listos`} icon={Boxes} />
        <MetricCard label="Muertos" value={summary.deadCount} detail="Cementerio permanente" icon={Cross} />
      </div>
      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/90 p-4">
          <h2 className="text-xl font-black text-zinc-50">Equipo actual</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {team.map((pokemon) => (
              <article key={pokemon.id} className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-zinc-50">{pokemon.nickname}</p>
                    <p className="text-sm text-zinc-400">{pokemon.species} · Nv. {pokemon.level}</p>
                  </div>
                  <span className="font-mono text-lg font-black text-cyan-200">{pokemon.value}/10</span>
                </div>
                <p className="mt-3 text-sm text-zinc-300">{pokemon.role || "Sin rol asignado"}</p>
                <p className="mt-2 text-xs text-zinc-500">{pokemon.moves.join(" · ") || "Sin movimientos"}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="grid gap-4">
          <BattleCard title="Próximo gimnasio" battle={summary.nextGym} icon={Swords} />
          <BattleCard title="Próximo combate contra amigos" battle={summary.nextFriendBattle} icon={Users} />
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/90 p-4">
            <h2 className="text-lg font-black text-zinc-50">Combates pendientes</h2>
            <div className="mt-3 grid gap-2">
              {battles.filter((battle) => !battle.completed).slice(0, 5).map((battle) => (
                <div key={battle.id} className="flex items-center justify-between gap-3 rounded-md bg-zinc-900 px-3 py-2 text-sm">
                  <span className="font-semibold text-zinc-200">{battle.name}</span>
                  <span className="font-mono text-cyan-200">{battle.levelCap ?? "-"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function BattleCard({ title, battle, icon: Icon }: { title: string; battle?: Battle; icon: typeof Gauge }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/90 p-4">
      <div className="flex items-center gap-2 text-cyan-200">
        <Icon size={18} aria-hidden="true" />
        <h2 className="text-sm font-black uppercase tracking-[0.18em]">{title}</h2>
      </div>
      <p className="mt-3 text-lg font-black text-zinc-50">{battle?.name ?? "Sin pendiente"}</p>
      <p className="mt-1 text-sm text-zinc-400">Cap {battle?.levelCap ?? "-"} · {battle?.notes || "Sin notas"}</p>
    </section>
  );
}

function PokemonTable({ pokemon, filter, onFilterChange, onEdit, onStatusChange }: {
  pokemon: Pokemon[];
  filter: PokemonStatus | "all";
  onFilterChange: (status: PokemonStatus | "all") => void;
  onEdit: (pokemon: Pokemon) => void;
  onStatusChange: (pokemonId: string, status: PokemonStatus) => void;
}) {
  const statuses = Object.keys(pokemonStatusLabels) as PokemonStatus[];
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/90 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black text-zinc-50">Pokémon registrados</h2>
        <select value={filter} onChange={(event) => onFilterChange(event.target.value as PokemonStatus | "all")} className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-100">
          <option value="all">Todos</option>
          {statuses.map((status) => <option key={status} value={status}>{pokemonStatusLabels[status]}</option>)}
        </select>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Pokémon</th><th>Estado</th><th>Tipos</th><th>Rol</th><th>Ruta</th><th>Valor</th><th>Acciones</th></tr></thead>
          <tbody>
            {pokemon.map((entry) => (
              <tr key={entry.id}>
                <td><button className="text-left" onClick={() => onEdit(entry)} type="button"><span className="block font-black text-zinc-50">{entry.nickname}</span><span className="text-sm text-zinc-400">{entry.species} · Nv. {entry.level}</span></button></td>
                <td><StatusBadge kind="pokemon" status={entry.status} /></td>
                <td>{entry.types.join(", ") || "-"}</td>
                <td>{entry.role || "-"}</td>
                <td>{entry.routeCaught || "-"}</td>
                <td className="font-mono text-cyan-200">{entry.value}/10</td>
                <td><div className="flex min-w-64 flex-wrap gap-2"><button className="mini-button" onClick={() => onStatusChange(entry.id, "alive")} type="button">Equipo</button><button className="mini-button" onClick={() => onStatusChange(entry.id, "box")} type="button">Caja</button><button className="mini-button danger" onClick={() => onStatusChange(entry.id, "dead")} type="button">Muerto</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RoutesTable({ pokemon, routes }: { pokemon: Pokemon[]; routes: Route[] }) {
  const byId = new Map(pokemon.map((entry) => [entry.id, entry]));
  const nameFor = (id: string) => byId.get(id)?.nickname ?? "-";
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/90 p-4">
      <h2 className="text-xl font-black text-zinc-50">Rutas y capturas</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Ruta</th><th>Captura 1</th><th>Captura 2</th><th>Estado</th><th>Notas</th></tr></thead>
          <tbody>
            {routes.map((route) => (
              <tr key={route.id}>
                <td className="font-black text-zinc-50">{route.name}</td>
                <td>{nameFor(route.capture1PokemonId)}</td>
                <td>{nameFor(route.capture2PokemonId)}</td>
                <td><StatusBadge kind="route" status={route.status} /></td>
                <td className="max-w-md text-zinc-400">{route.notes || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Graveyard({ pokemon }: { pokemon: Pokemon[] }) {
  const dead = pokemon.filter((entry) => entry.status === "dead");
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/90 p-4">
      <h2 className="text-xl font-black text-zinc-50">Cementerio</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {dead.map((entry) => (
          <article key={entry.id} className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-4">
            <p className="text-lg font-black text-zinc-50">{entry.nickname}</p>
            <p className="text-sm text-zinc-400">{entry.species} · Nv. {entry.level}</p>
            <div className="mt-4 grid gap-2 text-sm">
              <p><span className="font-bold text-rose-200">Causa:</span> {entry.deathCause || "-"}</p>
              <p><span className="font-bold text-rose-200">Lugar:</span> {entry.deathLocation || "-"}</p>
              <p className="text-zinc-400">{entry.notes || "Sin comentario."}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
