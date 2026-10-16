// Kozoom live score client (unofficial public endpoints, no key required).
//
//   * api.kozoom.com                       -> event list + per-event table streams (tokens)
//   * scoreboard-api.kozoom.com /scoreboard -> live match state pushed over socket.io
//
// The live state arrives as a `context` event the moment a table token is
// subscribed, so a short-lived Engine.IO polling session is enough to read a
// snapshot. A single module-level session is reused across requests (the Next
// server is a long-lived process) and stops by itself when idle.

export const KOZOOM_API_BASE = "https://api.kozoom.com";
export const KOZOOM_SCOREBOARD_BASE = "https://scoreboard-api.kozoom.com";

const NAMESPACE = "/scoreboard";
const REQUEST_TIMEOUT_MS = 8000;
const POLL_INTERVAL_MS = 1500;
const IDLE_STOP_MS = 10 * 60 * 1000;
const CONTEXT_WAIT_MS = 2500;

const EVENTS_LIST_LIMIT = 5000;

export type KozoomEventSummary = {
  id: number;
  eventTypeName: string | null;
  city: string | null;
  country: string | null;
  startTime: string | null;
  endTime: string | null;
  gameId: number | null;
  isLive: boolean;
};

export type KozoomStream = {
  id: number | null;
  token: string;
  name: string;
  label: string | null;
  rank: number | null;
  url: string | null;
};

export type KozoomPlayerSide = {
  playerSlot: number;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  nationality: string | null;
  score: number;
  innings: number;
  runs: number;
  bestRun: number;
  usedTimeExtensions: number;
  photoUrl: string | null;
};

export type KozoomLiveMatch = {
  id: string | null;
  publicId: string | null;
  status: string | null;
  raceTo: number | null;
  currentInningNo: number | null;
  currentTurnPlayerSlot: number | null;
  timeExtensionsPerPlayer: number | null;
  tableNo: string | null;
  tableToken: string | null;
  shotClock: {
    active: boolean;
    playerSlot: number | null;
    timeLeftSeconds: number | null;
    durationSeconds: number | null;
  } | null;
  players: KozoomPlayerSide[];
};

// ---------------------------------------------------------------- http utils

