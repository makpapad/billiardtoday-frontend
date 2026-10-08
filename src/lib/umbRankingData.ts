import fs from "node:fs";
import path from "node:path";
import type {
  UmbPlayerLinks,
  UmbRankingArchive,
  UmbRankingArchiveEdition,
  UmbRankingIndex,
  UmbRankingPayload,
} from "@/lib/umbRanking";

/**
 * Server-side readers for the UMB ranking JSON (see `umbRanking.ts` for the shape).
 * Server components only — the JSON lives in public/ so the importer can rewrite it
 * on the server without a rebuild.
 *
 * Ίδιο μοτίβο με το `cebRankingData.ts`, χωρίς αρχείο εκδόσεων (δεν κρατάμε ακόμη
 * παλιές εκδόσεις της UMB).
 */

const DATA_DIR = path.join(process.cwd(), "public", "data", "umb-ranking");
const ARCHIVE_DIR = path.join(DATA_DIR, "archive");
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
/** Κλειδί αρχειοθετημένης έκδοσης, π.χ. "05-2026". */
const EDITION_KEY_PATTERN = /^\d{1,2}-\d{4}$/;
/** Το ranking που τροφοδοτεί το hub/λίστα της UMB. */
const UMB_PLAYER_RANKING_SLUG = "3c-individual";

const readJson = <T,>(file: string): T | null => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
};

export const readUmbRankingIndex = (): UmbRankingIndex | null => {
  const parsed = readJson<UmbRankingIndex>(path.join(DATA_DIR, "index.json"));
  return parsed && Array.isArray(parsed.available) ? parsed : null;
};

const isRankingPayload = (parsed: UmbRankingPayload | null): parsed is UmbRankingPayload =>
  Boolean(
    parsed &&
      Array.isArray(parsed.rows) &&
      Array.isArray(parsed.events) &&
      parsed.rows.length > 0 &&
      parsed.federations &&
      typeof parsed.federations === "object",
  );

export const readUmbRanking = (slug: string): UmbRankingPayload | null => {
  if (!SLUG_PATTERN.test(slug)) return null;

  const parsed = readJson<UmbRankingPayload>(path.join(DATA_DIR, `${slug}.json`));
  return isRankingPayload(parsed) ? parsed : null;
};

/** Οι εκδόσεις που κρατάμε για ένα ranking (νεότερη πρώτη) — άδειο αν δεν υπάρχει αρχείο. */
export const readUmbRankingArchive = (slug: string): UmbRankingArchive | null => {
  if (!SLUG_PATTERN.test(slug)) return null;

  const parsed = readJson<UmbRankingArchive>(path.join(ARCHIVE_DIR, slug, "index.json"));
  if (!parsed || !Array.isArray(parsed.editions)) return null;

  const editions = parsed.editions.filter(
    (entry): entry is UmbRankingArchiveEdition =>
      Boolean(entry && typeof entry.key === "string" && EDITION_KEY_PATTERN.test(entry.key)),
  );
  return editions.length > 0 ? { ...parsed, editions } : null;
};

/**
 * Μία αρχειοθετημένη έκδοση, στην ίδια μορφή με την τρέχουσα (`readUmbRanking`)
 * ώστε ο πίνακας να αποδίδεται με το ίδιο component.
 */
export const readUmbRankingEdition = (slug: string, key: string): UmbRankingPayload | null => {
  if (!SLUG_PATTERN.test(slug) || !EDITION_KEY_PATTERN.test(key)) return null;

  const parsed = readJson<UmbRankingPayload>(path.join(ARCHIVE_DIR, slug, `${key}.json`));
  return isRankingPayload(parsed) ? parsed : null;
};

/** Επιτρεπτά κλειδιά αρχείου συνδέσμων (αποφυγή path traversal). */
const LINKS_KEY_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Player-profile links for the UMB list: { "<rank>": { id, slug, db } }.
 * `key` = "computed" (`player-links-computed.json`) ή "official" (`player-links.json`).
 */
export const readUmbPlayerLinks = (key: string = "computed"): UmbPlayerLinks => {
  const safeKey = key && LINKS_KEY_PATTERN.test(key) ? key : "computed";
  const file = safeKey === "official" ? "player-links.json" : `player-links-${safeKey}.json`;
  const parsed = readJson<UmbPlayerLinks>(path.join(DATA_DIR, file));
  if (!parsed || typeof parsed !== "object") return {};
  return Object.fromEntries(
    Object.entries(parsed).filter(
      ([, value]) => value && typeof value.id === "number" && typeof value.slug === "string",
    ),
  );
};

export { UMB_PLAYER_RANKING_SLUG };
