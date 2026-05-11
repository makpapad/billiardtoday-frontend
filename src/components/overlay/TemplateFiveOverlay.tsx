"use client";

import * as React from "react";

export type TemplateFiveOverlayState = {
  scoreA?: number;
  scoreB?: number;
  runA?: number;
  runB?: number;
  liveRunA?: number;
  liveRunB?: number;
  bestRunA?: number;
  bestRunB?: number;
  timeoutsA?: number;
  timeoutsB?: number;
  maxTimeoutsA?: number;
  maxTimeoutsB?: number;
  current?: "A" | "B";
  inningsCount?: number;
  playerAName?: string | null;
  playerBName?: string | null;
  playerACountry?: string | null;
  playerBCountry?: string | null;
  progress?: number;
  targetPointsA?: number | null;
  targetPointsB?: number | null;
  avgFormattedA?: string | null;
  avgFormattedB?: string | null;
  inningsA?: number | null;
  inningsB?: number | null;
  tournamentName?: string | null;
  stageName?: string | null;
  tableName?: string | null;
};

type TemplateFiveOverlayProps = {
  state: TemplateFiveOverlayState;
  width?: number;
  height?: number;
  obsSafe?: boolean;
  fillViewport?: boolean;
};

function normalizeString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

function stripLeadingWord(value: string | null, word: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  const target = word.toLowerCase();
  if (!lower.startsWith(target)) return trimmed;
  const stripped = trimmed.slice(word.length).replace(/^[\s:\-]+/, "").trim();
  return stripped || trimmed;
}

function resolveCountryCode(rawCountry: string | null | undefined): string | null {
  if (!rawCountry) return null;
  const trimmed = rawCountry.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  const map: Record<string, string> = {
    greece: "GR",
    greek: "GR",
    cyprus: "CY",
    turkey: "TR",
    germany: "DE",
    france: "FR",
    italy: "IT",
    spain: "ES",
    portugal: "PT",
    england: "GB",
    "united kingdom": "GB",
    netherlands: "NL",
    belgium: "BE",
    usa: "US",
    "united states": "US",
    canada: "CA",
    egypt: "EG",
  };
  const normalized = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return map[normalized] ?? null;
}

function formatAverage(score?: number | null, innings?: number | null) {
  const safeScore = Number(score ?? 0);
  const safeInnings = Number(innings ?? 0);
  if (!Number.isFinite(safeScore) || !Number.isFinite(safeInnings) || safeInnings <= 0) return "0.000";
  return (safeScore / safeInnings).toFixed(3);
}

function resolvePlayerAverage(
  formatted: string | null | undefined,
  score?: number | null,
  playerInnings?: number | null,
  fallbackInnings?: number | null,
) {
  const normalized = normalizeString(formatted);
  if (normalized) return normalized;
  return formatAverage(score, playerInnings ?? fallbackInnings ?? 0);
}

function formatTemplateFivePlayerName(value: string): string {
  const normalized = value.trim();
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return normalized;
  const surname = parts[0];
  const givenInitial = Array.from(parts[1] ?? "").slice(0, 1).join("").trimEnd();
  return givenInitial ? `${surname} ${givenInitial}.` : surname;
}

