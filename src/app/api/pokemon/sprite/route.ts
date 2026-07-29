import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { normalizePokemonSpriteKey, type PokemonSpriteKind } from "@/lib/pokemonSprite";

export const runtime = "nodejs";

const DEFAULT_GAME_DIRECTORY = "D:\\POKEMON_ANIL\\Pokemon Anil";
const DEFAULT_OPALO_GAME_DIRECTORY = "D:\\OPALO V2.11\\Pokemon Opalo V2.11";
const DEFAULT_Z_GAME_DIRECTORY = "D:\\Pokemon Z V2.18";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const spriteKey = normalizePokemonSpriteKey(url.searchParams.get("key") ?? "");
  const kind = parseKind(url.searchParams.get("kind"));
  const shiny = url.searchParams.get("shiny") === "1";
  const game = parseGame(url.searchParams.get("game"));

  if (!spriteKey || !kind) {
    return Response.json({ error: "Sprite Pokemon no valido." }, { status: 400 });
  }

  for (const spritePath of getSpritePaths(spriteKey, kind, shiny, game)) {
    const response = await readSprite(request, spritePath);
    if (response) return response;
  }

  return Response.json({ error: "Sprite no encontrado." }, { status: 404 });
}

function getSpritePaths(
  spriteKey: string,
  kind: PokemonSpriteKind,
  shiny: boolean,
  game: "anil" | "opalo" | "z" | "prolocke" | undefined,
): string[] {
  const anilDirectory = process.env.POKEMON_ANIL_GAME_DIR?.trim() || DEFAULT_GAME_DIRECTORY;
  const anilFolder = kind === "icon" ? "Icons" : "Front";
  const anilBase = path.resolve(anilDirectory, "Graphics", "Pokemon");
  const anilPaths = (shiny ? [`${anilFolder} shiny`, anilFolder] : [anilFolder]).map((folder) =>
    path.resolve(anilBase, folder, `${spriteKey}.png`),
  );

  if (game === "anil" || game === "prolocke" || !/^\d+$/.test(spriteKey)) {
    return anilPaths;
  }

  const opaloDirectory = game === "z"
    ? process.env.POKEMON_Z_GAME_DIR?.trim() || DEFAULT_Z_GAME_DIRECTORY
    : process.env.POKEMON_OPALO_GAME_DIR?.trim() || DEFAULT_OPALO_GAME_DIRECTORY;
  const opaloGraphics = path.resolve(opaloDirectory, "Graphics");
  const fileKeys = [...new Set([spriteKey, spriteKey.padStart(3, "0")])];
  const suffixes = shiny ? ["s", ""] : [""];
  const folders = kind === "icon" ? ["Icons"] : ["Battlers", "Icons"];
  const opaloPaths = folders.flatMap((folder) =>
    fileKeys.flatMap((fileKey) =>
      suffixes.map((suffix) =>
        path.resolve(opaloGraphics, folder, `${folder === "Icons" ? "icon" : ""}${fileKey}${suffix}.png`),
      ),
    ),
  );

  return [...anilPaths, ...opaloPaths];
}

async function readSprite(request: Request, spritePath: string): Promise<Response | undefined> {
  try {
    const [spriteSheet, metadata] = await Promise.all([readFile(spritePath), stat(spritePath)]);
    const file = await extractFirstFrame(spriteSheet);
    const etag = `W/"frame-${metadata.size}-${Math.trunc(metadata.mtimeMs)}"`;

    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag } });
    }

    return new Response(new Uint8Array(file), {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Length": String(file.length),
        "Content-Type": "image/png",
        ETag: etag,
      },
    });
  } catch (error) {
    if (isMissingFile(error)) {
      return undefined;
    }

    console.error("pokemon sprite read failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return Response.json({ error: "No se pudo leer el sprite." }, { status: 500 });
  }
}

async function extractFirstFrame(spriteSheet: Buffer): Promise<Buffer> {
  const image = sharp(spriteSheet);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height || metadata.width <= metadata.height) {
    return spriteSheet;
  }

  return image
    .extract({ left: 0, top: 0, width: metadata.height, height: metadata.height })
    .png()
    .toBuffer();
}

function parseKind(value: string | null): PokemonSpriteKind | undefined {
  return value === "icon" || value === "front" ? value : undefined;
}

function parseGame(value: string | null): "anil" | "opalo" | "z" | "prolocke" | undefined {
  return value === "anil" || value === "opalo" || value === "z" || value === "prolocke" ? value : undefined;
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
