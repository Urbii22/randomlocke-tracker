import { describe, expect, it } from "vitest";
import { createInitialGameState } from "@/lib/game";
import { validateConfiguredSavePath } from "@/lib/savePath";
import { parseSaveReaderOutput } from "@/lib/saveReader";
import { isLegendarySpecies, mergeSaveSnapshot, type SaveSnapshot } from "@/lib/saveSync";

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

describe("save sync", () => {
  it("merges a save snapshot while updating current location and stats", () => {
    const state = createInitialGameState();
    const result = mergeSaveSnapshot(state, snapshot());

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
  });

  it("preserves dead pokemon even when they appear in the party", () => {
    const state = createInitialGameState();
    state.pokemon = state.pokemon.map((pokemon) =>
      pokemon.id === "pkm-pepe" ? { ...pokemon, status: "dead" } : pokemon,
    );

    const result = mergeSaveSnapshot(state, snapshot());

    expect(result.state.pokemon.find((pokemon) => pokemon.id === "pkm-pepe")?.status).toBe("dead");
  });

  it("preserves manual notes, role, route and death fields", () => {
    const state = createInitialGameState();
    state.pokemon = state.pokemon.map((pokemon) =>
      pokemon.id === "pkm-pepe"
        ? {
            ...pokemon,
            notes: "No tocar",
            role: "Win condition manual",
            routeCaught: "Ruta 5",
            deathCause: "Critico",
            deathLocation: "Gimnasio",
          }
        : pokemon,
    );

    const result = mergeSaveSnapshot(state, snapshot());

    expect(result.state.pokemon.find((pokemon) => pokemon.id === "pkm-pepe")).toMatchObject({
      notes: "No tocar",
      role: "Win condition manual",
      routeCaught: "Ruta 5",
      deathCause: "Critico",
      deathLocation: "Gimnasio",
    });
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
