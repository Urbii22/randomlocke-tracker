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
    expect(getMoveType("Sombra Vil")).toBe("Fantasma");
    expect(getMoveType("Ataque Óseo")).toBe("Tierra");
    expect(getMoveType("Lluevehojas")).toBe("Planta");
    expect(getMoveType("Aire Afilado")).toBe("Volador");
    expect(getMoveType("Veneno X")).toBe("Veneno");
    expect(getMoveType("Ala de Acero")).toBe("Acero");
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

    expect(profile.members).toHaveLength(6);
    expect(profile.members[0].pokemon.nickname).toBe("Piedrita");
    expect(profile.members[1].pokemon.nickname).toBe("Patadon");
    expect(profile.members[2].pokemon.nickname).toBe("PEPE");
    expect(profile.members[3].pokemon.nickname).toBe("LA RACHA");
    expect(profile.members[4].pokemon.nickname).toBe("PITUFO");
    expect(profile.members[5].pokemon.nickname).toBe("PIUPIU");
    expect(profile.offensiveTypes).toEqual([
      "Dragón",
      "Roca",
      "Psíquico",
      "Fantasma",
      "Lucha",
      "Eléctrico",
      "Tierra",
      "Planta",
      "Hielo",
      "Volador",
      "Agua",
      "Normal",
      "Veneno",
      "Fuego",
      "Acero",
    ]);
    expect(profile.defenseRows.find((row) => row.type === "Tierra")?.weakTo).toEqual([
      "Piedrita",
      "Patadon",
      "LA RACHA",
    ]);
  });
});
