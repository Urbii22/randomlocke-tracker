import type { Pokemon, PokemonMove } from "@/types/randomlocke";

export const pokemonTypes = [
  "Normal",
  "Fuego",
  "Agua",
  "Planta",
  "Eléctrico",
  "Hielo",
  "Lucha",
  "Veneno",
  "Tierra",
  "Volador",
  "Psíquico",
  "Bicho",
  "Roca",
  "Fantasma",
  "Dragón",
  "Siniestro",
  "Acero",
  "Hada",
] as const;

export type PokemonType = (typeof pokemonTypes)[number];

export type TypeMultiplier = {
  type: PokemonType;
  multiplier: number;
};

export type CombatMember = {
  pokemon: Pokemon;
  moveTypes: { move: PokemonMove; type?: PokemonType }[];
  defensiveProfile: {
    weaknesses: TypeMultiplier[];
    resistances: TypeMultiplier[];
    immunities: TypeMultiplier[];
    neutral: TypeMultiplier[];
  };
};

export type TeamDefenseRow = {
  type: PokemonType;
  weakTo: string[];
  resists: string[];
  immune: string[];
};

const aliases: Record<string, PokemonType> = {
  electric: "Eléctrico",
  fighting: "Lucha",
  psychic: "Psíquico",
  steel: "Acero",
  rock: "Roca",
  fairy: "Hada",
  poison: "Veneno",
  fire: "Fuego",
  water: "Agua",
  grass: "Planta",
  ice: "Hielo",
  ground: "Tierra",
  flying: "Volador",
  bug: "Bicho",
  ghost: "Fantasma",
  dark: "Siniestro",
  electrico: "Eléctrico",
  eléctrico: "Eléctrico",
  lucha: "Lucha",
  dragon: "Dragón",
  dragón: "Dragón",
  psiquico: "Psíquico",
  psíquico: "Psíquico",
  acero: "Acero",
  roca: "Roca",
  hada: "Hada",
  veneno: "Veneno",
  fuego: "Fuego",
  agua: "Agua",
  planta: "Planta",
  hielo: "Hielo",
  tierra: "Tierra",
  volador: "Volador",
  bicho: "Bicho",
  fantasma: "Fantasma",
  siniestro: "Siniestro",
  normal: "Normal",
};

const moveTypeByName: Record<string, PokemonType> = {
  "after you": "Normal",
  aeroblast: "Volador",
  "air cutter": "Volador",
  "attack order": "Bicho",
  "blue flare": "Fuego",
  "bolt strike": "Eléctrico",
  "bone rush": "Tierra",
  charm: "Hada",
  "charge beam": "Eléctrico",
  "cross poison": "Veneno",
  "dragon breath": "Dragón",
  "dragon tail": "Dragón",
  "drill run": "Tierra",
  "double kick": "Lucha",
  "echoed voice": "Normal",
  extrasensory: "Psíquico",
  flash: "Normal",
  "flash cannon": "Acero",
  fling: "Siniestro",
  "freeze shock": "Hielo",
  "hyperspace hole": "Psíquico",
  "leaf storm": "Planta",
  "meteor mash": "Acero",
  "ominous wind": "Fantasma",
  "petal blizzard": "Planta",
  "power whip": "Planta",
  "power-up punch": "Lucha",
  "rapid spin": "Normal",
  "razor shell": "Agua",
  reversal: "Lucha",
  "rock slide": "Roca",
  "rock tomb": "Roca",
  rototiller: "Tierra",
  "sand tomb": "Tierra",
  "seed bomb": "Planta",
  "shadow sneak": "Fantasma",
  "sheer cold": "Hielo",
  "spacial rend": "Dragón",
  "steel wing": "Acero",
  splash: "Normal",
  substitute: "Normal",
  "sweet scent": "Normal",
  thunder: "Eléctrico",
  "thunder shock": "Eléctrico",
  "thousand waves": "Tierra",
  "water gun": "Agua",
  "water pledge": "Agua",
  "will-o-wisp": "Fuego",
  "cola dragon": "Dragón",
  "cola dragón": "Dragón",
  avalancha: "Roca",
  psicocambio: "Psíquico",
  "doble patada": "Lucha",
  "paso dimensional": "Psíquico",
  "clavo canon": "Normal",
  "clavo cañon": "Normal",
  "clavo cañón": "Normal",
  inversion: "Lucha",
  inversión: "Lucha",
  "pulso cura": "Psíquico",
  "voto agua": "Agua",
  "ataque fulgor": "Eléctrico",
  "sombra vil": "Fantasma",
  trueno: "Eléctrico",
  "ataque oseo": "Tierra",
  "ataque óseo": "Tierra",
  lluevehojas: "Planta",
  "rayo gelido": "Hielo",
  "rayo gélido": "Hielo",
  resplandor: "Psíquico",
  "aire afilado": "Volador",
  "rayo carga": "Eléctrico",
  "eco voz": "Normal",
  "frio polar": "Hielo",
  "frío polar": "Hielo",
  "veneno x": "Veneno",
  "llama azul": "Fuego",
  "pistola agua": "Agua",
  "ala de acero": "Acero",
};

