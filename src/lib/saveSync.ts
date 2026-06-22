import { getPokemonDefensiveProfile, getTeamCombatProfile } from "@/lib/combat";
import type {
  GameState,
  InventoryCategory,
  InventoryItem,
  Pokemon,
  PokemonMove,
  PokemonSaveSource,
  PokemonStats,
  PokemonStatus,
} from "@/types/randomlocke";

export type SavePokemon = {
  source: "party" | "box";
  partySlot?: number;
  box?: number;
  slot?: number;
  species: string;
  nickname: string;
  level: number;
  types?: string[];
  ability: string;
  item: string | null;
  stats?: PokemonStats;
  moves: PokemonMove[];
};

export type SaveBagItem = {
  itemId?: number;
  name: string;
  quantity: number;
  category: InventoryCategory;
  pocket: string;
};

export type SaveSnapshot = {
  readAt: string;
  game: string;
  party: SavePokemon[];
  boxes: SavePokemon[];
  bag: SaveBagItem[];
  errors: string[];
};

export type SaveSyncWarning = {
  level: "info" | "warning" | "danger";
  message: string;
};

export type SaveSyncReport = {
  readAt: string;
  added: number;
  updated: number;
  inventoryAdded: number;
  inventoryUpdated: number;
  forbidden: number;
  candidatesBetterThanSixth: Pokemon[];
  warnings: SaveSyncWarning[];
};

export type SaveSyncResult = {
  state: GameState;
  report: SaveSyncReport;
};

const LEGENDARY_SPECIES = new Set(
  [
    "Articuno",
    "Zapdos",
    "Moltres",
    "Mewtwo",
    "Mew",
    "Raikou",
    "Entei",
    "Suicune",
    "Lugia",
    "Ho-Oh",
    "Celebi",
    "Regirock",
    "Regice",
    "Registeel",
    "Latias",
    "Latios",
    "Kyogre",
    "Groudon",
    "Rayquaza",
    "Jirachi",
    "Deoxys",
    "Uxie",
    "Mesprit",
    "Azelf",
    "Dialga",
    "Palkia",
    "Heatran",
    "Regigigas",
    "Giratina",
    "Cresselia",
    "Phione",
    "Manaphy",
    "Darkrai",
    "Shaymin",
    "Arceus",
    "Victini",
    "Cobalion",
    "Terrakion",
    "Virizion",
    "Tornadus",
    "Thundurus",
    "Reshiram",
    "Zekrom",
    "Landorus",
    "Kyurem",
    "Keldeo",
    "Meloetta",
    "Genesect",
    "Xerneas",
    "Yveltal",
    "Zygarde",
    "Diancie",
    "Hoopa",
    "Volcanion",
  ].map(normalizeKey),
);

export function mergeSaveSnapshot(state: GameState, snapshot: SaveSnapshot): SaveSyncResult {
  const seen = [...snapshot.party, ...snapshot.boxes].map(normalizeSavePokemon);
  const existingByIdentity = new Map(state.pokemon.map((pokemon) => [identityFor(pokemon), pokemon]));
  const usedIds = new Set(state.pokemon.map((pokemon) => pokemon.id));
  const seenIds = new Set<string>();
  let added = 0;
  let updated = 0;
  let forbidden = 0;

  const syncedPokemon = seen.map((savePokemon) => {
    const identity = identityFor(savePokemon);
    const existing = existingByIdentity.get(identity);
    const isLegendary = isLegendarySpecies(savePokemon.species);
    const status = getSyncedStatus(existing?.status, savePokemon.source, isLegendary);
    const id = existing?.id ?? createStablePokemonId(savePokemon, usedIds);

    seenIds.add(id);
    if (existing) {
      updated += 1;
    } else {
      added += 1;
    }
    if (status === "forbidden") {
      forbidden += 1;
    }

    return {
      ...(existing ?? createManualDefaults(id)),
      id,
      species: savePokemon.species,
      nickname: savePokemon.nickname || savePokemon.species,
      level: savePokemon.level,
      types: savePokemon.types.length > 0 ? savePokemon.types : (existing?.types ?? []),
      ability: savePokemon.ability,
      moves: savePokemon.moves,
      item: savePokemon.item ?? "",
      stats: savePokemon.stats,
      source: savePokemon.source,
      partySlot: savePokemon.source === "party" ? savePokemon.partySlot : undefined,
      box: savePokemon.source === "box" ? savePokemon.box : undefined,
      slot: savePokemon.source === "box" ? savePokemon.slot : undefined,
      lastSeenInSaveAt: snapshot.readAt,
      status,
    } satisfies Pokemon;
  });

  const untouchedPokemon = state.pokemon.filter((pokemon) => !seenIds.has(pokemon.id));
  const pokemon = [...syncedPokemon, ...untouchedPokemon];
  const inventorySync = mergeSaveBag(state.inventory, snapshot.bag);
  const nextState: GameState = {
    ...state,
    pokemon,
    inventory: inventorySync.inventory,
    settings: {
      ...state.settings,
      lastSaveSyncAt: snapshot.readAt,
    },
    updatedAt: new Date().toISOString(),
  };

  return {
    state: nextState,
    report: {
      readAt: snapshot.readAt,
      added,
      updated,
      inventoryAdded: inventorySync.added,
      inventoryUpdated: inventorySync.updated,
      forbidden,
      candidatesBetterThanSixth: getCandidatesBetterThanSixth(pokemon),
      warnings: buildSaveSyncWarnings(pokemon),
    },
  };
}

