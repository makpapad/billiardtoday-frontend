"use client";

/**
 * «Τοίχος» με έως 4 YouTube live βίντεο για μία διοργάνωση.
 *
 * Ίδια λογική με τη σελίδα SOOP (`/tournaments/live/soop`), αλλά η πηγή είναι
 * YouTube αντί για SOOP: ο admin γράφει έως 4 links (ή video IDs) στο
 * «Live video button» και το frontend τα δείχνει ένα-ένα ή σε multiview.
 *
 * URL: `/tournaments/live/youtube?videos=<id1>,<id2>,<id3>,<id4>&view=multiview`
 *      `&video=2` για μονή προβολή, `&returnTo=/tournaments/<slug>` για το «Back».
 *
 * `liveVideoIds` (server-side, μόνο στο embed): τα ΤΡΕΧΟΝΤΑ βίντεο της διοργάνωσης
 * που βρήκε η σελίδα από το `returnTo`. Υπερισχύουν του `videos=` επειδή το
 * `videos=` μέσα σε iframe τρίτης σελίδας μένει «παγωμένο» στην ημέρα που γράφτηκε.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { extractYouTubeVideoId } from "@/lib/liveVideos";

const MAX_VIDEOS = 4;

const parseVideoIds = (value: string | null | undefined) => {
  const ids = String(value || "")
    .split(",")
    .map((entry) => extractYouTubeVideoId(entry.trim()))
    .filter((id): id is string => Boolean(id));
  return Array.from(new Set(ids)).slice(0, MAX_VIDEOS);
};

const normalizeSlot = (value: string | null | undefined) => {
  const parsed = Number(String(value || "").replace(/^video\s*/i, "").trim());
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(MAX_VIDEOS, Math.max(1, Math.trunc(parsed)));
};

/**
 * Το YouTube μπλοκάρει το autoplay με ήχο. Στο multiview παίζουμε muted ώστε
 * να ξεκινάνε όλα μόνα τους· στη μονή προβολή χωρίς mute (ο χρήστης πατά play).
 */
const embedUrlFor = (videoId: string, muted: boolean) => {
  const params = new URLSearchParams({ rel: "0", autoplay: "1" });
  if (muted) params.set("mute", "1");
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
};

