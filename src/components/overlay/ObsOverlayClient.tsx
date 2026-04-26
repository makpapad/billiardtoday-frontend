"use client";

import * as React from "react";
import { normalizeWebSocketUrl } from "@/hooks/useLiveScore";
import { buildLiveScoreChartRows, LiveSheetScoreChart } from "@/components/live/LiveSheetScoreChart";

type ObsOverlayClientProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

type OverlayTemplate = "1" | "2" | "3" | "4" | "5";

type LiveScoreState = {
  scoreA?: number;
  scoreB?: number;
  runA?: number;
  runB?: number;
  liveRunA?: number;
  liveRunB?: number;
  bestRunA?: number;
  bestRunB?: number;
  timeoutsA?: number;
  timeoutsB?: number;
  maxTimeoutsA?: number;
  maxTimeoutsB?: number;
  current?: "A" | "B";
  inningsCount?: number;
  playerAName?: string | null;
  playerBName?: string | null;
  playerACountry?: string | null;
  playerBCountry?: string | null;
  progress?: number;
  totalBlocks?: number;
  isRunning?: boolean;
  targetPointsA?: number | null;
  targetPointsB?: number | null;
  avgFormattedA?: string | null;
  avgFormattedB?: string | null;
  accPercentA?: number | null;
  accPercentB?: number | null;
  playerATimeSeconds?: number | null;
  playerBTimeSeconds?: number | null;
  secondsPerInningA?: number | null;
  secondsPerInningB?: number | null;
  gameDurationSeconds?: number | null;
  inningsA?: number | null;
  inningsB?: number | null;
  inningsDetail?: Array<{
    inning: number;
    player1?: { pt: number; tot: number };
    player2?: { pt: number; tot: number };
  }>;
  tournamentName?: string | null;
  stageName?: string | null;
  groupName?: string | null;
  tableName?: string | null;
};

type LiveScoreItem = {
  id: string;
  sessionId: string;
  screenId?: string | null;
  updatedAt?: string | null;
  clubId?: string | number | null;
  clubName?: string | null;
  clubCity?: string | null;
  clubFederationName?: string | null;
  state: LiveScoreState;
};

type SessionApiRecord = {
  id?: string | number | null;
  sessionId?: string | number | null;
  screenId?: string | null;
  screenIdentifier?: string | null;
  updatedAt?: string | null;
  clubId?: string | number | null;
  clubName?: string | null;
  clubCity?: string | null;
  clubFederationName?: string | null;
  state?: LiveScoreState;
  players?: Array<{
    name?: string | null;
    country?: string | null;
    points?: number | null;
    run?: number | null;
    liveRun?: number | null;
    innings?: number | null;
    targetPoints?: number | null;
  }>;
  current?: "A" | "B" | null;
  progress?: number | null;
  totalBlocks?: number | null;
  isRunning?: boolean | null;
  tournamentName?: string | null;
  eventTitle?: string | null;
  stageName?: string | null;
  stageTitle?: string | null;
  tableName?: string | null;
  tableNumber?: string | number | null;
  targetPoints?: number | null;
  targetPointsP1?: number | null;
  targetPointsP2?: number | null;
  player1Name?: string | null;
  player2Name?: string | null;
  player1Country?: string | null;
  player2Country?: string | null;
};

type WsPayload = {
  type?: string;
  screenId?: string;
  screenIdentifier?: string;
  sessionId?: string | number | null;
  reason?: string | null;
  current?: "A" | "B" | null;
  activePlayer?: 1 | 2 | null;
  progress?: number | null;
  totalBlocks?: number | null;
  isRunning?: boolean | null;
  players?: Array<{
    name?: string | null;
    country?: string | null;
    points?: number | null;
    run?: number | null;
    liveRun?: number | null;
    innings?: number | null;
    targetPoints?: number | null;
    target_points?: number | null;
    timeoutsUsed?: number | null;
    timeouts?: number | null;
    maxTimeouts?: number | null;
    avgFormatted?: string | null;
    accPercent?: number | null;
    playerTimeSeconds?: number | null;
    secondsPerInning?: number | null;
  }>;
  innings?: number | null;
  inningsDetail?: LiveScoreState["inningsDetail"];
  gameDurationSeconds?: number | null;
};

const DEFAULT_WIDTH = 540;
const DEFAULT_HEIGHT = 146;
const WS_TOKEN = process.env.NEXT_PUBLIC_WS_TOKEN || "BT_WS_RELAY_TOKEN_2025";
const OVERLAY_WS_RECONNECT_MS = 2500;
function getParamValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseBooleanParam(
  value: string | string[] | undefined,
  defaultValue: boolean,
): boolean {
  const raw = getParamValue(value);
  if (!raw) return defaultValue;
  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

function normalizeString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

function stripLeadingWord(value: string | null, word: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  const target = word.toLowerCase();
  if (!lower.startsWith(target)) return trimmed;
  const stripped = trimmed.slice(word.length).replace(/^[\s:\-]+/, "").trim();
  return stripped || trimmed;
}

function coerceNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeTargetPoints(...values: unknown[]): number | null {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) return Math.floor(num);
  }
  return null;
}

function formatOverlayPlayerName(name: string | null | undefined): string {
  const raw = normalizeString(name) ?? "Player";
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return raw;
  const lastName = parts[0] ?? raw;
  const firstInitial = (parts[1] ?? "").slice(0, 1).toUpperCase();
  return firstInitial ? `${lastName} ${firstInitial}.` : lastName;
}

