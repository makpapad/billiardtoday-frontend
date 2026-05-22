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
  if (upper.includes("FINAL 16")) return "FINAL 16";
  if (upper.includes("MAIN")) return "MAIN";
  if (upper === "Q" || upper.includes("QUALIFICATION")) return "Q";
  if (upper.includes("PPPQ")) return "PPPQ";
  if (upper.includes("PPQ")) return "PPQ";
  if (upper.includes("PQ")) return "PQ";
  return raw;
};

const eventTitle = (event: any) => String(event?.tournament?.title || event?.title || "Unknown tournament").trim();

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

    const params = new URLSearchParams();
    params.set("pagination[page]", "1");
    params.set("pagination[pageSize]", selectedTournament ? "80" : "160");
    params.set("sort[0]", "season:asc");
    params.set("fields[0]", "title");
    params.set("fields[1]", "season");
    params.set("fields[2]", "game_type");
    params.set("populate[tournament][fields][0]", "title");
    params.set("populate[tournament][fields][1]", "tournament_type");
    params.set("populate[event_stages][fields][0]", "title");
    params.set("populate[event_stages][fields][1]", "order");
    params.set("populate[event_stages][populate][results][fields][0]", "points");
    params.set("populate[event_stages][populate][results][fields][1]", "innings");
    params.set("populate[event_stages][populate][results][fields][2]", "best_average");
    params.set("populate[event_stages][populate][results][fields][3]", "high_run");
    if (selectedTournament) {
      params.set("filters[$or][0][title][$containsi]", selectedTournament);
      params.set("filters[$or][1][tournament][title][$containsi]", selectedTournament);
    }

    const doFetch = (withAuth: boolean) =>
      fetch(`${SERVER_API_URL}/api/bt-events?${params.toString()}`, {
        cache: "no-store",
        headers: withAuth ? headers : {},
      });

    let res = await doFetch(Boolean(STRAPI_API_TOKEN));
    if (!res.ok && STRAPI_API_TOKEN && (res.status === 401 || res.status === 403)) {
      res = await doFetch(false);
    }
    if (!res.ok) {
      return NextResponse.json({ data: null, error: "Could not load events" }, { status: res.status });
    }

    const payload = await res.json().catch(() => ({ data: [] }));
    const events: any[] = (Array.isArray(payload?.data) ? payload.data : []).map(unwrapEntity);
    const tournamentNames = Array.from(new Set<string>(events.map((event: any) => eventTitle(event)))).sort();
    const tournament = selectedTournament || tournamentNames.find((name) => name.toLowerCase().includes("ho chi minh")) || tournamentNames[0] || "";
    const matchingEvents = events.filter((event: any) => eventTitle(event) === tournament);

    const years = Array.from(new Set<number>(matchingEvents.map((event: any) => toNumber(event?.season)).filter(Boolean) as number[])).sort((a, b) => a - b);
    const stageMap = new Map<string, Record<number, number | null>>();

    for (const event of matchingEvents) {
      const year = toNumber(event?.season);
      if (!year) continue;
      const stages = Array.isArray(event?.event_stages) ? event.event_stages.map(unwrapEntity) : [];
      stages
        .sort((a: any, b: any) => toNumber(a?.order) - toNumber(b?.order))
        .forEach((stage: any, index: number) => {
          const stageName = normalizeStage(stage?.title, index);
          const results = Array.isArray(stage?.results) ? stage.results.map(unwrapEntity) : [];
          const totalPoints = results.reduce((sum: number, row: any) => sum + toNumber(row?.points), 0);
          const totalInnings = results.reduce((sum: number, row: any) => sum + toNumber(row?.innings), 0);
          const value =
            metric === "highestRun"
              ? results.reduce((max: number, row: any) => Math.max(max, toNumber(row?.high_run)), 0)
              : metric === "bestAverage"
                ? results.reduce((max: number, row: any) => Math.max(max, toNumber(row?.best_average)), 0)
                : metric === "totalMatches"
                  ? results.length
                  : totalInnings > 0
                    ? Number((totalPoints / totalInnings).toFixed(3))
                    : null;
          if (!stageMap.has(stageName)) stageMap.set(stageName, {});
          stageMap.get(stageName)![year] = value || null;
        });
    }

    const stages = Array.from(stageMap.entries()).map(([name, values]) => ({ name, values }));

    const body = {
      data: {
        tournament,
        tournaments: tournamentNames,
        metric,
        years,
        stages,
      },
    };
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, body });
    return NextResponse.json(body);
  } catch (error) {
    console.error("[api.stats.tournament-comparison]", error);
    return NextResponse.json({ error: "Could not load tournament comparison" }, { status: 500 });
  }
}