function SmallFlag({ countryCode, large }: { countryCode: string | null; large?: boolean }) {
  const sizeClass = large ? "h-7 w-[42px]" : "h-4 w-6";

  if (!countryCode) {
    return <div className={`${sizeClass} rounded-[2px] bg-white/12`} />;
  }

  return (
    <img
      src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
      alt={countryCode}
      width={24}
      height={16}
      className={`${sizeClass} rounded-[2px] object-cover`}
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}

function CompactOverlayStats({
  avg,
  hr,
  align,
  large,
}: {
  avg: string;
  hr: number;
  align: "left" | "right";
  large?: boolean;
}) {
  const justifyClass = align === "right" ? "justify-end text-right" : "justify-start text-left";
  const statTextSize = large ? "text-[19px]" : "text-[12px]";

  return (
    <div className={`flex min-w-0 items-center gap-4 whitespace-nowrap leading-none ${justifyClass}`}>
      <span className={`${statTextSize} font-normal uppercase tracking-[0.08em] text-white/92`}>
        AVG <span className="font-semibold text-white">{avg}</span>
      </span>
      <span className={`${statTextSize} font-normal uppercase tracking-[0.08em] text-white/92`}>
        H.R. <span className="font-semibold text-white">{hr}</span>
      </span>
    </div>
  );
}

function OverlayScoreBox({ score, tone, large }: { score: number; tone: "light" | "accent"; large?: boolean }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-[5px] border font-semibold leading-none ${
        large ? "h-9 min-w-[60px] px-4 text-[30px]" : "h-7 min-w-[46px] px-3 text-[21px]"
      } ${
        tone === "accent"
          ? "border-slate-950/35 bg-amber-400 text-slate-950"
          : "border-slate-950/20 bg-white text-slate-950"
      }`}
    >
      {score}
    </div>
  );
}

function OverlayRunCircle({ run, large }: { run: number; large?: boolean }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full border border-slate-950/20 bg-white font-normal leading-none text-slate-950 ${
        large ? "h-9 w-9 text-[19px]" : "h-7 w-7 text-[14px]"
      }`}
    >
      {run}
    </div>
  );
}

function CompactTimeoutTicks({
  activeCount,
  totalCount,
  reverse,
  large,
}: {
  activeCount: number;
  totalCount: number;
  reverse?: boolean;
  large?: boolean;
}) {
  const safeTotal = Math.max(0, totalCount || 0) || 3;
  const usedCount = Math.min(Math.max(activeCount || 0, 0), safeTotal);
  const positions = Array.from({ length: safeTotal }, (_, index) => index);
  const orderedPositions = reverse ? [...positions].reverse() : positions;

  return (
    <div className={`flex shrink-0 items-center ${large ? "gap-1" : "gap-[3px]"}`}>
      {orderedPositions.map((index) => (
        <span
          key={index}
          className={`${large ? "h-7 w-[6px]" : "h-4 w-[4px]"} rounded-full ${
            index < usedCount ? "bg-slate-200/65" : "bg-emerald-400"
          }`}
        />
      ))}
    </div>
  );
}

function TurnArrow({ side, active }: { side: "left" | "right"; active: boolean }) {
  return (
    <div
      className={`h-0 w-0 shrink-0 ${active ? "opacity-100" : "opacity-25"}`}
      style={{
        borderTop: "7px solid transparent",
        borderBottom: "7px solid transparent",
        borderLeft: side === "right" ? "11px solid rgba(255,255,255,0.98)" : undefined,
        borderRight: side === "left" ? "11px solid rgba(255,255,255,0.98)" : undefined,
      }}
    />
  );
}

function TimeStrip({
  remainingBlocks,
  elapsedBlocks,
  totalBlocks,
  barWidth,
}: {
  remainingBlocks: number;
  elapsedBlocks: number;
  totalBlocks: number;
  barWidth: number;
}) {
  return (
    <div className="flex items-center gap-[3px]" style={{ width: barWidth }}>
      {Array.from({ length: totalBlocks }).map((_, index) => {
        const isElapsed = index < elapsedBlocks;
        const zoneClass = index < 20 ? "bg-emerald-400" : index < 30 ? "bg-amber-400" : "bg-red-400";
        return (
          <span
            key={index}
            className={`h-[18px] flex-1 rounded-sm ${isElapsed ? "bg-white/20" : zoneClass}`}
          />
        );
      })}
      <span className="ml-2 min-w-[34px] text-right text-[18px] font-semibold text-white">{remainingBlocks}</span>
    </div>
  );
}

