"use client";

import React from "react";
import type { ReactNode } from "react";

interface Player {
  name?: string;
  full_name?: string;
  full_name_en?: string;
  photoUrl?: string | null;
  photoMainUrl?: string | null;
  country?: string | null;
  points?: number;
  run?: number;
  liveRun?: number;
  innings?: number;
  hr?: number;
  flag?: string;
  avgFormatted?: string;
  accPercent?: number;
  secondsPerInning?: number;
  playerTimeSeconds?: number;
  targetPoints?: number | null;
}

const SCORE_BOX_WIDTH = 94;
const AVATAR_COLUMN_WIDTH = 66;
const DESKTOP_SCORE_GUTTER = 18;

interface LiveScoreBoardCardProps {
  player1: Player;
  player2: Player;
  current?: "A" | "B";
  sessionId: string;
  clubName?: string | null;
  clubCity?: string | null;
  updatedAt?: string | null;
  onNavigate?: (sessionId: string) => void;
  timerProgress?: number;
  timerTotal?: number;
  timerRunning?: boolean;
  timeoutsUsed1?: number;
  maxTimeouts1?: number;
  timeoutsUsed2?: number;
  maxTimeouts2?: number;
  inningsCount?: number;
  gameDurationSeconds?: number;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean, sessionId: string) => void;
  openSignal?: number | null;
  topLeftControl?: ReactNode;
  inlineExpandable?: boolean;
  hasLiveVideos?: boolean;
  liveVideosSelected?: boolean;
  compactExpandedLayout?: boolean;
  onOpenLiveVideos?: (
    sessionId: string,
    origin?: { left: number; top: number; width: number; height: number } | null,
  ) => void;
}

