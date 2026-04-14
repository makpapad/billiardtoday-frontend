import { buildTournamentHref } from "@/lib/tournaments";
import { resolveTournamentEventSummary } from "@/lib/tournaments";
import {
  getRankingSeriesConfigBySlug,
  type RankingSeriesConfig,
} from "@/lib/rankings-config";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const PRIMARY_STRAPI_URL =
  process.env.STRAPI_API_URL ||
  (IS_PRODUCTION ? "http://127.0.0.1:1337" : process.env.NEXT_PUBLIC_STRAPI_URL) ||
  "https://app.billiardtoday.com";
const FALLBACK_STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || (IS_PRODUCTION ? "https://app.billiardtoday.com" : undefined);
const STRAPI_URLS = Array.from(
  new Set([PRIMARY_STRAPI_URL, FALLBACK_STRAPI_URL].filter(Boolean)),
) as string[];
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const IS_DEVELOPMENT = !IS_PRODUCTION;

type StrapiEventResponse = {
  data?: unknown;
};

type RankingSeriesTournamentMeta = {
  key: string;
  label: string;
  title: string;
  slug: string;
  href: string | null;
  season: number | null;
  startDate: string | null;
  endDate: string | null;
  hasFinalResults: boolean;
  hasRankingPoints: boolean;
};

export type RankingSeriesLeaderboardRow = {
  rank: number;
  playerName: string;
  playerCountry: string | null;
  playerDocumentId: string | null;
  pointsByTournament: Record<string, number>;
  totalPoints: number;
  caroms: number;
  innings: number;
  genAvg: number;
  positionsByTournament: Record<string, number | null>;
};

export type RankingSeriesData = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  federationSlug: string;
  tournaments: RankingSeriesTournamentMeta[];
  leaderboard: RankingSeriesLeaderboardRow[];
};

type AggregatedPlayer = {
  key: string;
  playerName: string;
  playerCountry: string | null;
  playerDocumentId: string | null;
  pointsByTournament: Record<string, number>;
  totalPoints: number;
  caroms: number;
  innings: number;
  positionsByTournament: Record<string, number | null>;
};

const buildHeaders = (): HeadersInit => {
  if (!STRAPI_API_TOKEN) return {};
  return {
    Authorization: `Bearer ${STRAPI_API_TOKEN}`,
  };
};

const fetchWithOptionalAuth = async (path: string) => {
  const runtimeOptions =
    IS_DEVELOPMENT ? { cache: "no-store" as const } : { next: { revalidate: 60 } };

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

const readString = (value: unknown): string | null => {
  const clean = String(value ?? "").trim();
  return clean.length > 0 ? clean : null;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const unwrapEntity = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const attributes =
    typeof record.attributes === "object" && record.attributes !== null
      ? (record.attributes as Record<string, unknown>)
      : {};

  return {
    ...attributes,
    ...record,
  };
};

const toRelationArray = (value: unknown): unknown[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object" && value !== null && "data" in (value as Record<string, unknown>)) {
    const data = (value as { data?: unknown[] | unknown | null }).data;
    if (!data) return [];
    return Array.isArray(data) ? data : [data];
  }
  return [value];
};

const truncateToThree = (value: number): number => Math.trunc(value * 1000) / 1000;

const buildPlayerKey = (
  playerDocumentId: string | null,
  playerName: string | null,
  fallback: string,
) => {
  if (playerDocumentId) return `player:${playerDocumentId}`;
  if (playerName) return `name:${playerName.toLowerCase()}`;
  return `fallback:${fallback}`;
};

