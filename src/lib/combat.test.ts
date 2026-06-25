import { describe, expect, it } from "vitest";
import type { Pokemon } from "@/types/randomlocke";
import {
  getBestMoveEffectivenessAgainstTargets,
  getMoveEffectivenessAgainstTypes,
  getMoveType,
  getPokemonDefensiveProfile,
  getTeamCombatProfile,
  isMoveSuperEffectiveAgainstType,
} from "./combat";

const testTeam: Pokemon[] = [
  {
    id: "pkm-iron",
    species: "Aron",
    nickname: "Iron",
    level: 20,
    types: ["Acero", "Roca"],
    ability: "Sturdy",
    moves: [
      { name: "Rock Slide", type: "Roca", power: null, accuracy: null, category: "unknown" },
      { name: "Dragon Tail", type: "Dragon", power: null, accuracy: null, category: "unknown" },
    ],
    item: "",
    status: "alive",
    role: "",
    value: 5,
    notes: "",
    routeCaught: "",
    deathCause: "",
    deathLocation: "",
  },
  {
    id: "pkm-spark",
    species: "Dedenne",
    nickname: "Spark",
    level: 20,
    types: ["Electrico", "Hada"],
    ability: "Pickup",
    moves: [
      { name: "Thunder", type: "Electrico", power: null, accuracy: null, category: "unknown" },
      { name: "Bone Rush", type: "Tierra", power: null, accuracy: null, category: "unknown" },
    ],
    item: "",
    status: "alive",
    role: "",
    value: 5,
    notes: "",
    routeCaught: "",
    deathCause: "",
    deathLocation: "",
  },
];

describe("combat helpers", () => {
  it("infers known move types from move names", () => {
    expect(getMoveType("Cola Dragon")).toBe("Dragón");
    expect(getMoveType("Avalancha")).toBe("Roca");
    expect(getMoveType("Psicocambio")).toBe("Psíquico");
    expect(getMoveType("Doble Patada")).toBe("Lucha");
    expect(getMoveType("Clavo Cañón")).toBe("Normal");
    expect(getMoveType("Inversion")).toBe("Lucha");
    expect(getMoveType("Voto Agua")).toBe("Agua");
    expect(getMoveType("Ataque Fulgor")).toBe("Eléctrico");
    expect(getMoveType("Sombra Vil")).toBe("Fantasma");
    expect(getMoveType("Ataque Oseo")).toBe("Tierra");
    expect(getMoveType("Lluevehojas")).toBe("Planta");
    expect(getMoveType("Aire Afilado")).toBe("Volador");
    expect(getMoveType("Veneno X")).toBe("Veneno");
    expect(getMoveType("Ala de Acero")).toBe("Acero");
    expect(getMoveType("Leaf Storm")).toBe("Planta");
    expect(getMoveType("Freeze Shock")).toBe("Hielo");
    expect(getMoveType("Will-O-Wisp")).toBe("Fuego");
    expect(getMoveType("Spacial Rend")).toBe("Dragón");
    expect(getMoveType("Attack Order")).toBe("Bicho");
    expect(getMoveType("Drill Run")).toBe("Tierra");
    expect(getMoveType("Power Whip")).toBe("Planta");
    expect(getMoveType("Blue Flare")).toBe("Fuego");
    expect(getMoveType("Steel Wing")).toBe("Acero");
  });

  it("calculates Aron defensive profile from Acero/Roca", () => {
    const [iron] = testTeam;
    const profile = getPokemonDefensiveProfile(iron);

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
    const profile = getTeamCombatProfile(testTeam);

    expect(profile.members).toHaveLength(2);
    expect(profile.members[0].pokemon.nickname).toBe("Iron");
    expect(profile.members[1].pokemon.nickname).toBe("Spark");
    expect(profile.offensiveTypes).toEqual(["Roca", "Dragón", "Eléctrico", "Tierra"]);
    expect(profile.defenseRows.find((row) => row.type === "Tierra")?.weakTo).toEqual([
      "Iron",
      "Spark",
    ]);
  });

  it("detects moves that counter a selected defender type", () => {
    expect(isMoveSuperEffectiveAgainstType("Tierra", "Eléctrico")).toBe(true);
    expect(isMoveSuperEffectiveAgainstType("Roca", "Eléctrico")).toBe(false);
    expect(isMoveSuperEffectiveAgainstType(undefined, "Eléctrico")).toBe(false);
  });

  it("calculates combined effectiveness for dual type targets", () => {
    expect(getMoveEffectivenessAgainstTypes("Tierra", ["Eléctrico", "Roca"])).toBe(4);
    expect(getMoveEffectivenessAgainstTypes("Roca", ["Fuego", "Volador"])).toBe(4);
    expect(getMoveEffectivenessAgainstTypes("Eléctrico", ["Agua", "Tierra"])).toBe(0);
    expect(getMoveEffectivenessAgainstTypes(undefined, ["Agua", "Tierra"])).toBe(1);
  });
  it("uses the best separate target effectiveness in double battles", () => {
    expect(getBestMoveEffectivenessAgainstTargets("Roca", [["Fuego", "Volador"], ["Agua", "Tierra"]])).toBe(4);
    expect(getBestMoveEffectivenessAgainstTargets("Agua", [["Fuego"], ["Planta"]])).toBe(2);
    expect(getBestMoveEffectivenessAgainstTargets("Normal", [["Fantasma"], ["Roca"]])).toBe(0.5);
    expect(getBestMoveEffectivenessAgainstTargets(undefined, [["Agua"], ["Fuego"]])).toBe(1);
    expect(getBestMoveEffectivenessAgainstTargets("Planta", [])).toBe(1);
  });
});
