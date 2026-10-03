import fs from "node:fs";
import path from "node:path";
import type { CebRankingIndex, CebRankingPayload } from "@/lib/cebRanking";

/**
 * Server-side readers for the CEB ranking JSON (see `cebRanking.ts` for the shape).
 * Server components only — the JSON lives in public/ so the importer can rewrite it
 * on the server without a rebuild.
 */

const DATA_DIR = path.join(process.cwd(), "public", "data", "ceb-ranking");
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

const readJson = <T,>(file: string): T | null => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
};

export const readCebRankingIndex = (): CebRankingIndex | null => {
  const parsed = readJson<CebRankingIndex>(path.join(DATA_DIR, "index.json"));
  return parsed && Array.isArray(parsed.available) ? parsed : null;
};

export const readCebRanking = (slug: string): CebRankingPayload | null => {
  if (!SLUG_PATTERN.test(slug)) return null;

  const parsed = readJson<CebRankingPayload>(path.join(DATA_DIR, `${slug}.json`));
  if (!parsed || !Array.isArray(parsed.rows) || !Array.isArray(parsed.events) || parsed.rows.length === 0) {
    return null;
  }
  return parsed;
};
