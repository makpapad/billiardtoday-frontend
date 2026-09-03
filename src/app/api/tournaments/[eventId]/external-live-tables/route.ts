import { NextRequest, NextResponse } from "next/server";
import type { LiveSessionItem } from "@/components/live/types";
import { SERVER_API_URL } from "@/lib/api";
import { getExternalLiveTablesCompetitionIdx } from "@/lib/externalLiveTables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

type CacheEntry = {
  expiresAt: number;
  payload: {
    data: LiveSessionItem[];
    sourceUrl: string;
    updatedAt: string;
  };
};

const CACHE_TTL_MS = 8000;
const cache = new Map<string, CacheEntry>();

// --- Country enrichment -------------------------------------------------
// Cuesco player photos are served from /players/<cuescoId>/<hash>.png. We map
// cuescoId -> local player (via the event's externalResultSync.playerMap) and
// fetch the player's country from Strapi, so the live cards show flags like
// our own scoreboard sessions do.

const CUESCO_PLAYER_ID_RE = /\/players\/(\d+)\//i;
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;
const CONFIG_CACHE_TTL_MS = 60_000;

type StrapiPlayerMap = Record<string, string>;

const extractCuescoPlayerId = (
  photoUrl: string | null | undefined,
): string | null => {
  const match = String(photoUrl || "").match(CUESCO_PLAYER_ID_RE);
  return match?.[1] ?? null;
};

const strapiFetch = async (path: string): Promise<unknown | null> => {
  try {
    const response = await fetch(`${SERVER_API_URL}${path}`, {
      cache: "no-store",
      headers: STRAPI_TOKEN
        ? { Authorization: `Bearer ${STRAPI_TOKEN}` }
        : {},
    });
    if (!response.ok) return null;
    return await response.json().catch(() => null);
  } catch {
    return null;
  }
};

let playerMapCache: { expiresAt: number; map: StrapiPlayerMap } | null = null;

const fetchPlayerMap = async (eventId: string): Promise<StrapiPlayerMap> => {
  if (playerMapCache && playerMapCache.expiresAt > Date.now()) {
    return playerMapCache.map;
  }
  const json = await strapiFetch(`/api/bt-events/${encodeURIComponent(eventId)}`);
  const data = (json as { data?: Record<string, unknown> } | null)?.data;
  const timetableConfig = data?.timetable_config as
    | Record<string, unknown>
    | undefined;
  const externalResultSync = timetableConfig?.externalResultSync as
    | Record<string, unknown>
    | undefined;
  const playerMap =
    externalResultSync?.playerMap && typeof externalResultSync.playerMap === "object"
      ? (externalResultSync.playerMap as StrapiPlayerMap)
      : {};
  playerMapCache = { expiresAt: Date.now() + CONFIG_CACHE_TTL_MS, map: playerMap };
  return playerMap;
};

const countryByDocId = new Map<string, string | null>();

const fetchPlayerCountries = async (docIds: string[]): Promise<void> => {
  const missing = docIds.filter((id) => !countryByDocId.has(id));
  if (missing.length === 0) return;

  const params = new URLSearchParams();
  missing.forEach((id, index) => {
    params.set(`filters[documentId][$in][${index}]`, id);
  });
  params.set("fields[0]", "country");
  params.set("fields[1]", "documentId");
  params.set("pagination[pageSize]", "100");

  const json = await strapiFetch(`/api/bt-players?${params.toString()}`);
  const items = Array.isArray((json as { data?: unknown[] } | null)?.data)
    ? ((json as { data: unknown[] }).data)
    : [];
  const found = new Set<string>();
  for (const raw of items) {
    const entry = raw as {
      documentId?: string;
      country?: string | null;
    };
    if (entry.documentId) {
      found.add(entry.documentId);
      countryByDocId.set(entry.documentId, entry.country ?? null);
    }
  }
  for (const id of missing) {
    if (!found.has(id)) countryByDocId.set(id, null);
  }
};

