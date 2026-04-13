"use client";

import React from "react";
import { createPortal } from "react-dom";
import type { LiveVideoEntry } from "@/lib/liveVideos";

type LiveVideoDrawerSession = {
  sessionId: string;
  screenId?: string | null;
  title: string;
  subtitle?: string | null;
  playerAName?: string | null;
  playerBName?: string | null;
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
      <div className="border-b border-white/10 px-4 py-3">
        <div className="truncate text-sm font-semibold text-white">{session.title}</div>
        <div className="mt-1 truncate text-xs text-slate-300">
          {session.subtitle || sessionPairLabel(session) || "Live match"}
        </div>
      </div>

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
    const requestedVideo = resolveInitialVideo(requestedSession, initialVideoId);
    if (!requestedSession || !requestedVideo) return;

    const requestKey = `${requestedSession.sessionId}:${requestedVideo.videoId}`;
    const firstOpen = !wasOpenRef.current;
    const requestChanged = lastRequestKeyRef.current !== requestKey;

    if (!firstOpen && !requestChanged) return;

    setFocusedSessionId(requestedSession.sessionId);
    setSelectedVideoBySession((prev) => ({
      ...prev,
      [requestedSession.sessionId]:
        prev[requestedSession.sessionId] ?? requestedVideo.videoId,
    }));
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

  if (!mounted || !open) return null;

  return (
    <>
      <aside
        className={`${panelWidthClass} shrink-0 overflow-hidden rounded-[28px] border border-cyan-300/20 bg-[linear-gradient(180deg,#06111e_0%,#0b2035_100%)] text-white shadow-[0_24px_80px_rgba(2,6,23,0.30)]`}
        aria-label={heading}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-200/80">
              Live video
            </div>
            <h2 className="mt-1 text-lg font-semibold text-white">{heading}</h2>
            <p className="mt-1 text-sm text-slate-300">
              Select up to {MAX_SELECTED_SESSIONS} live matches and launch a
              multiple view wall.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setWallOpen(true)}
              disabled={selectedCount === 0}
              className="rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-3 py-1.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Multiple view
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Close
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
              <VideoTile
                session={focusedSession}
                video={focusedVideo}
                onSelectVideo={(videoId) => setSessionVideo(focusedSession.sessionId, videoId)}
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-300">
                  {selectedCount === 1
                    ? "1 match selected"
                    : `${selectedCount} matches selected for multiple view`}
                </div>
                {focusedVideo ? (
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

      {wallOpen && selectedSessions.length > 0 ? (
        <VideoWall
          sessions={selectedSessions}
          resolveVideoForSession={resolveVideoForSession}
          onClose={handleWallClose}
        />
      ) : null}
    </>
  );
}

export type { DrawerLaunchOrigin, LiveVideoDrawerSession };
