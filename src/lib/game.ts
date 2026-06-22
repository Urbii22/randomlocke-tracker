import { seedGameState } from "@/data/seed";
import { getMoveType } from "@/lib/combat";
import type {
  Battle,
  BattleType,
  DashboardSummary,
  GameState,
  InventoryCategory,
  InventoryItem,
  InventoryItemDraft,
  Pokemon,
  PokemonDraft,
  PokemonMove,
  PokemonStatus,
  Route,
  RouteDraft,
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

export type InventorySortPreset =
  | "tm_first"
  | "held_first"
  | "medicine_first"
  | "pokeball_first"
  | "berry_first"
  | "name_asc";

export const defaultInventoryCategoryOrder: InventoryCategory[] = [
  "tm",
  "held_item",
  "medicine",
  "pokeball",
  "berry",
  "battle_item",
  "key_item",
  "other",
];

const inventoryCategoryOrderByPreset: Record<InventorySortPreset, InventoryCategory[]> = {
  tm_first: defaultInventoryCategoryOrder,
  held_first: ["held_item", "tm", "medicine", "pokeball", "berry", "battle_item", "key_item", "other"],
  medicine_first: ["medicine", "tm", "held_item", "pokeball", "berry", "battle_item", "key_item", "other"],
  pokeball_first: ["pokeball", "tm", "held_item", "medicine", "berry", "battle_item", "key_item", "other"],
  berry_first: ["berry", "tm", "held_item", "medicine", "pokeball", "battle_item", "key_item", "other"],
  name_asc: defaultInventoryCategoryOrder,
};

export function sortInventoryItems(
  items: InventoryItem[],
  preset: InventorySortPreset,
): InventoryItem[] {
  const categoryOrder = inventoryCategoryOrderByPreset[preset];
  const categoryRank = new Map(categoryOrder.map((category, index) => [category, index]));

  return [...items].sort((left, right) => {
    if (preset === "name_asc") {
      return left.name.localeCompare(right.name, "es", { sensitivity: "base" });
    }

    const categoryDelta =
      (categoryRank.get(left.category) ?? categoryOrder.length) -
      (categoryRank.get(right.category) ?? categoryOrder.length);

    if (categoryDelta !== 0) return categoryDelta;

    return left.name.localeCompare(right.name, "es", { sensitivity: "base" });
  });
}

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

export function createRouteDraft(): RouteDraft {
  return {
    name: "",
    capture1PokemonId: "",
    capture2PokemonId: "",
    status: "pending",
    notes: "",
  };
}

export function createInventoryItemDraft(): InventoryItemDraft {
  return {
    name: "",
    category: "tm",
    quantity: 1,
    location: "",
    status: "available",
    holderPokemonId: "",
    notes: "",
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

  if (draft.moves.length > 4) {
    errors.push("Un Pokémon no puede tener más de 4 movimientos.");
  }

  if (draft.moves.some((move) => !move.name.trim())) {
    errors.push("Todos los movimientos deben tener nombre.");
  }

  return errors;
}

export function validateRouteDraft(draft: RouteDraft): string[] {
  const errors: string[] = [];

  if (!draft.name.trim()) {
    errors.push("El nombre de la ruta es obligatorio.");
  }

  if (
    draft.capture1PokemonId &&
    draft.capture2PokemonId &&
    draft.capture1PokemonId === draft.capture2PokemonId
  ) {
    errors.push("La captura 1 y la captura 2 no pueden ser el mismo Pokémon.");
  }

  return errors;
}

export function validateInventoryItemDraft(draft: InventoryItemDraft): string[] {
  const errors: string[] = [];

  if (!draft.name.trim()) {
    errors.push("El nombre del objeto es obligatorio.");
  }

  if (!Number.isInteger(draft.quantity) || draft.quantity < 1) {
    errors.push("La cantidad debe ser al menos 1.");
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

export function upsertRoute(state: GameState, route: Route): GameState {
  const exists = state.routes.some((entry) => entry.id === route.id);
  const nextRoutes = exists
    ? state.routes.map((entry) => (entry.id === route.id ? route : entry))
    : [route, ...state.routes];

  return { ...state, routes: nextRoutes, updatedAt: new Date().toISOString() };
}

export function upsertInventoryItem(state: GameState, item: InventoryItem): GameState {
  const exists = state.inventory.some((entry) => entry.id === item.id);
  const nextInventory = exists
    ? state.inventory.map((entry) => (entry.id === item.id ? item : entry))
    : [item, ...state.inventory];

  return { ...state, inventory: nextInventory, updatedAt: new Date().toISOString() };
}

export function isNormalCaptureLimitReached(route: Route): boolean {
  return Boolean(
    route.capture1PokemonId &&
      route.capture2PokemonId &&
      route.status !== "shiny_extra",
  );
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

export function createMoveDraft(name = ""): PokemonMove {
  return {
    name,
    type: name ? (getMoveType(name) ?? "") : "",
    power: null,
    accuracy: null,
    category: "unknown",
  };
}