const attackChart: Record<PokemonType, Partial<Record<PokemonType, number>>> = {
  Normal: { Roca: 0.5, Fantasma: 0, Acero: 0.5 },
  Fuego: { Fuego: 0.5, Agua: 0.5, Planta: 2, Hielo: 2, Bicho: 2, Roca: 0.5, Dragón: 0.5, Acero: 2 },
  Agua: { Fuego: 2, Agua: 0.5, Planta: 0.5, Tierra: 2, Roca: 2, Dragón: 0.5 },
  Planta: { Fuego: 0.5, Agua: 2, Planta: 0.5, Veneno: 0.5, Tierra: 2, Volador: 0.5, Bicho: 0.5, Roca: 2, Dragón: 0.5, Acero: 0.5 },
  Eléctrico: { Agua: 2, Planta: 0.5, Eléctrico: 0.5, Tierra: 0, Volador: 2, Dragón: 0.5 },
  Hielo: { Fuego: 0.5, Agua: 0.5, Planta: 2, Hielo: 0.5, Tierra: 2, Volador: 2, Dragón: 2, Acero: 0.5 },
  Lucha: { Normal: 2, Hielo: 2, Veneno: 0.5, Volador: 0.5, Psíquico: 0.5, Bicho: 0.5, Roca: 2, Fantasma: 0, Siniestro: 2, Acero: 2, Hada: 0.5 },
  Veneno: { Planta: 2, Veneno: 0.5, Tierra: 0.5, Roca: 0.5, Fantasma: 0.5, Acero: 0, Hada: 2 },
  Tierra: { Fuego: 2, Planta: 0.5, Eléctrico: 2, Veneno: 2, Volador: 0, Bicho: 0.5, Roca: 2, Acero: 2 },
  Volador: { Planta: 2, Eléctrico: 0.5, Lucha: 2, Bicho: 2, Roca: 0.5, Acero: 0.5 },
  Psíquico: { Lucha: 2, Veneno: 2, Psíquico: 0.5, Siniestro: 0, Acero: 0.5 },
  Bicho: { Fuego: 0.5, Planta: 2, Lucha: 0.5, Veneno: 0.5, Volador: 0.5, Psíquico: 2, Fantasma: 0.5, Siniestro: 2, Acero: 0.5, Hada: 0.5 },
  Roca: { Fuego: 2, Hielo: 2, Lucha: 0.5, Tierra: 0.5, Volador: 2, Bicho: 2, Acero: 0.5 },
  Fantasma: { Normal: 0, Psíquico: 2, Fantasma: 2, Siniestro: 0.5 },
  Dragón: { Dragón: 2, Acero: 0.5, Hada: 0 },
  Siniestro: { Lucha: 0.5, Psíquico: 2, Fantasma: 2, Siniestro: 0.5, Hada: 0.5 },
  Acero: { Fuego: 0.5, Agua: 0.5, Eléctrico: 0.5, Hielo: 2, Roca: 2, Acero: 0.5, Hada: 2 },
  Hada: { Fuego: 0.5, Lucha: 2, Veneno: 0.5, Dragón: 2, Siniestro: 2, Acero: 0.5 },
};

export function normalizePokemonType(type: string): PokemonType | undefined {
  return aliases[type.trim().toLowerCase()];
}

export function getMoveType(move: string): PokemonType | undefined {
  return moveTypeByName[move.trim().toLowerCase()];
}

export function getPokemonMoveType(move: PokemonMove): PokemonType | undefined {
  return normalizePokemonType(move.type) ?? getMoveType(move.name);
}

export function getDefensiveMultiplier(
  attackerType: PokemonType,
  defenderTypes: PokemonType[],
): number {
  return defenderTypes.reduce(
    (multiplier, defenderType) => multiplier * (attackChart[attackerType][defenderType] ?? 1),
    1,
  );
}

export function getPokemonDefensiveProfile(pokemon: Pokemon): CombatMember["defensiveProfile"] {
  const defenderTypes = pokemon.types
    .map(normalizePokemonType)
    .filter((type): type is PokemonType => Boolean(type));

  const rows = pokemonTypes.map((type) => ({
    type,
    multiplier: getDefensiveMultiplier(type, defenderTypes),
  }));

  return {
    weaknesses: rows.filter((row) => row.multiplier > 1),
    resistances: rows.filter((row) => row.multiplier > 0 && row.multiplier < 1),
    immunities: rows.filter((row) => row.multiplier === 0),
    neutral: rows.filter((row) => row.multiplier === 1),
  };
}

export function getTeamCombatProfile(pokemon: Pokemon[]) {
  const team = pokemon.filter((entry) => entry.status === "alive");
  const members: CombatMember[] = team.map((entry) => ({
    pokemon: entry,
    moveTypes: entry.moves.map((move) => ({ move, type: getPokemonMoveType(move) })),
    defensiveProfile: getPokemonDefensiveProfile(entry),
  }));

  const offensiveTypes = Array.from(
    new Set(
      members.flatMap((member) =>
        member.moveTypes.flatMap((move) => (move.type ? [move.type] : [])),
      ),
    ),
  );

  const defenseRows: TeamDefenseRow[] = pokemonTypes.map((type) => ({
    type,
    weakTo: members
      .filter((member) =>
        member.defensiveProfile.weaknesses.some((row) => row.type === type),
      )
      .map((member) => member.pokemon.nickname),
    resists: members
      .filter((member) =>
        member.defensiveProfile.resistances.some((row) => row.type === type),
      )
      .map((member) => member.pokemon.nickname),
    immune: members
      .filter((member) =>
        member.defensiveProfile.immunities.some((row) => row.type === type),
      )
      .map((member) => member.pokemon.nickname),
  }));

  return { members, offensiveTypes, defenseRows };
}
