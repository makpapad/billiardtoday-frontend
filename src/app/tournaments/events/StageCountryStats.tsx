import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { NormalizedEventStage } from "./types";
import { computeStageCountryStats } from "./utils";

/**
 * StageCountryStats — compact "who advanced, by country" strip shown above
 * the stage ranking table once a round-robin (group) stage has fully
 * finished and a next stage exists.
 *
 * Columns: Entered | Qualified | Qual % (qualified / entered per country).
 * The general average per country is not repeated here — the ranking table
 * below shows the stage General AVG (filtered to the selected country).
 *
 * Countries rotate vertically (slide-up carousel, 3s per country, paused on
 * hover). Each country has a small flag chip on the left; clicking a flag
 * selects that country (carousel jumps to it and the ranking table below is
 * filtered through onSelectCountry), clicking the active flag again clears
 * the filter.
 *
 * The share button opens an in-page menu first: "Share image…" (native
 * Windows/mobile share sheet with the PNG attached), the social destinations
 * (Facebook / X / WhatsApp / Telegram / LinkedIn — page link opened in a
 * centered popup, whose preview shows the same stats card), Copy link,
 * Copy image (paste straight into a Facebook/WhatsApp composer) and
 * Download image.
 */

const ROW_HEIGHT_PX = 64;
const ROTATE_MS = 3000;

const formatQualificationPercent = (
  qualified: number,
  entered: number,
): string => {
  if (entered <= 0) return "–";
  return `${Math.round((qualified / entered) * 100)}%`;
};

const ShareIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="h-4 w-4"
  >
    <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
    <path d="M16 6l-4-4-4 4" />
    <path d="M12 2v13" />
  </svg>
);

