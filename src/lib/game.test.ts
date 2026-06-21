import { describe, expect, it } from "vitest";
import {
  calculateDashboardSummary,
  createInventoryItemDraft,
  createInitialGameState,
  createRouteDraft,
  getNextBattle,
  isNormalCaptureLimitReached,
  upsertRoute,
  upsertInventoryItem,
  validateInventoryItemDraft,
  validateRouteDraft,
  validatePokemonDraft,
} from "./game";

describe("Randomlocke game state", () => {
  it("creates an initial game state with the current adventure team", () => {
    const state = createInitialGameState();

    expect(state.levelCaps).toHaveLength(8);
    expect(state.levelCaps[0]).toMatchObject({ gym: 1, leader: "Viola", cap: 14 });
    expect(state.battles.some((battle) => battle.type === "friend")).toBe(true);
    expect(state.routes).toHaveLength(1);
    expect(state.inventory).toHaveLength(5);
    expect(state.pokemon).toHaveLength(6);
    expect(state.pokemon.map((pokemon) => pokemon.nickname)).toEqual([
      "Piedrita",
      "Patadon",
      "PEPE",
      "LA RACHA",
      "PITUFO",
      "PIUPIU",
    ]);
    expect(state.pokemon[0]).toMatchObject({
      species: "Aron",
      nickname: "Piedrita",
      level: 17,
      types: ["Acero", "Roca"],
      ability: "Veleta",
      moves: ["Cola Dragón", "Avalancha", "Psicocambio", "Sombra Vil"],
      item: "Tabla Terror",
      status: "alive",
    });
    expect(state.pokemon[1]).toMatchObject({
      species: "Dedenne",
      nickname: "Patadon",
      level: 17,
      types: ["Eléctrico", "Hada"],
      ability: "Intimidación",
      moves: ["Doble Patada", "Paso Dimensional", "Trueno", "Ataque Óseo"],
      status: "alive",
    });
    expect(state.pokemon[2]).toMatchObject({
      species: "Venusaur",
      nickname: "PEPE",
      level: 19,
      types: ["Planta", "Veneno"],
      ability: "Resquicio",
      item: "Venusaurita",
      status: "alive",
    });
    expect(state.pokemon[3]).toMatchObject({
      species: "Quilava",
      nickname: "LA RACHA",
      level: 18,
      types: ["Fuego"],
      ability: "Agallas",
      moves: ["Inversión", "Rayo Carga", "Voto Agua", "Ataque Fulgor"],
      item: "Cinta Elegida",
      status: "alive",
    });
    expect(state.inventory.find((item) => item.holderPokemonId === "pkm-pitufo")).toMatchObject({
      name: "Lustresfera",
      status: "equipped",
    });
  });

  it("summarizes team, box, dead and next progression targets", () => {
    const state = createInitialGameState();
    const summary = calculateDashboardSummary(state);

    expect(summary.teamCount).toBe(6);
    expect(summary.boxCount).toBe(0);
    expect(summary.deadCount).toBe(0);
    expect(summary.currentLevelCap).toBe(30);
    expect(summary.nextGym?.name).toBe("Gimnasio de Ciudad Relieve");
    expect(summary.nextFriendBattle?.name).toBe("Combate contra amigos 1");
  });

  it("returns the first incomplete battle of a requested type", () => {
    const state = createInitialGameState();

    expect(getNextBattle(state.battles, "gym")?.levelCap).toBe(30);
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
      moves: ["Surf", "Canto", "Rayo hielo", "Protección", "Danza lluvia"],
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

    expect(next.inventory).toHaveLength(6);
    expect(next.inventory[0]).toMatchObject({ id: "item-tm01", category: "tm" });
    expect(next.updatedAt).not.toBe(state.updatedAt);
  });
});