function TemplateFiveBar({
  state,
  width,
  height,
  obsSafe,
}: {
  state: TemplateFiveOverlayState;
  width: number;
  height: number;
  obsSafe: boolean;
}) {
  const innings = state.inningsCount ?? 0;
  const leftScore = state.scoreA ?? 0;
  const rightScore = state.scoreB ?? 0;
  const leftRun = state.liveRunA ?? state.runA ?? 0;
  const rightRun = state.liveRunB ?? state.runB ?? 0;
  const leftAvg = resolvePlayerAverage(state.avgFormattedA, leftScore, state.inningsA, state.inningsCount);
  const rightAvg = resolvePlayerAverage(state.avgFormattedB, rightScore, state.inningsB, state.inningsCount);
  const leftHr = state.bestRunA ?? 0;
  const rightHr = state.bestRunB ?? 0;
  const target = state.targetPointsA ?? state.targetPointsB ?? null;
  const leftTimeouts = state.timeoutsA ?? 0;
  const rightTimeouts = state.timeoutsB ?? 0;
  const leftMaxTimeouts = state.maxTimeoutsA ?? 3;
  const rightMaxTimeouts = state.maxTimeoutsB ?? 3;
  const leftFlag = resolveCountryCode(state.playerACountry);
  const rightFlag = resolveCountryCode(state.playerBCountry);
  const leftName = normalizeString(state.playerAName) ?? "Player 1";
  const rightName = normalizeString(state.playerBName) ?? "Player 2";
  const activeSide = state.current;
  const tournament = state.tournamentName ?? "Live Match";
  const stage = stripLeadingWord(state.stageName ?? "-", "stage") ?? "-";
  const table = stripLeadingWord(state.tableName ?? "-", "table") ?? "-";
  const rightLabel = `${stage !== "-" ? `${stage} / ` : ""}T ${table}${target ? ` / Race ${target}` : ""}`;
  const totalBlocks = 40;
  const elapsedBlocks = Math.min(totalBlocks, Math.max(0, Number(state.progress ?? 0)));
  const remainingBlocks = Math.max(totalBlocks - elapsedBlocks, 0);
  const topStripHeight = 34;
  const mainBarHeight = 50;
  const overlayHeight = topStripHeight + mainBarHeight;
  const statsColumnWidth = Math.max(92, Math.min(132, Math.round(width * 0.115)));
  const topStripWidth = Math.max(620, Math.min(width - 20, Math.round(width * 0.86)));
  const timeStripWidth = Math.max(240, Math.min(360, Math.round(width * 0.28)));

  return (
    <div
      className="relative text-white"
      style={{
        width: "100%",
        maxWidth: width,
        height: Math.min(height, overlayHeight),
        minWidth: width,
        minHeight: overlayHeight,
        transform: obsSafe ? "translateZ(0)" : undefined,
        backfaceVisibility: obsSafe ? "hidden" : undefined,
        WebkitFontSmoothing: obsSafe ? "antialiased" : undefined,
        textRendering: obsSafe ? "geometricPrecision" : undefined,
        fontFamily: "'Barlow Condensed', 'Barlow', 'Roboto Condensed', 'Inter', system-ui, sans-serif",
      }}
    >
      <div className="flex w-full items-end justify-center overflow-visible" style={{ height: topStripHeight }}>
        <div
          className="grid items-center rounded-t-[10px] px-4 font-normal tracking-[0.05em] text-white"
          style={{
            width: topStripWidth,
            height: topStripHeight,
            backgroundColor: "#4e58b8",
            gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)",
            columnGap: 12,
            fontSize: 20,
          }}
        >
          <span className="truncate whitespace-nowrap">{tournament}</span>
          <TimeStrip remainingBlocks={remainingBlocks} elapsedBlocks={elapsedBlocks} totalBlocks={totalBlocks} barWidth={timeStripWidth} />
          <span className="justify-self-end whitespace-nowrap font-medium tracking-[0.06em] text-white" style={{ fontSize: 20 }}>
            {rightLabel}
          </span>
        </div>
      </div>

      <div
        className="grid w-full items-center rounded-[10px] px-3 text-white"
        style={{
          height: mainBarHeight,
          backgroundColor: "#2b2f7f",
          gridTemplateColumns: `${statsColumnWidth}px minmax(0,1fr) auto auto auto minmax(0,1fr) ${statsColumnWidth}px`,
          columnGap: 4,
        }}
      >
        <CompactOverlayStats align="left" avg={leftAvg} hr={leftHr} large />

        <div className="flex min-w-0 items-center justify-end gap-2 overflow-hidden" style={{ paddingRight: 14 }}>
          <CompactTimeoutTicks activeCount={leftTimeouts} totalCount={leftMaxTimeouts} large />
          {leftFlag ? <SmallFlag countryCode={leftFlag} large /> : null}
          <span className="min-w-0 truncate font-normal leading-none tracking-[0.03em]" style={{ fontSize: 28 }}>
            {formatTemplateFivePlayerName(leftName)}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <div className="flex h-6 w-[11px] shrink-0 items-center justify-center">
            {activeSide === "A" ? <TurnArrow side="right" active /> : null}
          </div>
          <div className="flex h-6 w-6 shrink-0 items-center justify-center">
            {activeSide === "A" ? <OverlayRunCircle run={leftRun} large /> : null}
          </div>
          <OverlayScoreBox score={leftScore} tone="light" large />
        </div>

        <div className="flex items-center justify-center font-semibold leading-none text-white/95" style={{ minWidth: 42, fontSize: 22 }}>
          {innings}
        </div>

        <div className="flex items-center justify-start gap-2.5">
          <OverlayScoreBox score={rightScore} tone="accent" large />
          <div className="flex h-6 w-6 shrink-0 items-center justify-center">
            {activeSide === "B" ? <OverlayRunCircle run={rightRun} large /> : null}
          </div>
          <div className="flex h-6 w-[11px] shrink-0 items-center justify-center">
            {activeSide === "B" ? <TurnArrow side="left" active /> : null}
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2 overflow-hidden" style={{ paddingLeft: 14 }}>
          <span className="min-w-0 truncate font-normal leading-none tracking-[0.03em]" style={{ fontSize: 28 }}>
            {formatTemplateFivePlayerName(rightName)}
          </span>
          {rightFlag ? <SmallFlag countryCode={rightFlag} large /> : null}
          <CompactTimeoutTicks activeCount={rightTimeouts} totalCount={rightMaxTimeouts} reverse large />
        </div>

        <CompactOverlayStats align="right" avg={rightAvg} hr={rightHr} large />
      </div>
    </div>
  );
}