export function isLegendarySpecies(species: string): boolean {
  return LEGENDARY_SPECIES.has(normalizeKey(species));
}

export function buildSaveSyncWarnings(pokemon: Pokemon[]): SaveSyncWarning[] {
  const profile = getTeamCombatProfile(pokemon);
  const warnings: SaveSyncWarning[] = [];

  for (const row of profile.defenseRows) {
    if (row.weakTo.length >= 3) {
      warnings.push({
        level: row.weakTo.length >= 4 ? "danger" : "warning",
        message: `${row.weakTo.length} miembros del equipo son debiles a ${row.type}.`,
      });
    }
  }

  for (const member of profile.members) {
    const severeWeaknesses = getPokemonDefensiveProfile(member.pokemon).weaknesses.filter(
      (weakness) => weakness.multiplier >= 4,
    );

    for (const weakness of severeWeaknesses) {
      warnings.push({
        level: "danger",
        message: `${member.pokemon.nickname} tiene debilidad 4x a ${weakness.type}.`,
      });
    }
  }

  if (profile.members.length < 6) {
    warnings.push({
      level: "info",
      message: `El equipo actual tiene ${profile.members.length}/6 miembros tras sincronizar.`,
    });
  }

  return warnings;
}

function normalizeSavePokemon(pokemon: SavePokemon): SavePokemon & { types: string[] } {
  return {
    ...pokemon,
    nickname: pokemon.nickname || pokemon.species,
    item: pokemon.item ?? "",
    types: pokemon.types ?? [],
    moves: pokemon.moves.slice(0, 4),
  };
}

function mergeSaveBag(
  currentInventory: InventoryItem[],
  bag: SaveBagItem[],
): { inventory: InventoryItem[]; added: number; updated: number } {
  const usedIds = new Set(currentInventory.map((item) => item.id));
  const existingById = new Map(currentInventory.map((item) => [item.id, item]));
  const existingManualBagByName = new Map(
    currentInventory
      .filter((item) => !item.holderPokemonId)
      .map((item) => [normalizeKey(item.name), item]),
  );
  const syncedIds = new Set<string>();
  let added = 0;
  let updated = 0;

  const syncedInventory = bag.map((bagItem) => {
    const baseId = getInventoryBaseId(bagItem);
    const existing = existingById.get(baseId) ?? existingManualBagByName.get(normalizeKey(bagItem.name));
    const id = existing?.id ?? createUniqueInventoryId(baseId, usedIds);

    syncedIds.add(existing?.id ?? id);
    if (existing) {
      updated += 1;
    } else {
      added += 1;
    }

    return {
      ...(existing ?? createBagInventoryDefaults(id)),
      id: existing?.id ?? id,
      name: bagItem.name,
      category: bagItem.category,
      quantity: bagItem.quantity,
      location: bagItem.pocket ? `Save: ${bagItem.pocket}` : "Save",
      status: "available",
      holderPokemonId: "",
      notes: existing?.notes ?? "",
    } satisfies InventoryItem;
  });

  const untouchedInventory = currentInventory.filter((item) => !syncedIds.has(item.id));
  return {
    inventory: [...syncedInventory, ...untouchedInventory],
    added,
    updated,
  };
}

function createBagInventoryDefaults(id: string): InventoryItem {
  return {
    id,
    name: "",
    category: "other",
    quantity: 1,
    location: "",
    status: "available",
    holderPokemonId: "",
    notes: "",
  };
}

function createManualDefaults(id: string): Pokemon {
  return {
    id,
    species: "",
    nickname: "",
    level: 1,
    types: [],
    ability: "",
    moves: [],
    item: "",
    source: "manual",
    status: "candidate",
    role: "",
    value: 5,
    notes: "",
    routeCaught: "",
    deathCause: "",
    deathLocation: "",
  };
}

function getSyncedStatus(
  existingStatus: PokemonStatus | undefined,
  source: PokemonSaveSource,
  isLegendary: boolean,
): PokemonStatus {
  if (existingStatus === "dead") {
    return "dead";
  }

  if (isLegendary) {
    return "forbidden";
  }

  return source === "party" ? "alive" : "box";
}

function getCandidatesBetterThanSixth(pokemon: Pokemon[]): Pokemon[] {
  const team = pokemon
    .filter((entry) => entry.status === "alive")
    .toSorted((a, b) => (a.partySlot ?? 99) - (b.partySlot ?? 99));
  const sixth = team[5];

  if (!sixth) {
    return [];
  }

  return pokemon
    .filter((entry) => entry.status === "box" || entry.status === "candidate")
    .filter((entry) => entry.value > sixth.value)
    .toSorted((a, b) => b.value - a.value);
}

function createStablePokemonId(pokemon: SavePokemon, usedIds: Set<string>): string {
  const base = `save-${slugify(pokemon.nickname || pokemon.species)}-${slugify(pokemon.species)}`;
  let id = base;
  let suffix = 2;

  while (usedIds.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(id);
  return id;
}

function getInventoryBaseId(item: SaveBagItem): string {
  return item.itemId ? `bag-item-${item.itemId}` : `bag-${slugify(item.name)}`;
}

function createUniqueInventoryId(base: string, usedIds: Set<string>): string {
  let id = base;
  let suffix = 2;

  while (usedIds.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(id);
  return id;
}

function identityFor(pokemon: Pick<Pokemon, "nickname" | "species">): string {
  return `${normalizeKey(pokemon.nickname)}::${normalizeKey(pokemon.species)}`;
}

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function slugify(value: string): string {
  const slug = normalizeKey(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || "pokemon";
}