export default function StageCountryStats({
  stage,
  nextStage,
  selectedCountryId = null,
  onSelectCountry,
  eventDocumentId = null,
}: {
  stage: NormalizedEventStage;
  nextStage: NormalizedEventStage | null | undefined;
  selectedCountryId?: string | null;
  onSelectCountry?: (countryId: string | null) => void;
  eventDocumentId?: string | null;
}) {
  const stats = useMemo(
    () => computeStageCountryStats(stage, nextStage),
    [stage, nextStage],
  );

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setActive(0);
    setPaused(false);
  }, [stage.documentId]);

  useEffect(() => {
    if (paused || stats.length <= 1) return;
    const intervalId = window.setInterval(() => {
      setActive((current) => (current + 1) % stats.length);
    }, ROTATE_MS);
    return () => window.clearInterval(intervalId);
  }, [paused, stats.length]);

  if (stats.length === 0) return null;

  const safeActive = active >= stats.length ? 0 : active;

  const handleFlagClick = (countryId: string, index: number) => {
    if (!onSelectCountry) {
      setActive(index);
      return;
    }
    if (selectedCountryId === countryId) {
      onSelectCountry(null);
      return;
    }
    setActive(index);
    onSelectCountry(countryId);
  };

  const shareHref =
    eventDocumentId && stage.documentId
      ? `/api/og/tournament/${encodeURIComponent(eventDocumentId)}?stage=${encodeURIComponent(
          stage.documentId,
        )}`
      : null;

  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [shareMenuPosition, setShareMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const shareButtonRef = useRef<HTMLButtonElement | null>(null);

  const openShareMenu = () => {
    const button = shareButtonRef.current;
    if (button) {
      const rect = button.getBoundingClientRect();
      const menuWidth = 224;
      const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
      setShareMenuPosition({ top: rect.bottom + 6, left });
    }
    setShareMenuOpen(true);
  };

  const handlePrimaryShareClick = async () => {
    if (!shareHref) return;
    // Prefer the native share sheet (Windows / mobile) with the PNG attached.
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      setShareMenuOpen(false);
      try {
        const response = await fetch(shareHref);
        const blob = await response.blob();
        const file = new File([blob], "billiardtoday-country-stats.png", {
          type: "image/png",
        });
        if (
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [file] })
        ) {
          await navigator.share({
            files: [file],
            title:
              typeof document !== "undefined"
                ? document.title
                : "Billiard Today",
          });
          return;
        }
      } catch (error) {
        // AbortError = the user closed the sheet — do nothing.
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        // Anything else (unsupported, network failure) → fall through to the
        // in-page share menu.
      }
    }
    setShareMenuOpen(true);
  };

  const handleCopyImage = async () => {
    if (!shareHref) return;
    setShareMenuOpen(false);
    try {
      const response = await fetch(shareHref);
      const blob = await response.blob();
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof ClipboardItem !== "undefined"
      ) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
      }
    } catch {
      // Clipboard image write can fail — leave the menu item as a best-effort.
    }
  };

  const handleCopyLink = async () => {
    const pageUrl =
      typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(pageUrl);
      }
    } catch {
      // Clipboard can fail on insecure contexts — the menu item still shows.
    }
    setShareMenuOpen(false);
  };

  const sharePageUrl =
    typeof window !== "undefined" ? window.location.href : "";
  const sharePageText =
    typeof document !== "undefined"
      ? document.title || "Billiard Today"
      : "Billiard Today";
  const encodedShareUrl = encodeURIComponent(sharePageUrl);
  const encodedShareText = encodeURIComponent(sharePageText);
  const shareTargets = [
    {
      key: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl}`,
      width: 640,
      height: 640,
    },
    {
      key: "x",
      label: "X (Twitter)",
      href: `https://twitter.com/intent/tweet?url=${encodedShareUrl}&text=${encodedShareText}`,
      width: 600,
      height: 500,
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodedShareText}%20${encodedShareUrl}`,
      width: 640,
      height: 640,
    },
    {
      key: "telegram",
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodedShareUrl}&text=${encodedShareText}`,
      width: 640,
      height: 640,
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedShareUrl}`,
      width: 640,
      height: 600,
    },
  ];

  const openSharePopup = (href: string, width: number, height: number) => {
    setShareMenuOpen(false);
    const left = Math.max(
      0,
      Math.round((window.screen.width - width) / 2),
    );
    const top = Math.max(
      0,
      Math.round((window.screen.height - height) / 2),
    );
    window.open(
      href,
      "bt-social-share",
      `popup=yes,width=${width},height=${height},left=${left},top=${top},noopener,noreferrer`,
    );
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 shadow-lg ring-1 ring-white/20 transition-shadow hover:shadow-xl dark:ring-white/10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Header row: label + flag chips on the left, column titles above the numbers */}
      <div className="grid grid-cols-[minmax(0,1fr)_3rem_3rem_3.5rem_auto] items-center gap-x-2 px-3 pb-1 pt-3 sm:grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_5rem_auto] sm:gap-x-6 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-white/80 sm:text-[11px]">
            By country
          </span>
          {stats.length > 1 ? (
            <span className="flex min-w-0 items-center gap-1.5 overflow-x-auto pl-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {stats.map((stat, index) => {
                const isSelected = selectedCountryId === stat.id;
                const isCurrent = index === safeActive;
                return (
                  <button
                    key={stat.id}
                    type="button"
                    aria-label={`Show only ${stat.label}`}
                    aria-pressed={isSelected}
                    title={
                      isSelected
                        ? `${stat.label} — click to clear filter`
                        : `Filter by ${stat.label}`
                    }
                    onClick={() => handleFlagClick(stat.id, index)}
                    className={[
                      "flex h-5 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[3px] transition-all",
                      isCurrent && !isSelected
                        ? "ring-2 ring-white/90"
                        : "ring-1 ring-white/40",
                      isSelected
                        ? "scale-110 ring-2 ring-white shadow-md"
                        : "opacity-70 hover:opacity-100 hover:ring-white/80",
                    ].join(" ")}
                  >
                    {stat.flagUrl ? (
                      <img
                        src={stat.flagUrl}
                        alt={stat.label}
                        className="h-5 w-7 object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="h-5 w-7 bg-white/30" />
                    )}
                  </button>
                );
              })}
            </span>
          ) : null}
        </div>
        <div className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white/80 sm:text-[11px]">
          Entered
        </div>
        <div className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white/80 sm:text-[11px]">
          Qual.
        </div>
        <div className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white/80 sm:text-[11px]">
          Qual %
        </div>
        <div className="flex justify-end">
          {shareHref ? (
            <button
              ref={shareButtonRef}
              type="button"
              onClick={openShareMenu}
              title="Share this stage (image + link)"
              aria-label="Share this stage"
              aria-haspopup="true"
              aria-expanded={shareMenuOpen}
              className="flex h-7 items-center gap-1.5 rounded-full bg-white/15 px-2.5 text-[11px] font-bold text-white ring-1 ring-white/40 transition hover:bg-white/25 hover:text-white sm:px-3 sm:text-xs"
            >
              <ShareIcon />
              <span className="hidden sm:inline">Share</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Share menu — portal-rendered so the card's overflow-hidden cannot clip it */}
      {shareMenuOpen && shareHref && shareMenuPosition && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Close share menu"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setShareMenuOpen(false)}
              />
              <div
                className="fixed z-50 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1.5 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
                style={{
                  top: shareMenuPosition.top,
                  left: shareMenuPosition.left,
                }}
              >
            <p className="px-3.5 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
              Share
            </p>
            <button
              type="button"
              onClick={handlePrimaryShareClick}
              className="flex w-full items-center px-3.5 py-2 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              Share image…
            </button>
            {shareTargets.map((target) => (
              <button
                key={target.key}
                type="button"
                onClick={() => openSharePopup(target.href, target.width, target.height)}
                className="flex w-full items-center px-3.5 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {target.label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex w-full items-center px-3.5 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Copy link
            </button>
            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
            <button
              type="button"
              onClick={handleCopyImage}
              className="flex w-full items-center px-3.5 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Copy image
            </button>
            <a
              href={shareHref}
              download="billiardtoday-country-stats.png"
              onClick={() => setShareMenuOpen(false)}
              className="flex items-center px-3.5 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
            >
              Download image
              </a>
              </div>
            </>,
            document.body,
          )
        : null}

      {/* Rotating country rows (slide-up carousel) */}
      <div className="overflow-hidden" style={{ height: ROW_HEIGHT_PX }}>
        <div
          className="transition-transform duration-500 ease-in-out"
          style={{ transform: `translateY(-${safeActive * ROW_HEIGHT_PX}px)` }}
        >
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="grid grid-cols-[minmax(0,1fr)_3rem_3rem_3.5rem_auto] items-center gap-x-2 px-3 sm:grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_5rem_auto] sm:gap-x-6 sm:px-6"
              style={{ height: ROW_HEIGHT_PX }}
            >
              <div className="flex min-w-0 items-center gap-3">
                {stat.flagUrl ? (
                  <img
                    src={stat.flagUrl}
                    alt={stat.label}
                    className="h-6 w-8 shrink-0 rounded-[3px] object-cover shadow ring-1 ring-white/40"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="h-6 w-8 shrink-0 rounded-[3px] bg-white/20 ring-1 ring-white/30" />
                )}
                <span className="truncate text-lg font-extrabold tracking-tight text-white sm:text-xl">
                  {stat.label}
                </span>
              </div>
              <div className="text-center text-xl font-black tabular-nums text-white sm:text-2xl">
                {stat.entered}
              </div>
              <div className="text-center text-xl font-black tabular-nums text-emerald-200 sm:text-2xl">
                {stat.qualified}
              </div>
              <div className="text-center text-xl font-extrabold tabular-nums text-white sm:text-2xl">
                {formatQualificationPercent(stat.qualified, stat.entered)}
              </div>
              <div />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