function truncateOverlayLabel(value: string, maxChars: number): string {
  const normalized = value.trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, Math.max(1, maxChars - 1)).trimEnd()}.`;
}

function formatTemplateFivePlayerName(value: string): string {
  const normalized = value.trim();
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return normalized;
  const surname = parts[0];
  const givenInitial = Array.from(parts[1] ?? "").slice(0, 1).join("").trimEnd();
  return givenInitial ? `${surname} ${givenInitial}.` : surname;
}

function normalizeSessionRecord(input: SessionApiRecord | null | undefined, fallbackSessionId: string): LiveScoreItem | null {
  if (!input) return null;

  const players = Array.isArray(input.players) ? input.players : [];
  const playerA = players[0] ?? {};
  const playerB = players[1] ?? {};
  const state = input.state ?? {};

  const sessionId =
    normalizeString(input.sessionId) ??
    normalizeString(input.id) ??
    fallbackSessionId;

  return {
    id: normalizeString(input.id) ?? sessionId,
    sessionId,
    screenId: normalizeString(input.screenId) ?? normalizeString(input.screenIdentifier),
    updatedAt: normalizeString(input.updatedAt),
    clubId: input.clubId ?? null,
    clubName: normalizeString(input.clubName),
    clubCity: normalizeString(input.clubCity),
    clubFederationName: normalizeString(input.clubFederationName),
    state: {
      scoreA: state.scoreA ?? coerceNumber(playerA.points, 0),
      scoreB: state.scoreB ?? coerceNumber(playerB.points, 0),
      runA: state.runA ?? coerceNumber(playerA.run, 0),
      runB: state.runB ?? coerceNumber(playerB.run, 0),
      liveRunA: state.liveRunA ?? coerceNumber(playerA.liveRun ?? playerA.run, 0),
      liveRunB: state.liveRunB ?? coerceNumber(playerB.liveRun ?? playerB.run, 0),
      bestRunA: state.bestRunA ?? 0,
      bestRunB: state.bestRunB ?? 0,
      timeoutsA: coerceNumber(state.timeoutsA, 0),
      timeoutsB: coerceNumber(state.timeoutsB, 0),
      maxTimeoutsA: coerceNumber(state.maxTimeoutsA, 0),
      maxTimeoutsB: coerceNumber(state.maxTimeoutsB, 0),
      current:
        state.current ??
        (input.current === "A" || input.current === "B"
          ? input.current
          : undefined),
      inningsCount:
        state.inningsCount ??
        Math.max(
          coerceNumber(playerA.innings, 0),
          coerceNumber(playerB.innings, 0),
          0,
        ),
      playerAName: state.playerAName ?? normalizeString(input.player1Name) ?? normalizeString(playerA.name) ?? "Player A",
      playerBName: state.playerBName ?? normalizeString(input.player2Name) ?? normalizeString(playerB.name) ?? "Player B",
      playerACountry: state.playerACountry ?? normalizeString(input.player1Country) ?? normalizeString(playerA.country),
      playerBCountry: state.playerBCountry ?? normalizeString(input.player2Country) ?? normalizeString(playerB.country),
      progress: state.progress ?? coerceNumber(input.progress, 0),
      totalBlocks: state.totalBlocks ?? coerceNumber(input.totalBlocks, 40),
      isRunning: state.isRunning ?? Boolean(input.isRunning),
      targetPointsA:
        normalizeTargetPoints(
          state.targetPointsA,
          playerA.targetPoints,
          input.targetPointsP1,
          input.targetPoints,
        ),
      targetPointsB:
        normalizeTargetPoints(
          state.targetPointsB,
          playerB.targetPoints,
          input.targetPointsP2,
          input.targetPoints,
        ),
      tournamentName: state.tournamentName ?? normalizeString(input.tournamentName) ?? normalizeString(input.eventTitle),
      stageName: state.stageName ?? normalizeString(input.stageName) ?? normalizeString(input.stageTitle),
      tableName: state.tableName ?? normalizeString(input.tableName) ?? normalizeString(input.tableNumber),
    },
  };
}

function applyWsUpdate(item: LiveScoreItem, payload: WsPayload): LiveScoreItem {
  const players = Array.isArray(payload.players) ? payload.players : [];
  const playerA = players[0] ?? {};
  const playerB = players[1] ?? {};
  const nextCurrent =
    payload.current === "A" || payload.current === "B"
      ? payload.current
      : payload.activePlayer === 1
        ? "A"
        : payload.activePlayer === 2
          ? "B"
          : item.state.current;

  return {
    ...item,
    updatedAt: new Date().toISOString(),
    screenId: normalizeString(payload.screenId) ?? item.screenId,
    state: {
      ...item.state,
      scoreA: coerceNumber(playerA.points, item.state.scoreA ?? 0),
      scoreB: coerceNumber(playerB.points, item.state.scoreB ?? 0),
      runA: coerceNumber(playerA.run, item.state.runA ?? 0),
      runB: coerceNumber(playerB.run, item.state.runB ?? 0),
      liveRunA: coerceNumber(playerA.liveRun ?? playerA.run, item.state.liveRunA ?? 0),
      liveRunB: coerceNumber(playerB.liveRun ?? playerB.run, item.state.liveRunB ?? 0),
      bestRunA: coerceNumber((playerA as Record<string, unknown>)?.hr, item.state.bestRunA ?? 0),
      bestRunB: coerceNumber((playerB as Record<string, unknown>)?.hr, item.state.bestRunB ?? 0),
      timeoutsA: coerceNumber(playerA.timeoutsUsed ?? playerA.timeouts, item.state.timeoutsA ?? 0),
      timeoutsB: coerceNumber(playerB.timeoutsUsed ?? playerB.timeouts, item.state.timeoutsB ?? 0),
      maxTimeoutsA: coerceNumber(playerA.maxTimeouts, item.state.maxTimeoutsA ?? 3),
      maxTimeoutsB: coerceNumber(playerB.maxTimeouts, item.state.maxTimeoutsB ?? 3),
      inningsCount: Math.max(
        coerceNumber(playerA.innings, 0),
        coerceNumber(playerB.innings, 0),
        item.state.inningsCount ?? 0,
      ),
      playerAName: normalizeString(playerA.name) ?? item.state.playerAName ?? "Player A",
      playerBName: normalizeString(playerB.name) ?? item.state.playerBName ?? "Player B",
      playerACountry: normalizeString(playerA.country) ?? item.state.playerACountry ?? null,
      playerBCountry: normalizeString(playerB.country) ?? item.state.playerBCountry ?? null,
      current: nextCurrent,
      progress: coerceNumber(payload.progress, item.state.progress ?? 0),
      totalBlocks: coerceNumber(payload.totalBlocks, item.state.totalBlocks ?? 40),
      isRunning:
        payload.isRunning === undefined || payload.isRunning === null
          ? item.state.isRunning
          : Boolean(payload.isRunning),
      targetPointsA: normalizeTargetPoints(
        playerA.targetPoints,
        playerA.target_points,
        item.state.targetPointsA,
      ),
      targetPointsB: normalizeTargetPoints(
        playerB.targetPoints,
        playerB.target_points,
        item.state.targetPointsB,
      ),
      avgFormattedA: normalizeString(playerA.avgFormatted) ?? item.state.avgFormattedA ?? null,
      avgFormattedB: normalizeString(playerB.avgFormatted) ?? item.state.avgFormattedB ?? null,
      accPercentA: Number.isFinite(Number(playerA.accPercent))
        ? Number(playerA.accPercent)
        : item.state.accPercentA ?? null,
      accPercentB: Number.isFinite(Number(playerB.accPercent))
        ? Number(playerB.accPercent)
        : item.state.accPercentB ?? null,
      playerATimeSeconds: Number.isFinite(Number(playerA.playerTimeSeconds))
        ? Number(playerA.playerTimeSeconds)
        : item.state.playerATimeSeconds ?? null,
      playerBTimeSeconds: Number.isFinite(Number(playerB.playerTimeSeconds))
        ? Number(playerB.playerTimeSeconds)
        : item.state.playerBTimeSeconds ?? null,
      secondsPerInningA: Number.isFinite(Number(playerA.secondsPerInning))
        ? Number(playerA.secondsPerInning)
        : item.state.secondsPerInningA ?? null,
      secondsPerInningB: Number.isFinite(Number(playerB.secondsPerInning))
        ? Number(playerB.secondsPerInning)
        : item.state.secondsPerInningB ?? null,
      gameDurationSeconds: Number.isFinite(Number(payload.gameDurationSeconds))
        ? Number(payload.gameDurationSeconds)
        : item.state.gameDurationSeconds ?? null,
      inningsA: coerceNumber(playerA.innings, item.state.inningsA ?? item.state.inningsCount ?? 0),
      inningsB: coerceNumber(playerB.innings, item.state.inningsB ?? item.state.inningsCount ?? 0),
      inningsDetail: Array.isArray(payload.inningsDetail)
        ? payload.inningsDetail
        : item.state.inningsDetail,
    },
  };
}

function resolveCountryCode(rawCountry: string | null | undefined): string | null {
  if (!rawCountry) return null;
  const trimmed = rawCountry.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  const map: Record<string, string> = {
    greece: "GR",
    greek: "GR",
    cyprus: "CY",
    turkey: "TR",
    germany: "DE",
    france: "FR",
    italy: "IT",
    spain: "ES",
    portugal: "PT",
    england: "GB",
    "united kingdom": "GB",
    netherlands: "NL",
    belgium: "BE",
    usa: "US",
    "united states": "US",
    canada: "CA",
    egypt: "EG",
  };
  const normalized = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return map[normalized] ?? null;
}

export default function ObsOverlayClient({ searchParams }: ObsOverlayClientProps) {
  const sessionId = getParamValue(searchParams?.session) ?? getParamValue(searchParams?.sessionId);
  const rawScreenParam =
    getParamValue(searchParams?.screen) ??
    getParamValue(searchParams?.screenId) ??
    getParamValue(searchParams?.screenIdentifier);
  const requestedScreenSlug = normalizeString(rawScreenParam);
  const templateParam = (getParamValue(searchParams?.t) ?? getParamValue(searchParams?.template) ?? "classic")
    .trim()
    .toLowerCase();
  const template: OverlayTemplate =
    templateParam === "5" || templateParam === "t5"
      ? "5"
      : templateParam === "4" || templateParam === "t4"
      ? "4"
      : templateParam === "3" || templateParam === "t3"
      ? "3"
      : templateParam === "2" || templateParam === "royalpro"
        ? "2"
        : "1";
  const requestedWidth = Number(getParamValue(searchParams?.width));
  const requestedHeight = Number(getParamValue(searchParams?.height));
  const width =
    (Number.isFinite(requestedWidth) && requestedWidth > 0 ? requestedWidth : 0) ||
    (template === "3" || template === "5" ? 1920 : DEFAULT_WIDTH);
  const height =
    (Number.isFinite(requestedHeight) && requestedHeight > 0 ? requestedHeight : 0) ||
    (template === "5" ? 1080 : 0) ||
    DEFAULT_HEIGHT;
  const obsSafe = parseBooleanParam(
    searchParams?.obs ?? searchParams?.obsSafe ?? searchParams?.safe,
    true,
  );

  const [item, setItem] = React.useState<LiveScoreItem | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resolvedScreenId, setResolvedScreenId] = React.useState<string | null>(null);
  const [breakStatsOpen, setBreakStatsOpen] = React.useState(false);

  const loadSession = React.useCallback(
    async (requestedSessionId: string, options?: { preserveItem?: boolean; silent?: boolean }) => {
      try {
        if (!options?.silent) setLoading(true);
        const response = await fetch(
          `/api/scoreboard/session-by-id/${encodeURIComponent(requestedSessionId)}`,
          { cache: "no-store" },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load session");
        }
        const row = Array.isArray(payload?.data) ? payload.data[0] : null;
        const normalized = normalizeSessionRecord(row, requestedSessionId);
        if (!normalized) {
          throw new Error("No live data found for this session.");
        }
        setItem(normalized);
        setError(null);
      } catch (err) {
        if (!options?.preserveItem) {
          setItem(null);
        }
        setError(err instanceof Error ? err.message : "Failed to load session");
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [],
  );

  const loadScreenSession = React.useCallback(
    async (screenIdentifier: string, options?: { preserveItem?: boolean; silent?: boolean }) => {
      try {
        if (!options?.silent) setLoading(true);
        const response = await fetch(
          `/api/scoreboard/screens/${encodeURIComponent(screenIdentifier)}/sessions?status=pending,in_progress`,
          { cache: "no-store" },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load screen session");
        }
        const row = Array.isArray(payload?.data) ? payload.data[0] : null;
        const normalized = normalizeSessionRecord(row, screenIdentifier);
        if (!normalized) {
          throw new Error("No live data found for this screen.");
        }
        setItem({
          ...normalized,
          screenId: normalized.screenId ?? screenIdentifier,
        });
        setError(null);
      } catch (err) {
        if (!options?.preserveItem) {
          setItem(null);
        }
        setError(err instanceof Error ? err.message : "Failed to load screen session");
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    if (!obsSafe || typeof document === "undefined") return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlBg = html.style.background;
    const prevBodyBg = body.style.background;
    const prevBodyMargin = body.style.margin;
    const prevBodyOverflow = body.style.overflow;

    html.style.background = "transparent";
    body.style.background = "transparent";
    body.style.margin = "0";
    body.style.overflow = "hidden";

    return () => {
      html.style.background = prevHtmlBg;
      body.style.background = prevBodyBg;
      body.style.margin = prevBodyMargin;
      body.style.overflow = prevBodyOverflow;
    };
  }, [obsSafe]);

  React.useEffect(() => {
    if (sessionId) {
      setResolvedScreenId(null);
      return;
    }
    if (!requestedScreenSlug) {
      setResolvedScreenId(null);
      return;
    }

    let cancelled = false;
    const runResolve = async () => {
      try {
        const response = await fetch(
          `/api/scoreboard/screens/by-overlay-slug/${encodeURIComponent(requestedScreenSlug)}`,
          { cache: "no-store" },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          setResolvedScreenId(requestedScreenSlug);
          return;
        }
        const identifier = normalizeString(payload?.data?.identifier);
        setResolvedScreenId(identifier ?? requestedScreenSlug);
      } catch {
        if (!cancelled) setResolvedScreenId(requestedScreenSlug);
      }
    };

    void runResolve();
    return () => {
      cancelled = true;
    };
  }, [requestedScreenSlug, sessionId]);

  React.useEffect(() => {
    if (!sessionId && !resolvedScreenId) {
      setItem(null);
      setError(null);
      return;
    }
    if (sessionId) {
      void loadSession(sessionId);
      return;
    }
    if (resolvedScreenId) {
      void loadScreenSession(resolvedScreenId);
    }
  }, [loadScreenSession, loadSession, resolvedScreenId, sessionId]);

  React.useEffect(() => {
    if (!item?.screenId) return;
    const currentSessionId = sessionId ?? null;
    const currentScreenId = item.screenId ?? resolvedScreenId;
    if (!currentScreenId) return;

    const wsUrl = normalizeWebSocketUrl(
      process.env.NEXT_PUBLIC_WS_ENDPOINT ||
        process.env.NEXT_PUBLIC_WS_URL ||
        "wss://ws.billiardtoday.com/ws",
    );
    const params = new URLSearchParams();
    if (WS_TOKEN) params.set("token", WS_TOKEN);
    params.set("screenId", currentScreenId);
    wsUrl.search = params.toString();

    let closedByEffect = false;
    let socket: WebSocket | null = null;
    let reconnectTimeoutId: number | null = null;

    const connect = () => {
      if (closedByEffect) return;

      socket = new WebSocket(wsUrl.toString());

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data || "{}")) as WsPayload;
          const payloadScreenId = normalizeString(payload.screenId) ?? normalizeString(payload.screenIdentifier);
          if (payloadScreenId && payloadScreenId !== item.screenId) return;

          if (payload.type === "overlay:break:start") {
            setBreakStatsOpen(true);
            return;
          }

          if (payload.type === "overlay:break:end") {
            setBreakStatsOpen(false);
            return;
          }

          const payloadSessionId = normalizeString(payload.sessionId);
          if (currentSessionId && payloadSessionId && payloadSessionId !== currentSessionId) return;

          if (payload.type !== "score:update") return;
          setError(null);
          setItem((current) => (current ? applyWsUpdate(current, payload) : current));
        } catch {
          // Ignore malformed realtime payloads for overlay rendering.
        }
      };

      socket.onerror = () => {
        try {
          socket?.close();
        } catch {}
      };

      socket.onclose = () => {
        if (closedByEffect) return;
        if (reconnectTimeoutId !== null) window.clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = window.setTimeout(() => {
          if (currentSessionId) {
            void loadSession(currentSessionId, { preserveItem: true, silent: true });
          } else if (currentScreenId) {
            void loadScreenSession(currentScreenId, { preserveItem: true, silent: true });
          }
          connect();
        }, OVERLAY_WS_RECONNECT_MS);
      };
    };

    connect();

    return () => {
      closedByEffect = true;
      if (reconnectTimeoutId !== null) window.clearTimeout(reconnectTimeoutId);
      try {
        socket?.close();
      } catch {}
    };
  }, [item?.screenId, item?.sessionId, loadScreenSession, loadSession, resolvedScreenId, sessionId]);

  if (!sessionId && !requestedScreenSlug) {
    return (
      <CenteredMessage tone="muted">
        Provide `?session=&lt;id&gt;` or use `/embed/overlay/&lt;screen&gt;`.
      </CenteredMessage>
    );
  }

  if (loading && !item) {
    return <CenteredMessage tone="muted">Loading overlay...</CenteredMessage>;
  }

  if (error && !item) {
    return <CenteredMessage tone="error">{error}</CenteredMessage>;
  }

  if (!item) {
    return (
      <CenteredMessage tone="muted">
        {requestedScreenSlug && !sessionId
          ? "No live data found for this screen."
          : "No live data found for this session."}
      </CenteredMessage>
    );
  }

  return (
    <div
      className={
        obsSafe
          ? `fixed inset-0 flex ${template === "3" && !breakStatsOpen ? "items-end" : "items-center"} justify-center overflow-hidden pointer-events-none select-none`
          : `min-h-screen flex ${template === "3" && !breakStatsOpen ? "items-end" : "items-center"} justify-center p-4`
      }
      style={{ backgroundColor: "transparent" }}
    >
      {!breakStatsOpen ? (
        <ScoreOverlayCard
          item={item}
          width={width}
          height={height}
          obsSafe={obsSafe}
          template={template}
        />
      ) : null}
      {breakStatsOpen ? <OverlayBreakStatsModal item={item} /> : null}
    </div>
  );
}

function OverlayBreakStatsModal({ item }: { item: LiveScoreItem }) {
  const state = item.state;
  const leftName = state.playerAName || "Player A";
  const rightName = state.playerBName || "Player B";
  const leftScore = state.scoreA ?? 0;
  const rightScore = state.scoreB ?? 0;
  const innings = state.inningsCount ?? Math.max(state.inningsA ?? 0, state.inningsB ?? 0, 0);
  const totalTime = formatMMSS(state.gameDurationSeconds);
  const chartRows = buildLiveScoreChartRows({
    inningsDetail: state.inningsDetail,
    inningsCount: innings,
    inningsA: state.inningsA,
    inningsB: state.inningsB,
    scoreA: leftScore,
    scoreB: rightScore,
    ended: false,
  });

  const meta = [
    ["Tournament", state.tournamentName],
    ["Stage", stripLeadingWord(state.stageName ?? null, "stage")],
    ["Group", stripLeadingWord(state.groupName ?? null, "group")],
    ["Table", stripLeadingWord(state.tableName ?? null, "table")],
  ];

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6 text-white backdrop-blur-[2px]">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-slate-950/95 via-blue-950/90 to-purple-950/90 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="text-sm uppercase tracking-[0.55em] text-white/70">Live Recap</div>
          <div className="text-xs uppercase tracking-[0.3em] text-white/45">Break</div>
        </div>

        <div className="mx-5 mb-3 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-xs uppercase tracking-[0.26em] text-white/55">
          {meta.map(([label, value]) => (
            <div key={label} className="flex min-w-[112px] items-center justify-center gap-2">
              <span>{label}</span>
              <span className="text-sm font-semibold normal-case tracking-normal text-white">{value || "--"}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3 px-5 pb-4">
          <BreakPlayerCard
            label="Leading"
            name={leftName}
            score={leftScore}
            avg={state.avgFormattedA ?? formatAverage(leftScore, innings)}
            hr={state.bestRunA ?? 0}
            acc={formatPercent(state.accPercentA)}
            secPer={formatSeconds(state.secondsPerInningA)}
            playerTime={formatMMSS(state.playerATimeSeconds)}
            tone="light"
          />
          <div className="flex min-w-[128px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/15 px-4 text-center">
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">Total time</div>
            <div className="text-xl font-semibold text-white/80">{totalTime}</div>
            <div className="mt-3 text-4xl font-black text-white/70">VS</div>
            <div className="mt-3 text-[11px] uppercase tracking-[0.24em] text-white/45">Innings</div>
            <div className="text-3xl font-black text-white/90">{innings || "--"}</div>
          </div>
          <BreakPlayerCard
            label="Chasing"
            name={rightName}
            score={rightScore}
            avg={state.avgFormattedB ?? formatAverage(rightScore, innings)}
            hr={state.bestRunB ?? 0}
            acc={formatPercent(state.accPercentB)}
            secPer={formatSeconds(state.secondsPerInningB)}
            playerTime={formatMMSS(state.playerBTimeSeconds)}
            tone="yellow"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 px-5 pb-4">
          <BreakStatsGrid
            avg={state.avgFormattedA ?? formatAverage(leftScore, innings)}
            hr={state.bestRunA ?? 0}
            acc={formatPercent(state.accPercentA)}
            secPer={formatSeconds(state.secondsPerInningA)}
            playerTime={formatMMSS(state.playerATimeSeconds)}
            target={formatTargetPct(leftScore, state.targetPointsA)}
          />
          <BreakStatsGrid
            avg={state.avgFormattedB ?? formatAverage(rightScore, innings)}
            hr={state.bestRunB ?? 0}
            acc={formatPercent(state.accPercentB)}
            secPer={formatSeconds(state.secondsPerInningB)}
            playerTime={formatMMSS(state.playerBTimeSeconds)}
            target={formatTargetPct(rightScore, state.targetPointsB)}
          />
        </div>

        <div className="px-5 pb-5">
          <LiveSheetScoreChart
            data={chartRows}
            height={288}
            noAnim
            playerAName={leftName}
            playerBName={rightName}
          />
        </div>
      </div>
    </div>
  );
}

function formatMMSS(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return "--";
  const totalSeconds = Math.max(0, Math.floor(Number(value)));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatAverage(score?: number | null, innings?: number | null) {
  const safeScore = Number(score ?? 0);
  const safeInnings = Number(innings ?? 0);
  if (!Number.isFinite(safeScore) || !Number.isFinite(safeInnings) || safeInnings <= 0) return "0.000";
  return (safeScore / safeInnings).toFixed(3);
}

function formatPercent(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return "--";
  return `${Number(value).toFixed(1)}%`;
}

function formatSeconds(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return "--";
  return `${Math.max(0, Number(value)).toFixed(1)}s`;
}

function formatTargetPct(score?: number | null, target?: number | null) {
  const safeTarget = Number(target ?? 0);
  if (!Number.isFinite(safeTarget) || safeTarget <= 0) return "--";
  const pct = Math.min(100, Math.max(0, (Number(score ?? 0) / safeTarget) * 100));
  return `${pct.toFixed(0)}%`;
}

function BreakPlayerCard({
  label,
  name,
  score,
  avg,
  hr,
  acc,
  secPer,
  playerTime,
  tone,
}: {
  label: string;
  name: string;
  score: number;
  avg: string;
  hr: number;
  acc: string;
  secPer: string;
  playerTime: string;
  tone: "light" | "yellow";
}) {
  return (
    <div className={`rounded-2xl border p-4 text-center ${tone === "yellow" ? "border-yellow-300/45 bg-yellow-400/25" : "border-white/80 bg-white/85 text-slate-950"}`}>
      <div className={`text-xs uppercase tracking-[0.35em] ${tone === "yellow" ? "text-white/65" : "text-slate-600"}`}>{label}</div>
      <div className="mt-1 text-xl font-semibold">{name}</div>
      <div className="mt-2 text-7xl font-black leading-none">{score}</div>
      <div className={`mt-3 grid grid-cols-2 gap-2 text-xs ${tone === "yellow" ? "text-white" : "text-slate-900"}`}>
        <span>AVG {avg}</span>
        <span>HR {hr}</span>
        <span>ACC {acc}</span>
        <span>{secPer}</span>
        <span className="col-span-2">Time {playerTime}</span>
      </div>
    </div>
  );
}

function BreakStatsGrid({
  avg,
  hr,
  acc,
  secPer,
  playerTime,
  target,
}: {
  avg: string;
  hr: number;
  acc: string;
  secPer: string;
  playerTime: string;
  target: string;
}) {
  const stats = [
    ["AVG", avg],
    ["H.R.", String(hr)],
    ["ACC", acc],
    ["SEC/P", secPer],
    ["P TIME", playerTime],
    ["TARGET", target],
  ];
  return (
    <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/10 p-2.5">
      {stats.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-center">
          <div className="text-[10px] uppercase tracking-[0.24em] text-white/45">{label}</div>
          <div className="text-lg font-bold text-white">{value}</div>
        </div>
      ))}
    </div>
  );
}

function CenteredMessage({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "muted" | "error";
}) {
  return (
    <div
      className={`min-h-screen flex items-center justify-center text-sm ${
        tone === "error" ? "text-red-400" : "text-white/80"
      }`}
      style={{ backgroundColor: "transparent" }}
    >
      {children}
    </div>
  );
}

function ScoreOverlayCard({
  item,
  width,
  height,
  obsSafe,
  template,
}: {
  item: LiveScoreItem;
  width: number;
  height: number;
  obsSafe: boolean;
  template: OverlayTemplate;
}) {
  const state = item.state;
  const compact = height <= 180;
  const targetLabel = state.targetPointsA ?? state.targetPointsB ?? 40;
  const innings = state.inningsCount ?? 0;
  const topTournamentLabel = state.tournamentName ?? "Live Match";
  const topStageLabel = stripLeadingWord(state.stageName ?? "-", "stage") ?? "-";
  const topTableLabel = stripLeadingWord(state.tableName ?? "-", "table") ?? "-";
  const currentLabel =
    state.current === "A" ? "A" : state.current === "B" ? "B" : null;
  const totalBlocks = 40;
  const elapsedBlocks = Math.min(totalBlocks, Math.max(0, Number(state.progress ?? 0)));
  const remainingBlocks = Math.max(totalBlocks - elapsedBlocks, 0);
  const remainingColorClass =
    remainingBlocks > 20
      ? "text-emerald-300"
      : remainingBlocks > 10
        ? "text-orange-300"
        : "text-red-500";

  if (template === "2") {
    return (
      <RoyalProOverlayCard
        item={item}
        width={width}
        height={height}
        obsSafe={obsSafe}
      />
    );
  }

  if (template === "3") {
    return (
      <TemplateThreeOverlayCard
        item={item}
        width={width}
        height={height}
        obsSafe={obsSafe}
      />
    );
  }

  if (template === "4") {
    return (
      <TemplateFourOverlayCard
        item={item}
        width={width}
        height={height}
        obsSafe={obsSafe}
      />
    );
  }

  if (template === "5") {
    return (
      <TemplateFiveOverlayCard
        item={item}
        width={width}
        height={height}
        obsSafe={obsSafe}
      />
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.6)] text-white"
      style={{
        width,
        height,
        minWidth: width,
        minHeight: height,
        transform: obsSafe ? "translateZ(0)" : undefined,
        backfaceVisibility: obsSafe ? "hidden" : undefined,
        WebkitFontSmoothing: obsSafe ? "antialiased" : undefined,
        textRendering: obsSafe ? "geometricPrecision" : undefined,
        fontFamily:
          "'Barlow Condensed', 'Barlow', 'Roboto Condensed', 'Inter', system-ui, sans-serif",
      }}
    >
      <div className="relative h-full w-full bg-gradient-to-br from-sky-900 via-sky-700 to-cyan-600">
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/30" />
        <div className="relative flex h-full flex-col">
          <header
            className={`${
              compact ? "px-4 pt-2 pb-1" : "px-5 pt-3 pb-2"
            } flex items-center justify-between gap-3`}
          >
            <span
              className="min-w-0 flex-1 truncate text-sm tracking-[0.12em] text-white"
              title={`${topTournamentLabel} / Stage ${topStageLabel} / Table ${topTableLabel}`}
            >
              {topTournamentLabel} / Stage {topStageLabel} / Table {topTableLabel}
            </span>
            <span className={`${compact ? "text-[10px]" : "text-xs"} whitespace-nowrap uppercase tracking-[0.3em] text-white/80`}>
              Target {targetLabel}
            </span>
          </header>

          <div className="flex flex-1 items-stretch">
            <div className={`flex min-w-[72px] flex-col items-center justify-center bg-black/45 ${compact ? "px-3" : "px-4"}`}>
              <div className={`${compact ? "text-3xl" : "text-4xl"} font-black leading-none`}>
                {innings}
              </div>
              <div className={`${compact ? "text-[10px]" : "text-sm"} mt-1 uppercase tracking-[0.3em] text-white/70`}>
                Inn.
              </div>
            </div>

            <div className="flex flex-1 flex-col">
              <PlayerRow
                name={formatOverlayPlayerName(state.playerAName)}
                score={state.scoreA ?? 0}
                run={state.liveRunA ?? state.runA ?? 0}
                active={currentLabel === "A"}
                countryCode={resolveCountryCode(state.playerACountry)}
                timeouts={state.timeoutsA ?? 0}
                maxTimeouts={state.maxTimeoutsA ?? 0}
              />
              <PlayerRow
                name={formatOverlayPlayerName(state.playerBName)}
                score={state.scoreB ?? 0}
                run={state.liveRunB ?? state.runB ?? 0}
                active={currentLabel === "B"}
                countryCode={resolveCountryCode(state.playerBCountry)}
                timeouts={state.timeoutsB ?? 0}
                maxTimeouts={state.maxTimeoutsB ?? 0}
              />
            </div>
          </div>

          <footer className={`${compact ? "px-4 pb-2 pt-1.5" : "px-5 pb-3 pt-2"} bg-black/35`}>
            <div className={`flex items-center ${compact ? "gap-2" : "gap-3"}`}>
              <div
                className={`${compact ? "h-8 w-10 text-xl" : "h-10 w-12 text-2xl"} ${remainingColorClass} flex items-center justify-center rounded-md bg-slate-900/90 font-black`}
              >
                {remainingBlocks}
              </div>
              <div className="flex flex-1 gap-[3px]">
                {Array.from({ length: totalBlocks }).map((_, idx) => {
                  const isLit = idx >= elapsedBlocks;
                  const zoneClass =
                    idx < 20
                      ? "bg-emerald-400"
                      : idx < 30
                        ? "bg-orange-400"
                        : "bg-red-500";
                  return (
                    <span
                      key={idx}
                      className={`flex-1 rounded-sm ${isLit ? zoneClass : "bg-white/15"}`}
                      style={{ height: compact ? 14 : 20 }}
                    />
                  );
                })}
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

function RoyalProOverlayCard({
  item,
  width,
  height,
  obsSafe,
}: {
  item: LiveScoreItem;
  width: number;
  height: number;
  obsSafe: boolean;
}) {
  const state = item.state;
  const tournament = state.tournamentName ?? "Live Match";
  const stage = stripLeadingWord(state.stageName ?? "Stage", "stage") ?? "Stage";
  const table = stripLeadingWord(state.tableName ?? "Table", "table") ?? "Table";
  const leftName = formatOverlayPlayerName(state.playerAName);
  const rightName = formatOverlayPlayerName(state.playerBName);
  const leftScore = state.scoreA ?? 0;
  const rightScore = state.scoreB ?? 0;
  const leftAvg = formatAverageValue(leftScore, state.inningsCount);
  const rightAvg = formatAverageValue(rightScore, state.inningsCount);
  const leftRun = state.liveRunA ?? state.runA ?? 0;
  const rightRun = state.liveRunB ?? state.runB ?? 0;
  const leftHr = state.bestRunA ?? 0;
  const rightHr = state.bestRunB ?? 0;
  const innings = state.inningsCount ?? 0;
  const raceTo = state.targetPointsA ?? state.targetPointsB ?? 40;
  const leftFlag = resolveCountryCode(state.playerACountry);
  const rightFlag = resolveCountryCode(state.playerBCountry);
  const activeSide = state.current;
  const overlayWidth = Math.round(width * 0.56);
  const overlayBottom = Math.max(260, Math.round(height * 0.25));
  const topBarHeight = Math.max(18, Math.round(height * 0.024));
  const mainBarHeight = Math.max(44, Math.round(height * 0.064));
  const subBarHeight = Math.max(26, Math.round(height * 0.034));

  return (
    <div
      className="relative text-white"
      style={{
        width,
        height,
        minWidth: width,
        minHeight: height,
        transform: obsSafe ? "translateZ(0)" : undefined,
        backfaceVisibility: obsSafe ? "hidden" : undefined,
        WebkitFontSmoothing: obsSafe ? "antialiased" : undefined,
        textRendering: obsSafe ? "geometricPrecision" : undefined,
        fontFamily:
          "'Barlow Condensed', 'Barlow', 'Roboto Condensed', 'Inter', system-ui, sans-serif",
      }}
    >
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ width: overlayWidth, bottom: overlayBottom }}
      >
        <div className="relative">
          <div className="overflow-hidden border border-white/10 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
            <div
              className="flex items-center justify-between gap-4 bg-[linear-gradient(180deg,#79d3ff_0%,#45b7f5_100%)] px-5 text-[13px] font-semibold uppercase tracking-[0.14em] text-slate-950"
              style={{ minHeight: topBarHeight }}
            >
              <span className="min-w-0 truncate">
                {tournament} • Stage {stage} • Table {table}
              </span>
              <span className="shrink-0 whitespace-nowrap font-black">
                Race To {raceTo}
              </span>
            </div>

            <div
              className="grid items-stretch"
              style={{
                gridTemplateColumns: "minmax(190px,0.75fr) auto auto auto minmax(190px,0.75fr)",
                minHeight: mainBarHeight,
                background:
                  "linear-gradient(180deg, rgba(18,44,122,0.98) 0%, rgba(13,32,94,0.98) 100%)",
              }}
            >
              <div className="flex min-w-0 items-center justify-end gap-3 px-3 pr-2">
                <SmallFlag countryCode={leftFlag} />
                <div className="min-w-0 truncate text-right text-[19px] font-semibold leading-none text-white">
                  {leftName}
                </div>
              </div>

              <div className="flex min-w-[68px] items-center justify-center border-l border-r border-white/10 bg-[linear-gradient(180deg,#3e5fb3_0%,#2a4586_100%)] px-3 text-[36px] font-black leading-none">
                {leftScore}
              </div>
              <div className="flex min-w-[40px] items-center justify-center border-r border-white/10 bg-[linear-gradient(180deg,#314b93_0%,#24366d_100%)] px-2 text-[26px] font-black text-white/92">
                -
              </div>
              <div className="flex min-w-[68px] items-center justify-center border-r border-white/10 bg-[linear-gradient(180deg,#3e5fb3_0%,#2a4586_100%)] px-3 text-[36px] font-black leading-none">
                {rightScore}
              </div>

              <div className="flex min-w-0 items-center gap-3 px-3 pl-2">
                <div className="min-w-0 truncate text-left text-[19px] font-semibold leading-none text-white">
                  {rightName}
                </div>
                <SmallFlag countryCode={rightFlag} />
              </div>
            </div>

            <div
              className="grid grid-cols-3 items-center border-t border-white/10 bg-[linear-gradient(180deg,#377fd7_0%,#2a67be_100%)] px-6 text-[18px] text-white"
              style={{ minHeight: subBarHeight }}
            >
              <div className="flex items-center justify-between gap-4 pr-6">
                <span className="min-w-0 text-left">
                  {activeSide === "A" ? (
                    <>
                      Run <span className="font-black text-cyan-100">{leftRun}</span>
                    </>
                  ) : null}
                </span>
                <span className="min-w-0 text-right">
                  Avg <span className="font-black text-cyan-100">{leftAvg}</span>
                  <span className="ml-3">
                    H.R. <span className="font-black text-cyan-100">{leftHr}</span>
                  </span>
                </span>
              </div>
              <div className="text-center font-black uppercase tracking-[0.08em]">
                Innings {innings}
              </div>
              <div className="flex items-center justify-between gap-4 pl-6">
                <span className="min-w-0 text-left">
                  Avg <span className="font-black text-cyan-100">{rightAvg}</span>
                  <span className="ml-3">
                    H.R. <span className="font-black text-cyan-100">{rightHr}</span>
                  </span>
                </span>
                <span className="min-w-0 text-right">
                  {activeSide === "B" ? (
                    <>
                      Run <span className="font-black text-cyan-100">{rightRun}</span>
                    </>
                  ) : null}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateThreeOverlayCard({
  item,
  width,
  height,
  obsSafe,
}: {
  item: LiveScoreItem;
  width: number;
  height: number;
  obsSafe: boolean;
}) {
  const state = item.state;
  const innings = state.inningsCount ?? 0;
  const leftScore = state.scoreA ?? 0;
  const rightScore = state.scoreB ?? 0;
  const leftRun = state.liveRunA ?? state.runA ?? 0;
  const rightRun = state.liveRunB ?? state.runB ?? 0;
  const leftAvg = formatAverageValue(leftScore, state.inningsCount);
  const rightAvg = formatAverageValue(rightScore, state.inningsCount);
  const leftHr = state.bestRunA ?? 0;
  const rightHr = state.bestRunB ?? 0;
  const target = state.targetPointsA ?? state.targetPointsB ?? null;
  const leftTimeouts = state.timeoutsA ?? 0;
  const rightTimeouts = state.timeoutsB ?? 0;
  const leftMaxTimeouts = state.maxTimeoutsA ?? 3;
  const rightMaxTimeouts = state.maxTimeoutsB ?? 3;
  const leftFlag = resolveCountryCode(state.playerACountry);
  const rightFlag = resolveCountryCode(state.playerBCountry);
  const leftName = normalizeString(state.playerAName) ?? "Player 1";
  const rightName = normalizeString(state.playerBName) ?? "Player 2";
  const nameCharLimit = Math.max(16, Math.min(24, Math.round(width * 0.018)));
  const displayLeftName = truncateOverlayLabel(leftName, nameCharLimit);
  const displayRightName = truncateOverlayLabel(rightName, nameCharLimit);
  const activeSide = state.current;
  const tournament = state.tournamentName ?? "Live Match";
  const stage = stripLeadingWord(state.stageName ?? "-", "stage") ?? "-";
  const table = stripLeadingWord(state.tableName ?? "-", "table") ?? "-";
  const totalBlocks = 40;
  const elapsedBlocks = Math.min(totalBlocks, Math.max(0, Number(state.progress ?? 0)));
  const remainingBlocks = Math.max(totalBlocks - elapsedBlocks, 0);
  const overlayHeight = 60;
  const statsColumnWidth = Math.max(92, Math.min(124, Math.round(width * 0.11)));
  const topStripWidth = Math.max(620, Math.min(width - 24, Math.round(width * 0.82)));
  const timeStripWidth = Math.max(240, Math.min(340, Math.round(width * 0.3)));

  return (
    <div
      className="relative text-white"
      style={{
        width: "100%",
        maxWidth: width,
        height: Math.min(height, overlayHeight),
        minWidth: width,
        minHeight: overlayHeight,
        transform: obsSafe ? "translateZ(0)" : undefined,
        backfaceVisibility: obsSafe ? "hidden" : undefined,
        WebkitFontSmoothing: obsSafe ? "antialiased" : undefined,
        textRendering: obsSafe ? "geometricPrecision" : undefined,
        fontFamily:
          "'Barlow Condensed', 'Barlow', 'Roboto Condensed', 'Inter', system-ui, sans-serif",
      }}
    >
      <div className="flex h-5 w-full items-end justify-center overflow-visible">
        <div
          className="grid h-5 items-center rounded-t-[10px] px-4 text-[11px] font-normal tracking-[0.05em] text-slate-800"
          style={{
            width: topStripWidth,
            backgroundColor: "#d6d9e1",
            gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)",
            columnGap: 12,
          }}
        >
          <span className="truncate whitespace-nowrap">
            {tournament} / Stage {stage}
          </span>
          <TimeStrip
            remainingBlocks={remainingBlocks}
            elapsedBlocks={elapsedBlocks}
            totalBlocks={totalBlocks}
            compact
            barWidth={timeStripWidth}
          />
          <span className="justify-self-end whitespace-nowrap text-[12px] tracking-[0.06em] text-slate-950">
            {`Table ${table}${target ? ` / Race to ${target}` : ""}`}
          </span>
        </div>
      </div>

      <div
        className="grid h-[42px] w-full items-center gap-2 px-3 text-white"
        style={{
          backgroundColor: "#8a909d",
          gridTemplateColumns: `${statsColumnWidth}px minmax(0,1fr) auto auto auto minmax(0,1fr) ${statsColumnWidth}px`,
        }}
      >
        <CompactOverlayStats align="left" avg={leftAvg} hr={leftHr} />

        <div className="flex min-w-0 items-center justify-end pr-1">
          <div className="flex min-w-0 max-w-[330px] items-center gap-2">
            {leftFlag ? <SmallFlag countryCode={leftFlag} /> : null}
            <div className="flex min-w-0 flex-col items-end gap-[3px] overflow-hidden">
              <span className="w-full overflow-hidden whitespace-nowrap text-right text-[17px] font-normal leading-none tracking-[0.03em]">
                {displayLeftName}
              </span>
              <HorizontalTimeoutTicks
                activeCount={leftTimeouts}
                totalCount={leftMaxTimeouts}
                align="right"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center">
            {activeSide === "A" ? <OverlayRunCircle run={leftRun} /> : null}
          </div>
          <div className="flex h-6 w-[11px] shrink-0 items-center justify-center">
            {activeSide === "A" ? <TurnArrow side="right" active /> : null}
          </div>
          <OverlayScoreBox score={leftScore} tone="light" />
        </div>

        <div className="z-10 flex h-7 items-center justify-center px-2 text-[15px] font-normal leading-none tracking-[0.05em] text-white">
          <span className="whitespace-nowrap">
            ({innings})
          </span>
        </div>

        <div className="flex items-center justify-start gap-1.5">
          <OverlayScoreBox score={rightScore} tone="accent" />
          <div className="flex h-6 w-[11px] shrink-0 items-center justify-center">
            {activeSide === "B" ? <TurnArrow side="left" active /> : null}
          </div>
          <div className="flex h-6 w-6 shrink-0 items-center justify-center">
            {activeSide === "B" ? <OverlayRunCircle run={rightRun} /> : null}
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-start pl-1">
          <div className="flex min-w-0 max-w-[330px] items-center gap-2">
            <div className="flex min-w-0 flex-col items-start gap-[3px] overflow-hidden">
              <span className="w-full overflow-hidden whitespace-nowrap text-left text-[17px] font-normal leading-none tracking-[0.03em]">
                {displayRightName}
              </span>
              <HorizontalTimeoutTicks
                activeCount={rightTimeouts}
                totalCount={rightMaxTimeouts}
                align="left"
              />
            </div>
            {rightFlag ? <SmallFlag countryCode={rightFlag} /> : null}
          </div>
        </div>

        <CompactOverlayStats align="right" avg={rightAvg} hr={rightHr} />
      </div>
    </div>
  );
}

function TemplateFourOverlayCard({
  item,
  width,
  height,
  obsSafe,
  variant = "default",
}: {
  item: LiveScoreItem;
  width: number;
  height: number;
  obsSafe: boolean;
  variant?: "default" | "template5";
}) {
  const isTemplateFive = variant === "template5";
  const state = item.state;
  const innings = state.inningsCount ?? 0;
  const leftScore = state.scoreA ?? 0;
  const rightScore = state.scoreB ?? 0;
  const leftRun = state.liveRunA ?? state.runA ?? 0;
  const rightRun = state.liveRunB ?? state.runB ?? 0;
  const leftAvg = formatAverageValue(leftScore, state.inningsCount);
  const rightAvg = formatAverageValue(rightScore, state.inningsCount);
  const leftHr = state.bestRunA ?? 0;
  const rightHr = state.bestRunB ?? 0;
  const target = state.targetPointsA ?? state.targetPointsB ?? null;
  const leftTimeouts = state.timeoutsA ?? 0;
  const rightTimeouts = state.timeoutsB ?? 0;
  const leftMaxTimeouts = state.maxTimeoutsA ?? 3;
  const rightMaxTimeouts = state.maxTimeoutsB ?? 3;
  const leftFlag = resolveCountryCode(state.playerACountry);
  const rightFlag = resolveCountryCode(state.playerBCountry);
  const leftName = normalizeString(state.playerAName) ?? "Player 1";
  const rightName = normalizeString(state.playerBName) ?? "Player 2";
  const nameCharLimit = Math.max(18, Math.min(30, Math.round(width * 0.022)));
  const displayLeftName = truncateOverlayLabel(leftName, nameCharLimit);
  const displayRightName = truncateOverlayLabel(rightName, nameCharLimit);
  const activeSide = state.current;
  const tournament = state.tournamentName ?? "Live Match";
  const stage = stripLeadingWord(state.stageName ?? "-", "stage") ?? "-";
  const table = stripLeadingWord(state.tableName ?? "-", "table") ?? "-";
  const totalBlocks = 40;
  const elapsedBlocks = Math.min(totalBlocks, Math.max(0, Number(state.progress ?? 0)));
  const remainingBlocks = Math.max(totalBlocks - elapsedBlocks, 0);
  const topStripHeight = isTemplateFive ? 34 : 20;
  const mainBarHeight = isTemplateFive ? 50 : 40;
  const overlayHeight = topStripHeight + mainBarHeight;
  const statsColumnWidth = isTemplateFive
    ? Math.max(92, Math.min(132, Math.round(width * 0.115)))
    : Math.max(76, Math.min(110, Math.round(width * 0.11)));
  const topStripWidth = isTemplateFive
    ? Math.max(620, Math.min(width - 20, Math.round(width * 0.86)))
    : Math.max(560, Math.min(width - 24, Math.round(width * 0.8)));
  const timeStripWidth = isTemplateFive
    ? Math.max(240, Math.min(360, Math.round(width * 0.28)))
    : Math.max(180, Math.min(260, Math.round(width * 0.26)));
  const topStripColor = isTemplateFive ? "#4e58b8" : "#d6d9e1";
  const mainBarColor = isTemplateFive ? "#2b2f7f" : "#8a909d";
  const topTextSize = isTemplateFive ? 20 : 11;
  const raceTextSize = isTemplateFive ? 20 : 12;
  const nameTextSize = isTemplateFive ? 28 : 15;
  const inningsTextSize = isTemplateFive ? 22 : 15;

  return (
    <div
      className="relative text-white"
      style={{
        width: "100%",
        maxWidth: width,
        height: Math.min(height, overlayHeight),
        minWidth: width,
        minHeight: overlayHeight,
        transform: obsSafe ? "translateZ(0)" : undefined,
        backfaceVisibility: obsSafe ? "hidden" : undefined,
        WebkitFontSmoothing: obsSafe ? "antialiased" : undefined,
        textRendering: obsSafe ? "geometricPrecision" : undefined,
        fontFamily:
          "'Barlow Condensed', 'Barlow', 'Roboto Condensed', 'Inter', system-ui, sans-serif",
      }}
    >
      <div
        className="flex w-full items-end justify-center overflow-visible"
        style={{ height: topStripHeight }}
      >
        <div
          className={`grid items-center rounded-t-[10px] px-4 font-normal tracking-[0.05em] ${
            isTemplateFive ? "text-white" : "text-slate-900"
          }`}
          style={{
            width: topStripWidth,
            height: topStripHeight,
            backgroundColor: topStripColor,
            gridTemplateColumns: isTemplateFive
              ? "minmax(0,1fr) auto minmax(0,1fr)"
              : "minmax(0,1fr) auto auto",
            columnGap: 12,
            fontSize: topTextSize,
          }}
        >
          <span className="truncate whitespace-nowrap">
            {isTemplateFive ? tournament : `${tournament} / S ${stage} / T ${table}`}
          </span>
          <TimeStrip
            remainingBlocks={remainingBlocks}
            elapsedBlocks={elapsedBlocks}
            totalBlocks={totalBlocks}
            compact
            barWidth={timeStripWidth}
            large={isTemplateFive}
          />
          <span
            className={`justify-self-end whitespace-nowrap font-medium tracking-[0.06em] ${
              isTemplateFive ? "text-white" : "text-slate-950"
            }`}
            style={{ fontSize: raceTextSize }}
          >
            {isTemplateFive
              ? `S ${stage} / T ${table}${target ? ` / Race ${target}` : ""}`
              : target
                ? `Race ${target}`
                : ""}
          </span>
        </div>
      </div>

      <div
        className={`grid w-full items-center px-3 text-white ${isTemplateFive ? "rounded-[10px]" : ""}`}
        style={{
          height: mainBarHeight,
          backgroundColor: mainBarColor,
          gridTemplateColumns: `${statsColumnWidth}px minmax(0,1fr) auto auto auto minmax(0,1fr) ${statsColumnWidth}px`,
          columnGap: isTemplateFive ? 4 : 8,
        }}
      >
        <CompactOverlayStats align="left" avg={leftAvg} hr={leftHr} large={isTemplateFive} />

        <div
          className="flex min-w-0 items-center justify-end gap-2 overflow-hidden"
          style={{ paddingRight: isTemplateFive ? 14 : 0 }}
        >
          <CompactTimeoutTicks
            activeCount={leftTimeouts}
            totalCount={leftMaxTimeouts}
            reverse={false}
            large={isTemplateFive}
          />
          {leftFlag ? <SmallFlag countryCode={leftFlag} large={isTemplateFive} /> : null}
          <span
            className="min-w-0 truncate font-normal leading-none tracking-[0.03em]"
            style={{ fontSize: nameTextSize }}
          >
            {isTemplateFive ? formatTemplateFivePlayerName(leftName) : leftName}
          </span>
        </div>

        <div className={`flex items-center justify-end ${isTemplateFive ? "gap-2.5" : "gap-1.5"}`}>
          <div className="flex h-6 w-[11px] shrink-0 items-center justify-center">
            {activeSide === "A" ? <TurnArrow side="right" active /> : null}
          </div>
          <div className="flex h-6 w-6 shrink-0 items-center justify-center">
            {activeSide === "A" ? <OverlayRunCircle run={leftRun} large={isTemplateFive} /> : null}
          </div>
          <OverlayScoreBox score={leftScore} tone="light" large={isTemplateFive} />
        </div>

        <div
          className="flex h-8 items-center justify-center font-normal leading-none tracking-[0.04em] text-white"
          style={{
            fontSize: inningsTextSize,
            minWidth: isTemplateFive ? 42 : 44,
            paddingLeft: isTemplateFive ? 2 : 8,
            paddingRight: isTemplateFive ? 2 : 8,
          }}
        >
          ({innings})
        </div>

        <div className={`flex items-center justify-start ${isTemplateFive ? "gap-2.5" : "gap-1.5"}`}>
          <OverlayScoreBox score={rightScore} tone="accent" large={isTemplateFive} />
          <div className="flex h-6 w-6 shrink-0 items-center justify-center">
            {activeSide === "B" ? <OverlayRunCircle run={rightRun} large={isTemplateFive} /> : null}
          </div>
          <div className="flex h-6 w-[11px] shrink-0 items-center justify-center">
            {activeSide === "B" ? <TurnArrow side="left" active /> : null}
          </div>
        </div>

        <div
          className="flex min-w-0 items-center gap-2 overflow-hidden"
          style={{ paddingLeft: isTemplateFive ? 14 : 0 }}
        >
          <span
            className="min-w-0 truncate font-normal leading-none tracking-[0.03em]"
            style={{ fontSize: nameTextSize }}
          >
            {isTemplateFive ? formatTemplateFivePlayerName(rightName) : rightName}
          </span>
          {rightFlag ? <SmallFlag countryCode={rightFlag} large={isTemplateFive} /> : null}
          <CompactTimeoutTicks
            activeCount={rightTimeouts}
            totalCount={rightMaxTimeouts}
            reverse
            large={isTemplateFive}
          />
        </div>

        <CompactOverlayStats align="right" avg={rightAvg} hr={rightHr} large={isTemplateFive} />
      </div>
    </div>
  );
}

function TemplateFiveOverlayCard({
  item,
  width,
  height,
  obsSafe,
}: {
  item: LiveScoreItem;
  width: number;
  height: number;
  obsSafe: boolean;
}) {
  const [viewportSize, setViewportSize] = React.useState<{ width: number; height: number } | null>(null);

  React.useEffect(() => {
    const updateViewportSize = () => {
      setViewportSize({
        width: window.innerWidth || width,
        height: window.innerHeight || height,
      });
    };

    updateViewportSize();
    window.addEventListener("resize", updateViewportSize);
    return () => window.removeEventListener("resize", updateViewportSize);
  }, [height, width]);

  const availableWidth = viewportSize?.width ?? width;
  const availableHeight = viewportSize?.height ?? height;
  const overlayWidth = Math.max(360, Math.round(availableWidth * 0.7));
  const overlayBottom = Math.max(12, Math.round(availableHeight * 0.04));

  return (
    <div
      className="relative text-white"
      style={{
        width: "100vw",
        height: "100vh",
        minWidth: 0,
        minHeight: 0,
        transform: obsSafe ? "translateZ(0)" : undefined,
        backfaceVisibility: obsSafe ? "hidden" : undefined,
        WebkitFontSmoothing: obsSafe ? "antialiased" : undefined,
        textRendering: obsSafe ? "geometricPrecision" : undefined,
        fontFamily:
          "'Barlow Condensed', 'Barlow', 'Roboto Condensed', 'Inter', system-ui, sans-serif",
      }}
    >
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          width: overlayWidth,
          bottom: overlayBottom,
        }}
      >
        <TemplateFourOverlayCard
          item={item}
          width={overlayWidth}
          height={availableHeight}
          obsSafe={obsSafe}
          variant="template5"
        />
      </div>
    </div>
  );
}

function TimeStrip({
  remainingBlocks,
  elapsedBlocks,
  totalBlocks,
  compact,
  barWidth,
  large,
}: {
  remainingBlocks: number;
  elapsedBlocks: number;
  totalBlocks: number;
  compact?: boolean;
  barWidth?: number;
  large?: boolean;
}) {
  const remainingColorClass =
    remainingBlocks > 20
      ? "text-emerald-200"
      : remainingBlocks > 10
        ? "text-amber-200"
        : "text-red-200";

  return (
    <div className={`flex items-center rounded-full bg-slate-800/95 px-3 py-1 ${compact ? "gap-2.5" : "gap-3"}`}>
      <div className={`${large ? "text-[16px]" : compact ? "text-[11px]" : "text-[13px]"} font-normal leading-none ${remainingColorClass}`}>
        {remainingBlocks}
      </div>
      <div
        className="flex gap-[2px]"
        style={{ width: barWidth ?? (compact ? 460 : 320) }}
      >
        {Array.from({ length: totalBlocks }).map((_, index) => {
          const isRemaining = index >= elapsedBlocks;
          const zoneClass =
            index < 20
              ? "bg-emerald-400"
              : index < 30
                ? "bg-amber-300"
                : "bg-red-400";
          return (
            <span
              key={index}
              className={`${large ? "h-4" : compact ? "h-3.5" : "h-5"} flex-1 rounded-[1px] ${isRemaining ? zoneClass : "bg-white/20"}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function SmallFlag({ countryCode, large }: { countryCode: string | null; large?: boolean }) {
  const sizeClass = large ? "h-7 w-[42px]" : "h-4 w-6";

  if (!countryCode) {
    return <div className={`${sizeClass} rounded-[2px] bg-white/12`} />;
  }

  return (
    <img
      src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
      alt={countryCode}
      width={24}
      height={16}
      className={`${sizeClass} rounded-[2px] object-cover`}
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}

function OverlayMiniStat({
  label,
  value,
  align,
  className,
}: {
  label: string;
  value: string | number;
  align: "left" | "right";
  className?: string;
}) {
  return (
    <div
      className={`flex shrink-0 items-baseline gap-2.5 leading-none ${
        align === "right" ? "text-right" : "text-left"
      } ${className ?? ""}`}
    >
      <span className="text-[13px] font-normal uppercase tracking-[0.12em] text-white/95">
        {label}
      </span>
      <span className="text-[17px] font-normal text-white">{value}</span>
    </div>
  );
}

function CompactOverlayStats({
  avg,
  hr,
  align,
  large,
}: {
  avg: string;
  hr: number;
  align: "left" | "right";
  large?: boolean;
}) {
  const justifyClass = align === "right" ? "justify-end text-right" : "justify-start text-left";
  const statTextSize = large ? "text-[19px]" : "text-[12px]";

  return (
    <div className={`flex min-w-0 items-center gap-4 leading-none whitespace-nowrap ${justifyClass}`}>
      <span className={`${statTextSize} font-normal uppercase tracking-[0.08em] text-white/92`}>
        AVG <span className="font-semibold text-white">{avg}</span>
      </span>
      <span className={`${statTextSize} font-normal uppercase tracking-[0.08em] text-white/92`}>
        H.R. <span className="font-semibold text-white">{hr}</span>
      </span>
    </div>
  );
}

function OverlayScoreBox({
  score,
  tone,
  large,
}: {
  score: number;
  tone: "light" | "accent";
  large?: boolean;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-[5px] border font-semibold leading-none ${
        large ? "h-9 min-w-[60px] px-4 text-[30px]" : "h-7 min-w-[46px] px-3 text-[21px]"
      } ${
        tone === "accent"
          ? "border-slate-950/35 bg-amber-400 text-slate-950"
          : "border-slate-950/20 bg-white text-slate-950"
      }`}
    >
      {score}
    </div>
  );
}

function OverlayRunCircle({ run, large }: { run: number; large?: boolean }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full border border-slate-950/20 bg-white font-normal leading-none text-slate-950 ${
        large ? "h-9 w-9 text-[19px]" : "h-7 w-7 text-[14px]"
      }`}
    >
      {run}
    </div>
  );
}

