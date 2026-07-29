export type PokemonSpriteKind = "icon" | "front";
export type PokemonSpriteGame = "anil" | "opalo" | "z" | "prolocke";

const SPRITE_KEY_PATTERN = /^[A-Z0-9]+(?:_[A-Z0-9]+)*(?:_female)?$/i;

export function normalizePokemonSpriteKey(value: string): string | undefined {
  const normalized = value.trim();
  return normalized && SPRITE_KEY_PATTERN.test(normalized) ? normalized.toUpperCase() : undefined;
}

export function buildPokemonSpriteUrl(
  spriteKey: string,
  kind: PokemonSpriteKind,
  shiny = false,
  game?: PokemonSpriteGame,
): string {
  const params = new URLSearchParams({ key: spriteKey, kind, frame: "1" });
  if (shiny) {
    params.set("shiny", "1");
  }
  if (game) {
    params.set("game", game);
  }
  return `/api/pokemon/sprite?${params.toString()}`;
}