const enrichWithCountries = async (
  items: LiveSessionItem[],
  eventId: string,
): Promise<LiveSessionItem[]> => {
  const playerMap = await fetchPlayerMap(eventId);
  if (Object.keys(playerMap).length === 0) return items;

  const wantsCountry: Array<{ docId: string; item: LiveSessionItem; side: "A" | "B" }> = [];
  for (const item of items) {
    const cuescoA = extractCuescoPlayerId(item.state.playerAPhotoUrl);
    const cuescoB = extractCuescoPlayerId(item.state.playerBPhotoUrl);
    const docA = cuescoA ? (playerMap[cuescoA] ?? null) : null;
    const docB = cuescoB ? (playerMap[cuescoB] ?? null) : null;
    if (docA) wantsCountry.push({ docId: docA, item, side: "A" });
    if (docB) wantsCountry.push({ docId: docB, item, side: "B" });
  }

  const docIds = Array.from(new Set(wantsCountry.map((entry) => entry.docId)));
  await fetchPlayerCountries(docIds);

  for (const entry of wantsCountry) {
    const country = countryByDocId.get(entry.docId) ?? null;
    if (!country) continue;
    if (entry.side === "A") {
      entry.item.state = { ...entry.item.state, playerACountry: country };
    } else {
      entry.item.state = { ...entry.item.state, playerBCountry: country };
    }
  }
  return items;
};

const decodeHtml = (value: string) =>
  value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');

const stripTags = (value: string) =>
  decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());

const absolutizeUrl = (value: string | null) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("/")) return `http://umbeu.cueuny.com${trimmed}`;
  return `http://umbeu.cueuny.com/${trimmed}`;
};

const normalizeSoopEmbedUrl = (value: string | null) => {
  const absolute = absolutizeUrl(value);
  if (!absolute) return null;
  try {
    const url = new URL(absolute);
    if (!/(^|\.)sooplive\.(com|co\.kr)$/i.test(url.hostname)) return absolute;
    const parts = url.pathname.split("/").filter(Boolean);
    const channel = parts[0];
    if (!channel) return absolute;
    if (parts[parts.length - 1] === "embed") {
      url.hostname = "play.sooplive.com";
      url.protocol = "https:";
      return url.toString();
    }
    return `https://play.sooplive.com/${encodeURIComponent(channel)}/embed`;
  } catch {
    return absolute;
  }
};

const firstMatch = (input: string, pattern: RegExp) => {
  const match = input.match(pattern);
  return match?.[1] ? stripTags(match[1]) : "";
};

