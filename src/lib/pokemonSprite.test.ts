import { describe, expect, it } from "vitest";

import { buildPokemonSpriteUrl, normalizePokemonSpriteKey } from "@/lib/pokemonSprite";

describe("Pokemon sprite helpers", () => {
  it("accepts Pokemon Anil base, form and gender sprite keys", () => {
    expect(normalizePokemonSpriteKey("bulbasaur")).toBe("BULBASAUR");
    expect(normalizePokemonSpriteKey("charizard_2")).toBe("CHARIZARD_2");
    expect(normalizePokemonSpriteKey("torchic_female")).toBe("TORCHIC_FEMALE");
  });

  it("rejects paths and builds local sprite URLs", () => {
    expect(normalizePokemonSpriteKey("../Game.rxdata")).toBeUndefined();
    expect(normalizePokemonSpriteKey("D:\\Pokemon\\BULBASAUR")).toBeUndefined();
    expect(buildPokemonSpriteUrl("CHARIZARD_1", "front", true)).toBe(
      "/api/pokemon/sprite?key=CHARIZARD_1&kind=front&frame=1&shiny=1",
    );
    expect(buildPokemonSpriteUrl("501", "icon", false, "z")).toBe(
      "/api/pokemon/sprite?key=501&kind=icon&frame=1&game=z",
    );
  });

  it("accepts the numeric sprite keys used by Pokemon Opalo", () => {
    expect(normalizePokemonSpriteKey("501")).toBe("501");
    expect(normalizePokemonSpriteKey("001")).toBe("001");
  });
});
