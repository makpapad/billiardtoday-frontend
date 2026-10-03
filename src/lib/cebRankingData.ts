import fs from "node:fs";
import path from "node:path";
import type {
  CebPlayerLinks,
  CebRankingEvent,
  CebRankingIndex,
  CebRankingPayload,
  CebRankingRow,
} from "@/lib/cebRanking";

/**
 * Server-side readers for the CEB ranking JSON (see `cebRanking.ts` for the shape).
 * Server components only — the JSON lives in public/ so the importer can rewrite it
 * on the server without a rebuild.
 */

const DATA_DIR = path.join(process.cwd(), "public", "data", "ceb-ranking");
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
/** Το ranking που τροφοδοτεί το block στο προφίλ του παίκτη. */
const CEB_PLAYER_RANKING_SLUG = "3c-individual";

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

/** Player-profile links for the CEB list: { "<rank>": { id, slug, db } }. */
export const readCebPlayerLinks = (): CebPlayerLinks => {
  const parsed = readJson<CebPlayerLinks>(path.join(DATA_DIR, "player-links.json"));
  if (!parsed || typeof parsed !== "object") return {};
  return Object.fromEntries(
    Object.entries(parsed).filter(
      ([, value]) => value && typeof value.id === "number" && typeof value.slug === "string",
    ),
  );
};

export type CebPlayerRanking = {
  rankingTitle: string;
  rankingSlug: string;
  edition: string;
  updatedAt: string | null;
  sourceUrl: string;
  sourcePage: string;
  sourceLabel: string;
  events: CebRankingEvent[];
  row: CebRankingRow;
  federations: Record<string, string>;
};

/**
 * Το CEB ranking του παίκτη (αν υπάρχει), με αντίστροφη αναζήτηση μέσω του
 * player-links.json (rank -> id). Server components only.
 */
export const readCebPlayerRanking = (playerId: string | number): CebPlayerRanking | null => {
  // Το [id] του URL είναι τύπου "216-MERCKX-Eddy" — κρατάμε το νούμερο (όπως και το publicSiteData).
  const numericId = String(playerId).split("-")[0]?.trim();
  if (!numericId) return null;

  const rank = Object.entries(readCebPlayerLinks()).find(([, link]) => String(link.id) === numericId)?.[0];
  if (!rank) return null;

  const payload = readCebRanking(CEB_PLAYER_RANKING_SLUG);
  if (!payload) return null;

  const row = payload.rows.find((entry) => String(entry.rank) === rank);
  if (!row) return null;

  return {
    rankingTitle: payload.title,
    rankingSlug: payload.slug,
    edition: payload.edition,
    updatedAt: payload.updatedAt,
    sourceUrl: payload.sourceUrl,
    sourcePage: payload.sourcePage,
    sourceLabel: payload.sourceLabel,
    events: payload.events,
    row,
    federations: payload.federations,
  };
};
