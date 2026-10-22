/**
 * Server-side δεδομένα για τις καρτέλες της δημόσιας σελίδας ομοσπονδίας.
 *
 * Γιατί server: το δημόσιο REST του Strapi δεν εκθέτει τη σχέση ενός ομαδικού
 * πρωταθλήματος με το τουρνουά/την ομοσπονδία του, άρα ο browser δεν μπορεί να
 * φιλτράρει «τα ομαδικά ΑΥΤΗΣ της ομοσπονδίας». Εδώ μιλάμε με token.
 */

import { fetchRankingSeriesIndex, type RankingSeriesIndexItem } from "@/lib/rankings";
import { isDraftTournament } from "@/lib/tournamentPublication";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const PRIMARY_STRAPI_URL =
  process.env.STRAPI_API_URL ||
  (IS_PRODUCTION ? "http://127.0.0.1:1337" : process.env.NEXT_PUBLIC_STRAPI_URL) ||
  "https://app.billiardtoday.com";
const FALLBACK_STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL ||
  (IS_PRODUCTION ? "https://app.billiardtoday.com" : undefined);
const STRAPI_URLS = Array.from(
  new Set([PRIMARY_STRAPI_URL, FALLBACK_STRAPI_URL].filter(Boolean)),
) as string[];
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

const fetchStrapi = async (path: string): Promise<unknown> => {
  const headers: HeadersInit = STRAPI_API_TOKEN
    ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` }
    : {};
  const runtimeOptions: RequestInit & { next?: { revalidate: number } } =
    IS_PRODUCTION ? { next: { revalidate: 300 } } : { cache: "no-store" };

  for (const baseUrl of STRAPI_URLS) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...runtimeOptions,
      headers,
    }).catch(() => null);
    if (response?.ok) return response.json().catch(() => null);

    // Το fallback host (το δημόσιο app.billiardtoday.com) μπορεί να απορρίψει το
    // bearer token — ξαναδοκιμάζουμε χωρίς header πριν το εγκαταλείψουμε.
    if (response && STRAPI_API_TOKEN) {
      const retry = await fetch(`${baseUrl}${path}`, runtimeOptions).catch(
        () => null,
      );
      if (retry?.ok) return retry.json().catch(() => null);
    }
  }
  return null;
};

const readRows = (json: unknown): Record<string, unknown>[] => {
  if (!json || typeof json !== "object") return [];
  const data = (json as { data?: unknown }).data;
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
};

const readString = (value: unknown): string | null => {
  const clean = String(value ?? "").trim();
  return clean.length > 0 ? clean : null;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : null;
};

/** Πόσα δημοσιευμένα events έχει η ομοσπονδία (για να μη δείχνουμε άδεια καρτέλα). */
export const countFederationPublishedEvents = async (
  federationDocumentId: string,
): Promise<number> => {
  if (!federationDocumentId) return 0;

  const params = new URLSearchParams();
  params.set("pagination[pageSize]", "500");
  params.set("fields[0]", "documentId");
  params.set("populate[tournament][fields][0]", "format_definition");
  params.set(
    "filters[tournament][organizer_federation][documentId][$eq]",
    federationDocumentId,
  );

  const json = await fetchStrapi(`/api/bt-events?${params.toString()}`);
  return readRows(json).filter((row) => !isDraftTournament(row)).length;
};

/** Οι σειρές κατάταξης που ανήκουν σε αυτή την ομοσπονδία. */
export const fetchFederationRankingSeries = async (
  federationSlug: string,
): Promise<RankingSeriesIndexItem[]> => {
  if (!federationSlug) return [];
  const all = await fetchRankingSeriesIndex();
  return all.filter((series) => series.federationSlug === federationSlug);
};

export type FederationTeamTournamentItem = {
  documentId: string;
  title: string;
  slug: string;
  /** Έτοιμος σύνδεσμος — η κοινή λίστα τον χρησιμοποιεί όπως είναι. */
  href: string;
  gameType: string | null;
  season: number | null;
  startDate: string | null;
  endDate: string | null;
  divisionName: string | null;
};

const slugifyValue = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Το ίδιο σχήμα slug με το `buildTeamTournamentSlug` της σελίδας ομαδικών. */
export const buildTeamTournamentSlugFromParts = (
  title: string,
  season: number | null,
): string => {
  const base = slugifyValue(title);
  return season ? `${base}-${season}` : base;
};

const readTeamTournamentRow = (
  row: Record<string, unknown>,
): FederationTeamTournamentItem | null => {
  const title = readString(row.title);
  if (!title) return null;

  const config =
    row.config && typeof row.config === "object"
      ? (row.config as Record<string, unknown>)
      : {};
  const season = toNumber(config.season);
  const gameType = readString(config.game_type);

  // Το συνδεδεμένο τουρνουά δίνει τις ημερομηνίες (το ομαδικό δεν έχει δικές του).
  let tournament: Record<string, unknown> = {};
  const tournamentRaw = row.tournament;
  if (tournamentRaw && typeof tournamentRaw === "object") {
    const record = tournamentRaw as Record<string, unknown>;
    const nested = record.data;
    if (nested && typeof nested === "object") {
      const attributes = (nested as Record<string, unknown>).attributes;
      tournament =
        attributes && typeof attributes === "object"
          ? (attributes as Record<string, unknown>)
          : {};
    } else {
      tournament = record;
    }
  }

  const slug = buildTeamTournamentSlugFromParts(title, season);
  const documentId = readString(row.documentId) ?? "";

  return {
    documentId,
    title,
    slug,
    href: `/tournaments/team/${slug}`,
    gameType,
    season,
    startDate: readString(tournament.start_date),
    endDate: readString(tournament.end_date),
    divisionName: readString(row.division_name),
  };
};

/**
 * Τα ομαδικά πρωταθλήματα της ομοσπονδίας.
 * Δέχεται και τους δύο δρόμους σύνδεσης: το πεδίο «federation» του ομαδικού και
 * την ομοσπονδία του συνδεδεμένου τουρνουά (παλιά δεδομένα).
 */
export const fetchFederationTeamTournaments = async (
  federationDocumentId: string,
): Promise<FederationTeamTournamentItem[]> => {
  if (!federationDocumentId) return [];

  const params = new URLSearchParams();
  params.set("pagination[pageSize]", "200");
  params.set("sort[0]", "title:asc");
  params.set("populate[tournament][fields][0]", "start_date");
  params.set("populate[tournament][fields][1]", "end_date");
  params.set("filters[$or][0][federation][documentId][$eq]", federationDocumentId);
  params.set(
    "filters[$or][1][tournament][organizer_federation][documentId][$eq]",
    federationDocumentId,
  );

  const json = await fetchStrapi(`/api/team-tournaments?${params.toString()}`);
  return readRows(json)
    .map(readTeamTournamentRow)
    .filter((item): item is FederationTeamTournamentItem => Boolean(item));
};
