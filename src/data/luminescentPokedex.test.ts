import { describe, expect, it } from "vitest";
import { luminescentPokedexEntries, luminescentPokedexSource } from "@/data/luminescentPokedex";

describe("luminescentPokedexEntries", () => {
  it("uses Luminescent's custom types, stats and abilities", () => {
    const charizard = luminescentPokedexEntries.find((entry) => entry.name === "Charizard");
    const chimchar = luminescentPokedexEntries.find((entry) => entry.name === "Chimchar");

    expect(charizard).toMatchObject({
      types: ["Fuego", "Dragon"],
      stats: { specialAttack: 110 },
      ability: "Drought",
    });
    expect(chimchar).toMatchObject({
      stats: { hp: 44, attack: 58, specialAttack: 58 },
      ability: "Unburden",
    });
  });

  it("keeps the official source label", () => {
    expect(luminescentPokedexSource).toContain("Team Luminescent");
  });
});