export default function TemplateFiveOverlay({
  state,
  width = 1920,
  height = 1080,
  obsSafe = false,
  fillViewport = false,
}: TemplateFiveOverlayProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = React.useState({ width, height });

  React.useEffect(() => {
    if (fillViewport) {
      const update = () => setContainerSize({ width: window.innerWidth || width, height: window.innerHeight || height });
      update();
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }

    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      setContainerSize({ width, height });
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setContainerSize({ width: rect.width || width, height: rect.height || height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [fillViewport, height, width]);

  const availableWidth = containerSize.width || width;
  const availableHeight = containerSize.height || height;
  const overlayWidth = Math.max(360, Math.round(availableWidth * 0.7));
  const overlayBottom = Math.max(12, Math.round(availableHeight * 0.04));

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 text-white"
      style={{
        width: fillViewport ? "100vw" : "100%",
        height: fillViewport ? "100vh" : "100%",
        minWidth: 0,
        minHeight: 0,
        transform: obsSafe ? "translateZ(0)" : undefined,
        backfaceVisibility: obsSafe ? "hidden" : undefined,
        WebkitFontSmoothing: obsSafe ? "antialiased" : undefined,
        textRendering: obsSafe ? "geometricPrecision" : undefined,
        fontFamily: "'Barlow Condensed', 'Barlow', 'Roboto Condensed', 'Inter', system-ui, sans-serif",
      }}
    >
      <div className="absolute left-1/2 -translate-x-1/2" style={{ width: overlayWidth, bottom: overlayBottom }}>
        <TemplateFiveBar state={state} width={overlayWidth} height={availableHeight} obsSafe={obsSafe} />
      </div>
    </div>
  );
}
