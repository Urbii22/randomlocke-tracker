"use client";

import { FormEvent, useState } from "react";
import { createPokemonDraft, parseListInput, validatePokemonDraft } from "@/lib/game";
import type { Pokemon, PokemonDraft, PokemonStatus } from "@/types/randomlocke";

const statusOptions: PokemonStatus[] = [
  "alive",
  "box",
  "dead",
  "candidate",
  "sacrificable",
  "forbidden",
  "shiny_extra",
];

type PokemonFormProps = {
  editing?: Pokemon;
  onSubmit: (pokemon: Pokemon) => void;
  onCancelEdit: () => void;
};

export function PokemonForm({ editing, onSubmit, onCancelEdit }: PokemonFormProps) {
  const [draft, setDraft] = useState<PokemonDraft>(() => toDraft(editing));
  const [typesInput, setTypesInput] = useState(() => editing?.types.join(", ") ?? "");
  const [movesInput, setMovesInput] = useState(() => editing?.moves.join(", ") ?? "");
  const [errors, setErrors] = useState<string[]>([]);

  function updateField<K extends keyof PokemonDraft>(key: K, value: PokemonDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextDraft = { ...draft, types: parseListInput(typesInput), moves: parseListInput(movesInput) };
    const nextErrors = validatePokemonDraft(nextDraft);

    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSubmit({ id: editing?.id ?? `pkm-${crypto.randomUUID()}`, ...nextDraft });

    if (!editing) {
      setDraft(createPokemonDraft());
      setTypesInput("");
      setMovesInput("");
    }
    setErrors([]);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-stone-800 bg-stone-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-balance text-stone-50">{editing ? "Editar Pokémon" : "Añadir Pokémon"}</h2>
        {editing ? (
          <button type="button" onClick={onCancelEdit} className="rounded-md border border-stone-700 px-3 py-2 text-sm font-semibold text-stone-300 hover:bg-stone-950">
            Cancelar edición
          </button>
        ) : null}
      </div>

      {errors.length > 0 ? (
        <div className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-100">
          {errors.map((error) => <p key={error}>{error}</p>)}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Especie"><input value={draft.species} onChange={(event) => updateField("species", event.target.value)} /></Field>
        <Field label="Mote"><input value={draft.nickname} onChange={(event) => updateField("nickname", event.target.value)} /></Field>
        <Field label="Nivel"><input type="number" min={1} max={100} value={draft.level} onChange={(event) => updateField("level", Number(event.target.value))} /></Field>
        <Field label="Estado">
          <select value={draft.status} onChange={(event) => updateField("status", event.target.value as PokemonStatus)}>
            {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </Field>
        <Field label="Tipos"><input value={typesInput} onChange={(event) => setTypesInput(event.target.value)} placeholder="Agua, Hada" /></Field>
        <Field label="Habilidad"><input value={draft.ability} onChange={(event) => updateField("ability", event.target.value)} /></Field>
        <Field label="Movimientos"><input value={movesInput} onChange={(event) => setMovesInput(event.target.value)} placeholder="Surf, Mordisco" /></Field>
        <Field label="Objeto"><input value={draft.item} onChange={(event) => updateField("item", event.target.value)} /></Field>
        <Field label="Rol"><input value={draft.role} onChange={(event) => updateField("role", event.target.value)} /></Field>
        <Field label="Valor"><input type="number" min={0} max={10} value={draft.value} onChange={(event) => updateField("value", Number(event.target.value))} /></Field>
        <Field label="Ruta"><input value={draft.routeCaught} onChange={(event) => updateField("routeCaught", event.target.value)} /></Field>
        <Field label="Lugar muerte"><input value={draft.deathLocation} onChange={(event) => updateField("deathLocation", event.target.value)} /></Field>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label="Causa muerte"><input value={draft.deathCause} onChange={(event) => updateField("deathCause", event.target.value)} /></Field>
        <Field label="Notas"><input value={draft.notes} onChange={(event) => updateField("notes", event.target.value)} /></Field>
      </div>
      <button type="submit" className="mt-4 rounded-md bg-amber-300 px-4 py-2 text-sm font-black text-stone-950 hover:bg-amber-200">
        {editing ? "Guardar cambios" : "Añadir al tracker"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-stone-300">
      {label}
      {children}
    </label>
  );
}

function toDraft(pokemon?: Pokemon): PokemonDraft {
  if (!pokemon) {
    return createPokemonDraft();
  }

  const { id: _id, ...draft } = pokemon;
  void _id;
  return draft;
}
