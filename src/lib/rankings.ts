import { buildTournamentHref } from "@/lib/tournaments";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const PRIMARY_STRAPI_URL =
  process.env.STRAPI_API_URL ||
  (IS_PRODUCTION ? "http://127.0.0.1:1337" : process.env.NEXT_PUBLIC_STRAPI_URL) ||
  "https://app.billiardtoday.com";
const FALLBACK_STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || (IS_PRODUCTION ? "https://app.billiardtoday.com" : undefined);
const STRAPI_URLS = Array.from(new Set([PRIMARY_STRAPI_URL, FALLBACK_STRAPI_URL].filter(Boolean))) as string[];
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const IS_DEVELOPMENT = !IS_PRODUCTION;

type RankingSeriesIndexResponse = {
  data?: RankingSeriesIndexItem[];
};

type RankingSeriesDetailResponse = {
  data?: RankingSeriesData;
};

export type RankingSeriesIndexItem = {
  id: number | null;
  documentId: string | null;
  title: string;
  slug: string;
  season: string;
  description: string;
  federationSlug: string | null;
  federationName: string | null;
  tournamentsCount: number;
  linkedEventsCount: number;
};

export type RankingSeriesTournamentMeta = {
  key: string;
  label: string;
  order: number;
  tournamentId: number | null;
  tournamentDocumentId: string | null;
  tournamentTitle: string | null;
  tournamentSlug: string | null;
  btEventDocumentId: string | null;
  btEventTitle: string | null;
  season: number | null;
  startDate: string | null;
  endDate: string | null;
  federationSlug: string | null;
  federationName: string | null;
  hasFinalResults: boolean;
  hasRankingPoints: boolean;
  href: string | null;
  title: string;
};

export type RankingSeriesLeaderboardRow = {
  rank: number;
  playerName: string;
  playerCountry: string | null;
  playerDocumentId: string | null;
  pointsByTournament: Record<string, number>;
  positionsByTournament: Record<string, number | null>;
  totalPoints: number;
  caroms: number;
  innings: number;
  genAvg: number;
};

export type RankingSeriesData = {
  id: number | null;
  documentId: string | null;
  title: string;
  slug: string;
  season: string;
  description: string;
  federationSlug: string | null;
  federationName: string | null;
  tournaments: RankingSeriesTournamentMeta[];
  leaderboard: RankingSeriesLeaderboardRow[];
};

const buildHeaders = (): HeadersInit => {
  if (!STRAPI_API_TOKEN) return {};
  return {
    Authorization: `Bearer ${STRAPI_API_TOKEN}`,
  };
};

const fetchWithOptionalAuth = async (path: string) => {
  const runtimeOptions = IS_DEVELOPMENT ? { cache: "no-store" as const } : { next: { revalidate: 60 } };

  for (const baseUrl of STRAPI_URLS) {
    const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const response = await fetch(url, {
      ...runtimeOptions,
      headers: buildHeaders(),
    }).catch(() => null);

    if (response?.ok) {
      return response;
    }

    if (response) {
      return response;
    }
  }

  return null;
};

const toStringOrNull = (value: unknown) => {
  const clean = String(value ?? "").trim();
  return clean.length > 0 ? clean : null;
};

const normalizeTournamentMeta = (tournament: Omit<RankingSeriesTournamentMeta, "href" | "title">): RankingSeriesTournamentMeta => {
  const title =
    toStringOrNull(tournament.btEventTitle) ||
    toStringOrNull(tournament.tournamentTitle) ||
    tournament.label;
  return {
    ...tournament,
    title,
    href:
      tournament.btEventDocumentId && title
        ? buildTournamentHref(tournament.btEventDocumentId, title, tournament.season)
        : null,
  };
};

export const fetchRankingSeriesIndex = async (): Promise<RankingSeriesIndexItem[]> => {
  const response = await fetchWithOptionalAuth("/api/ranking-series/index");
  if (!response?.ok) return [];

  const payload = (await response.json().catch(() => null)) as RankingSeriesIndexResponse | null;
  const data = Array.isArray(payload?.data) ? payload.data : [];

  return data.filter(
    (item): item is RankingSeriesIndexItem =>
      Boolean(item && typeof item.slug === "string" && item.slug.trim().length > 0),
  );
};

export const getRankingSeriesData = async (slug: string): Promise<RankingSeriesData | null> => {
  const cleanSlug = String(slug || "").trim();
  if (!cleanSlug) return null;

  const response = await fetchWithOptionalAuth(
    `/api/ranking-series/by-slug/${encodeURIComponent(cleanSlug)}/standings`,
  );
  if (!response?.ok) return null;

  const payload = (await response.json().catch(() => null)) as RankingSeriesDetailResponse | null;
  if (!payload?.data) return null;

  return {
    ...payload.data,
    tournaments: Array.isArray(payload.data.tournaments)
      ? payload.data.tournaments.map((tournament) => normalizeTournamentMeta(tournament))
      : [],
    leaderboard: Array.isArray(payload.data.leaderboard) ? payload.data.leaderboard : [],
  };
};
