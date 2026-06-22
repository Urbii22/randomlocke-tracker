import { describe, expect, it } from "vitest";
import { createInitialGameState } from "@/lib/game";
import { validateConfiguredSavePath } from "@/lib/savePath";
import { parseSaveReaderOutput } from "@/lib/saveReader";
import { isLegendarySpecies, mergeSaveSnapshot, type SaveSnapshot } from "@/lib/saveSync";
import type { GameState, Pokemon } from "@/types/randomlocke";

const readAt = "2026-06-22T12:00:00.000Z";

function snapshot(overrides: Partial<SaveSnapshot> = {}): SaveSnapshot {
  return {
    readAt,
    game: "Pokemon Y",
    party: [
      {
        source: "party",
        partySlot: 0,
        species: "Venusaur",
        nickname: "PEPE",
        level: 20,
        types: ["Planta", "Veneno"],
        ability: "Resquicio",
        item: "Venusaurita",
        stats: {
          hp: 64,
          attack: 41,
          defense: 45,
          specialAttack: 67,
          specialDefense: 52,
          speed: 38,
        },
        moves: [
          {
            name: "Lluevehojas",
            type: "Planta",
            category: "special",
            power: 130,
            accuracy: 90,
          },
        ],
      },
    ],
    boxes: [
      {
        source: "box",
        box: 1,
        slot: 3,
        species: "Gible",
        nickname: "Gible",
        level: 18,
        types: ["Dragon", "Tierra"],
        ability: "X",
        item: null,
        moves: [],
      },
    ],
    bag: [],
    errors: [],
    ...overrides,
  };
}

function stateWithPepe(overrides: Partial<Pokemon> = {}): GameState {
  const state = createInitialGameState();
  state.pokemon = [
    {
      id: "pkm-pepe",
      species: "Venusaur",
      nickname: "PEPE",
      level: 19,
      types: ["Planta", "Veneno"],
      ability: "Resquicio",
      moves: [],
      item: "Venusaurita",
      status: "alive",
      role: "",
      value: 5,
      notes: "",
      routeCaught: "",
      deathCause: "",
      deathLocation: "",
      ...overrides,
    },
  ];
  return state;
}

