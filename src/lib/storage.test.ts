import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./game";
import { createInitialGameStateForGame } from "./trackedGame";
import { getGameStorageKey, parseStoredGameState } from "./storage";

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
        type: "Agua",
        power: 90,
        accuracy: 100,
        category: "special",
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

  it("adds Pokemon Anil paths to settings created before Anil support", () => {
    const legacy = createInitialGameState();
    legacy.settings = { saveFilePath: "" } as never;

    const parsed = parseStoredGameState(JSON.stringify(legacy));

    expect(parsed.settings.saveFilePath).toContain("Pokemon Anil\\Partida 1.rxdata");
    expect(parsed.settings.gameDirectory).toBe("D:\\POKEMON_ANIL\\Pokemon Anil");
  });

  it("repairs duplicate inventory ids from older save imports", () => {
    const legacy = createInitialGameState();
    legacy.inventory = [
      { ...legacy.inventory[0], id: "bag-item-collision" },
      { ...legacy.inventory[0], id: "bag-item-collision", name: "Otro objeto" },
    ];

    const parsed = parseStoredGameState(JSON.stringify(legacy));

    expect(parsed.inventory.map((item) => item.id)).toEqual([
      "bag-item-collision",
      "bag-item-collision-2",
    ]);
  });

  it("creates a separate fresh state and configured paths for Pokemon Opalo", () => {
    const opalo = createInitialGameStateForGame("opalo");

    expect(opalo.settings).toEqual({
      saveFilePath: "C:\\Users\\Diego\\Saved Games\\Pokemon Opalo\\Game.rxdata",
      gameDirectory: "D:\\OPALO V2.11\\Pokemon Opalo V2.11",
    });
    expect(opalo.pokemon).toEqual([]);
    expect(opalo.battles).toEqual([]);
    expect(getGameStorageKey("anil")).not.toBe(getGameStorageKey("opalo"));
  });

  it("creates a separate configured state for Pokemon Z", () => {
    const z = createInitialGameStateForGame("z");

    expect(z.settings).toEqual({
      saveFilePath: "C:\\Users\\Diego\\Saved Games\\Pokemon Z\\Game.rxdata",
      gameDirectory: "D:\\Pokemon Z V2.18",
    });
    expect(z.pokemon).toEqual([]);
    expect(getGameStorageKey("z")).not.toBe(getGameStorageKey("opalo"));
  });

  it("creates the Prolocke state with Brilliant Diamond caps and save folder", () => {
    const prolocke = createInitialGameStateForGame("prolocke");

    expect(prolocke.settings).toEqual({
      saveFilePath: "C:\\Users\\Diego\\AppData\\Roaming\\Ryujinx\\bis\\user\\save\\0000000000000001\\0",
      gameDirectory: "",
    });
    expect(prolocke.pokemon).toEqual([]);
    expect(prolocke.levelCaps.map((entry) => entry.cap)).toEqual([14, 22, 30, 30, 36, 39, 42, 49]);
    expect(prolocke.battles.at(-1)?.name).toContain("Cintia");
    expect(parseStoredGameState(JSON.stringify(prolocke)).settings.gameDirectory).toBe("");
    expect(getGameStorageKey("prolocke")).not.toBe(getGameStorageKey("z"));
  });
});