const asString = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const httpText = async (url: string, body?: string): Promise<string> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
        "User-Agent": "BilliardToday live score cards",
      },
      body,
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`kozoom http ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
};

// ------------------------------------------------------------ event discovery

const normalizeText = (value: string | null | undefined): string =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const TITLE_STOP_WORDS = new Set([
  "the", "and", "of", "cup", "tour", "tournament", "open", "final", "finals",
  "world", "european", "championship", "championships", "challenge", "grand", "prix",
]);

const titleTokens = (value: string | null | undefined): string[] =>
  normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 2 && !TITLE_STOP_WORDS.has(token));

const toDay = (value: string | null | undefined): string | null => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
};

const shiftDay = (day: string, days: number): string => {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const normalizeEvent = (raw: Record<string, unknown>): KozoomEventSummary | null => {
  const id = asNumber(raw.id);
  if (id === null) return null;
  return {
    id,
    eventTypeName: asString(raw.eventTypeName),
    city: asString(raw.city),
    country: asString(raw.country),
    startTime: asString(raw.startTime),
    endTime: asString(raw.endTime),
    gameId: asNumber(raw.gameId),
    isLive: raw.isLive === true,
  };
};

export const listKozoomEvents = async (): Promise<KozoomEventSummary[]> => {
  const text = await httpText(`${KOZOOM_API_BASE}/events?lang=en&limit=${EVENTS_LIST_LIMIT}`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((entry) => normalizeEvent(entry as Record<string, unknown>))
    .filter((entry): entry is KozoomEventSummary => entry !== null);
};

/**
 * Find the Kozoom event that belongs to one of our tournaments: the date window
 * must overlap, the city must match when both sides know it, and title tokens
 * (e.g. U25 / 3-Cushion) must overlap. Returns the best candidates, best first.
 */
export const lookupKozoomEvents = async (params: {
  title?: string | null;
  city?: string | null;
  from?: string | null;
  to?: string | null;
  gameId?: number | null;
  limit?: number;
}): Promise<KozoomEventSummary[]> => {
  const all = await listKozoomEvents();
  if (all.length === 0) return [];

  const ours = {
    city: normalizeText(params.city),
    from: toDay(params.from ?? null),
    to: toDay(params.to ?? null),
    tokens: titleTokens(params.title),
    gameId: params.gameId ?? null,
  };

  const windowFrom = ours.from ? shiftDay(ours.from, -2) : null;
  const windowTo = ours.to ? shiftDay(ours.to, 2) : null;

  const scored: Array<{ event: KozoomEventSummary; score: number }> = [];

  for (const event of all) {
    const start = toDay(event.startTime);
    const end = toDay(event.endTime) ?? start;

    if (windowFrom && windowTo) {
      if (!start) continue;
      const overlaps = start <= windowTo && (end ?? start) >= windowFrom;
      if (!overlaps) continue;
    }

    let score = 0;
    const eventCity = normalizeText(event.city);
    if (ours.city && eventCity) {
      if (eventCity === ours.city) score += 4;
      else if (eventCity.includes(ours.city) || ours.city.includes(eventCity)) score += 2;
      else if (windowFrom && windowTo) continue; // same dates but another city
    }

    const eventTokens = new Set([
      ...titleTokens(event.eventTypeName),
      ...titleTokens(event.city),
      ...titleTokens(event.country),
    ]);
    let tokenHits = 0;
    for (const token of ours.tokens) {
      if (eventTokens.has(token)) tokenHits += 1;
    }
    if (ours.tokens.length > 0) {
      if (tokenHits === 0 && !(windowFrom && windowTo)) continue;
      score += tokenHits * 3;
    }

    if (params.gameId !== null && event.gameId !== null) {
      if (event.gameId === params.gameId) score += 1;
      else score -= 2;
    }
    if (event.isLive) score += 1;

    if (score <= 0) continue;
    scored.push({ event, score });
  }

  scored.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    const leftStart = toDay(left.event.startTime) ?? "";
    const rightStart = toDay(right.event.startTime) ?? "";
    return rightStart.localeCompare(leftStart);
  });

  return scored.slice(0, params.limit ?? 10).map((entry) => entry.event);
};

// ------------------------------------------------------------------ streams

export const fetchKozoomStreams = async (eventId: string | number): Promise<KozoomStream[]> => {
  const text = await httpText(`${KOZOOM_API_BASE}/streams?eventId=${encodeURIComponent(String(eventId))}`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((entry): KozoomStream | null => {
      const raw = entry as Record<string, unknown>;
      const token = asString(raw.token) ?? asString(raw.name);
      if (!token) return null;
      return {
        id: asNumber(raw.id),
        token,
        name: asString(raw.name) ?? token,
        label: asString(raw.label),
        rank: asNumber(raw.rank),
        url: asString(raw.url),
      };
    })
    .filter((entry): entry is KozoomStream => entry !== null);
};

export const kozoomTableNumber = (stream: KozoomStream): string => {
  const fromLabel = (stream.label ?? "").replace(/^table\s*/i, "").trim();
  if (fromLabel) return fromLabel;
  const fromName = (stream.name ?? "").replace(/^[a-z]+[_-]?/i, "").trim();
  return fromName || "1";
};

// ------------------------------------------------------- live socket session

type ContextEntry = { at: number; data: Record<string, unknown> };

type Session = {
  sid: string | null;
  namespaceConnected: boolean;
  requested: Set<string>;
  sentSubscribe: Set<string>;
  contexts: Map<string, ContextEntry>;
  errors: string[];
  failures: number;
  pollsCompleted: number;
  lastRequestAt: number;
  timer: ReturnType<typeof setInterval> | null;
  polling: boolean;
};

let session: Session | null = null;

const socketUrl = (sid: string | null, stamp: number): string =>
  `${KOZOOM_SCOREBOARD_BASE}/socket.io/?EIO=4&transport=polling&t=${stamp}${sid ? `&sid=${encodeURIComponent(sid)}` : ""}`;

const stopTimer = (current: Session) => {
  if (current.timer) {
    clearInterval(current.timer);
    current.timer = null;
  }
};

const dropSession = () => {
  if (session) stopTimer(session);
  session = null;
};

const ensureSession = (): Session => {
  if (session) return session;
  const created: Session = {
    sid: null,
    namespaceConnected: false,
    requested: new Set<string>(),
    sentSubscribe: new Set<string>(),
    contexts: new Map<string, ContextEntry>(),
    errors: [],
    failures: 0,
    pollsCompleted: 0,
    lastRequestAt: Date.now(),
    timer: null,
    polling: false,
  };
  created.timer = setInterval(() => {
    void tick();
  }, POLL_INTERVAL_MS);
  // Do not keep the Node process alive only because of this poller.
  if (typeof created.timer.unref === "function") created.timer.unref();
  session = created;
  return created;
};

const openSession = async (current: Session) => {
  const text = await httpText(socketUrl(null, Date.now()));
  const frame = text.split("\x1e")[0] ?? "";
  if (!frame.startsWith("0")) throw new Error("kozoom socket handshake failed");
  const payload = JSON.parse(frame.slice(1)) as { sid?: string };
  if (!payload.sid) throw new Error("kozoom socket handshake returned no sid");
  current.sid = payload.sid;
  current.namespaceConnected = false;
  current.sentSubscribe = new Set<string>();
};

const post = async (current: Session, body: string) => {
  if (!current.sid) throw new Error("kozoom socket has no session");
  await httpText(socketUrl(current.sid, Date.now()), body);
};

const handleEvent = (current: Session, name: string, payload: unknown) => {
  if (name === "context" || name === "room") {
    const data = (payload ?? {}) as Record<string, unknown>;
    const match = (data.match ?? null) as Record<string, unknown> | null;
    const tableToken =
      asString((match?.venueTable as Record<string, unknown> | null)?.tableToken) ??
      asString(match?.roomToken) ??
      asString(data.roomToken);
    if (tableToken) {
      current.contexts.set(tableToken, { at: Date.now(), data });
    }
    return;
  }
  if (name === "error") {
    const message = asString((payload as Record<string, unknown> | null)?.message) ?? "unknown";
    if (!current.errors.includes(message)) current.errors.push(message);
  }
};

const tick = async () => {
  const current = session;
  if (!current) return;
  if (Date.now() - current.lastRequestAt > IDLE_STOP_MS) {
    dropSession();
    return;
  }
  if (current.polling) return;
  current.polling = true;
  try {
    if (!current.sid) await openSession(current);
    if (!current.namespaceConnected) {
      await post(current, `40${NAMESPACE},`);
      current.namespaceConnected = true;
    }
    await subscribePending(current);
    const text = await httpText(socketUrl(current.sid, Date.now()));
    for (const frame of text.split("\x1e")) {
      if (!frame) continue;
      if (frame === "2") {
        await post(current, "3");
        continue;
      }
      if (frame.startsWith("1")) {
        throw new Error("kozoom socket closed by server");
      }
      const eventPrefix = `42${NAMESPACE},`;
      if (frame.startsWith(eventPrefix)) {
        try {
          const parsed = JSON.parse(frame.slice(eventPrefix.length)) as [string, unknown];
          handleEvent(current, parsed[0], parsed[1]);
        } catch {
          // ignore malformed frames
        }
        continue;
      }
      if (frame.startsWith(`40${NAMESPACE}`)) {
        current.namespaceConnected = true;
      }
    }
    current.pollsCompleted += 1;
    current.failures = 0;
  } catch {
    current.failures += 1;
    if (current.failures >= 3) dropSession();
  } finally {
    current.polling = false;
  }
};

const subscribePending = async (current: Session) => {
  const pending: string[] = [];
  for (const token of current.requested) {
    if (!current.sentSubscribe.has(token)) pending.push(token);
  }
  for (const token of pending) {
    await post(current, `42${NAMESPACE},${JSON.stringify(["subscribe", { tableToken: token }])}`);
    current.sentSubscribe.add(token);
  }
};

/**
 * Live snapshot for the given table tokens. Missing tokens simply come back as
 * null (a table without a match never receives a `context`).
 */
export const getKozoomLiveContexts = async (
  tokens: Array<string | null | undefined>,
  options?: { waitMs?: number },
): Promise<Map<string, Record<string, unknown> | null>> => {
  const unique = Array.from(new Set(tokens.map((token) => (token ?? "").trim()).filter(Boolean)));
  const result = new Map<string, Record<string, unknown> | null>();
  if (unique.length === 0) return result;

  const current = ensureSession();
  current.lastRequestAt = Date.now();
  for (const token of unique) current.requested.add(token);

  const waitMs = options?.waitMs ?? CONTEXT_WAIT_MS;
  const startedAt = Date.now();
  await tick();
  while (Date.now() - startedAt < waitMs) {
    const allPresent = unique.every((token) => current.contexts.has(token));
    if (allPresent) break;
    if (current.pollsCompleted >= 2 && Date.now() - startedAt > 1200) break;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  for (const token of unique) {
    result.set(token, current.contexts.get(token)?.data ?? null);
  }
  return result;
};

export const parseKozoomLiveMatch = (
  raw: Record<string, unknown> | null,
): KozoomLiveMatch | null => {
  if (!raw) return null;
  const match = (raw.match ?? null) as Record<string, unknown> | null;
  if (!match) return null;

  const stateJson = (match.stateJson ?? {}) as Record<string, unknown>;
  const shotClockRaw = (stateJson.shotClock ?? null) as Record<string, unknown> | null;
  const venueTable = (match.venueTable ?? null) as Record<string, unknown> | null;

  const playerEntries = Array.isArray(match.matchPlayers) ? match.matchPlayers : [];
  const players: KozoomPlayerSide[] = playerEntries
    .map((entry): KozoomPlayerSide | null => {
      const player = (entry as Record<string, unknown>);
      const profile = (player.player ?? null) as Record<string, unknown> | null;
      const slot = asNumber(player.playerSlot);
      if (slot === null) return null;
      const firstName = asString(profile?.firstName);
      const lastName = asString(profile?.lastName);
      const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || null;
      return {
        playerSlot: slot,
        name: fullName,
        firstName,
        lastName,
        nationality: asString(profile?.nationality),
        score: asNumber(player.score) ?? 0,
        innings: asNumber(player.innings) ?? 0,
        runs: asNumber(player.runs) ?? 0,
        bestRun: asNumber(player.bestRun) ?? 0,
        usedTimeExtensions: asNumber(player.usedTimeExtensions) ?? 0,
        photoUrl: asString(profile?.avatarUrl),
      };
    })
    .filter((entry): entry is KozoomPlayerSide => entry !== null)
    .sort((left, right) => left.playerSlot - right.playerSlot);

  return {
    id: asString(match.id),
    publicId: asString(match.publicId),
    status: asString(match.status),
    raceTo: asNumber(match.raceTo),
    currentInningNo: asNumber(match.currentInningNo),
    currentTurnPlayerSlot: asNumber(match.currentTurnPlayerSlot),
    timeExtensionsPerPlayer: asNumber(match.timeExtensionsPerPlayer),
    tableNo: asString(venueTable?.tableNo),
    tableToken: asString(venueTable?.tableToken),
    shotClock: shotClockRaw
      ? {
          active: shotClockRaw.active === true,
          playerSlot: asNumber(shotClockRaw.playerSlot),
          timeLeftSeconds: asNumber(shotClockRaw.timeLeftSeconds),
          durationSeconds: asNumber(shotClockRaw.durationSeconds) ?? asNumber(match.shotClockSeconds),
        }
      : null,
    players,
  };
};
