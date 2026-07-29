import { seedGameState } from "@/data/seed";
import { pokedexEntries } from "@/data/pokedex";
import { getMoveType } from "@/lib/combat";
import { getStandardMoveMetadata } from "@/lib/moves";
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
  PokemonStats,
  PokemonStatus,
  Route,
  RouteDraft,
} from "@/types/randomlocke";

export const TEAM_SIZE = 6;

export function getPokemonStatTotal(stats?: PokemonStats): number | undefined {
  if (!stats) {
    return undefined;
  }

  return stats.hp + stats.attack + stats.defense + stats.specialAttack + stats.specialDefense + stats.speed;
}

export function formatPokemonStatTotal(pokemon: Pick<Pokemon, "stats">): string {
  return getPokemonStatTotal(pokemon.stats)?.toString() ?? "-";
}

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

export function reorderActivePokemon(
  state: GameState,
  draggedPokemonId: string,
  targetPokemonId: string,
): GameState {
  if (draggedPokemonId === targetPokemonId) {
    return state;
  }

  const activePokemon = state.pokemon.filter((pokemon) => pokemon.status === "alive");
  const fromIndex = activePokemon.findIndex((pokemon) => pokemon.id === draggedPokemonId);
  const toIndex = activePokemon.findIndex((pokemon) => pokemon.id === targetPokemonId);

  if (fromIndex === -1 || toIndex === -1) {
    return state;
  }

  const reorderedActivePokemon = [...activePokemon];
  const [draggedPokemon] = reorderedActivePokemon.splice(fromIndex, 1);
  reorderedActivePokemon.splice(toIndex, 0, draggedPokemon);

  let activeIndex = 0;
  return {
    ...state,
    pokemon: state.pokemon.map((pokemon) =>
      pokemon.status === "alive" ? reorderedActivePokemon[activeIndex++] : pokemon,
    ),
    updatedAt: new Date().toISOString(),
  };
}

export type ShowdownTeamImportResult = {
  state: GameState;
  imported: Pokemon[];
  warnings: string[];
};

type ShowdownPokemonBlock = {
  species: string;
  nickname: string;
  item: string;
  ability: string;
  level: number;
  evs: string;
  ivs: string;
  nature: string;
  moves: string[];
};

export function importShowdownTeam(
  state: GameState,
  text: string,
  createId = createPokemonId,
  pokedex = pokedexEntries,
): ShowdownTeamImportResult {
  const parsed = parseShowdownTeam(text);
  const warnings: string[] = [];

  if (parsed.length === 0) {
    return {
      state,
      imported: [],
      warnings: ["No se encontro ningun Pokemon en el texto pegado."],
    };
  }

  if (parsed.length > TEAM_SIZE) {
    warnings.push(`Se importaron los primeros ${TEAM_SIZE} Pokemon y se ignoraron ${parsed.length - TEAM_SIZE}.`);
  }

  const teamBlocks = parsed.slice(0, TEAM_SIZE);
  const importedKeys = new Set(teamBlocks.map(getShowdownPokemonKey));
  const existingByKey = new Map(
    state.pokemon.map((pokemon) => [getPokemonIdentityKey(pokemon.nickname, pokemon.species), pokemon]),
  );
  const imported = teamBlocks.map((block, index): Pokemon => {
    const existing = existingByKey.get(getShowdownPokemonKey(block));
    const pokedexEntry = findPokedexEntryForShowdownPokemon(block, pokedex);
    const showdownStats = pokedexEntry
      ? calculateShowdownStats(pokedexEntry.stats, block.level, block.evs, block.ivs, block.nature)
      : undefined;
    return {
      id: existing?.id ?? `pkm-${createId()}`,
      species: block.species,
      nickname: block.nickname,
      spriteKey: existing?.spriteKey ?? pokedexEntry?.spriteKey,
      shiny: existing?.shiny,
      level: block.level,
      types: existing?.types ?? pokedexEntry?.types ?? [],
      ability: block.ability || pokedexEntry?.ability || "",
      moves: block.moves.slice(0, 4).map(createMoveDraft),
      item: block.item,
      stats: existing?.stats ?? showdownStats ?? pokedexEntry?.stats,
      source: existing?.source,
      partySlot: index + 1,
      box: existing?.box,
      slot: existing?.slot,
      lastSeenInSaveAt: existing?.lastSeenInSaveAt,
      status: "alive",
      role: existing?.role ?? "",
      value: existing?.value ?? 5,
      notes: buildShowdownImportNotes(existing?.notes ?? "", block.evs),
      routeCaught: existing?.routeCaught ?? "",
      deathCause: "",
      deathLocation: "",
    };
  });

  const importedById = new Map(imported.map((pokemon) => [pokemon.id, pokemon]));
  const previousPokemon = state.pokemon
    .filter((pokemon) => !importedKeys.has(getPokemonIdentityKey(pokemon.nickname, pokemon.species)))
    .map((pokemon) => (pokemon.status === "alive" ? { ...pokemon, status: "box" as const } : pokemon));

  return {
    state: {
      ...state,
      pokemon: [...imported, ...previousPokemon.filter((pokemon) => !importedById.has(pokemon.id))],
      updatedAt: new Date().toISOString(),
    },
    imported,
    warnings,
  };
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
  const metadata = getStandardMoveMetadata(name);

  return {
    name,
    type: metadata?.type ?? (name ? (getMoveType(name) ?? "") : ""),
    power: metadata?.power ?? null,
    accuracy: metadata?.accuracy ?? null,
    category: metadata?.category ?? "unknown",
  };
}

