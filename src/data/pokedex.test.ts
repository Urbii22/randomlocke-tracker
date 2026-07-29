import { describe, expect, it } from "vitest";

import { pokedexEntries } from "@/data/pokedex";

describe("pokedexEntries", () => {
  it("includes every Pokemon Anil generation and custom species", () => {
    expect(pokedexEntries.length).toBeGreaterThanOrEqual(1_500);
    expect(pokedexEntries.map((entry) => entry.name)).toContain("Pecharunt");
    expect(pokedexEntries.map((entry) => entry.name)).toContain("Royaleon");
    expect(pokedexEntries.map((entry) => entry.name)).toContain("Cefireon");
  });

  it("includes Pokemon Anil Mega Evolutions for opponent lookup", () => {
    const megaEntries = pokedexEntries.filter((entry) => entry.name.startsWith("Mega "));

    expect(megaEntries.length).toBeGreaterThanOrEqual(48);
    expect(megaEntries.map((entry) => entry.name)).toContain("Mega Venusaur X");
    expect(megaEntries.map((entry) => entry.name)).toContain("Mega Charizard X");
    expect(megaEntries.map((entry) => entry.name)).toContain("Mega Charizard Y");
  });

  it("keeps Mega form types and stats separate from the base Pokemon", () => {
    const charizard = pokedexEntries.find((entry) => entry.name === "Charizard");
    const megaCharizardX = pokedexEntries.find((entry) => entry.name === "Mega Charizard X");

    expect(charizard?.types).toEqual(["Fuego", "Volador"]);
    expect(megaCharizardX?.types).toEqual(["Fuego", "Dragon"]);
    expect(megaCharizardX?.stats.attack).toBe(130);
    expect(megaCharizardX?.stats.specialAttack).toBe(130);
  });
});
