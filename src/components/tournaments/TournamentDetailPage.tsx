"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { LiveScoreBoardCard } from "@/components/LiveScoreBoardCard";
import {
  LiveStatsHighlightModal,
  type LiveScoreItem,
} from "@/components/live/LiveClubView";
import type { LiveSessionItem } from "@/components/live/types";
import { TournamentEventsContent } from "@/app/tournaments/events/TournamentEventsContent";
import type { TournamentEventSummary } from "@/lib/tournaments";
import { buildTournamentHref } from "@/lib/tournaments";
import type {
  EventApiResponse,
  GroupStanding,
  NormalizedEventStage,
  StageMatchGroup,
} from "@/app/tournaments/events/types";
import {
  buildGroupStandings,
  buildStageMatchGroups,
  formatAverage,
  formatNumberValue,
  formatRecord,
  normalizeEntity,
  normalizeGroup,
  normalizeResult,
  toNumber,
  toRelationArray,
} from "@/app/tournaments/events/utils";
import { normalizeWebSocketUrl } from "@/hooks/useLiveScore";
import { getCountryFlagCdnUrl } from "@/lib/countryFlags";

type Props = {
  summary: TournamentEventSummary;
  embedded?: boolean;
};

type TournamentLiveScreen = {
  screenId: string;
  screenName: string;
  isActive: boolean;
  tournamentId: string;
  lastUpdate?: string;
};

type EventLiveSession = LiveSessionItem & {
  documentId: string;
  eventId: string | null;
  eventStageId: string | null;
  groupNumber: number | null;
  screenIdentifier: string | null;
  player1DocumentId: string | null;
  player2DocumentId: string | null;
  player1Name: string | null;
  player2Name: string | null;
  sessionStatus: string | null;
};

type WsTournamentPayload = {
  type?: string;
  clubId?: string | null;
  screenId?: string;
  screenIdentifier?: string | null;
  sessionId?: string | number | null;
  ended?: boolean;
  isRunning?: boolean;
  activePlayer?: number | null;
  current?: "A" | "B" | null;
  progress?: number;
  ts?: number;
  session?: Record<string, any>;
  players?: Array<{
    name?: string | null;
    country?: string | null;
    points?: number | null;
    run?: number | null;
    liveRun?: number | null;
    innings?: number | null;
    hr?: number | null;
    avgFormatted?: string | null;
    accPercent?: number | null;
  }>;
};

type GroupPopoverData = {
  title: string;
  standings: GroupStanding[];
  matches: StageMatchGroup["matches"];
};

const isPlaceholderPlayerName = (value?: string | null) => {
  const normalized = (value || "").trim().toLowerCase();
  return !normalized || normalized === "player 1" || normalized === "player 2";
};

