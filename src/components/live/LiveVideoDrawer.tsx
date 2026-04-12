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

const embedUrlForVideo = (videoId: string) =>
  `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

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
  const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = React.useState<string | null>(null);
  const [fullscreenVideoId, setFullscreenVideoId] = React.useState<string | null>(null);
  const [launchActive, setLaunchActive] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const nextSession = resolveInitialSession(sessions, initialSessionId);
    const nextVideo = resolveInitialVideo(nextSession, initialVideoId);
    setSelectedSessionId(nextSession?.sessionId ?? null);
    setSelectedVideoId(nextVideo?.videoId ?? null);
  }, [initialSessionId, initialVideoId, open, sessions]);

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

  const selectedSession = React.useMemo(
    () =>
      sessions.find((session) => session.sessionId === selectedSessionId) ??
      resolveInitialSession(sessions, initialSessionId),
    [initialSessionId, selectedSessionId, sessions],
  );

  const selectedVideo = React.useMemo(
    () =>
      selectedSession?.liveVideos.find((video) => video.videoId === selectedVideoId) ??
      resolveInitialVideo(selectedSession ?? null, initialVideoId),
    [initialVideoId, selectedSession, selectedVideoId],
  );

  const fullscreenVideo = React.useMemo(() => {
    if (!fullscreenVideoId) return null;
    for (const session of sessions) {
      const match = session.liveVideos.find((video) => video.videoId === fullscreenVideoId);
      if (match) return match;
    }
    return null;
  }, [fullscreenVideoId, sessions]);

  if (!mounted || !open) return null;

  const drawerWidth = "min(100vw, 460px)";
  const launchTargetLeft =
    typeof window !== "undefined" ? Math.max(16, window.innerWidth - 160) : 16;
  const launchTargetTop = 96;
  const launchTargetScale = 0.35;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[110] bg-slate-950/75"
        onClick={onClose}
        aria-hidden="true"
      />

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
        className="fixed inset-y-0 right-0 z-[115] flex w-full max-w-[460px] translate-x-0 flex-col border-l border-white/10 bg-[linear-gradient(180deg,#06111e_0%,#0b2035_100%)] text-white shadow-[-30px_0_80px_rgba(2,6,23,0.45)] transition-transform duration-300 ease-out"
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
              {sessions.length} {sessions.length === 1 ? "match" : "matches"} with linked streams
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Close
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-white/10 px-4 py-4">
            {selectedVideo ? (
              <>
                <div className="overflow-hidden rounded-[24px] border border-cyan-300/25 bg-slate-950 shadow-[0_18px_50px_rgba(8,47,73,0.35)]">
                  <div className="aspect-video bg-black">
                    <iframe
                      src={embedUrlForVideo(selectedVideo.videoId)}
                      title={selectedVideo.title || selectedSession?.title || "Live video"}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {selectedVideo.title || selectedSession?.title || "Live stream"}
                    </div>
                    <div className="mt-1 truncate text-xs text-slate-300">
                      {selectedSession?.subtitle ||
                        [selectedSession?.playerAName, selectedSession?.playerBName]
                          .filter(Boolean)
                          .join(" vs ")}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFullscreenVideoId(selectedVideo.videoId)}
                      className="rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
                    >
                      Full screen
                    </button>
                    <a
                      href={watchUrlForVideo(selectedVideo.videoId)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15"
                    >
                      YouTube
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/15 bg-white/5 px-4 py-10 text-center text-sm text-slate-300">
                No live video is linked to this match yet.
              </div>
            )}
          </div>

          {selectedSession && selectedSession.liveVideos.length > 1 ? (
            <div className="border-b border-white/10 px-4 py-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Videos
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {selectedSession.liveVideos.map((video, index) => {
                  const active = video.videoId === selectedVideo?.videoId;
                  return (
                    <button
                      key={`${selectedSession.sessionId}-${video.videoId}`}
                      type="button"
                      onClick={() => setSelectedVideoId(video.videoId)}
                      className={`min-w-[110px] rounded-2xl border px-3 py-2 text-left transition ${
                        active
                          ? "border-cyan-300/60 bg-cyan-300/15 text-white"
                          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-100/75">
                        Video {index + 1}
                      </div>
                      <div className="mt-1 truncate text-sm font-semibold">
                        {video.label || video.title || video.videoId}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Tournament collection
            </div>
            <div className="space-y-3">
              {sessions.map((session) => {
                const active = session.sessionId === selectedSession?.sessionId;
                return (
                  <button
                    key={session.sessionId}
                    type="button"
                    onClick={() => {
                      setSelectedSessionId(session.sessionId);
                      setSelectedVideoId(
                        resolveInitialVideo(session, null)?.videoId ?? null,
                      );
                    }}
                    className={`w-full rounded-[22px] border p-4 text-left transition ${
                      active
                        ? "border-cyan-300/50 bg-cyan-300/12 shadow-[0_16px_40px_rgba(8,47,73,0.24)]"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">
                          {session.title}
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-300">
                          {session.subtitle ||
                            [session.playerAName, session.playerBName]
                              .filter(Boolean)
                              .join(" vs ")}
                        </div>
                      </div>
                      <div className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-100">
                        {session.liveVideos.length}
                      </div>
                    </div>
                  </button>
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
                <div className="mt-1 text-sm text-slate-300">
                  Full-screen player
                </div>
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
