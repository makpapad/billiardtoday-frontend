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

const normalizeStage = (title: unknown, index: number) => {
  const raw = String(title || "").trim();
  if (!raw) return `Stage ${index + 1}`;
  const upper = raw.toUpperCase();
  if (upper.includes("PRE-PRE-PRE") || upper.includes("PPPQ")) return "PPPQ";
  if (upper.includes("PRE-PRE") || upper.includes("PPQ")) return "PPQ";
  if (upper.includes("PRE-QUAL") || upper.includes("PRE QUAL") || upper.includes("PQ")) return "PQ";
  if (upper === "QUAL" || upper === "Q" || upper.includes("QUALIFICATION")) return "Q";
  if (
    upper.includes("FINAL 16") ||
    upper.includes("LAST 16") ||
    upper.includes("RANK 16") ||
    upper.includes("1/8")
  ) {
    return "FINAL 16";
  }
  if (upper.includes("MAIN")) return "MAIN";
  return raw;
};

const eventTitle = (event: any) => String(event?.tournament?.title || event?.title || "Unknown tournament").trim();
const stageOrder: Record<string, number> = { PPPQ: 1, PPQ: 2, PQ: 3, Q: 4, MAIN: 5, "FINAL 16": 6 };

const cleanTournamentTitle = (title: string) =>
  title
    .replace(/\b(?:19|20)\d{2}(?:[-/]\d{2,4})?\b/g, "")
    .replace(/\bseason\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*$/g, "")
    .trim();

