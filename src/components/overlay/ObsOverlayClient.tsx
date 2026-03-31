"use client";

import * as React from "react";
import { normalizeWebSocketUrl } from "@/hooks/useLiveScore";

type ObsOverlayClientProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

type OverlayTemplate = "1" | "2";

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
  tournamentName?: string | null;
  stageName?: string | null;
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
  sessionId?: string | number | null;
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
  }>;
};

const DEFAULT_WIDTH = 540;
const DEFAULT_HEIGHT = 146;
const WS_TOKEN = process.env.NEXT_PUBLIC_WS_TOKEN || "BT_WS_RELAY_TOKEN_2025";

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
      bestRunA: item.state.bestRunA ?? 0,
      bestRunB: item.state.bestRunB ?? 0,
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
  const width = Number(getParamValue(searchParams?.width)) || DEFAULT_WIDTH;
  const height = Number(getParamValue(searchParams?.height)) || DEFAULT_HEIGHT;
  const templateParam = (getParamValue(searchParams?.t) ?? getParamValue(searchParams?.template) ?? "classic")
    .trim()
    .toLowerCase();
  const template: OverlayTemplate =
    templateParam === "2" || templateParam === "royalpro" ? "2" : "1";
  const obsSafe = parseBooleanParam(
    searchParams?.obs ?? searchParams?.obsSafe ?? searchParams?.safe,
    true,
  );

  const [item, setItem] = React.useState<LiveScoreItem | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
    let cancelled = false;

    if (!sessionId) {
      setItem(null);
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/scoreboard/session-by-id/${encodeURIComponent(sessionId)}`,
          { cache: "no-store" },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load session");
        }
        const row = Array.isArray(payload?.data) ? payload.data[0] : null;
        const normalized = normalizeSessionRecord(row, sessionId);
        if (!normalized) {
          throw new Error("No live data found for this session.");
        }
        if (!cancelled) {
          setItem(normalized);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setItem(null);
          setError(err instanceof Error ? err.message : "Failed to load session");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  React.useEffect(() => {
    if (!item?.screenId) return;

    const wsUrl = normalizeWebSocketUrl(
      process.env.NEXT_PUBLIC_WS_ENDPOINT ||
        process.env.NEXT_PUBLIC_WS_URL ||
        "wss://ws.billiardtoday.com/ws",
    );
    const params = new URLSearchParams();
    if (WS_TOKEN) params.set("token", WS_TOKEN);
    params.set("screenId", item.screenId);
    wsUrl.search = params.toString();

    const socket = new WebSocket(wsUrl.toString());

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data || "{}")) as WsPayload;
        if (payload.type !== "score:update") return;
        const payloadScreenId = normalizeString(payload.screenId);
        if (payloadScreenId && payloadScreenId !== item.screenId) return;
        setItem((current) => (current ? applyWsUpdate(current, payload) : current));
      } catch {
        // Ignore malformed realtime payloads for overlay rendering.
      }
    };

    return () => {
      try {
        socket.close();
      } catch {}
    };
  }, [item?.screenId]);

  if (!sessionId) {
    return (
      <CenteredMessage tone="muted">
        Provide `?session=&lt;id&gt;` in the URL.
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
    return <CenteredMessage tone="muted">No live data found for this session.</CenteredMessage>;
  }

  return (
    <div
      className={
        obsSafe
          ? "fixed inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none"
          : "min-h-screen flex items-center justify-center p-4"
      }
      style={{ backgroundColor: "transparent" }}
    >
      <ScoreOverlayCard
        item={item}
        width={width}
        height={height}
        obsSafe={obsSafe}
        template={template}
      />
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

function SmallFlag({ countryCode }: { countryCode: string | null }) {
  if (!countryCode) {
    return <div className="h-[14px] w-5 rounded-[2px] bg-white/12" />;
  }

  return (
    <img
      src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
      alt={countryCode}
      width={20}
      height={14}
      className="h-[14px] w-5 rounded-[2px] object-cover"
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
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
        active ? "bg-sky-500/90" : "bg-sky-400/60"
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
