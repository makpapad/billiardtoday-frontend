"use client";

import * as React from "react";

declare global {
  interface Window {
    MediaMTXWebRTCReader?: new (config: {
      url: string;
      onError?: (error: string) => void;
      onTrack?: (event: RTCTrackEvent) => void;
    }) => { close: () => void };
  }
}

type MediaMtxWebRtcPlayerProps = {
  baseUrl: string;
};

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (window.MediaMTXWebRTCReader) resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load MediaMTX reader")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load MediaMTX reader"));
    document.head.appendChild(script);
  });
}

export default function MediaMtxWebRtcPlayer({ baseUrl }: MediaMtxWebRtcPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const readerRef = React.useRef<{ close: () => void } | null>(null);
  const [status, setStatus] = React.useState("Connecting to MediaMTX...");

  React.useEffect(() => {
    let cancelled = false;
    const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
    const scriptUrl = `${cleanBaseUrl}/reader.js`;
    const whepUrl = `${cleanBaseUrl}/whep`;

    async function start() {
      try {
        setStatus("Loading WebRTC reader...");
        await loadScript(scriptUrl);
        if (cancelled) return;
        if (!window.MediaMTXWebRTCReader) {
          throw new Error("MediaMTX reader is not available");
        }

        setStatus("Opening WebRTC stream...");
        readerRef.current?.close();
        readerRef.current = new window.MediaMTXWebRTCReader({
          url: whepUrl,
          onError: (error) => {
            if (!cancelled) setStatus(error || "WebRTC stream error");
          },
          onTrack: (event) => {
            const video = videoRef.current;
            const stream = event.streams[0];
            if (!video || !stream) return;

            video.srcObject = stream;
            video.muted = true;
            video.autoplay = true;
            video.playsInline = true;
            const playPromise = video.play();
            if (playPromise) {
              playPromise
                .then(() => {
                  if (!cancelled) setStatus("");
                })
                .catch((error: Error) => {
                  if (!cancelled) setStatus(`Video play blocked: ${error.message}`);
                });
            } else if (!cancelled) {
              setStatus("");
            }
          },
        });
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "Failed to open stream");
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      readerRef.current?.close();
      readerRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [baseUrl]);

  return (
    <>
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full bg-black object-cover"
        muted
        autoPlay
        playsInline
      />
      {status ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 px-8 text-center text-sm font-medium text-white">
          {status}
        </div>
      ) : null}
    </>
  );
}
