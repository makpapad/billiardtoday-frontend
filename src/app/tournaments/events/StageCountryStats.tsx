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

type BrandIconProps = {
  className?: string;
};

const FacebookIcon = ({ className = "h-4 w-4" }: BrandIconProps) => (
  <svg viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const XIcon = ({ className = "h-4 w-4" }: BrandIconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const WhatsAppIcon = ({ className = "h-4 w-4" }: BrandIconProps) => (
  <svg viewBox="0 0 24 24" fill="#25D366" aria-hidden="true" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const TelegramIcon = ({ className = "h-4 w-4" }: BrandIconProps) => (
  <svg viewBox="0 0 24 24" fill="#26A5E4" aria-hidden="true" className={className}>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const LinkedInIcon = ({ className = "h-4 w-4" }: BrandIconProps) => (
  <svg viewBox="0 0 24 24" fill="#0A66C2" aria-hidden="true" className={className}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const LinkIcon = () => (
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
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const ImageIcon = () => (
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
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

const DownloadIcon = () => (
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
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
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

  const updateShareMenuPosition = () => {
    const button = shareButtonRef.current;
    if (!button || typeof window === "undefined") return;
    const rect = button.getBoundingClientRect();
    const menuWidth = 224;
    const left = Math.max(
      8,
      Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8),
    );
    setShareMenuPosition({ top: rect.bottom + 6, left });
  };

  const openShareMenu = () => {
    updateShareMenuPosition();
    setShareMenuOpen(true);
  };

  // While open, follow the Share button on scroll/resize; close it if the
  // button scrolls out of the viewport.
  useEffect(() => {
    if (!shareMenuOpen) return;
    const onScrollOrResize = () => {
      const button = shareButtonRef.current;
      if (!button || typeof window === "undefined") {
        setShareMenuOpen(false);
        return;
      }
      const rect = button.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setShareMenuOpen(false);
        return;
      }
      updateShareMenuPosition();
    };
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareMenuOpen]);

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
      <div className="grid grid-cols-[minmax(0,1fr)_3rem_3rem_3.5rem] items-center gap-x-2 px-3 pb-1 pt-3 sm:grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_5rem] sm:gap-x-6 sm:px-6">
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
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              <ShareIcon />
              <span className="truncate">Share image…</span>
            </button>
            <button
              type="button"
              onClick={() =>
                openSharePopup(
                  shareTargets[0].href,
                  shareTargets[0].width,
                  shareTargets[0].height,
                )
              }
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <FacebookIcon />
              <span className="truncate">Facebook</span>
            </button>
            <button
              type="button"
              onClick={() =>
                openSharePopup(
                  shareTargets[1].href,
                  shareTargets[1].width,
                  shareTargets[1].height,
                )
              }
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <XIcon />
              <span className="truncate">X (Twitter)</span>
            </button>
            <button
              type="button"
              onClick={() =>
                openSharePopup(
                  shareTargets[2].href,
                  shareTargets[2].width,
                  shareTargets[2].height,
                )
              }
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <WhatsAppIcon />
              <span className="truncate">WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() =>
                openSharePopup(
                  shareTargets[3].href,
                  shareTargets[3].width,
                  shareTargets[3].height,
                )
              }
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <TelegramIcon />
              <span className="truncate">Telegram</span>
            </button>
            <button
              type="button"
              onClick={() =>
                openSharePopup(
                  shareTargets[4].href,
                  shareTargets[4].width,
                  shareTargets[4].height,
                )
              }
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <LinkedInIcon />
              <span className="truncate">LinkedIn</span>
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <LinkIcon />
              <span className="truncate">Copy link</span>
            </button>
            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
            <button
              type="button"
              onClick={handleCopyImage}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <ImageIcon />
              <span className="truncate">Copy image</span>
            </button>
            <a
              href={shareHref}
              download="billiardtoday-country-stats.png"
              onClick={() => setShareMenuOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
            >
              <DownloadIcon />
              <span className="truncate">Download image</span>
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
              className="grid grid-cols-[minmax(0,1fr)_3rem_3rem_3.5rem] items-center gap-x-2 px-3 sm:grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_5rem] sm:gap-x-6 sm:px-6"
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
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row: share this stage (kept out of the column grid so it
          cannot affect number alignment) */}
      {shareHref ? (
        <div className="flex items-center justify-end gap-3 border-t border-white/15 px-3 py-1.5 sm:px-6">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60 sm:text-[11px]">
            Share this stage
          </span>
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
        </div>
      ) : null}
    </div>
  );
}
