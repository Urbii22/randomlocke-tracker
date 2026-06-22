import { createInitialGameState } from "@/lib/game";
import { getMoveType } from "@/lib/combat";
import type { GameState, Pokemon, PokemonMove, PokemonStats } from "@/types/randomlocke";

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
              lastSaveProgress: parseSaveProgress(parsed.settings.lastSaveProgress),
            }
          : fallback.settings,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : fallback.updatedAt,
    };
  } catch {
    return createInitialGameState();
  }
}

function parseSaveProgress(value: unknown) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const progress = value as {
    badges?: unknown;
    location?: unknown;
  };

  if (typeof progress.badges !== "number" || !Number.isFinite(progress.badges)) {
    return undefined;
  }

  return {
    badges: progress.badges,
    ...(parseSaveLocation(progress.location) ? { location: parseSaveLocation(progress.location) } : {}),
  };
}

function parseSaveLocation(value: unknown) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const location = value as Record<string, unknown>;
  const mapId = location.mapId;
  const zone = location.zone;
  const x = location.x;
  const y = location.y;
  const z = location.z;
  const name = location.name;

  if (
    typeof mapId !== "number" ||
    typeof zone !== "number" ||
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof z !== "number" ||
    typeof name !== "string"
  ) {
    return undefined;
  }

  return { mapId, zone, x, y, z, name };
}

export function serializeGameState(state: GameState): string {
  return JSON.stringify(state, null, 2);
}

function normalizePokemon(raw: unknown): Pokemon {
  const pokemon = raw as Pokemon & { moves?: unknown[] };
  const stats = normalizeStats(pokemon.stats);

  return {
    ...pokemon,
    stats,
    moves: Array.isArray(pokemon.moves) ? pokemon.moves.map(normalizeMove) : [],
  };
}

function normalizeStats(stats: unknown): PokemonStats | undefined {
  if (!stats || typeof stats !== "object") {
    return undefined;
  }

  const value = stats as Partial<PokemonStats>;
  const normalized = {
    hp: typeof value.hp === "number" ? value.hp : 0,
    attack: typeof value.attack === "number" ? value.attack : 0,
    defense: typeof value.defense === "number" ? value.defense : 0,
    specialAttack: typeof value.specialAttack === "number" ? value.specialAttack : 0,
    specialDefense: typeof value.specialDefense === "number" ? value.specialDefense : 0,
    speed: typeof value.speed === "number" ? value.speed : 0,
  };

  return Object.values(normalized).some((entry) => entry > 0) ? normalized : undefined;
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
