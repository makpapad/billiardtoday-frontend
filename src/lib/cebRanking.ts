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
