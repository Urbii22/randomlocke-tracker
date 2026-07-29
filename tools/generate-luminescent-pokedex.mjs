import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.resolve(
  process.argv[2] ?? "C:\\Users\\Diego\\AppData\\Local\\Temp\\luminescent-LumiMons-2.0.json",
);
const outputPath = path.join(repoRoot, "src", "data", "luminescentPokedex.ts");
const pokedexSource = readFileSync(path.join(repoRoot, "src", "data", "pokedex.ts"), "utf8");
const pokedexMarker = "export const pokedexEntries: PokedexEntry[] = ";
const pokedexStart = pokedexSource.indexOf(pokedexMarker) + pokedexMarker.length;
const pokedexRaw = pokedexSource.slice(pokedexStart).trim();
const pokedexEntries = JSON.parse(pokedexRaw.endsWith(";") ? pokedexRaw.slice(0, -1) : pokedexRaw);
const lumiMons = JSON.parse(readFileSync(sourcePath, "utf8"));

const typeNames = {
  Normal: "Normal",
  Fighting: "Lucha",
  Flying: "Volador",
  Poison: "Veneno",
  Ground: "Tierra",
  Rock: "Roca",
  Bug: "Bicho",
  Ghost: "Fantasma",
  Steel: "Acero",
  Fire: "Fuego",
  Water: "Agua",
  Grass: "Planta",
  Electric: "Electrico",
  Psychic: "Psiquico",
  Ice: "Hielo",
  Dragon: "Dragon",
  Dark: "Siniestro",
  Fairy: "Hada",
};

const byName = new Map();
for (const entry of pokedexEntries) {
  const key = normalize(entry.name);
  if (!byName.has(key)) byName.set(key, entry);
}

const overrides = {};
let matched = 0;
for (const [name, lumiEntry] of Object.entries(lumiMons)) {
  const vanillaEntry = byName.get(normalize(name));
  if (!vanillaEntry || !lumiEntry.bs || !Array.isArray(lumiEntry.types)) continue;

  const ability = Object.values(lumiEntry.abilities ?? {})
    .find((value) => typeof value === "string" && value.trim());
  overrides[vanillaEntry.id] = {
    types: lumiEntry.types.map((type) => typeNames[type] ?? type),
    stats: {
      hp: lumiEntry.bs.hp,
      attack: lumiEntry.bs.at,
      defense: lumiEntry.bs.df,
      specialAttack: lumiEntry.bs.sa,
      specialDefense: lumiEntry.bs.sd,
      speed: lumiEntry.bs.sp,
    },
    ...(ability ? { ability } : {}),
  };
  matched += 1;
}

const source = `import { pokedexEntries, type PokedexEntry } from "@/data/pokedex";

// Generated from Team Luminescent's Luminescent Platinum 2.x LumiMons data.
// Source: https://luminescent.team/pokedex
// Raw data: https://raw.githubusercontent.com/TeamLumi/luminescent-team/main/__gamedata/gamedata2.0/LumiMons.json
const luminescentOverrides: Record<number, Pick<PokedexEntry, "types" | "stats"> & { ability?: string }> = ${JSON.stringify(overrides)};

export const luminescentPokedexEntries: PokedexEntry[] = pokedexEntries.map((entry) => {
  const override = luminescentOverrides[entry.id];
  return override ? { ...entry, ...override } : entry;
});

export const luminescentPokedexSource = "Luminescent Platinum 2.x · Team Luminescent";
`;

writeFileSync(outputPath, source, "utf8");
console.log(`Generated ${matched} Luminescent Pokedex overrides.`);

function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/♀/g, "f")
    .replace(/♂/g, "m")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, "");
}
