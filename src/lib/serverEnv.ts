import fs from "fs";
import path from "path";

let cachedEnv: Record<string, string> | null = null;

function loadEnvFile() {
  if (cachedEnv) return cachedEnv;

  const out: Record<string, string> = {};
  const roots = Array.from(
    new Set([process.cwd(), path.join(process.cwd(), "httpdocs")]),
  );
  const candidates = roots.flatMap((rootPath) => [
    path.join(rootPath, ".env.production.local"),
    path.join(rootPath, ".env.local"),
    path.join(rootPath, ".env.production"),
    path.join(rootPath, ".env"),
  ]);

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex <= 0) continue;

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      out[key] = value;
    }
  }

  cachedEnv = out;
  return out;
}

export function getServerEnv(key: string): string | undefined {
  const isProduction = (process.env.NODE_ENV || "").trim() === "production";
  const fileValue = loadEnvFile()[key];
  if (isProduction && fileValue && fileValue.trim()) return fileValue.trim();

  const runtimeValue = process.env[key];
  if (runtimeValue && runtimeValue.trim()) return runtimeValue.trim();

  return fileValue && fileValue.trim() ? fileValue.trim() : undefined;
}
