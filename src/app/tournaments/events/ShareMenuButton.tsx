import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * ShareMenuButton — a "Share" pill that opens an in-page menu:
 *
 * - "Share image…" → native share sheet (Windows / mobile) with the PNG
 *   attached (the social/OG image rendered for the passed shareHref).
 * - Facebook / X / WhatsApp / Telegram / LinkedIn → page link opened in a
 *   centered popup (its preview shows the same stats card).
 * - Copy link / Copy image (clipboard PNG, paste straight into a
 *   Facebook/WhatsApp composer) / Download image.
 *
 * The menu is portal-rendered (fixed) so ancestor overflow-hidden can never
 * clip it, and it follows the button on scroll (closing when the button
 * scrolls out of view).
 */

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

export default function ShareMenuButton({
  shareHref,
  downloadName = "billiardtoday-share.png",
  label = "Share",
  className = "",
  variant = "dark",
}: {
  shareHref: string | null;
  downloadName?: string;
  label?: string;
  className?: string;
  variant?: "dark" | "light";
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const updateMenuPosition = () => {
    const button = buttonRef.current;
    if (!button || typeof window === "undefined") return;
    const rect = button.getBoundingClientRect();
    const menuWidth = 224;
    const left = Math.max(
      8,
      Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8),
    );
    setMenuPosition({ top: rect.bottom + 6, left });
  };

  const openMenu = () => {
    updateMenuPosition();
    setMenuOpen(true);
  };

  // While open, follow the button on scroll/resize; close when it leaves the
  // viewport.
  useEffect(() => {
    if (!menuOpen) return;
    const onScrollOrResize = () => {
      const button = buttonRef.current;
      if (!button || typeof window === "undefined") {
        setMenuOpen(false);
        return;
      }
      const rect = button.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setMenuOpen(false);
        return;
      }
      updateMenuPosition();
    };
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen]);

  const handleNativeShare = async () => {
    if (!shareHref) return;
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      setMenuOpen(false);
      try {
        const response = await fetch(shareHref);
        const blob = await response.blob();
        const file = new File([blob], downloadName, { type: "image/png" });
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
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }
    setMenuOpen(true);
  };

  const handleCopyLink = async () => {
    // Prefer the enriched URL (stage/group) so the copied link shares the
    // exact group context; falls back to the bare page URL.
    const copyUrl = socialShareUrl || pageUrl;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(copyUrl);
      }
    } catch {
      // Clipboard can fail on insecure contexts.
    }
    setMenuOpen(false);
  };

  const handleCopyImage = async () => {
    if (!shareHref) return;
    setMenuOpen(false);
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
      // Best-effort — clipboard image writes are not supported everywhere.
    }
  };

  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  // When the button was given a share image href
  // (/api/og/tournament/<event>?stage=..[&group=..]), social posts must point
  // at the PAGE url enriched with the same params so link previews render the
  // matching card (group card when group is set, by-country stats when only
  // stage is set) and the click opens the right view on the site.
  const socialShareUrl = (() => {
    if (typeof window === "undefined" || !shareHref) return pageUrl;
    try {
      const target = new URL(pageUrl, window.location.origin);
      const imageUrl = new URL(shareHref, window.location.origin);
      const group = imageUrl.searchParams.get("group");
      const stage = imageUrl.searchParams.get("stage");
      if (!group && !stage) return pageUrl;
      const eventRef =
        imageUrl.pathname.split("/").filter(Boolean).pop() ?? null;
      const isEventsModulePage =
        target.pathname === "/tournaments/events" ||
        target.pathname.endsWith("/events");
      if (isEventsModulePage && eventRef) {
        // /tournaments/events resolves the event from eventId, not the path.
        target.searchParams.set("eventId", eventRef);
      }
      if (stage) target.searchParams.set("stage", stage);
      if (group) target.searchParams.set("group", group);
      return target.toString();
    } catch {
      return pageUrl;
    }
  })();

  const pageText =
    typeof document !== "undefined"
      ? document.title || "Billiard Today"
      : "Billiard Today";
  const encodedUrl = encodeURIComponent(socialShareUrl);
  const encodedText = encodeURIComponent(pageText);

  const openSharePopup = (href: string, width: number, height: number) => {
    setMenuOpen(false);
    const left = Math.max(0, Math.round((window.screen.width - width) / 2));
    const top = Math.max(0, Math.round((window.screen.height - height) / 2));
    window.open(
      href,
      "bt-social-share",
      `popup=yes,width=${width},height=${height},left=${left},top=${top},noopener,noreferrer`,
    );
  };

  const socialTargets = [
    {
      key: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      width: 640,
      height: 640,
      Icon: FacebookIcon,
    },
    {
      key: "x",
      label: "X (Twitter)",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      width: 600,
      height: 500,
      Icon: XIcon,
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      width: 640,
      height: 640,
      Icon: WhatsAppIcon,
    },
    {
      key: "telegram",
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      width: 640,
      height: 640,
      Icon: TelegramIcon,
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      width: 640,
      height: 600,
      Icon: LinkedInIcon,
    },
  ];

  if (!shareHref) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={openMenu}
        title="Share this (image + link)"
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={menuOpen}
        className={`flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold ring-1 transition sm:px-3 sm:text-xs ${
          variant === "light"
            ? "bg-gray-100 text-gray-700 ring-gray-300 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-600 dark:hover:bg-gray-700"
            : "bg-white/15 text-white ring-white/40 hover:bg-white/25 hover:text-white"
        } ${className}`}
      >
        <ShareIcon />
        <span className="hidden sm:inline">{label}</span>
      </button>

      {menuOpen && menuPosition && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Close share menu"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setMenuOpen(false)}
              />
              <div
                className="fixed z-50 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1.5 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
                style={{ top: menuPosition.top, left: menuPosition.left }}
              >
                <p className="px-3.5 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                  Share
                </p>
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
                >
                  <ShareIcon />
                  <span className="truncate">Share image…</span>
                </button>
                {socialTargets.map((target) => (
                  <button
                    key={target.key}
                    type="button"
                    onClick={() =>
                      openSharePopup(target.href, target.width, target.height)
                    }
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <target.Icon />
                    <span className="truncate">{target.label}</span>
                  </button>
                ))}
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
                  download={downloadName}
                  onClick={() => setMenuOpen(false)}
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
    </>
  );
}
