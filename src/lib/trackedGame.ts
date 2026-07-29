import { createInitialGameState } from "@/lib/game";
import type { Battle, GameState, LevelCap } from "@/types/randomlocke";

export const trackedGameIds = ["anil", "opalo", "z", "prolocke"] as const;

export type TrackedGameId = (typeof trackedGameIds)[number];

export const trackedGames: Record<TrackedGameId, {
  label: string;
  tabLabel: string;
  slot: string;
  saveFilePath: string;
  gameDirectory: string;
}> = {
  anil: {
    label: "Pokemon Anil",
    tabLabel: "Anil",
    slot: "A",
    saveFilePath: "C:\\Users\\Diego\\AppData\\Roaming\\Pokemon Anil\\Partida 1.rxdata",
    gameDirectory: "D:\\POKEMON_ANIL\\Pokemon Anil",
  },
  opalo: {
    label: "Pokemon Opalo",
    tabLabel: "Opalo",
    slot: "B",
    saveFilePath: "C:\\Users\\Diego\\Saved Games\\Pokemon Opalo\\Game.rxdata",
    gameDirectory: "D:\\OPALO V2.11\\Pokemon Opalo V2.11",
  },
  z: {
    label: "Pokemon Z",
    tabLabel: "Z",
    slot: "C",
    saveFilePath: "C:\\Users\\Diego\\Saved Games\\Pokemon Z\\Game.rxdata",
    gameDirectory: "D:\\Pokemon Z V2.18",
  },
  prolocke: {
    label: "Prolocke · Luminescent Platinum",
    tabLabel: "Prolocke",
    slot: "D",
    saveFilePath: "C:\\Users\\Diego\\AppData\\Roaming\\Ryujinx\\bis\\user\\save\\0000000000000001\\0",
    gameDirectory: "",
  },
};

export function isTrackedGameId(value: string | null): value is TrackedGameId {
  return value === "anil" || value === "opalo" || value === "z" || value === "prolocke";
}

const BRILLIANT_DIAMOND_LEVEL_CAPS: LevelCap[] = [
  { gym: 1, leader: "Roco · Ciudad Pirita", cap: 14 },
  { gym: 2, leader: "Gardenia · Ciudad Vetusta", cap: 22 },
  { gym: 3, leader: "Maylene · Ciudad Rocavelo", cap: 30 },
  { gym: 4, leader: "Mananti · Ciudad Pradera", cap: 30 },
  { gym: 5, leader: "Fantina · Ciudad Corazón", cap: 36 },
  { gym: 6, leader: "Brega · Ciudad Canal", cap: 39 },
  { gym: 7, leader: "Inverna · Ciudad Puntaneva", cap: 42 },
  { gym: 8, leader: "Lectro · Ciudad Marina", cap: 49 },
];

const BRILLIANT_DIAMOND_BATTLES: Battle[] = [
  { id: "gym-1", name: "Gimnasio de Ciudad Pirita · Roco", type: "gym", levelCap: 14, notes: "Cap del as: Cranidos Nv. 14.", completed: false },
  { id: "gym-2", name: "Gimnasio de Ciudad Vetusta · Gardenia", type: "gym", levelCap: 22, notes: "Cap del as: Roserade Nv. 22.", completed: false },
  { id: "gym-3", name: "Gimnasio de Ciudad Rocavelo · Maylene", type: "gym", levelCap: 30, notes: "Cap del as: Lucario Nv. 30.", completed: false },
  { id: "gym-4", name: "Gimnasio de Ciudad Pradera · Mananti", type: "gym", levelCap: 30, notes: "Cap del as: Floatzel Nv. 30.", completed: false },
  { id: "gym-5", name: "Gimnasio de Ciudad Corazón · Fantina", type: "gym", levelCap: 36, notes: "Cap del as: Mismagius Nv. 36.", completed: false },
  { id: "gym-6", name: "Gimnasio de Ciudad Canal · Brega", type: "gym", levelCap: 39, notes: "Cap del as: Bastiodon Nv. 39.", completed: false },
  { id: "gym-7", name: "Gimnasio de Ciudad Puntaneva · Inverna", type: "gym", levelCap: 42, notes: "Cap del as: Abomasnow Nv. 42.", completed: false },
  { id: "gym-8", name: "Gimnasio de Ciudad Marina · Lectro", type: "gym", levelCap: 49, notes: "Cap del as: Luxray Nv. 49.", completed: false },
  { id: "boss-aaron", name: "Alto Mando · Aaron", type: "boss", levelCap: 53, notes: "Liga Pokémon.", completed: false },
  { id: "boss-bertha", name: "Alto Mando · Gaia", type: "boss", levelCap: 52, notes: "Liga Pokémon.", completed: false },
  { id: "boss-flint", name: "Alto Mando · Fausto", type: "boss", levelCap: 58, notes: "Liga Pokémon.", completed: false },
  { id: "boss-lucian", name: "Alto Mando · Delos", type: "boss", levelCap: 60, notes: "Liga Pokémon.", completed: false },
  { id: "boss-cynthia", name: "Campeona · Cintia", type: "boss", levelCap: 66, notes: "Combate final de la historia.", completed: false },
];

export function createInitialGameStateForGame(game: TrackedGameId): GameState {
  const state = createInitialGameState();
  const settings = trackedGames[game];

  return {
    ...state,
    pokemon: [],
    inventory: [],
    routes: [],
    ...(game === "prolocke"
      ? {
          battles: structuredClone(BRILLIANT_DIAMOND_BATTLES),
          levelCaps: structuredClone(BRILLIANT_DIAMOND_LEVEL_CAPS),
        }
      : game !== "anil"
        ? { battles: [], levelCaps: [] }
        : {}),
    settings: {
      saveFilePath: settings.saveFilePath,
      gameDirectory: settings.gameDirectory,
    },
  };
}