function CompactTimeoutTicks({
  activeCount,
  totalCount,
  reverse,
  large,
}: {
  activeCount: number;
  totalCount: number;
  reverse?: boolean;
  large?: boolean;
}) {
  const safeTotal = Math.max(0, totalCount || 0) || 3;
  const usedCount = Math.min(Math.max(activeCount || 0, 0), safeTotal);
  const positions = Array.from({ length: safeTotal }, (_, index) => index);
  const orderedPositions = reverse ? [...positions].reverse() : positions;

  return (
    <div className={`flex shrink-0 items-center ${large ? "gap-1" : "gap-[3px]"}`}>
      {orderedPositions.map((index) => (
        <span
          key={index}
          className={`${large ? "h-7 w-[6px]" : "h-4 w-[4px]"} rounded-full ${
            index < usedCount ? "bg-slate-200/65" : "bg-emerald-400"
          }`}
        />
      ))}
    </div>
  );
}

function HorizontalTimeoutTicks({
  activeCount,
  totalCount,
  align,
}: {
  activeCount: number;
  totalCount: number;
  align: "left" | "right";
}) {
  const safeTotal = Math.max(0, totalCount || 0) || 3;
  const usedCount = Math.min(Math.max(activeCount || 0, 0), safeTotal);
  const positions = Array.from({ length: safeTotal }, (_, index) => index);
  const orderedPositions = align === "right" ? [...positions].reverse() : positions;

  return (
    <div className={`flex w-full items-center gap-[4px] ${align === "right" ? "justify-end" : "justify-start"}`}>
      {orderedPositions.map((index) => (
        <span
          key={index}
          className={`h-[4px] w-[18px] rounded-full ${
            index < usedCount ? "bg-slate-200/65" : "bg-emerald-400"
          }`}
        />
      ))}
    </div>
  );
}

