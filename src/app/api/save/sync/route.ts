import { execFile } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { parseSaveReaderOutput } from "@/lib/saveReader";
import { validateConfiguredSavePath } from "@/lib/savePath";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);
const TIMEOUT_MS = 20_000;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "La peticion no incluye JSON valido." }, { status: 400 });
  }

  const savePath = readSavePath(body);
  const gameDirectory = readGameDirectory(body);
  const validation = validateConfiguredSavePath(savePath, existsSync, resolveDirectorySave);

  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const command = resolveSaveReaderCommand();

  try {
    const { stdout, stderr } = await execFileAsync(
      command.file,
      command.args(validation.savePath, gameDirectory),
      {
        cwd: process.cwd(),
        timeout: TIMEOUT_MS,
        windowsHide: true,
        maxBuffer: 1024 * 1024 * 8,
      },
    );
    const parsed = parseSaveReaderOutput(stdout);

    if (!parsed.ok) {
      console.error("save-reader invalid JSON", { stderr: sanitizeLog(stderr) });
      return Response.json({ error: parsed.error }, { status: 502 });
    }

    return Response.json({ snapshot: parsed.snapshot });
  } catch (error) {
    console.error("save-reader execution failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return Response.json(
      { error: "No se pudo leer el save. Revisa que el lector este compilado y la ruta sea correcta." },
      { status: 500 },
    );
  }
}

function resolveDirectorySave(savePath: string): string | undefined {
  try {
    if (!existsSync(savePath) || !statSync(savePath).isDirectory()) {
      return undefined;
    }
  } catch {
    return undefined;
  }

  const mainPath = path.join(savePath, "main");
  if (existsSync(mainPath)) {
    return mainPath;
  }

  const switchSavePath = path.join(savePath, "SaveData.bin");
  if (existsSync(switchSavePath)) {
    return switchSavePath;
  }

  const anilSaves = readdirSync(savePath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^Partida\s+\d+\.rxdata$/i.test(entry.name))
    .map((entry) => path.join(savePath, entry.name))
    .toSorted((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);

  return anilSaves[0];
}

function readSavePath(body: unknown): unknown {
  if (typeof body !== "object" || body === null || !("savePath" in body)) {
    return undefined;
  }

  return body.savePath;
}

function readGameDirectory(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null || !("gameDirectory" in body)) {
    return undefined;
  }

  return typeof body.gameDirectory === "string" && body.gameDirectory.trim()
    ? body.gameDirectory.trim()
    : undefined;
}

function resolveSaveReaderCommand() {
  const exePath = path.join(
    process.cwd(),
    "tools",
    "save-reader",
    "bin",
    "Release",
    "net10.0",
    "save-reader.exe",
  );
  const projectPath = path.join(process.cwd(), "tools", "save-reader");

  if (existsSync(exePath)) {
    return {
      file: exePath,
      args: (savePath: string, gameDirectory?: string) => buildReaderArgs(savePath, gameDirectory),
    };
  }

  const localDotnet = path.join(process.cwd(), ".dotnet", "dotnet.exe");

  return {
    file: existsSync(localDotnet) ? localDotnet : "dotnet",
    args: (savePath: string, gameDirectory?: string) => [
      "run",
      "--project",
      projectPath,
      "--",
      ...buildReaderArgs(savePath, gameDirectory),
    ],
  };
}

function buildReaderArgs(savePath: string, gameDirectory?: string): string[] {
  return gameDirectory
    ? ["--save", savePath, "--game-dir", gameDirectory]
    : ["--save", savePath];
}

function sanitizeLog(value: string): string {
  return value.replace(/[A-Z]:\\[^\r\n"]+/gi, "[redacted-path]").slice(0, 2000);
}
