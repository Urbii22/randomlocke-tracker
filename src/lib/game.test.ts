import { describe, expect, it } from "vitest";
import {
  calculateDashboardSummary,
  createMoveDraft,
  createInventoryItemDraft,
  createInitialGameState,
  createPokemonDraft,
  createRouteDraft,
  getPokemonStatTotal,
  getNextBattle,
  importShowdownTeam,
  isNormalCaptureLimitReached,
  reorderActivePokemon,
  sortInventoryItems,
  upsertRoute,
  upsertInventoryItem,
  validateInventoryItemDraft,
  validateRouteDraft,
  validatePokemonDraft,
} from "./game";

describe("Randomlocke game state", () => {
  it("calculates a real stat total from save stats", () => {
    expect(getPokemonStatTotal({
      hp: 91,
      attack: 134,
      defense: 95,
      specialAttack: 100,
      specialDefense: 100,
      speed: 80,
    })).toBe(600);
    expect(getPokemonStatTotal()).toBeUndefined();
  });

  it("creates an initial game state without personal run data", () => {
    const state = createInitialGameState();

    expect(state.levelCaps).toHaveLength(8);
    expect(state.levelCaps[0]).toMatchObject({ gym: 1, leader: "Viola", cap: 14 });
    expect(state.battles.some((battle) => battle.type === "friend")).toBe(true);
    expect(state.routes).toEqual([]);
    expect(state.inventory).toEqual([]);
    expect(state.pokemon).toEqual([]);
  });

  it("summarizes team, box, dead and next progression targets", () => {
    const state = createInitialGameState();
    const summary = calculateDashboardSummary(state);

    expect(summary.teamCount).toBe(0);
    expect(summary.boxCount).toBe(0);
    expect(summary.deadCount).toBe(0);
    expect(summary.currentLevelCap).toBe(14);
    expect(summary.nextGym?.name).toBe("Gimnasio de Ciudad Novarte");
    expect(summary.nextFriendBattle?.name).toBe("Combate contra amigos 1");
  });

  it("returns the first incomplete battle of a requested type", () => {
    const state = createInitialGameState();

    expect(getNextBattle(state.battles, "gym")?.levelCap).toBe(14);
    expect(getNextBattle(state.battles, "friend")?.type).toBe("friend");
  });

  it("validates required pokemon fields and level boundaries", () => {
    const errors = validatePokemonDraft({
      species: "",
      nickname: "",
      level: 101,
      types: [],
      ability: "",
      moves: [],
      item: "",
      status: "alive",
      role: "",
      value: 11,
      notes: "",
      routeCaught: "",
      deathCause: "",
      deathLocation: "",
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        "La especie es obligatoria.",
        "El mote es obligatorio.",
        "El nivel debe estar entre 1 y 100.",
        "El valor debe estar entre 0 y 10.",
      ]),
    );
  });

  it("rejects pokemon drafts with more than four moves", () => {
    const errors = validatePokemonDraft({
      species: "Lapras",
      nickname: "Ferry",
      level: 32,
      types: ["Agua", "Hielo"],
      ability: "Absorbe agua",
      moves: [
        createMoveDraft("Surf"),
        createMoveDraft("Canto"),
        createMoveDraft("Rayo hielo"),
        createMoveDraft("Protección"),
        createMoveDraft("Danza lluvia"),
      ],
      item: "",
      status: "box",
      role: "Tanque especial",
      value: 8,
      notes: "",
      routeCaught: "Ruta 12",
      deathCause: "",
      deathLocation: "",
    });

    expect(errors).toContain("Un Pokémon no puede tener más de 4 movimientos.");
  });

  it("creates move drafts with standard battle metadata", () => {
    expect(createMoveDraft("Surf")).toMatchObject({
      name: "Surf",
      type: "Agua",
      category: "special",
      power: 90,
      accuracy: 100,
    });
    expect(createMoveDraft("Sticky Web")).toMatchObject({
      type: "Bicho",
      category: "status",
      power: null,
      accuracy: null,
    });
    expect(createMoveDraft("Zap Cannon")).toMatchObject({
      type: "Eléctrico",
      category: "special",
      power: 120,
      accuracy: 50,
    });
  });

  it("validates and creates editable route drafts", () => {
    expect(createRouteDraft()).toMatchObject({
      name: "",
      capture1PokemonId: "",
      capture2PokemonId: "",
      status: "pending",
      notes: "",
    });

    expect(validateRouteDraft(createRouteDraft())).toContain("El nombre de la ruta es obligatorio.");
  });

  it("detects the two normal captures limit while allowing shiny extra status", () => {
    const completedRoute = {
      id: "route-test",
      name: "Ruta Test",
      capture1PokemonId: "pkm-a",
      capture2PokemonId: "pkm-b",
      status: "completed" as const,
      notes: "",
    };

    expect(isNormalCaptureLimitReached(completedRoute)).toBe(true);
    expect(isNormalCaptureLimitReached({ ...completedRoute, status: "shiny_extra" })).toBe(false);
  });

  it("upserts routes into game state", () => {
    const state = createInitialGameState();
    const next = upsertRoute(state, {
      id: "route-22",
      name: "Ruta 22",
      capture1PokemonId: "",
      capture2PokemonId: "",
      status: "pending",
      notes: "Nueva zona",
    });

    expect(next.routes[0]).toMatchObject({ id: "route-22", name: "Ruta 22" });
    expect(next.updatedAt).not.toBe(state.updatedAt);
  });

  it("creates and validates inventory item drafts", () => {
    expect(createInventoryItemDraft()).toMatchObject({
      name: "",
      category: "tm",
      quantity: 1,
      location: "",
      status: "available",
      holderPokemonId: "",
      notes: "",
    });

    expect(validateInventoryItemDraft({ ...createInventoryItemDraft(), quantity: 0 })).toEqual(
      expect.arrayContaining([
        "El nombre del objeto es obligatorio.",
        "La cantidad debe ser al menos 1.",
      ]),
    );
  });

  it("upserts inventory items into game state", () => {
    const state = createInitialGameState();
    const next = upsertInventoryItem(state, {
      id: "item-tm01",
      name: "MT01 Afilagarras",
      category: "tm",
      quantity: 1,
      location: "Ruta 5",
      status: "available",
      holderPokemonId: "",
      notes: "Pendiente de revisar compatibilidad.",
    });

    expect(next.inventory).toHaveLength(1);
    expect(next.inventory[0]).toMatchObject({ id: "item-tm01", category: "tm" });
    expect(next.updatedAt).not.toBe(state.updatedAt);
  });

  it("reorders only active Pokemon for the combat roster", () => {
    const state = {
      ...createInitialGameState(),
      pokemon: [
        { ...createPokemonDraft(), id: "pkm-a", nickname: "A", species: "Aegislash", status: "alive" as const },
        { ...createPokemonDraft(), id: "pkm-box", nickname: "Box", species: "Scizor", status: "box" as const },
        { ...createPokemonDraft(), id: "pkm-b", nickname: "B", species: "Blastoise", status: "alive" as const },
        { ...createPokemonDraft(), id: "pkm-dead", nickname: "Dead", species: "Pikachu", status: "dead" as const },
        { ...createPokemonDraft(), id: "pkm-c", nickname: "C", species: "Charizard", status: "alive" as const },
      ],
    };

    const next = reorderActivePokemon(state, "pkm-c", "pkm-a");

    expect(next.pokemon.map((pokemon) => pokemon.id)).toEqual([
      "pkm-c",
      "pkm-box",
      "pkm-a",
      "pkm-dead",
      "pkm-b",
    ]);
    expect(next.updatedAt).not.toBe(state.updatedAt);
  });

  it("keeps state unchanged when active Pokemon reorder targets are invalid", () => {
    const state = {
      ...createInitialGameState(),
      pokemon: [
        { ...createPokemonDraft(), id: "pkm-a", nickname: "A", species: "Aegislash", status: "alive" as const },
        { ...createPokemonDraft(), id: "pkm-box", nickname: "Box", species: "Scizor", status: "box" as const },
      ],
    };

    expect(reorderActivePokemon(state, "pkm-a", "pkm-a")).toBe(state);
    expect(reorderActivePokemon(state, "pkm-a", "pkm-box")).toBe(state);
    expect(reorderActivePokemon(state, "missing", "pkm-a")).toBe(state);
  });

  it("imports a Showdown team into the active combat team", () => {
    const state = {
      ...createInitialGameState(),
      pokemon: [
        {
          id: "pkm-old",
          species: "Lapras",
          nickname: "Ferry",
          level: 32,
          types: ["Agua", "Hielo"],
          ability: "",
          moves: [createMoveDraft("Surf")],
          item: "",
          status: "alive" as const,
          role: "",
          value: 5,
          notes: "",
          routeCaught: "",
          deathCause: "",
          deathLocation: "",
        },
      ],
    };
    const showdownText = `GLADIATOR (Aegislash) @ Focus Sash
Ability: Clear Body
Level: 80
EVs: 252 Atk / 4 SpA / 252 Spe
- Sticky Web
- Iron Head
- Megahorn
- Surf

CAMILLE (Scizor) @ Occa Berry
Ability: Sturdy
Level: 80
EVs: 252 HP / 252 Atk / 4 SpD
- Phantom Force
- Rock Tomb
- Magnitude
- U-turn

WOOF WOOF (Houndoom-Mega) @ Life Orb
Ability: Forewarn
Level: 83
- Air Slash
- Zap Cannon`;
    let nextId = 0;

    const result = importShowdownTeam(state, showdownText, () => `fixed-id-${nextId++}`);

    expect(result.imported).toHaveLength(3);
    expect(result.imported[0]).toMatchObject({
      id: "pkm-fixed-id-0",
      species: "Aegislash",
      nickname: "GLADIATOR",
      item: "Focus Sash",
      ability: "Clear Body",
      level: 80,
      status: "alive",
      partySlot: 1,
      types: ["Acero", "Fantasma"],
    });
    expect(result.imported[0].moves.map((move) => move.name)).toEqual([
      "Sticky Web",
      "Iron Head",
      "Megahorn",
      "Surf",
    ]);
    expect(result.imported[0].moves.find((move) => move.name === "Surf")?.type).toBe("Agua");
    expect(result.imported[0].moves.find((move) => move.name === "Surf")).toMatchObject({
      category: "special",
      power: 90,
      accuracy: 100,
    });
    expect(result.imported[2]).toMatchObject({
      species: "Houndoom-Mega",
      nickname: "WOOF WOOF",
      types: ["Siniestro", "Fuego"],
      stats: expect.objectContaining({ specialAttack: 263 }),
    });
    expect(result.imported[2].moves.find((move) => move.name === "Zap Cannon")?.type).toBe("Eléctrico");
    expect(result.state.pokemon.find((pokemon) => pokemon.id === "pkm-old")?.status).toBe("box");
  });

  it("imports Showdown gender, Mega species and battle stats from EVs and IVs", () => {
    const state = createInitialGameState();
    const result = importShowdownTeam(
      state,
      `MELENON (Ampharos-Mega) (M) @ Tanga Berry
Ability: Grass Pelt
Level: 80
EVs: 4 HP / 126 Def / 252 SpA / 126 SpD
Bashful Nature
IVs: 22 HP / 22 Atk / 27 Def / 7 SpA / 3 SpD / 28 Spe
- Nuzzle
- Hyperspace Hole
- Sucker Punch
- Karate Chop

MANITAS (Gengar) (M) @ Gengarite
Ability: Heavy Metal
Level: 81
EVs: 4 HP / 252 SpA / 252 Spe
Jolly Nature
IVs: 12 Def / 2 SpD
- Dark Pulse
- Lava Plume
- Water Pulse
- Sludge Bomb`,
      () => "fixed-id",
    );

    expect(result.imported[0]).toMatchObject({
      nickname: "MELENON",
      species: "Ampharos-Mega",
      types: ["Electrico", "Dragon"],
      stats: {
        hp: 252,
        attack: 174,
        defense: 219,
        specialAttack: 325,
        specialDefense: 208,
        speed: 99,
      },
    });
    expect(result.imported[1]).toMatchObject({
      nickname: "MANITAS",
      species: "Gengar",
      types: ["Fantasma", "Veneno"],
      stats: expect.objectContaining({
        hp: 214,
        defense: 144,
        specialAttack: 306,
        speed: 320,
      }),
    });
  });

  it("updates matching Showdown imports instead of duplicating them", () => {
    const state = {
      ...createInitialGameState(),
      pokemon: [
        {
          id: "pkm-existing",
          species: "Pikachu",
          nickname: "OG",
          level: 50,
          types: ["Electrico"],
          ability: "Static",
          moves: [],
          item: "",
          status: "box" as const,
          role: "Fast",
          value: 8,
          notes: "Keep this note",
          routeCaught: "Ruta 3",
          deathCause: "",
          deathLocation: "",
        },
      ],
    };

    const result = importShowdownTeam(
      state,
      `OG (Pikachu) @ Lum Berry
Ability: Wonder Guard
Level: 80
- Bolt Strike
- Earthquake`,
      () => "new-id",
    );

    expect(result.imported[0]).toMatchObject({
      id: "pkm-existing",
      ability: "Wonder Guard",
      item: "Lum Berry",
      level: 80,
      role: "Fast",
      value: 8,
      routeCaught: "Ruta 3",
    });
    expect(result.state.pokemon).toHaveLength(1);
  });

  it("sorts inventory by configurable category groups", () => {
    const items = [
      { id: "berry", name: "Baya Ziuela", category: "berry" as const, quantity: 2, location: "", status: "available" as const, holderPokemonId: "", notes: "" },
      { id: "tm", name: "MT13 Rayo Hielo", category: "tm" as const, quantity: 1, location: "", status: "available" as const, holderPokemonId: "", notes: "" },
      { id: "ball", name: "Ultra Ball", category: "pokeball" as const, quantity: 10, location: "", status: "available" as const, holderPokemonId: "", notes: "" },
      { id: "held", name: "Restos", category: "held_item" as const, quantity: 1, location: "", status: "available" as const, holderPokemonId: "", notes: "" },
    ];

    expect(sortInventoryItems(items, "tm_first").map((item) => item.id)).toEqual([
      "tm",
      "held",
      "ball",
      "berry",
    ]);
    expect(sortInventoryItems(items, "berry_first").map((item) => item.id)).toEqual([
      "berry",
      "tm",
      "held",
      "ball",
    ]);
    expect(sortInventoryItems(items, "pokeball_first").map((item) => item.id)[0]).toBe("ball");
  });

  it("sorts inventory alphabetically when requested", () => {
    const items = [
      { id: "z", name: "Zumo de baya", category: "medicine" as const, quantity: 1, location: "", status: "available" as const, holderPokemonId: "", notes: "" },
      { id: "a", name: "Antidoto", category: "medicine" as const, quantity: 1, location: "", status: "available" as const, holderPokemonId: "", notes: "" },
    ];

    expect(sortInventoryItems(items, "name_asc").map((item) => item.id)).toEqual(["a", "z"]);
  });
});
