"use client";

import Hls from "hls.js";
import Link from "next/link";
import React from "react";
import { ArrowLeft, Film } from "lucide-react";
import {
  AccountAccessCard,
  formatDateTime,
  PrivateAccountShell,
} from "@/components/account/PrivateAccountShell";
import { useAccountSession } from "@/components/account/AccountSessionProvider";
import {
  playerAccountAuth,
  type PlayerAccountFriendlyRecording,
  type PlayerAccountFriendlyRecordingEvent,
} from "@/lib/player-account-auth";

type PageProps = {
  params: Promise<{ recordingId: string }>;
};

type RecordingStream = {
  url: string;
  type: "hls" | "mp4";
};

function streamCandidatesFor(recording: PlayerAccountFriendlyRecording | null): RecordingStream[] {
  const seen = new Set<string>();
  const streams: RecordingStream[] = [];
  const pushStream = (stream: RecordingStream | null) => {
    if (!stream || seen.has(`${stream.type}:${stream.url}`)) return;
    seen.add(`${stream.type}:${stream.url}`);
    streams.push(stream);
  };
  const pushStreamsFromUrl = (rawUrl: string | null | undefined) => {
    const url = rawUrl?.trim();
    if (!url) return;
    if (url.includes("/playback/get?") || url.includes("format=mp4") || /\.mp4(?:[?#]|$)/i.test(url)) {
      pushStream({ url, type: "mp4" });
      return;
    }
    if (/\.m3u8(?:[?#]|$)/i.test(url)) {
      pushStream({ url, type: "hls" });
      return;
    }
    pushStream({ url: `${url.replace(/\/+$/, "")}/index.m3u8`, type: "hls" });
    pushStream({ url, type: "mp4" });
  };

  if (recording?.processingStatus === "ready" && recording.processedPlaybackUrl?.trim()) {
    pushStreamsFromUrl(recording.processedPlaybackUrl);
    return streams;
  }

  const playerOnlyRequested =
    recording?.requestedPlayerSlot === "p1" || recording?.requestedPlayerSlot === "p2";
  if (
    playerOnlyRequested &&
    recording?.processingStatus !== "not-requested" &&
    recording?.processingStatus !== "failed"
  ) {
    return [];
  }

  const playback = recording?.playbackUrl?.trim();
  const live = recording?.hlsUrl?.trim();
  const isRecorded = recording?.status === "stopped" || recording?.status === "expired" || Boolean(recording?.endedAt);
  if (isRecorded) {
    const token = playerAccountAuth.getJwt();
    if (recording?.id && token) {
      pushStream({
        url: `/account-access/friendly-recordings/${encodeURIComponent(String(recording.id))}/video?token=${encodeURIComponent(token)}`,
        type: "mp4",
      });
    }
    pushStreamsFromUrl(playback);
    pushStreamsFromUrl(live);
  } else {
    pushStreamsFromUrl(live);
    pushStreamsFromUrl(playback);
  }
  return streams;
}

function streamFor(recording: PlayerAccountFriendlyRecording | null) {
  return streamCandidatesFor(recording)[0] ?? null;
}

function usesFullVideoFallback(recording: PlayerAccountFriendlyRecording | null) {
  const playerOnlyRequested =
    recording?.requestedPlayerSlot === "p1" || recording?.requestedPlayerSlot === "p2";
  return playerOnlyRequested && recording?.processingStatus === "failed" && Boolean(recording.hlsUrl || recording.playbackUrl);
}

function processedVideoLabel(recording: PlayerAccountFriendlyRecording | null) {
  if (recording?.processingStatus !== "ready") return "";
  return recording.requestedPlayerSlot === "p1" || recording.requestedPlayerSlot === "p2"
    ? " | Player-only video"
    : " | Optimized video";
}

function RecordingVideo({ recording }: { recording: PlayerAccountFriendlyRecording }) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = React.useState("Opening recording...");
  const streams = React.useMemo(() => streamCandidatesFor(recording), [recording]);
  const [streamIndex, setStreamIndex] = React.useState(0);
  const stream = streams[streamIndex] ?? null;

  React.useEffect(() => {
    setStreamIndex(0);
    setStatus("Opening recording...");
  }, [recording.id, recording.playbackUrl, recording.hlsUrl, recording.processedPlaybackUrl]);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream?.url) return;
    let hls: Hls | null = null;
    let cancelled = false;
    let readyCheckTimer: number | null = null;

    const clearReadyCheckTimer = () => {
      if (readyCheckTimer === null) return;
      window.clearInterval(readyCheckTimer);
      readyCheckTimer = null;
    };
    const clearOpeningStatusIfReady = () => {
      if (cancelled) return;
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        setStatus("");
        clearReadyCheckTimer();
      }
    };

    const tryNextStream = (message: string) => {
      if (cancelled) return;
      if (streamIndex < streams.length - 1) {
        setStatus("Trying another recording source...");
        setStreamIndex((current) => Math.min(current + 1, streams.length - 1));
        return;
      }
      setStatus(message);
    };
    const onError = () => {
      tryNextStream("Recording video is not available yet.");
    };
    const onLoadedMetadata = () => {
      clearOpeningStatusIfReady();
    };
    video.addEventListener("error", onError);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("durationchange", onLoadedMetadata);
    video.addEventListener("loadeddata", onLoadedMetadata);
    video.addEventListener("canplay", onLoadedMetadata);
    video.preload = "auto";

    if (stream.type === "mp4") {
      video.src = stream.url;
      video.load();
      setStatus("");
    } else if (Hls.isSupported()) {
      hls = new Hls({ backBufferLength: 60 });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!cancelled && data.fatal) tryNextStream(data.details || "HLS recording error");
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!cancelled) setStatus("");
      });
      hls.loadSource(stream.url);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = stream.url;
      video.load();
    } else {
      setStatus("HLS is not supported in this browser");
    }

    clearOpeningStatusIfReady();
    readyCheckTimer = window.setInterval(clearOpeningStatusIfReady, 250);

    return () => {
      cancelled = true;
      clearReadyCheckTimer();
      video.removeEventListener("error", onError);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("durationchange", onLoadedMetadata);
      video.removeEventListener("loadeddata", onLoadedMetadata);
      video.removeEventListener("canplay", onLoadedMetadata);
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [stream?.type, stream?.url, streamIndex, streams.length]);

  return (
    <div className="relative aspect-video overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-contain"
        controls
        playsInline
        preload="auto"
      />
      {status ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-6 text-center text-sm font-semibold text-white">
          {status}
        </div>
      ) : null}
    </div>
  );
}

