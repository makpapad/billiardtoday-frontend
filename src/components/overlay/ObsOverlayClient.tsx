"use client";

import * as React from "react";
import { normalizeWebSocketUrl } from "@/hooks/useLiveScore";

type ObsOverlayClientProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

type LiveScoreState = {
  scoreA?: number;
  scoreB?: number;
  runA?: number;
  runB?: number;
  liveRunA?: number;
  liveRunB?: number;
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
  }>;
};

const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 180;
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
      targetPointsA: state.targetPointsA ?? (playerA.targetPoints ?? null),
      targetPointsB: state.targetPointsB ?? (playerB.targetPoints ?? null),
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
      targetPointsA:
        playerA.targetPoints === undefined ? item.state.targetPointsA ?? null : playerA.targetPoints,
      targetPointsB:
        playerB.targetPoints === undefined ? item.state.targetPointsB ?? null : playerB.targetPoints,
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
      <ScoreOverlayCard item={item} width={width} height={height} obsSafe={obsSafe} />
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
}: {
  item: LiveScoreItem;
  width: number;
  height: number;
  obsSafe: boolean;
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
                name={state.playerAName ?? "Player A"}
                score={state.scoreA ?? 0}
                run={state.liveRunA ?? state.runA ?? 0}
                active={currentLabel === "A"}
                countryCode={resolveCountryCode(state.playerACountry)}
              />
              <PlayerRow
                name={state.playerBName ?? "Player B"}
                score={state.scoreB ?? 0}
                run={state.liveRunB ?? state.runB ?? 0}
                active={currentLabel === "B"}
                countryCode={resolveCountryCode(state.playerBCountry)}
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

function PlayerRow({
  name,
  score,
  run,
  active,
  countryCode,
}: {
  name: string;
  score: number;
  run: number;
  active: boolean;
  countryCode: string | null;
}) {
  return (
    <div
      className={`flex flex-1 items-center gap-3 border-t border-white/10 px-5 ${
        active ? "bg-sky-500/90" : "bg-sky-400/60"
      }`}
    >
      <div className="flex flex-1 items-center gap-3">
        <FlagBadge name={name} countryCode={countryCode} />
        <span className="text-xl font-semibold leading-none tracking-wide md:text-2xl">
          {name}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="min-w-[60px] text-right text-4xl font-black">{score}</div>
        {active ? (
          <div className="min-w-[52px] rounded-lg bg-amber-300 px-3 py-1 text-center text-xl font-black text-slate-900 shadow-[0_0_12px_rgba(250,204,21,0.6)]">
            {run}
          </div>
        ) : (
          <div className="min-w-[52px] text-center text-xs uppercase tracking-[0.3em] text-white/40">
            -
          </div>
        )}
      </div>
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
