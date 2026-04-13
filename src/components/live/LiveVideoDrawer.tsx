"use client";

import React from "react";
import { createPortal } from "react-dom";
import { getCountryFlagCdnUrl } from "@/lib/countryFlags";
import type { LiveVideoEntry } from "@/lib/liveVideos";
import type { LiveScoreState } from "@/components/live/types";

type LiveVideoDrawerSession = {
  sessionId: string;
  screenId?: string | null;
  title: string;
  subtitle?: string | null;
  playerAName?: string | null;
  playerBName?: string | null;
  playerACountry?: string | null;
  playerBCountry?: string | null;
  scoreA?: number | null;
  scoreB?: number | null;
  runA?: number | null;
  runB?: number | null;
  avgFormattedA?: string | null;
  avgFormattedB?: string | null;
  accPercentA?: number | null;
  accPercentB?: number | null;
  bestRunA?: number | null;
  bestRunB?: number | null;
  bestRun2A?: number | null;
  bestRun2B?: number | null;
  inningsCount?: number | null;
  inningsDetail?: LiveScoreState["inningsDetail"];
  current?: "A" | "B";
  liveVideos: LiveVideoEntry[];
};

type DrawerLaunchOrigin = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type LiveVideoDrawerProps = {
  open: boolean;
  sessions: LiveVideoDrawerSession[];
  initialSessionId?: string | null;
  initialVideoId?: string | null;
  launchOrigin?: DrawerLaunchOrigin | null;
  heading?: string;
  onSelectedSessionsChange?: (sessionIds: string[]) => void;
  onClose: () => void;
};

const MAX_SELECTED_SESSIONS = 4;

const embedUrlForVideo = (
  videoId: string,
  options?: {
    muted?: boolean;
  },
) => {
  const params = new URLSearchParams({
    autoplay: "1",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });

  if (options?.muted) {
    params.set("mute", "1");
  }

  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
};

