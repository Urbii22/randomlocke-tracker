import { describe, expect, it } from "vitest";
import {
  calculateDashboardSummary,
  createInitialGameState,
  createRouteDraft,
  getNextBattle,
  isNormalCaptureLimitReached,
  upsertRoute,
  validateRouteDraft,
  validatePokemonDraft,
} from "./game";

describe("Randomlocke game state", () => {
  it("creates an initial game state with Piedrita as the only adventure pokemon", () => {
    const state = createInitialGameState();

    expect(state.levelCaps).toHaveLength(8);
    expect(state.levelCaps[0]).toMatchObject({ gym: 1, leader: "Viola", cap: 14 });
    expect(state.battles.some((battle) => battle.type === "friend")).toBe(true);
    expect(state.routes).toHaveLength(1);
    expect(state.pokemon).toHaveLength(1);
    expect(state.pokemon[0]).toMatchObject({
      species: "Aron",
      nickname: "Piedrita",
      level: 5,
      types: ["Acero", "Roca"],
      ability: "Tabla Terror",
      moves: ["Cola Dragón", "Avalancha", "Psicocambio"],
      status: "alive",
      routeCaught: "Inicial",
    });
  });

  it("summarizes team, box, dead and next progression targets", () => {
    const state = createInitialGameState();
    const summary = calculateDashboardSummary(state);

    expect(summary.teamCount).toBe(1);
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
});
