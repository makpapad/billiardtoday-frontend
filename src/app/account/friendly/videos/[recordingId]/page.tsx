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
import TemplateFiveOverlay, { type TemplateFiveOverlayState } from "@/components/overlay/TemplateFiveOverlay";

type PageProps = {
  params: Promise<{ recordingId: string }>;
};

type ScoreState = {
  player1?: {
    name?: string;
    score?: number;
    currentRun?: number;
    highRun?: number;
  };
  player2?: {
    name?: string;
    score?: number;
    currentRun?: number;
    highRun?: number;
  };
  activePlayer?: 1 | 2;
  innings?: number;
};

function streamFor(recording: PlayerAccountFriendlyRecording | null) {
  if (recording?.processingStatus === "ready" && recording.processedPlaybackUrl?.trim()) {
    return { url: recording.processedPlaybackUrl.trim(), type: "mp4" as const };
  }

  const playerOnlyRequested =
    recording?.requestedPlayerSlot === "p1" || recording?.requestedPlayerSlot === "p2";
  if (
    playerOnlyRequested &&
    recording?.processingStatus !== "not-requested" &&
    recording?.processingStatus !== "failed"
  ) {
    return null;
  }

  const direct = recording?.hlsUrl?.trim();
  if (direct) return { url: direct, type: "hls" as const };

  const playback = recording?.playbackUrl?.trim();
  if (!playback) return null;
  if (playback.includes("/playback/get?") || playback.includes("format=mp4")) {
    return { url: playback, type: "mp4" as const };
  }
  return { url: `${playback.replace(/\/+$/, "")}/index.m3u8`, type: "hls" as const };
}

function usesFullVideoFallback(recording: PlayerAccountFriendlyRecording | null) {
  const playerOnlyRequested =
    recording?.requestedPlayerSlot === "p1" || recording?.requestedPlayerSlot === "p2";
  return playerOnlyRequested && recording?.processingStatus === "failed" && Boolean(recording.hlsUrl || recording.playbackUrl);
}

function stateAt(events: PlayerAccountFriendlyRecordingEvent[], currentTimeSec: number): ScoreState | null {
  const currentMs = Math.max(0, currentTimeSec * 1000);
  let selected: PlayerAccountFriendlyRecordingEvent | null = null;
  for (const event of events) {
    if ((event.offsetMs ?? 0) <= currentMs) selected = event;
    else break;
  }
  return (selected?.state as ScoreState | null) ?? null;
}

function clampName(value: unknown, fallback: string) {
  const text = String(value || "").trim();
  return text || fallback;
}

function scoreNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function templateStateForRecorded(state: ScoreState | null, recording: PlayerAccountFriendlyRecording): TemplateFiveOverlayState {
  const p1 = state?.player1 ?? {};
  const p2 = state?.player2 ?? {};
  return {
    playerAName: clampName(p1.name, "Player 1"),
    playerBName: clampName(p2.name, "Player 2"),
    scoreA: scoreNumber(p1.score),
    scoreB: scoreNumber(p2.score),
    liveRunA: scoreNumber(p1.currentRun),
    liveRunB: scoreNumber(p2.currentRun),
    bestRunA: scoreNumber(p1.highRun),
    bestRunB: scoreNumber(p2.highRun),
    current: state?.activePlayer === 2 ? "B" : "A",
    inningsCount: scoreNumber(state?.innings || 1),
    tournamentName: "Recorded friendly match",
    stageName: "Friendly",
    tableName: recording.tableLabel || recording.screenIdentifier || "-",
    progress: 0,
    maxTimeoutsA: 3,
    maxTimeoutsB: 3,
  };
}

function RecordingVideo({
  recording,
  events,
}: {
  recording: PlayerAccountFriendlyRecording;
  events: PlayerAccountFriendlyRecordingEvent[];
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = React.useState("Opening recording...");
  const [currentTime, setCurrentTime] = React.useState(0);
  const stream = streamFor(recording);
  const overlayState = React.useMemo(() => stateAt(events, currentTime), [events, currentTime]);
  const templateState = React.useMemo(
    () => templateStateForRecorded(overlayState, recording),
    [overlayState, recording],
  );

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream?.url) return;
    let hls: Hls | null = null;
    let cancelled = false;

    const onTimeUpdate = () => setCurrentTime(video.currentTime || 0);
    const onError = () => {
      if (!cancelled) setStatus("Recording video is not available yet.");
    };
    const onLoadedMetadata = () => {
      if (!cancelled) setStatus("");
    };
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("error", onError);

    if (stream.type === "mp4") {
      video.src = stream.url;
      video.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
    } else if (Hls.isSupported()) {
      hls = new Hls({ backBufferLength: 60 });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!cancelled && data.fatal) setStatus(data.details || "HLS recording error");
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!cancelled) setStatus("");
      });
      hls.loadSource(stream.url);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = stream.url;
      video.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
    } else {
      setStatus("HLS is not supported in this browser");
    }

    return () => {
      cancelled = true;
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("error", onError);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [stream?.type, stream?.url]);

  return (
    <div className="relative aspect-video overflow-hidden bg-black">
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-contain" controls playsInline />
      <TemplateFiveOverlay state={templateState} />
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
                {recording?.processingStatus === "ready" ? " | Player-only video" : ""}
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
              <RecordingVideo recording={recording} events={events} />
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