export default function FriendlyRecordingPlaybackPage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  const recordingId = resolvedParams.recordingId;
  const { account, setAccount, isLoading } = useAccountSession();
  const [recording, setRecording] = React.useState<PlayerAccountFriendlyRecording | null>(null);
  const [events, setEvents] = React.useState<PlayerAccountFriendlyRecordingEvent[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!account) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [recordingsData, eventsData] = await Promise.all([
          playerAccountAuth.friendlyRecordings(),
          playerAccountAuth.friendlyRecordingEvents(recordingId),
        ]);
        if (cancelled) return;
        setRecording(recordingsData.find((item) => String(item.id) === String(recordingId)) ?? null);
        setEvents([...eventsData].sort((a, b) => (a.offsetMs ?? 0) - (b.offsetMs ?? 0)));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Recording playback failed.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [account, recordingId]);

  if (isLoading) return <main className="min-h-screen bg-[#f4f0e6] px-5 py-8">Loading account...</main>;
  if (!account) return <AccountAccessCard onAuthenticated={async (next) => setAccount(next)} />;

  return (
    <PrivateAccountShell account={account} setAccount={setAccount} activeHref="/account/friendly" variant="profile">
      <section className="bg-[#07090f] px-5 py-8 text-white">
        <div className="mx-auto max-w-6xl">
          <Link href="/account/friendly" className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to friendly matches
          </Link>
          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-cyan-300">
                <Film className="h-4 w-4" />
                Recorded video
              </div>
              <h1 className="mt-2 text-3xl font-black uppercase tracking-normal">
                {recording?.tableLabel || recording?.clubName || recording?.screenIdentifier || "Friendly recording"}
              </h1>
              <p className="mt-2 text-sm text-white/60">
                {recording?.startedAt ? formatDateTime(recording.startedAt) : "Recording date not available"} | {events.length} timeline events
                {processedVideoLabel(recording)}
                {usesFullVideoFallback(recording) ? " | Full video fallback" : ""}
              </p>
              {usesFullVideoFallback(recording) ? (
                <p className="mt-2 max-w-2xl text-sm text-amber-200">
                  Player-only processing failed. Showing the full recording instead.
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 border border-white/10 bg-black shadow-2xl shadow-black/40">
            {loading ? (
              <div className="flex aspect-video items-center justify-center text-sm text-white/70">Loading recording...</div>
            ) : error ? (
              <div className="flex aspect-video items-center justify-center px-6 text-center text-sm text-red-200">{error}</div>
            ) : recording && streamFor(recording) ? (
              <RecordingVideo recording={recording} />
            ) : (
              <div className="flex aspect-video items-center justify-center px-6 text-center text-sm text-white/70">
                {recording?.processingStatus === "pending" || recording?.processingStatus === "processing"
                  ? "Player-only video is being prepared."
                  : recording?.processingStatus === "failed"
                    ? recording.processingError || "Player-only video processing failed."
                    : "Recording stream URL is not available."}
              </div>
            )}
          </div>
        </div>
      </section>
    </PrivateAccountShell>
  );
}
