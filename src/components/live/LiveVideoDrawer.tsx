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
  onClose: () => void;
};

const LIVE_ICON_SRC = "/icons%20webp/live4.webp";
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
  onFullscreen: (videoId: string) => void;
  onRemove?: () => void;
  onSelectVideo?: (videoId: string) => void;
};

function VideoTile({
  session,
  video,
  muted = false,
  onFullscreen,
  onRemove,
  onSelectVideo,
}: VideoTileProps) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-cyan-300/20 bg-slate-950/80 shadow-[0_18px_50px_rgba(8,47,73,0.28)]">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">{session.title}</div>
          <div className="mt-1 truncate text-xs text-slate-300">
            {session.subtitle || sessionPairLabel(session) || "Live match"}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-xl border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-white/15"
            >
              Remove
            </button>
          ) : null}
          {video ? (
            <button
              type="button"
              onClick={() => onFullscreen(video.videoId)}
              className="rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
            >
              Full screen
            </button>
          ) : null}
        </div>
      </div>

      {video ? (
        <div className="aspect-video bg-black">
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
          <div className="flex flex-wrap gap-2">
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

export function LiveVideoDrawer({
  open,
  sessions,
  initialSessionId,
  initialVideoId,
  launchOrigin,
  heading = "Live videos",
  onClose,
}: LiveVideoDrawerProps) {
  const [mounted, setMounted] = React.useState(false);
  const [focusedSessionId, setFocusedSessionId] = React.useState<string | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = React.useState<string[]>([]);
  const [selectedVideoBySession, setSelectedVideoBySession] = React.useState<
    Record<string, string>
  >({});
  const [fullscreenVideoId, setFullscreenVideoId] = React.useState<string | null>(null);
  const [launchActive, setLaunchActive] = React.useState(false);

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
    if (!open || !launchOrigin) {
      setLaunchActive(false);
      return;
    }
    setLaunchActive(false);
    const frame = window.requestAnimationFrame(() => {
      setLaunchActive(true);
    });
    const timeout = window.setTimeout(() => {
      setLaunchActive(false);
    }, 620);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [launchOrigin, open]);

  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (fullscreenVideoId) {
          setFullscreenVideoId(null);
          return;
        }
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreenVideoId, onClose, open]);

  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

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
    (session: LiveVideoDrawerSession | null) => {
      if (!session) return null;
      const selectedVideoId = selectedVideoBySession[session.sessionId] ?? null;
      return (
        session.liveVideos.find((video) => video.videoId === selectedVideoId) ??
        resolveInitialVideo(session, initialVideoId)
      );
    },
    [initialVideoId, selectedVideoBySession],
  );

  const focusedVideo = resolveVideoForSession(focusedSession ?? null);

  const fullscreenVideo = React.useMemo(() => {
    if (!fullscreenVideoId) return null;
    for (const session of sessions) {
      const match = session.liveVideos.find((video) => video.videoId === fullscreenVideoId);
      if (match) return match;
    }
    return null;
  }, [fullscreenVideoId, sessions]);

  const selectedCount = selectedSessions.length;
  const isMultiMode = selectedCount > 1;
  const isWideMode = selectedCount >= 3;

  const drawerWidth = isWideMode ? "min(100vw, 980px)" : "min(100vw, 460px)";
  const launchTargetLeft =
    typeof window !== "undefined"
      ? Math.max(16, window.innerWidth - (isWideMode ? 240 : 160))
      : 16;
  const launchTargetTop = 96;
  const launchTargetScale = 0.35;

  const replaceWithSession = React.useCallback(
    (session: LiveVideoDrawerSession) => {
      const nextVideo = resolveInitialVideo(session, null);
      setFocusedSessionId(session.sessionId);
      setSelectedSessionIds([session.sessionId]);
      if (nextVideo) {
        setSelectedVideoBySession((prev) => ({
          ...prev,
          [session.sessionId]: prev[session.sessionId] ?? nextVideo.videoId,
        }));
      }
    },
    [],
  );

  const addSession = React.useCallback(
    (session: LiveVideoDrawerSession) => {
      const nextVideo = resolveInitialVideo(session, null);
      setFocusedSessionId(session.sessionId);
      setSelectedSessionIds((prev) => {
        if (prev.includes(session.sessionId)) return prev;
        if (prev.length >= MAX_SELECTED_SESSIONS) return prev;
        return [...prev, session.sessionId];
      });
      if (nextVideo) {
        setSelectedVideoBySession((prev) => ({
          ...prev,
          [session.sessionId]: prev[session.sessionId] ?? nextVideo.videoId,
        }));
      }
    },
    [],
  );

  const removeSession = React.useCallback((sessionId: string) => {
    setSelectedSessionIds((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((id) => id !== sessionId);
    });
    setFocusedSessionId((prev) => (prev === sessionId ? null : prev));
  }, []);

  const setSessionVideo = React.useCallback((sessionId: string, videoId: string) => {
    setFocusedSessionId(sessionId);
    setSelectedVideoBySession((prev) => ({
      ...prev,
      [sessionId]: videoId,
    }));
  }, []);

  const keepOnlySession = React.useCallback((sessionId: string) => {
    setFocusedSessionId(sessionId);
    setSelectedSessionIds([sessionId]);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    if (focusedSessionId && selectedSessionIds.includes(focusedSessionId)) return;
    setFocusedSessionId(selectedSessionIds[0] ?? null);
  }, [focusedSessionId, open, selectedSessionIds]);

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[110] bg-slate-950/75" aria-hidden="true" />

      {launchOrigin ? (
        <div
          className="pointer-events-none fixed z-[118] flex h-12 w-12 items-center justify-center rounded-2xl border border-transparent bg-transparent shadow-none transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            left: launchActive ? launchTargetLeft : launchOrigin.left,
            top: launchActive ? launchTargetTop : launchOrigin.top,
            transform: launchActive
              ? `scale(${launchTargetScale}) rotate(8deg)`
              : "scale(1) rotate(0deg)",
            opacity: launchActive ? 0 : 1,
          }}
        >
          <img
            src={LIVE_ICON_SRC}
            alt=""
            className="h-8 w-8 object-contain drop-shadow-[0_10px_22px_rgba(15,23,42,0.38)]"
          />
        </div>
      ) : null}

      <aside
        className="fixed inset-y-0 right-0 z-[115] flex w-full max-w-none translate-x-0 flex-col border-l border-white/10 bg-[linear-gradient(180deg,#06111e_0%,#0b2035_100%)] text-white shadow-[-30px_0_80px_rgba(2,6,23,0.45)] transition-transform duration-300 ease-out"
        style={{ width: drawerWidth }}
        aria-modal="true"
        role="dialog"
        aria-label={heading}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-200/80">
              Live video
            </div>
            <h2 className="mt-1 text-lg font-semibold text-white">{heading}</h2>
            <p className="mt-1 text-sm text-slate-300">
              {selectedCount} selected, up to {MAX_SELECTED_SESSIONS}. Grid videos play muted.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedCount > 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (focusedSession) keepOnlySession(focusedSession.sessionId);
                }}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Keep one
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-white/10 px-4 py-4">
            {!isMultiMode ? (
              focusedSession ? (
                <>
                  <VideoTile
                    session={focusedSession}
                    video={focusedVideo}
                    onFullscreen={(videoId) => setFullscreenVideoId(videoId)}
                    onSelectVideo={(videoId) =>
                      setSessionVideo(focusedSession.sessionId, videoId)
                    }
                  />
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-300">
                    <span>
                      Single-video mode. Add more matches from the list below to test
                      2-up or 4-grid mode.
                    </span>
                    {focusedVideo ? (
                      <a
                        href={watchUrlForVideo(focusedVideo.videoId)}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 font-semibold text-white transition hover:bg-white/15"
                      >
                        YouTube
                      </a>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/15 bg-white/5 px-4 py-10 text-center text-sm text-slate-300">
                  No live video is linked to this match yet.
                </div>
              )
            ) : (
              <>
                <div
                  className={
                    selectedCount >= 3
                      ? "grid grid-cols-1 gap-4 md:grid-cols-2"
                      : "space-y-4"
                  }
                >
                  {selectedSessions.map((session) => (
                    <VideoTile
                      key={session.sessionId}
                      session={session}
                      video={resolveVideoForSession(session)}
                      muted
                      onFullscreen={(videoId) => setFullscreenVideoId(videoId)}
                      onRemove={() => removeSession(session.sessionId)}
                      onSelectVideo={(videoId) => setSessionVideo(session.sessionId, videoId)}
                    />
                  ))}
                </div>
                <div className="mt-3 text-xs text-slate-300">
                  {selectedCount === 2
                    ? "Two selected matches play stacked vertically."
                    : "Three or four selected matches switch the drawer to a 2x2 grid."}
                </div>
              </>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Tournament collection
            </div>
            <div className="space-y-3">
              {sessions.map((session) => {
                const sessionSelected = selectedSessionIds.includes(session.sessionId);
                const canAdd =
                  !sessionSelected && selectedSessionIds.length < MAX_SELECTED_SESSIONS;
                const activeVideo = resolveVideoForSession(session);

                return (
                  <div
                    key={session.sessionId}
                    className={`rounded-[22px] border p-4 transition ${
                      sessionSelected
                        ? "border-cyan-300/45 bg-cyan-300/10 shadow-[0_16px_40px_rgba(8,47,73,0.22)]"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (sessionSelected) {
                            setFocusedSessionId(session.sessionId);
                          } else {
                            replaceWithSession(session);
                          }
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="truncate text-sm font-semibold text-white">
                          {session.title}
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-300">
                          {session.subtitle || sessionPairLabel(session) || "Live match"}
                        </div>
                      </button>

                      <div className="flex shrink-0 items-center gap-2">
                        <div className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-100">
                          {session.liveVideos.length}
                        </div>
                        {sessionSelected ? (
                          <>
                            {selectedCount > 1 ? (
                              <button
                                type="button"
                                onClick={() => keepOnlySession(session.sessionId)}
                                className="rounded-xl border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-white/15"
                              >
                                Solo
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => removeSession(session.sessionId)}
                              disabled={selectedCount <= 1}
                              className="rounded-xl border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addSession(session)}
                            disabled={!canAdd}
                            className="rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>

                    {sessionSelected && session.liveVideos.length > 1 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {session.liveVideos.map((entry, index) => {
                          const active = entry.videoId === activeVideo?.videoId;
                          return (
                            <button
                              key={`${session.sessionId}-${entry.videoId}`}
                              type="button"
                              onClick={() => setSessionVideo(session.sessionId, entry.videoId)}
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
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      {fullscreenVideo ? (
        <div
          className="fixed inset-0 z-[125] bg-black/95 px-4 py-4 sm:px-8 sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-label={fullscreenVideo.title || "Fullscreen live video"}
        >
          <div className="flex h-full flex-col">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold text-white">
                  {fullscreenVideo.title || "Live stream"}
                </div>
                <div className="mt-1 text-sm text-slate-300">Full-screen player</div>
              </div>
              <button
                type="button"
                onClick={() => setFullscreenVideoId(null)}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-[26px] border border-white/10 bg-black shadow-[0_30px_80px_rgba(2,6,23,0.5)]">
              <iframe
                src={embedUrlForVideo(fullscreenVideo.videoId)}
                title={fullscreenVideo.title || "Fullscreen live video"}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      ) : null}
    </>,
    document.body,
  );
}

export type { DrawerLaunchOrigin, LiveVideoDrawerSession };
