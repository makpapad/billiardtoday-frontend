import { NextRequest, NextResponse } from "next/server";
import type { LiveSessionItem } from "@/components/live/types";
import { SERVER_API_URL } from "@/lib/api";
import { getExternalLiveTablesCompetitionIdx } from "@/lib/externalLiveTables";
import {
  fetchKozoomStreams,
  getKozoomLiveContexts,
  kozoomTableNumber,
  lookupKozoomEvents,
  parseKozoomLiveMatch,
  type KozoomLiveMatch,
  type KozoomStream,
} from "@/lib/kozoomLive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

type LiveTablesPayload = {
  data: LiveSessionItem[];
  sourceUrl: string;
  updatedAt: string;
  error?: string;
  kozoomEventId?: number | null;
  kozoomEventName?: string | null;
  kozoomTableCount?: number;
};

type CacheEntry = {
  expiresAt: number;
  payload: LiveTablesPayload;
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

  // Strip provider photos: we must not hotlink the external source's player
  // images from visitor browsers. The avatar falls back to stable initials,
  // which also avoids flicker while remote images load/fail every poll.
  for (const item of items) {
    if (
      item.state.playerAPhotoUrl ||
      item.state.playerBPhotoUrl ||
      item.state.playerAPhotoMainUrl ||
      item.state.playerBPhotoMainUrl
    ) {
      item.state = {
        ...item.state,
        playerAPhotoUrl: null,
        playerBPhotoUrl: null,
        playerAPhotoMainUrl: null,
        playerBPhotoMainUrl: null,
      };
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

// --- Kozoom live tables --------------------------------------------------
// Auto-detected: the Kozoom event is located from our own event (title, city,
// dates), its per-table tokens from /streams, and the live state from the
// scoreboard socket. Cards land in the same shape as the provider web tables.

const kozoomPlayerTokens = (value: string | null | undefined): string[] =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((token) => token.length > 1);

type KozoomPlayerEntry = {
  tokens: string[];
  country: string | null;
  stageName: string | null;
  groupName: string | null;
};

const kozoomPlayerIndexCache = new Map<
  string,
  { expiresAt: number; entries: KozoomPlayerEntry[] }
>();

const findKozoomPlayerEntry = (
  entries: KozoomPlayerEntry[],
  name: string | null | undefined,
): KozoomPlayerEntry | null => {
  const tokens = kozoomPlayerTokens(name);
  if (tokens.length === 0) return null;
  const wanted = new Set(tokens);
  for (const entry of entries) {
    const shared = entry.tokens.filter((token) => wanted.has(token)).length;
    if (shared === 0) continue;
    const shortest = Math.min(entry.tokens.length, tokens.length);
    if (shared >= shortest) return entry;
  }
  return null;
};

const buildKozoomPlayerIndex = async (eventId: string): Promise<KozoomPlayerEntry[]> => {
  const cached = kozoomPlayerIndexCache.get(eventId);
  if (cached && cached.expiresAt > Date.now()) return cached.entries;

  const params = new URLSearchParams();
  params.set("filters[event][documentId][$eq]", eventId);
  params.set("fields[0]", "title");
  params.set("fields[1]", "order");
  params.set("pagination[pageSize]", "20");
  for (const side of ["player1", "player2"]) {
    params.set(`populate[groups][populate][${side}][fields][0]`, "full_name");
    params.set(`populate[groups][populate][${side}][fields][1]`, "full_name_en");
    params.set(`populate[groups][populate][${side}][fields][2]`, "country");
  }
  params.set("populate[groups][fields][0]", "group_label");
  params.set("populate[groups][fields][1]", "number");

  const json = await strapiFetch(`/api/bt-event-stages?${params.toString()}`);
  const stages = Array.isArray((json as { data?: unknown[] } | null)?.data)
    ? ((json as { data: unknown[] }).data)
    : [];

  const entries: KozoomPlayerEntry[] = [];
  for (const rawStage of stages) {
    const stage = rawStage as {
      title?: string | null;
      groups?: Array<Record<string, unknown>>;
    };
    for (const group of Array.isArray(stage.groups) ? stage.groups : []) {
      const groupLabel =
        (typeof group.group_label === "string" && group.group_label.trim()) ||
        (typeof group.number === "number" ? `Group ${group.number}` : null);
      for (const side of ["player1", "player2"] as const) {
        const player = group[side] as
          | { full_name?: string | null; full_name_en?: string | null; country?: string | null }
          | null
          | undefined;
        if (!player) continue;
        const name = player.full_name_en || player.full_name || null;
        const tokens = kozoomPlayerTokens(name);
        if (tokens.length === 0) continue;
        entries.push({
          tokens,
          country: player.country ?? null,
          stageName: stage.title ?? null,
          groupName: groupLabel,
        });
      }
    }
  }

  kozoomPlayerIndexCache.set(eventId, {
    expiresAt: Date.now() + CONFIG_CACHE_TTL_MS,
    entries,
  });
  return entries;
};

type KozoomEventMeta = {
  title: string | null;
  city: string | null;
  from: string | null;
  to: string | null;
  gameType: string | null;
};

const kozoomEventMetaCache = new Map<string, { expiresAt: number; meta: KozoomEventMeta }>();

const fetchKozoomEventMeta = async (eventId: string): Promise<KozoomEventMeta | null> => {
  const cached = kozoomEventMetaCache.get(eventId);
  if (cached && cached.expiresAt > Date.now()) return cached.meta;

  const params = new URLSearchParams();
  params.set("fields[0]", "title");
  params.set("fields[1]", "start_date");
  params.set("fields[2]", "end_date");
  params.set("fields[3]", "game_type");
  // The venue lives on the tournament (bt-events has no venue field).
  params.set("populate[tournament][populate][venue][fields][0]", "city");
  params.set("populate[tournament][populate][venue][fields][1]", "name");

  const json = await strapiFetch(`/api/bt-events/${encodeURIComponent(eventId)}?${params.toString()}`);
  const data = (json as { data?: Record<string, unknown> } | null)?.data;
  if (!data) return null;

  const tournament = (data.tournament ?? null) as { venue?: { city?: string | null; name?: string | null } | null } | null;
  const venue = tournament?.venue ?? null;
  const meta: KozoomEventMeta = {
    title: typeof data.title === "string" ? data.title : null,
    city: venue?.city ?? null,
    from: typeof data.start_date === "string" ? data.start_date : null,
    to: typeof data.end_date === "string" ? data.end_date : null,
    gameType: typeof data.game_type === "string" ? data.game_type : null,
  };
  kozoomEventMetaCache.set(eventId, { expiresAt: Date.now() + CONFIG_CACHE_TTL_MS, meta });
  return meta;
};

const KOZOOM_GAME_ID_THREE_CUSHION = 2;

const buildKozoomLiveItem = (
  stream: KozoomStream,
  match: KozoomLiveMatch,
  entries: KozoomPlayerEntry[],
  meta: KozoomEventMeta | null,
): LiveSessionItem | null => {
  const slotA = match.players.find((player) => player.playerSlot === 1) ?? match.players[0];
  const slotB = match.players.find((player) => player.playerSlot === 2) ?? match.players[1];
  if (!slotA && !slotB) return null;

  const nameA = slotA?.name ?? null;
  const nameB = slotB?.name ?? null;
  const entryA = findKozoomPlayerEntry(entries, nameA);
  const entryB = findKozoomPlayerEntry(entries, nameB);
  const tableNumber = match.tableNo || kozoomTableNumber(stream);
  const sessionId = `kozoom-${match.id ?? stream.token}-table-${tableNumber}`;
  const clockPlayer = match.shotClock?.playerSlot ?? null;
  const clockSeconds = match.shotClock?.timeLeftSeconds ?? null;

  return {
    id: sessionId,
    sessionId,
    screenId: stream.label ?? `Table ${tableNumber}`,
    updatedAt: new Date().toISOString(),
    clubName: "Kozoom",
    liveVideos: stream.url
      ? [
          {
            id: `${sessionId}-video`,
            provider: "hls",
            videoId: stream.url,
            url: stream.url,
            title: stream.label ?? `Table ${tableNumber}`,
            label: stream.label ?? `Table ${tableNumber}`,
            youtubeUrl: null,
            isPrimary: true,
            sortOrder: 0,
          },
        ]
      : undefined,
    state: {
      playerAName: nameA ?? undefined,
      playerBName: nameB ?? undefined,
      playerACountry: entryA?.country ?? null,
      playerBCountry: entryB?.country ?? null,
      scoreA: slotA?.score ?? 0,
      scoreB: slotB?.score ?? 0,
      inningsA: slotA?.innings ?? 0,
      inningsB: slotB?.innings ?? 0,
      inningsCount: match.currentInningNo ?? Math.max(slotA?.innings ?? 0, slotB?.innings ?? 0),
      bestRunA: slotA?.bestRun ?? 0,
      bestRunB: slotB?.bestRun ?? 0,
      runA: slotA?.runs ?? 0,
      runB: slotB?.runs ?? 0,
      liveRunA: slotA?.runs ?? 0,
      liveRunB: slotB?.runs ?? 0,
      current:
        match.currentTurnPlayerSlot === 1
          ? "A"
          : match.currentTurnPlayerSlot === 2
            ? "B"
            : undefined,
      timeoutsA: slotA?.usedTimeExtensions ?? 0,
      timeoutsB: slotB?.usedTimeExtensions ?? 0,
      maxTimeoutsA: match.timeExtensionsPerPlayer ?? undefined,
      maxTimeoutsB: match.timeExtensionsPerPlayer ?? undefined,
      playerATimeSeconds: clockPlayer === 1 && clockSeconds !== null ? clockSeconds : undefined,
      playerBTimeSeconds: clockPlayer === 2 && clockSeconds !== null ? clockSeconds : undefined,
      targetPointsA: match.raceTo,
      targetPointsB: match.raceTo,
      tournamentName: meta?.title ?? null,
      stageName: entryA?.stageName ?? entryB?.stageName ?? null,
      groupName: entryA?.groupName ?? entryB?.groupName ?? null,
      tableName: tableNumber,
      isRunning: String(match.status ?? "").toUpperCase() === "PLAYING",
    },
  };
};

const buildKozoomPayload = async (
  eventId: string,
  kozoomEventIdParam: string,
): Promise<LiveTablesPayload> => {
  const updatedAt = new Date().toISOString();
  const meta = await fetchKozoomEventMeta(eventId);

  let kozoomEventId = kozoomEventIdParam || null;
  let detectedName: string | null = null;

  if (!kozoomEventId) {
    const candidates = await lookupKozoomEvents({
      title: meta?.title ?? null,
      city: meta?.city ?? null,
      from: meta?.from ?? null,
      to: meta?.to ?? null,
      gameId: /three|3[-\s]?cushion/i.test(meta?.gameType ?? "")
        ? KOZOOM_GAME_ID_THREE_CUSHION
        : null,
      limit: 5,
    });
    if (candidates.length === 0) {
      return {
        data: [],
        sourceUrl: "",
        updatedAt,
        error: "No Kozoom event matches this tournament (title, city and dates).",
        kozoomEventId: null,
      };
    }
    kozoomEventId = String(candidates[0].id);
    detectedName = candidates[0].eventTypeName;
  }

  const streams = await fetchKozoomStreams(kozoomEventId);
  if (streams.length === 0) {
    return {
      data: [],
      sourceUrl: `https://tv.kozoom.com/en/event/${kozoomEventId}`,
      updatedAt,
      error: "The Kozoom event has no table streams yet.",
      kozoomEventId: Number(kozoomEventId),
      kozoomEventName: detectedName,
      kozoomTableCount: 0,
    };
  }

  const orderedStreams = [...streams].sort((left, right) => {
    const leftNumber = Number(kozoomTableNumber(left));
    const rightNumber = Number(kozoomTableNumber(right));
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
      return leftNumber - rightNumber;
    }
    return kozoomTableNumber(left).localeCompare(kozoomTableNumber(right));
  });

  const contexts = await getKozoomLiveContexts(orderedStreams.map((stream) => stream.token));
  const entries = await buildKozoomPlayerIndex(eventId);

  const data = orderedStreams
    .map((stream): LiveSessionItem | null => {
      const match = parseKozoomLiveMatch(contexts.get(stream.token) ?? null);
      return match ? buildKozoomLiveItem(stream, match, entries, meta) : null;
    })
    .filter((item): item is LiveSessionItem => Boolean(item));

  return {
    data,
    sourceUrl: `https://tv.kozoom.com/en/event/${kozoomEventId}`,
    updatedAt,
    kozoomEventId: Number(kozoomEventId),
    kozoomEventName: detectedName,
    kozoomTableCount: orderedStreams.length,
  };
};

export async function GET(req: NextRequest, context: RouteContext) {
  const { eventId } = await context.params;
  const searchParams = req.nextUrl.searchParams;
  const source = (searchParams.get("source") ?? "").trim().toLowerCase();
  const kozoomEventId = (searchParams.get("kozoomEventId") ?? "").trim();
  const competitionIdx =
    searchParams.get("competitionIdx")?.trim() ||
    getExternalLiveTablesCompetitionIdx(eventId) ||
    "";

  if (source === "kozoom") {
    const cacheKey = `kozoom:${eventId}:${kozoomEventId || "auto"}`;
    const cachedKozoom = cache.get(cacheKey);
    if (cachedKozoom && cachedKozoom.expiresAt > Date.now()) {
      return NextResponse.json({ ...cachedKozoom.payload, cached: true }, { status: 200 });
    }
    try {
      const payload = await buildKozoomPayload(eventId, kozoomEventId);
      cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
      return NextResponse.json({ ...payload, cached: false }, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        {
          data: [],
          sourceUrl: "",
          updatedAt: new Date().toISOString(),
          error:
            error instanceof Error ? error.message : "Failed to load the Kozoom live tables",
        },
        { status: 200 },
      );
    }
  }

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
