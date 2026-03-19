'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LiveScoreBoardCard } from "@/components/live/LiveScoreBoardCard";
import type { LiveSessionItem } from "@/components/live/types";
import { TournamentEventsContent } from "@/app/tournaments/events/TournamentEventsContent";
import type { TournamentEventSummary } from "@/lib/tournaments";
import { buildTournamentHref } from "@/lib/tournaments";

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
  progress?: number;
  ts?: number;
  session?: Record<string, any>;
  players?: Array<{
    name?: string | null;
    country?: string | null;
    points?: number | null;
    run?: number | null;
    innings?: number | null;
    hr?: number | null;
    avgFormatted?: string | null;
    accPercent?: number | null;
  }>;
};

const WS_TOKEN = process.env.NEXT_PUBLIC_WS_TOKEN || "BT_WS_RELAY_TOKEN_2025";

const normalizeNameForMatch = (value: string | null | undefined) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const mergeLiveSessions = (primary: EventLiveSession[], secondary: EventLiveSession[]) => {
  const merged = new Map<string, EventLiveSession>();
  for (const session of [...primary, ...secondary]) {
    const key =
      session.documentId ||
      session.sessionId ||
      session.screenIdentifier ||
      session.screenId ||
      session.id;
    if (!key) continue;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, session);
      continue;
    }
    merged.set(key, {
      ...existing,
      ...session,
      state: {
        ...existing.state,
        ...session.state,
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

export function TournamentDetailPage({ summary, embedded = false }: Props) {
  const fullPageHref = buildTournamentHref(summary.documentId, summary.title, summary.season, false);
  const embedPageHref = buildTournamentHref(summary.documentId, summary.title, summary.season, true);
  const stageCount = summary.stages.length;
  const scheduleLabel = formatDateRange(summary.startDate, summary.endDate);
  const [activeView, setActiveView] = useState<"tournament" | "live">("tournament");
  const [selectedStageDocumentId, setSelectedStageDocumentId] = useState<string | null>(
    summary.stages[0]?.documentId ?? null,
  );
  const [liveScreensData, setLiveScreensData] = useState<TournamentLiveScreensResponse["data"]>([]);
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [eventLiveSessions, setEventLiveSessions] = useState<EventLiveSession[]>([]);
  const [wsLiveSessions, setWsLiveSessions] = useState<EventLiveSession[]>([]);
  const [highlightedLiveSessionId, setHighlightedLiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (activeView !== "live") return;

    let cancelled = false;

    const fetchLiveScreens = async () => {
      try {
        setIsLiveLoading(true);
        setLiveError(null);
        const response = await fetch("/api/admin/tournament/live-screens", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as TournamentLiveScreensResponse | null;

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || "Failed to load live tournament screens.");
        }

        if (!cancelled) {
          setLiveScreensData(Array.isArray(payload.data) ? payload.data : []);
        }
      } catch (error) {
        if (!cancelled) {
          setLiveError(error instanceof Error ? error.message : "Failed to load live tournament screens.");
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
        const response = await fetch(`/api/tournaments/${encodeURIComponent(summary.documentId)}/live-sessions`, {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({ data: [] }))) as { data?: EventLiveSession[] };
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
    if (!summary.clubDocumentId) {
      setWsLiveSessions([]);
      return;
    }

    const wsUrl =
      process.env.NEXT_PUBLIC_WS_ENDPOINT ||
      process.env.NEXT_PUBLIC_WS_URL ||
      "wss://ws.billiardtoday.com";
    const params = new URLSearchParams();
    if (WS_TOKEN) params.set("token", WS_TOKEN);

    const socket = new WebSocket(`${wsUrl}?${params.toString()}`);

    const upsertLiveSession = (item: EventLiveSession) => {
      setWsLiveSessions((prev) => {
        const next = mergeLiveSessions([item], prev);
        return next.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
      });
    };

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: "subscribe:club",
          clubId: summary.clubDocumentId,
        }),
      );
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data || "{}")) as WsTournamentPayload;
        const payloadClubId = String(payload.clubId ?? payload.session?.clubId ?? "");
        if (payloadClubId !== String(summary.clubDocumentId)) return;

        if (
          (payload.type === "SESSION_ASSIGNED" || payload.type === "SESSION_UPDATED") &&
          payload.session &&
          typeof payload.session === "object"
        ) {
          const sessionObj = payload.session;
          const sessionDocumentId =
            typeof sessionObj.documentId === "string" && sessionObj.documentId.trim().length > 0
              ? sessionObj.documentId.trim()
              : null;
          const lifecycleSessionId = String(
            sessionObj.documentId ?? payload.sessionId ?? sessionObj.id ?? payload.screenIdentifier ?? payload.screenId ?? "",
          ).trim();
          const lifecycleScreenId = String(
            payload.screenIdentifier ?? payload.screenId ?? sessionObj.screenIdentifier ?? "",
          ).trim();
          const lifecycleStatus =
            String((payload.session?.sessionStatus ?? payload.session?.status ?? payload.type) || "").trim() || null;

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
            documentId: sessionDocumentId || lifecycleSessionId || lifecycleScreenId || "",
            sessionId: lifecycleSessionId || lifecycleScreenId || "unknown-session",
            screenId: lifecycleScreenId || null,
            screenIdentifier: lifecycleScreenId || null,
            updatedAt: new Date().toISOString(),
            clubId: summary.clubDocumentId,
            eventId: typeof sessionObj.eventId === "string" ? sessionObj.eventId : null,
            eventStageId: typeof sessionObj.eventStageId === "string" ? sessionObj.eventStageId : null,
            groupNumber:
              typeof sessionObj.groupNumber === "number"
                ? sessionObj.groupNumber
                : typeof sessionObj.groupNumber === "string"
                  ? Number(sessionObj.groupNumber)
                  : null,
            player1DocumentId: typeof sessionObj.player1DocumentId === "string" ? sessionObj.player1DocumentId : null,
            player2DocumentId: typeof sessionObj.player2DocumentId === "string" ? sessionObj.player2DocumentId : null,
            player1Name: typeof sessionObj.player1Name === "string" ? sessionObj.player1Name : null,
            player2Name: typeof sessionObj.player2Name === "string" ? sessionObj.player2Name : null,
            sessionStatus: lifecycleStatus,
            state: {
              scoreA: Number(sessionObj.player1_points ?? 0) || 0,
              scoreB: Number(sessionObj.player2_points ?? 0) || 0,
              inningsA: Number(sessionObj.player1_innings ?? 0) || 0,
              inningsB: Number(sessionObj.player2_innings ?? 0) || 0,
              inningsCount: Math.max(Number(sessionObj.player1_innings ?? 0) || 0, Number(sessionObj.player2_innings ?? 0) || 0),
              bestRunA: Number(sessionObj.player1_high_run ?? 0) || 0,
              bestRunB: Number(sessionObj.player2_high_run ?? 0) || 0,
              playerAName: typeof sessionObj.player1Name === "string" ? sessionObj.player1Name : "Player A",
              playerBName: typeof sessionObj.player2Name === "string" ? sessionObj.player2Name : "Player B",
              playerACountry: typeof sessionObj.player1Country === "string" ? sessionObj.player1Country : null,
              playerBCountry: typeof sessionObj.player2Country === "string" ? sessionObj.player2Country : null,
              playerAPhotoUrl: typeof sessionObj.player1PhotoUrl === "string" ? sessionObj.player1PhotoUrl : null,
              playerBPhotoUrl: typeof sessionObj.player2PhotoUrl === "string" ? sessionObj.player2PhotoUrl : null,
              progress: Number(sessionObj.progress ?? 0) || 0,
              totalBlocks: 40,
              isRunning: lifecycleStatus === "in_progress",
              tournamentName: typeof sessionObj.eventTitle === "string" ? sessionObj.eventTitle : null,
              stageName: typeof sessionObj.stageTitle === "string" ? sessionObj.stageTitle : null,
              groupName: typeof sessionObj.groupLabel === "string" ? sessionObj.groupLabel : null,
              tableName: typeof sessionObj.tableNumber === "string" ? sessionObj.tableNumber : null,
            },
          });
          return;
        }

        if (payload.type !== "score:update") return;
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
        const sessionId = String(payload.sessionId ?? payload.screenId ?? "").trim();
        const screenId = String(payload.screenId ?? "").trim();
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
          clubId: summary.clubDocumentId,
          eventId: null,
          eventStageId: null,
          groupNumber: null,
          player1DocumentId: null,
          player2DocumentId: null,
          player1Name: typeof playerA.name === "string" ? playerA.name : null,
          player2Name: typeof playerB.name === "string" ? playerB.name : null,
          sessionStatus: payload.isRunning ? "in_progress" : "pending",
          state: {
            scoreA: Number(playerA.points ?? 0) || 0,
            scoreB: Number(playerB.points ?? 0) || 0,
            runA: Number(playerA.run ?? 0) || 0,
            runB: Number(playerB.run ?? 0) || 0,
            inningsA: Number(playerA.innings ?? 0) || 0,
            inningsB: Number(playerB.innings ?? 0) || 0,
            inningsCount: Math.max(Number(playerA.innings ?? 0) || 0, Number(playerB.innings ?? 0) || 0),
            bestRunA: Number(playerA.hr ?? 0) || 0,
            bestRunB: Number(playerB.hr ?? 0) || 0,
            avgFormattedA: typeof playerA.avgFormatted === "string" ? playerA.avgFormatted : undefined,
            avgFormattedB: typeof playerB.avgFormatted === "string" ? playerB.avgFormatted : undefined,
            accPercentA: typeof playerA.accPercent === "number" ? playerA.accPercent : undefined,
            accPercentB: typeof playerB.accPercent === "number" ? playerB.accPercent : undefined,
            playerAName: typeof playerA.name === "string" ? playerA.name : "Player A",
            playerBName: typeof playerB.name === "string" ? playerB.name : "Player B",
            playerACountry: typeof playerA.country === "string" ? playerA.country : null,
            playerBCountry: typeof playerB.country === "string" ? playerB.country : null,
            progress: Number(payload.progress ?? 0) || 0,
            totalBlocks: 40,
            isRunning: Boolean(payload.isRunning),
          },
        });
      } catch {
        // ignore malformed payloads
      }
    };

    return () => {
      socket.close();
    };
  }, [summary.clubDocumentId]);

  useEffect(() => {
    if (activeView !== "live" || !highlightedLiveSessionId) return;
    const target = document.getElementById(`tournament-live-session-${highlightedLiveSessionId}`);
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
  const mergedEventLiveSessions = useMemo(
    () => mergeLiveSessions(wsLiveSessions, eventLiveSessions),
    [eventLiveSessions, wsLiveSessions],
  );
  const liveCards = useMemo(
    () =>
      mergedEventLiveSessions.filter(
        (session) =>
          session.state?.isRunning ||
          session.sessionStatus === "in_progress" ||
          session.sessionStatus === "pending",
      ),
    [mergedEventLiveSessions],
  );

  const mainContent = activeView === "tournament" ? (
    <TournamentEventsContent
      key={`${summary.documentId}:${selectedStageDocumentId ?? "default"}`}
      eventIdOverride={summary.documentId}
      preferredStageDocumentId={selectedStageDocumentId}
      embeddedOverride={embedded}
      showStandaloneTitle={false}
      showEventHeader={false}
      emptyStateMessage="This tournament page is missing event data."
      liveSessionsOverride={mergedEventLiveSessions}
      onLiveMatchOpen={(sessionId) => {
        setHighlightedLiveSessionId(sessionId);
        setActiveView("live");
      }}
    />
  ) : (
    <section className="space-y-6">
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
          {liveCards.map((session) => (
            <div
              key={session.sessionId}
              id={`tournament-live-session-${session.sessionId}`}
              className={
                highlightedLiveSessionId === session.sessionId
                  ? "rounded-[30px] ring-2 ring-cyan-300 ring-offset-4 ring-offset-white"
                  : undefined
              }
            >
              <LiveScoreBoardCard item={session} />
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="mx-auto w-full px-4 py-8 sm:px-6" style={{ maxWidth: "var(--bt-page-width, 1280px)" }}>
      <section className="overflow-hidden rounded-[32px] border border-black/5 bg-[linear-gradient(135deg,#0f172a_0%,#12263f_45%,#1d4ed8_100%)] text-white shadow-[0_32px_90px_rgba(15,23,42,0.22)]">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.5fr_0.85fr] lg:px-10 lg:py-10">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Tournament</span>
              {summary.season ? <span>Season {summary.season}</span> : null}
              {summary.gameType ? <span>{summary.gameType}</span> : null}
            </div>
            <div className="space-y-3">
              {summary.tournamentTitle ? (
                <div className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-200/90">
                  {summary.tournamentTitle}
                </div>
              ) : null}
              <h1 className="max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                {summary.title}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-white/75 sm:text-base">
                Public tournament presentation page backed by Strapi event data, with stage tabs, results tables, and an iframe-safe version.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setActiveView("live")}
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
                onClick={() => setActiveView("tournament")}
                className={
                  activeView === "tournament"
                    ? "inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                    : "inline-flex items-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                }
              >
                Tournament
              </button>
              {!embedded ? (
                <Link
                  href={embedPageHref}
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/15"
                >
                  Embed
                </Link>
              ) : (
                <Link
                  href={fullPageHref}
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/15"
                >
                  Full page
                </Link>
              )}
            </div>
          </div>

          <div className="grid gap-3 rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">Schedule</div>
                <div className="mt-2 text-sm font-semibold text-white">{scheduleLabel || "To be announced"}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">Stages</div>
                <div className="mt-2 text-sm font-semibold text-white">{stageCount || 0}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">Stage overview</div>
              {summary.stages.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {summary.stages.map((stage) => (
                    <button
                      key={stage.documentId}
                      type="button"
                      onClick={() => setSelectedStageDocumentId(stage.documentId)}
                      className={
                        selectedStageDocumentId === stage.documentId
                          ? "rounded-full border border-cyan-300/70 bg-cyan-300/20 px-3 py-1.5 text-xs font-medium text-cyan-50 transition hover:bg-cyan-300/30"
                          : "rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:border-white/25 hover:bg-white/15"
                      }
                      aria-pressed={selectedStageDocumentId === stage.documentId}
                    >
                      {stage.title}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-sm text-white/70">No stages published yet.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8">{mainContent}</div>
    </div>
  );
}