const tournamentSeriesName = (event: any) => {
  const title = eventTitle(event);
  const clean = cleanTournamentTitle(title);
  const lower = clean.toLowerCase();

  if (lower.includes("world cup")) {
    const afterComma = clean.split(",").slice(1).join(",").trim();
    const location = (afterComma || clean.replace(/world cup\s*3[- ]?cushion/gi, ""))
      .replace(/\bcity\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (location) return `${location.toUpperCase()} World-Cup`;
    return "World-Cup";
  }

  return clean || title;
};

const tournamentSearchToken = (seriesName: string) => {
  const withoutWorldCup = seriesName.replace(/world-cup/gi, "").trim();
  const firstWords = withoutWorldCup.split(/\s+/).filter(Boolean).slice(0, 3).join(" ");
  return firstWords || seriesName;
};

const formatMetric = (value: number | null, metric: string) => {
  if (typeof value !== "number") return null;
  if (metric === "totalMatches" || metric === "highestRun") return Math.round(value);
  return Number(value.toFixed(3));
};

const fetchEvents = async (params: URLSearchParams, headers: HeadersInit) => {
  const allRows: any[] = [];
  let page = 1;
  const pageSize = Number(params.get("pagination[pageSize]") || 100);

  while (page <= 30) {
    params.set("pagination[page]", String(page));
    const doFetch = (withAuth: boolean) =>
      fetch(`${SERVER_API_URL}/api/bt-events?${params.toString()}`, {
        cache: "no-store",
        headers: withAuth ? headers : {},
      });

    let res = await doFetch(Boolean(STRAPI_API_TOKEN));
    if (!res.ok && STRAPI_API_TOKEN && (res.status === 401 || res.status === 403)) {
      res = await doFetch(false);
    }
    if (!res.ok) throw new Error(`Could not load events (${res.status})`);

    const payload = await res.json().catch(() => ({ data: [], meta: null }));
    const rows = Array.isArray(payload?.data) ? payload.data : [];
    allRows.push(...rows);
    const pagination = payload?.meta?.pagination;
    if (!pagination || page >= Number(pagination.pageCount || 1) || rows.length < pageSize) break;
    page += 1;
  }

  return allRows.map(unwrapEntity);
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const selectedTournament = searchParams.get("tournament") || "";
    const metric = searchParams.get("metric") || "stageAverage";
    const cacheKey = `${metric}:${selectedTournament || "auto"}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.body);
    }
    const headers: HeadersInit = STRAPI_API_TOKEN ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` } : {};

    const metaParams = new URLSearchParams();
    metaParams.set("pagination[pageSize]", "250");
    metaParams.set("sort[0]", "season:asc");
    metaParams.set("fields[0]", "title");
    metaParams.set("fields[1]", "season");
    metaParams.set("fields[2]", "game_type");
    metaParams.set("populate[tournament][fields][0]", "title");
    metaParams.set("populate[tournament][fields][1]", "tournament_type");

    const metaEvents = await fetchEvents(metaParams, headers);
    const tournamentNames = Array.from(new Set<string>(metaEvents.map(tournamentSeriesName)))
      .filter(Boolean)
      .sort();
    const tournament =
      selectedTournament ||
      tournamentNames.find((name) => name.toLowerCase().includes("ho chi minh")) ||
      tournamentNames[0] ||
      "";

    const fullParams = new URLSearchParams(metaParams);
    const token = tournamentSearchToken(tournament);
    fullParams.set("pagination[pageSize]", "120");
    fullParams.set("populate[event_stages][fields][0]", "title");
    fullParams.set("populate[event_stages][fields][1]", "order");
    fullParams.set("populate[event_stages][populate][results][fields][0]", "points");
    fullParams.set("populate[event_stages][populate][results][fields][1]", "innings");
    fullParams.set("populate[event_stages][populate][results][fields][2]", "best_average");
    fullParams.set("populate[event_stages][populate][results][fields][3]", "high_run");
    if (token) {
      fullParams.set("filters[$or][0][title][$containsi]", token);
      fullParams.set("filters[$or][1][tournament][title][$containsi]", token);
    }

    const events = await fetchEvents(fullParams, headers);
    const matchingEvents = events.filter((event: any) => tournamentSeriesName(event) === tournament);

    const years = Array.from(new Set<number>(matchingEvents.map((event: any) => toNumber(event?.season)).filter(Boolean) as number[])).sort((a, b) => a - b);
    const stageMap = new Map<string, Record<number, number | null>>();
    const yearTotals = new Map<number, { totalPoints: number; totalInnings: number; totalMatches: number; highestRun: number; bestAverage: number }>();
    let totalPointsAll = 0;
    let totalInningsAll = 0;
    let totalMatchesAll = 0;
    let highestRunAll = 0;
    let bestAverageAll = 0;

    for (const event of matchingEvents) {
      const year = toNumber(event?.season);
      if (!year) continue;
      if (!yearTotals.has(year)) {
        yearTotals.set(year, { totalPoints: 0, totalInnings: 0, totalMatches: 0, highestRun: 0, bestAverage: 0 });
      }
      const yearSummary = yearTotals.get(year)!;
      const stages = Array.isArray(event?.event_stages) ? event.event_stages.map(unwrapEntity) : [];
      stages
        .sort((a: any, b: any) => toNumber(a?.order) - toNumber(b?.order))
        .forEach((stage: any, index: number) => {
          const stageName = normalizeStage(stage?.title, index);
          const results = Array.isArray(stage?.results) ? stage.results.map(unwrapEntity) : [];
          const totalPoints = results.reduce((sum: number, row: any) => sum + toNumber(row?.points), 0);
          const totalInnings = results.reduce((sum: number, row: any) => sum + toNumber(row?.innings), 0);
          const highestRun = results.reduce((max: number, row: any) => Math.max(max, toNumber(row?.high_run)), 0);
          const bestAverage = results.reduce((max: number, row: any) => Math.max(max, toNumber(row?.best_average)), 0);
          const totalMatches = results.length;
          yearSummary.totalPoints += totalPoints;
          yearSummary.totalInnings += totalInnings;
          yearSummary.totalMatches += totalMatches;
          yearSummary.highestRun = Math.max(yearSummary.highestRun, highestRun);
          yearSummary.bestAverage = Math.max(yearSummary.bestAverage, bestAverage);
          totalPointsAll += totalPoints;
          totalInningsAll += totalInnings;
          totalMatchesAll += totalMatches;
          highestRunAll = Math.max(highestRunAll, highestRun);
          bestAverageAll = Math.max(bestAverageAll, bestAverage);
          const value =
            metric === "highestRun"
              ? highestRun
              : metric === "bestAverage"
                ? bestAverage
                : metric === "totalMatches"
                  ? totalMatches
                  : totalInnings > 0
                    ? Number((totalPoints / totalInnings).toFixed(3))
                    : null;
          if (!stageMap.has(stageName)) stageMap.set(stageName, {});
          stageMap.get(stageName)![year] = value || null;
        });
    }

    const stages = Array.from(stageMap.entries())
      .sort(([a], [b]) => (stageOrder[a] || 99) - (stageOrder[b] || 99) || a.localeCompare(b))
      .map(([name, values]) => ({ name, values }));
    const yearSummaries = Array.from(yearTotals.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, item]) => ({
        year,
        totalMatches: item.totalMatches,
        average: formatMetric(item.totalInnings > 0 ? item.totalPoints / item.totalInnings : null, "stageAverage"),
        bestAverage: formatMetric(item.bestAverage || null, "bestAverage"),
        highestRun: formatMetric(item.highestRun || null, "highestRun"),
      }));
    const bestCell = stages.reduce<{ stage: string; year: number; value: number } | null>((best, stage) => {
      for (const [yearText, value] of Object.entries(stage.values)) {
        if (typeof value !== "number") continue;
        if (!best || value > best.value) best = { stage: stage.name, year: Number(yearText), value };
      }
      return best;
    }, null);

    const body = {
      data: {
        tournament,
        tournaments: tournamentNames,
        metric,
        years,
        stages,
        summary: {
          seasons: years.length,
          events: matchingEvents.length,
          stages: stages.length,
          totalMatches: totalMatchesAll,
          average: formatMetric(totalInningsAll > 0 ? totalPointsAll / totalInningsAll : null, "stageAverage"),
          bestAverage: formatMetric(bestAverageAll || null, "bestAverage"),
          highestRun: formatMetric(highestRunAll || null, "highestRun"),
          bestCell,
        },
        yearSummaries,
      },
    };
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, body });
    return NextResponse.json(body);
  } catch (error) {
    console.error("[api.stats.tournament-comparison]", error);
    return NextResponse.json({ error: "Could not load tournament comparison" }, { status: 500 });
  }
}
