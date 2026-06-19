import { seedGameState } from "@/data/seed";
import type {
  Battle,
  BattleType,
  DashboardSummary,
  GameState,
  Pokemon,
  PokemonDraft,
  PokemonStatus,
} from "@/types/randomlocke";

export const TEAM_SIZE = 6;

export const pokemonStatusLabels: Record<PokemonStatus, string> = {
  alive: "Equipo",
  box: "Caja",
  dead: "Muerto",
  candidate: "Candidato",
  sacrificable: "Sacrificable",
  forbidden: "Prohibido",
  shiny_extra: "Shiny extra",
};

export function createInitialGameState(): GameState {
  return structuredClone(seedGameState);
}

export function getNextBattle(
  battles: Battle[],
  type?: BattleType,
): Battle | undefined {
  return battles.find((battle) => !battle.completed && (!type || battle.type === type));
}

export function calculateDashboardSummary(state: GameState): DashboardSummary {
  const nextGym = getNextBattle(state.battles, "gym");
  const nextFriendBattle = getNextBattle(state.battles, "friend");

  return {
    teamCount: state.pokemon.filter((pokemon) => pokemon.status === "alive").length,
    boxCount: state.pokemon.filter((pokemon) => pokemon.status === "box").length,
    deadCount: state.pokemon.filter((pokemon) => pokemon.status === "dead").length,
    candidateCount: state.pokemon.filter((pokemon) => pokemon.status === "candidate").length,
    currentLevelCap: nextGym?.levelCap ?? state.levelCaps.at(-1)?.cap ?? 100,
    nextGym,
    nextFriendBattle,
  };
}

export function createPokemonDraft(): PokemonDraft {
  return {
    species: "",
    nickname: "",
    level: 1,
    types: [],
    ability: "",
    moves: [],
    item: "",
    status: "candidate",
    role: "",
    value: 5,
    notes: "",
    routeCaught: "",
    deathCause: "",
    deathLocation: "",
  };
}

export function validatePokemonDraft(draft: PokemonDraft): string[] {
  const errors: string[] = [];

  if (!draft.species.trim()) {
    errors.push("La especie es obligatoria.");
  }

  if (!draft.nickname.trim()) {
    errors.push("El mote es obligatorio.");
  }

  if (!Number.isInteger(draft.level) || draft.level < 1 || draft.level > 100) {
    errors.push("El nivel debe estar entre 1 y 100.");
  }

  if (!Number.isInteger(draft.value) || draft.value < 0 || draft.value > 10) {
    errors.push("El valor debe estar entre 0 y 10.");
  }

  return errors;
}

export function upsertPokemon(state: GameState, pokemon: Pokemon): GameState {
  const exists = state.pokemon.some((entry) => entry.id === pokemon.id);
  const nextPokemon = exists
    ? state.pokemon.map((entry) => (entry.id === pokemon.id ? pokemon : entry))
    : [pokemon, ...state.pokemon];

  return { ...state, pokemon: nextPokemon, updatedAt: new Date().toISOString() };
}

export function updatePokemonStatus(
  state: GameState,
  pokemonId: string,
  status: PokemonStatus,
): GameState {
  return {
    ...state,
    pokemon: state.pokemon.map((pokemon) =>
      pokemon.id === pokemonId ? { ...pokemon, status } : pokemon,
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function parseListInput(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