const watchUrlForVideo = (videoId: string) =>
  `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

function resolveInitialSession(
  sessions: LiveVideoDrawerSession[],
  requestedSessionId?: string | null,
) {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;
  if (requestedSessionId) {
    const exact = sessions.find((session) => session.sessionId === requestedSessionId);
    if (exact) return exact;
  }
  return sessions[0] ?? null;
}

function resolveInitialVideo(
  session: LiveVideoDrawerSession | null,
  requestedVideoId?: string | null,
) {
  if (!session || !Array.isArray(session.liveVideos) || session.liveVideos.length === 0) {
    return null;
  }
  if (requestedVideoId) {
    const exact = session.liveVideos.find((video) => video.videoId === requestedVideoId);
    if (exact) return exact;
  }
  return session.liveVideos.find((video) => video.isPrimary) ?? session.liveVideos[0] ?? null;
}

function sessionPairLabel(session: LiveVideoDrawerSession) {
  return [session.playerAName, session.playerBName].filter(Boolean).join(" vs ");
}

function formatAvg(value?: string | null, score?: number | null, innings?: number | null) {
  if (typeof value === "string" && value.trim()) return value.trim();
  const safeScore = Number(score ?? 0);
  const safeInnings = Number(innings ?? 0);
  if (!Number.isFinite(safeScore) || !Number.isFinite(safeInnings) || safeInnings <= 0) {
    return "--";
  }
  return (safeScore / safeInnings).toFixed(3);
}

function formatPercent(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `${value.toFixed(1)}%`;
}

function normalizeStat(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return String(Math.max(0, Math.trunc(value)));
}

function getSessionInningRows(session: LiveVideoDrawerSession) {
  const entries = Array.isArray(session.inningsDetail) ? session.inningsDetail : [];
  return [...entries]
    .filter((entry) => Number.isFinite(entry?.inning) && (entry?.inning ?? 0) > 0)
    .sort((a, b) => a.inning - b.inning)
    .slice(-8);
}

function PlayerMatchSheetCard({
  name,
  country,
  score,
  avg,
  firstHr,
  align = "left",
  active = false,
}: {
  name?: string | null;
  country?: string | null;
  score?: number | null;
  avg?: string | null;
  firstHr?: number | null;
  align?: "left" | "right";
  active?: boolean;
}) {
  const flagUrl = getCountryFlagCdnUrl(country ?? null, 40);
  return (
    <div className={`rounded-[20px] border px-3 py-3 shadow-[0_16px_40px_rgba(2,12,27,0.24)] ${
      active
        ? "border-cyan-300/35 bg-cyan-300/10"
        : "border-white/10 bg-white/[0.04]"
    }`}>
      <div className={`flex items-center gap-2 ${align === "right" ? "justify-end text-right" : "justify-start text-left"}`}>
        {align === "right" ? null : flagUrl ? (
          <img
            src={flagUrl}
            alt={country ?? ""}
            className="h-5 w-8 rounded-sm object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">{name || "Player"}</div>
        </div>
        {align === "right" && flagUrl ? (
          <img
            src={flagUrl}
            alt={country ?? ""}
            className="h-5 w-8 rounded-sm object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05]">
        {[
          { label: "Score", value: normalizeStat(score) },
          { label: "Avg", value: formatAvg(avg, score) },
          { label: "1st HR", value: normalizeStat(firstHr) },
        ].map((item) => (
          <div key={item.label} className="min-w-0 border-r border-white/10 px-1.5 py-2 last:border-r-0">
            <div className="text-center text-[10px] font-medium text-slate-300">{item.label}</div>
            <div className="mt-2 truncate text-center text-[13px] font-semibold text-white">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchSheetView({
  session,
}: {
  session: LiveVideoDrawerSession;
}) {
  const rows = getSessionInningRows(session);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <PlayerMatchSheetCard
          name={session.playerAName}
          country={session.playerACountry}
          score={session.scoreA}
          avg={session.avgFormattedA}
          firstHr={session.bestRunA}
          active={session.current === "A"}
        />
        <PlayerMatchSheetCard
          name={session.playerBName}
          country={session.playerBCountry}
          score={session.scoreB}
          avg={session.avgFormattedB}
          firstHr={session.bestRunB}
          align="right"
          active={session.current === "B"}
        />
      </div>

      <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.04]">
        <div className="grid grid-cols-[1fr_1fr_84px_1fr_1fr] border-b border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-medium text-slate-300">
          <div className="text-center">Point</div>
          <div className="text-center">Score</div>
          <div className="text-center">Inn</div>
          <div className="text-center">Point</div>
          <div className="text-center">Score</div>
        </div>
        {rows.length > 0 ? (
          <div>
            {rows.map((row, index) => (
              <div
                key={`inn-row-${row.inning}`}
                className={`grid grid-cols-[1fr_1fr_84px_1fr_1fr] items-center px-3 py-2.5 text-sm ${
                  index === 0 ? "" : "border-t border-white/10"
                }`}
              >
                <div className="text-center font-semibold text-white">{normalizeStat(row.player1?.pt)}</div>
                <div className="text-center font-semibold text-white">{normalizeStat(row.player1?.tot)}</div>
                <div className="mx-auto w-full max-w-[72px] rounded-xl bg-white/[0.05] px-2 py-1 text-center font-semibold text-cyan-100">
                  {normalizeStat(row.inning)}
                </div>
                <div className="text-center font-semibold text-white">{normalizeStat(row.player2?.pt)}</div>
                <div className="text-center font-semibold text-white">{normalizeStat(row.player2?.tot)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-10 text-center text-sm text-slate-300">
            No live inning detail yet.
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[18px] border border-white/10 bg-white/[0.04] px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Accuracy</div>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm font-semibold text-white">
            <span className="truncate">{session.playerAName || "A"}</span>
            <span>{formatPercent(session.accPercentA)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm font-semibold text-amber-200">
            <span className="truncate">{session.playerBName || "B"}</span>
            <span>{formatPercent(session.accPercentB)}</span>
          </div>
        </div>
        <div className="rounded-[18px] border border-white/10 bg-white/[0.04] px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Current run</div>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm font-semibold text-white">
            <span className="truncate">{session.playerAName || "A"}</span>
            <span>{normalizeStat(session.runA)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm font-semibold text-amber-200">
            <span className="truncate">{session.playerBName || "B"}</span>
            <span>{normalizeStat(session.runB)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

type VideoTileProps = {
  session: LiveVideoDrawerSession;
  video: LiveVideoEntry | null;
  muted?: boolean;
  compact?: boolean;
  fillHeight?: boolean;
  onSelectVideo?: (videoId: string) => void;
};

function VideoTile({
  session,
  video,
  muted = false,
  compact = false,
  fillHeight = false,
  onSelectVideo,
}: VideoTileProps) {
  return (
    <div
      className={`overflow-hidden rounded-[24px] border border-cyan-300/20 bg-slate-950/80 shadow-[0_18px_50px_rgba(8,47,73,0.28)] ${
        fillHeight ? "flex h-full min-h-0 flex-col" : ""
      }`}
    >
      {video ? (
        <div className={fillHeight ? "min-h-0 flex-1 bg-black" : "aspect-video bg-black"}>
          <iframe
            src={embedUrlForVideo(video.videoId, { muted })}
            title={video.title || session.title || "Live video"}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center bg-slate-950 px-4 text-center text-sm text-slate-300">
          No linked live video for this match.
        </div>
      )}

      {session.liveVideos.length > 1 && onSelectVideo ? (
        <div className="border-t border-white/10 px-4 py-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Session videos
          </div>
          <div className={`flex flex-wrap gap-2 ${compact ? "" : ""}`}>
            {session.liveVideos.map((entry, index) => {
              const active = entry.videoId === video?.videoId;
              return (
                <button
                  key={`${session.sessionId}-${entry.videoId}`}
                  type="button"
                  onClick={() => onSelectVideo(entry.videoId)}
                  className={`rounded-xl border px-2.5 py-1 text-[11px] font-semibold transition ${
                    active
                      ? "border-cyan-300/55 bg-cyan-300/15 text-white"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {entry.label || entry.title || `Video ${index + 1}`}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type VideoWallProps = {
  sessions: LiveVideoDrawerSession[];
  resolveVideoForSession: (session: LiveVideoDrawerSession) => LiveVideoEntry | null;
  onClose: () => void;
};

function VideoWall({ sessions, resolveVideoForSession, onClose }: VideoWallProps) {
  const wallRef = React.useRef<HTMLDivElement | null>(null);
  const visibleSessions = sessions.slice(0, MAX_SELECTED_SESSIONS);
  const gridClass =
    visibleSessions.length >= 3
      ? "grid-cols-1 xl:grid-cols-2"
      : "grid-cols-1";

  React.useEffect(() => {
    const wallElement = wallRef.current;
    if (!wallElement || typeof document === "undefined") return;

    const handleFullscreenChange = () => {
      if (document.fullscreenElement) return;
      onClose();
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    const openFullscreen = async () => {
      if (document.fullscreenElement === wallElement) return;
      if (typeof wallElement.requestFullscreen !== "function") return;
      try {
        await wallElement.requestFullscreen();
      } catch {
        // Keep the wall open as a normal overlay when fullscreen is denied.
      }
    };

    void openFullscreen();

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (document.fullscreenElement === wallElement) {
        void document.exitFullscreen().catch(() => undefined);
      }
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={wallRef}
      className="fixed inset-0 z-[140] bg-black/95 px-4 py-4 sm:px-6 sm:py-6"
    >
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/80">
              Multiple view
            </div>
            <h2 className="mt-1 text-lg font-semibold text-white">
              Live video wall
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1">
          <div className={`grid h-full auto-rows-fr gap-4 ${gridClass}`}>
            {visibleSessions.map((session) => (
              <VideoTile
                key={`wall-${session.sessionId}`}
                session={session}
                video={resolveVideoForSession(session)}
                muted
                compact
                fillHeight
              />
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function LiveVideoDrawer({
  open,
  sessions,
  initialSessionId,
  initialVideoId,
  heading = "Live videos",
  onSelectedSessionsChange,
  onClose,
}: LiveVideoDrawerProps) {
  const [mounted, setMounted] = React.useState(false);
  const [focusedSessionId, setFocusedSessionId] = React.useState<string | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = React.useState<string[]>([]);
  const [selectedVideoBySession, setSelectedVideoBySession] = React.useState<
    Record<string, string>
  >({});
  const [wallOpen, setWallOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"video" | "sheet">("video");
  const handleWallClose = React.useCallback(() => {
    setWallOpen(false);
  }, []);

  const wasOpenRef = React.useRef(false);
  const lastRequestKeyRef = React.useRef("");

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const sessionMap = React.useMemo(
    () => new Map(sessions.map((session) => [session.sessionId, session] as const)),
    [sessions],
  );

  React.useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      lastRequestKeyRef.current = "";
      setWallOpen(false);
      return;
    }

    const requestedSession = resolveInitialSession(sessions, initialSessionId);
    if (!requestedSession) return;
    const requestedVideo = resolveInitialVideo(requestedSession, initialVideoId);

    const requestKey = `${requestedSession.sessionId}:${requestedVideo?.videoId ?? "sheet"}`;
    const firstOpen = !wasOpenRef.current;
    const requestChanged = lastRequestKeyRef.current !== requestKey;

    if (!firstOpen && !requestChanged) return;

    setFocusedSessionId(requestedSession.sessionId);
    if (requestedVideo) {
      setSelectedVideoBySession((prev) => ({
        ...prev,
        [requestedSession.sessionId]:
          prev[requestedSession.sessionId] ?? requestedVideo.videoId,
      }));
    }
    setSelectedSessionIds((prev) => {
      if (firstOpen) return [requestedSession.sessionId];
      if (prev.includes(requestedSession.sessionId)) return prev;
      if (prev.length >= MAX_SELECTED_SESSIONS) return prev;
      return [...prev, requestedSession.sessionId];
    });

    wasOpenRef.current = true;
    lastRequestKeyRef.current = requestKey;
  }, [initialSessionId, initialVideoId, open, sessions]);

  React.useEffect(() => {
    if (!open) return;

    setSelectedSessionIds((prev) => {
      const next = prev.filter((sessionId) => sessionMap.has(sessionId));
      return next.length === prev.length ? prev : next;
    });

    setSelectedVideoBySession((prev) => {
      const nextEntries = Object.entries(prev).filter(([sessionId]) =>
        sessionMap.has(sessionId),
      );
      if (nextEntries.length === Object.keys(prev).length) return prev;
      return Object.fromEntries(nextEntries);
    });
  }, [open, sessionMap]);

  React.useEffect(() => {
    if (!wallOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [wallOpen]);

  const selectedSessions = React.useMemo(
    () =>
      selectedSessionIds
        .map((sessionId) => sessionMap.get(sessionId) ?? null)
        .filter((session): session is LiveVideoDrawerSession => Boolean(session)),
    [selectedSessionIds, sessionMap],
  );

  const focusedSession =
    (focusedSessionId ? sessionMap.get(focusedSessionId) : null) ??
    selectedSessions[0] ??
    resolveInitialSession(sessions, initialSessionId);

  const resolveVideoForSession = React.useCallback(
    (session: LiveVideoDrawerSession) => {
      const selectedVideoId = selectedVideoBySession[session.sessionId] ?? null;
      return (
        session.liveVideos.find((video) => video.videoId === selectedVideoId) ??
        resolveInitialVideo(session, initialVideoId)
      );
    },
    [initialVideoId, selectedVideoBySession],
  );

  const focusedVideo = focusedSession ? resolveVideoForSession(focusedSession) : null;
  const focusedHasVideo = Boolean(focusedSession && focusedSession.liveVideos.length > 0 && focusedVideo);
  const selectedVideoSessions = React.useMemo(
    () => selectedSessions.filter((session) => session.liveVideos.length > 0 && resolveVideoForSession(session)),
    [resolveVideoForSession, selectedSessions],
  );

  const selectedCount = selectedSessions.length;
  const panelWidthClass = "w-full xl:w-[420px]";

  const setSessionVideo = React.useCallback((sessionId: string, videoId: string) => {
    setFocusedSessionId(sessionId);
    setSelectedVideoBySession((prev) => ({
      ...prev,
      [sessionId]: videoId,
    }));
  }, []);

  const clearAll = React.useCallback(() => {
    setSelectedSessionIds([]);
    setFocusedSessionId(null);
    setSelectedVideoBySession({});
    setWallOpen(false);
    onClose();
  }, [onClose]);

  React.useEffect(() => {
    if (!open) return;
    if (focusedSessionId && selectedSessionIds.includes(focusedSessionId)) return;
    setFocusedSessionId(selectedSessionIds[0] ?? null);
  }, [focusedSessionId, open, selectedSessionIds]);

  React.useEffect(() => {
    onSelectedSessionsChange?.(selectedSessionIds);
  }, [onSelectedSessionsChange, selectedSessionIds]);

  React.useEffect(() => {
    if (!open) return;
    setActiveTab(focusedHasVideo ? "video" : "sheet");
  }, [focusedHasVideo, focusedSession?.sessionId, open]);

  if (!mounted || !open) return null;

  return (
    <>
      <aside
        className={`${panelWidthClass} shrink-0 overflow-hidden rounded-[28px] border border-cyan-300/20 bg-[linear-gradient(180deg,#06111e_0%,#0b2035_100%)] text-white shadow-[0_24px_80px_rgba(2,6,23,0.30)]`}
        aria-label={heading}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex min-h-[42px] flex-1 items-center" />
          <div className="flex shrink-0 items-center justify-end gap-2 whitespace-nowrap">
            <button
              type="button"
              onClick={() => setWallOpen(true)}
              disabled={selectedVideoSessions.length === 0}
              className="rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-3 py-1.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Multiple view
            </button>
          </div>
        </div>

        <div className="border-b border-white/10 px-4 py-4">
          {selectedCount === 0 || !focusedSession ? (
            <div className="rounded-[24px] border border-dashed border-white/15 bg-white/5 px-4 py-10 text-center text-sm text-slate-300">
              Pick live matches from the cards to add them here.
            </div>
          ) : (
            <>
              <div className="mb-4">
                <div className="truncate text-lg font-semibold text-white">{focusedSession.title}</div>
                <div className="mt-1 truncate text-sm text-slate-300">
                  {focusedSession.subtitle || sessionPairLabel(focusedSession) || "Live match"}
                </div>
              </div>
              <div className="mb-3 inline-flex rounded-2xl border border-white/10 bg-white/[0.05] p-1">
                {focusedHasVideo ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab("video")}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      activeTab === "video"
                        ? "bg-cyan-300/15 text-white"
                        : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    Video
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setActiveTab("sheet")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === "sheet"
                      ? "bg-cyan-300/15 text-white"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  Match sheet
                </button>
              </div>
              {activeTab === "video" && focusedHasVideo ? (
                <>
                  <VideoTile
                    session={focusedSession}
                    video={focusedVideo}
                    onSelectVideo={(videoId) => setSessionVideo(focusedSession.sessionId, videoId)}
                  />
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-200/80">
                          Live video
                        </div>
                        <p className="mt-2 text-sm text-slate-300">
                          Select up to {MAX_SELECTED_SESSIONS} live matches and launch a
                          multiple view wall.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWallOpen(true)}
                        disabled={selectedVideoSessions.length === 0}
                        className="rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-3 py-1.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Multiple view
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <MatchSheetView session={focusedSession} />
              )}
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-300">
                  {selectedCount === 1
                    ? "1 match selected"
                    : `${selectedCount} matches selected for multiple view`}
                </div>
                {activeTab === "video" && focusedVideo ? (
                  <a
                    href={watchUrlForVideo(focusedVideo.videoId)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15"
                  >
                    YouTube
                  </a>
                ) : null}
              </div>
              {selectedSessions.length > 1 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedSessions.map((session) => {
                    const active = session.sessionId === focusedSession.sessionId;
                    return (
                      <button
                        key={`selected-${session.sessionId}`}
                        type="button"
                        onClick={() => setFocusedSessionId(session.sessionId)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          active
                            ? "border-cyan-300/55 bg-cyan-300/15 text-white"
                            : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        {session.playerAName && session.playerBName
                          ? `${session.playerAName} vs ${session.playerBName}`
                          : session.title}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </>
          )}
        </div>

      </aside>

      {wallOpen && selectedVideoSessions.length > 0 ? (
        <VideoWall
          sessions={selectedVideoSessions}
          resolveVideoForSession={resolveVideoForSession}
          onClose={handleWallClose}
        />
      ) : null}
    </>
  );
}

export type { DrawerLaunchOrigin, LiveVideoDrawerSession };
