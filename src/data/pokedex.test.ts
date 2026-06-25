import { describe, expect, it } from "vitest";

import { pokedexEntries } from "@/data/pokedex";

describe("pokedexEntries", () => {
  it("includes official Mega Evolutions for opponent lookup", () => {
    const megaEntries = pokedexEntries.filter((entry) => entry.name.startsWith("Mega "));

    expect(megaEntries).toHaveLength(48);
    expect(megaEntries.map((entry) => entry.name)).toContain("Mega Venusaur");
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
