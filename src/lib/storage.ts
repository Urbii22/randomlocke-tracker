import { createInitialGameState } from "@/lib/game";
import { getMoveType } from "@/lib/combat";
import type { GameState, Pokemon, PokemonMove } from "@/types/randomlocke";

export const STORAGE_KEY = "randomlocke-tracker-state-v4-current-team";

export function parseStoredGameState(raw: string | null): GameState {
  if (!raw) {
    return createInitialGameState();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GameState>;
    const fallback = createInitialGameState();

    return {
      pokemon: Array.isArray(parsed.pokemon) ? parsed.pokemon.map(normalizePokemon) : fallback.pokemon,
      routes: Array.isArray(parsed.routes) ? parsed.routes : fallback.routes,
      battles: Array.isArray(parsed.battles) ? parsed.battles : fallback.battles,
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : fallback.inventory,
      levelCaps: Array.isArray(parsed.levelCaps) ? parsed.levelCaps : fallback.levelCaps,
      settings:
        parsed.settings && typeof parsed.settings === "object"
          ? {
              saveFilePath:
                typeof parsed.settings.saveFilePath === "string"
                  ? parsed.settings.saveFilePath
                  : fallback.settings.saveFilePath,
              lastSaveSyncAt:
                typeof parsed.settings.lastSaveSyncAt === "string"
                  ? parsed.settings.lastSaveSyncAt
                  : undefined,
            }
          : fallback.settings,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : fallback.updatedAt,
    };
  } catch {
    return createInitialGameState();
  }
}

export function serializeGameState(state: GameState): string {
  return JSON.stringify(state, null, 2);
}

function normalizePokemon(raw: unknown): Pokemon {
  const pokemon = raw as Pokemon & { moves?: unknown[] };

  return {
    ...pokemon,
    moves: Array.isArray(pokemon.moves) ? pokemon.moves.map(normalizeMove) : [],
  };
}

function normalizeMove(raw: unknown): PokemonMove {
  if (typeof raw === "string") {
    return {
      name: raw,
      type: getMoveType(raw) ?? "",
      power: null,
      accuracy: null,
      category: "unknown",
    };
  }

  const move = raw as Partial<PokemonMove>;

  return {
    name: typeof move.name === "string" ? move.name : "",
    type:
      typeof move.type === "string" && move.type
        ? move.type
        : typeof move.name === "string"
          ? (getMoveType(move.name) ?? "")
          : "",
    power: typeof move.power === "number" ? move.power : null,
    accuracy: typeof move.accuracy === "number" ? move.accuracy : null,
    category:
      move.category === "physical" ||
      move.category === "special" ||
      move.category === "status" ||
      move.category === "unknown"
        ? move.category
        : "unknown",
  };
}
