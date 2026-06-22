import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./game";
import { parseStoredGameState } from "./storage";

describe("Randomlocke storage", () => {
  it("migrates legacy string moves into editable move records", () => {
    const legacy = createInitialGameState();
    const [firstPokemon] = legacy.pokemon;
    legacy.pokemon[0] = {
      ...firstPokemon,
      moves: ["Surf", "Protección"] as never,
    };

    const parsed = parseStoredGameState(JSON.stringify(legacy));

    expect(parsed.pokemon[0].moves).toEqual([
      {
        name: "Surf",
        type: "",
        power: null,
        accuracy: null,
        category: "unknown",
      },
      {
        name: "Protección",
        type: "",
        power: null,
        accuracy: null,
        category: "unknown",
      },
    ]);
  });

  it("drops stale all-zero boxed stats from old save syncs", () => {
    const legacy = createInitialGameState();
    const [firstPokemon] = legacy.pokemon;
    legacy.pokemon[0] = {
      ...firstPokemon,
      source: "box",
      stats: {
        hp: 0,
        attack: 0,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 0,
      },
    };

    const parsed = parseStoredGameState(JSON.stringify(legacy));

    expect(parsed.pokemon[0].stats).toBeUndefined();
  });
});
