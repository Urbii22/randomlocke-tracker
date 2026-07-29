import {
  standardMoveMetadataByName,
  type StandardMoveMetadata,
} from "@/data/moves";

const standardMoveMetadataByNormalizedName = new Map(
  Object.entries(standardMoveMetadataByName).map(([name, metadata]) => [
    normalizeMoveName(name),
    metadata,
  ]),
);

const showdownMoveAliases: Record<string, string> = {
  "lands wrath": "Land's Wrath",
};

export function getStandardMoveMetadata(name: string): StandardMoveMetadata | undefined {
  const normalizedName = normalizeMoveName(name);
  const alias = showdownMoveAliases[normalizedName];

  return standardMoveMetadataByNormalizedName.get(
    alias ? normalizeMoveName(alias) : normalizedName,
  );
}

function normalizeMoveName(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
