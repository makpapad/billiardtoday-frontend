"use client";

import React from "react";
import type { ReactNode } from "react";

interface Player {
  name?: string;
  full_name?: string;
  full_name_en?: string;
  photoUrl?: string | null;
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
  topLeftControl?: ReactNode;
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
  topLeftControl,
}: LiveScoreBoardCardProps) {
  const isPlayer1Active = current === "A";
  const isPlayer2Active = current === "B";
  const [internalExpanded, setInternalExpanded] = React.useState(false);
  const [hideSummaryBar, setHideSummaryBar] = React.useState(false);
  const hideSummaryTimerRef = React.useRef<number | null>(null);
  const wasExpandedRef = React.useRef(false);
  const expandedCardRef = React.useRef<HTMLDivElement | null>(null);
  const isExpanded = typeof expanded === "boolean" ? expanded : internalExpanded;

  const resolveDisplayName = (player: Player) => {
    const englishName = typeof player.full_name_en === "string" ? player.full_name_en.trim() : "";
    if (englishName) return englishName;
    const nativeName = typeof player.full_name === "string" ? player.full_name.trim() : "";
    if (nativeName) return nativeName;
    return typeof player.name === "string" ? player.name.trim() : "";
  };

  const player1Name = resolveDisplayName(player1);
  const player2Name = resolveDisplayName(player2);

  const setExpanded = (next: boolean) => {
    if (onExpandedChange) onExpandedChange(next, sessionId);
    if (typeof expanded !== "boolean") setInternalExpanded(next);
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
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
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
    const src = normalizePhotoUrl(player.photoUrl);
    const initials = initialsFor(resolveDisplayName(player)) || fallback;
    const outerSize = compact ? "w-10 h-10" : "w-16 h-16";
    const innerSize = compact ? "w-9 h-9" : "w-14 h-14";
    const textSize = compact ? "text-xs" : "text-sm";
    return (
      <div className={`${outerSize} rounded-full bg-white/10 border border-white/30 flex items-center justify-center overflow-hidden`}>
        {src ? (
          <img
            src={src}
            alt={resolveDisplayName(player) || fallback}
            className={`${innerSize} rounded-full object-cover border border-white/40`}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className={`${innerSize} rounded-full bg-white/10 border border-white/40 flex items-center justify-center ${textSize} font-semibold`}>
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
  const FlagBadge = ({ name, country }: { name?: string; country?: string | null }) => {
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
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="text-[11px] font-semibold text-white">{initial}</span>
        )}
      </div>
    );
  };

  const p1Flag = <FlagBadge name={player1Name} country={player1.country} />;
  const p2Flag = <FlagBadge name={player2Name} country={player2.country} />;
  const MobileFlagCircle = ({ name, country }: { name?: string; country?: string | null }) => {
    const initial = (name || "").trim().slice(0, 1).toUpperCase() || "P";
    const iso = resolveCountryCode(country)?.toLowerCase();
    const flagSrc = iso ? `https://flagcdn.com/w80/${iso}.png` : null;
    return (
      <div className="w-11 h-11 rounded-full bg-white/10 border border-white/30 flex items-center justify-center overflow-hidden">
        {flagSrc ? (
          <img
            src={flagSrc}
            alt={country ?? "flag"}
            className="w-10 h-10 rounded-full object-cover border border-white/40"
            loading="lazy"
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
  }: {
    variant: "top" | "bottom";
    flag: ReactNode;
    name?: string;
    run?: number;
    isActive?: boolean;
    compact?: boolean;
  }) => (
    <div
      className={`ml-0 mr-0 h-[44px] flex items-center gap-2 rounded-xl border px-2 py-1.5 shadow-sm ${
        variant === "top"
          ? "bg-white text-slate-900 border-white/70"
          : "bg-amber-300 text-slate-900 border-amber-200"
      }`}
    >
      {!compact ? <div className="flex items-center justify-center">{flag}</div> : null}
      <div className="flex-1 min-w-0 text-center">
        <div
          className={`${compact ? "text-[14px] sm:text-[15px]" : "text-[17px] sm:text-[19px]"} truncate font-semibold leading-tight`}
          title={name || ""}
        >
          {compact ? compactDisplayName(name, 16) : (name || "")}
        </div>
      </div>
      {isActive ? (
        <div className={`self-stretch rounded-md leading-none text-center bg-slate-900 text-white flex items-center justify-center ${compact ? "min-w-[26px] px-1" : "min-w-[32px] px-1.5"}`}>
          <div className={`${compact ? "text-[17px]" : "text-[22px]"} font-black tabular-nums leading-none`}>
            {run ?? 0}
          </div>
        </div>
      ) : null}
    </div>
  );

  const PointsBox = ({
    player,
    variant,
    isActive,
  }: {
    player: Player;
    variant: "top" | "bottom";
    isActive: boolean;
  }) => (
    <div
      className={`mr-0 h-[44px] rounded-xl border px-2 py-2 shadow-md flex items-center justify-center ${
        variant === "top"
          ? "bg-white/95 text-slate-900 border-white/70"
          : "bg-amber-300 text-slate-900 border-amber-200"
      } ${isActive ? "ring-2 ring-inset ring-cyan-200/80" : ""} ${
        variant === "top" ? "-translate-y-4" : "translate-y-4"
      }`}
      style={{ width: SCORE_BOX_WIDTH }}
    >
      <div className="w-full flex items-center justify-center">
        <div className="text-[44px] font-black leading-none tabular-nums text-center">
          {player.points ?? 0}
        </div>
      </div>
    </div>
  );

  const inningsDisplay =
    typeof inningsCount === "number" && Number.isFinite(inningsCount)
      ? inningsCount
      : Math.max(Number(player1.innings) || 0, Number(player2.innings) || 0);

  const InningsCard = () => (
    <div
      className="mx-auto h-[44px] rounded-[999px] border border-white/70 px-2 py-1.5 shadow bg-white/95 text-slate-900 flex flex-col items-center justify-center gap-0.5"
      style={{ width: 44 }}
    >
      <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600 leading-none">
        INN
      </div>
      <div
        className="text-[20px] font-black tabular-nums text-slate-900 leading-none"
        style={{ fontVariantNumeric: "tabular-nums" }}
        aria-label="Current inning"
      >
        {formatStat(inningsDisplay, 0)}
      </div>
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

  const StatsRow = ({
    player,
    variant,
  }: {
    player: Player;
    variant: "top" | "bottom";
  }) => {
    const items = buildPlayerStats(player);
    const rowClasses = variant === "top" ? "text-white" : "text-amber-100";
    const labelClasses = variant === "top" ? "text-white/65" : "text-amber-100/70";

    return (
      <div className={`${rowClasses} ml-0 mr-0`}>
        <div className="grid grid-cols-5 gap-1 text-[10px]">
          {items.map((item) => (
            <div key={`${variant}-${item.label}`} className="px-0.5 py-0.5 text-center">
              <div className={`${labelClasses} leading-none text-center`}>{item.label}</div>
              <div className="font-semibold tabular-nums leading-tight mt-0.5 text-center">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

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
          className="relative overflow-hidden w-full rounded-[18px] border border-cyan-200/30 bg-gradient-to-r from-[#0d3ef2] via-[#0b2ed1] to-[#091f8e] px-3 py-2 text-white shadow-xl transition hover:shadow-cyan-900/40 focus:outline-none focus:ring-4 focus:ring-cyan-200/40"
          aria-label="Expand live scoreboard"
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <span className="live-bg-orb-a absolute -left-[20%] -top-[80%] h-[220%] w-[46%] rounded-full bg-cyan-300/20 blur-3xl" />
            <span className="live-bg-orb-b absolute right-[-18%] bottom-[-90%] h-[230%] w-[48%] rounded-full bg-indigo-300/20 blur-3xl" />
          </div>
          <div className="relative flex items-center justify-between gap-2 text-sm sm:text-base font-semibold tabular-nums">
            <span className="truncate text-left flex-1">{player1Name || "Player 1"}</span>
            <span className="min-w-[30px] text-center text-[32px] leading-none font-black">{player1.points ?? 0}</span>
            <span className="min-w-[26px] text-center text-cyan-100">{formatStat(inningsDisplay, 0)}</span>
            <span className="min-w-[30px] text-center text-[32px] leading-none font-black text-amber-300">{player2.points ?? 0}</span>
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
          className={`relative overflow-hidden w-full rounded-[18px] border border-cyan-200/30 bg-gradient-to-br from-[#0d3ef2] via-[#0b2ed1] to-[#091f8e] p-1.5 sm:p-2 text-white shadow-2xl transition-all duration-[1800ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-cyan-900/40 focus:outline-none focus:ring-4 focus:ring-cyan-200/40 cursor-pointer ${
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
            className="absolute right-2 top-2 z-20 rounded-md border border-white/30 bg-slate-900/50 px-2 py-0.5 text-[10px] font-semibold text-white"
          >
            Close
          </button>
          {topLeftControl ? (
            <div className="absolute left-2 top-2 z-20">
              {topLeftControl}
            </div>
          ) : null}

      <div className="relative z-10 sm:hidden space-y-1">
        <div className="grid grid-cols-[40px_minmax(0,1fr)_52px] items-center gap-1.5">
          <MobileFlagCircle name={player1Name} country={player1.country} />
          <NamePlate
            variant="top"
            flag={p1Flag}
            name={player1Name}
            run={player1.liveRun ?? player1.run ?? 0}
            isActive={isPlayer1Active}
            compact
          />
          <div className="h-[36px] rounded-lg border border-white/70 bg-white/95 text-slate-900 flex items-center justify-center text-[38px] font-black tabular-nums">
            {player1.points ?? 0}
          </div>
        </div>
        <div className="px-1">
          <TimeoutDots used={timeoutsUsed1} max={maxTimeouts1} />
        </div>
        <div className="grid grid-cols-[52px_1fr_52px] gap-1.5 text-center">
          <div className="rounded-lg border border-white/20 bg-white/10 py-1">
            <div className="text-[9px] uppercase text-white/70">AVG</div>
            <div className="text-xs font-semibold">{buildPlayerStats(player1)[0]?.value}</div>
          </div>
          <div className="rounded-lg border border-white/70 bg-white/95 text-slate-900 py-1">
            <div className="text-[9px] uppercase tracking-[0.2em] text-slate-600">INN</div>
            <div className="text-lg font-black leading-none">{formatStat(inningsDisplay, 0)}</div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-300 text-slate-900 py-1">
            <div className="text-[9px] uppercase text-slate-700">AVG</div>
            <div className="text-xs font-semibold">{buildPlayerStats(player2)[0]?.value}</div>
          </div>
        </div>
        <div className="px-1">
          <TimerBar />
        </div>
        <div className="px-1">
          <TimeoutDots used={timeoutsUsed2} max={maxTimeouts2} />
        </div>
        <div className="grid grid-cols-[40px_minmax(0,1fr)_52px] items-center gap-1.5">
          <MobileFlagCircle name={player2Name} country={player2.country} />
          <NamePlate
            variant="bottom"
            flag={p2Flag}
            name={player2Name}
            run={player2.liveRun ?? player2.run ?? 0}
            isActive={isPlayer2Active}
            compact
          />
          <div className="h-[36px] rounded-lg border border-amber-200 bg-amber-300 text-slate-900 flex items-center justify-center text-[38px] font-black tabular-nums">
            {player2.points ?? 0}
          </div>
        </div>
      </div>

      <div
        className="relative z-10 hidden sm:grid gap-1"
        style={{
          gridTemplateColumns: `${AVATAR_COLUMN_WIDTH}px minmax(0,1fr) ${SCORE_BOX_WIDTH - 6}px`,
        }}
      >
        <div className="flex flex-col h-full justify-center gap-4 items-center py-1 pl-3">
          <div className="flex flex-col items-center gap-2 translate-y-0">
            <AvatarCircle player={player1} fallback="P1" />
            <TimeoutDots used={timeoutsUsed1} max={maxTimeouts1} />
          </div>
          <div className="flex flex-col items-center gap-2 translate-y-0">
            <TimeoutDots used={timeoutsUsed2} max={maxTimeouts2} />
            <AvatarCircle player={player2} fallback="P2" />
          </div>
        </div>

        <div className="flex flex-col h-full px-1.5 justify-center">
          <div className="pb-0.5">
            <NamePlate
              variant="top"
              flag={p1Flag}
              name={player1Name}
              run={player1.liveRun ?? player1.run ?? 0}
              isActive={isPlayer1Active}
            />
          </div>

          <div className="pt-0 pb-1">
            <StatsRow player={player1} variant="top" />
          </div>

          <div className="py-0.5 ml-0 mr-0">
            <TimerBar />
          </div>

          <div className="pt-1 pb-0">
            <StatsRow player={player2} variant="bottom" />
          </div>

          <div className="pt-0.5">
            <NamePlate
              variant="bottom"
              flag={p2Flag}
              name={player2Name}
              run={player2.liveRun ?? player2.run ?? 0}
              isActive={isPlayer2Active}
            />
          </div>
        </div>

        <div className="flex flex-col h-full gap-1 items-start justify-center pr-0 -ml-1">
          <PointsBox player={player1} variant="top" isActive={isPlayer1Active} />
          <InningsCard />
          <PointsBox player={player2} variant="bottom" isActive={isPlayer2Active} />
        </div>
      </div>
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