const fetchTournamentForSeries = async (
  tournamentSlug?: string,
): Promise<{
  title: string;
  slug: string;
  documentId: string;
  season: number | null;
  startDate: string | null;
  endDate: string | null;
  results: Array<{
    position: number | null;
    rankingPoints: number | null;
    caroms: number | null;
    innings: number | null;
    playerName: string;
    playerCountry: string | null;
    playerDocumentId: string | null;
  }>;
} | null> => {
  if (!tournamentSlug) return null;
  const summary = await resolveTournamentEventSummary(tournamentSlug);
  if (!summary?.documentId) return null;

  const params = new URLSearchParams();
  params.set("fields[0]", "title");
  params.set("fields[1]", "season");
  params.set("fields[2]", "start_date");
  params.set("fields[3]", "end_date");
  params.set("fields[4]", "documentId");
  params.set("populate[results_final][sort][0]", "position:asc");
  params.set("populate[results_final][fields][0]", "position");
  params.set("populate[results_final][fields][1]", "ranking_points");
  params.set("populate[results_final][fields][2]", "caroms");
  params.set("populate[results_final][fields][3]", "innings");
  params.set("populate[results_final][populate][player][fields][0]", "full_name");
  params.set("populate[results_final][populate][player][fields][1]", "full_name_en");
  params.set("populate[results_final][populate][player][fields][2]", "country");
  params.set("populate[results_final][populate][player][fields][3]", "documentId");

  const response = await fetchWithOptionalAuth(
    `/api/bt-events/${encodeURIComponent(summary.documentId)}?${params.toString()}`,
  );
  if (!response?.ok) return null;

  const payload = (await response.json().catch(() => null)) as StrapiEventResponse | null;
  const entity = unwrapEntity(payload?.data ?? null);
  if (!entity) return null;

  const results = toRelationArray(entity.results_final)
    .map((row, index) => {
      const result = unwrapEntity(row);
      if (!result) return null;
      const player = unwrapEntity(result.player);
      const playerName =
        readString(player?.full_name_en) ||
        readString(player?.full_name) ||
        `Unknown ${index + 1}`;

      return {
        position: toNumber(result.position),
        rankingPoints: toNumber(result.ranking_points),
        caroms: toNumber(result.caroms),
        innings: toNumber(result.innings),
        playerName,
        playerCountry: readString(player?.country),
        playerDocumentId: readString(player?.documentId),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    title: readString(entity.title) || summary.title || tournamentSlug,
    slug: tournamentSlug,
    documentId: readString(entity.documentId) || summary.documentId,
    season: toNumber(entity.season) ?? summary.season,
    startDate: readString(entity.start_date) || summary.startDate,
    endDate: readString(entity.end_date) || summary.endDate,
    results,
  };
};

const compareLeaderboardRows = (
  left: RankingSeriesLeaderboardRow,
  right: RankingSeriesLeaderboardRow,
  tournamentOrder: string[],
) => {
  if (left.totalPoints !== right.totalPoints) {
    return right.totalPoints - left.totalPoints;
  }

  if (left.genAvg !== right.genAvg) {
    return right.genAvg - left.genAvg;
  }

  for (let index = tournamentOrder.length - 1; index >= 0; index -= 1) {
    const key = tournamentOrder[index];
    const leftPos = left.positionsByTournament[key];
    const rightPos = right.positionsByTournament[key];
    if (leftPos !== null && rightPos !== null && leftPos !== rightPos) {
      return leftPos - rightPos;
    }
    if (leftPos !== null && rightPos === null) return -1;
    if (leftPos === null && rightPos !== null) return 1;
  }

  return left.playerName.localeCompare(right.playerName, "en");
};

const buildSeriesData = async (
  config: RankingSeriesConfig,
): Promise<RankingSeriesData> => {
  const tournamentRows = await Promise.all(
    config.tournaments.map(async (tournament) => {
      const data = await fetchTournamentForSeries(tournament.tournamentSlug);
      return {
        config: tournament,
        data,
      };
    }),
  );

  const aggregated = new Map<string, AggregatedPlayer>();

  tournamentRows.forEach(({ config: tournamentConfig, data: tournamentData }) => {
    if (!tournamentData) return;

    tournamentData.results.forEach((result, index) => {
      const playerKey = buildPlayerKey(
        result.playerDocumentId,
        result.playerName,
        `${tournamentConfig.key}-${index + 1}`,
      );
      const existing = aggregated.get(playerKey) ?? {
        key: playerKey,
        playerName: result.playerName,
        playerCountry: result.playerCountry,
        playerDocumentId: result.playerDocumentId,
        pointsByTournament: {},
        totalPoints: 0,
        caroms: 0,
        innings: 0,
        positionsByTournament: {},
      };

      existing.playerName = existing.playerName || result.playerName;
      existing.playerCountry = existing.playerCountry ?? result.playerCountry;
      existing.playerDocumentId = existing.playerDocumentId ?? result.playerDocumentId;
      existing.pointsByTournament[tournamentConfig.key] = result.rankingPoints ?? 0;
      existing.positionsByTournament[tournamentConfig.key] = result.position;
      existing.totalPoints += result.rankingPoints ?? 0;
      existing.caroms += result.caroms ?? 0;
      existing.innings += result.innings ?? 0;

      aggregated.set(playerKey, existing);
    });
  });

  const leaderboard = Array.from(aggregated.values())
    .map<RankingSeriesLeaderboardRow>((entry) => ({
      rank: 0,
      playerName: entry.playerName,
      playerCountry: entry.playerCountry,
      playerDocumentId: entry.playerDocumentId,
      pointsByTournament: config.tournaments.reduce<Record<string, number>>((acc, tournament) => {
        acc[tournament.key] = entry.pointsByTournament[tournament.key] ?? 0;
        return acc;
      }, {}),
      totalPoints: entry.totalPoints,
      caroms: entry.caroms,
      innings: entry.innings,
      genAvg:
        entry.innings > 0 ? truncateToThree(entry.caroms / entry.innings) : 0,
      positionsByTournament: config.tournaments.reduce<Record<string, number | null>>((acc, tournament) => {
        acc[tournament.key] = entry.positionsByTournament[tournament.key] ?? null;
        return acc;
      }, {}),
    }))
    .sort((left, right) =>
      compareLeaderboardRows(
        left,
        right,
        config.tournaments.map((tournament) => tournament.key),
      ),
    )
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

  return {
    slug: config.slug,
    title: config.title,
    shortTitle: config.shortTitle,
    description: config.description,
    federationSlug: config.federationSlug,
    tournaments: config.tournaments.map((tournament) => {
      const data = tournamentRows.find((row) => row.config.key === tournament.key)?.data;
      const season = data?.season ?? null;
      return {
        key: tournament.key,
        label: tournament.label,
        title: data?.title ?? tournament.fallbackTitle ?? tournament.tournamentSlug ?? tournament.label,
        slug: data?.slug ?? tournament.tournamentSlug ?? tournament.key,
        href:
          data?.documentId && data?.title
            ? buildTournamentHref(data.documentId, data.title, season)
            : null,
        season,
        startDate: data?.startDate ?? null,
        endDate: data?.endDate ?? null,
        hasFinalResults: Boolean(data?.results.length),
        hasRankingPoints: Boolean(
          data?.results.some((result) => result.rankingPoints !== null),
        ),
      };
    }),
    leaderboard,
  };
};

export const getRankingSeriesData = async (
  slug: string,
): Promise<RankingSeriesData | null> => {
  const config = getRankingSeriesConfigBySlug(slug);
  if (!config) return null;
  return buildSeriesData(config);
};
