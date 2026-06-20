import { describe, expect, it } from "vitest";
import {
  getMoveType,
  getPokemonDefensiveProfile,
  getTeamCombatProfile,
} from "./combat";
import { createInitialGameState } from "./game";

describe("combat helpers", () => {
  it("infers known move types from move names", () => {
    expect(getMoveType("Cola Dragón")).toBe("Dragón");
    expect(getMoveType("Avalancha")).toBe("Roca");
    expect(getMoveType("Psicocambio")).toBe("Psíquico");
    expect(getMoveType("Doble Patada")).toBe("Lucha");
    expect(getMoveType("Clavo Cañón")).toBe("Normal");
    expect(getMoveType("Inversión")).toBe("Lucha");
    expect(getMoveType("Voto Agua")).toBe("Agua");
    expect(getMoveType("Ataque Fulgor")).toBe("Eléctrico");
  });

  it("calculates Aron defensive profile from Acero/Roca", () => {
    const [piedrita] = createInitialGameState().pokemon;
    const profile = getPokemonDefensiveProfile(piedrita);

    expect(profile.weaknesses).toEqual(
      expect.arrayContaining([
        { type: "Lucha", multiplier: 4 },
        { type: "Tierra", multiplier: 4 },
        { type: "Agua", multiplier: 2 },
      ]),
    );
    expect(profile.immunities).toEqual([{ type: "Veneno", multiplier: 0 }]);
    expect(profile.resistances).toEqual(
      expect.arrayContaining([
        { type: "Normal", multiplier: 0.25 },
        { type: "Volador", multiplier: 0.25 },
      ]),
    );
  });

  it("builds a combat profile from active team members", () => {
    const state = createInitialGameState();
    const profile = getTeamCombatProfile(state.pokemon);

    expect(profile.members).toHaveLength(3);
    expect(profile.members[0].pokemon.nickname).toBe("Piedrita");
    expect(profile.members[1].pokemon.nickname).toBe("Patadon");
    expect(profile.members[2].pokemon.nickname).toBe("LA RACHA");
    expect(profile.offensiveTypes).toEqual([
      "Dragón",
      "Roca",
      "Psíquico",
      "Lucha",
      "Normal",
      "Agua",
      "Eléctrico",
    ]);
    expect(profile.defenseRows.find((row) => row.type === "Tierra")?.weakTo).toEqual([
      "Piedrita",
      "Patadon",
      "LA RACHA",
    ]);
  });
});