const parseNumber = (value: string | undefined | null) => {
  const parsed = Number(String(value ?? "").replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseFiveSixLiveTables = (
  html: string,
  eventId: string,
  competitionIdx: string,
): LiveSessionItem[] => {
  const panelMatches = html.match(/<div class="panel_box top_info">[\s\S]*?(?=<div class="panel_box top_info">|<\/body>)/g) || [];
  const updatedAt = new Date().toISOString();

  return panelMatches
    .map((panel, index): LiveSessionItem | null => {
      const tableLabel = firstMatch(panel, /<span class="tb_tit"><b>(.*?)<\/b><\/span>/i);
      const rawStageGroup = firstMatch(panel, /<span class="tb_tit"><b>.*?<\/b><\/span>\s*<span class="tb_tit">(.*?)<\/span>/is);
      const time = firstMatch(panel, /<p class="right">(.*?)<\/p>/i);
      const names = Array.from(panel.matchAll(/<div class="name">\s*<p>(.*?)<\/p>\s*<\/div>/gis)).map((match) =>
        stripTags(match[1] || ""),
      );
      const stats = Array.from(panel.matchAll(/Avg\.\s*([0-9.]+).*?HR\.\s*([0-9]+)/gis)).map((match) => ({
        avg: match[1] || "",
        hr: parseNumber(match[2]),
      }));
      const images = Array.from(panel.matchAll(/<div class="player_thumbnail">\s*<img src="([^"]*)"/gis)).map((match) =>
        absolutizeUrl(match[1] || null),
      );
      const score = panel.match(/<div class="count">\s*([0-9]+)\s*<span>\s*:\s*<\/span>\s*([0-9]+)\s*<\/div>/i);
      const innings = panel.match(/<p>\s*INN\s*([0-9]+)\s*<\/p>/i);
      const videoUrl = panel.match(/<a href="([^"]+)"[^>]*class="btn_normal btn_o"/i)?.[1] || null;
      const embedUrl = normalizeSoopEmbedUrl(videoUrl);

      const playerAName = names[0] || "Player A";
      const playerBName = names[1] || "Player B";
      const scoreA = parseNumber(score?.[1]);
      const scoreB = parseNumber(score?.[2]);
      const tableNumber = tableLabel.replace(/^Table\s*/i, "").trim() || String(index + 1);
      const [stageNameRaw, groupNameRaw] = rawStageGroup.split(/\s*-\s*/);
      const stageName = stageNameRaw?.trim() || rawStageGroup || null;
      const groupName = groupNameRaw?.trim() || null;
      const sessionId = `five-six-${competitionIdx}-table-${tableNumber || index + 1}`;

      if (!playerAName && !playerBName && !score) return null;

      return {
        id: sessionId,
        sessionId,
        screenId: tableLabel || `Table ${index + 1}`,
        liveVideos: embedUrl
          ? [
              {
                id: `five-six-${competitionIdx}-table-${tableNumber || index + 1}-video`,
                provider: "embed",
                videoId: embedUrl,
                url: embedUrl,
                title: tableLabel || `Table ${index + 1}`,
                label: tableLabel || `Table ${index + 1}`,
                youtubeUrl: null,
                isPrimary: true,
                sortOrder: 0,
              },
            ]
          : undefined,
        updatedAt,
        clubName: "Five&Six",
        state: {
          tournamentName: null,
          stageName,
          groupName,
          tableName: tableNumber,
          playerAName,
          playerBName,
          playerAPhotoUrl: images[0] ?? null,
          playerBPhotoUrl: images[1] ?? null,
          scoreA,
          scoreB,
          inningsA: parseNumber(innings?.[1]),
          inningsB: parseNumber(innings?.[1]),
          inningsCount: parseNumber(innings?.[1]),
          bestRunA: stats[0]?.hr ?? 0,
          bestRunB: stats[1]?.hr ?? 0,
          avgFormattedA: stats[0]?.avg || undefined,
          avgFormattedB: stats[1]?.avg || undefined,
          isRunning: true,
        },
      };
    })
    .filter((item): item is LiveSessionItem => Boolean(item));
};

export async function GET(req: NextRequest, context: RouteContext) {
  const { eventId } = await context.params;
  const searchParams = req.nextUrl.searchParams;
  const competitionIdx =
    searchParams.get("competitionIdx")?.trim() ||
    getExternalLiveTablesCompetitionIdx(eventId) ||
    "";

  if (!competitionIdx) {
    return NextResponse.json({ data: [], configured: false }, { status: 200 });
  }

  const sourceUrl = `http://umbeu.cueuny.com/tournament/live/webtables/${encodeURIComponent(competitionIdx)}`;
  const cacheKey = `${eventId}:${competitionIdx}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ ...cached.payload, cached: true }, { status: 200 });
  }

  try {
    const response = await fetch(sourceUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "BilliardToday live tables preview",
      },
    });
    if (!response.ok) {
      return NextResponse.json(
        { data: [], error: `Five&Six returned ${response.status}` },
        { status: 200 },
      );
    }

    const html = await response.text();
    const parsed = parseFiveSixLiveTables(html, eventId, competitionIdx);
    const data = await enrichWithCountries(parsed, eventId);
    const payload = {
      data,
      sourceUrl,
      updatedAt: new Date().toISOString(),
    };
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
    return NextResponse.json({ ...payload, cached: false }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        data: [],
        error: error instanceof Error ? error.message : "Failed to load Five&Six live tables",
      },
      { status: 200 },
    );
  }
}