function parseShowdownTeam(text: string): ShowdownPokemonBlock[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map(parseShowdownPokemonBlock)
    .filter((pokemon): pokemon is ShowdownPokemonBlock => Boolean(pokemon));
}

function parseShowdownPokemonBlock(rawBlock: string): ShowdownPokemonBlock | undefined {
  const lines = rawBlock
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const header = lines[0];

  if (!header) {
    return undefined;
  }

  const { nickname, species, item } = parseShowdownHeader(header);
  const moves = lines
    .filter((line) => line.startsWith("-"))
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 4);

  if (!species || moves.length === 0) {
    return undefined;
  }

  return {
    species,
    nickname: nickname || species,
    item,
    ability: parseShowdownField(lines, "Ability") ?? "",
    level: parseShowdownLevel(parseShowdownField(lines, "Level")),
    evs: parseShowdownField(lines, "EVs") ?? "",
    ivs: parseShowdownField(lines, "IVs") ?? "",
    nature: parseShowdownNature(lines) ?? "",
    moves,
  };
}

function parseShowdownHeader(header: string) {
  const [identityPart, itemPart = ""] = header.split(/\s+@\s+/, 2);
  const identityWithoutGender = identityPart.replace(/\s+\((?:M|F)\)$/i, "");
  const nicknameMatch = identityWithoutGender.match(/^(.*?)\s+\(([^)]+)\)$/);

  if (nicknameMatch) {
    return {
      nickname: nicknameMatch[1].trim(),
      species: nicknameMatch[2].trim(),
      item: itemPart.trim(),
    };
  }

  return {
    nickname: identityWithoutGender.trim(),
    species: identityWithoutGender.trim(),
    item: itemPart.trim(),
  };
}

function parseShowdownField(lines: string[], field: string) {
  const prefix = `${field}:`;
  return lines.find((line) => line.startsWith(prefix))?.slice(prefix.length).trim();
}

function parseShowdownLevel(value?: string) {
  const level = Number(value);
  return Number.isInteger(level) && level >= 1 && level <= 100 ? level : 100;
}

function parseShowdownNature(lines: string[]) {
  const natureLine = lines.find((line) => line.endsWith(" Nature"));
  return natureLine?.replace(/\s+Nature$/, "").trim();
}

function buildShowdownImportNotes(existingNotes: string, evs: string) {
  const importNote = evs ? `Importado desde Showdown. EVs: ${evs}` : "Importado desde Showdown.";
  return existingNotes ? `${existingNotes}\n${importNote}` : importNote;
}

function getShowdownPokemonKey(pokemon: ShowdownPokemonBlock) {
  return getPokemonIdentityKey(pokemon.nickname, pokemon.species);
}

function getPokemonIdentityKey(nickname: string, species: string) {
  return `${normalizeIdentityText(nickname)}::${normalizeIdentityText(species)}`;
}

function normalizeIdentityText(value: string) {
  return value.trim().toLocaleLowerCase("es");
}

function createPokemonId() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function findPokedexEntryForShowdownPokemon(pokemon: ShowdownPokemonBlock, pokedex: typeof pokedexEntries) {
  return findPokedexEntryBySpecies(
    getMegaSpeciesFromItem(pokemon.species, pokemon.item, pokedex) ?? pokemon.species,
    pokedex,
  );
}

function findPokedexEntryBySpecies(species: string, pokedex: typeof pokedexEntries) {
  const normalizedSpecies = normalizeIdentityText(species);
  return pokedex.find((entry) => {
    const searchTokens = entry.search.split(/\s+/).map(normalizeIdentityText);
    return normalizeIdentityText(entry.name) === normalizedSpecies || searchTokens.includes(normalizedSpecies);
  });
}