function TurnArrow({
  side,
  active,
}: {
  side: "left" | "right";
  active: boolean;
}) {
  return (
    <div
      className={`h-0 w-0 shrink-0 ${active ? "opacity-100" : "opacity-25"}`}
      style={{
        borderTop: "7px solid transparent",
        borderBottom: "7px solid transparent",
        borderLeft: side === "right" ? "11px solid rgba(255,255,255,0.98)" : undefined,
        borderRight: side === "left" ? "11px solid rgba(255,255,255,0.98)" : undefined,
      }}
    />
  );
}

function formatAverageValue(score?: number | null, innings?: number | null) {
  const safeScore = Number(score ?? 0);
  const safeInnings = Number(innings ?? 0);
  if (!Number.isFinite(safeScore) || !Number.isFinite(safeInnings) || safeInnings <= 0) {
    return "0.000";
  }
  return (safeScore / safeInnings).toFixed(3);
}

function PortraitBadge({
  side,
  countryCode,
}: {
  side: "left" | "right";
  countryCode: string | null;
}) {
  return (
    <div
      className={`relative h-12 w-12 overflow-hidden rounded-[18%] border-2 border-[#11214e] bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.18),rgba(0,0,0,0.45))] shadow-[0_6px_16px_rgba(0,0,0,0.45)] ${
        side === "left" ? "ml-1" : "mr-1"
      }`}
      style={{
        clipPath:
          side === "left"
            ? "polygon(18% 0, 100% 0, 100% 100%, 0 100%, 0 22%)"
            : "polygon(0 0, 82% 0, 100% 22%, 100% 100%, 0 100%)",
      }}
    >
      <div className="flex h-full w-full items-end justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(0,0,0,0.36))]">
        <div className="mb-1 h-4 w-8 rounded-t-full bg-white/10" />
      </div>
    </div>
  );
}

