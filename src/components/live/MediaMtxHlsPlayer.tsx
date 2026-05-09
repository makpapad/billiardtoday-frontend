"use client";

import Hls from "hls.js";
import * as React from "react";

type MediaMtxHlsPlayerProps = {
  baseUrl: string;
  muted?: boolean;
};

function hlsUrlForBase(baseUrl: string) {
  const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
  if (cleanBaseUrl.endsWith(".m3u8")) return cleanBaseUrl;
  return `${cleanBaseUrl}/index.m3u8`;
}

export default function MediaMtxHlsPlayer({ baseUrl, muted = true }: MediaMtxHlsPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = React.useState("Opening HLS stream...");

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const streamUrl = hlsUrlForBase(baseUrl);
    let hls: Hls | null = null;
    let cancelled = false;

    video.muted = muted;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;

    function playWhenReady() {
      const playPromise = video?.play();
      if (playPromise) {
        playPromise
          .then(() => {
            if (!cancelled) setStatus("");
          })
          .catch(() => {
            if (!cancelled) setStatus("Press play to start audio/video");
          });
      } else if (!cancelled) {
        setStatus("");
      }
    }

    if (Hls.isSupported()) {
      hls = new Hls({
        lowLatencyMode: true,
        backBufferLength: 30,
        liveSyncDurationCount: 3,
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!cancelled && data.fatal) {
          setStatus(data.details || "HLS stream error");
        }
      });
      hls.on(Hls.Events.MANIFEST_PARSED, playWhenReady);
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      video.addEventListener("loadedmetadata", playWhenReady, { once: true });
    } else {
      setStatus("HLS is not supported in this browser");
    }

    return () => {
      cancelled = true;
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [baseUrl, muted]);

  return (
    <>
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full bg-black object-cover"
        controls
        muted={muted}
        autoPlay
        playsInline
      />
      {status ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 px-8 text-center text-sm font-medium text-white">
          {status}
        </div>
      ) : null}
    </>
  );
}
