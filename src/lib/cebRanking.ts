/**
 * CEB official rankings — shared types and pure helpers.
 *
 * NO node:fs here: client components import this module too. The JSON readers
 * live in `cebRankingData.ts` (server components only).
 *
 * The data comes from `public/data/ceb-ranking/*.json`, produced by the importer
 * (`docs/ai/ceb-ranking/build_ceb_data.py`) from the official CEB PDF. It sits
 * under public/ so the daily importer can rewrite it on the server without a
 * rebuild; the pages revalidate every 5 min, so a new edition appears on its own.
 */

export type CebRankingEvent = {
  key: string;
  short: string;
  name: string;
  city: string | null;
  date: string | null;
  scale: number[];
  href: string | null;
  ours: boolean;
  note?: string;
};

export type CebRankingRow = {
  rank: number;
  name: string;
  fed: string;
  points: number;
  ev: (number | null)[];
  suspended: string | null;
};

export type CebRankingCounts = {
  players: number;
  federations: number;
  suspended: number;
};

/** Link του πίνακα CEB προς το προφίλ του παίκτη (κλειδί = η θέση/rank της γραμμής). */
export type CebPlayerLink = {
  id: number;
  slug: string;
  db: string;
  kind?: string;
};

export type CebPlayerLinks = Record<string, CebPlayerLink>;

export type CebRankingPayload = {
  slug: string;
  title: string;
  discipline: string;
  categoryLabel: string;
  edition: string;
  updatedAt: string | null;
  lastEvent: string | null;
  sourceUrl: string;
  sourcePage: string;
  sourceLabel: string;
  generatedAt: string;
  counts: CebRankingCounts;
  events: CebRankingEvent[];
  federations: Record<string, string>;
  rows: CebRankingRow[];
  /**
   * Ποιο αρχείο συνδέσμων προφίλ (θέση → παίκτης) ανήκει σε αυτή τη λίστα:
   * "official" (προεπιλογή, `player-links.json`) ή "computed"
   * (`player-links-computed.json`) — η αρίθμηση των θέσεων αλλάζει μαζί με τη λίστα.
   */
  links?: string;
  /** "computed" = υπολογισμένη από τα δικά μας αποτελέσματα, όχι αντίγραφο του PDF. */
  dataSource?: string;
};

export type CebRankingIndexEntry = {
  slug: string;
  title: string;
  discipline: string;
  categoryLabel: string;
  edition: string;
  updatedAt: string | null;
  players: number;
  federations: number;
  suspended: number;
  href: string;
  sourceUrl: string;
};

export type CebRankingIndex = {
  sourcePage: string;
  generatedAt: string;
  available: CebRankingIndexEntry[];
  upcoming: Array<{ title: string; file: string }>;
};

export const CEB_RANKING_HUB_PATH = "/rankings/ceb";
export const CEB_RANKING_PAGE_SIZE = 50;

export const formatCebDate = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value;
  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

export const formatCebScale = (scale: number[]) => scale.join(" / ");

export const cebRankingHref = (slug: string) => `${CEB_RANKING_HUB_PATH}/${slug}`;

/**
 * Rankings archive — κάθε δημοσιευμένη έκδοση κρατιέται σε δικό της αντίγραφο
 * (`public/data/ceb-ranking/archive/<slug>/<key>.json`), ώστε μια νέα έκδοση να
 * μην σβήνει την προηγούμενη. Το κλειδί βγαίνει από την έκδοση: "16/2026" -> "16-2026".
 */
export const cebEditionKey = (edition: string): string => edition.trim().replace(/\//g, "-");

export const cebEditionHref = (slug: string, key: string) =>
  `${CEB_RANKING_HUB_PATH}/${slug}/${key}`;

/** «16/2026» -> «2026» (η σεζόν), για ταξινόμηση και εμφάνιση. */
export const cebEditionSeason = (edition: string): string => edition.split("/")[1]?.trim() ?? "";

export type CebRankingArchiveEdition = {
  key: string;
  edition: string;
  updatedAt: string | null;
  archivedAt: string;
  players: number;
  federations: number;
  suspended: number;
  sourceUrl: string;
};

export type CebRankingArchive = {
  slug: string;
  title: string;
  generatedAt: string;
  /** Νεότερη έκδοση πρώτη. */
  editions: CebRankingArchiveEdition[];
};
