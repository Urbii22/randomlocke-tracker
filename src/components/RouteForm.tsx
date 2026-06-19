"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { FormEvent, useState } from "react";
import {
  createRouteDraft,
  isNormalCaptureLimitReached,
  validateRouteDraft,
} from "@/lib/game";
import type { Pokemon, Route, RouteDraft, RouteStatus } from "@/types/randomlocke";

const routeStatusOptions: { value: RouteStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "one_used", label: "1 captura usada" },
  { value: "completed", label: "Completada" },
  { value: "failed", label: "Fallida" },
  { value: "shiny_extra", label: "Shiny extra" },
  { value: "legendary_ignored", label: "Legendario ignorado" },
];

type RouteEditorPanelProps = {
  open: boolean;
  editing?: Route;
  pokemon: Pokemon[];
  onSubmit: (route: Route) => void;
  onCancel: () => void;
  onOpenChange: (open: boolean) => void;
};

export function RouteEditorPanel({
  open,
  editing,
  pokemon,
  onSubmit,
  onCancel,
  onOpenChange,
}: RouteEditorPanelProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
        <Dialog.Content className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-xl flex-col border-l border-stone-700 bg-stone-950 shadow-xl sm:w-[min(36rem,calc(100vw-2rem))]">
          <div className="flex items-start justify-between gap-4 border-b border-stone-800 p-5">
            <div>
              <Dialog.Title className="text-2xl font-black text-balance text-stone-50">
                {editing ? "Editar ruta" : "Crear ruta"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-pretty text-stone-400">
                Asocia hasta dos capturas normales y marca excepciones shiny o legendarios ignorados.
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
            <RouteForm
              key={editing?.id ?? "new-route"}
              editing={editing}
              pokemon={pokemon}
              onSubmit={(route) => {
                onSubmit(route);
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

function RouteForm({
  editing,
  pokemon,
  onSubmit,
  onCancel,
}: {
  editing?: Route;
  pokemon: Pokemon[];
  onSubmit: (route: Route) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<RouteDraft>(() => toDraft(editing));
  const [errors, setErrors] = useState<string[]>([]);

  const previewRoute: Route = { id: editing?.id ?? "preview", ...draft };
  const normalLimitReached = isNormalCaptureLimitReached(previewRoute);
  const shinyException = draft.status === "shiny_extra";

  function updateField<K extends keyof RouteDraft>(key: K, value: RouteDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateRouteDraft(draft);

    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSubmit({
      id: editing?.id ?? `route-${crypto.randomUUID()}`,
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
        <Field label="Nombre de ruta">
          <input value={draft.name} onChange={(event) => updateField("name", event.target.value)} />
        </Field>
        <Field label="Estado">
          <select
            value={draft.status}
            onChange={(event) => updateField("status", event.target.value as RouteStatus)}
          >
            {routeStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Captura 1">
          <PokemonSelect
            value={draft.capture1PokemonId}
            pokemon={pokemon}
            onChange={(value) => updateField("capture1PokemonId", value)}
          />
        </Field>
        <Field label="Captura 2">
          <PokemonSelect
            value={draft.capture2PokemonId}
            pokemon={pokemon}
            onChange={(value) => updateField("capture2PokemonId", value)}
          />
        </Field>
      </div>

      <div className="rounded-md border border-stone-800 bg-stone-900 p-3 text-sm">
        {normalLimitReached ? (
          <p className="font-semibold text-amber-100">
            Límite normal completo: esta ruta ya tiene 2 capturas normales asignadas.
          </p>
        ) : (
          <p className="font-semibold text-stone-300">
            Queda hueco para captura normal en esta ruta.
          </p>
        )}
        {shinyException ? (
          <p className="mt-2 text-pretty text-fuchsia-100">
            Shiny extra permitido: puedes marcar la excepción aunque las dos capturas normales estén ocupadas.
          </p>
        ) : null}
      </div>

      <Field label="Notas">
        <textarea
          value={draft.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          className="min-h-32 resize-y"
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

function PokemonSelect({
  value,
  pokemon,
  onChange,
}: {
  value: string;
  pokemon: Pokemon[];
  onChange: (value: string) => void;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Sin asignar</option>
      {pokemon.map((entry) => (
        <option key={entry.id} value={entry.id}>
          {entry.nickname} ({entry.species})
        </option>
      ))}
    </select>
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

function toDraft(route?: Route): RouteDraft {
  if (!route) {
    return createRouteDraft();
  }

  const { id: _id, ...draft } = route;
  void _id;
  return draft;
}
