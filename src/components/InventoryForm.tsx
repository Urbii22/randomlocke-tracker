"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { FormEvent, useState } from "react";
import {
  createInventoryItemDraft,
  validateInventoryItemDraft,
} from "@/lib/game";
import type {
  InventoryCategory,
  InventoryItem,
  InventoryItemDraft,
  InventoryStatus,
  Pokemon,
} from "@/types/randomlocke";

export const inventoryCategoryLabels: Record<InventoryCategory, string> = {
  tm: "MT",
  held_item: "Objeto equipado",
  medicine: "Medicina",
  pokeball: "Pokeball",
  berry: "Baya",
  battle_item: "Objeto combate",
  key_item: "Objeto clave",
  other: "Otro",
};

export const inventoryStatusLabels: Record<InventoryStatus, string> = {
  available: "Disponible",
  equipped: "Equipado",
  used: "Usado",
  sold: "Vendido",
  reserved: "Reservado",
};

const categoryOptions = Object.entries(inventoryCategoryLabels) as [
  InventoryCategory,
  string,
][];
const statusOptions = Object.entries(inventoryStatusLabels) as [
  InventoryStatus,
  string,
][];

type InventoryEditorPanelProps = {
  open: boolean;
  editing?: InventoryItem;
  pokemon: Pokemon[];
  onSubmit: (item: InventoryItem) => void;
  onCancel: () => void;
  onOpenChange: (open: boolean) => void;
};

export function InventoryEditorPanel({
  open,
  editing,
  pokemon,
  onSubmit,
  onCancel,
  onOpenChange,
}: InventoryEditorPanelProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
        <Dialog.Content className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-xl flex-col border-l border-stone-700 bg-stone-950 shadow-xl sm:w-[min(36rem,calc(100vw-2rem))]">
          <div className="flex items-start justify-between gap-4 border-b border-stone-800 p-5">
            <div>
              <Dialog.Title className="text-2xl font-black text-balance text-stone-50">
                {editing ? "Editar objeto" : "Añadir objeto"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-pretty text-stone-400">
                Registra MTs, objetos equipables, consumibles y hallazgos importantes.
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
            <InventoryForm
              key={editing?.id ?? "new-inventory-item"}
              editing={editing}
              pokemon={pokemon}
              onSubmit={(item) => {
                onSubmit(item);
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

function InventoryForm({
  editing,
  pokemon,
  onSubmit,
  onCancel,
}: {
  editing?: InventoryItem;
  pokemon: Pokemon[];
  onSubmit: (item: InventoryItem) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<InventoryItemDraft>(() => toDraft(editing));
  const [errors, setErrors] = useState<string[]>([]);

  function updateField<K extends keyof InventoryItemDraft>(
    key: K,
    value: InventoryItemDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateInventoryItemDraft(draft);

    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSubmit({
      id: editing?.id ?? `item-${crypto.randomUUID()}`,
      ...draft,
    });
    setErrors([]);
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
        <Field label="Nombre">
          <input value={draft.name} onChange={(event) => updateField("name", event.target.value)} />
        </Field>
        <Field label="Categoría">
          <select
            value={draft.category}
            onChange={(event) => updateField("category", event.target.value as InventoryCategory)}
          >
            {categoryOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cantidad">
          <input
            type="number"
            min={1}
            value={draft.quantity}
            onChange={(event) => updateField("quantity", Number(event.target.value))}
          />
        </Field>
        <Field label="Estado">
          <select
            value={draft.status}
            onChange={(event) => updateField("status", event.target.value as InventoryStatus)}
          >
            {statusOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dónde se encontró">
          <input
            value={draft.location}
            onChange={(event) => updateField("location", event.target.value)}
            placeholder="Ruta, ciudad, cueva..."
          />
        </Field>
        <Field label="Asignado a">
          <select
            value={draft.holderPokemonId}
            onChange={(event) => updateField("holderPokemonId", event.target.value)}
          >
            <option value="">Nadie</option>
            {pokemon.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.nickname} ({entry.species})
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Notas">
        <textarea
          value={draft.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          className="min-h-32 resize-y"
          placeholder="Compatibilidad, plan de uso, si conviene guardarlo..."
        />
      </Field>

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

function Field({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-stone-300">
      {label}
      {children}
    </label>
  );
}

function toDraft(item?: InventoryItem): InventoryItemDraft {
  if (!item) {
    return createInventoryItemDraft();
  }

  const { id: _id, ...draft } = item;
  void _id;
  return draft;
}
