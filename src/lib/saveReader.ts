import type { MoveCategory } from "@/types/randomlocke";
import type { SavePokemon, SaveSnapshot } from "@/lib/saveSync";

export type SaveReaderParseResult =
  | { ok: true; snapshot: SaveSnapshot }
  | { ok: false; error: string };

export function parseSaveReaderOutput(stdout: string): SaveReaderParseResult {
  try {
    return validateSaveSnapshot(JSON.parse(stdout));
  } catch {
    return { ok: false, error: "El lector devolvio JSON invalido." };
  }
}

export function validateSaveSnapshot(value: unknown): SaveReaderParseResult {
  if (!isRecord(value)) {
    return { ok: false, error: "El lector no devolvio un objeto JSON." };
  }

  const readAt = getString(value.readAt);
  const game = getString(value.game);

  if (!readAt || !game) {
    return { ok: false, error: "El snapshot no incluye readAt/game validos." };
  }

  if (!Array.isArray(value.party) || !Array.isArray(value.boxes)) {
    return { ok: false, error: "El snapshot no incluye party/boxes validos." };
  }

  const party = value.party.map((entry) => parseSavePokemon(entry, "party"));
  const boxes = value.boxes.map((entry) => parseSavePokemon(entry, "box"));
  const invalid = [...party, ...boxes].find((entry) => !entry.ok);

  if (invalid && !invalid.ok) {
    return { ok: false, error: invalid.error };
  }

  return {
    ok: true,
    snapshot: {
      readAt,
      game,
      party: party.filter(isParsedPokemon).map((entry) => entry.pokemon),
      boxes: boxes.filter(isParsedPokemon).map((entry) => entry.pokemon),
      errors: Array.isArray(value.errors) ? value.errors.filter(isString) : [],
    },
  };
}

function parseSavePokemon(
  value: unknown,
  expectedSource: "party" | "box",
): { ok: true; pokemon: SavePokemon } | { ok: false; error: string } {
  if (!isRecord(value)) {
    return { ok: false, error: "Una entrada de Pokemon no es un objeto." };
  }

  const species = getString(value.species);
  const nickname = getString(value.nickname) || species;
  const level = getNumber(value.level);

  if (!species || !nickname || level === undefined) {
    return { ok: false, error: "Una entrada de Pokemon no incluye especie, mote o nivel valido." };
  }

  return {
    ok: true,
    pokemon: {
      source: expectedSource,
      partySlot: getNumber(value.partySlot),
      box: getNumber(value.box),
      slot: getNumber(value.slot),
      species,
      nickname,
      level,
      types: Array.isArray(value.types) ? value.types.filter(isString) : [],
      ability: getString(value.ability) ?? "",
      item: getString(value.item) ?? null,
      stats: parseStats(value.stats),
      moves: Array.isArray(value.moves) ? value.moves.map(parseMove).filter(isMove) : [],
    },
  };
}

function isParsedPokemon(
  value: ReturnType<typeof parseSavePokemon>,
): value is { ok: true; pokemon: SavePokemon } {
  return value.ok;
}

function parseMove(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  const name = getString(value.name);
  if (!name) {
    return undefined;
  }

  return {
    name,
    type: getString(value.type) ?? "",
    category: parseMoveCategory(value.category),
    power: getNullableNumber(value.power),
    accuracy: getNullableNumber(value.accuracy),
  };
}

function parseStats(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  const hp = getNumber(value.hp);
  const attack = getNumber(value.attack);
  const defense = getNumber(value.defense);
  const specialAttack = getNumber(value.specialAttack);
  const specialDefense = getNumber(value.specialDefense);
  const speed = getNumber(value.speed);

  if (
    hp === undefined ||
    attack === undefined ||
    defense === undefined ||
    specialAttack === undefined ||
    specialDefense === undefined ||
    speed === undefined
  ) {
    return undefined;
  }

  return { hp, attack, defense, specialAttack, specialDefense, speed };
}

function parseMoveCategory(value: unknown): MoveCategory {
  return value === "physical" || value === "special" || value === "status" || value === "unknown"
    ? value
    : "unknown";
}

function isMove(value: ReturnType<typeof parseMove>): value is NonNullable<ReturnType<typeof parseMove>> {
  return Boolean(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getNullableNumber(value: unknown): number | null {
  return getNumber(value) ?? null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
