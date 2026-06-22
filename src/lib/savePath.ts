export type SavePathValidationResult =
  | { ok: true; savePath: string }
  | { ok: false; error: string };

export function validateConfiguredSavePath(
  savePath: unknown,
  exists: (path: string) => boolean,
  resolveDirectorySave?: (path: string) => string | undefined,
): SavePathValidationResult {
  if (typeof savePath !== "string" || !savePath.trim()) {
    return { ok: false, error: "Configura la ruta del archivo main antes de sincronizar." };
  }

  const trimmed = savePath.trim();
  const resolved = resolveDirectorySave?.(trimmed) ?? trimmed;

  if (!exists(resolved)) {
    return { ok: false, error: "No se encontro el archivo main en la ruta configurada." };
  }

  return { ok: true, savePath: resolved };
}
