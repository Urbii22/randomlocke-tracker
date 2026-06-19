import { createInitialGameState } from "@/lib/game";
import type { GameState } from "@/types/randomlocke";

export const STORAGE_KEY = "randomlocke-tracker-state-v1";

export function parseStoredGameState(raw: string | null): GameState {
  if (!raw) {
    return createInitialGameState();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GameState>;
    const fallback = createInitialGameState();

    return {
      pokemon: Array.isArray(parsed.pokemon) ? parsed.pokemon : fallback.pokemon,
      routes: Array.isArray(parsed.routes) ? parsed.routes : fallback.routes,
      battles: Array.isArray(parsed.battles) ? parsed.battles : fallback.battles,
      levelCaps: Array.isArray(parsed.levelCaps) ? parsed.levelCaps : fallback.levelCaps,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : fallback.updatedAt,
    };
  } catch {
    return createInitialGameState();
  }
}

export function serializeGameState(state: GameState): string {
  return JSON.stringify(state, null, 2);
}