function getMegaSpeciesFromItem(species: string, item: string, pokedex: typeof pokedexEntries) {
  const speciesKey = normalizeShowdownToken(species);
  const itemKey = normalizeShowdownToken(item);

  if (!speciesKey || !itemKey.endsWith("ite") || !itemKey.startsWith(speciesKey)) {
    return undefined;
  }

  const megaSpecies = `${species}-Mega`;
  return findPokedexEntryBySpecies(megaSpecies, pokedex) ? megaSpecies : undefined;
}

function calculateShowdownStats(
  baseStats: PokemonStats,
  level: number,
  evsInput: string,
  ivsInput: string,
  nature: string,
): PokemonStats {
  const evs = parseShowdownStatSpread(evsInput, 0);
  const ivs = parseShowdownStatSpread(ivsInput, 31);
  const natureModifiers = getNatureModifiers(nature);

  return {
    hp: calculateHpStat(baseStats.hp, ivs.hp, evs.hp, level),
    attack: calculateBattleStat(baseStats.attack, ivs.attack, evs.attack, level, natureModifiers.attack),
    defense: calculateBattleStat(baseStats.defense, ivs.defense, evs.defense, level, natureModifiers.defense),
    specialAttack: calculateBattleStat(
      baseStats.specialAttack,
      ivs.specialAttack,
      evs.specialAttack,
      level,
      natureModifiers.specialAttack,
    ),
    specialDefense: calculateBattleStat(
      baseStats.specialDefense,
      ivs.specialDefense,
      evs.specialDefense,
      level,
      natureModifiers.specialDefense,
    ),
    speed: calculateBattleStat(baseStats.speed, ivs.speed, evs.speed, level, natureModifiers.speed),
  };
}

function calculateHpStat(base: number, iv: number, ev: number, level: number) {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
}

function calculateBattleStat(base: number, iv: number, ev: number, level: number, natureModifier: number) {
  const raw = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
  return Math.floor(raw * natureModifier);
}

function parseShowdownStatSpread(input: string, fallback: number): PokemonStats {
  const stats: PokemonStats = {
    hp: fallback,
    attack: fallback,
    defense: fallback,
    specialAttack: fallback,
    specialDefense: fallback,
    speed: fallback,
  };

  input.split("/").forEach((part) => {
    const match = part.trim().match(/^(\d+)\s+(HP|Atk|Def|SpA|SpD|Spe)$/i);
    if (!match) {
      return;
    }

    const value = Number(match[1]);
    const stat = showdownStatLabels[match[2].toLowerCase()];
    if (stat && Number.isInteger(value)) {
      stats[stat] = value;
    }
  });

  return stats;
}

const showdownStatLabels: Record<string, keyof PokemonStats> = {
  hp: "hp",
  atk: "attack",
  def: "defense",
  spa: "specialAttack",
  spd: "specialDefense",
  spe: "speed",
};

const natureEffects: Record<string, [keyof Omit<PokemonStats, "hp">, keyof Omit<PokemonStats, "hp">]> = {
  adamant: ["attack", "specialAttack"],
  bold: ["defense", "attack"],
  brave: ["attack", "speed"],
  calm: ["specialDefense", "attack"],
  careful: ["specialDefense", "specialAttack"],
  gentle: ["specialDefense", "defense"],
  hasty: ["speed", "defense"],
  impish: ["defense", "specialAttack"],
  jolly: ["speed", "specialAttack"],
  lax: ["defense", "specialDefense"],
  lonely: ["attack", "defense"],
  mild: ["specialAttack", "defense"],
  modest: ["specialAttack", "attack"],
  naive: ["speed", "specialDefense"],
  naughty: ["attack", "specialDefense"],
  quiet: ["specialAttack", "speed"],
  rash: ["specialAttack", "specialDefense"],
  relaxed: ["defense", "speed"],
  sassy: ["specialDefense", "speed"],
  timid: ["speed", "attack"],
};

function getNatureModifiers(nature: string): Record<keyof Omit<PokemonStats, "hp">, number> {
  const modifiers = {
    attack: 1,
    defense: 1,
    specialAttack: 1,
    specialDefense: 1,
    speed: 1,
  };
  const effect = natureEffects[nature.trim().toLowerCase()];

  if (effect) {
    modifiers[effect[0]] = 1.1;
    modifiers[effect[1]] = 0.9;
  }

  return modifiers;
}

function normalizeShowdownToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}
