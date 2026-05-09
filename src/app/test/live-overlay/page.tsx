import type { Metadata } from "next";
import MediaMtxWebRtcPlayer from "@/components/live/MediaMtxWebRtcPlayer";

type LiveOverlayTestPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Live Overlay Test",
  robots: {
    index: false,
    follow: false,
  },
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildOverlayUrl(params: Record<string, string | string[] | undefined> | undefined) {
  const overlay = firstParam(params?.overlay) || firstParam(params?.screen) || "Ceb1";
  const template = firstParam(params?.template) || firstParam(params?.t) || "5";
  const width = firstParam(params?.width) || "1920";
  const height = firstParam(params?.height) || "1080";
  const query = new URLSearchParams({
    t: template,
    width,
    height,
    obs: "1",
  });

  return `/embed/overlay/${encodeURIComponent(overlay)}?${query.toString()}`;
}

function buildYoutubeEmbed(urlOrId: string) {
  const value = urlOrId.trim();
  const directId = /^[a-zA-Z0-9_-]{8,}$/.test(value) && !value.includes("/") ? value : null;
  if (directId) return `https://www.youtube.com/embed/${directId}?autoplay=1&mute=1&playsinline=1`;

  try {
    const url = new URL(value);
    const videoId =
      url.hostname.includes("youtu.be")
        ? url.pathname.replace("/", "")
        : url.searchParams.get("v");
    return videoId
      ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1`
      : value;
  } catch {
    return value;
  }
}

export default async function LiveOverlayTestPage({ searchParams }: LiveOverlayTestPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const provider = (firstParam(params?.provider) || "demo").toLowerCase();
  const stream =
    firstParam(params?.stream) ||
    (provider === "mediamtx" ? "http://localhost:8889/btdroitcamera/" : "");
  const overlayUrl = buildOverlayUrl(params);
  const isYoutube = provider === "youtube" && stream;
  const isMediaMtx = provider === "mediamtx" && stream;
  const isIframe = provider === "iframe" && stream;
  const isVideo = ["video", "hls", "webrtc"].includes(provider) && stream;

  return (
    <main className="min-h-screen bg-[#07090f] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-[1720px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Live overlay test</h1>
            <p className="mt-1 text-sm text-slate-300">
              Stream layer with BilliardToday scoreboard overlay.
            </p>
          </div>
          <div className="text-right text-xs leading-5 text-slate-400">
            <div>Overlay: {overlayUrl}</div>
            <div>Provider: {provider}</div>
          </div>
        </div>

        <div className="relative aspect-video w-full overflow-hidden bg-black shadow-2xl shadow-black/50">
          {isMediaMtx ? (
            <MediaMtxWebRtcPlayer baseUrl={stream} />
          ) : isYoutube ? (
            <iframe
              src={buildYoutubeEmbed(stream)}
              title="YouTube stream"
              className="absolute inset-0 h-full w-full border-0"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : isIframe ? (
            <iframe
              src={stream}
              title="External stream"
              className="absolute inset-0 h-full w-full border-0"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : isVideo ? (
            <video
              className="absolute inset-0 h-full w-full bg-black object-cover"
              src={stream}
              autoPlay
              muted
              playsInline
              controls
            />
          ) : (
            <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_50%_35%,#1f513d_0,#10271f_42%,#05070b_100%)]">
              <div className="absolute left-[8%] top-[12%] h-[76%] w-[84%] border border-emerald-200/20 bg-emerald-950/25 shadow-[inset_0_0_90px_rgba(0,0,0,0.65)]" />
              <div className="absolute left-[14%] top-[50%] h-3 w-3 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.85)]" />
              <div className="absolute left-[55%] top-[43%] h-4 w-4 rounded-full bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.7)]" />
              <div className="absolute left-[62%] top-[58%] h-4 w-4 rounded-full bg-yellow-300 shadow-[0_0_18px_rgba(253,224,71,0.7)]" />
              <div className="absolute bottom-6 right-8 text-right text-sm uppercase tracking-[0.24em] text-white/45">
                Demo video layer
              </div>
            </div>
          )}

          <iframe
            src={overlayUrl}
            title="BilliardToday scoreboard overlay"
            className="pointer-events-none absolute inset-0 h-full w-full border-0"
          />
        </div>

        <div className="mt-4 grid gap-3 text-sm text-slate-300 lg:grid-cols-3">
          <div className="border border-white/10 bg-white/[0.03] p-3">
            <div className="font-semibold text-white">BTDroitCamera/WebRTC</div>
            <code className="mt-2 block break-all text-xs text-slate-400">
              /test/live-overlay?provider=mediamtx&amp;overlay=Ceb1
            </code>
          </div>
          <div className="border border-white/10 bg-white/[0.03] p-3">
            <div className="font-semibold text-white">YouTube</div>
            <code className="mt-2 block break-all text-xs text-slate-400">
              /test/live-overlay?provider=youtube&amp;stream=VIDEO_ID&amp;overlay=Ceb1
            </code>
          </div>
          <div className="border border-white/10 bg-white/[0.03] p-3">
            <div className="font-semibold text-white">HLS/video</div>
            <code className="mt-2 block break-all text-xs text-slate-400">
              /test/live-overlay?provider=video&amp;stream=https://example.com/live.mp4&amp;overlay=Ceb1
            </code>
          </div>
        </div>
      </section>
    </main>
  );
}
