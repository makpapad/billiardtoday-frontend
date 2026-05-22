import { NextResponse } from "next/server";
import { SERVER_API_URL } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; body: unknown }>();

const unwrapEntity = (value: any) =>
  value?.attributes && typeof value.attributes === "object" ? { ...value.attributes, ...value } : value;

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readString = (value: unknown) => {
  const clean = String(value || "").trim();
  return clean || null;
};

const gameTypeMatches = (candidate: string, requested: string) => {
  if (requested === "All") return true;
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return normalize(candidate) === normalize(requested);
};

const metricValue = (stats: any, metric: string) => {
  if (!stats || typeof stats !== "object") return null;
  if (metric === "highRun") return toNumber(stats.highestRun);
  if (metric === "average") return toNumber(stats.avgPerInning);
  if (metric === "bestAverage") return toNumber(stats.bestAverage ?? stats.bestAverageFromWins);
  if (metric === "wins") return toNumber(stats.totalWins);
  if (metric === "losses") return toNumber(stats.totalLosses);
  if (metric === "winPercentage") return toNumber(stats.winPercentage);
  if (metric === "participations") return toNumber(stats.totalMatches);
  return toNumber(stats.highestRun);
};

const pickStats = (careerStats: any, year: string, gameType: string) => {
  if (!careerStats || typeof careerStats !== "object") return null;

  if (year !== "All") {
    const yearBucket = careerStats.byYear?.[year];
    if (!yearBucket) return null;
    if (gameType === "All") return yearBucket.overall ?? null;
    const entry = Object.entries(yearBucket.byGameType || {}).find(([key]) => gameTypeMatches(key, gameType));
    return entry?.[1] ?? null;
  }

  if (gameType !== "All") {
    const entry = Object.entries(careerStats.byGameType || {}).find(([key]) => gameTypeMatches(key, gameType));
    return entry?.[1] ?? null;
  }

  return careerStats.overall ?? null;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const metric = searchParams.get("metric") || "highRun";
    const year = searchParams.get("year") || "All";
    const gameType = searchParams.get("gameType") || "All";
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 10)));
    if (!gameType || gameType === "All") {
      return NextResponse.json({ data: [], message: "Select a game type first" });
    }
    const cacheKey = `${metric}:${year}:${gameType}:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.body);
    }

    const headers: HeadersInit = STRAPI_API_TOKEN ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` } : {};
    const allRows: any[] = [];
    let page = 1;
    const pageSize = 300;

    while (page <= 8) {
      const params = new URLSearchParams();
      params.set("pagination[page]", String(page));
      params.set("pagination[pageSize]", String(pageSize));
      params.set("fields[0]", "full_name");
      params.set("fields[1]", "full_name_en");
      params.set("fields[2]", "country");
      params.set("fields[3]", "documentId");
      params.set("fields[4]", "career_stats");
      params.set("filters[career_stats][$notNull]", "true");

      const doFetch = (withAuth: boolean) =>
        fetch(`${SERVER_API_URL}/api/bt-players?${params.toString()}`, {
          cache: "no-store",
          headers: withAuth ? headers : {},
        });

      let res = await doFetch(Boolean(STRAPI_API_TOKEN));
      if (!res.ok && STRAPI_API_TOKEN && (res.status === 401 || res.status === 403)) {
        res = await doFetch(false);
      }
      if (!res.ok) break;

      const payload = await res.json().catch(() => ({ data: [], meta: null }));
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      allRows.push(...rows);
      const pagination = payload?.meta?.pagination;
      if (!pagination || page >= Number(pagination.pageCount || 1) || rows.length < pageSize) break;
      page += 1;
    }

    const data = allRows
      .map((row) => {
        const entity = unwrapEntity(row);
        const stats = pickStats(entity?.career_stats, year, gameType);
        const value = metricValue(stats, metric);
          if (!value || value <= 0) return null;
          if ((metric === "average" || metric === "bestAverage") && value > 5) return null;
          if (metric === "highRun" && value > 80 && gameType !== "All") return null;
        return {
          player: readString(entity?.full_name_en) || readString(entity?.full_name) || "Unknown player",
          documentId: readString(entity?.documentId),
          country: readString(entity?.country) || "-",
          metricValue: value,
          metricText: metric === "average" || metric === "bestAverage" ? value.toFixed(3) : metric === "winPercentage" ? `${value.toFixed(1)}%` : String(Math.round(value)),
          year,
          gameType,
          matches: toNumber(stats?.totalMatches),
          wins: toNumber(stats?.totalWins),
          losses: toNumber(stats?.totalLosses),
          average: toNumber(stats?.avgPerInning),
          highRun: toNumber(stats?.highestRun),
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.metricValue - a.metricValue)
      .slice(0, limit)
      .map((row: any, index: number) => ({ rank: index + 1, ...row }));

    const body = { data };
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, body });
    return NextResponse.json(body);
  } catch (error) {
    console.error("[api.stats.player-rankings]", error);
    return NextResponse.json({ error: "Could not load player rankings" }, { status: 500 });
  }
}
