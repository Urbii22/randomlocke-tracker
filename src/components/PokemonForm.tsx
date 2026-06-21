"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Archive, Plus, Skull, Trash2, UserPlus, X } from "lucide-react";
import { FormEvent, KeyboardEvent, useState } from "react";
import { cn } from "@/lib/cn";
import { createMoveDraft, createPokemonDraft, parseListInput, validatePokemonDraft } from "@/lib/game";
import type {
  MoveCategory,
  Pokemon,
  PokemonDraft,
  PokemonMove,
  PokemonStatus,
} from "@/types/randomlocke";

const statusOptions: PokemonStatus[] = [
  "alive",
  "box",
  "dead",
  "candidate",
  "sacrificable",
  "forbidden",
  "shiny_extra",
];

const moveCategoryOptions: { value: MoveCategory; label: string }[] = [
  { value: "unknown", label: "?" },
  { value: "physical", label: "Físico" },
  { value: "special", label: "Especial" },
  { value: "status", label: "Estado" },
];

type PokemonFormProps = {
  editing?: Pokemon;
  onSubmit: (pokemon: Pokemon) => void;
  onCancel: () => void;
};

type PokemonEditorPanelProps = PokemonFormProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PokemonEditorPanel({
  editing,
  onSubmit,
  onCancel,
  open,
  onOpenChange,
}: PokemonEditorPanelProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
        <Dialog.Content className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-2xl flex-col border-l border-stone-700 bg-stone-950 shadow-xl sm:w-[min(42rem,calc(100vw-2rem))]">
          <div className="flex items-start justify-between gap-4 border-b border-stone-800 p-5">
            <div>
              <Dialog.Title className="text-2xl font-black text-balance text-stone-50">
                {editing ? "Editar Pokémon" : "Añadir Pokémon"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-pretty text-stone-400">
                Completa la ficha y guarda los cambios en esta partida local.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="mini-button size-10 justify-center p-0"
                aria-label="Cerrar panel"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <div className="overflow-y-auto p-5">
            <PokemonForm
              key={editing?.id ?? "new"}
              editing={editing}
              onSubmit={(pokemon) => {
                onSubmit(pokemon);
                onOpenChange(false);
              }}
              onCancel={() => {
                onCancel();
                onOpenChange(false);
              }}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function PokemonForm({ editing, onSubmit, onCancel }: PokemonFormProps) {
  const [draft, setDraft] = useState<PokemonDraft>(() => toDraft(editing));
  const [typesInput, setTypesInput] = useState(() => editing?.types.join(", ") ?? "");
  const [moves, setMoves] = useState<PokemonMove[]>(() => editing?.moves ?? []);
  const [moveInput, setMoveInput] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  function updateField<K extends keyof PokemonDraft>(key: K, value: PokemonDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveDraft(draft.status);
  }

  function saveDraft(status: PokemonStatus) {
    const nextDraft = {
      ...draft,
      status,
      types: parseListInput(typesInput),
      moves: moves
        .map((move) => ({ ...move, name: move.name.trim(), type: move.type.trim() }))
        .filter((move) => move.name),
    };
    const nextErrors = validatePokemonDraft(nextDraft);

    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSubmit({ id: editing?.id ?? `pkm-${crypto.randomUUID()}`, ...nextDraft });

    if (!editing) {
      setDraft(createPokemonDraft());
      setTypesInput("");
      setMoves([]);
      setMoveInput("");
    }
    setErrors([]);
  }

  function addMove() {
    const nextMove = moveInput.trim();
    if (!nextMove || moves.length >= 4) return;
    setMoves((current) => [...current, createMoveDraft(nextMove)]);
    setMoveInput("");
  }

  function updateMove<K extends keyof PokemonMove>(
    index: number,
    key: K,
    value: PokemonMove[K],
  ) {
    setMoves((current) =>
      current.map((move, moveIndex) =>
        moveIndex === index ? { ...move, [key]: value } : move,
      ),
    );
  }

  function removeMove(index: number) {
    setMoves((current) => current.filter((_, moveIndex) => moveIndex !== index));
  }

  function handleMoveInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addMove();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      {errors.length > 0 ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-100">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Especie">
          <input
            value={draft.species}
            onChange={(event) => updateField("species", event.target.value)}
          />
        </Field>
        <Field label="Mote">
          <input
            value={draft.nickname}
            onChange={(event) => updateField("nickname", event.target.value)}
          />
        </Field>
        <Field label="Nivel">
          <input
            type="number"
            min={1}
            max={100}
            value={draft.level}
            onChange={(event) => updateField("level", Number(event.target.value))}
          />
        </Field>
        <Field label="Estado">
          <select
            value={draft.status}
            onChange={(event) => updateField("status", event.target.value as PokemonStatus)}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tipos">
          <input
            value={typesInput}
            onChange={(event) => setTypesInput(event.target.value)}
            placeholder="Agua, Hada"
          />
        </Field>
        <Field label="Habilidad">
          <input
            value={draft.ability}
            onChange={(event) => updateField("ability", event.target.value)}
          />
        </Field>
        <Field label="Objeto">
          <input value={draft.item} onChange={(event) => updateField("item", event.target.value)} />
        </Field>
        <Field label="Rol">
          <input value={draft.role} onChange={(event) => updateField("role", event.target.value)} />
        </Field>
        <Field label="Valor">
          <input
            type="number"
            min={0}
            max={10}
            value={draft.value}
            onChange={(event) => updateField("value", Number(event.target.value))}
          />
        </Field>
        <Field label="Ruta capturada">
          <input
            value={draft.routeCaught}
            onChange={(event) => updateField("routeCaught", event.target.value)}
          />
        </Field>
      </div>

      <Field label="Notas">
        <textarea
          value={draft.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          className="min-h-28 resize-y"
        />
      </Field>

      <div className="grid gap-3 rounded-md border border-stone-800 bg-stone-900 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-black text-stone-100">Movimientos</p>
            <p className="mt-0.5 text-xs font-semibold text-stone-500">{moves.length}/4 registrados</p>
          </div>
          <div className="flex min-w-0 flex-1 justify-end gap-2 sm:min-w-80">
            <input
              value={moveInput}
              onChange={(event) => setMoveInput(event.target.value)}
              onKeyDown={handleMoveInputKeyDown}
              placeholder="Nuevo ataque"
              className="min-w-0 flex-1"
              disabled={moves.length >= 4}
            />
            <button
              type="button"
              onClick={addMove}
              disabled={!moveInput.trim() || moves.length >= 4}
              className="action-button disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
            >
              <Plus size={16} aria-hidden="true" />
              Añadir
            </button>
          </div>
        </div>

        <div className="grid gap-2">
          {moves.length > 0 ? (
            moves.map((move, index) => (
              <MoveEditorRow
                key={`${move.name}-${index}`}
                move={move}
                index={index}
                onUpdate={updateMove}
                onRemove={removeMove}
              />
            ))
          ) : (
            <div className="rounded-md border border-stone-800 bg-stone-950 p-3 text-sm font-semibold text-stone-500">
              Sin movimientos registrados.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 rounded-md border border-stone-800 bg-stone-900 p-3">
        <p className="text-sm font-black text-stone-100">Acciones rápidas</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <StatusAction
            icon={UserPlus}
            label="Meter al equipo"
            active={draft.status === "alive"}
            onClick={() => saveDraft("alive")}
          />
          <StatusAction
            icon={Archive}
            label="Mover a caja"
            active={draft.status === "box"}
            onClick={() => saveDraft("box")}
          />
          <StatusAction
            icon={Skull}
            label="Marcar como muerto"
            active={draft.status === "dead"}
            danger
            onClick={() => saveDraft("dead")}
          />
        </div>
      </div>

      <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap justify-end gap-2 border-t border-stone-800 bg-stone-950 p-5">
        <button type="button" onClick={onCancel} className="mini-button">
          Cancelar
        </button>
        <button
          type="submit"
          className="rounded-md bg-amber-300 px-4 py-2 text-sm font-black text-stone-950 hover:bg-amber-200"
        >
          Guardar
        </button>
      </div>
    </form>
  );
}

function StatusAction({
  label,
  active,
  danger,
  icon: Icon,
  onClick,
}: {
  label: string;
  active: boolean;
  danger?: boolean;
  icon: typeof UserPlus;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-black",
        active
          ? "border-amber-300 bg-amber-300 text-stone-950"
          : "border-stone-700 bg-stone-950 text-stone-200 hover:bg-stone-900",
        danger && !active ? "border-rose-500/40 text-rose-100" : "",
      )}
    >
      <Icon size={16} aria-hidden="true" />
      {label}
    </button>
  );
}

function MoveEditorRow({
  move,
  index,
  onUpdate,
  onRemove,
}: {
  move: PokemonMove;
  index: number;
  onUpdate: <K extends keyof PokemonMove>(
    index: number,
    key: K,
    value: PokemonMove[K],
  ) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="grid gap-2 rounded-md border border-stone-800 bg-stone-950 p-2">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          value={move.name}
          onChange={(event) => onUpdate(index, "name", event.target.value)}
          aria-label={`Movimiento ${index + 1}`}
          placeholder="Nombre"
        />
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="danger-button min-h-10 px-3"
          aria-label={`Eliminar ${move.name || `movimiento ${index + 1}`}`}
          title="Eliminar movimiento"
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_6rem_6rem_7rem]">
        <input
          value={move.type}
          onChange={(event) => onUpdate(index, "type", event.target.value)}
          aria-label={`Tipo de ${move.name || `movimiento ${index + 1}`}`}
          placeholder="Tipo"
        />
        <input
          type="number"
          min={0}
          value={move.power ?? ""}
          onChange={(event) =>
            onUpdate(index, "power", event.target.value ? Number(event.target.value) : null)
          }
          aria-label={`Potencia de ${move.name || `movimiento ${index + 1}`}`}
          placeholder="Pot."
        />
        <input
          type="number"
          min={0}
          max={100}
          value={move.accuracy ?? ""}
          onChange={(event) =>
            onUpdate(index, "accuracy", event.target.value ? Number(event.target.value) : null)
          }
          aria-label={`Precisión de ${move.name || `movimiento ${index + 1}`}`}
          placeholder="Prec."
        />
        <select
          value={move.category}
          onChange={(event) =>
            onUpdate(index, "category", event.target.value as MoveCategory)
          }
          aria-label={`Categoría de ${move.name || `movimiento ${index + 1}`}`}
        >
          {moveCategoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
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