function FlagOnly({ countryCode }: { countryCode: string | null }) {
  if (!countryCode) {
    return (
      <div className="flex h-[18px] w-7 items-center justify-center rounded-[2px] bg-white/8 text-[8px] font-bold text-white/55">
        --
      </div>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
      alt={countryCode}
      width={28}
      height={18}
      className="h-[18px] w-7 rounded-[2px] object-cover"
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}

function PlayerRow({
  name,
  score,
  run,
  active,
  countryCode,
  timeouts,
  maxTimeouts,
}: {
  name: string;
  score: number;
  run: number;
  active: boolean;
  countryCode: string | null;
  timeouts: number;
  maxTimeouts: number;
}) {
  return (
    <div
      className={`flex flex-1 items-center gap-3 border-t border-white/10 px-5 ${
        active ? "bg-sky-700/92" : "bg-sky-400/60"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <TimeoutTicks activeCount={timeouts} totalCount={maxTimeouts} />
        <FlagBadge name={name} countryCode={countryCode} />
        <span className="truncate text-xl font-semibold leading-none tracking-wide md:text-2xl">
          {name}
        </span>
      </div>
      <div className="ml-2 flex w-[148px] items-center justify-end gap-3">
        <div className="w-[60px] text-right text-4xl font-black">{score}</div>
        {active ? (
          <div className="w-[52px] rounded-lg bg-amber-300 px-3 py-1 text-center text-xl font-black text-slate-900 shadow-[0_0_12px_rgba(250,204,21,0.6)]">
            {run}
          </div>
        ) : (
          <div className="w-[52px] text-center text-xs uppercase tracking-[0.3em] text-white/40">
            -
          </div>
        )}
      </div>
    </div>
  );
}

function TimeoutTicks({
  activeCount,
  totalCount,
}: {
  activeCount: number;
  totalCount: number;
}) {
  const safeTotal = Math.max(0, totalCount || 0) || 3;
  const usedCount = Math.min(Math.max(activeCount || 0, 0), safeTotal);

  return (
    <div className="flex w-[14px] items-center justify-start gap-[3px]">
      {Array.from({ length: safeTotal }).map((_, index) => (
        <span
          key={index}
          className={`h-7 w-[5px] rounded-full ${
            index < usedCount ? "bg-slate-200/55" : "bg-emerald-400"
          }`}
        />
      ))}
    </div>
  );
}

function FlagBadge({
  name,
  countryCode,
}: {
  name: string;
  countryCode: string | null;
}) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "P";
  const flagSrc = countryCode ? `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png` : null;

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/40 bg-black/35 text-base font-bold shadow-inner">
      {flagSrc ? (
        <img
          src={flagSrc}
          alt={countryCode ?? "flag"}
          width={26}
          height={18}
          className="h-[18px] w-[26px] rounded-[2px] object-cover"
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      ) : (
        initial
      )}
    </div>
  );
}