export function LiveScoreBoardCard({
  player1,
  player2,
  current,
  sessionId,
  onNavigate,
  timerProgress,
  timerTotal,
  timerRunning,
  timeoutsUsed1,
  maxTimeouts1,
  timeoutsUsed2,
  maxTimeouts2,
  inningsCount,
  gameDurationSeconds,
  expanded,
  onExpandedChange,
  openSignal,
  topLeftControl,
  inlineExpandable = true,
  hasLiveVideos = false,
  liveVideosSelected = false,
  compactExpandedLayout = false,
  onOpenLiveVideos,
}: LiveScoreBoardCardProps) {
  const isPlayer1Active = current === "A";
  const isPlayer2Active = current === "B";
  const isControlled = typeof expanded === "boolean";
  const [internalExpanded, setInternalExpanded] = React.useState(false);
  const [hideSummaryBar, setHideSummaryBar] = React.useState(false);
  const hideSummaryTimerRef = React.useRef<number | null>(null);
  const wasExpandedRef = React.useRef(false);
  const expandedCardRef = React.useRef<HTMLDivElement | null>(null);
  const isExpanded = isControlled ? Boolean(expanded) : internalExpanded;
  const desktopAvatarColumnWidth = compactExpandedLayout ? 48 : AVATAR_COLUMN_WIDTH;
  const desktopScoreBoxWidth = compactExpandedLayout ? 60 : SCORE_BOX_WIDTH - 6;
  const desktopScoreReserve = desktopScoreBoxWidth + DESKTOP_SCORE_GUTTER;

  React.useEffect(() => {
    if (typeof openSignal !== "number" || !Number.isFinite(openSignal)) return;
    if (!isControlled) {
      setInternalExpanded(true);
    }
  }, [isControlled, openSignal]);

  const resolveDisplayName = (player: Player) => {
    const englishName = typeof player.full_name_en === "string" ? player.full_name_en.trim() : "";
    if (englishName) return englishName;
    const nativeName = typeof player.full_name === "string" ? player.full_name.trim() : "";
    if (nativeName) return nativeName;
    return typeof player.name === "string" ? player.name.trim() : "";
  };

  const player1Name = resolveDisplayName(player1);
  const player2Name = resolveDisplayName(player2);
  const resolveDisplayedRun = (player: Player) => {
    const live = Number(player.liveRun ?? 0) || 0;
    if (live > 0) return live;
    return Number(player.run ?? 0) || 0;
  };

  const setExpanded = (next: boolean) => {
    if (onExpandedChange) onExpandedChange(next, sessionId);
    if (!isControlled) setInternalExpanded(next);
  };

  const handleClick = () => {
    if (onNavigate) {
      onNavigate(sessionId);
    }
  };

  const handleExpand = () => {
    setExpanded(true);
    requestAnimationFrame(() => {
      expandedCardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const handleCollapse = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setExpanded(false);
  };

  const handleOpenLiveVideos = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (!hasLiveVideos || !onOpenLiveVideos) return;
    const rect = event.currentTarget.getBoundingClientRect();
    onOpenLiveVideos(sessionId, {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });
  };

  React.useEffect(() => {
    if (hideSummaryTimerRef.current) {
      window.clearTimeout(hideSummaryTimerRef.current);
      hideSummaryTimerRef.current = null;
    }

    if (isExpanded) {
      setHideSummaryBar(false);
      hideSummaryTimerRef.current = window.setTimeout(() => {
        setHideSummaryBar(true);
      }, 420);
    } else {
      if (wasExpandedRef.current) {
        setHideSummaryBar(true);
        hideSummaryTimerRef.current = window.setTimeout(() => {
          setHideSummaryBar(false);
        }, 900);
      } else {
        setHideSummaryBar(false);
      }
    }

    wasExpandedRef.current = isExpanded;

    return () => {
      if (hideSummaryTimerRef.current) {
        window.clearTimeout(hideSummaryTimerRef.current);
        hideSummaryTimerRef.current = null;
      }
    };
  }, [isExpanded]);

  const COUNTRY_NAME_TO_CODE: Record<string, string> = {
    greece: "GR",
    greek: "GR",
    cyprus: "CY",
    turkey: "TR",
    france: "FR",
    germany: "DE",
    italy: "IT",
    spain: "ES",
    portugal: "PT",
    england: "GB",
    "united kingdom": "GB",
    "great britain": "GB",
    usa: "US",
    "united states": "US",
    "united states of america": "US",
    canada: "CA",
    mexico: "MX",
    netherlands: "NL",
    belgium: "BE",
    poland: "PL",
    romania: "RO",
    bulgaria: "BG",
    serbia: "RS",
    croatia: "HR",
    slovenia: "SI",
    hungary: "HU",
    ukraine: "UA",
    russia: "RU",
    egypt: "EG",
    qatar: "QA",
    japan: "JP",
    korea: "KR",
    "south korea": "KR",
    china: "CN",
  };

  const normalizeCountryKey = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const resolveCountryCode = (rawCountry?: string | null): string | null => {
    if (!rawCountry) return null;
    const trimmed = rawCountry.trim();
    if (!trimmed) return null;
    if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
    return COUNTRY_NAME_TO_CODE[normalizeCountryKey(trimmed)] ?? null;
  };

  const normalizePhotoUrl = (value?: string | null): string | null => {
    if (!value || typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    if (trimmed.startsWith("/")) {
      const apiBase = (
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_STRAPI_URL ||
        "https://app.billiardtoday.com"
      )
        .trim()
        .replace(/\/$/, "");
      if (apiBase && trimmed.startsWith("/uploads/")) return `${apiBase}${trimmed}`;
      return trimmed;
    }
    if (trimmed.startsWith("uploads/")) return `/${trimmed}`;
    return null;
  };

  const initialsFor = (name?: string) => {
    const clean = (name || "").trim();
    if (!clean) return "?";
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  };

  const compactDisplayName = (name?: string, maxLen = 14) => {
    const raw = (name || "").trim();
    if (!raw) return "";
    if (raw.length <= maxLen) return raw;
    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const abbreviated = `${parts[0]} ${parts.slice(1).map((p) => `${p[0] ?? ""}.`).join(" ")}`.trim();
      if (abbreviated.length <= maxLen + 3) return abbreviated;
      if (parts[0].length > maxLen) return `${parts[0].slice(0, maxLen)}…`;
      return `${parts[0]}…`;
    }
    return `${raw.slice(0, maxLen)}…`;
  };

  const AvatarCircle = ({
    player,
    fallback,
    compact = false,
  }: {
    player: Player;
    fallback: string;
    compact?: boolean;
  }) => {
    const src = normalizePhotoUrl(player.photoMainUrl ?? player.photoUrl);
    const [imageFailed, setImageFailed] = React.useState(false);
    React.useEffect(() => {
      setImageFailed(false);
    }, [src]);
    const initials = initialsFor(resolveDisplayName(player)) || fallback;
    const outerSize = compact ? "w-10 h-10" : "w-[60px] h-[60px]";
    const innerSize = compact ? "w-9 h-9" : "w-[52px] h-[52px]";
    const textSize = compact ? "text-xs" : "text-sm";
    return (
      <div className={`${outerSize} rounded-full flex items-center justify-center`}>
        {src && !imageFailed ? (
          <img
            src={src}
            alt={resolveDisplayName(player) || fallback}
            className={`${innerSize} rounded-full object-cover ring-1 ring-white/20 shadow-[0_8px_18px_rgba(15,23,42,0.28)]`}
            loading="eager"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div
            className={`${innerSize} ${textSize} rounded-full bg-white/10 ring-1 ring-white/20 shadow-[0_8px_18px_rgba(15,23,42,0.22)] flex items-center justify-center font-semibold`}
          >
            {initials}
          </div>
        )}
      </div>
    );
  };

  const formatStat = (value?: number | null, fractionDigits = 1) => {
    if (value === undefined || value === null || Number.isNaN(value)) return "--";
    const formatted = Number(value).toFixed(fractionDigits);
    return formatted.replace(/\.0+$/, "");
  };

  const DEFAULT_SEGMENTS = 40;
  const maxSegments = Math.max(1, Math.min(timerTotal ?? DEFAULT_SEGMENTS, 60));
  const totalLogical = Math.max(timerTotal ?? DEFAULT_SEGMENTS, 1);
  const clampedProgress = Math.min(Math.max(timerProgress ?? 0, 0), totalLogical);
  const remainingSegments = Math.max(totalLogical - clampedProgress, 0);
  const remainingRatio = totalLogical > 0 ? remainingSegments / totalLogical : 0;
  const filledSegments = Math.round(remainingRatio * maxSegments);
  const timerLabel = remainingSegments < 100 ? remainingSegments.toString().padStart(2, "0") : remainingSegments.toString();
  const timerCritical = remainingSegments <= 10;
  const timerActive = Boolean(timerRunning);
  const renderFlagBadge = ({ name, country }: { name?: string; country?: string | null }) => {
    const initial = (name || "").trim().slice(0, 1).toUpperCase() || "P";
    const iso = resolveCountryCode(country)?.toLowerCase();
    const flagSrc = iso ? `https://flagcdn.com/w40/${iso}.png` : null;
    return (
      <div className="w-10 h-6 rounded-[5px] overflow-hidden border border-white/40 shadow-inner bg-black/20 flex items-center justify-center">
        {flagSrc ? (
          <img
            src={flagSrc}
            alt={country ?? "flag"}
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="text-[11px] font-semibold text-white">{initial}</span>
        )}
      </div>
    );
  };

  const p1Flag = renderFlagBadge({ name: player1Name, country: player1.country });
  const p2Flag = renderFlagBadge({ name: player2Name, country: player2.country });
  const renderMobileFlagCircle = ({ name, country }: { name?: string; country?: string | null }) => {
    const initial = (name || "").trim().slice(0, 1).toUpperCase() || "P";
    const iso = resolveCountryCode(country)?.toLowerCase();
    const flagSrc = iso ? `https://flagcdn.com/w40/${iso}.png` : null;
    return (
      <div className="w-11 h-11 rounded-full bg-white/10 border border-white/30 flex items-center justify-center overflow-hidden">
        {flagSrc ? (
          <img
            src={flagSrc}
            alt={country ?? "flag"}
            className="w-10 h-10 rounded-full object-cover border border-white/40"
            loading="eager"
            fetchPriority="high"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/10 border border-white/40 flex items-center justify-center text-xs font-semibold">
            {initial}
          </div>
        )}
      </div>
    );
  };

  const TimeoutDots = ({
    used = 0,
    max = 3,
  }: {
    used?: number;
    max?: number;
  }) => {
    const normalizedMax = Math.max(0, max || 0) || 3;
    const consumed = Math.min(Math.max(used || 0, 0), normalizedMax);
    return (
      <div className="flex items-center gap-1" aria-label="Timeouts">
        {Array.from({ length: normalizedMax }).map((_, idx) => {
          const isConsumed = idx < consumed;
          return (
            <span
              key={idx}
              className={`h-2 w-2 rounded-full transition-colors ${
                isConsumed ? "bg-slate-500" : "bg-green-400"
              }`}
            />
          );
        })}
      </div>
    );
  };

  const NamePlate = ({
    variant,
    flag,
    name,
    run,
    isActive,
    compact = false,
    dense = false,
    className = "",
  }: {
    variant: "top" | "bottom";
    flag: ReactNode;
    name?: string;
    run?: number;
    isActive?: boolean;
    compact?: boolean;
    dense?: boolean;
    className?: string;
  }) => (
    <div
      className={`ml-0 mr-0 flex items-center rounded-xl border shadow-sm ${
        dense ? "h-[28px] gap-1 px-1 py-0.5" : "h-[42px] gap-2 px-1.5 py-1"
      } ${
        variant === "top"
          ? "bg-white text-slate-900 border-white/70"
          : "bg-amber-300 text-slate-900 border-amber-200"
      } ${className}`}
    >
      {!compact ? <div className="flex items-center justify-center">{flag}</div> : null}
      <div className="flex-1 min-w-0 text-center">
        <div
          className={`${
            compact
              ? "text-[14px] md:text-[15px]"
              : dense
                ? "text-[11px] md:text-[12px]"
                : "text-[17px] md:text-[19px]"
          } truncate font-semibold leading-tight`}
          title={name || ""}
        >
          {compact ? compactDisplayName(name, 16) : (name || "")}
        </div>
      </div>
      <div
        className={`self-stretch rounded-md leading-none text-center flex items-center justify-center ${
          compact ? "min-w-[26px] px-1" : dense ? "min-w-[20px] px-1" : "min-w-[32px] px-1.5"
        } ${isActive ? "bg-slate-900 text-white" : "opacity-0 pointer-events-none"}`}
        aria-hidden={!isActive}
      >
        <div
          className={`${
            compact ? "text-[17px]" : dense ? "text-[14px]" : "text-[22px]"
          } font-black tabular-nums leading-none ${
            isActive ? "animate-pulse" : ""
          }`}
        >
          {run ?? 0}
        </div>
      </div>
    </div>
  );

  const LiveVideoButton = ({
    compact = false,
    className = "",
  }: {
    compact?: boolean;
    className?: string;
  }) => {
    if (!hasLiveVideos || !onOpenLiveVideos) return null;
    return (
      <button
        type="button"
        onClick={handleOpenLiveVideos}
        className={`inline-flex items-center justify-center rounded-full border shadow-none transition hover:scale-[1.04] focus:outline-none focus:ring-2 focus:ring-cyan-200/60 ${
          liveVideosSelected
            ? "border-cyan-200/70 bg-cyan-300/18 shadow-[0_10px_28px_rgba(34,211,238,0.3)]"
            : "border-transparent bg-transparent"
        } ${compact ? "h-9 w-9" : "h-10 w-10"} ${className}`}
        aria-label="Open live videos"
        title="Open live videos"
      >
        <img
          src="/icons%20webp/live4.webp"
          alt=""
          className={compact ? `h-7 w-7 object-contain ${liveVideosSelected ? "drop-shadow-[0_8px_22px_rgba(34,211,238,0.45)]" : "drop-shadow-[0_8px_18px_rgba(15,23,42,0.35)]"}` : `h-8 w-8 object-contain ${liveVideosSelected ? "drop-shadow-[0_10px_26px_rgba(34,211,238,0.48)]" : "drop-shadow-[0_10px_22px_rgba(15,23,42,0.38)]"}`}
        />
      </button>
    );
  };

  const PointsBox = ({
    player,
    variant,
    isActive,
    dense = false,
  }: {
    player: Player;
    variant: "top" | "bottom";
    isActive: boolean;
    dense?: boolean;
  }) => (
    <div
      className={`mr-0 ${dense ? "h-[28px] px-1 py-0" : "h-[42px] px-2 py-1.5"} rounded-xl border shadow-md flex items-center justify-center ${
        variant === "top"
          ? "bg-white/95 text-slate-900 border-white/70"
          : "bg-amber-300 text-slate-900 border-amber-200"
      } ${isActive ? "ring-2 ring-cyan-200/80" : ""}`}
      style={{ width: dense ? desktopScoreBoxWidth + 6 : SCORE_BOX_WIDTH }}
    >
      <div className="w-full flex items-center justify-center">
        <div className={`${dense ? "text-[25px]" : "text-[44px]"} font-black leading-none tabular-nums text-center`}>
          {player.points ?? 0}
        </div>
      </div>
    </div>
  );

  const inningsDisplay =
    typeof inningsCount === "number" && Number.isFinite(inningsCount)
      ? inningsCount
      : Math.max(Number(player1.innings) || 0, Number(player2.innings) || 0);
  const inningsMobileClasses = isPlayer2Active
    ? "border-amber-200 bg-amber-300 text-slate-900"
    : "border-white/70 bg-white/95 text-slate-900";

  const InningsCard = () => (
    <div
      className={`mx-auto ${compactExpandedLayout ? "h-[28px] gap-0" : "h-[44px] gap-0.5"} rounded-[999px] border border-white/70 px-1 py-0.5 shadow bg-white/95 text-slate-900 flex flex-col items-center justify-center`}
      style={{ width: compactExpandedLayout ? 28 : 44 }}
    >
      <div className={`${compactExpandedLayout ? "text-[5px]" : "text-[8px]"} font-black uppercase tracking-[0.16em] text-slate-600 leading-none`}>
        INN
      </div>
      <div
        className={`${compactExpandedLayout ? "text-[13px]" : "text-[20px]"} font-black tabular-nums text-slate-900 leading-none`}
        style={{ fontVariantNumeric: "tabular-nums" }}
        aria-label="Current inning"
      >
        {formatStat(inningsDisplay, 0)}
      </div>
    </div>
  );

  const DesktopInningsOverlay = () => (
    <div
      className="pointer-events-none absolute inset-y-0 hidden md:flex items-center justify-center"
      style={{ right: compactExpandedLayout ? -1 : -4, width: compactExpandedLayout ? desktopScoreBoxWidth + 6 : SCORE_BOX_WIDTH }}
    >
      <InningsCard />
    </div>
  );

  const formatDuration = (value?: number | null) => {
    if (value === undefined || value === null || Number.isNaN(value)) return null;
    const totalSeconds = Math.max(0, Math.floor(value));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes <= 0) return `${seconds}s`;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatHHMM = (value?: number | null) => {
    if (value === undefined || value === null || Number.isNaN(value)) return null;
    const totalSeconds = Math.max(0, Math.floor(value));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  const TimerBar = () => {
    const getSegmentColor = (positionRatio: number) => {
      if (positionRatio <= 0.5) return "bg-emerald-600";
      if (positionRatio <= 0.75) return "bg-orange-400";
      return "bg-red-500";
    };

    return (
      <div className="relative w-full">
        <div className="absolute left-1 top-1/2 -translate-y-1/2 rounded-md border border-white/20 bg-slate-900/40 px-1.5 py-[1px] text-[9px] font-bold tabular-nums text-white shadow-sm z-10">
          {timerLabel}
        </div>
        <div className="w-full rounded-full bg-slate-300/60 p-[1px]">
          <div className="flex gap-[1px] h-[10px] rounded-full">
            {Array.from({ length: maxSegments }).map((_, idx) => {
              const filled = idx >= maxSegments - filledSegments;
              const positionRatio = (idx + 1) / maxSegments;
              const segmentColor = getSegmentColor(positionRatio);
              return (
                <div
                  key={idx}
                  className={`flex-1 rounded-full transition-all duration-200 ${
                    filled ? segmentColor : "bg-slate-200/70"
                  }`}
                  style={{ minWidth: 0 }}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderCollapsedSummary = () => (
    <div className="mt-0.5">
      <button
        type="button"
        onClick={inlineExpandable ? handleExpand : handleClick}
        className="relative overflow-hidden w-full rounded-[18px] border border-cyan-200/30 bg-gradient-to-r from-[#0d3ef2] via-[#0b2ed1] to-[#091f8e] px-3 py-2 text-white shadow-xl transition hover:shadow-cyan-900/40 focus:outline-none focus:ring-4 focus:ring-cyan-200/40"
        aria-label={inlineExpandable ? "Expand live scoreboard" : "Open live scoreboard details"}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="live-bg-orb-a absolute -left-[20%] -top-[80%] h-[220%] w-[46%] rounded-full bg-cyan-300/20 blur-3xl" />
          <span className="live-bg-orb-b absolute right-[-18%] bottom-[-90%] h-[230%] w-[48%] rounded-full bg-indigo-300/20 blur-3xl" />
        </div>
        {topLeftControl ? (
          <div
            className="absolute left-2 top-2 z-20 hidden md:block"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            {topLeftControl}
          </div>
        ) : null}
        <div className="relative flex items-center justify-between gap-2 text-sm md:text-base font-semibold tabular-nums">
          <span className="truncate text-left flex-1">{player1Name || "Player 1"}</span>
          <span className="flex min-w-[40px] items-center justify-center">{p1Flag}</span>
          <span className="min-w-[30px] text-center text-[32px] leading-none font-black">{player1.points ?? 0}</span>
          <span className="min-w-[26px] text-center text-cyan-100">{formatStat(inningsDisplay, 0)}</span>
          <span className="min-w-[30px] text-center text-[32px] leading-none font-black text-amber-300">{player2.points ?? 0}</span>
          <span className="flex min-w-[40px] items-center justify-center">{p2Flag}</span>
          <span className="truncate text-right flex-1 text-amber-300">{player2Name || "Player 2"}</span>
        </div>
      </button>
    </div>
  );

  const renderExpandedBoard = () => (
    <div className="mt-0.5">
      <div
        ref={expandedCardRef}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        className="relative overflow-hidden w-full rounded-[18px] border border-cyan-200/30 bg-gradient-to-br from-[#0d3ef2] via-[#0b2ed1] to-[#091f8e] p-1.5 md:p-2 text-white shadow-2xl hover:shadow-cyan-900/40 focus:outline-none focus:ring-4 focus:ring-cyan-200/40 cursor-pointer"
        style={{ minHeight: "180px" }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="live-bg-orb-a absolute -left-[22%] -top-[70%] h-[220%] w-[48%] rounded-full bg-cyan-300/20 blur-3xl" />
          <span className="live-bg-orb-b absolute right-[-20%] bottom-[-86%] h-[230%] w-[50%] rounded-full bg-indigo-300/20 blur-3xl" />
          <span className="live-bg-sweep absolute left-[-35%] top-0 h-full w-[45%] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
        <button
          type="button"
          onClick={handleCollapse}
          className="absolute right-2 top-2 z-20 hidden md:inline-flex rounded-md border border-white/30 bg-slate-900/50 px-2 py-0.5 text-[10px] font-semibold text-white"
        >
          Close
        </button>
        {topLeftControl ? (
          <div
            className="absolute left-2 top-2 z-20 hidden md:block"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            {topLeftControl}
          </div>
        ) : null}

        <div className="relative z-10 md:hidden space-y-1">
          <div className="grid grid-cols-[40px_minmax(0,1fr)_52px] items-center gap-1.5">
            {renderMobileFlagCircle({ name: player1Name, country: player1.country })}
            <NamePlate
              variant="top"
              flag={p1Flag}
              name={player1Name}
              run={resolveDisplayedRun(player1)}
              isActive={isPlayer1Active}
              compact
            />
            <div className="h-[36px] rounded-lg border border-white/70 bg-white/95 text-slate-900 flex items-center justify-center text-[38px] font-black tabular-nums">
              {player1.points ?? 0}
            </div>
          </div>
          <div className="grid grid-cols-[40px_minmax(0,1fr)_52px] gap-1.5">
            <div className="flex justify-center">
              <TimeoutDots used={timeoutsUsed1} max={maxTimeouts1} />
            </div>
            <div />
            <div />
          </div>
          <div className="grid grid-cols-[40px_minmax(0,1fr)_52px] gap-1.5">
            <div className="flex items-center justify-center">
              {hasLiveVideos && onOpenLiveVideos ? (
                <LiveVideoButton compact />
              ) : topLeftControl ? (
                <div
                  className="flex items-center justify-center"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  {topLeftControl}
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-center gap-1 text-center">
              <div className="w-[38px] rounded-md border border-white/70 bg-white/95 px-0.5 py-0.5 text-slate-900">
                <div className="text-[8px] uppercase leading-none text-slate-600">HR</div>
                <div className="text-xs font-semibold leading-tight tabular-nums">{player1Hr}</div>
              </div>
              <div className="w-[46px] rounded-md border border-white/70 bg-white/95 px-0.5 py-0.5 text-slate-900">
                <div className="text-[8px] uppercase leading-none text-slate-600">AVG</div>
                <div className="text-xs font-semibold leading-tight tabular-nums">{player1Avg}</div>
              </div>
              <div className={`h-[34px] w-[34px] rounded-full border ${inningsMobileClasses} flex flex-col items-center justify-center`}>
                <div className="text-[6px] font-black uppercase leading-none text-slate-600">INN</div>
                <div className="text-[15px] font-black leading-none tabular-nums">{formatStat(inningsDisplay, 0)}</div>
              </div>
              <div className="w-[46px] rounded-md border border-amber-200 bg-amber-300 px-0.5 py-0.5 text-slate-900">
                <div className="text-[8px] uppercase leading-none text-slate-700">AVG</div>
                <div className="text-xs font-semibold leading-tight tabular-nums">{player2Avg}</div>
              </div>
              <div className="w-[38px] rounded-md border border-amber-200 bg-amber-300 px-0.5 py-0.5 text-slate-900">
                <div className="text-[8px] uppercase leading-none text-slate-700">HR</div>
                <div className="text-xs font-semibold leading-tight tabular-nums">{player2Hr}</div>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleCollapse(event);
                }}
                className="rounded-md border border-white/30 bg-slate-900/50 px-1.5 py-0.5 text-[9px] font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
          <div className="px-1">
            <TimerBar />
          </div>
          <div className="grid grid-cols-[40px_minmax(0,1fr)_52px] gap-1.5">
            <div className="flex justify-center">
              <TimeoutDots used={timeoutsUsed2} max={maxTimeouts2} />
            </div>
            <div />
            <div />
          </div>
          <div className="grid grid-cols-[40px_minmax(0,1fr)_52px] items-center gap-1.5">
            {renderMobileFlagCircle({ name: player2Name, country: player2.country })}
            <NamePlate
              variant="bottom"
              flag={p2Flag}
              name={player2Name}
              run={resolveDisplayedRun(player2)}
              isActive={isPlayer2Active}
              compact
            />
            <div className="h-[36px] rounded-lg border border-amber-200 bg-amber-300 text-slate-900 flex items-center justify-center text-[38px] font-black tabular-nums">
              {player2.points ?? 0}
            </div>
          </div>
        </div>

        <div
          className="relative z-10 hidden md:grid gap-y-1"
          style={{
            gridTemplateColumns: `${desktopAvatarColumnWidth}px minmax(0,1fr) ${desktopScoreBoxWidth}px`,
            gridTemplateRows: compactExpandedLayout ? "44px 12px 10px 12px 44px" : "60px 28px 18px 28px 60px",
          }}
        >
          <div className="row-start-1 row-end-2 flex items-center justify-center pl-2">
            <AvatarCircle player={player1} fallback="P1" compact={compactExpandedLayout} />
          </div>
          <div className="row-start-2 row-end-3 flex items-center justify-center pl-3">
            <TimeoutDots used={timeoutsUsed1} max={maxTimeouts1} />
          </div>
          <div className="row-start-4 row-end-5 flex items-center justify-center pl-3">
            <TimeoutDots used={timeoutsUsed2} max={maxTimeouts2} />
          </div>
          <div className="row-start-3 row-end-4 flex items-center justify-center pl-3">
            <LiveVideoButton />
          </div>
          <div className="row-start-5 row-end-6 flex items-center justify-center pl-2">
            <AvatarCircle player={player2} fallback="P2" compact={compactExpandedLayout} />
          </div>

          <div
            className="row-start-1 row-end-2 col-start-2 col-end-4 flex items-center px-1"
            style={{ paddingRight: desktopScoreReserve }}
          >
            <NamePlate
              variant="top"
              flag={p1Flag}
              name={player1Name}
              run={resolveDisplayedRun(player1)}
              isActive={isPlayer1Active}
              dense={compactExpandedLayout}
              className="w-full"
            />
          </div>
          <div
            className="row-start-2 row-end-3 col-start-2 col-end-4 flex items-center px-1"
            style={{ paddingRight: desktopScoreReserve }}
          >
            <StatsRow player={player1} variant="top" dense={compactExpandedLayout} className="w-full" />
          </div>
          <div
            className="row-start-3 row-end-4 col-start-2 col-end-4 flex items-center px-1"
            style={{ paddingRight: desktopScoreReserve }}
          >
            <TimerBar />
          </div>
          <div
            className="row-start-4 row-end-5 col-start-2 col-end-4 flex items-center px-1"
            style={{ paddingRight: desktopScoreReserve }}
          >
            <StatsRow player={player2} variant="bottom" dense={compactExpandedLayout} className="w-full" />
          </div>
          <div
            className="row-start-5 row-end-6 col-start-2 col-end-4 flex items-center px-1"
            style={{ paddingRight: desktopScoreReserve }}
          >
            <NamePlate
              variant="bottom"
              flag={p2Flag}
              name={player2Name}
              run={resolveDisplayedRun(player2)}
              isActive={isPlayer2Active}
              dense={compactExpandedLayout}
              className="w-full"
            />
          </div>

          <div className="row-start-1 row-end-2 col-start-3 col-end-4 z-10 flex items-center justify-end -ml-1">
            <PointsBox player={player1} variant="top" isActive={isPlayer1Active} dense={compactExpandedLayout} />
          </div>
          <div className="row-start-5 row-end-6 col-start-3 col-end-4 z-10 flex items-center justify-end -ml-1">
            <PointsBox player={player2} variant="bottom" isActive={isPlayer2Active} dense={compactExpandedLayout} />
          </div>
        </div>
        <DesktopInningsOverlay />
      </div>
    </div>
  );

  const buildPlayerStats = (player: Player) => {
    const innings = Math.max(0, Number(player.innings) || 0);
    const points = Math.max(0, Number(player.points) || 0);
    const avgFallback = innings > 0 ? points / innings : null;
    const avgLabel =
      player.avgFormatted ??
      (avgFallback === null
        ? "--"
        : Number(avgFallback).toLocaleString("el-GR", {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
          }));

    const accuracyValue =
      typeof player.accPercent === "number"
        ? player.accPercent
        : (() => {
            const denom = points + innings;
            if (denom <= 0) return null;
            return (points / denom) * 100;
          })();
    const accuracyLabel = typeof accuracyValue === "number" ? `${accuracyValue.toFixed(1)}%` : "--";

    const normalizeNumber = (value?: number | null) =>
      typeof value === "number" && Number.isFinite(value) ? value : null;

    const secPerSeconds =
      normalizeNumber(player.secondsPerInning) ??
      (() => {
        const playerSeconds = normalizeNumber(player.playerTimeSeconds);
        if (playerSeconds === null) return null;
        const denom = Math.max(1, points + innings);
        if (denom <= 0) return null;
        return Math.round(playerSeconds / denom);
      })();
    const secPerLabel = secPerSeconds !== null ? formatDuration(secPerSeconds) : "--";
    const targetTotal =
      typeof player.targetPoints === "number" && Number.isFinite(player.targetPoints)
        ? Math.max(0, Math.floor(player.targetPoints))
        : 0;
    const targetPct =
      targetTotal > 0
        ? Math.min(100, Math.max(0, (points / targetTotal) * 100))
        : null;
    const targetLabel = targetPct === null ? "--" : `${targetPct.toFixed(0)}%`;

    return [
      { label: "AVG", value: avgLabel },
      { label: "HR", value: formatStat(player.hr, 0) },
      { label: "ACC", value: accuracyLabel },
      { label: "Sec/p", value: secPerLabel },
      { label: "Target", value: targetLabel },
    ];
  };
  const player1Stats = buildPlayerStats(player1);
  const player2Stats = buildPlayerStats(player2);
  const player1Avg = player1Stats[0]?.value ?? "--";
  const player1Hr = player1Stats[1]?.value ?? "--";
  const player2Avg = player2Stats[0]?.value ?? "--";
  const player2Hr = player2Stats[1]?.value ?? "--";
  const StatsRow = ({
    player,
    variant,
    className = "",
    dense = false,
  }: {
    player: Player;
    variant: "top" | "bottom";
    className?: string;
    dense?: boolean;
  }) => {
    const items = buildPlayerStats(player);
    const rowClasses = variant === "top" ? "text-white" : "text-amber-100";
    const labelClasses = variant === "top" ? "text-white/65" : "text-amber-100/70";

    return (
      <div className={`${rowClasses} ml-0 mr-0 ${className}`}>
        <div className={`grid grid-cols-5 ${dense ? "gap-0 text-[6px]" : "gap-0.5 text-[10px]"}`}>
          {items.map((item) => (
            <div key={`${variant}-${item.label}`} className={`${dense ? "px-0 py-0" : "px-0.5 py-0"} text-center`}>
              <div className={`${labelClasses} leading-none text-center`}>{item.label}</div>
              <div className={`mt-0 text-center ${dense ? "text-[10px]" : "text-[17px]"} font-semibold leading-tight tabular-nums`}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isControlled) {
    return (
      <div className="w-full relative">
        {inlineExpandable && isExpanded ? renderExpandedBoard() : renderCollapsedSummary()}
        <style jsx>{`
          @keyframes liveFloatA {
            0% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.35; }
            50% { transform: translate3d(18px, 10px, 0) scale(1.08); opacity: 0.55; }
            100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.35; }
          }
          @keyframes liveFloatB {
            0% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.28; }
            50% { transform: translate3d(-20px, -12px, 0) scale(1.12); opacity: 0.5; }
            100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.28; }
          }
          @keyframes liveSweep {
            0% { transform: translateX(-10%); opacity: 0; }
            20% { opacity: 0.35; }
            60% { opacity: 0.2; }
            100% { transform: translateX(280%); opacity: 0; }
          }
          .live-bg-orb-a { animation: liveFloatA 8s ease-in-out infinite; }
          .live-bg-orb-b { animation: liveFloatB 10s ease-in-out infinite; }
          .live-bg-sweep { animation: liveSweep 6.5s ease-in-out infinite; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="w-full relative">
      <div
        className={`transition-all duration-450 ease-out ${
          isExpanded
            ? hideSummaryBar
              ? "pointer-events-none -translate-y-2 scale-[0.985] opacity-0"
              : "pointer-events-none translate-y-0 scale-100 opacity-100"
            : "pointer-events-auto translate-y-0 scale-100 opacity-100 mt-2"
        }`}
      >
        <button
          type="button"
          onClick={handleExpand}
          className={`relative overflow-hidden w-full rounded-[18px] border border-cyan-200/30 bg-gradient-to-r from-[#0d3ef2] via-[#0b2ed1] to-[#091f8e] text-white shadow-xl transition hover:shadow-cyan-900/40 focus:outline-none focus:ring-4 focus:ring-cyan-200/40 ${
            compactExpandedLayout ? "px-1.5 py-1" : "px-3 py-2"
          }`}
          aria-label="Expand live scoreboard"
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <span className="live-bg-orb-a absolute -left-[20%] -top-[80%] h-[220%] w-[46%] rounded-full bg-cyan-300/20 blur-3xl" />
            <span className="live-bg-orb-b absolute right-[-18%] bottom-[-90%] h-[230%] w-[48%] rounded-full bg-indigo-300/20 blur-3xl" />
          </div>
          <div className={`relative flex items-center justify-between font-semibold tabular-nums ${
            compactExpandedLayout ? "gap-1 text-[11px] md:text-[12px]" : "gap-2 text-sm md:text-base"
          }`}>
            <span className="truncate text-left flex-1">{player1Name || "Player 1"}</span>
            <span className={`text-center leading-none font-black ${compactExpandedLayout ? "min-w-[20px] text-[20px]" : "min-w-[30px] text-[32px]"}`}>{player1.points ?? 0}</span>
            <span className={`text-center text-cyan-100 ${compactExpandedLayout ? "min-w-[14px] text-[10px]" : "min-w-[26px]"}`}>{formatStat(inningsDisplay, 0)}</span>
            <span className={`text-center leading-none font-black text-amber-300 ${compactExpandedLayout ? "min-w-[20px] text-[20px]" : "min-w-[30px] text-[32px]"}`}>{player2.points ?? 0}</span>
            <span className="truncate text-right flex-1 text-amber-300">{player2Name || "Player 2"}</span>
          </div>
        </button>
      </div>

      <div
        className={`overflow-hidden transition-all duration-[1800ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isExpanded ? "max-h-[900px] opacity-100 translate-y-0 mt-2" : "max-h-0 opacity-0 -translate-y-3"
        }`}
      >
        <div
          ref={expandedCardRef}
          onClick={handleClick}
          role="button"
          tabIndex={0}
          className={`relative overflow-hidden w-full rounded-[18px] border border-cyan-200/30 bg-gradient-to-br from-[#0d3ef2] via-[#0b2ed1] to-[#091f8e] p-1.5 md:p-2 text-white shadow-2xl transition-all duration-[1800ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-cyan-900/40 focus:outline-none focus:ring-4 focus:ring-cyan-200/40 cursor-pointer ${
            isExpanded ? "scale-100 opacity-100" : "scale-[0.975] opacity-0"
          }`}
          style={{ minHeight: "180px" }}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <span className="live-bg-orb-a absolute -left-[22%] -top-[70%] h-[220%] w-[48%] rounded-full bg-cyan-300/20 blur-3xl" />
            <span className="live-bg-orb-b absolute right-[-20%] bottom-[-86%] h-[230%] w-[50%] rounded-full bg-indigo-300/20 blur-3xl" />
            <span className="live-bg-sweep absolute left-[-35%] top-0 h-full w-[45%] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          <button
            type="button"
            onClick={handleCollapse}
            className="absolute right-2 top-2 z-20 hidden md:inline-flex rounded-md border border-white/30 bg-slate-900/50 px-2 py-0.5 text-[10px] font-semibold text-white"
          >
            Close
          </button>
          {topLeftControl ? (
            <div className="absolute left-2 top-2 z-20 hidden md:block">
              {topLeftControl}
            </div>
          ) : null}
          {hasLiveVideos && onOpenLiveVideos ? (
            <div className="absolute right-12 top-2 z-20 hidden md:block">
              <LiveVideoButton />
            </div>
          ) : null}

      <div className="relative z-10 md:hidden space-y-1">
        <div className="grid grid-cols-[40px_minmax(0,1fr)_52px] items-center gap-1.5">
          {renderMobileFlagCircle({ name: player1Name, country: player1.country })}
            <NamePlate
              variant="top"
              flag={p1Flag}
              name={player1Name}
              run={resolveDisplayedRun(player1)}
              isActive={isPlayer1Active}
              compact
            />
          <div className="h-[36px] rounded-lg border border-white/70 bg-white/95 text-slate-900 flex items-center justify-center text-[38px] font-black tabular-nums">
            {player1.points ?? 0}
          </div>
        </div>
        <div className="grid grid-cols-[40px_minmax(0,1fr)_52px] gap-1.5">
          <div className="flex justify-center">
            <TimeoutDots used={timeoutsUsed1} max={maxTimeouts1} />
          </div>
          <div />
          <div />
        </div>
        <div className="grid grid-cols-[40px_minmax(0,1fr)_52px] gap-1.5">
          <div className="flex items-center justify-center">
            {hasLiveVideos && onOpenLiveVideos ? (
              <LiveVideoButton compact />
            ) : topLeftControl ? (
              <div
                className="flex items-center justify-center"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                {topLeftControl}
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-center gap-1 text-center">
            <div className="w-[38px] rounded-md border border-white/70 bg-white/95 px-0.5 py-0.5 text-slate-900">
              <div className="text-[8px] uppercase leading-none text-slate-600">HR</div>
              <div className="text-xs font-semibold leading-tight tabular-nums">{player1Hr}</div>
            </div>
            <div className="w-[46px] rounded-md border border-white/70 bg-white/95 px-0.5 py-0.5 text-slate-900">
              <div className="text-[8px] uppercase leading-none text-slate-600">AVG</div>
              <div className="text-xs font-semibold leading-tight tabular-nums">{player1Avg}</div>
            </div>
            <div className={`h-[34px] w-[34px] rounded-full border ${inningsMobileClasses} flex flex-col items-center justify-center`}>
              <div className="text-[6px] font-black uppercase leading-none text-slate-600">INN</div>
              <div className="text-[15px] font-black leading-none tabular-nums">{formatStat(inningsDisplay, 0)}</div>
            </div>
            <div className="w-[46px] rounded-md border border-amber-200 bg-amber-300 px-0.5 py-0.5 text-slate-900">
              <div className="text-[8px] uppercase leading-none text-slate-700">AVG</div>
              <div className="text-xs font-semibold leading-tight tabular-nums">{player2Avg}</div>
            </div>
            <div className="w-[38px] rounded-md border border-amber-200 bg-amber-300 px-0.5 py-0.5 text-slate-900">
              <div className="text-[8px] uppercase leading-none text-slate-700">HR</div>
              <div className="text-xs font-semibold leading-tight tabular-nums">{player2Hr}</div>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleCollapse(event);
              }}
              className="rounded-md border border-white/30 bg-slate-900/50 px-1.5 py-0.5 text-[9px] font-semibold text-white"
            >
              Close
            </button>
          </div>
        </div>
        <div className="px-1">
          <TimerBar />
        </div>
        <div className="grid grid-cols-[40px_minmax(0,1fr)_52px] gap-1.5">
          <div className="flex justify-center">
            <TimeoutDots used={timeoutsUsed2} max={maxTimeouts2} />
          </div>
          <div />
          <div />
        </div>
        <div className="grid grid-cols-[40px_minmax(0,1fr)_52px] items-center gap-1.5">
          {renderMobileFlagCircle({ name: player2Name, country: player2.country })}
            <NamePlate
              variant="bottom"
              flag={p2Flag}
              name={player2Name}
              run={resolveDisplayedRun(player2)}
              isActive={isPlayer2Active}
              compact
            />
          <div className="h-[36px] rounded-lg border border-amber-200 bg-amber-300 text-slate-900 flex items-center justify-center text-[38px] font-black tabular-nums">
            {player2.points ?? 0}
          </div>
        </div>
      </div>

      <div
        className="relative z-10 hidden md:grid gap-y-1"
        style={{
          gridTemplateColumns: `${desktopAvatarColumnWidth}px minmax(0,1fr) ${desktopScoreBoxWidth}px`,
            gridTemplateRows: compactExpandedLayout ? "44px 12px 10px 12px 44px" : "60px 28px 18px 28px 60px",
        }}
      >
        <div className="row-start-1 row-end-2 flex items-center justify-center pl-2">
          <AvatarCircle player={player1} fallback="P1" compact={compactExpandedLayout} />
        </div>
        <div className="row-start-2 row-end-3 flex items-center justify-center pl-3">
          <TimeoutDots used={timeoutsUsed1} max={maxTimeouts1} />
        </div>
        <div className="row-start-4 row-end-5 flex items-center justify-center pl-3">
          <TimeoutDots used={timeoutsUsed2} max={maxTimeouts2} />
        </div>
        <div className="row-start-3 row-end-4 flex items-center justify-center pl-3">
          <LiveVideoButton />
        </div>
        <div className="row-start-5 row-end-6 flex items-center justify-center pl-2">
          <AvatarCircle player={player2} fallback="P2" compact={compactExpandedLayout} />
        </div>

        <div
          className="row-start-1 row-end-2 col-start-2 col-end-4 flex items-center px-1"
          style={{ paddingRight: desktopScoreReserve }}
        >
          <NamePlate
            variant="top"
            flag={p1Flag}
            name={player1Name}
            run={resolveDisplayedRun(player1)}
            isActive={isPlayer1Active}
            dense={compactExpandedLayout}
            className="w-full"
          />
        </div>
        <div
          className="row-start-2 row-end-3 col-start-2 col-end-4 flex items-center px-1"
          style={{ paddingRight: desktopScoreReserve }}
        >
          <StatsRow player={player1} variant="top" dense={compactExpandedLayout} className="w-full" />
        </div>
        <div
          className="row-start-3 row-end-4 col-start-2 col-end-4 flex items-center px-1"
          style={{ paddingRight: desktopScoreReserve }}
        >
          <TimerBar />
        </div>
        <div
          className="row-start-4 row-end-5 col-start-2 col-end-4 flex items-center px-1"
          style={{ paddingRight: desktopScoreReserve }}
        >
          <StatsRow player={player2} variant="bottom" dense={compactExpandedLayout} className="w-full" />
        </div>
        <div
          className="row-start-5 row-end-6 col-start-2 col-end-4 flex items-center px-1"
          style={{ paddingRight: desktopScoreReserve }}
        >
          <NamePlate
            variant="bottom"
            flag={p2Flag}
            name={player2Name}
            run={resolveDisplayedRun(player2)}
            isActive={isPlayer2Active}
            dense={compactExpandedLayout}
            className="w-full"
          />
        </div>

        <div className="row-start-1 row-end-2 col-start-3 col-end-4 z-10 flex items-center justify-end -ml-1">
          <PointsBox player={player1} variant="top" isActive={isPlayer1Active} dense={compactExpandedLayout} />
        </div>
        <div className="row-start-5 row-end-6 col-start-3 col-end-4 z-10 flex items-center justify-end -ml-1">
          <PointsBox player={player2} variant="bottom" isActive={isPlayer2Active} dense={compactExpandedLayout} />
        </div>
      </div>
      <DesktopInningsOverlay />
        </div>
      </div>
      <style jsx>{`
        @keyframes liveFloatA {
          0% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.35; }
          50% { transform: translate3d(18px, 10px, 0) scale(1.08); opacity: 0.55; }
          100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.35; }
        }
        @keyframes liveFloatB {
          0% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.28; }
          50% { transform: translate3d(-20px, -12px, 0) scale(1.12); opacity: 0.5; }
          100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.28; }
        }
        @keyframes liveSweep {
          0% { transform: translateX(-10%); opacity: 0; }
          20% { opacity: 0.35; }
          60% { opacity: 0.2; }
          100% { transform: translateX(280%); opacity: 0; }
        }
        .live-bg-orb-a { animation: liveFloatA 8s ease-in-out infinite; }
        .live-bg-orb-b { animation: liveFloatB 10s ease-in-out infinite; }
        .live-bg-sweep { animation: liveSweep 6.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