const watchUrlFor = (videoId: string) =>
  `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

const normalizeReturnHref = (value: string | null | undefined) => {
  const href = String(value || "").trim();
  if (!href.startsWith("/")) return null;
  if (href.startsWith("//")) return null;
  if (!/^\/(?:embed\/)?tournaments\/[a-z0-9-]+(?:[?#].*)?$/i.test(href)) return null;
  return href;
};

export function YoutubeLiveContent({
  fitViewport = true,
  liveVideoIds,
}: {
  fitViewport?: boolean;
  /** Βίντεο από τον server (embed): υπερισχύουν του `videos=` του URL. */
  liveVideoIds?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const multiviewRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const returnHref = normalizeReturnHref(searchParams.get("returnTo"));
  const serverVideoIds = useMemo(
    () => (liveVideoIds && liveVideoIds.length > 0 ? liveVideoIds : null),
    [liveVideoIds],
  );
  const videoIds = useMemo(
    () => serverVideoIds ?? parseVideoIds(searchParams.get("videos")),
    [serverVideoIds, searchParams],
  );
  const requestedView = searchParams.get("view")?.toLowerCase() || "";
  const isMultiview =
    searchParams.get("multiview") === "1" ||
    requestedView === "multi" ||
    requestedView === "multiview";
  const slot = normalizeSlot(searchParams.get("video"));
  const singleVideoId = videoIds[slot - 1] ?? videoIds[0] ?? null;

  const pushParams = (next: URLSearchParams) => {
    router.push(`${pathname}?${next.toString()}`);
  };

  const handleSlotChange = (nextSlot: number) => {
    const params = new URLSearchParams();
    params.set("videos", videoIds.join(","));
    params.set("video", String(nextSlot));
    if (returnHref) params.set("returnTo", returnHref);
    pushParams(params);
  };

  const handleViewChange = (nextMultiview: boolean) => {
    const params = new URLSearchParams();
    params.set("videos", videoIds.join(","));
    if (nextMultiview) {
      params.set("view", "multiview");
    } else {
      params.set("video", String(slot));
    }
    if (returnHref) params.set("returnTo", returnHref);
    pushParams(params);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === multiviewRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleFullscreenToggle = async () => {
    const element = multiviewRef.current;
    if (!element) return;
    if (document.fullscreenElement === element) {
      await document.exitFullscreen();
      return;
    }
    await element.requestFullscreen();
  };

  const handleBackFallback = () => {
    router.back();
  };

  const backButtonClassName =
    "inline-flex h-9 items-center rounded border border-white/10 bg-neutral-900 px-3 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:border-cyan-300";
  const fullscreenBackButtonClassName =
    "absolute left-4 top-12 z-30 hidden rounded border border-white/15 bg-black/80 px-3 py-2 text-sm font-semibold text-white shadow-2xl transition hover:bg-neutral-900 fullscreen:inline-flex";

  /**
   * Οι κλάσεις που «κλειδώνουν» τη σελίδα στο ύψος της οθόνης μπαίνουν μόνο στη
   * δημόσια σελίδα (fitViewport). Μέσα σε iframe (embed) δεν θέλουμε κανένα
   * 100dvh: το EmbedAutoHeight στέλνει στη φιλοξενούσα σελίδα το ύψος που μετρά,
   * και ένα 100dvh θα μεγάλωνε το πλαίσιο → ξανά μεγαλύτερο 100dvh (βρόχος).
   * Στο embed μένει η φυσική ροή με aspect-video, όπως ήταν πριν.
   */
  const fit = (classes: string) => (fitViewport ? ` ${classes}` : "");

  if (videoIds.length === 0) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-lg font-semibold">Live video</h1>
          <p className="max-w-md text-sm text-neutral-400">
            No YouTube video is configured for this tournament.
          </p>
          {returnHref ? (
            <Link href={returnHref} className={backButtonClassName}>
              Back to event
            </Link>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen bg-black text-white${fit("lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden")}`}>
      <div className={`mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-3 px-3 py-3 sm:px-4${fit("lg:min-h-0 lg:flex-1")}`}>
        <div className={`flex flex-wrap items-center justify-between gap-3${fit("lg:shrink-0")}`}>
          <div className="flex flex-wrap items-center gap-2">
            {returnHref ? (
              <Link href={returnHref} className={backButtonClassName}>
                Back to event
              </Link>
            ) : (
              <button type="button" onClick={handleBackFallback} className={backButtonClassName}>
                Back
              </button>
            )}
            <h1 className="text-base font-semibold sm:text-lg">Live video</h1>
          </div>
          <div className="flex items-center gap-2">
            {videoIds.length > 1 ? (
              <div className="inline-flex h-9 overflow-hidden rounded border border-white/10 bg-neutral-900 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => handleViewChange(false)}
                  className={`px-3 transition ${
                    isMultiview ? "text-neutral-300 hover:bg-white/10" : "bg-white text-neutral-950"
                  }`}
                  aria-pressed={!isMultiview}
                >
                  Single
                </button>
                <button
                  type="button"
                  onClick={() => handleViewChange(true)}
                  className={`border-l border-white/10 px-3 transition ${
                    isMultiview ? "bg-white text-neutral-950" : "text-neutral-300 hover:bg-white/10"
                  }`}
                  aria-pressed={isMultiview}
                >
                  Multiview
                </button>
              </div>
            ) : null}
            {!isMultiview ? (
              <select
                value={String(slot)}
                onChange={(event) => handleSlotChange(Number(event.target.value))}
                className="h-9 rounded border border-white/10 bg-neutral-900 px-3 text-sm font-semibold text-white outline-none transition hover:bg-neutral-800 focus:border-cyan-300"
                aria-label="Select video"
              >
                {videoIds.map((videoId, index) => (
                  <option key={videoId} value={String(index + 1)}>
                    Video {index + 1}
                  </option>
                ))}
              </select>
            ) : null}
            {!isMultiview && singleVideoId ? (
              <a
                href={watchUrlFor(singleVideoId)}
                target="_blank"
                rel="noreferrer"
                className="h-9 rounded border border-white/10 bg-neutral-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:border-cyan-300"
              >
                Open on YouTube
              </a>
            ) : null}
            {isMultiview ? (
              <button
                type="button"
                onClick={handleFullscreenToggle}
                className="h-9 rounded border border-white/10 bg-neutral-900 px-3 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:border-cyan-300"
                aria-pressed={isFullscreen}
              >
                {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              </button>
            ) : null}
          </div>
        </div>

        <section className={`flex flex-1 items-center${fit("lg:min-h-0 lg:flex-1 lg:flex-col lg:items-stretch")}`}>
          {isMultiview ? (
            <div
              ref={multiviewRef}
              className={`relative w-full bg-black p-0 fullscreen:flex fullscreen:h-screen fullscreen:flex-col fullscreen:items-stretch fullscreen:overflow-hidden fullscreen:p-3${fit("lg:flex lg:min-h-0 lg:flex-1 lg:flex-col")}`}>
              {returnHref ? (
                <Link href={returnHref} className={fullscreenBackButtonClassName}>
                  Back to event
                </Link>
              ) : (
                <button type="button" onClick={handleBackFallback} className={fullscreenBackButtonClassName}>
                  Back
                </button>
              )}
              {/*
                `fullscreen:auto-rows-fr`: στο fullscreen οι σειρές μοιράζονται ΑΚΡΙΒΩΣ το
                διαθέσιμο ύψος. Χωρίς αυτό οι σειρές παίρνουν το φυσικό ύψος των βίντεο
                (aspect) και το grid ξεπερνά την οθόνη — στην τηλεόραση/προτζέκτορα
                κόβονταν τα κάτω βίντεο. Το `lg:` σκέλος αφορά τη δημόσια σελίδα, το
                `fullscreen:` δουλεύει και μέσα στο iframe (το embed δεν έχει `fit`).
              */}
              <div className={`grid w-full gap-3 fullscreen:h-full fullscreen:min-h-0 fullscreen:auto-rows-fr fullscreen:overflow-hidden fullscreen:gap-3 lg:grid-cols-2${fit("lg:min-h-0 lg:flex-1 lg:auto-rows-fr")}`}>
                {videoIds.map((videoId, index) => (
                  <div
                    key={`${videoId}-${index}`}
                    className={`overflow-hidden border border-white/10 bg-black fullscreen:flex fullscreen:min-h-0 fullscreen:flex-col${fit("lg:flex lg:min-h-0 lg:flex-col")}`}
                  >
                    <div className={`border-b border-white/10 bg-neutral-950 px-3 py-2 text-sm font-semibold fullscreen:shrink-0 fullscreen:py-1${fit("lg:shrink-0 lg:py-1")}`}>
                      Video {index + 1}
                    </div>
                    <div className={`aspect-video w-full fullscreen:min-h-0 fullscreen:flex-1 fullscreen:aspect-auto${fit("lg:relative lg:min-h-0 lg:flex-1 lg:aspect-auto")}`}>
                      <iframe
                        src={embedUrlFor(videoId, true)}
                        title={`YouTube live video ${index + 1}`}
                        className={`h-full w-full${fit("lg:absolute lg:inset-0")}`}
                        allowFullScreen
                        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={`w-full overflow-hidden bg-black${fit("lg:flex lg:min-h-0 lg:flex-1 lg:flex-col")}`}>
              <div className={`aspect-video w-full${fit("lg:relative lg:flex-1 lg:min-h-0 lg:aspect-auto")}`}>
                {singleVideoId ? (
                  <iframe
                    src={embedUrlFor(singleVideoId, false)}
                    title="YouTube live video"
                    className={`h-full w-full${fit("lg:absolute lg:inset-0")}`}
                    allowFullScreen
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                  />
                ) : null}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