describe("save sync", () => {
  it("merges a save snapshot while updating current location and stats", () => {
    const state = stateWithPepe();
    const result = mergeSaveSnapshot(
      state,
      snapshot({
        progress: {
          badges: 3,
          location: { mapId: 24, zone: 0, x: 369, y: 441, z: 3, name: "Mapa 24" },
        },
      }),
    );

    const pepe = result.state.pokemon.find((pokemon) => pokemon.nickname === "PEPE");
    const gible = result.state.pokemon.find((pokemon) => pokemon.nickname === "Gible");

    expect(pepe).toMatchObject({
      id: "pkm-pepe",
      level: 20,
      status: "alive",
      source: "party",
      partySlot: 0,
      lastSeenInSaveAt: readAt,
      stats: { hp: 64, specialAttack: 67 },
    });
    expect(gible).toMatchObject({
      id: "save-gible-gible",
      status: "box",
      source: "box",
      box: 1,
      slot: 3,
    });
    expect(result.report).toMatchObject({ added: 1, updated: 1 });
    expect(result.report.progress).toMatchObject({ badges: 3 });
    expect(result.state.settings.lastSaveProgress).toMatchObject({ badges: 3 });
    expect(result.state.battles.find((battle) => battle.id === "gym-3")?.completed).toBe(true);
    expect(result.state.battles.find((battle) => battle.id === "gym-4")?.completed).toBe(false);
    expect(result.state.battles.find((battle) => battle.id === "friend-1")?.completed).toBe(true);
  });

  it("preserves dead pokemon even when they appear in the party", () => {
    const state = stateWithPepe({ status: "dead" });

    const result = mergeSaveSnapshot(state, snapshot());

    expect(result.state.pokemon.find((pokemon) => pokemon.id === "pkm-pepe")?.status).toBe("dead");
  });

  it("preserves manual notes, role, route and death fields", () => {
    const state = stateWithPepe({
      notes: "No tocar",
      role: "Win condition manual",
      routeCaught: "Ruta 5",
      deathCause: "Critico",
      deathLocation: "Gimnasio",
    });

    const result = mergeSaveSnapshot(state, snapshot());

    expect(result.state.pokemon.find((pokemon) => pokemon.id === "pkm-pepe")).toMatchObject({
      notes: "No tocar",
      role: "Win condition manual",
      routeCaught: "Ruta 5",
      deathCause: "Critico",
      deathLocation: "Gimnasio",
    });
  });

  it("updates evolved party pokemon instead of duplicating the old species", () => {
    const state = stateWithPepe({
      species: "Ivysaur",
      nickname: "PEPE",
      partySlot: 0,
      source: "party",
    });

    const result = mergeSaveSnapshot(state, snapshot());

    expect(result.state.pokemon.filter((pokemon) => pokemon.nickname === "PEPE")).toHaveLength(1);
    expect(result.state.pokemon.find((pokemon) => pokemon.id === "pkm-pepe")).toMatchObject({
      species: "Venusaur",
      nickname: "PEPE",
      status: "alive",
      partySlot: 0,
    });
    expect(result.report).toMatchObject({ added: 1, updated: 1 });
  });

  it("removes stale save duplicates left behind by a previous evolution sync", () => {
    const state = stateWithPepe({
      id: "pkm-pepe-evolved",
      species: "Venusaur",
      nickname: "PEPE",
      source: "party",
      partySlot: 0,
      lastSeenInSaveAt: "2026-06-22T10:00:00.000Z",
    });
    state.pokemon.push({
      id: "pkm-pepe-old",
      species: "Ivysaur",
      nickname: "PEPE",
      level: 19,
      types: ["Planta", "Veneno"],
      ability: "Resquicio",
      moves: [],
      item: "",
      source: "party",
      partySlot: 0,
      lastSeenInSaveAt: "2026-06-22T09:00:00.000Z",
      status: "alive",
      role: "",
      value: 5,
      notes: "",
      routeCaught: "",
      deathCause: "",
      deathLocation: "",
    });

    const result = mergeSaveSnapshot(state, snapshot());

    expect(result.state.pokemon.filter((pokemon) => pokemon.nickname === "PEPE")).toHaveLength(1);
    expect(result.state.pokemon.find((pokemon) => pokemon.id === "pkm-pepe-old")).toBeUndefined();
    expect(result.state.pokemon.find((pokemon) => pokemon.id === "pkm-pepe-evolved")).toMatchObject({
      species: "Venusaur",
      status: "alive",
    });
  });

  it("uses the save party slot as a fallback for unnamed evolutions", () => {
    const state = stateWithPepe({
      species: "Ivysaur",
      nickname: "Ivysaur",
      partySlot: 0,
      source: "party",
    });

    const result = mergeSaveSnapshot(
      state,
      snapshot({
        party: [
          {
            source: "party",
            partySlot: 0,
            species: "Venusaur",
            nickname: "Venusaur",
            level: 20,
            types: ["Planta", "Veneno"],
            ability: "Resquicio",
            item: null,
            moves: [],
          },
        ],
        boxes: [],
      }),
    );

    expect(result.state.pokemon).toHaveLength(1);
    expect(result.state.pokemon[0]).toMatchObject({
      id: "pkm-pepe",
      species: "Venusaur",
      nickname: "Venusaur",
      partySlot: 0,
    });
    expect(result.report).toMatchObject({ added: 0, updated: 1 });
  });

  it("does not steal a moved pokemon when another save entry matches it exactly", () => {
    const state = stateWithPepe({
      species: "Ivysaur",
      nickname: "Ivysaur",
      partySlot: 0,
      source: "party",
    });

    const result = mergeSaveSnapshot(
      state,
      snapshot({
        party: [
          {
            source: "party",
            partySlot: 0,
            species: "Fletchling",
            nickname: "Fletchling",
            level: 8,
            types: ["Normal", "Volador"],
            ability: "Sacapecho",
            item: null,
            moves: [],
          },
        ],
        boxes: [
          {
            source: "box",
            box: 1,
            slot: 1,
            species: "Ivysaur",
            nickname: "Ivysaur",
            level: 20,
            types: ["Planta", "Veneno"],
            ability: "Resquicio",
            item: null,
            moves: [],
          },
        ],
      }),
    );

    expect(result.state.pokemon.find((pokemon) => pokemon.id === "pkm-pepe")).toMatchObject({
      species: "Ivysaur",
      status: "box",
      box: 1,
      slot: 1,
    });
    expect(result.state.pokemon.find((pokemon) => pokemon.nickname === "Fletchling")).toMatchObject({
      status: "alive",
      partySlot: 0,
    });
    expect(result.report).toMatchObject({ added: 1, updated: 1 });
  });

  it("marks legendary pokemon as forbidden", () => {
    const result = mergeSaveSnapshot(
      createInitialGameState(),
      snapshot({
        party: [
          {
            source: "party",
            partySlot: 0,
            species: "Xerneas",
            nickname: "NOPE",
            level: 50,
            types: ["Hada"],
            ability: "Aura Feerica",
            item: null,
            moves: [],
          },
        ],
        boxes: [],
      }),
    );

    expect(isLegendarySpecies("Xerneas")).toBe(true);
    expect(result.state.pokemon.find((pokemon) => pokemon.nickname === "NOPE")?.status).toBe(
      "forbidden",
    );
    expect(result.report.forbidden).toBe(1);
  });

  it("syncs bag items from the save without deleting manual inventory", () => {
    const state = createInitialGameState();
    state.inventory = [
      {
        id: "manual-note",
        name: "Objeto manual",
        category: "other",
        quantity: 1,
        location: "Ruta 5",
        status: "reserved",
        holderPokemonId: "",
        notes: "No sale del save",
      },
    ];

    const result = mergeSaveSnapshot(
      state,
      snapshot({
        bag: [
          {
            itemId: 17,
            name: "Potion",
            quantity: 2,
            category: "medicine",
            pocket: "Medicina",
          },
        ],
      }),
    );

    expect(result.state.inventory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "bag-item-17",
          name: "Potion",
          quantity: 2,
          category: "medicine",
          location: "Save: Medicina",
          status: "available",
        }),
        expect.objectContaining({ id: "manual-note", notes: "No sale del save" }),
      ]),
    );
    expect(result.report).toMatchObject({ inventoryAdded: 1, inventoryUpdated: 0 });
  });

  it("updates existing bag items while preserving notes", () => {
    const state = createInitialGameState();
    state.inventory = [
      {
        id: "bag-item-17",
        name: "Potion",
        category: "medicine",
        quantity: 1,
        location: "Manual",
        status: "reserved",
        holderPokemonId: "",
        notes: "Comprar mas",
      },
    ];

    const result = mergeSaveSnapshot(
      state,
      snapshot({
        bag: [
          {
            itemId: 17,
            name: "Potion",
            quantity: 7,
            category: "medicine",
            pocket: "Medicina",
          },
        ],
      }),
    );

    expect(result.state.inventory.find((item) => item.id === "bag-item-17")).toMatchObject({
      quantity: 7,
      location: "Save: Medicina",
      status: "available",
      notes: "Comprar mas",
    });
    expect(result.report).toMatchObject({ inventoryAdded: 0, inventoryUpdated: 1 });
  });

  it("reports invalid reader JSON", () => {
    expect(parseSaveReaderOutput("{not-json")).toEqual({
      ok: false,
      error: "El lector devolvio JSON invalido.",
    });
  });

  it("parses save progress from reader JSON", () => {
    const parsed = parseSaveReaderOutput(
      JSON.stringify({
        ...snapshot(),
        progress: {
          badges: 3,
          location: { mapId: 24, zone: 0, x: 369, y: 441, z: 3, name: "Mapa 24" },
        },
      }),
    );

    expect(parsed).toMatchObject({
      ok: true,
      snapshot: {
        progress: {
          badges: 3,
          location: { mapId: 24, name: "Mapa 24" },
        },
      },
    });
  });

  it("validates configured save paths before reading", () => {
    expect(validateConfiguredSavePath("", () => true)).toEqual({
      ok: false,
      error: "Configura la ruta del archivo main antes de sincronizar.",
    });
    expect(validateConfiguredSavePath("D:\\save\\main", () => false)).toEqual({
      ok: false,
      error: "No se encontro el archivo main en la ruta configurada.",
    });
    expect(validateConfiguredSavePath(" D:\\save\\main ", () => true)).toEqual({
      ok: true,
      savePath: "D:\\save\\main",
    });
    expect(
      validateConfiguredSavePath("D:\\save\\folder", (path) => path.endsWith("\\main"), (path) =>
        `${path}\\main`,
      ),
    ).toEqual({
      ok: true,
      savePath: "D:\\save\\folder\\main",
    });
  });
});