function PlayerWithFlag({
  name,
  country,
}: {
  name: string;
  country?: string | null;
}) {
  const flagSrc = getCountryFlagCdnUrl(country ?? null, 40);
  return (
    <span className="inline-flex items-center gap-2">
      {flagSrc ? (
        <img
          src={flagSrc}
          alt={country || "flag"}
          className="h-3.5 w-5 rounded-[2px] object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : null}
      <span>{name}</span>
    </span>
  );
}

function GroupTooltip({
  data,
  embedded,
}: {
  data: GroupPopoverData;
  embedded: boolean;
}) {
  return (
    <div className="absolute left-0 top-[-12px] z-30 w-[min(760px,calc(100vw-2rem))] -translate-y-full rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">{data.title}</div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Live group view
        </div>
      </div>

      <div className="mb-3 overflow-hidden rounded-xl border border-slate-200">
        <table className="min-w-full text-[11px]">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-2 py-1.5 text-left font-semibold">Player</th>
              <th className="px-2 py-1.5 text-left font-semibold">Date</th>
              <th className="px-2 py-1.5 text-center font-semibold">Res</th>
              <th className="px-2 py-1.5 text-center font-semibold">Pts</th>
              <th className="px-2 py-1.5 text-center font-semibold">Inn</th>
              <th className="px-2 py-1.5 text-center font-semibold">Avg</th>
              <th className="px-2 py-1.5 text-center font-semibold">H.R</th>
              <th className="px-2 py-1.5 text-center font-semibold">H.R2</th>
              <th className="px-2 py-1.5 text-center font-semibold">MP</th>
            </tr>
          </thead>
          <tbody>
            {data.matches.map((match) => (
              <>
                <tr
                  key={`${match.key}-top`}
                  className="border-t border-slate-200 bg-emerald-50/80"
                >
                  <td className="px-2 py-1.5 font-medium">
                    <Link
                      href={`${embedded ? "/embed" : ""}/players/${match.top.player.id}-${match.top.player.name.trim().replace(/\s+/g, "-")}`}
                      className="text-blue-600 hover:underline"
                    >
                      <PlayerWithFlag
                        name={match.top.player.name}
                        country={match.top.player.country}
                      />
                    </Link>
                  </td>
                  <td className="px-2 py-1.5 text-xs text-slate-600">
                    {match.dateTime
                      ? new Date(match.dateTime).toLocaleDateString("el-GR")
                      : "-"}
                  </td>
                  <td className="px-2 py-1.5 text-center font-semibold">
                    {match.top.outcome ?? "-"}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatNumberValue(match.top.player.points)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatNumberValue(match.top.player.innings)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatAverage(
                      match.top.player.points,
                      match.top.player.innings,
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatNumberValue(match.top.player.highRun)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatNumberValue(match.top.player.highRun2)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatNumberValue(match.top.player.matchPoints)}
                  </td>
                </tr>
                <tr
                  key={`${match.key}-bottom`}
                  className="border-t border-slate-200 bg-rose-50/80"
                >
                  <td className="px-2 py-1.5 font-medium">
                    <Link
                      href={`${embedded ? "/embed" : ""}/players/${match.bottom.player.id}-${match.bottom.player.name.trim().replace(/\s+/g, "-")}`}
                      className="text-blue-600 hover:underline"
                    >
                      <PlayerWithFlag
                        name={match.bottom.player.name}
                        country={match.bottom.player.country}
                      />
                    </Link>
                  </td>
                  <td className="px-2 py-1.5 text-xs text-slate-600">
                    {match.dateTime
                      ? new Date(match.dateTime).toLocaleDateString("el-GR")
                      : "-"}
                  </td>
                  <td className="px-2 py-1.5 text-center font-semibold">
                    {match.bottom.outcome ?? "-"}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatNumberValue(match.bottom.player.points)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatNumberValue(match.bottom.player.innings)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatAverage(
                      match.bottom.player.points,
                      match.bottom.player.innings,
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatNumberValue(match.bottom.player.highRun)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatNumberValue(match.bottom.player.highRun2)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {formatNumberValue(match.bottom.player.matchPoints)}
                  </td>
                </tr>
              </>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="min-w-full text-[11px]">
          <thead className="bg-emerald-700 text-white">
            <tr>
              <th className="px-2 py-1.5 text-left font-semibold">Player</th>
              <th className="px-2 py-1.5 text-center font-semibold">Pos</th>
              <th className="px-2 py-1.5 text-center font-semibold">Rec</th>
              <th className="px-2 py-1.5 text-center font-semibold">Pts</th>
              <th className="px-2 py-1.5 text-center font-semibold">Inn</th>
              <th className="px-2 py-1.5 text-center font-semibold">Avg</th>
              <th className="px-2 py-1.5 text-center font-semibold">H.R</th>
              <th className="px-2 py-1.5 text-center font-semibold">H.R2</th>
              <th className="px-2 py-1.5 text-center font-semibold">MP</th>
            </tr>
          </thead>
          <tbody>
            {data.standings.map((player) => (
              <tr
                key={player.key}
                className="border-t border-slate-200 bg-white text-slate-700"
              >
                <td className="px-2 py-1.5 font-medium">
                  {player.playerId ? (
                    <Link
                      href={`${embedded ? "/embed" : ""}/players/${player.playerId}-${player.playerName.trim().replace(/\s+/g, "-")}`}
                      className="text-blue-600 hover:underline"
                    >
                      <PlayerWithFlag
                        name={player.playerName}
                        country={player.playerCountry}
                      />
                    </Link>
                  ) : (
                    <PlayerWithFlag
                      name={player.playerName}
                      country={player.playerCountry}
                    />
                  )}
                </td>
                <td className="px-2 py-1.5 text-center font-semibold">
                  {player.place}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {formatRecord(player.record)}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {formatNumberValue(player.totalPoints)}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {formatNumberValue(player.totalInnings)}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {formatAverage(player.totalPoints, player.totalInnings)}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {formatNumberValue(player.highRun)}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {formatNumberValue(player.highRun2)}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {formatNumberValue(player.totalMatchPoints)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const WS_TOKEN = process.env.NEXT_PUBLIC_WS_TOKEN || "BT_WS_RELAY_TOKEN_2025";

const normalizeNameForMatch = (value: string | null | undefined) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const buildNameFragments = (value: string | null | undefined) =>
  normalizeNameForMatch(value)
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);

const buildPairKey = (
  left: string | null | undefined,
  right: string | null | undefined,
) => {
  const a = String(left || "").trim();
  const b = String(right || "").trim();
  if (!a || !b) return null;
  return [a, b].sort().join("::");
};

const buildSessionPairKeys = (session: EventLiveSession) => {
  const keys = new Set<string>();

  const documentPairKey = buildPairKey(
    session.player1DocumentId,
    session.player2DocumentId,
  );
  if (documentPairKey) keys.add(`doc:${documentPairKey}`);

  const namePairKey = buildPairKey(
    normalizeNameForMatch(session.state?.playerAName ?? session.player1Name ?? null),
    normalizeNameForMatch(session.state?.playerBName ?? session.player2Name ?? null),
  );
  if (namePairKey) keys.add(`name:${namePairKey}`);

  return keys;
};

const mergeLiveSessions = (
  primary: EventLiveSession[],
  secondary: EventLiveSession[],
) => {
  const merged = new Map<string, EventLiveSession>();
  for (const session of [...secondary, ...primary]) {
    const key =
      session.screenIdentifier ||
      session.screenId ||
      session.documentId ||
      session.sessionId ||
      session.id;
    if (!key) continue;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, session);
      continue;
    }
    const existingIsRunning =
      Boolean(existing.state?.isRunning) ||
      existing.sessionStatus === "in_progress";
    const nextIsRunning =
      Boolean(session.state?.isRunning) ||
      session.sessionStatus === "in_progress";
    const preserveRunningState = existingIsRunning && !nextIsRunning;
    merged.set(key, {
      ...existing,
      ...session,
      sessionStatus: preserveRunningState
        ? existing.sessionStatus
        : session.sessionStatus,
      state: {
        ...existing.state,
        ...session.state,
        isRunning: preserveRunningState
          ? existing.state?.isRunning
          : session.state?.isRunning,
      },
    });
  }
  return Array.from(merged.values());
};

type TournamentLiveScreensResponse = {
  success: boolean;
  data: Array<{
    tournamentId: string;
    tournamentTitle: string;
    liveScreens: TournamentLiveScreen[];
  }>;
  error?: string;
};

const formatDate = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("el-GR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatDateRange = (start: string | null, end: string | null) => {
  const startText = formatDate(start);
  const endText = formatDate(end);
  if (startText && endText) {
    return startText === endText ? startText : `${startText} - ${endText}`;
  }
  return startText || endText || null;
};

const resolveMediaUrl = (url: string | null) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base =
    process.env.NEXT_PUBLIC_STRAPI_URL || "https://app.billiardtoday.com";
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
};

export function TournamentDetailPage({ summary, embedded = false }: Props) {
  const fullPageHref = buildTournamentHref(
    summary.documentId,
    summary.title,
    summary.season,
    false,
  );
  const stageCount = summary.stages.length;
  const scheduleLabel = formatDateRange(summary.startDate, summary.endDate);
  const organizerLogoUrl = resolveMediaUrl(summary.organizerLogoUrl);
  const finalStageDocumentId =
    summary.stages.find((stage) => stage.isFinal)?.documentId ??
    summary.stages[summary.stages.length - 1]?.documentId ??
    null;
  const [activeView, setActiveView] = useState<"tournament" | "live">(
    "tournament",
  );
  const [tournamentPanelMode, setTournamentPanelMode] = useState<
    "stages" | "finals"
  >("stages");
  const [overviewMode, setOverviewMode] = useState<"results" | "ranks">(
    "results",
  );
  const [selectedStageDocumentId, setSelectedStageDocumentId] = useState<
    string | null
  >(summary.stages[0]?.documentId ?? null);
  const [liveScreensData, setLiveScreensData] = useState<
    TournamentLiveScreensResponse["data"]
  >([]);
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [eventLiveSessions, setEventLiveSessions] = useState<
    EventLiveSession[]
  >([]);
  const [wsLiveSessions, setWsLiveSessions] = useState<EventLiveSession[]>([]);
  const [eventData, setEventData] = useState<EventApiResponse | null>(null);
  const [highlightedLiveSessionId, setHighlightedLiveSessionId] = useState<
    string | null
  >(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(
    new Set(),
  );
  const [highlightItem, setHighlightItem] = useState<LiveScoreItem | null>(
    null,
  );
  const [suppressLiveGridClicks, setSuppressLiveGridClicks] = useState(false);
  const lastModalCloseAtRef = useRef(0);
  const lastClosedHighlightRef = useRef<{
    sessionId?: string;
    screenId?: string;
    at: number;
  } | null>(null);
  const [hoveredGroupSessionId, setHoveredGroupSessionId] = useState<
    string | null
  >(null);
  const [openGroupSessionId, setOpenGroupSessionId] = useState<string | null>(
    null,
  );
  const tournamentScrollYRef = useRef<number | null>(null);
  const pendingTournamentRestoreYRef = useRef<number | null>(null);
  const previousViewRef = useRef<"tournament" | "live">("tournament");
  const tournamentContentRef = useRef<HTMLDivElement | null>(null);
  const liveContentRef = useRef<HTMLDivElement | null>(null);
  const screenSocketKeysRef = useRef<string>("");
  const derivedClubDocumentId =
    summary.clubDocumentId ||
    eventLiveSessions.find((session) => session.clubId)?.clubId ||
    null;

  useEffect(() => {
    let cancelled = false;

    const fetchEventData = async () => {
      try {
        const response = await fetch(
          `/api/events/${encodeURIComponent(summary.documentId)}`,
          {
            cache: "no-store",
          },
        );
        if (!response.ok) throw new Error("Failed to load event data.");
        const payload = (await response
          .json()
          .catch(() => null)) as EventApiResponse | null;
        if (!cancelled) {
          setEventData(payload);
        }
      } catch {
        if (!cancelled) {
          setEventData(null);
        }
      }
    };

    void fetchEventData();
    return () => {
      cancelled = true;
    };
  }, [summary.documentId]);

  useEffect(() => {
    if (previousViewRef.current === "tournament" && activeView === "live") {
      tournamentScrollYRef.current = window.scrollY;
    }

    if (
      previousViewRef.current === "live" &&
      activeView === "tournament" &&
      tournamentScrollYRef.current !== null
    ) {
      pendingTournamentRestoreYRef.current = tournamentScrollYRef.current;
    }

    previousViewRef.current = activeView;
  }, [activeView]);

  useEffect(() => {
    if (
      activeView !== "tournament" ||
      pendingTournamentRestoreYRef.current === null
    )
      return;

    const restoreY = pendingTournamentRestoreYRef.current;
    const restoreScroll = () => {
      window.scrollTo({ top: restoreY, behavior: "auto" });
    };

    const frameOne = requestAnimationFrame(restoreScroll);
    const frameTwo = requestAnimationFrame(() => {
      requestAnimationFrame(restoreScroll);
    });
    const timeoutOne = window.setTimeout(restoreScroll, 80);
    const timeoutTwo = window.setTimeout(restoreScroll, 180);
    const timeoutThree = window.setTimeout(restoreScroll, 320);
    let attempts = 0;
    const interval = window.setInterval(() => {
      restoreScroll();
      attempts += 1;
      if (attempts >= 8) {
        window.clearInterval(interval);
        pendingTournamentRestoreYRef.current = null;
      }
    }, 120);
    const timeoutFinal = window.setTimeout(() => {
      restoreScroll();
      pendingTournamentRestoreYRef.current = null;
      window.clearInterval(interval);
    }, 1000);

    return () => {
      cancelAnimationFrame(frameOne);
      cancelAnimationFrame(frameTwo);
      window.clearTimeout(timeoutOne);
      window.clearTimeout(timeoutTwo);
      window.clearTimeout(timeoutThree);
      window.clearTimeout(timeoutFinal);
      window.clearInterval(interval);
    };
  }, [activeView, eventData, selectedStageDocumentId]);

  useEffect(() => {
    if (activeView !== "live") return;

    let cancelled = false;

    const fetchLiveScreens = async () => {
      try {
        setIsLiveLoading(true);
        setLiveError(null);
        const response = await fetch("/api/admin/tournament/live-screens", {
          cache: "no-store",
        });
        const payload = (await response
          .json()
          .catch(() => null)) as TournamentLiveScreensResponse | null;

        if (!response.ok || !payload?.success) {
          throw new Error(
            payload?.error || "Failed to load live tournament screens.",
          );
        }

        if (!cancelled) {
          setLiveScreensData(Array.isArray(payload.data) ? payload.data : []);
        }
      } catch (error) {
        if (!cancelled) {
          setLiveError(
            error instanceof Error
              ? error.message
              : "Failed to load live tournament screens.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLiveLoading(false);
        }
      }
    };

    void fetchLiveScreens();
    const interval = window.setInterval(fetchLiveScreens, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeView]);

  useEffect(() => {
    let cancelled = false;

    const fetchEventLiveSessions = async () => {
      try {
        const response = await fetch(
          `/api/tournaments/${encodeURIComponent(summary.documentId)}/live-sessions`,
          {
            cache: "no-store",
          },
        );
        const payload = (await response.json().catch(() => ({ data: [] }))) as {
          data?: EventLiveSession[];
        };
        if (!response.ok) {
          throw new Error("Failed to load event live sessions.");
        }
        if (!cancelled) {
          setEventLiveSessions(Array.isArray(payload.data) ? payload.data : []);
        }
      } catch {
        if (!cancelled) {
          setEventLiveSessions([]);
        }
      }
    };

    void fetchEventLiveSessions();
    const interval = window.setInterval(fetchEventLiveSessions, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [summary.documentId]);

  useEffect(() => {
    if (!derivedClubDocumentId) {
      setWsLiveSessions([]);
      return;
    }

    const wsUrl = normalizeWebSocketUrl(
      process.env.NEXT_PUBLIC_WS_ENDPOINT ||
        process.env.NEXT_PUBLIC_WS_URL ||
        "wss://ws.billiardtoday.com/ws",
    );
    const params = new URLSearchParams();
    if (WS_TOKEN) params.set("token", WS_TOKEN);

    wsUrl.search = params.toString();

    const socket = new WebSocket(wsUrl.toString());

    const upsertLiveSession = (item: EventLiveSession) => {
      setWsLiveSessions((prev) => {
        const next = mergeLiveSessions([item], prev);
        return next.sort((a, b) =>
          (b.updatedAt || "").localeCompare(a.updatedAt || ""),
        );
      });
    };

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: "subscribe:club",
          clubId: derivedClubDocumentId,
        }),
      );
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(
          String(event.data || "{}"),
        ) as WsTournamentPayload;
        const payloadClubId = String(
          payload.clubId ?? payload.session?.clubId ?? "",
        );
        if (payloadClubId !== String(derivedClubDocumentId)) return;

        if (
          (payload.type === "SESSION_ASSIGNED" ||
            payload.type === "SESSION_UPDATED") &&
          payload.session &&
          typeof payload.session === "object"
        ) {
          const sessionObj = payload.session;
          const sessionDocumentId =
            typeof sessionObj.documentId === "string" &&
            sessionObj.documentId.trim().length > 0
              ? sessionObj.documentId.trim()
              : null;
          const lifecycleSessionId = String(
            sessionObj.documentId ??
              payload.sessionId ??
              sessionObj.id ??
              payload.screenIdentifier ??
              payload.screenId ??
              "",
          ).trim();
          const lifecycleScreenId = String(
            payload.screenIdentifier ??
              payload.screenId ??
              sessionObj.screenIdentifier ??
              "",
          ).trim();
          const lifecycleStatus =
            String(
              (payload.session?.sessionStatus ??
                payload.session?.status ??
                payload.type) ||
                "",
            ).trim() || null;

          if (
            payload.ended === true ||
            lifecycleStatus === "finished" ||
            lifecycleStatus === "cancelled"
          ) {
            setWsLiveSessions((prev) =>
              prev.filter(
                (entry) =>
                  entry.sessionId !== lifecycleSessionId &&
                  entry.documentId !== lifecycleSessionId &&
                  entry.id !== lifecycleSessionId &&
                  entry.screenId !== lifecycleScreenId &&
                  entry.screenIdentifier !== lifecycleScreenId,
              ),
            );
            return;
          }

          upsertLiveSession({
            id: lifecycleSessionId || lifecycleScreenId || "unknown-session",
            documentId:
              sessionDocumentId ||
              lifecycleSessionId ||
              lifecycleScreenId ||
              "",
            sessionId:
              lifecycleSessionId || lifecycleScreenId || "unknown-session",
            screenId: lifecycleScreenId || null,
            screenIdentifier: lifecycleScreenId || null,
            updatedAt: new Date().toISOString(),
            clubId: derivedClubDocumentId,
            eventId:
              typeof sessionObj.eventId === "string"
                ? sessionObj.eventId
                : null,
            eventStageId:
              typeof sessionObj.eventStageId === "string"
                ? sessionObj.eventStageId
                : null,
            groupNumber:
              typeof sessionObj.groupNumber === "number"
                ? sessionObj.groupNumber
                : typeof sessionObj.groupNumber === "string"
                  ? Number(sessionObj.groupNumber)
                  : null,
            player1DocumentId:
              typeof sessionObj.player1DocumentId === "string"
                ? sessionObj.player1DocumentId
                : null,
            player2DocumentId:
              typeof sessionObj.player2DocumentId === "string"
                ? sessionObj.player2DocumentId
                : null,
            player1Name:
              typeof sessionObj.player1Name === "string"
                ? sessionObj.player1Name
                : null,
            player2Name:
              typeof sessionObj.player2Name === "string"
                ? sessionObj.player2Name
                : null,
            sessionStatus: lifecycleStatus,
            state: {
              scoreA: Number(sessionObj.player1_points ?? 0) || 0,
              scoreB: Number(sessionObj.player2_points ?? 0) || 0,
              inningsA: Number(sessionObj.player1_innings ?? 0) || 0,
              inningsB: Number(sessionObj.player2_innings ?? 0) || 0,
              inningsCount: Math.max(
                Number(sessionObj.player1_innings ?? 0) || 0,
                Number(sessionObj.player2_innings ?? 0) || 0,
              ),
              bestRunA: Number(sessionObj.player1_high_run ?? 0) || 0,
              bestRunB: Number(sessionObj.player2_high_run ?? 0) || 0,
              playerAName:
                typeof sessionObj.player1Name === "string"
                  ? sessionObj.player1Name
                  : "Player A",
              playerBName:
                typeof sessionObj.player2Name === "string"
                  ? sessionObj.player2Name
                  : "Player B",
              playerACountry:
                typeof sessionObj.player1Country === "string"
                  ? sessionObj.player1Country
                  : null,
              playerBCountry:
                typeof sessionObj.player2Country === "string"
                  ? sessionObj.player2Country
                  : null,
              playerAPhotoUrl:
                typeof sessionObj.player1PhotoUrl === "string"
                  ? sessionObj.player1PhotoUrl
                  : null,
              playerBPhotoUrl:
                typeof sessionObj.player2PhotoUrl === "string"
                  ? sessionObj.player2PhotoUrl
                  : null,
              progress: Number(sessionObj.progress ?? 0) || 0,
              totalBlocks: 40,
              isRunning: lifecycleStatus === "in_progress",
              tournamentName:
                typeof sessionObj.eventTitle === "string"
                  ? sessionObj.eventTitle
                  : null,
              stageName:
                typeof sessionObj.stageTitle === "string"
                  ? sessionObj.stageTitle
                  : null,
              groupName:
                typeof sessionObj.groupLabel === "string"
                  ? sessionObj.groupLabel
                  : null,
              tableName:
                typeof sessionObj.tableNumber === "string"
                  ? sessionObj.tableNumber
                  : null,
            },
          });
          return;
        }

        if (payload.type !== "score:update") return;
        if (eventLiveSessions.length > 0) return;
        if (payload.ended === true) {
          const endedSessionId = String(payload.sessionId ?? "");
          const endedScreenId = String(payload.screenId ?? "");
          setWsLiveSessions((prev) =>
            prev.filter(
              (entry) =>
                entry.sessionId !== endedSessionId &&
                entry.documentId !== endedSessionId &&
                entry.id !== endedSessionId &&
                entry.screenId !== endedScreenId &&
                entry.screenIdentifier !== endedScreenId,
            ),
          );
          return;
        }

        const players = Array.isArray(payload.players) ? payload.players : [];
        const playerA = players[0] ?? {};
        const playerB = players[1] ?? {};
        const sessionId = String(
          payload.sessionId ?? payload.screenId ?? "",
        ).trim();
        const screenId = String(payload.screenId ?? "").trim();
        const existingSession =
          wsLiveSessions.find((entry) => entry.screenId === screenId) ??
          wsLiveSessions.find((entry) => entry.sessionId === sessionId);
        const current: "A" | "B" | undefined =
          payload.current ??
          (payload.activePlayer === 1
            ? "A"
            : payload.activePlayer === 2
              ? "B"
              : undefined);
        const nextPlayerAName = isPlaceholderPlayerName(
          typeof playerA.name === "string" ? playerA.name : null,
        )
          ? (existingSession?.state?.playerAName ??
            existingSession?.player1Name ??
            null)
          : typeof playerA.name === "string"
            ? playerA.name
            : null;
        const nextPlayerBName = isPlaceholderPlayerName(
          typeof playerB.name === "string" ? playerB.name : null,
        )
          ? (existingSession?.state?.playerBName ??
            existingSession?.player2Name ??
            null)
          : typeof playerB.name === "string"
            ? playerB.name
            : null;
        upsertLiveSession({
          id: sessionId || screenId || "unknown-session",
          documentId: sessionId || screenId || "unknown-session",
          sessionId: sessionId || screenId || "unknown-session",
          screenId: screenId || null,
          screenIdentifier: screenId || null,
          updatedAt:
            typeof payload.ts === "number" && Number.isFinite(payload.ts)
              ? new Date(payload.ts).toISOString()
              : new Date().toISOString(),
          clubId: derivedClubDocumentId,
          eventId: null,
          eventStageId: null,
          groupNumber: null,
          player1DocumentId: null,
          player2DocumentId: null,
          player1Name: nextPlayerAName,
          player2Name: nextPlayerBName,
          sessionStatus: payload.isRunning ? "in_progress" : "pending",
          state: {
            scoreA: Number(playerA.points ?? 0) || 0,
            scoreB: Number(playerB.points ?? 0) || 0,
            runA: Number(playerA.run ?? 0) || 0,
            runB: Number(playerB.run ?? 0) || 0,
            liveRunA: Number(playerA.liveRun ?? playerA.run ?? 0) || 0,
            liveRunB: Number(playerB.liveRun ?? playerB.run ?? 0) || 0,
            inningsA: Number(playerA.innings ?? 0) || 0,
            inningsB: Number(playerB.innings ?? 0) || 0,
            inningsCount: Math.max(
              Number(playerA.innings ?? 0) || 0,
              Number(playerB.innings ?? 0) || 0,
            ),
            bestRunA: Number(playerA.hr ?? 0) || 0,
            bestRunB: Number(playerB.hr ?? 0) || 0,
            avgFormattedA:
              typeof playerA.avgFormatted === "string"
                ? playerA.avgFormatted
                : undefined,
            avgFormattedB:
              typeof playerB.avgFormatted === "string"
                ? playerB.avgFormatted
                : undefined,
            accPercentA:
              typeof playerA.accPercent === "number"
                ? playerA.accPercent
                : undefined,
            accPercentB:
              typeof playerB.accPercent === "number"
                ? playerB.accPercent
                : undefined,
            playerAName: nextPlayerAName ?? "Player A",
            playerBName: nextPlayerBName ?? "Player B",
            playerACountry:
              typeof playerA.country === "string" ? playerA.country : null,
            playerBCountry:
              typeof playerB.country === "string" ? playerB.country : null,
            progress: Number(payload.progress ?? 0) || 0,
            totalBlocks: 40,
            isRunning: Boolean(payload.isRunning),
            current,
          },
        });
      } catch {
        // ignore malformed payloads
      }
    };

    return () => {
      socket.close();
    };
  }, [derivedClubDocumentId, eventLiveSessions]);

  useEffect(() => {
    const screenIds = Array.from(
      new Set(
        eventLiveSessions
          .map((session) =>
            String(
              session.screenId || session.screenIdentifier || "",
            ).trim(),
          )
          .filter((value) => value.length > 0),
      ),
    );

    const nextKey = screenIds.slice().sort().join("|");
    if (!nextKey) {
      screenSocketKeysRef.current = "";
      setWsLiveSessions([]);
      return;
    }
    screenSocketKeysRef.current = nextKey;

    const wsUrl = normalizeWebSocketUrl(
      process.env.NEXT_PUBLIC_WS_ENDPOINT ||
        process.env.NEXT_PUBLIC_WS_URL ||
        "wss://ws.billiardtoday.com/ws",
    );

    const sockets = screenIds.map((screenId) => {
      const params = new URLSearchParams();
      if (WS_TOKEN) params.set("token", WS_TOKEN);
      params.set("screenId", screenId);

      const socketUrl = new URL(wsUrl.toString());
      socketUrl.search = params.toString();

      const socket = new WebSocket(socketUrl.toString());
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(
            String(event.data || "{}"),
          ) as WsTournamentPayload;
          const baseSession =
            eventLiveSessions.find(
              (entry) =>
                String(
                  entry.screenId || entry.screenIdentifier || "",
                ).trim() === screenId,
            ) ?? null;

          if (
            (payload.type === "SESSION_ASSIGNED" ||
              payload.type === "SESSION_UPDATED") &&
            payload.session &&
            typeof payload.session === "object"
          ) {
            const sessionObj = payload.session;
            const rawLifecycleStatus = String(
              sessionObj.sessionStatus ??
                sessionObj.status ??
                payload.type ??
                "",
            ).trim();
            const lifecycleScreenId = String(
              payload.screenIdentifier ??
                payload.screenId ??
                sessionObj.screenIdentifier ??
                baseSession?.screenIdentifier ??
                baseSession?.screenId ??
                "",
            ).trim();
            if (lifecycleScreenId !== screenId) return;

            const lifecycleSessionId = String(
              sessionObj.documentId ??
                payload.sessionId ??
                sessionObj.id ??
                baseSession?.documentId ??
                baseSession?.sessionId ??
                screenId,
            ).trim();
            const lifecycleStatus =
              rawLifecycleStatus === "SESSION_ASSIGNED" ||
              rawLifecycleStatus === "SESSION_UPDATED"
                ? (baseSession?.sessionStatus ?? null)
                : rawLifecycleStatus || baseSession?.sessionStatus || null;
            const lifecycleIsRunning =
              lifecycleStatus === "in_progress" ||
              Boolean(baseSession?.state?.isRunning);

            if (
              payload.ended === true ||
              lifecycleStatus === "finished" ||
              lifecycleStatus === "cancelled"
            ) {
              setWsLiveSessions((prev) =>
                prev.filter((entry) => {
                  const entryScreenId = String(
                    entry.screenId || entry.screenIdentifier || "",
                  ).trim();
                  const entrySessionId = String(
                    entry.sessionId || entry.documentId || entry.id || "",
                  ).trim();
                  return (
                    entryScreenId !== lifecycleScreenId &&
                    entrySessionId !== lifecycleSessionId
                  );
                }),
              );
              return;
            }

            setWsLiveSessions((prev) => {
              const next = mergeLiveSessions(
                [
                  {
                    id: lifecycleSessionId || lifecycleScreenId || screenId,
                    documentId:
                      (typeof sessionObj.documentId === "string" &&
                      sessionObj.documentId.trim().length > 0
                        ? sessionObj.documentId.trim()
                        : null) ||
                      baseSession?.documentId ||
                      lifecycleSessionId ||
                      lifecycleScreenId ||
                      screenId,
                    sessionId:
                      lifecycleSessionId ||
                      baseSession?.sessionId ||
                      lifecycleScreenId ||
                      screenId,
                    screenId: lifecycleScreenId || screenId,
                    screenIdentifier:
                      lifecycleScreenId ||
                      baseSession?.screenIdentifier ||
                      screenId,
                    updatedAt: new Date().toISOString(),
                    clubId: baseSession?.clubId ?? derivedClubDocumentId ?? null,
                    clubName: baseSession?.clubName ?? null,
                    clubCity: baseSession?.clubCity ?? null,
                    clubFederationName:
                      baseSession?.clubFederationName ?? null,
                    eventId:
                      typeof sessionObj.eventId === "string"
                        ? sessionObj.eventId
                        : baseSession?.eventId ?? null,
                    eventStageId:
                      typeof sessionObj.eventStageId === "string"
                        ? sessionObj.eventStageId
                        : baseSession?.eventStageId ?? null,
                    groupNumber:
                      typeof sessionObj.groupNumber === "number"
                        ? sessionObj.groupNumber
                        : typeof sessionObj.groupNumber === "string"
                          ? Number(sessionObj.groupNumber)
                          : baseSession?.groupNumber ?? null,
                    player1DocumentId:
                      typeof sessionObj.player1DocumentId === "string"
                        ? sessionObj.player1DocumentId
                        : baseSession?.player1DocumentId ?? null,
                    player2DocumentId:
                      typeof sessionObj.player2DocumentId === "string"
                        ? sessionObj.player2DocumentId
                        : baseSession?.player2DocumentId ?? null,
                    player1Name:
                      typeof sessionObj.player1Name === "string"
                        ? sessionObj.player1Name
                        : baseSession?.player1Name ?? null,
                    player2Name:
                      typeof sessionObj.player2Name === "string"
                        ? sessionObj.player2Name
                        : baseSession?.player2Name ?? null,
                    sessionStatus: lifecycleStatus,
                    state: {
                      ...baseSession?.state,
                      scoreA:
                        Number(sessionObj.player1_points ?? baseSession?.state?.scoreA ?? 0) || 0,
                      scoreB:
                        Number(sessionObj.player2_points ?? baseSession?.state?.scoreB ?? 0) || 0,
                      inningsA:
                        Number(sessionObj.player1_innings ?? baseSession?.state?.inningsA ?? 0) || 0,
                      inningsB:
                        Number(sessionObj.player2_innings ?? baseSession?.state?.inningsB ?? 0) || 0,
                      inningsCount: Math.max(
                        Number(
                          sessionObj.player1_innings ??
                            baseSession?.state?.inningsA ??
                            0,
                        ) || 0,
                        Number(
                          sessionObj.player2_innings ??
                            baseSession?.state?.inningsB ??
                            0,
                        ) || 0,
                      ),
                      bestRunA:
                        Number(sessionObj.player1_high_run ?? baseSession?.state?.bestRunA ?? 0) || 0,
                      bestRunB:
                        Number(sessionObj.player2_high_run ?? baseSession?.state?.bestRunB ?? 0) || 0,
                      playerAName:
                        typeof sessionObj.player1Name === "string"
                          ? sessionObj.player1Name
                          : baseSession?.state?.playerAName ??
                            baseSession?.player1Name ??
                            "Player A",
                      playerBName:
                        typeof sessionObj.player2Name === "string"
                          ? sessionObj.player2Name
                          : baseSession?.state?.playerBName ??
                            baseSession?.player2Name ??
                            "Player B",
                      playerACountry:
                        typeof sessionObj.player1Country === "string"
                          ? sessionObj.player1Country
                          : baseSession?.state?.playerACountry ?? null,
                      playerBCountry:
                        typeof sessionObj.player2Country === "string"
                          ? sessionObj.player2Country
                          : baseSession?.state?.playerBCountry ?? null,
                      playerAPhotoUrl:
                        typeof sessionObj.player1PhotoUrl === "string"
                          ? sessionObj.player1PhotoUrl
                          : baseSession?.state?.playerAPhotoUrl ?? null,
                      playerBPhotoUrl:
                        typeof sessionObj.player2PhotoUrl === "string"
                          ? sessionObj.player2PhotoUrl
                          : baseSession?.state?.playerBPhotoUrl ?? null,
                      progress:
                        Number(sessionObj.progress ?? baseSession?.state?.progress ?? 0) || 0,
                      totalBlocks: 40,
                      isRunning: lifecycleIsRunning,
                      tournamentName:
                        typeof sessionObj.eventTitle === "string"
                          ? sessionObj.eventTitle
                          : baseSession?.state?.tournamentName ?? null,
                      stageName:
                        typeof sessionObj.stageTitle === "string"
                          ? sessionObj.stageTitle
                          : baseSession?.state?.stageName ?? null,
                      groupName:
                        typeof sessionObj.groupLabel === "string"
                          ? sessionObj.groupLabel
                          : baseSession?.state?.groupName ?? null,
                      tableName:
                        typeof sessionObj.tableNumber === "string"
                          ? sessionObj.tableNumber
                          : baseSession?.state?.tableName ?? null,
                    },
                  },
                ],
                prev,
              );

              return next.sort((a, b) =>
                (b.updatedAt || "").localeCompare(a.updatedAt || ""),
              );
            });
            return;
          }

          if (payload.type !== "score:update") return;
          if (String(payload.screenId || "").trim() !== screenId) return;
          if (payload.ended === true) {
            setWsLiveSessions((prev) =>
              prev.filter((entry) => {
                const entryScreenId = String(
                  entry.screenId || entry.screenIdentifier || "",
                ).trim();
                const entrySessionId = String(
                  entry.sessionId || entry.documentId || entry.id || "",
                ).trim();
                const payloadSessionId = String(payload.sessionId || "").trim();
                return (
                  entryScreenId !== screenId &&
                  entrySessionId !== payloadSessionId
                );
              }),
            );
            return;
          }

          const players = Array.isArray(payload.players) ? payload.players : [];
          const playerA = players[0] ?? {};
          const playerB = players[1] ?? {};
          const scoreUpdateIsRunning =
            Boolean(payload.isRunning) ||
            baseSession?.sessionStatus === "in_progress" ||
            Boolean(baseSession?.state?.isRunning);
          const sessionId = String(
            payload.sessionId ??
              baseSession?.sessionId ??
              baseSession?.documentId ??
              screenId,
          ).trim();
          const current: "A" | "B" | undefined =
            payload.current ??
            (payload.activePlayer === 1
              ? "A"
              : payload.activePlayer === 2
                ? "B"
                : undefined);

          setWsLiveSessions((prev) => {
            const next = mergeLiveSessions(
              [
                {
                  id: sessionId || screenId,
                  documentId:
                    baseSession?.documentId || sessionId || screenId,
                  sessionId:
                    baseSession?.sessionId || sessionId || screenId,
                  screenId,
                  screenIdentifier:
                    baseSession?.screenIdentifier || screenId,
                  updatedAt:
                    typeof payload.ts === "number" &&
                    Number.isFinite(payload.ts)
                      ? new Date(payload.ts).toISOString()
                      : new Date().toISOString(),
                  clubId: baseSession?.clubId ?? derivedClubDocumentId ?? null,
                  clubName: baseSession?.clubName ?? null,
                  clubCity: baseSession?.clubCity ?? null,
                  clubFederationName:
                    baseSession?.clubFederationName ?? null,
                  eventId: baseSession?.eventId ?? null,
                  eventStageId: baseSession?.eventStageId ?? null,
                  groupNumber: baseSession?.groupNumber ?? null,
                  player1DocumentId: baseSession?.player1DocumentId ?? null,
                  player2DocumentId: baseSession?.player2DocumentId ?? null,
                  player1Name: baseSession?.player1Name ?? null,
                  player2Name: baseSession?.player2Name ?? null,
                  sessionStatus: scoreUpdateIsRunning
                    ? "in_progress"
                    : (baseSession?.sessionStatus ?? "pending"),
                  state: {
                    ...baseSession?.state,
                    scoreA: Number(playerA.points ?? 0) || 0,
                    scoreB: Number(playerB.points ?? 0) || 0,
                    runA: Number(playerA.run ?? 0) || 0,
                    runB: Number(playerB.run ?? 0) || 0,
                    liveRunA:
                      Number(playerA.liveRun ?? playerA.run ?? 0) || 0,
                    liveRunB:
                      Number(playerB.liveRun ?? playerB.run ?? 0) || 0,
                    inningsA: Number(playerA.innings ?? 0) || 0,
                    inningsB: Number(playerB.innings ?? 0) || 0,
                    inningsCount: Math.max(
                      Number(playerA.innings ?? 0) || 0,
                      Number(playerB.innings ?? 0) || 0,
                    ),
                    bestRunA: Number(playerA.hr ?? 0) || 0,
                    bestRunB: Number(playerB.hr ?? 0) || 0,
                    avgFormattedA:
                      typeof playerA.avgFormatted === "string"
                        ? playerA.avgFormatted
                        : baseSession?.state?.avgFormattedA,
                    avgFormattedB:
                      typeof playerB.avgFormatted === "string"
                        ? playerB.avgFormatted
                        : baseSession?.state?.avgFormattedB,
                    accPercentA:
                      typeof playerA.accPercent === "number"
                        ? playerA.accPercent
                        : baseSession?.state?.accPercentA,
                    accPercentB:
                      typeof playerB.accPercent === "number"
                        ? playerB.accPercent
                        : baseSession?.state?.accPercentB,
                    playerAName:
                      typeof playerA.name === "string" &&
                      !isPlaceholderPlayerName(playerA.name)
                        ? playerA.name
                        : baseSession?.state?.playerAName ??
                          baseSession?.player1Name ??
                          "Player A",
                    playerBName:
                      typeof playerB.name === "string" &&
                      !isPlaceholderPlayerName(playerB.name)
                        ? playerB.name
                        : baseSession?.state?.playerBName ??
                          baseSession?.player2Name ??
                          "Player B",
                    playerACountry:
                      typeof playerA.country === "string"
                        ? playerA.country
                        : baseSession?.state?.playerACountry ??
                          null,
                    playerBCountry:
                      typeof playerB.country === "string"
                        ? playerB.country
                        : baseSession?.state?.playerBCountry ??
                          null,
                    progress: Number(payload.progress ?? 0) || 0,
                    totalBlocks: 40,
                    isRunning: scoreUpdateIsRunning,
                    current,
                  },
                },
              ],
              prev,
            );

            return next.sort((a, b) =>
              (b.updatedAt || "").localeCompare(a.updatedAt || ""),
            );
          });
        } catch {
          // ignore malformed payloads
        }
      };

      return socket;
    });

    return () => {
      sockets.forEach((socket) => socket.close());
    };
  }, [derivedClubDocumentId, eventLiveSessions]);

  useEffect(() => {
    if (activeView !== "live" || !highlightedLiveSessionId) return;
    const target = document.getElementById(
      `tournament-live-session-${highlightedLiveSessionId}`,
    );
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeView, highlightedLiveSessionId, eventLiveSessions]);

  const tournamentLiveScreens = useMemo(
    () =>
      liveScreensData
        .filter((item) => item.tournamentId === summary.documentId)
        .flatMap((item) => item.liveScreens ?? []),
    [liveScreensData, summary.documentId],
  );
  const activeLiveScreens = useMemo(
    () => tournamentLiveScreens.filter((screen) => screen.isActive),
    [tournamentLiveScreens],
  );
  const allowedEventPairKeys = useMemo(() => {
    const keys = new Set<string>();
    const stagesArray = toRelationArray(eventData?.data?.event_stages);

    stagesArray.forEach((stage, index) => {
      const normalizedStage = normalizeEntity<any>(stage, `live-stage-${index}`);
      const groupsRaw = toRelationArray(normalizedStage.groups);
      const normalizedGroups = groupsRaw.map((group, groupIndex) =>
        normalizeGroup(group, `${normalizedStage.id}-live-group-${groupIndex}`),
      );

      buildStageMatchGroups(normalizedGroups).forEach((group) => {
        group.matches.forEach((match) => {
          const documentPairKey = buildPairKey(
            match.top.player.documentId,
            match.bottom.player.documentId,
          );
          if (documentPairKey) keys.add(`doc:${documentPairKey}`);

          const namePairKey = buildPairKey(
            normalizeNameForMatch(
              match.top.player.nativeName ?? match.top.player.name,
            ),
            normalizeNameForMatch(
              match.bottom.player.nativeName ?? match.bottom.player.name,
            ),
          );
          if (namePairKey) keys.add(`name:${namePairKey}`);
        });
      });
    });

    return keys;
  }, [eventData]);
  const allowedEventSessionKeys = useMemo(() => {
    const keys = new Set<string>();
    eventLiveSessions.forEach((session) => {
      [
        session.documentId,
        session.sessionId,
        session.id,
        session.screenId,
        session.screenIdentifier,
      ]
        .map((value) => String(value || "").trim())
        .filter((value) => value.length > 0)
        .forEach((value) => keys.add(value));
    });
    return keys;
  }, [eventLiveSessions]);
  const filteredWsLiveSessions = useMemo(() => {
    if (eventLiveSessions.length === 0 || allowedEventSessionKeys.size === 0) {
      return [];
    }
    return wsLiveSessions.filter((session) =>
      [
        session.documentId,
        session.sessionId,
        session.id,
        session.screenId,
        session.screenIdentifier,
      ]
        .map((value) => String(value || "").trim())
        .some((value) => value.length > 0 && allowedEventSessionKeys.has(value)),
    );
  }, [allowedEventSessionKeys, eventLiveSessions.length, wsLiveSessions]);
  const filteredEventLiveSessions = useMemo(() => {
    if (allowedEventPairKeys.size === 0) return eventLiveSessions;
    return eventLiveSessions.filter((session) =>
      Array.from(buildSessionPairKeys(session)).some((key) =>
        allowedEventPairKeys.has(key),
      ),
    );
  }, [allowedEventPairKeys, eventLiveSessions]);
  const filteredWsLiveSessionsByPair = useMemo(() => {
    if (allowedEventPairKeys.size === 0) return filteredWsLiveSessions;
    return filteredWsLiveSessions.filter((session) =>
      Array.from(buildSessionPairKeys(session)).some((key) =>
        allowedEventPairKeys.has(key),
      ),
    );
  }, [allowedEventPairKeys, filteredWsLiveSessions]);
  const mergedEventLiveSessions = useMemo(
    () =>
      mergeLiveSessions(
        filteredWsLiveSessionsByPair,
        filteredEventLiveSessions,
      ),
    [filteredEventLiveSessions, filteredWsLiveSessionsByPair],
  );

  const eventStages = useMemo<NormalizedEventStage[]>(() => {
    if (!eventData?.data?.event_stages) return [];

    const stagesArray = toRelationArray(eventData.data.event_stages);

    return stagesArray
      .map((stage, index) => {
        const normalizedStage = normalizeEntity<any>(stage, `stage-${index}`);
        const groupsRaw = toRelationArray(normalizedStage.groups);
        const resultsRaw = toRelationArray(normalizedStage.results);

        return {
          id: normalizedStage.id,
          documentId: normalizedStage.documentId,
          title:
            typeof normalizedStage.title === "string"
              ? normalizedStage.title.trim()
              : "",
          startDate:
            typeof normalizedStage.start_date === "string"
              ? normalizedStage.start_date
              : null,
          endDate:
            typeof normalizedStage.end_date === "string"
              ? normalizedStage.end_date
              : null,
          order: toNumber(normalizedStage.order),
          isFinal: Boolean(normalizedStage.is_final),
          stageType:
            typeof normalizedStage.stage_type === "string"
              ? normalizedStage.stage_type.trim()
              : null,
          groups: groupsRaw
            .map((group, groupIndex) =>
              normalizeGroup(
                group,
                `${normalizedStage.id}-group-${groupIndex}`,
              ),
            )
            .sort((a, b) => {
              if (a.number !== null && b.number !== null)
                return a.number - b.number;
              if (a.number !== null) return -1;
              if (b.number !== null) return 1;
              return a.id.localeCompare(b.id);
            }),
          results: resultsRaw.map((result, resultIndex) =>
            normalizeResult(
              result,
              `${normalizedStage.id}-result-${resultIndex}`,
            ),
          ),
        } satisfies NormalizedEventStage;
      })
      .sort((a, b) => {
        if (a.order !== null && b.order !== null) return a.order - b.order;
        if (a.order !== null) return -1;
        if (b.order !== null) return 1;
        return a.id.localeCompare(b.id);
      });
  }, [eventData]);

  const stageMatchGroups = useMemo<Record<string, StageMatchGroup[]>>(
    () =>
      eventStages.reduce<Record<string, StageMatchGroup[]>>((acc, stage) => {
        acc[stage.documentId] = buildStageMatchGroups(stage.groups);
        acc[stage.id] = acc[stage.documentId];
        return acc;
      }, {}),
    [eventStages],
  );
  const liveCards = useMemo(
    () =>
      mergedEventLiveSessions.filter(
        (session) =>
          session.state?.isRunning ||
          session.sessionStatus === "in_progress",
      ),
    [mergedEventLiveSessions],
  );

  useEffect(() => {
    if (activeView !== "live") return;
    if (highlightedLiveSessionId) return;
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 768) return;

    const scrollToLiveTop = () => {
      liveContentRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      window.setTimeout(() => {
        window.scrollBy({ top: -88, behavior: "smooth" });
      }, 40);
    };

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(scrollToLiveTop);
    });
    const timeout = window.setTimeout(scrollToLiveTop, 120);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [activeView, highlightedLiveSessionId, liveCards.length]);

  const groupPopoverBySessionId = useMemo(() => {
    const result = new Map<string, GroupPopoverData>();

    const buildNameKeys = (
      a: string | null | undefined,
      b: string | null | undefined,
    ) => {
      const left = normalizeNameForMatch(a);
      const right = normalizeNameForMatch(b);
      if (!left || !right) return [];
      return [[left, right].sort().join("::")];
    };

    const findByNames = (session: EventLiveSession) => {
      const pairNameKeys = new Set<string>([
        ...buildNameKeys(session.player1Name, session.player2Name),
        ...buildNameKeys(
          session.state?.playerAName,
          session.state?.playerBName,
        ),
      ]);
      const sessionFragments = new Set<string>([
        ...buildNameFragments(session.player1Name),
        ...buildNameFragments(session.player2Name),
        ...buildNameFragments(session.state?.playerAName),
        ...buildNameFragments(session.state?.playerBName),
      ]);

      for (const stage of eventStages) {
        const groupedMatches = stageMatchGroups[stage.documentId] ?? [];
        for (const group of groupedMatches) {
          const hit = group.matches.find((match) => {
            const candidateKeys = new Set<string>([
              ...buildNameKeys(match.top.player.name, match.bottom.player.name),
              ...buildNameKeys(
                match.top.player.nativeName,
                match.bottom.player.nativeName,
              ),
              ...buildNameKeys(
                match.top.player.name || match.top.player.nativeName,
                match.bottom.player.name || match.bottom.player.nativeName,
              ),
            ]);
            for (const key of candidateKeys) {
              if (pairNameKeys.has(key)) return true;
            }
            if (sessionFragments.size > 0) {
              const candidateFragments = new Set<string>([
                ...buildNameFragments(match.top.player.name),
                ...buildNameFragments(match.bottom.player.name),
                ...buildNameFragments(match.top.player.nativeName),
                ...buildNameFragments(match.bottom.player.nativeName),
              ]);
              let overlap = 0;
              for (const fragment of candidateFragments) {
                if (sessionFragments.has(fragment)) overlap += 1;
              }
              if (overlap >= 2) return true;
            }
            return false;
          });
          if (hit) {
            return {
              title: `Group ${group.number ?? group.key}`,
              standings: buildGroupStandings(group.matches),
              matches: group.matches,
            };
          }
        }
      }

      return null;
    };

    liveCards.forEach((session) => {
      let popover: GroupPopoverData | null = null;
      if (session.eventStageId && session.groupNumber != null) {
        const groupedMatches = stageMatchGroups[session.eventStageId] ?? [];
        const group =
          groupedMatches.find(
            (entry) => entry.number === session.groupNumber,
          ) ?? null;
        if (group) {
          popover = {
            title: `Group ${group.number ?? group.key}`,
            standings: buildGroupStandings(group.matches),
            matches: group.matches,
          };
        }
      }

      if (!popover) {
        popover = findByNames(session);
      }

      if (popover) {
        result.set(session.sessionId, popover);
      }
    });

    return result;
  }, [eventStages, liveCards, stageMatchGroups]);

  useEffect(() => {
    const valid = new Set(liveCards.map((item) => item.sessionId));
    setExpandedSessions((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (valid.has(id)) next.add(id);
      });
      return next;
    });
  }, [liveCards]);

  useEffect(() => {
    if (!highlightItem) return;
    const recentlyClosed = lastClosedHighlightRef.current;
    if (
      recentlyClosed &&
      Date.now() - recentlyClosed.at < 1200 &&
      (recentlyClosed.sessionId === highlightItem.sessionId ||
        (recentlyClosed.screenId &&
          recentlyClosed.screenId === highlightItem.screenId))
    ) {
      return;
    }
    const fresh =
      liveCards.find((x) => x.sessionId === highlightItem.sessionId) ??
      liveCards.find(
        (x) => x.screenId && x.screenId === highlightItem.screenId,
      );
    if (!fresh) return;
    setHighlightItem({
      id: fresh.id,
      sessionId: fresh.sessionId,
      screenId: fresh.screenId ?? undefined,
      updatedAt: fresh.updatedAt ?? undefined,
      clubId: fresh.clubId ?? undefined,
      clubName: fresh.clubName ?? undefined,
      clubCity: fresh.clubCity ?? undefined,
      clubFederationName: fresh.clubFederationName ?? undefined,
      state: fresh.state as any,
    });
  }, [liveCards, highlightItem]);

  const handleExpandedChange = (expanded: boolean, sessionId: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (expanded) next.add(sessionId);
      else next.delete(sessionId);
      return next;
    });
  };

  const handleCardClick = (session: EventLiveSession) => {
    if (Date.now() - lastModalCloseAtRef.current < 250) return;
    lastClosedHighlightRef.current = null;
    setHoveredGroupSessionId(null);
    setOpenGroupSessionId(null);
    window.setTimeout(() => {
      setHighlightItem({
        id: session.id,
        sessionId: session.sessionId,
        screenId: session.screenId ?? undefined,
        updatedAt: session.updatedAt ?? undefined,
        clubId: session.clubId ?? undefined,
        clubName: session.clubName ?? undefined,
        clubCity: session.clubCity ?? undefined,
        clubFederationName: session.clubFederationName ?? undefined,
        state: session.state as any,
      });
    }, 0);
  };

  const toggleGroupPopover = (sessionId: string) => {
    setOpenGroupSessionId((prev) => (prev === sessionId ? null : sessionId));
  };

  const switchToLive = () => {
    if (activeView === "tournament") {
      tournamentScrollYRef.current = window.scrollY;
    }
    setActiveView("live");
  };

  const switchToTournament = () => {
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
    if (tournamentScrollYRef.current !== null) {
      pendingTournamentRestoreYRef.current = tournamentScrollYRef.current;
    }
    setTournamentPanelMode("stages");
    setActiveView("tournament");
  };

  const openFinalStandings = () => {
    if (finalStageDocumentId) {
      setSelectedStageDocumentId(finalStageDocumentId);
    }
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
    if (tournamentScrollYRef.current !== null) {
      pendingTournamentRestoreYRef.current = tournamentScrollYRef.current;
    }
    setTournamentPanelMode("finals");
    setActiveView("tournament");
    window.setTimeout(() => {
      tournamentContentRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };

  const handleHighlightClose = () => {
    lastModalCloseAtRef.current = Date.now();
    lastClosedHighlightRef.current = {
      sessionId: highlightItem?.sessionId,
      screenId: highlightItem?.screenId,
      at: Date.now(),
    };
    setHoveredGroupSessionId(null);
    setOpenGroupSessionId(null);
    setSuppressLiveGridClicks(true);
    setHighlightItem(null);
    window.setTimeout(() => {
      setSuppressLiveGridClicks(false);
    }, 400);
  };

  const mainContent =
    activeView === "tournament" ? (
      <TournamentEventsContent
        key={`${summary.documentId}:${selectedStageDocumentId ?? "default"}`}
        eventIdOverride={summary.documentId}
        preferredStageDocumentId={selectedStageDocumentId}
        onStageSelect={(stageDocumentId) => {
          setTournamentPanelMode("stages");
          setSelectedStageDocumentId(stageDocumentId);
        }}
        showPublishedFinalResults={tournamentPanelMode === "finals"}
        stageViewMode={overviewMode}
        embeddedOverride={embedded}
        showStandaloneTitle={false}
        showEventHeader={false}
        emptyStateMessage="This tournament page is missing event data."
        liveSessionsOverride={mergedEventLiveSessions}
        onLiveMatchOpen={(sessionId) => {
          setHighlightedLiveSessionId(sessionId);
          setExpandedSessions(new Set([sessionId]));
          switchToLive();
        }}
      />
    ) : (
      <section ref={liveContentRef} className="space-y-6">
        {isLiveLoading && liveCards.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-[0_16px_60px_rgba(15,23,42,0.08)]">
            Loading live scores...
          </div>
        ) : liveError && liveCards.length === 0 ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-700 shadow-[0_16px_60px_rgba(15,23,42,0.08)]">
            {liveError}
          </div>
        ) : liveCards.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-[0_16px_60px_rgba(15,23,42,0.08)]">
            Waiting for live scores...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {liveCards.map((session) => {
              const state = (session.state ?? {}) as any;
              const boardInteractionDisabled = Boolean(
                highlightItem || suppressLiveGridClicks,
              );
              return (
                <div
                  key={session.sessionId}
                  id={`tournament-live-session-${session.sessionId}`}
                  className={
                    highlightedLiveSessionId === session.sessionId
                      ? "relative rounded-[30px]"
                      : "relative"
                  }
                  onMouseEnter={() => {
                    if (!boardInteractionDisabled)
                      setHoveredGroupSessionId(session.sessionId);
                  }}
                  onMouseLeave={() =>
                    setHoveredGroupSessionId((prev) =>
                      prev === session.sessionId ? null : prev,
                    )
                  }
                >
                  {!highlightItem &&
                  groupPopoverBySessionId.has(session.sessionId) &&
                  (hoveredGroupSessionId === session.sessionId ||
                    openGroupSessionId === session.sessionId) ? (
                    <GroupTooltip
                      data={groupPopoverBySessionId.get(session.sessionId)!}
                      embedded={embedded}
                    />
                  ) : null}
                  <div
                    className={
                      boardInteractionDisabled ? "pointer-events-none" : ""
                    }
                  >
                    <LiveScoreBoardCard
                      sessionId={session.sessionId}
                      clubName={session.clubName}
                      clubCity={session.clubCity}
                      updatedAt={session.updatedAt}
                      timerProgress={state.progress}
                      timerTotal={state.totalBlocks}
                      timerRunning={state.isRunning}
                      timeoutsUsed1={state.timeoutsA}
                      maxTimeouts1={state.maxTimeoutsA}
                      timeoutsUsed2={state.timeoutsB}
                      maxTimeouts2={state.maxTimeoutsB}
                      inningsCount={state.inningsCount}
                      gameDurationSeconds={state.gameDurationSeconds}
                      player1={{
                        name: state.playerAName || "Player A",
                        country: state.playerACountry ?? null,
                        photoUrl: state.playerAPhotoUrl ?? null,
                        points: state.scoreA ?? 0,
                        run: state.runA ?? 0,
                        liveRun: state.liveRunA ?? 0,
                        innings: state.inningsA ?? 0,
                        hr: state.bestRunA ?? 0,
                        flag: "🇬🇷",
                        avgFormatted: state.avgFormattedA,
                        accPercent: state.accPercentA,
                        secondsPerInning: state.secondsPerInningA,
                        playerTimeSeconds: state.playerATimeSeconds,
                        targetPoints: state.targetPointsA ?? null,
                      }}
                      player2={{
                        name: state.playerBName || "Player B",
                        country: state.playerBCountry ?? null,
                        photoUrl: state.playerBPhotoUrl ?? null,
                        points: state.scoreB ?? 0,
                        run: state.runB ?? 0,
                        liveRun: state.liveRunB ?? 0,
                        innings: state.inningsB ?? 0,
                        hr: state.bestRunB ?? 0,
                        flag: "🇬🇷",
                        avgFormatted: state.avgFormattedB,
                        accPercent: state.accPercentB,
                        secondsPerInning: state.secondsPerInningB,
                        playerTimeSeconds: state.playerBTimeSeconds,
                        targetPoints: state.targetPointsB ?? null,
                      }}
                      current={state.current}
                      onNavigate={() => handleCardClick(session)}
                      expanded
                      topLeftControl={
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            toggleGroupPopover(session.sessionId);
                          }}
                          className={`sm:hidden rounded-md border px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm ${
                            groupPopoverBySessionId.has(session.sessionId)
                              ? "border-white/30 bg-slate-900/50"
                              : "border-white/15 bg-slate-900/30 opacity-70"
                          }`}
                        >
                          Group
                        </button>
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <LiveStatsHighlightModal
          item={highlightItem}
          onClose={handleHighlightClose}
        />
      </section>
    );

  return (
    <div
      className="mx-auto w-full px-4 py-8 sm:px-6"
      style={{ maxWidth: "var(--bt-page-width, 1280px)" }}
    >
      <section className="overflow-hidden rounded-[32px] border border-black/5 bg-[linear-gradient(135deg,#0f172a_0%,#12263f_45%,#1d4ed8_100%)] text-white shadow-[0_32px_90px_rgba(15,23,42,0.22)]">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.5fr_0.85fr] lg:px-10 lg:py-10">
          <div className="flex flex-col justify-between gap-8">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                {summary.season ? <span>Season {summary.season}</span> : null}
                {summary.gameType ? <span>{summary.gameType}</span> : null}
              </div>
              <div className="space-y-3">
                <h1 className="max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                  {summary.title}
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-white/75 sm:text-base">
                  Follow every stage, match, and final standing in one polished
                  tournament view built for players, organizers, and fans.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={switchToLive}
                className={
                  activeView === "live"
                    ? "inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                    : "inline-flex items-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                }
              >
                Live
              </button>
              <button
                type="button"
                onClick={switchToTournament}
                className={
                  activeView === "tournament" &&
                  tournamentPanelMode === "stages"
                    ? "inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                    : "inline-flex items-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                }
              >
                Tournament
              </button>
              {!embedded ? (
                <button
                  type="button"
                  onClick={openFinalStandings}
                  className={
                    activeView === "tournament" &&
                    tournamentPanelMode === "finals"
                      ? "inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                      : "inline-flex items-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/15"
                  }
                >
                  Final standings
                </button>
              ) : (
                <Link
                  href={fullPageHref}
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/15"
                >
                  Full page
                </Link>
              )}
              <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white/90">
                Stages - {stageCount || 0}
              </div>
            </div>
          </div>

          <div className="grid gap-3 rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                  Schedule
                </div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {scheduleLabel || "To be announced"}
                </div>
              </div>
              <div className="flex min-h-[132px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950/25 p-3 sm:min-h-[148px]">
                {organizerLogoUrl ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <Image
                      src={organizerLogoUrl}
                      alt={summary.organizerLogoName || summary.tournamentTitle || "Organizer logo"}
                      width={320}
                      height={320}
                      className="block h-full max-h-[124px] w-full max-w-full object-contain sm:max-h-[140px]"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                      Organizer
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white/80">
                      Logo coming soon
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                  Stage overview
                </div>
                <div className="inline-flex items-center rounded-full border border-white/10 bg-slate-950/50 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <button
                    type="button"
                    onClick={() => {
                      setOverviewMode("results");
                      setTournamentPanelMode("stages");
                      setActiveView("tournament");
                    }}
                    disabled={tournamentPanelMode === "finals"}
                    className={
                      overviewMode === "results"
                        ? tournamentPanelMode === "finals"
                          ? "rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50 transition cursor-not-allowed"
                          : "rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-950 transition"
                        : tournamentPanelMode === "finals"
                          ? "rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40 transition cursor-not-allowed"
                          : "rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/68 transition hover:text-white"
                    }
                    aria-pressed={overviewMode === "results"}
                  >
                    Matches
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOverviewMode("ranks");
                      setTournamentPanelMode("stages");
                      setActiveView("tournament");
                    }}
                    disabled={tournamentPanelMode === "finals"}
                    className={
                      overviewMode === "ranks"
                        ? tournamentPanelMode === "finals"
                          ? "rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50 transition cursor-not-allowed"
                          : "rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-950 transition"
                        : tournamentPanelMode === "finals"
                          ? "rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40 transition cursor-not-allowed"
                          : "rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/68 transition hover:text-white"
                    }
                    aria-pressed={overviewMode === "ranks"}
                  >
                    Ranking
                  </button>
                </div>
              </div>
              {tournamentPanelMode === "finals" ? null : (
                <>
                  {summary.stages.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {summary.stages.map((stage) => (
                        <button
                          key={stage.documentId}
                          type="button"
                          onClick={() => {
                            setTournamentPanelMode("stages");
                            setSelectedStageDocumentId(stage.documentId);
                            setActiveView("tournament");
                          }}
                          className={
                            selectedStageDocumentId === stage.documentId
                              ? "rounded-full border border-cyan-300/70 bg-cyan-300/20 px-3 py-1.5 text-xs font-medium text-cyan-50 transition hover:bg-cyan-300/30"
                              : "rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:border-white/25 hover:bg-white/15"
                          }
                          aria-pressed={
                            selectedStageDocumentId === stage.documentId
                          }
                        >
                          {stage.title}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-white/70">
                      No stages published yet.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <div ref={tournamentContentRef} className="mt-8">
        {mainContent}
      </div>
    </div>
  );
}
