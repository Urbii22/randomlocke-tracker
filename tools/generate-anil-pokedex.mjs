import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gameDirectory = path.resolve(process.argv[2] ?? "D:\\POKEMON_ANIL\\Pokemon Anil");
const pbsDirectory = path.join(gameDirectory, "PBS");
const outputPath = path.join(repoRoot, "src", "data", "pokedex.ts");

const typeNames = {
  NORMAL: "Normal",
  FIGHTING: "Lucha",
  FLYING: "Volador",
  POISON: "Veneno",
  GROUND: "Tierra",
  ROCK: "Roca",
  BUG: "Bicho",
  GHOST: "Fantasma",
  STEEL: "Acero",
  FIRE: "Fuego",
  WATER: "Agua",
  GRASS: "Planta",
  ELECTRIC: "Electrico",
  PSYCHIC: "Psiquico",
  ICE: "Hielo",
  DRAGON: "Dragon",
  DARK: "Siniestro",
  FAIRY: "Hada",
};

const baseSections = parseSections(path.join(pbsDirectory, "pokemon.txt"));
const formSections = parseSections(path.join(pbsDirectory, "pokemon_forms.txt"));
const baseById = new Map(baseSections.map((section) => [section.id, section]));

const baseEntries = baseSections.map((section, index) => createBaseEntry(section, index + 1));
const formEntries = formSections.map((section, index) => createFormEntry(section, index));
const entries = [...baseEntries, ...formEntries];

const source = `import type { PokemonStats } from "@/types/randomlocke";

export type PokedexEntry = {
  id: number;
  name: string;
  search: string;
  spriteKey: string;
  types: string[];
  stats: PokemonStats;
  ability?: string;
};

// Generated from Pokemon Anil PBS by tools/generate-anil-pokedex.mjs.
// Includes every base species and form available in the installed game.
export const pokedexEntries: PokedexEntry[] = ${JSON.stringify(entries)};
`;

writeFileSync(outputPath, source, "utf8");
console.log(`Generated ${entries.length} Pokedex entries (${baseEntries.length} base, ${formEntries.length} forms).`);

function createBaseEntry(section, id) {
  const name = section.values.Name ?? humanize(section.id);
  return {
    id,
    name,
    search: buildSearch(name, section.id),
    spriteKey: section.id,
    types: parseTypes(section.values.Types),
    stats: parseStats(section.values.BaseStats, section.id),
  };
}

function createFormEntry(section, index) {
  const [speciesId, formNumber = String(index + 1)] = section.id.split(",");
  const base = baseById.get(speciesId);
  if (!base) {
    throw new Error(`Form ${section.id} references unknown species ${speciesId}.`);
  }

  const baseName = base.values.Name ?? humanize(speciesId);
  const formName = section.values.FormName?.trim() || `Forma ${formNumber}`;
  const name = formName.toLocaleLowerCase("es").includes(baseName.toLocaleLowerCase("es"))
    ? formName
    : `${baseName} (${formName})`;

  return {
    id: 100_000 + index,
    name,
    search: buildSearch(
      name,
      baseName,
      speciesId,
      formName,
      `${speciesId}-${formNumber}`,
      formName.startsWith("Mega ") ? `${speciesId}-mega${formNumber === "1" ? "" : `-${formNumber}`}` : "",
    ),
    spriteKey: `${speciesId}_${formNumber}`,
    types: parseTypes(section.values.Types ?? base.values.Types),
    stats: parseStats(section.values.BaseStats ?? base.values.BaseStats, section.id),
  };
}

function parseSections(filePath) {
  const sections = [];
  let current;

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const header = line.match(/^\[([^\]]+)\]$/);
    if (header) {
      current = { id: header[1], values: {} };
      sections.push(current);
      continue;
    }

    const separator = line.indexOf("=");
    if (current && separator > 0) {
      current.values[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
    }
  }

  return sections;
}

function parseTypes(value = "") {
  return value
    .split(",")
    .map((type) => type.trim())
    .filter(Boolean)
    .map((type) => typeNames[type] ?? humanize(type));
}

function parseStats(value, sectionId) {
  const stats = value?.split(",").map((stat) => Number.parseInt(stat.trim(), 10));
  if (!stats || stats.length !== 6 || stats.some((stat) => !Number.isFinite(stat))) {
    throw new Error(`Invalid BaseStats for ${sectionId}.`);
  }

  return {
    hp: stats[0],
    attack: stats[1],
    defense: stats[2],
    specialAttack: stats[4],
    specialDefense: stats[5],
    speed: stats[3],
  };
}

function buildSearch(...values) {
  return [...new Set(values.filter(Boolean).flatMap((value) => {
    const text = value.toLocaleLowerCase("es");
    return [text, text.replace(/[()]/g, " ").replace(/\s+/g, " ").trim()];
  }))].join(" ");
}

function humanize(value) {
  return value
    .toLocaleLowerCase("es")
    .replaceAll("_", " ")
    .replace(/\b\p{L}/gu, (character) => character.toLocaleUpperCase("es"));
}
