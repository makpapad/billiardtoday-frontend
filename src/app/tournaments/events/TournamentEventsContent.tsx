"use client";

import {
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { List, X } from "lucide-react";
import type {
  EventApiResponse,
  NormalizedEventStage,
  NormalizedFinalResult,
  NormalizedGroupPlayer,
  NormalizedStageResult,
  NormalizedTimetableSlot,
  StrapiEventTimetableSlot,
  StageMatchGroup,
} from "./types";
import { buildTournamentSlug } from "@/lib/tournaments";
import {
  toRelationArray,
  normalizeEntity,
  normalizeGroup,
  normalizeFinalResult,
  normalizeResult,
  toNumber,
  formatDateRange,
  formatDateForTable,
  formatNumberValue,
  formatAverage,
  formatOutcomeLabel,
  getMatchRowClass,
  getDateCellClass,
  buildStageMatchGroups,
  buildGroupStandings,
  hasPlayedStageMatch,
  isDynamicPlaceholderPlayer,
} from "./utils";
import GroupStandingsTable from "./GroupStandingsTable";
import SingleElimBracket, {
  type BracketMatchView,
  type BracketRoundView,
} from "./SingleElimBracket";
import {
  isFivePinsEvent,
  isFivePinsRuleset,
  buildFivePinsStandings,
  FivePinsGroupMatchesTable,
  FivePinsStandingsTable,
} from "./FivePinsTables";
import {
  isBiathlonEvent,
  buildBiathlonStandings,
  BiathlonGroupMatchesTable,
  BiathlonStandingsTable,
  BiathlonUnifiedRankingTable,
  BiathlonFinalRankingTable,
  BiathlonBracketModal,
} from "./BiathlonTables";
import { getCountryFlagCdnUrl } from "@/lib/countryFlags";
import type { LiveScoreChartInningDetailEntry } from "@/components/live/LiveSheetScoreChart";

const BRACKET_STAGE_TYPES = new Set([
  "double_elimination",
  "single_elimination",
  "brackets",
  "bracket",
  "knockout",
]);

type GroupLabelMode = "numbers" | "letters";
type KoRankingRound = "opening-final" | "r16-final" | "r32" | "r16" | "qf" | "sf" | "final";

function isBracketStageType(stageType: string | null | undefined): boolean {
  return (
    typeof stageType === "string" &&
    BRACKET_STAGE_TYPES.has(stageType.trim().toLowerCase())
  );
}

function isBracketStage(stage: NormalizedEventStage | null | undefined): boolean {
  if (!stage) return false;
  if (isBracketStageType(stage.stageType)) return true;
  const title = stage.title.trim().toLowerCase();
  if (stage.isFinal && title.includes("final tournament")) return true;
  return stage.groups.some((match) => {
    const round = match.round?.trim().toUpperCase();
    return round === "R32" || round === "R16" || round === "QF" || round === "SF" || round === "F";
  });
}

function toGroupLetter(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1) return null;
  let current = Math.floor(value);
  let label = "";
  while (current > 0) {
    current -= 1;
    label = String.fromCharCode(65 + (current % 26)) + label;
    current = Math.floor(current / 26);
  }
  return label || null;
}

function resolveGroupLabelMode(
  timetableConfig: Record<string, unknown> | null | undefined,
): GroupLabelMode {
  return timetableConfig?.groupLabelMode === "numbers" ? "numbers" : "letters";
}

function formatGroupDisplayLabel(
  value: number | null | undefined,
  mode: GroupLabelMode,
): string {
  const suffix =
    mode === "letters"
      ? (toGroupLetter(value) ?? "?")
      : (typeof value === "number" && Number.isFinite(value) ? String(value) : "?");
  return `Group ${suffix}`;
}

function formatStageMatchLabel(
  stage: NormalizedEventStage,
  group: StageMatchGroup,
  match?: StageMatchGroup["matches"][number] | null,
): string {
  const sourceMatch = match ?? group.matches[0] ?? null;
  if (isBracketStage(stage)) {
    const round = sourceMatch?.round || stage.title || "KO";
    const matchNumber =
      sourceMatch?.matchNumber ??
      (group.number !== null && Number.isFinite(group.number) ? group.number : null);
    return matchNumber !== null ? `${round} Match ${matchNumber}` : round;
  }

  // Prefer the source group label ("A", "B", "Group 1", ...) when present:
  // group.number can be an internal sequence id (e.g. 1306) on imported
  // events, which would render nonsense letters like "Group AXF".
  const rawLabel =
    typeof group.label === "string" && group.label.trim()
      ? group.label.trim()
      : null;
  if (rawLabel) {
    return /^group\s/i.test(rawLabel) ? rawLabel : `Group ${rawLabel}`;
  }

  return formatGroupDisplayLabel(
    group.number,
    resolveGroupLabelMode(stage.timetableConfig),
  );
}

function canRenderBracketPyramid(
  stageType: string | null | undefined,
  matches: unknown[],
): boolean {
  if (!isBracketStageType(stageType)) return false;
  if (stageType === "double_elimination") return true;
  if (!Array.isArray(matches) || matches.length === 0) return false;

  const minimumCoverage = Math.max(1, Math.ceil(matches.length * 0.6));
  let withRound = 0;
  let withMatchNumber = 0;
  let withBracketLinks = 0;

  matches.forEach((match) => {
    if (!match || typeof match !== "object") return;
    const record = match as Record<string, unknown>;
    if (
      typeof record.round === "string" &&
      record.round.trim().length > 0
    ) {
      withRound += 1;
    }
    if (typeof toNumber(record.match_number) === "number") {
      withMatchNumber += 1;
    }
    if (
      typeof toNumber(record.global_match_number) === "number" ||
      typeof toNumber(record.winner_to_global_match_number) === "number" ||
      typeof toNumber(record.loser_to_global_match_number) === "number"
    ) {
      withBracketLinks += 1;
    }
  });

  return (
    withRound >= minimumCoverage &&
    (withMatchNumber >= minimumCoverage || withBracketLinks >= minimumCoverage)
  );
}

const KO_ROUND_OPTIONS: Array<{ value: Exclude<KoRankingRound, "opening-final" | "r16-final">; label: string; size: number }> = [
  { value: "r32", label: "R32", size: 32 },
  { value: "r16", label: "R16", size: 16 },
  { value: "qf", label: "Quarter Finals", size: 8 },
  { value: "sf", label: "Semi Finals", size: 4 },
  { value: "final", label: "Final", size: 2 },
];

const knockoutRoundSize = (round: string | null | undefined): number | null => {
  const normalized = String(round ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (["r32", "round 32", "round32", "1/16", "last 32", "last32"].includes(normalized)) return 32;
  if (["r16", "round 16", "round16", "1/8", "last 16", "last16"].includes(normalized)) return 16;
  if (["qf", "quarter", "quarters", "quarter final", "quarter finals", "quarterfinal", "quarterfinals", "1/4", "last 8", "last8"].includes(normalized)) return 8;
  if (["sf", "semi", "semis", "semi final", "semi finals", "semifinal", "semifinals", "1/2", "last 4", "last4"].includes(normalized)) return 4;
  if (["f", "final", "finals"].includes(normalized)) return 2;
  const rMatch = normalized.match(/^r(\d+)$/);
  if (rMatch?.[1]) {
    const parsed = Number(rMatch[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const getOpeningKnockoutRoundSize = (stage: NormalizedEventStage): number => {
  const sizes = new Set<number>();
  for (const match of stage.groups) {
    const size = knockoutRoundSize(match.round);
    if (size) sizes.add(size);
  }
  if (sizes.size > 0) return Math.max(...sizes);
  return Math.max(2, stage.groups.length * 2);
};

type TournamentEventsContentProps = {
  eventIdOverride?: string | null;
  initialEventData?: EventApiResponse | null;
  eventDataOverride?: EventApiResponse | null;
  disableAutoRefresh?: boolean;
  preferredStageDocumentId?: string | null;
  preferredGroupParam?: string | null;
  preferredMatchParam?: string | null;
  timezoneOffsetMinutes?: number | null;
  timezoneName?: string | null;
  timezoneOptions?: Array<{
    label: string;
    options: Array<{ value: string; label: string }>;
  }>;
  onTimezoneChange?: (value: string) => void;
  onStageSelect?: (stageDocumentId: string) => void;
  showPublishedFinalResults?: boolean;
  showTimetable?: boolean;
  stageViewMode?: "results" | "ranks";
  koRankingRound?: KoRankingRound;
  onKoRankingRoundChange?: (round: KoRankingRound) => void;
  embeddedOverride?: boolean;
  showStandaloneTitle?: boolean;
  showEventHeader?: boolean;
  emptyStateMessage?: string;
  liveSessionsOverride?: EventLiveSession[] | null;
  onLiveMatchOpen?: (sessionId: string) => void;
};

type EventLiveSession = {
  id: string;
  documentId: string;
  eventId: string | null;
  eventStageId: string | null;
  groupNumber: number | null;
  screenIdentifier: string | null;
  player1DocumentId: string | null;
  player2DocumentId: string | null;
  player1Name: string | null;
  player2Name: string | null;
  sessionStatus: string | null;
  state?: {
    scoreA?: number | null;
    scoreB?: number | null;
    runA?: number | null;
    runB?: number | null;
    liveRunA?: number | null;
    liveRunB?: number | null;
    inningsA?: number | null;
    inningsB?: number | null;
    inningsCount?: number | null;
    bestRunA?: number | null;
    bestRunB?: number | null;
    bestRun2A?: number | null;
    bestRun2B?: number | null;
    avgFormattedA?: string | null;
    avgFormattedB?: string | null;
    accPercentA?: number | null;
    accPercentB?: number | null;
    current?: "A" | "B" | null;
    playerAName?: string | null;
    playerBName?: string | null;
    playerACountry?: string | null;
    playerBCountry?: string | null;
    inningsDetail?: LiveScoreChartInningDetailEntry[];
  } | null;
};

type MatchSheetModalData = {
  title: string;
  subtitle: string | null;
  session: EventLiveSession;
};

function PlayerNameWithFlag({
  name,
  nativeName,
  country,
  highlight = false,
  showNativeName = true,
}: {
  name: string;
  nativeName?: string | null;
  country?: string | null;
  highlight?: boolean;
  showNativeName?: boolean;
}) {
  const flagSrc = getCountryFlagCdnUrl(country ?? null, 40);
  return (
    <div className="flex items-start gap-2 leading-tight">
      {flagSrc ? (
        <img
          src={flagSrc}
          alt={country || "flag"}
          className="mt-0.5 h-3.5 w-5 rounded-[2px] object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : null}
      <div className="flex flex-col leading-tight">
        <span
          className={clsx(
            "font-semibold",
            highlight && "text-yellow-600 dark:text-yellow-300",
          )}
        >
          {name || "Unknown"}
        </span>
        {showNativeName && nativeName && nativeName.trim() !== name.trim() && (
          <span
            className={clsx(
              "text-[10px] text-gray-500 dark:text-gray-400",
              highlight && "text-yellow-600/80 dark:text-yellow-300/80",
            )}
          >
            {nativeName}
          </span>
        )}
      </div>
    </div>
  );
}

const normalizeSheetNumber = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.trunc(parsed));
};

const formatSheetNumber = (value: unknown) => {
  const normalized = normalizeSheetNumber(value);
  return normalized === null ? "-" : String(normalized);
};

const formatSheetAverage = (
  explicit: string | null | undefined,
  points: unknown,
  innings: unknown,
) => {
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  const safePoints = normalizeSheetNumber(points);
  const safeInnings = normalizeSheetNumber(innings);
  if (safePoints === null || safeInnings === null || safeInnings <= 0) return "-";
  return (safePoints / safeInnings).toFixed(3);
};

const formatSheetPercent = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return `${parsed.toFixed(1)}%`;
};

const computeSheetAccuracy = (
  points: unknown,
  innings: unknown,
  isWinner: boolean,
  isDraw: boolean,
) => {
  const safePoints = normalizeSheetNumber(points);
  const safeInnings = normalizeSheetNumber(innings);
  if (safePoints === null || safeInnings === null) return null;
  const adjustedInnings = !isDraw && isWinner ? Math.max(0, safeInnings - 1) : safeInnings;
  const denominator = safePoints + adjustedInnings;
  if (denominator <= 0) return null;
  return (safePoints / denominator) * 100;
};

const hasFinishedSessionStatus = (value: string | null | undefined) => {
  const normalized = String(value || "").trim().toLowerCase();
  return ["completed", "complete", "finished", "ended", "closed"].includes(normalized);
};

function stageHasIncompleteMatches(stage: NormalizedEventStage): boolean {
  return buildStageMatchGroups(stage.groups).some((group) =>
    group.matches.some((match) => !hasPlayedStageMatch(match)),
  );
}

function eventStagesHaveIncompleteMatches(stages: NormalizedEventStage[]): boolean {
  return stages.some(stageHasIncompleteMatches);
}

function MatchSheetPlayerSummary({
  name,
  country,
  score,
  innings,
  avg,
  highRun,
  highRun2,
  accuracy,
  active,
  tone,
}: {
  name: string;
  country?: string | null;
  score?: number | null;
  innings?: number | null;
  avg?: string | null;
  highRun?: number | null;
  highRun2?: number | null;
  accuracy?: number | null;
  active?: boolean;
  tone: "red" | "blue";
}) {
  const flagSrc = getCountryFlagCdnUrl(country ?? null, 40);
  const accentClass = tone === "red" ? "border-red-300/50 bg-red-500/10" : "border-sky-300/50 bg-sky-500/10";
  return (
    <div
      className={clsx(
        "rounded-2xl border px-4 py-4 text-white shadow-[0_18px_50px_rgba(2,6,23,0.28)]",
        active ? accentClass : "border-white/10 bg-white/[0.04]",
      )}
    >
      <div className="flex items-center gap-3">
        {flagSrc ? (
          <img
            src={flagSrc}
            alt={country || "flag"}
            className="h-5 w-8 rounded-sm object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : null}
        <div className="min-w-0 flex-1 truncate text-sm font-bold">{name}</div>
      </div>
      <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.05] text-center">
        {[
          { label: "Score", value: formatSheetNumber(score) },
          { label: "Inn", value: formatSheetNumber(innings) },
          { label: "Avg", value: formatSheetAverage(avg, score, innings) },
          { label: "H.R.", value: formatSheetNumber(highRun) },
          { label: "H.R.2", value: formatSheetNumber(highRun2) },
          { label: "Acc", value: formatSheetPercent(accuracy) },
        ].map((item) => (
          <div key={item.label} className="border-b border-r border-white/10 px-2 py-2 last:border-r-0 [&:nth-child(n+4)]:border-b-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{item.label}</div>
            <div className="mt-1 text-sm font-black tabular-nums text-white">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function extractMatchSheetInningsDetail(source: unknown): LiveScoreChartInningDetailEntry[] {
  const resolve = (value: unknown): LiveScoreChartInningDetailEntry[] => {
    if (!value) return [];
    if (typeof value === "string") {
      try {
        return resolve(JSON.parse(value));
      } catch {
        return [];
      }
    }
    if (Array.isArray(value)) {
      return value.filter(
        (entry): entry is LiveScoreChartInningDetailEntry =>
          Boolean(entry) &&
          typeof entry === "object" &&
          Number.isFinite((entry as LiveScoreChartInningDetailEntry).inning) &&
          (entry as LiveScoreChartInningDetailEntry).inning > 0,
      );
    }
    if (typeof value === "object") {
      const record = value as {
        inningsDetail?: unknown;
        matchSheetJson?: unknown;
        matchSheet?: unknown;
        data?: { attributes?: { inningsDetail?: unknown } };
      };
      const candidates = [
        record.inningsDetail,
        record.matchSheetJson,
        record.matchSheet,
        record.data?.attributes?.inningsDetail,
      ];
      for (const candidate of candidates) {
        const detail = resolve(candidate);
        if (detail.length > 0) return detail;
      }
    }
    return [];
  };

  return resolve(source);
}

function MatchSheetModal({
  data,
  onClose,
}: {
  data: MatchSheetModalData;
  onClose: () => void;
}) {
  const state = data.session.state ?? {};
  const playerAName = state.playerAName || data.session.player1Name || "Player A";
  const playerBName = state.playerBName || data.session.player2Name || "Player B";
  const detailRows = Array.isArray(state.inningsDetail)
    ? [...state.inningsDetail]
        .filter((entry) => Number.isFinite(entry?.inning) && entry.inning > 0)
        .sort((a, b) => a.inning - b.inning)
    : [];
  const scoreA = normalizeSheetNumber(state.scoreA);
  const scoreB = normalizeSheetNumber(state.scoreB);
  const isDraw = scoreA !== null && scoreB !== null && scoreA === scoreB;
  const winnerSide =
    scoreA === null || scoreB === null || isDraw ? null : scoreA > scoreB ? "A" : "B";
  const accuracyA =
    Number.isFinite(Number(state.accPercentA))
      ? state.accPercentA
      : computeSheetAccuracy(state.scoreA, state.inningsA, winnerSide === "A", isDraw);
  const accuracyB =
    Number.isFinite(Number(state.accPercentB))
      ? state.accPercentB
      : computeSheetAccuracy(state.scoreB, state.inningsB, winnerSide === "B", isDraw);

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/82 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#071422] text-white shadow-[0_30px_120px_rgba(2,6,23,0.72)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
              Match sheet
            </div>
            <div className="mt-1 truncate text-lg font-black tracking-tight">{data.title}</div>
            {data.subtitle ? (
              <div className="mt-1 truncate text-sm font-medium text-slate-300">{data.subtitle}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
            aria-label="Close match sheet"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <MatchSheetPlayerSummary
              name={playerAName}
              country={state.playerACountry}
              score={state.scoreA}
              innings={state.inningsA}
              avg={state.avgFormattedA}
              highRun={state.bestRunA}
              highRun2={state.bestRun2A}
              accuracy={accuracyA}
              active={state.current === "A"}
              tone="red"
            />
            <MatchSheetPlayerSummary
              name={playerBName}
              country={state.playerBCountry}
              score={state.scoreB}
              innings={state.inningsB}
              avg={state.avgFormattedB}
              highRun={state.bestRunB}
              highRun2={state.bestRun2B}
              accuracy={accuracyB}
              active={state.current === "B"}
              tone="blue"
            />
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
            <div className="grid grid-cols-[1fr_1fr_76px_1fr_1fr] border-b border-white/10 bg-white/[0.05] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
              <div className="text-center">Point</div>
              <div className="text-center">Score</div>
              <div className="text-center">Inn</div>
              <div className="text-center">Point</div>
              <div className="text-center">Score</div>
            </div>
            {detailRows.length > 0 ? (
              <div>
                {detailRows.map((row, index) => (
                  <div
                    key={`sheet-row-${row.inning}`}
                    className={clsx(
                      "grid grid-cols-[1fr_1fr_76px_1fr_1fr] items-center px-3 py-2.5 text-sm",
                      index > 0 && "border-t border-white/10",
                    )}
                  >
                    <div className="text-center font-semibold text-white">{formatSheetNumber(row.player1?.pt)}</div>
                    <div className="text-center font-semibold text-white">{formatSheetNumber(row.player1?.tot)}</div>
                    <div className="mx-auto w-full max-w-[64px] rounded-lg bg-white/[0.06] px-2 py-1 text-center font-black text-cyan-100">
                      {formatSheetNumber(row.inning)}
                    </div>
                    <div className="text-center font-semibold text-white">{formatSheetNumber(row.player2?.pt)}</div>
                    <div className="text-center font-semibold text-white">{formatSheetNumber(row.player2?.tot)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-slate-300">
                No inning detail available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function resolveBracketWinners(params: {
  sourceTag: string;
  score1: number | null;
  score2: number | null;
  tieBreak1: number | null;
  tieBreak2: number | null;
}) {
  const { sourceTag, score1, score2, tieBreak1, tieBreak2 } = params;

  if (sourceTag === "ff-2") return { winner1: true, winner2: false };
  if (sourceTag === "ff-1") return { winner1: false, winner2: true };
  if (sourceTag === "double-ff") return { winner1: false, winner2: false };

  if (score1 !== null && score2 !== null) {
    if (score1 > score2) return { winner1: true, winner2: false };
    if (score2 > score1) return { winner1: false, winner2: true };
  }

  if (tieBreak1 !== null && tieBreak2 !== null) {
    if (tieBreak1 > tieBreak2) return { winner1: true, winner2: false };
    if (tieBreak2 > tieBreak1) return { winner1: false, winner2: true };
  }

  return { winner1: false, winner2: false };
}

function resolveBracketMatchPoints(params: {
  sourceTag: string;
  score1: number | null;
  score2: number | null;
  tieBreak1: number | null;
  tieBreak2: number | null;
  storedMatchPoints1: number | null;
  storedMatchPoints2: number | null;
}) {
  const {
    sourceTag,
    score1,
    score2,
    tieBreak1,
    tieBreak2,
    storedMatchPoints1,
    storedMatchPoints2,
  } = params;

  if (storedMatchPoints1 !== null || storedMatchPoints2 !== null) {
    return {
      matchPoints1: storedMatchPoints1,
      matchPoints2: storedMatchPoints2,
    };
  }

  if (sourceTag === "ff-1") {
    return { matchPoints1: 0, matchPoints2: 2 };
  }

  if (sourceTag === "ff-2") {
    return { matchPoints1: 2, matchPoints2: 0 };
  }

  if (sourceTag === "double-ff") {
    return { matchPoints1: 0, matchPoints2: 0 };
  }

  const { winner1, winner2 } = resolveBracketWinners({
    sourceTag,
    score1,
    score2,
    tieBreak1,
    tieBreak2,
  });

  if (winner1) return { matchPoints1: 2, matchPoints2: 0 };
  if (winner2) return { matchPoints1: 0, matchPoints2: 2 };

  if (score1 === 0 && score2 === 0) {
    return { matchPoints1: 0, matchPoints2: 0 };
  }

  if (score1 !== null && score2 !== null && score1 === score2) {
    return { matchPoints1: 1, matchPoints2: 1 };
  }

  return { matchPoints1: null, matchPoints2: null };
}

function readStoredBracketMatchPoints(
  match: Record<string, unknown>,
  side: 1 | 2,
): number | null {
  return (
    toNumber(match[`player${side}_match_points_override`]) ??
    toNumber(match[`player${side}_match_points`])
  );
}

/** Read sets won from matchSheetJson.setScore (5-pins/KO sets display). */
function readBracketSetsWon(
  match: Record<string, unknown>,
  side: 1 | 2,
): number | null {
  const sheet =
    match.matchSheetJson && typeof match.matchSheetJson === "object"
      ? (match.matchSheetJson as Record<string, unknown>)
      : null;
  const setScore =
    sheet?.setScore && typeof sheet.setScore === "object"
      ? (sheet.setScore as Record<string, unknown>)
      : null;
  if (!setScore) return null;
  return toNumber(setScore[side === 1 ? "player1" : "player2"]);
}

/** Read per-set points from matchSheetJson.sets_result (5-pins KO modal). */
function readBracketSetsResult(
  match: Record<string, unknown>,
  side: 1 | 2,
): (number | null)[] | undefined {
  const sheet =
    match.matchSheetJson && typeof match.matchSheetJson === "object"
      ? (match.matchSheetJson as Record<string, unknown>)
      : null;
  const setsResult = Array.isArray(sheet?.sets_result)
    ? (sheet.sets_result as Record<string, unknown>[])
    : null;
  if (!setsResult) return undefined;
  const key = side === 1 ? "player1_points" : "player2_points";
  return setsResult.map((set) => toNumber(set[key]));
}

function formatTruncatedAverage(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "-";
  const truncated = Math.trunc(value * 1000) / 1000;
  return truncated.toFixed(3);
}

/** 5-Pins KO match modal — shows per-set scores, P+/P-, set/match points. */
function FivePinsBracketModal({
  match,
  roundLabel,
}: {
  match: BracketMatchView;
  roundLabel: string;
}) {
  const sideRows = [
    {
      name: match.player1 || "BYE",
      country: match.player1Country ?? null,
      sets: match.sets1 ?? [],
      winner: match.winner1,
      mp: match.matchPoints1,
    },
    {
      name: match.player2 || "BYE",
      country: match.player2Country ?? null,
      sets: match.sets2 ?? [],
      winner: match.winner2,
      mp: match.matchPoints2,
    },
  ];
  const setCount = Math.max(
    ...sideRows.map((row) => row.sets.length),
    1,
  );
  const gridCols = `minmax(160px,1.4fr) repeat(${3 + setCount + 3},minmax(48px,0.7fr))`;
  const gridClass = `grid items-center gap-3 text-xs`;
  const headers = [
    "Player",
    "Winner",
    "MP",
    ...Array.from({ length: setCount }, (_, i) => `Set ${i + 1}`),
    "P+",
    "P-",
    "P+/P-",
  ];
  return (
    <div>
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
        {roundLabel}
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <div
          className={`${gridClass} border-b border-gray-200 bg-gray-50 px-3 py-2 font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400`}
          style={{ gridTemplateColumns: gridCols }}
        >
          {headers.map((header) => (
            <div key={header} className="text-center first:text-left">
              {header}
            </div>
          ))}
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {sideRows.map((row, rowIndex) => {
            const pointsFor = row.sets.reduce<number>(
              (acc, set) => acc + (typeof set === "number" ? set : 0),
              0,
            );
            const pointsAgainst = sideRows[1 - rowIndex].sets.reduce<number>(
              (acc, set) => acc + (typeof set === "number" ? set : 0),
              0,
            );
            const ratio =
              pointsAgainst > 0 ? (pointsFor / pointsAgainst).toFixed(3) : "-";
            const flagSrc = getCountryFlagCdnUrl(row.country, 40);
            return (
              <div
                key={row.name}
                className={`${gridClass} px-3 py-3 text-gray-700 dark:text-gray-200`}
                style={{ gridTemplateColumns: gridCols }}
              >
                <div className="flex min-w-0 items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
                  {flagSrc ? (
                    <img
                      src={flagSrc}
                      alt={row.country || "flag"}
                      className="h-3.5 w-5 rounded-[2px] object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                  <span className="truncate">{row.name}</span>
                </div>
                <div className="text-center">
                  {row.winner ? "Yes" : "-"}
                </div>
                <div className="text-center">{row.mp ?? "-"}</div>
                {Array.from({ length: setCount }, (_, i) => (
                  <div key={i} className="text-center">
                    {typeof row.sets[i] === "number" ? row.sets[i] : "-"}
                  </div>
                ))}
                <div className="text-center">{pointsFor || "-"}</div>
                <div className="text-center">{pointsAgainst || "-"}</div>
                <div className="text-center">{ratio}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type RankingMetricTooltipMetric = "highRun" | "bestAverage";

type RankingMetricTooltipPlayer = {
  name: string;
  points: number | null;
  innings: number | null;
  average: number | null;
  highRun: number | null;
};

type RankingMetricTooltipData = {
  stageTitle: string | null;
  groupNumber: number | null;
  stageOrder: number | null;
  matchNumber: number | null;
  dateTime: string | null;
  focusMetric: RankingMetricTooltipMetric;
  focusSide: "top" | "bottom";
  top: RankingMetricTooltipPlayer;
  bottom: RankingMetricTooltipPlayer;
};

type RankingMetricMatchCandidate = {
  stageTitle: string | null;
  groupNumber: number | null;
  stageOrder: number | null;
  matchNumber: number | null;
  dateTime: string | null;
  top: StageMatchGroup["matches"][number]["top"];
  bottom: StageMatchGroup["matches"][number]["bottom"];
};

type BracketRankingStats = {
  phaseScore: number;
  totalMatchPoints: number;
  average: number | null;
  highRun: number | null;
  points: number | null;
  innings: number | null;
};

type BracketRankedResult<T> = T & {
  bracketPhaseScore: number | null;
  bracketAverage: number | null;
  bracketBestAverage: number | null;
  bracketHighRun: number | null;
  bracketPoints: number | null;
  bracketInnings: number | null;
  bracketMatchPoints: number | null;
  bracketPlayerName: string;
};

const normalizeRankingPlayerName = (value: string | null | undefined) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const rankingPlayerMatchKey = (player: {
  documentId?: string | null;
  id?: number | null;
  name?: string | null;
}) =>
  player.documentId ??
  (player.id !== null && player.id !== undefined
    ? `id:${player.id}`
    : normalizeRankingPlayerName(player.name));

const rankingResultMatchKey = (result: NormalizedStageResult) =>
  result.playerDocumentId ??
  (result.playerId !== null
    ? `id:${result.playerId}`
    : normalizeRankingPlayerName(result.playerName));

const rankingFinalResultMatchKey = (result: NormalizedFinalResult) =>
  result.playerDocumentId ??
  (result.playerId !== null
    ? `id:${result.playerId}`
    : normalizeRankingPlayerName(result.playerName));

function rankingPlayerMatchesCandidate(
  player: NormalizedGroupPlayer,
  target: {
    playerId: number | null;
    playerDocumentId: string | null;
    playerName: string;
  },
) {
  if (
    target.playerDocumentId &&
    player.documentId &&
    target.playerDocumentId === player.documentId
  ) {
    return true;
  }
  if (
    target.playerId !== null &&
    player.id !== null &&
    target.playerId === player.id
  ) {
    return true;
  }
  return (
    normalizeRankingPlayerName(player.name || player.nativeName) ===
    normalizeRankingPlayerName(target.playerName)
  );
}

function getCandidatePlayerAverage(player: NormalizedGroupPlayer) {
  if (
    typeof player.points !== "number" ||
    typeof player.innings !== "number" ||
    player.innings <= 0
  ) {
    return null;
  }
  return Math.trunc((player.points / player.innings) * 1000) / 1000;
}

function buildMetricTooltipData(
  candidate: RankingMetricMatchCandidate,
  focusSide: "top" | "bottom",
  focusMetric: RankingMetricTooltipMetric,
): RankingMetricTooltipData {
  const toPlayer = (
    side: StageMatchGroup["matches"][number]["top"],
  ): RankingMetricTooltipPlayer => ({
    name: side.player.name || side.player.nativeName || "Unknown",
    points: side.player.points,
    innings: side.player.innings,
    average: getCandidatePlayerAverage(side.player),
    highRun: side.player.highRun,
  });

  return {
    stageTitle: candidate.stageTitle,
    groupNumber: candidate.groupNumber,
    stageOrder: candidate.stageOrder,
    matchNumber: candidate.matchNumber,
    dateTime: candidate.dateTime,
    focusMetric,
    focusSide,
    top: toPlayer(candidate.top),
    bottom: toPlayer(candidate.bottom),
  };
}

function findRankingMetricTooltipData(
  matches: RankingMetricMatchCandidate[],
  target: {
    playerId: number | null;
    playerDocumentId: string | null;
    playerName: string;
  },
  metric: RankingMetricTooltipMetric,
  metricValue: number | null,
): RankingMetricTooltipData | null {
  if (metricValue === null || Number.isNaN(metricValue)) return null;

  const candidates = matches
    .flatMap((match) => {
      const sides = [
        { side: "top" as const, entry: match.top },
        { side: "bottom" as const, entry: match.bottom },
      ];

      return sides
        .filter(({ entry }) =>
          rankingPlayerMatchesCandidate(entry.player, target),
        )
        .filter(({ entry }) => {
          if (metric === "highRun") {
            return (entry.player.highRun ?? null) === metricValue;
          }
          const avg = getCandidatePlayerAverage(entry.player);
          return (
            avg === metricValue &&
            entry.outcome !== "L"
          );
        })
        .map(({ side }) => buildMetricTooltipData(match, side, metric));
    })
    .sort((a, b) => {
      const stageOrderDiff = (b.stageOrder ?? -1) - (a.stageOrder ?? -1);
      if (stageOrderDiff !== 0) return stageOrderDiff;
      if (a.dateTime && b.dateTime && a.dateTime !== b.dateTime) {
        return b.dateTime.localeCompare(a.dateTime);
      }
      if (a.matchNumber !== null && b.matchNumber !== null) {
        return a.matchNumber - b.matchNumber;
      }
      return 0;
    });

  return candidates[0] ?? null;
}

function renderRankingMetricTooltipCard(
  tooltip: RankingMetricTooltipData,
  align: "center" | "right" = "center",
  groupLabelMode: GroupLabelMode = "numbers",
) {
  const renderPlayerPanel = (
    side: "top" | "bottom",
    player: RankingMetricTooltipPlayer,
  ) => {
    const highlightAvg =
      tooltip.focusMetric === "bestAverage" && tooltip.focusSide === side;
    const highlightHr =
      tooltip.focusMetric === "highRun" && tooltip.focusSide === side;
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
        <div className="text-center">
          <div className="text-3xl font-black leading-none text-white">
            {formatNumberValue(player.points)}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-slate-300">
            Points
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-slate-950/80 px-2 py-2">
            <div className="text-[10px] uppercase tracking-wide text-slate-300">
              Inn
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-200">
              {formatNumberValue(player.innings)}
            </div>
          </div>
          <div
            className={clsx(
              "rounded-lg px-2 py-2",
              highlightAvg
                ? "bg-orange-500/55 ring-1 ring-orange-300"
                : "bg-slate-950/80",
            )}
          >
            <div
              className={clsx(
                "text-[10px] uppercase tracking-wide",
                highlightAvg ? "text-white" : "text-slate-300",
              )}
            >
              AVG
            </div>
            <div
              className={clsx(
                "mt-1 text-sm font-semibold",
                highlightAvg ? "text-orange-100" : "text-slate-200",
              )}
            >
              {formatTruncatedAverage(player.average)}
            </div>
          </div>
          <div
            className={clsx(
              "rounded-lg px-2 py-2",
              highlightHr
                ? "bg-orange-500/55 ring-1 ring-orange-300"
                : "bg-slate-950/80",
            )}
          >
            <div
              className={clsx(
                "text-[10px] uppercase tracking-wide",
                highlightHr ? "text-white" : "text-slate-300",
              )}
            >
              H.R.
            </div>
            <div
              className={clsx(
                "mt-1 text-sm font-semibold",
                highlightHr ? "text-orange-100" : "text-slate-200",
              )}
            >
              {formatNumberValue(player.highRun)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const groupSubtitle =
    tooltip.groupNumber !== null
      ? formatGroupDisplayLabel(tooltip.groupNumber, groupLabelMode)
      : null;
  const stageSubtitle = tooltip.stageTitle;

  return (
    <div
      className={clsx(
        "pointer-events-none absolute top-full z-30 mt-2 hidden w-[24rem] rounded-xl border border-slate-700 bg-slate-950/95 p-3 text-xs text-white shadow-2xl group-hover/ranking-metric:block",
        align === "right"
          ? "right-0"
          : "left-1/2 -translate-x-1/2",
      )}
    >
      <div className="text-center text-sm font-semibold text-white">
        {tooltip.top.name} VS {tooltip.bottom.name}
      </div>
      {(stageSubtitle || groupSubtitle || tooltip.matchNumber !== null) && (
        <div className="mt-1 text-center text-[11px] text-slate-300">
          {stageSubtitle && (
            <span>
              <span className="font-semibold text-white/90">Stage:</span>{" "}
              {stageSubtitle}
            </span>
          )}
          {groupSubtitle && (
            <span>
              {stageSubtitle ? " | " : ""}
              <span className="font-semibold text-white/90">Group:</span>{" "}
              {groupSubtitle}
            </span>
          )}
          {tooltip.matchNumber !== null && (
            <span>
              {stageSubtitle || groupSubtitle ? " | " : ""}
              <span className="font-semibold text-white/90">Match:</span>{" "}
              {tooltip.matchNumber}
            </span>
          )}
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-3">
        {renderPlayerPanel("top", tooltip.top)}
        {renderPlayerPanel("bottom", tooltip.bottom)}
      </div>
    </div>
  );
}

function renderRankingMetricBadge(
  value: string,
  highlighted: boolean,
  tooltip?: RankingMetricTooltipData | null,
  tooltipAlign: "center" | "right" = "center",
  groupLabelMode: GroupLabelMode = "numbers",
) {
  if (!highlighted || value === "-") return value;

  const badge = (
    <span className="inline-flex min-w-[4.5rem] items-center justify-center rounded-full bg-orange-500 px-3 py-1 font-extrabold leading-none text-white">
      {value}
    </span>
  );

  if (!tooltip) {
    return badge;
  }

  return (
    <span className="group/ranking-metric relative inline-flex cursor-help">
      {badge}
      {renderRankingMetricTooltipCard(tooltip, tooltipAlign, groupLabelMode)}
    </span>
  );
}

function getSingleElimSeedOrder(size: number): number[] {
  const patterns: Record<number, number[]> = {
    2: [1, 2],
    4: [1, 4, 2, 3],
    8: [1, 8, 4, 5, 2, 7, 3, 6],
    16: [1, 16, 8, 9, 5, 12, 4, 13, 3, 14, 6, 11, 7, 10, 2, 15],
    32: [
      1, 32, 16, 17, 8, 25, 9, 24, 5, 28, 12, 21, 4, 29, 13, 20, 6, 27, 11,
      22, 3, 30, 14, 19, 7, 26, 10, 23, 15, 18, 2, 31,
    ],
    64: [
      1, 64, 32, 33, 16, 49, 17, 48, 8, 57, 25, 40, 9, 56, 24, 41, 4, 61, 29,
      36, 13, 52, 20, 45, 5, 60, 28, 37, 12, 53, 21, 44, 2, 63, 31, 34, 15,
      50, 18, 47, 7, 58, 26, 39, 10, 55, 23, 42, 3, 62, 30, 35, 14, 51, 19,
      46, 6, 59, 27, 38, 11, 54, 22, 43,
    ],
  };
  return patterns[size] ?? [];
}

function getBracketModalPlaceholder(params: {
  roundIndex: number;
  roundMatchIndex: number;
  side: 1 | 2;
  firstRoundMatchCount: number;
  globalMatchNumber?: number | null;
  sourceMatchNumber?: number | null;
}): string {
  const {
    roundIndex,
    roundMatchIndex,
    side,
    firstRoundMatchCount,
    globalMatchNumber,
    sourceMatchNumber,
  } = params;
  if (roundIndex === 0) {
    const seedOrder = getSingleElimSeedOrder(firstRoundMatchCount * 2);
    const seed = seedOrder[roundMatchIndex * 2 + (side === 1 ? 0 : 1)];
    return typeof seed === "number" ? `Qualifier ${seed}` : "Qualifier";
  }

  if (typeof sourceMatchNumber === "number") {
    return `Winner from Match ${sourceMatchNumber}`;
  }

  const currentRoundMatchCount = Math.max(
    1,
    Math.floor(firstRoundMatchCount / Math.pow(2, roundIndex)),
  );
  const previousRoundFirstGlobalMatch =
    typeof globalMatchNumber === "number"
      ? globalMatchNumber - currentRoundMatchCount * 2
      : roundMatchIndex * 2 + 1;
  const previousMatchOffset = roundMatchIndex * 2 + (side === 1 ? 0 : 1);
  const fallbackPreviousMatchNumber =
    previousRoundFirstGlobalMatch + previousMatchOffset;

  return `Winner from Match ${fallbackPreviousMatchNumber}`;
}

function getPreviewPlayerLabel(player: {
  name?: string | null;
  nativeName?: string | null;
}) {
  return player.name || player.nativeName || "Unknown";
}

function getGroupPreviewPlayers(
  group: StageMatchGroup,
  playerSeedByDocumentId?: Map<string, number>,
) {
  return Array.from(
    new Map(
      group.matches
        .flatMap((match) => [match.top.player, match.bottom.player])
        .filter(
          (player) =>
            Boolean(player.name || player.nativeName) &&
            !isDynamicPlaceholderPlayer(player),
        )
        .map((player) => [
          player.documentId || `${player.name}-${player.country || "xx"}`,
          player,
        ]),
    ).values(),
  ).sort((left, right) => {
    const leftSeed =
      left.documentId && playerSeedByDocumentId
        ? playerSeedByDocumentId.get(left.documentId) ?? null
        : null;
    const rightSeed =
      right.documentId && playerSeedByDocumentId
        ? playerSeedByDocumentId.get(right.documentId) ?? null
        : null;

    if (leftSeed !== null && rightSeed !== null && leftSeed !== rightSeed) {
      return leftSeed - rightSeed;
    }
    if (leftSeed !== null) return -1;
    if (rightSeed !== null) return 1;

    return getPreviewPlayerLabel(left).localeCompare(getPreviewPlayerLabel(right));
  });
}

type GroupDisplayPlayer = {
  label: string;
  player: StageMatchGroup["matches"][number]["top"]["player"] | null;
  placeholder: boolean;
};

function getGroupDisplayKey(
  player: StageMatchGroup["matches"][number]["top"]["player"] | null | undefined,
) {
  if (!player) return "";
  return player.documentId || `${player.name}-${player.country || "xx"}`;
}

function getGroupWinnerPlayer(
  match: StageMatchGroup["matches"][number] | undefined,
) {
  if (!match) return null;
  if (match.top.outcome === "W") return match.top.player;
  if (match.bottom.outcome === "W") return match.bottom.player;
  return null;
}

function getGroupLoserPlayer(
  match: StageMatchGroup["matches"][number] | undefined,
) {
  if (!match) return null;
  if (match.top.outcome === "L") return match.top.player;
  if (match.bottom.outcome === "L") return match.bottom.player;
  return null;
}

function buildGroupDisplayPlayer(
  player: StageMatchGroup["matches"][number]["top"]["player"] | null | undefined,
  fallbackLabel: string,
): GroupDisplayPlayer {
  if (player && (player.name || player.nativeName)) {
    return {
      label: player.name || player.nativeName || fallbackLabel,
      player,
      placeholder: false,
    };
  }
  return {
    label: fallbackLabel,
    player: null,
    placeholder: true,
  };
}

function resolveGroupMatchDisplay(
  group: StageMatchGroup,
  match: StageMatchGroup["matches"][number],
): { top: GroupDisplayPlayer; bottom: GroupDisplayPlayer } {
  const hasConcretePlayers =
    Boolean(match.top.player.name || match.top.player.nativeName) &&
    Boolean(match.bottom.player.name || match.bottom.player.nativeName);

  if (hasConcretePlayers) {
    return {
      top: buildGroupDisplayPlayer(match.top.player, "Unknown"),
      bottom: buildGroupDisplayPlayer(match.bottom.player, "Unknown"),
    };
  }

  const sorted = [...group.matches].sort((a, b) => {
    if (
      a.matchNumber !== null &&
      b.matchNumber !== null &&
      a.matchNumber !== b.matchNumber
    ) {
      return a.matchNumber - b.matchNumber;
    }
    if (a.matchNumber !== null) return -1;
    if (b.matchNumber !== null) return 1;
    return 0;
  });

  const matchIndex = sorted.findIndex((item) => item.key === match.key);
  if (matchIndex === -1) {
    return {
      top: buildGroupDisplayPlayer(match.top.player, "Unknown"),
      bottom: buildGroupDisplayPlayer(match.bottom.player, "Unknown"),
    };
  }

  if (sorted.length === 3) {
    const first = sorted[0];
    const firstKeys = new Set([
      getGroupDisplayKey(first.top.player),
      getGroupDisplayKey(first.bottom.player),
    ]);
    const slotOne =
      getGroupPreviewPlayers(group).find(
        (player) => !firstKeys.has(getGroupDisplayKey(player)),
      ) ?? null;

    if (matchIndex === 1) {
      return {
        top: buildGroupDisplayPlayer(
          getGroupLoserPlayer(first),
          "Loser Match 1",
        ),
        bottom: buildGroupDisplayPlayer(slotOne, "Seed 1"),
      };
    }

    if (matchIndex === 2) {
      return {
        top: buildGroupDisplayPlayer(
          getGroupWinnerPlayer(first),
          "Winner Match 1",
        ),
        bottom: buildGroupDisplayPlayer(slotOne, "Seed 1"),
      };
    }
  }

  if (sorted.length === 6) {
    const first = sorted[0];
    const second = sorted[1];
    const third = sorted[2];
    const fourth = sorted[3];

    if (matchIndex === 2) {
      return {
        top: buildGroupDisplayPlayer(
          getGroupWinnerPlayer(first),
          "Winner Match 1",
        ),
        bottom: buildGroupDisplayPlayer(
          getGroupWinnerPlayer(second),
          "Winner Match 2",
        ),
      };
    }

    if (matchIndex === 3) {
      return {
        top: buildGroupDisplayPlayer(
          getGroupLoserPlayer(first),
          "Loser Match 1",
        ),
        bottom: buildGroupDisplayPlayer(
          getGroupLoserPlayer(second),
          "Loser Match 2",
        ),
      };
    }

    if (matchIndex === 4) {
      return {
        top: buildGroupDisplayPlayer(
          getGroupWinnerPlayer(third),
          "Winner Match 3",
        ),
        bottom: buildGroupDisplayPlayer(
          getGroupLoserPlayer(fourth),
          "Loser Match 4",
        ),
      };
    }

    if (matchIndex === 5) {
      return {
        top: buildGroupDisplayPlayer(
          getGroupLoserPlayer(third),
          "Loser Match 3",
        ),
        bottom: buildGroupDisplayPlayer(
          getGroupWinnerPlayer(fourth),
          "Winner Match 4",
        ),
      };
    }
  }

  return {
    top: buildGroupDisplayPlayer(match.top.player, "Unknown"),
    bottom: buildGroupDisplayPlayer(match.bottom.player, "Unknown"),
  };
}

function getGroupKey(stage: NormalizedEventStage, group: StageMatchGroup) {
  return `${stage.documentId || stage.id}-${group.number ?? group.key}`;
}

function shouldSuppressDerivedBestAverage(params: {
  title: string | null | undefined;
  startDate: string | null | undefined;
}) {
  const year = params.startDate ? Number.parseInt(params.startDate.slice(0, 4), 10) : NaN;
  return (
    Number.isFinite(year) &&
    year >= 2013 &&
    year <= 2017 &&
    (params.title ?? "").toLowerCase().includes("world cup 3-cushion")
  );
}

function shouldPreferEnglishOnlyNames(params: {
  title: string | null | undefined;
  rulesetKey: string | null | undefined;
  tournamentRulesetKey: string | null | undefined;
}) {
  const haystack = [
    params.title,
    params.rulesetKey,
    params.tournamentRulesetKey,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase();

  return (
    /\b(umb|ceb|ubm)\b/.test(haystack) ||
    haystack.includes("world cup 3-cushion") ||
    haystack.includes("world cup three cushion") ||
    haystack.includes("confederation europeenne") ||
    haystack.includes("union mondiale")
  );
}

function resolveLivePlayerSide(params: {
  playerDocumentId: string | null | undefined;
  playerName: string | null | undefined;
  playerNativeName: string | null | undefined;
  session: EventLiveSession | null;
  normalizeLiveName: (value: string | null | undefined) => string;
}): "A" | "B" | null {
  const { playerDocumentId, playerName, playerNativeName, session, normalizeLiveName } =
    params;
  if (!session) return null;
  const playerDoc = typeof playerDocumentId === "string" ? playerDocumentId.trim() : "";
  if (playerDoc) {
    if (playerDoc === session.player1DocumentId) return "A";
    if (playerDoc === session.player2DocumentId) return "B";
  }

  const candidates = [playerName, playerNativeName]
    .map((value) => normalizeLiveName(value))
    .filter((value): value is string => value.length > 0);
  if (candidates.length === 0) return null;

  const playerAKeys = [
    session.state?.playerAName,
    session.player1Name,
  ]
    .map((value) => normalizeLiveName(value))
    .filter((value): value is string => value.length > 0);
  const playerBKeys = [
    session.state?.playerBName,
    session.player2Name,
  ]
    .map((value) => normalizeLiveName(value))
    .filter((value): value is string => value.length > 0);

  if (candidates.some((value) => playerAKeys.includes(value))) return "A";
  if (candidates.some((value) => playerBKeys.includes(value))) return "B";
  return null;
}

function compareOptionalNumbers(a: number | null, b: number | null) {
  if (a !== null && b !== null && a !== b) return a - b;
  if (a !== null) return -1;
  if (b !== null) return 1;
  return 0;
}

function buildGroupSlotPlaceholderLabel(
  role: unknown,
  matchNumber: unknown,
): string {
  const roleText =
    typeof role === "string" && role.trim().length > 0
      ? role.trim().toLowerCase()
      : "";
  const num = toNumber(matchNumber);
  if (!roleText) return num !== null ? `Match ${num}` : "TBD";
  const prefix = roleText === "loser" ? "Loser" : "Winner";
  return num !== null ? `${prefix} Match ${num}` : prefix;
}

function formatDateTimeForMatchCell(
  value: string | null,
  offsetMinutes?: number | null,
  timeZoneName?: string | null,
): string {
  if (!value) return "-";
  const shifted = formatDateTimeWithOffset(value, offsetMinutes, timeZoneName);
  if (shifted) return `${shifted.date}\n${shifted.time}`;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const dateLabel = parsed.toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeLabel = parsed.toLocaleTimeString("el-GR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${dateLabel}\n${timeLabel}`;
}

function formatDateTimeWithOffset(
  value: string | null,
  offsetMinutes: number | null | undefined,
  timeZoneName?: string | null,
): { date: string; time: string } | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  if (timeZoneName) {
    // DST-aware rendering: Intl resolves the zone offset per date, so matches
    // around a summer/winter clock change are displayed correctly on both sides.
    const parts = new Intl.DateTimeFormat("el-GR", {
      timeZone: timeZoneName,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(parsed);
    const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return {
      date: `${part("day")}/${part("month")}/${part("year")}`,
      time: `${part("hour")}:${part("minute")}`,
    };
  }
  if (offsetMinutes === null || offsetMinutes === undefined) return null;
  const shifted = new Date(parsed.getTime() + offsetMinutes * 60 * 1000);
  return {
    date: shifted.toLocaleDateString("el-GR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    }),
    time: shifted.toLocaleTimeString("el-GR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }),
  };
}

function hasMeaningfulStageResult(
  result: NormalizedStageResult,
): boolean {
  return (
    (typeof result.source === "string" &&
      result.source.includes("standings") &&
      result.finalPosition !== null) ||
    (result.points ?? 0) > 0 ||
    (result.innings ?? 0) > 0 ||
    (result.highRun ?? 0) > 0
  );
}

function hasMeaningfulFinalResult(
  result: NormalizedFinalResult,
): boolean {
  return (
    (result.matchPoints ?? 0) > 0 ||
    (result.caroms ?? result.points ?? 0) > 0 ||
    (result.innings ?? 0) > 0 ||
    (result.highRun ?? 0) > 0 ||
    (result.bestAverage ?? 0) > 0 ||
    result.rankingPoints !== null ||
    result.penalty !== null ||
    result.finalPoints !== null
  );
}

function getFinalResultAverageValue(result: NormalizedFinalResult): number | null {
  const points = result.caroms ?? result.points;
  if (
    typeof points !== "number" ||
    !Number.isFinite(points) ||
    typeof result.innings !== "number" ||
    !Number.isFinite(result.innings) ||
    result.innings <= 0
  ) {
    return null;
  }
  return points / result.innings;
}

function getStageResultAverageValue(result: NormalizedStageResult): number | null {
  if (
    typeof result.points !== "number" ||
    !Number.isFinite(result.points) ||
    typeof result.innings !== "number" ||
    !Number.isFinite(result.innings) ||
    result.innings <= 0
  ) {
    return null;
  }
  return result.points / result.innings;
}

function compareNullableNumbersDesc(a: number | null, b: number | null) {
  if (a !== null && b !== null && a !== b) return b - a;
  if (a !== null) return -1;
  if (b !== null) return 1;
  return 0;
}

function compareNullableNumbersAsc(a: number | null, b: number | null) {
  if (a !== null && b !== null && a !== b) return a - b;
  if (a !== null) return -1;
  if (b !== null) return 1;
  return 0;
}

function getBracketRoundRank(round: string | null, matchNumber: number | null) {
  const normalized = String(round ?? "").trim().toLowerCase();
  if (/\b(final|f)\b/.test(normalized)) return 6;
  if (/\b(semi|sf)\b/.test(normalized)) return 5;
  if (/\b(quarter|qf)\b/.test(normalized)) return 4;

  const roundSizeMatch = normalized.match(/r\s*(\d+)/);
  if (roundSizeMatch) {
    const size = Number(roundSizeMatch[1]);
    if (size <= 2) return 6;
    if (size <= 4) return 5;
    if (size <= 8) return 4;
    if (size <= 16) return 3;
    if (size <= 32) return 2;
    if (size <= 64) return 1;
  }

  return matchNumber !== null ? Math.max(0, matchNumber / 1000) : 0;
}

function getBracketEntryAverage(player: NormalizedGroupPlayer) {
  if (
    typeof player.points !== "number" ||
    !Number.isFinite(player.points) ||
    typeof player.innings !== "number" ||
    !Number.isFinite(player.innings) ||
    player.innings <= 0
  ) {
    return null;
  }

  return player.points / player.innings;
}

function compareBracketRankedResults<T>(
  a: BracketRankedResult<T>,
  b: BracketRankedResult<T>,
) {
  return (
    compareNullableNumbersDesc(a.bracketPhaseScore, b.bracketPhaseScore) ||
    compareNullableNumbersDesc(a.bracketAverage, b.bracketAverage) ||
    compareNullableNumbersDesc(a.bracketBestAverage, b.bracketBestAverage) ||
    compareNullableNumbersDesc(a.bracketHighRun, b.bracketHighRun) ||
    compareNullableNumbersDesc(a.bracketPoints, b.bracketPoints) ||
    compareNullableNumbersAsc(a.bracketInnings, b.bracketInnings) ||
    compareNullableNumbersDesc(a.bracketMatchPoints, b.bracketMatchPoints) ||
    a.bracketPlayerName.localeCompare(b.bracketPlayerName)
  );
}

const LONGONI_U21_2026_FINAL_ROUND_STAGE_ID = "lgbl18foiq4k54vwqn0706ol";
const LONGONI_U21_2026_PENDING_FINAL_ORDER = [
  "MORALES Marcos",
  "GARCIA Toni",
  "IBRAIMOV Amir",
  "ZOTOV Arturo",
  "DURIEZ Tangui",
  "MARTINEZ Bruno",
  "SVENSSON Mio",
  "BOLLANSEE Toon",
  "DEMIR Kaan",
  "VLOEDMANS Gilano",
  "VAN BUREN Jayden",
  "CEBEOGLU Gokalp",
  "KOZLUCA Engin Ali",
  "KORKMAZ Cinar",
  "PHILIPOOM Luca",
  "WILKOWSKI Joeri",
];
const LONGONI_U21_2026_FINAL_STANDINGS_ORDER = [
  ...LONGONI_U21_2026_PENDING_FINAL_ORDER,
  "TURLA Paolo",
  "LEGENDRE Charles",
  "SENGUL Cenk Bartu",
  "KARA Kuzey",
  "RUSSINO Mirko",
  "FIORE Lorenzo",
  "KARA Poyraz",
  "LOUBARDIAS Dimitrios",
  "PROFKA Konstantinos",
  "DEMIRIS Konstantinos",
  "VERHULST Thomas",
  "BOTIS Nikolaos",
];
const LONGONI_U21_2026_FINAL_STANDINGS_ROWS = [
  ["MORALES Marcos", "ES", 14, 215, 168, 8, 1.562],
  ["GARCIA Toni", "ES", 12, 205, 174, 10, 1.346],
  ["IBRAIMOV Amir", "DE", 10, 176, 112, 11, 2.272],
  ["ZOTOV Arturo", "ES", 10, 161, 174, 8, 1.19],
  ["DURIEZ Tangui", "FR", 8, 134, 142, 7, 1.086],
  ["MARTINEZ Bruno", "ES", 7, 139, 149, 7, 1.086],
  ["SVENSSON Mio", "SE", 6, 118, 147, 6, 0.972],
  ["BOLLANSEE Toon", "BE", 8, 144, 170, 8, 1.129],
  ["DEMIR Kaan", "TR", 4, 100, 120, 6, 0.892],
  ["VLOEDMANS Gilano", "NL", 4, 85, 123, 4, 0.735],
  ["VAN BUREN Jayden", "NL", 4, 95, 138, 6, 0.735],
  ["CEBEOGLU Gokalp", "TR", 4, 96, 140, 5, 0.892],
  ["KOZLUCA Engin ali", "TR", 3, 83, 127, 5, 0.892],
  ["KORKMAZ Cinar", "TR", 2, 73, 108, 7, 0.714],
  ["PHILIPOOM Luca", "NL", 4, 86, 125, 6, 0.961],
  ["WILKOWSKI Joeri", "NL", 4, 63, 98, 5, 0.714],
  ["TURLA' Paolo", "IT", 2, 57, 84, 3, 0.757],
  ["LEGENDRE Charles", "FR", 2, 60, 93, 6, 0.641],
  ["SENGUL Cenk bartu", "TR", 2, 54, 99, 6, 0.46],
  ["KARA Kuzey", "DE", 2, 47, 110, 4, 0.52],
  ["RUSSINO Mirko", "IT", 2, 43, 121, 3, 0.38],
  ["FIORE Lorenzo", "IT", 0, 58, 114, 4, null],
  ["KARA Poyraz", "DE", 0, 43, 92, 5, null],
  ["LOUBARDIAS Dimitrios", "GR", 0, 41, 112, 3, null],
  ["PROFKA Konstantinos", "GR", 0, 34, 95, 6, null],
  ["DEMIRIS Konstantinos", "GR", 0, 34, 100, 3, null],
  ["VERHULST Thomas", "BE", 0, 33, 99, 4, null],
  ["BOTIS Nikos", "GR", 0, 0, 0, 0, null],
] as const;

function getBestPositiveValue(values: Array<number | null>): number | null {
  const best = values.reduce<number | null>((currentBest, value) => {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      return currentBest;
    }
    if (currentBest === null || value > currentBest) {
      return value;
    }
    return currentBest;
  }, null);

  return best;
}

function normalizeEventGameType(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

function normalizeTimetableSlot(
  slot: unknown,
  fallbackId: string,
): NormalizedTimetableSlot {
  const normalized = normalizeEntity<StrapiEventTimetableSlot>(slot, fallbackId);
  const stage = normalized.stage
    ? normalizeEntity<{ title?: unknown }>(
        normalized.stage,
        `${normalized.id}-stage`,
      )
    : null;
  const match = normalized.match
    ? normalizeEntity<{
        number?: unknown;
        player1?: unknown;
        player2?: unknown;
      }>(normalized.match, `${normalized.id}-match`)
    : null;
  const player1 = match
    ? normalizeEntity<{ full_name?: unknown; full_name_en?: unknown }>(
        match.player1,
        `${match.id}-p1`,
      )
    : null;
  const player2 = match
    ? normalizeEntity<{ full_name?: unknown; full_name_en?: unknown }>(
        match.player2,
        `${match.id}-p2`,
      )
    : null;
  const player1Name =
    typeof player1?.full_name_en === "string" && player1.full_name_en.trim()
      ? player1.full_name_en
      : typeof player1?.full_name === "string"
        ? player1.full_name
        : normalized.metadata &&
            typeof normalized.metadata === "object" &&
            typeof (normalized.metadata as Record<string, unknown>).resolvedPlayer1Name === "string"
          ? ((normalized.metadata as Record<string, unknown>).resolvedPlayer1Name as string)
          : "";
  const player2Name =
    typeof player2?.full_name_en === "string" && player2.full_name_en.trim()
      ? player2.full_name_en
      : typeof player2?.full_name === "string"
        ? player2.full_name
        : normalized.metadata &&
            typeof normalized.metadata === "object" &&
            typeof (normalized.metadata as Record<string, unknown>).resolvedPlayer2Name === "string"
          ? ((normalized.metadata as Record<string, unknown>).resolvedPlayer2Name as string)
          : "";
  const player1Country =
    player1 && typeof (player1 as Record<string, unknown>).country === "string"
      ? ((player1 as Record<string, unknown>).country as string)
      : normalized.metadata &&
          typeof normalized.metadata === "object" &&
          typeof (normalized.metadata as Record<string, unknown>).resolvedPlayer1Country === "string"
        ? ((normalized.metadata as Record<string, unknown>).resolvedPlayer1Country as string)
      : null;
  const player2Country =
    player2 && typeof (player2 as Record<string, unknown>).country === "string"
      ? ((player2 as Record<string, unknown>).country as string)
      : normalized.metadata &&
          typeof normalized.metadata === "object" &&
          typeof (normalized.metadata as Record<string, unknown>).resolvedPlayer2Country === "string"
        ? ((normalized.metadata as Record<string, unknown>).resolvedPlayer2Country as string)
      : null;
  const groupNumber = toNumber(match?.number) ?? toNumber(
    normalized.metadata &&
      typeof normalized.metadata === "object" &&
      "groupNumber" in normalized.metadata
      ? (normalized.metadata as Record<string, unknown>).groupNumber
      : null,
  );
  const matchNumber = toNumber(
    normalized.metadata &&
      typeof normalized.metadata === "object" &&
      "matchNumber" in normalized.metadata
      ? (normalized.metadata as Record<string, unknown>).matchNumber
      : null,
  );
  const trainingPlayerName =
    normalized.metadata &&
    typeof normalized.metadata === "object" &&
    typeof (normalized.metadata as Record<string, unknown>).trainingPlayerName === "string"
      ? ((normalized.metadata as Record<string, unknown>).trainingPlayerName as string)
      : "";
  const trainingPlayerCountry =
    normalized.metadata &&
    typeof normalized.metadata === "object" &&
    typeof (normalized.metadata as Record<string, unknown>).trainingPlayerCountry === "string"
      ? ((normalized.metadata as Record<string, unknown>).trainingPlayerCountry as string)
      : null;
  const linkedMatchDocumentId =
    normalized.metadata &&
    typeof normalized.metadata === "object" &&
    typeof (normalized.metadata as Record<string, unknown>).linkedMatchDocumentId === "string"
      ? ((normalized.metadata as Record<string, unknown>).linkedMatchDocumentId as string)
      : null;

  return {
    id: normalized.id,
    documentId: normalized.documentId,
    slotType:
      typeof normalized.slot_type === "string" && normalized.slot_type.trim()
        ? normalized.slot_type
        : "match",
    title: typeof normalized.title === "string" ? normalized.title : "",
    subtitle: typeof normalized.subtitle === "string" ? normalized.subtitle : "",
    description:
      typeof normalized.description === "string" ? normalized.description : "",
    date: typeof normalized.date === "string" ? normalized.date : "",
    time: typeof normalized.time === "string" ? normalized.time : "",
    dateTime:
      typeof normalized.date_time === "string" ? normalized.date_time : null,
    tableLabel:
      typeof normalized.table_label === "string" ? normalized.table_label : "",
    tableOrder: toNumber(normalized.table_order),
    slotOrder: toNumber(normalized.slot_order),
    slotStatus:
      typeof normalized.slot_status === "string" && normalized.slot_status.trim()
        ? normalized.slot_status
        : "scheduled",
    isVisible: normalized.is_visible !== false,
    isPublished: normalized.is_published === true,
    source: typeof normalized.source === "string" ? normalized.source : "",
    metadata:
      normalized.metadata && typeof normalized.metadata === "object"
        ? (normalized.metadata as Record<string, unknown>)
        : null,
    stageTitle:
      typeof stage?.title === "string" && stage.title.trim()
        ? stage.title
        : null,
    stageDocumentId: stage?.documentId ?? null,
    groupNumber,
    matchNumber,
    matchLabel:
      player1Name || player2Name
        ? [player1Name, player2Name].filter(Boolean).join(" vs ")
        : matchNumber !== null
          ? `Match ${matchNumber}`
          : null,
    trainingPlayerName: trainingPlayerName || null,
    trainingPlayerCountry,
    matchPlayer1Name: player1Name || null,
    matchPlayer2Name: player2Name || null,
    matchPlayer1Country:
      player1Country,
    matchPlayer2Country:
      player2Country,
    matchDocumentId: match?.documentId ?? linkedMatchDocumentId,
  };
}

function StageRankingTable({
  stage,
  allStages = [],
  embedded,
  playerProfileHref,
  artistic = false,
  groupLabelMode = "numbers",
  suppressDerivedBestAverage = false,
  koRankingRound = "opening-final",
  eventRulesetKey = null,
  showNativePlayerNames = true,
  fivePins: fivePinsProp = false,
}: {
  stage: NormalizedEventStage;
  allStages?: NormalizedEventStage[];
  embedded: boolean;
  playerProfileHref: (playerId: string | number, playerName: string) => string;
  artistic?: boolean;
  groupLabelMode?: GroupLabelMode;
  suppressDerivedBestAverage?: boolean;
  koRankingRound?: KoRankingRound;
  eventRulesetKey?: string | null;
  showNativePlayerNames?: boolean;
  fivePins?: boolean;
}) {
  const stageMatchGroups = buildStageMatchGroups(stage.groups);
  const eventRankIsProvisional = eventStagesHaveIncompleteMatches(
    allStages.length > 0 ? allStages : [stage],
  );
  const stageMetricMatches = useMemo<RankingMetricMatchCandidate[]>(
    () =>
      stageMatchGroups.flatMap((group) =>
        group.matches.map((match) => ({
          stageTitle: stage.title,
          groupNumber: group.number,
          stageOrder: stage.order,
          matchNumber: match.matchNumber,
          dateTime: match.dateTime,
          top: match.top,
          bottom: match.bottom,
        })),
      ),
    [stage.title, stage.order, stageMatchGroups],
  );
  const bracketRankingStatsByPlayerKey = useMemo(() => {
    const statsByPlayer = new Map<string, BracketRankingStats>();
    if (!isBracketStage(stage)) return statsByPlayer;

    stageMatchGroups.forEach((group) => {
      group.matches.forEach((match) => {
        if (!hasPlayedStageMatch(match)) return;

        [match.top, match.bottom].forEach((entry) => {
          const key = rankingPlayerMatchKey(entry.player);
          if (!key) return;

          const roundRank = getBracketRoundRank(match.round, match.matchNumber);
          const outcomeBonus =
            entry.outcome === "W" ? 1 : entry.outcome === "D" ? 0.5 : 0;
          const phaseScore = roundRank * 2 + outcomeBonus;
          const existing = statsByPlayer.get(key);
          const next: BracketRankingStats = {
            phaseScore,
            totalMatchPoints:
              (existing?.totalMatchPoints ?? 0) + (entry.player.matchPoints ?? 0),
            average: getBracketEntryAverage(entry.player),
            highRun: entry.player.highRun,
            points: entry.player.points,
            innings: entry.player.innings,
          };

          if (!existing || phaseScore >= existing.phaseScore) {
            statsByPlayer.set(key, next);
          } else {
            statsByPlayer.set(key, {
              ...existing,
              totalMatchPoints: next.totalMatchPoints,
            });
          }
        });
      });
    });

    return statsByPlayer;
  }, [stage.stageType, stageMatchGroups]);
  const visibleResults = useMemo<NormalizedStageResult[]>(() => {
    if (
      !isBracketStage(stage) &&
      stageMatchGroups.length === 1 &&
      stage.results.filter(hasMeaningfulStageResult).length === 0
    ) {
      const computedResults = stageMatchGroups.flatMap((group) =>
        buildGroupStandings(group.matches, {
          artistic,
          suppressBestAverage: suppressDerivedBestAverage,
        }).map((standing) => ({
          id: `computed:${group.key}:${standing.key}`,
          documentId: `computed:${group.key}:${standing.key}`,
          playerId: standing.playerId,
          playerDocumentId: null,
          playerName: standing.playerName,
          playerNativeName: standing.playerNativeName,
          playerCountry: standing.playerCountry,
          matchPoints: standing.totalMatchPoints,
          points: standing.totalPoints,
          innings: standing.totalInnings,
          bestAverage: standing.bestAverage,
          highRun: standing.highRun,
          highRun2: standing.highRun2,
          setPoints: null,
          groupNumber: group.number,
          groupPosition: standing.place,
          finalPosition: null,
          qualified: null,
          qualificationType: null,
          source: "computed-group-standing",
        })),
      );

      if (computedResults.length > 0) {
        return computedResults;
      }
    }

    const countryByPlayerKey = buildStagePlayerCountryMap(stage);
    const isOpeningRoundFinalRanking =
      koRankingRound === "opening-final" || koRankingRound === "r16-final";
    const qualificationStageForOpeningFinalRanking =
      stage.documentId === LONGONI_U21_2026_FINAL_ROUND_STAGE_ID &&
      isOpeningRoundFinalRanking &&
      isBracketStage(stage)
        ? allStages
            .filter((candidate) => candidate.documentId !== stage.documentId)
            .filter((candidate) => !isBracketStage(candidate))
            .filter((candidate) => candidate.results.length > 0)
            .sort((a, b) => {
              if (a.order !== null && b.order !== null) return b.order - a.order;
              if (a.order !== null) return -1;
              if (b.order !== null) return 1;
              return b.id.localeCompare(a.id);
            })[0]
        : undefined;
    const qualificationResultByPlayerKeyForLongoniRanking = new Map(
      (qualificationStageForOpeningFinalRanking?.results ?? []).map((result) => [
        rankingResultMatchKey(result),
        result,
      ]),
    );
    const results = applyStageResultCountries(
      stage.results.filter(hasMeaningfulStageResult),
      countryByPlayerKey,
    );
    const hasStoredStageStandings = results.some(
      (result) =>
        typeof result.source === "string" &&
        result.source.includes("standings") &&
        result.finalPosition !== null,
    );
    const shouldMergeQualificationTotals =
      stage.documentId === LONGONI_U21_2026_FINAL_ROUND_STAGE_ID &&
      isOpeningRoundFinalRanking &&
      !hasStoredStageStandings;
    const displayResults = results.map((result) =>
      shouldMergeQualificationTotals
        ? mergeStageResultTotals(
            result,
            qualificationResultByPlayerKeyForLongoniRanking.get(
              rankingResultMatchKey(result),
            ),
          )
        : result,
    );
    if (hasStoredStageStandings) {
      return displayResults;
    }
    if (!isBracketStage(stage) || bracketRankingStatsByPlayerKey.size === 0) {
      return displayResults;
    }

    const longoniStageOrder =
      stage.documentId === LONGONI_U21_2026_FINAL_ROUND_STAGE_ID
        ? new Map(
            LONGONI_U21_2026_PENDING_FINAL_ORDER.map((name, index) => [
              normalizeRankingPlayerName(name),
              index,
            ]),
          )
        : null;

    const rankedResults = displayResults
      .map<BracketRankedResult<NormalizedStageResult>>((result) => {
        const key = rankingResultMatchKey(result);
        const rankingStats = key ? bracketRankingStatsByPlayerKey.get(key) : undefined;
        const matchPoints =
          rankingStats === undefined
            ? result.matchPoints
            : rankingStats.totalMatchPoints;

        return {
          ...result,
          matchPoints,
          finalPosition: null,
          bracketPhaseScore: rankingStats?.phaseScore ?? null,
          bracketAverage: getStageResultAverageValue(result),
          bracketBestAverage: result.bestAverage,
          bracketHighRun: result.highRun,
          bracketPoints: result.points,
          bracketInnings: result.innings,
          bracketMatchPoints: matchPoints,
          bracketPlayerName: result.playerName,
        };
      })
      .sort((a, b) => {
        const byPhase = compareNullableNumbersDesc(
          a.bracketPhaseScore,
          b.bracketPhaseScore,
        );
        if (byPhase !== 0) return byPhase;

        if (longoniStageOrder) {
          const aOrder = longoniStageOrder.get(
            normalizeRankingPlayerName(a.playerName),
          );
          const bOrder = longoniStageOrder.get(
            normalizeRankingPlayerName(b.playerName),
          );
          if (aOrder !== undefined && bOrder !== undefined && aOrder !== bOrder) {
            return aOrder - bOrder;
          }
          if (aOrder !== undefined) return -1;
          if (bOrder !== undefined) return 1;
        }
        return compareBracketRankedResults(a, b);
      });

    return rankedResults.map((rankedResult, index) => {
      const {
        bracketPhaseScore,
        bracketAverage,
        bracketBestAverage,
        bracketHighRun,
        bracketPoints,
        bracketInnings,
        bracketMatchPoints,
        bracketPlayerName,
        ...result
      } = rankedResult;
      const rankingStats = bracketRankingStatsByPlayerKey.get(rankingResultMatchKey(result));
      const displayedPosition =
        rankingStats?.phaseScore === 11
          ? null
          : rankingStats?.phaseScore === 10
            ? 3
            : index + 1;
      return { ...result, finalPosition: displayedPosition };
    });
  }, [
    artistic,
    bracketRankingStatsByPlayerKey,
    stage.results,
    stage.stageType,
    stageMatchGroups,
    suppressDerivedBestAverage,
    koRankingRound,
    eventRulesetKey,
  ]);
  const showStageGroupColumns = !isBracketStage(stage);
  const fivePins = isFivePinsRuleset(eventRulesetKey) || fivePinsProp;
  const showGroupColumn =
    showStageGroupColumns &&
    visibleResults.some((result) => result.groupNumber !== null);
  const showGroupPositionColumn =
    showStageGroupColumns &&
    visibleResults.some((result) => result.groupPosition !== null);
  const playerProgressByGroupKey = new Map<
    string,
    { played: number; total: number; complete: boolean }
  >();

  stageMatchGroups.forEach((group) => {
    if (group.number === null) return;
    const byPlayer = new Map<string, { played: number; total: number }>();

    group.matches.forEach((match) => {
      [match.top.player, match.bottom.player].forEach((player) => {
        const playerKey =
          player.documentId ??
          (player.id !== null ? `id:${player.id}` : player.name.trim());
        const existing = byPlayer.get(playerKey) ?? { played: 0, total: 0 };
        existing.total += 1;
        if (hasPlayedStageMatch(match)) {
          existing.played += 1;
        }
        byPlayer.set(playerKey, existing);
      });
    });

    byPlayer.forEach((progress, playerKey) => {
      playerProgressByGroupKey.set(`${group.number}::${playerKey}`, {
        played: progress.played,
        total: progress.total,
        complete: progress.total > 0 && progress.played >= progress.total,
      });
    });
  });

  const showProgressColumn =
    showGroupColumn &&
    Array.from(playerProgressByGroupKey.values()).some(
      (progress) => progress.total > 0 && progress.played < progress.total,
    );
  const showBestAverageColumn =
    !fivePins &&
    visibleResults.some((result) => result.bestAverage !== null);
  const showStageHighRun2Column =
    !artistic &&
    !fivePins &&
    visibleResults.some(
      (result) =>
        typeof result.highRun2 === "number" &&
        Number.isFinite(result.highRun2) &&
      result.highRun2 > 0,
    );
  const trailingTotalsColSpan =
    2 + (showStageHighRun2Column ? 1 : 0) + (showBestAverageColumn || artistic ? 1 : 0);
  const stageGeneralAverage = useMemo(() => {
    const totals = visibleResults.reduce(
      (acc, result) => {
        const points = result.points;
        const innings = result.innings;
        if (
          typeof points !== "number" ||
          !Number.isFinite(points) ||
          typeof innings !== "number" ||
          !Number.isFinite(innings) ||
          innings <= 0
        ) {
          return acc;
        }

        return {
          points: acc.points + points,
          innings: acc.innings + innings,
        };
      },
      { points: 0, innings: 0 },
    );

    if (totals.innings <= 0) return null;
    return totals.points / totals.innings;
  }, [visibleResults]);
  const stageTotals = useMemo(
    () =>
      visibleResults.reduce(
        (acc, result) => ({
          points: acc.points + (result.points ?? 0),
          innings: acc.innings + (result.innings ?? 0),
        }),
        { points: 0, innings: 0 },
      ),
    [visibleResults],
  );
  const completedStageGroups = useMemo(() => {
    const completed = new Set<number>();
    stageMatchGroups.forEach((group) => {
      if (
        group.number !== null &&
        group.matches.length > 0 &&
        group.matches.every(hasPlayedStageMatch)
      ) {
        completed.add(group.number);
      }
    });
    return completed;
  }, [stageMatchGroups]);
  const stageRankingHighlights = useMemo(
    () => ({
      average: getBestPositiveValue(
        visibleResults.map((result) => getStageResultAverageValue(result)),
      ),
      bestAverage: getBestPositiveValue(
        visibleResults.map((result) => result.bestAverage),
      ),
      highRun: getBestPositiveValue(
        visibleResults.map((result) => result.highRun),
      ),
    }),
    [visibleResults],
  );
  const stageMetricTooltipByResultId = useMemo(() => {
    const map = new Map<
      string,
      {
        highRun: RankingMetricTooltipData | null;
        bestAverage: RankingMetricTooltipData | null;
      }
    >();

    visibleResults.forEach((result) => {
      map.set(result.id, {
        highRun:
          result.highRun !== null &&
          stageRankingHighlights.highRun !== null &&
          result.highRun === stageRankingHighlights.highRun
            ? findRankingMetricTooltipData(
                stageMetricMatches,
                {
                  playerId: result.playerId,
                  playerDocumentId: result.playerDocumentId,
                  playerName: result.playerName,
                },
                "highRun",
                result.highRun,
              )
            : null,
        bestAverage:
          result.bestAverage !== null &&
          stageRankingHighlights.bestAverage !== null &&
          result.bestAverage === stageRankingHighlights.bestAverage
            ? findRankingMetricTooltipData(
                stageMetricMatches,
                {
                  playerId: result.playerId,
                  playerDocumentId: result.playerDocumentId,
                  playerName: result.playerName,
                },
                "bestAverage",
                result.bestAverage,
              )
            : null,
      });
    });

    return map;
  }, [stageMetricMatches, stageRankingHighlights.bestAverage, stageRankingHighlights.highRun, visibleResults]);

  if (visibleResults.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        No ranking published for this stage.
      </div>
    );
  }

  const groupCountForRankSlots = new Set(
    stageMatchGroups
      .map((group) => group.number)
      .filter((value): value is number => value !== null),
  ).size;
  const rankCountersByGroupPosition = new Map<number, number>();
  const displayRankByResultId = new Map<string, number>();
  visibleResults.forEach((result) => {
    if (
      isBracketStage(stage) ||
      result.groupPosition === null ||
      groupCountForRankSlots <= 0
    ) {
      return;
    }

    const rankWithinPosition =
      (rankCountersByGroupPosition.get(result.groupPosition) ?? 0) + 1;
    rankCountersByGroupPosition.set(result.groupPosition, rankWithinPosition);
    displayRankByResultId.set(
      result.id,
      (result.groupPosition - 1) * groupCountForRankSlots + rankWithinPosition,
    );
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead className="bg-blue-600 text-white">
            <tr className="bg-blue-700/95 text-[11px] uppercase tracking-wide text-blue-50">
              <th className="px-4 py-2" />
              <th className="px-4 py-2" />
              {showProgressColumn && <th className="px-4 py-2" />}
              {showGroupColumn && <th className="px-4 py-2" />}
              {showGroupPositionColumn && <th className="px-4 py-2" />}
              <th className="px-4 py-2" />
              <th className="px-4 py-2 text-center">
                <span className="block text-blue-100">
                  {fivePins ? "Total P+" : "Total"}
                </span>
                <span className="text-sm font-semibold text-white">
                  {formatNumberValue(stageTotals.points)}
                </span>
              </th>
              <th className="px-4 py-2 text-center">
                <span className="block text-blue-100">
                  {fivePins ? "Total P-" : "Total"}
                </span>
                <span className="text-sm font-semibold text-white">
                  {formatNumberValue(stageTotals.innings)}
                </span>
              </th>
              <th className="px-4 py-2 text-left normal-case" colSpan={trailingTotalsColSpan}>
                <span className="inline-flex translate-x-8 items-center gap-2 whitespace-nowrap text-sm">
                  <span className="font-medium text-blue-100">
                    {artistic ? "General %" : "General AVG"}
                  </span>
                  <span className="font-semibold text-white">
                    {stageGeneralAverage !== null
                      ? artistic
                        ? `${formatTruncatedAverage(stageGeneralAverage * 100)}%`
                        : formatTruncatedAverage(stageGeneralAverage)
                      : "-"}
                  </span>
                </span>
              </th>
            </tr>
            <tr>
              <th className="px-4 py-3 text-left font-semibold">#</th>
              <th className="px-4 py-3 text-left font-semibold">Player</th>
              {showProgressColumn && (
                <th className="px-4 py-3 text-center font-semibold">Progress</th>
              )}
              {showGroupColumn && (
                <th className="px-4 py-3 text-center font-semibold">Group</th>
              )}
              {showGroupPositionColumn && (
                <th className="px-4 py-3 text-center font-semibold">
                  Pos in group
                </th>
              )}
              <th className="px-4 py-3 text-center font-semibold">MP</th>
              <th className="px-4 py-3 text-center font-semibold">
                {fivePins ? "P+" : "Points"}
              </th>
              <th className="px-4 py-3 text-center font-semibold">
                {fivePins ? "P-" : artistic ? "Possible points" : "Innings"}
              </th>
              <th className="px-4 py-3 text-center font-semibold">
                {fivePins ? "P+/P-" : artistic ? "%" : "AVG"}
              </th>
              {fivePins ? (
                <th className="px-4 py-3 text-center font-semibold">
                  Set Points
                </th>
              ) : (
                <th className="px-4 py-3 text-center font-semibold">
                  {artistic ? "Best run" : "H.R."}
                </th>
              )}
              {showStageHighRun2Column && (
                <th className="px-4 py-3 text-center font-semibold">
                  H.R.2
                </th>
              )}
              {showBestAverageColumn && (
                <th className="px-4 py-3 text-center font-semibold">
                  Best AVG
                </th>
              )}
              {artistic && (
                <th className="px-4 py-3 text-center font-semibold">
                  Best game
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {visibleResults.map((result, index) => {
            const stageAverageValue = getStageResultAverageValue(result);
            const highlightAverage =
              !artistic &&
              stageRankingHighlights.average !== null &&
              stageAverageValue !== null &&
              stageAverageValue === stageRankingHighlights.average;
            const highlightBestAverage =
              !artistic &&
              stageRankingHighlights.bestAverage !== null &&
              result.bestAverage !== null &&
              result.bestAverage === stageRankingHighlights.bestAverage;
            const highlightHighRun =
              !artistic &&
              stageRankingHighlights.highRun !== null &&
              result.highRun !== null &&
              result.highRun === stageRankingHighlights.highRun;
            const averageDisplay = formatAverage(result.points, result.innings);
            const highRunDisplay = formatNumberValue(result.highRun);
            const bestAverageDisplay =
              result.bestAverage !== null
                ? formatTruncatedAverage(result.bestAverage)
                : "-";
            const metricTooltip = stageMetricTooltipByResultId.get(result.id);
            const slottedDisplayRank = displayRankByResultId.get(result.id);
            const displayRank = isBracketStage(stage)
              ? result.finalPosition
              : eventRankIsProvisional
                ? slottedDisplayRank ?? index + 1
                : result.finalPosition ?? slottedDisplayRank ?? index + 1;
            const resultGroupComplete =
              result.groupNumber !== null
                ? completedStageGroups.has(result.groupNumber)
                : stageMatchGroups.length > 0 &&
                  stageMatchGroups.every(
                    (group) =>
                      group.matches.length > 0 &&
                      group.matches.every(hasPlayedStageMatch),
                  );
            const qualifierTone =
              resultGroupComplete && result.qualified === true
                ? result.qualificationType === "best_runner_up" ||
                  result.qualificationType === "group_2nd" ||
                  result.qualificationType === "best_third_place"
                  ? "runnerUp"
                  : "winner"
                : null;

            return (
              <tr
                key={result.id}
                className={clsx(
                  "border-t border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-100",
                  qualifierTone === "winner" &&
                    "bg-emerald-50 dark:bg-emerald-950/35",
                  qualifierTone === "runnerUp" &&
                    "bg-[#FFE8E5] text-gray-900 dark:bg-[#FFE8E5]/80 dark:text-gray-950",
                  qualifierTone === null && "bg-white dark:bg-gray-900",
                )}
              >
                <td className="px-4 py-3 font-semibold">
                  {formatNumberValue(displayRank)}
                </td>
                <td className="px-4 py-3 font-medium">
                  {result.playerId ? (
                    <Link
                      href={playerProfileHref(result.playerId, result.playerName)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                    >
                      <PlayerNameWithFlag
                        name={result.playerName || "Unknown"}
                        nativeName={result.playerNativeName}
                        country={result.playerCountry}
                        showNativeName={showNativePlayerNames}
                      />
                    </Link>
                  ) : (
                    <PlayerNameWithFlag
                      name={result.playerName || "Unknown"}
                      nativeName={result.playerNativeName}
                      country={result.playerCountry}
                      showNativeName={showNativePlayerNames}
                    />
                  )}
                </td>
                {showProgressColumn && (
                  <td className="px-4 py-3 text-center">
                    {(() => {
                      const playerKey =
                        result.playerDocumentId ??
                        (result.playerId !== null
                          ? `id:${result.playerId}`
                          : result.playerName.trim());
                      const progressKey =
                        result.groupNumber !== null
                          ? `${result.groupNumber}::${playerKey}`
                          : null;
                      const progress =
                        progressKey !== null
                          ? playerProgressByGroupKey.get(progressKey)
                          : null;

                      return progress ? (
                        <span
                          className={clsx(
                            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                            progress.complete
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
                          )}
                        >
                          {`${progress.played}/${progress.total}`}
                        </span>
                      ) : (
                        "-"
                      );
                    })()}
                  </td>
                )}
                {showGroupColumn && (
                  <td className="px-4 py-3 text-center">
                    {formatNumberValue(result.groupNumber)}
                  </td>
                )}
                {showGroupPositionColumn && (
                  <td className="px-4 py-3 text-center">
                    {formatNumberValue(result.groupPosition)}
                  </td>
                )}
                <td className="px-4 py-3 text-center">
                  {formatNumberValue(result.matchPoints)}
                </td>
                <td className="px-4 py-3 text-center">
                  {formatNumberValue(result.points)}
                </td>
                <td className="px-4 py-3 text-center">
                  {formatNumberValue(result.innings)}
                </td>
                <td
                  className="px-4 py-3 text-center"
                >
                  {renderRankingMetricBadge(averageDisplay, highlightAverage)}
                </td>
                <td
                  className="px-4 py-3 text-center"
                >
                  {fivePins ? (
                    formatNumberValue(result.setPoints)
                  ) : (
                    renderRankingMetricBadge(
                      highRunDisplay,
                      highlightHighRun,
                      metricTooltip?.highRun ?? null,
                      "center",
                      groupLabelMode,
                    )
                  )}
                </td>
                {showStageHighRun2Column && (
                  <td className="px-4 py-3 text-center">
                    {formatNumberValue(result.highRun2)}
                  </td>
                )}
                {showBestAverageColumn && (
                  <td className="px-4 py-3 text-center">
                    {renderRankingMetricBadge(
                      bestAverageDisplay,
                      highlightBestAverage,
                      metricTooltip?.bestAverage ?? null,
                      "right",
                      groupLabelMode,
                    )}
                  </td>
                )}
                {artistic && (
                  <td className="px-4 py-3 text-center">
                    {result.bestAverage !== null
                      ? formatTruncatedAverage(result.bestAverage)
                      : "-"}
                  </td>
                )}
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getStageResultIdentity(result: NormalizedStageResult) {
  if (result.playerDocumentId) return `doc:${result.playerDocumentId}`;
  if (result.playerId !== null) return `id:${result.playerId}`;
  return `name:${(result.playerName || "").trim().toLowerCase()}`;
}

function buildStagePlayerCountryMap(stage: NormalizedEventStage) {
  const map = new Map<string, string>();
  const addPlayer = (player: NormalizedGroupPlayer) => {
    if (!player.country) return;
    if (player.documentId) map.set(`doc:${player.documentId}`, player.country);
    if (player.id !== null) map.set(`id:${player.id}`, player.country);
    const nameKey = normalizeRankingPlayerName(player.name);
    if (nameKey) map.set(`name:${nameKey}`, player.country);
  };

  stage.groups.forEach((match) => {
    addPlayer(match.player1);
    addPlayer(match.player2);
  });

  return map;
}

function applyStageResultCountries(
  results: NormalizedStageResult[],
  countryByPlayerKey: Map<string, string>,
) {
  return results.map((result) => {
    if (result.playerCountry) return result;
    const country =
      (result.playerDocumentId
        ? countryByPlayerKey.get(`doc:${result.playerDocumentId}`)
        : undefined) ??
      (result.playerId !== null
        ? countryByPlayerKey.get(`id:${result.playerId}`)
        : undefined) ??
      countryByPlayerKey.get(`name:${normalizeRankingPlayerName(result.playerName)}`);
    return country ? { ...result, playerCountry: country } : result;
  });
}

function mergeStageResultTotals(
  result: NormalizedStageResult,
  previous: NormalizedStageResult | undefined,
): NormalizedStageResult {
  if (!previous) return result;
  return {
    ...result,
    matchPoints: (result.matchPoints ?? 0) + (previous.matchPoints ?? 0),
    points: (result.points ?? 0) + (previous.points ?? 0),
    innings: (result.innings ?? 0) + (previous.innings ?? 0),
    bestAverage:
      result.bestAverage !== null && previous.bestAverage !== null
        ? Math.max(result.bestAverage, previous.bestAverage)
        : result.bestAverage ?? previous.bestAverage,
    highRun:
      result.highRun !== null && previous.highRun !== null
        ? Math.max(result.highRun, previous.highRun)
        : result.highRun ?? previous.highRun,
  };
}

function mergeFinalResultTotals(
  result: NormalizedFinalResult,
  previous: NormalizedStageResult | undefined,
): NormalizedFinalResult {
  if (!previous) return result;
  const resultCaroms = result.caroms ?? result.points ?? 0;
  const previousPoints = previous.points ?? 0;
  return {
    ...result,
    matchPoints: (result.matchPoints ?? 0) + (previous.matchPoints ?? 0),
    caroms: resultCaroms + previousPoints,
    points: (result.points ?? result.caroms ?? 0) + previousPoints,
    innings: (result.innings ?? 0) + (previous.innings ?? 0),
    bestAverage:
      result.bestAverage !== null && previous.bestAverage !== null
        ? Math.max(result.bestAverage, previous.bestAverage)
        : result.bestAverage ?? previous.bestAverage,
    highRun:
      result.highRun !== null && previous.highRun !== null
        ? Math.max(result.highRun, previous.highRun)
        : result.highRun ?? previous.highRun,
  };
}

function stageResultToFinalResult(
  result: NormalizedStageResult,
  fallbackId: string,
): NormalizedFinalResult {
  return {
    id: fallbackId,
    documentId: result.documentId,
    position: result.finalPosition,
    playerId: result.playerId,
    playerDocumentId: result.playerDocumentId,
    playerName: result.playerName,
    playerCountry: result.playerCountry,
    matchPoints: result.matchPoints,
    bestAverage: result.bestAverage,
    bestGame: null,
    caroms: result.points,
    points: result.points,
    innings: result.innings,
    highRun: result.highRun,
    highRun2: null,
    rankingPoints: null,
    penalty: null,
    finalPoints: null,
  };
}

function applyFinalResultCountries(
  results: NormalizedFinalResult[],
  countryByPlayerKey: Map<string, string>,
) {
  return results.map((result) => {
    if (result.playerCountry) return result;
    const country =
      (result.playerDocumentId
        ? countryByPlayerKey.get(`doc:${result.playerDocumentId}`)
        : undefined) ??
      (result.playerId !== null
        ? countryByPlayerKey.get(`id:${result.playerId}`)
        : undefined) ??
      countryByPlayerKey.get(`name:${normalizeRankingPlayerName(result.playerName)}`);
    return country ? { ...result, playerCountry: country } : result;
  });
}

function compareStageResults(
  a: NormalizedStageResult,
  b: NormalizedStageResult,
) {
  if (a.finalPosition !== null && b.finalPosition !== null && a.finalPosition !== b.finalPosition) {
    return a.finalPosition - b.finalPosition;
  }
  if (a.finalPosition !== null) return -1;
  if (b.finalPosition !== null) return 1;
  if (a.groupNumber !== null && b.groupNumber !== null && a.groupNumber !== b.groupNumber) {
    return a.groupNumber - b.groupNumber;
  }
  if (a.groupNumber !== null) return -1;
  if (b.groupNumber !== null) return 1;
  if (a.groupPosition !== null && b.groupPosition !== null && a.groupPosition !== b.groupPosition) {
    return a.groupPosition - b.groupPosition;
  }
  if (a.groupPosition !== null) return -1;
  if (b.groupPosition !== null) return 1;
  if (a.matchPoints !== null && b.matchPoints !== null && a.matchPoints !== b.matchPoints) {
    return b.matchPoints - a.matchPoints;
  }
  if (a.matchPoints !== null) return -1;
  if (b.matchPoints !== null) return 1;
  return a.id.localeCompare(b.id);
}

function dedupeStageResults(results: NormalizedStageResult[]) {
  const byPlayer = new Map<string, NormalizedStageResult>();
  for (const result of results) {
    const key = getStageResultIdentity(result);
    const existing = byPlayer.get(key);
    if (!existing || compareStageResults(result, existing) < 0) {
      byPlayer.set(key, result);
    }
  }
  return Array.from(byPlayer.values()).sort(compareStageResults);
}

const fetchEvent = async (eventId: string): Promise<EventApiResponse> => {
  const url = `/api/events/${eventId}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to fetch event");
  }
  return response.json();
};

export function TournamentEventsContent({
  eventIdOverride = null,
  initialEventData = null,
  eventDataOverride = null,
  disableAutoRefresh = false,
  preferredStageDocumentId = null,
  preferredGroupParam: preferredGroupParamOverride = null,
  preferredMatchParam: preferredMatchParamOverride = null,
  timezoneOffsetMinutes = null,
  timezoneName = null,
  timezoneOptions = [],
  onTimezoneChange,
  onStageSelect,
  showPublishedFinalResults = false,
  showTimetable = true,
  stageViewMode = "results",
  koRankingRound = "opening-final",
  onKoRankingRoundChange,
  embeddedOverride,
  showStandaloneTitle = true,
  showEventHeader = true,
  emptyStateMessage = "Select a tournament event from the list to view its stages.",
  liveSessionsOverride = null,
  onLiveMatchOpen,
}: TournamentEventsContentProps = {}) {
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [previewColumnCount, setPreviewColumnCount] = useState(7);
  const [eventData, setEventData] = useState<EventApiResponse | null>(
    eventDataOverride ?? initialEventData,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deBracketType, setDeBracketType] = useState<"winners" | "losers">(
    "winners",
  );
  const [deSelectedRound, setDeSelectedRound] = useState<string>("all");
  const [deExpandedMatchId, setDeExpandedMatchId] = useState<string | null>(
    null,
  );
  const [selectedBracketMatchId, setSelectedBracketMatchId] = useState<string | null>(
    null,
  );
  const [selectedMatchSheet, setSelectedMatchSheet] = useState<MatchSheetModalData | null>(null);
  const [liveSessions, setLiveSessions] = useState<EventLiveSession[]>([]);
  const [brMatchesByStage, setBrMatchesByStage] = useState<
    Record<string, unknown[]>
  >({});
  const [brLoadingByStage, setBrLoadingByStage] = useState<
    Record<string, boolean>
  >({});
  const groupLabelMode = resolveGroupLabelMode(
    (eventData?.data?.timetable_config as Record<string, unknown> | null | undefined) ??
      null,
  );
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [locationSearchParams, setLocationSearchParams] = useState<{
    group: string | null;
    match: string | null;
    player: string | null;
  }>({ group: null, match: null, player: null });
  const eventId = eventIdOverride ?? searchParams?.get("eventId") ?? null;
  const preferredGroupParam =
    preferredGroupParamOverride ??
    locationSearchParams.group ??
    searchParams?.get("group") ??
    null;
  const preferredMatchParam =
    preferredMatchParamOverride ??
    locationSearchParams.match ??
    searchParams?.get("match") ??
    null;
  const isEventDataControlled = disableAutoRefresh;
  const isLiveSessionsControlled = disableAutoRefresh || liveSessionsOverride !== null;
  const embedded = embeddedOverride ?? pathname?.startsWith("/embed/") ?? false;
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setLocationSearchParams({
      group: params.get("group"),
      match: params.get("match"),
      player: params.get("player"),
    });
  }, []);

  useEffect(() => {
    if (!locationSearchParams.player) return;
    setPlayerSearchQuery((current) => current || locationSearchParams.player || "");
  }, [locationSearchParams.player]);
  const tournamentContextSlug = eventData?.data?.title
    ? buildTournamentSlug(
        "",
        String(eventData.data.title),
        typeof eventData.data.season === "number"
          ? eventData.data.season
          : null,
      )
    : null;
  const playerProfileHref = (playerId: string | number, playerName: string) =>
    `${embedded ? "/embed" : ""}/players/${String(playerId)}-${playerName.trim().replace(/\s+/g, "-")}${
      tournamentContextSlug
        ? `?tournament=${encodeURIComponent(tournamentContextSlug)}`
        : ""
    }`;

  const playerSeedByDocumentId = useMemo(() => {
    const next = new Map<string, number>();
    toRelationArray(eventData?.data?.players).forEach((player) => {
      const normalized = normalizeEntity<{ seed?: unknown }>(player, "event-player");
      if (!normalized.documentId) return;
      const seed = toNumber(normalized.seed);
      if (seed === null) return;
      next.set(normalized.documentId, seed);
    });
    return next;
  }, [eventData]);

  const liveBadgeAnimation = `@keyframes btLivePulse {
        0%, 100% { opacity: 0.72; background-color: #ffd21c; box-shadow: inset 0 0 0 0 rgba(255,255,255,0.0); }
        50% { opacity: 1; background-color: #ffea72; box-shadow: inset 0 0 0 3px rgba(255,255,255,0.28); }
    }`;

  const fetchEventPayload = useCallback(async () => {
    if (!eventId) return null;
    return fetchEvent(eventId);
  }, [eventId]);

  useEffect(() => {
    if (!isEventDataControlled) return;
    setEventData(eventDataOverride);
    setIsLoading(false);
    setError(null);
  }, [eventDataOverride, isEventDataControlled]);

  // Fetch event data
  useEffect(() => {
    if (isEventDataControlled) {
      setIsLoading(false);
      setError(null);
      return;
    }

    if (initialEventData?.data) {
      setEventData((current) => current ?? initialEventData);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (!eventId) {
      setEventData(null);
      setError(null);
      return;
    }

    console.log("[TournamentEvents] Fetching event:", eventId);
    setIsLoading(true);
    setError(null);

    fetchEventPayload()
      .then((data) => {
        console.log("[TournamentEvents] Event data received:", data);
        setEventData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("[TournamentEvents] Error fetching event:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch event");
        setIsLoading(false);
      });
  }, [eventId, fetchEventPayload, initialEventData, isEventDataControlled]);

  useEffect(() => {
    if (!eventId || isEventDataControlled) return;

    let cancelled = false;

    const refreshEventData = async () => {
      try {
        const payload = await fetchEventPayload();
        if (cancelled) return;
        setEventData((current) => {
          const currentSerialized = JSON.stringify(current);
          const nextSerialized = JSON.stringify(payload);
          return currentSerialized === nextSerialized ? current : payload;
        });
      } catch {
        // Keep current UI state on transient polling failures.
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void refreshEventData();
    }, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [eventId, fetchEventPayload, isEventDataControlled]);

  useEffect(() => {
    if (isLiveSessionsControlled) {
      setLiveSessions([]);
      return;
    }

    if (!eventId) {
      setLiveSessions([]);
      return;
    }

    let cancelled = false;
    const timeoutIds: number[] = [];
    let intervalId: number | null = null;

    const fetchLiveSessions = async () => {
      try {
        const response = await fetch(
          `/api/tournaments/${encodeURIComponent(eventId)}/live-sessions`,
          {
            cache: "no-store",
          },
        );
        const payload = (await response.json().catch(() => ({ data: [] }))) as {
          data?: EventLiveSession[];
        };
        if (!response.ok) {
          throw new Error("Failed to fetch live sessions");
        }
        if (!cancelled) {
          setLiveSessions(Array.isArray(payload.data) ? payload.data : []);
        }
      } catch {
        if (!cancelled) {
          setLiveSessions([]);
        }
      }
    };

    void fetchLiveSessions();
    timeoutIds.push(window.setTimeout(() => {
      void fetchLiveSessions();
    }, 1500));
    timeoutIds.push(window.setTimeout(() => {
      void fetchLiveSessions();
    }, 4000));
    timeoutIds.push(window.setTimeout(() => {
      void fetchLiveSessions();
    }, 8000));
    intervalId = window.setInterval(() => {
      void fetchLiveSessions();
    }, 5000);

    return () => {
      cancelled = true;
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [eventId, isLiveSessionsControlled]);

  const eventStages = useMemo<NormalizedEventStage[]>(() => {
    if (!eventData?.data?.event_stages) return [];

    const stagesArray = toRelationArray(eventData.data.event_stages);

    return stagesArray
      .map((stage, index) => {
        const normalizedStage = normalizeEntity(stage, `stage-${index}`);

        const title =
          typeof normalizedStage.title === "string"
            ? normalizedStage.title.trim()
            : "";
        const startDate =
          typeof normalizedStage.start_date === "string"
            ? normalizedStage.start_date
            : null;
        const endDate =
          typeof normalizedStage.end_date === "string"
            ? normalizedStage.end_date
            : null;
        const order = toNumber(normalizedStage.order);
        const isFinal = Boolean(normalizedStage.is_final);
        const stageType =
          typeof normalizedStage.stage_type === "string"
            ? normalizedStage.stage_type.trim().toLowerCase()
            : null;

        const groupsRaw = toRelationArray(normalizedStage.groups);
        const resultsRaw = toRelationArray(normalizedStage.results);

        const groups = groupsRaw
          .map((group, groupIndex) =>
            normalizeGroup(group, `${normalizedStage.id}-group-${groupIndex}`),
          )
          .sort((a, b) => {
            if (a.number !== null && b.number !== null)
              return a.number - b.number;
            if (a.number !== null) return -1;
            if (b.number !== null) return 1;
            return a.id.localeCompare(b.id);
          });

        const results = dedupeStageResults(
          resultsRaw
          .map((result, resultIndex) =>
            normalizeResult(
              result,
              `${normalizedStage.id}-result-${resultIndex}`,
            ),
          )
        );

        return {
          id: normalizedStage.id,
          documentId: normalizedStage.documentId,
          title,
          startDate,
          endDate,
          order,
          isFinal,
          stageType,
          timetableConfig:
            normalizedStage.timetable_config &&
            typeof normalizedStage.timetable_config === "object"
              ? normalizedStage.timetable_config
              : null,
          groups,
          results,
        };
      })
      .sort((a, b) => {
        if (a.order !== null && b.order !== null) return a.order - b.order;
        if (a.order !== null) return -1;
        if (b.order !== null) return 1;
        return a.id.localeCompare(b.id);
      });
  }, [eventData]);
  const eventHasIncompleteMatches = useMemo(
    () => eventStagesHaveIncompleteMatches(eventStages),
    [eventStages],
  );
  const eventRulesetKey = useMemo(() => {
    const direct = eventData?.data?.ruleset_key;
    if (typeof direct === "string" && direct.trim()) return direct.trim();
    const tournament = eventData?.data?.tournament;
    const tournamentRuleset =
      tournament && typeof tournament === "object"
        ? (tournament as { ruleset_key?: unknown }).ruleset_key
        : null;
    return typeof tournamentRuleset === "string" && tournamentRuleset.trim()
      ? tournamentRuleset.trim()
      : null;
  }, [eventData]);
  const tournamentRulesetKey = useMemo(() => {
    const tournament = eventData?.data?.tournament;
    const tournamentRuleset =
      tournament && typeof tournament === "object"
        ? (tournament as { ruleset_key?: unknown }).ruleset_key
        : null;
    return typeof tournamentRuleset === "string" && tournamentRuleset.trim()
      ? tournamentRuleset.trim()
      : null;
  }, [eventData]);
  const showNativePlayerNames = useMemo(
    () =>
      !shouldPreferEnglishOnlyNames({
        title: eventData?.data?.title,
        rulesetKey: eventRulesetKey,
        tournamentRulesetKey,
      }),
    [eventData?.data?.title, eventRulesetKey, tournamentRulesetKey],
  );

  const stageMatchGroups = useMemo<Record<string, StageMatchGroup[]>>(
    () => {
      const normalizedSlots = eventData?.data?.timetable_slots
        ? toRelationArray(eventData.data.timetable_slots).map((slot, index) =>
            normalizeTimetableSlot(slot, `slot-${index}`),
          )
        : [];
      const autoScheduledMatchIdsByStage = new Map<string, Set<string>>();
      const slotByMatchDocumentId = new Map<
        string,
        { slotOrder: number | null; dateTime: string | null; matchNumber: number | null }
      >();

      normalizedSlots.forEach((slot) => {
        if (
          slot.slotType !== "match" ||
          !slot.stageDocumentId ||
          !slot.matchDocumentId
        ) {
          return;
        }
        if (slot.source.startsWith("auto-generated")) {
          const existing =
            autoScheduledMatchIdsByStage.get(slot.stageDocumentId) ??
            new Set<string>();
          existing.add(slot.matchDocumentId);
          autoScheduledMatchIdsByStage.set(slot.stageDocumentId, existing);
        }
        slotByMatchDocumentId.set(slot.matchDocumentId, {
          slotOrder: slot.slotOrder,
          dateTime: slot.dateTime,
          matchNumber: slot.matchNumber,
        });
      });

      return eventStages.reduce<Record<string, StageMatchGroup[]>>(
        (acc, stage) => {
          const visibleGroups =
            autoScheduledMatchIdsByStage.has(stage.documentId)
              ? stage.groups.filter((match) => {
                  const hasPlayed =
                    (match.player1.matchPoints ?? 0) > 0 ||
                    (match.player2.matchPoints ?? 0) > 0 ||
                    (match.player1.points ?? 0) > 0 ||
                    (match.player2.points ?? 0) > 0 ||
                    (match.player1.innings ?? 0) > 0 ||
                    (match.player2.innings ?? 0) > 0;
                  const allowed = match.documentId
                    ? autoScheduledMatchIdsByStage
                        .get(stage.documentId)
                        ?.has(match.documentId) ?? false
                    : false;
                  return hasPlayed || allowed;
                })
              : stage.groups;
          const baseGroups = buildStageMatchGroups(visibleGroups);
          acc[stage.id] = baseGroups.map((group) => ({
            ...group,
            matches: [...group.matches].sort((a, b) => {
              const slotA = a.matchDocumentId
                ? slotByMatchDocumentId.get(a.matchDocumentId)
                : undefined;
              const slotB = b.matchDocumentId
                ? slotByMatchDocumentId.get(b.matchDocumentId)
                : undefined;
              const bySlot = compareOptionalNumbers(
                slotA?.slotOrder ?? null,
                slotB?.slotOrder ?? null,
              );
              if (bySlot !== 0) return bySlot;
              const byMatch = compareOptionalNumbers(
                slotA?.matchNumber ?? a.matchNumber,
                slotB?.matchNumber ?? b.matchNumber,
              );
              if (byMatch !== 0) return byMatch;
              const dateA = slotA?.dateTime ?? a.dateTime;
              const dateB = slotB?.dateTime ?? b.dateTime;
              if (dateA && dateB && dateA !== dateB) {
                return dateA.localeCompare(dateB);
              }
              return 0;
            }).map((match) => {
              const slot = match.matchDocumentId
                ? slotByMatchDocumentId.get(match.matchDocumentId)
                : undefined;
              return slot?.dateTime
                ? { ...match, dateTime: slot.dateTime }
                : match;
            }),
          }));
          return acc;
        },
        {},
      );
    },
    [eventData, eventStages],
  );

  const groupMatchDisplayByDocumentId = useMemo(() => {
    const map = new Map<
      string,
      ReturnType<typeof resolveGroupMatchDisplay>
    >();
    eventStages.forEach((stage) => {
      (stageMatchGroups[stage.id] ?? []).forEach((group) => {
        group.matches.forEach((match) => {
          if (!match.matchDocumentId) return;
          map.set(match.matchDocumentId, resolveGroupMatchDisplay(group, match));
        });
      });
    });
    return map;
  }, [eventStages, stageMatchGroups]);

  const finalMetricMatches = useMemo<RankingMetricMatchCandidate[]>(
    () =>
      eventStages.flatMap((stage) =>
        (stageMatchGroups[stage.id] ?? []).flatMap((group) =>
          group.matches.map((match) => ({
            stageTitle: stage.title,
            groupNumber: group.number,
            stageOrder: stage.order,
            matchNumber: match.matchNumber,
            dateTime: match.dateTime,
            top: match.top,
            bottom: match.bottom,
          })),
        ),
      ),
    [eventStages, stageMatchGroups],
  );

  const finalStandingsBracketStatsByPlayerKey = useMemo(() => {
    const statsByPlayer = new Map<string, BracketRankingStats>();

    eventStages.forEach((stage) => {
      if (!isBracketStage(stage)) return;

      (stageMatchGroups[stage.id] ?? []).forEach((group) => {
        group.matches.forEach((match) => {
          if (!hasPlayedStageMatch(match)) return;

          [match.top, match.bottom].forEach((entry) => {
            const key = rankingPlayerMatchKey(entry.player);
            if (!key) return;

            const roundRank = getBracketRoundRank(match.round, match.matchNumber);
            const outcomeBonus =
              entry.outcome === "W" ? 1 : entry.outcome === "D" ? 0.5 : 0;
            const phaseScore = roundRank * 2 + outcomeBonus;
            const existing = statsByPlayer.get(key);
            const next: BracketRankingStats = {
              phaseScore,
              totalMatchPoints:
                (existing?.totalMatchPoints ?? 0) + (entry.player.matchPoints ?? 0),
              average: getBracketEntryAverage(entry.player),
              highRun: entry.player.highRun,
              points: entry.player.points,
              innings: entry.player.innings,
            };

            if (!existing || phaseScore >= existing.phaseScore) {
              statsByPlayer.set(key, next);
            } else {
              statsByPlayer.set(key, {
                ...existing,
                totalMatchPoints: next.totalMatchPoints,
              });
            }
          });
        });
      });
    });

    return statsByPlayer;
  }, [eventStages, stageMatchGroups]);

  const publishedFinalResults = useMemo<NormalizedFinalResult[]>(() => {
    if (!eventData?.data?.results_final) return [];

    const resultsArray = toRelationArray(eventData.data.results_final);
    const hasPublishedStoredFinalResults =
      eventData?.data?.final_standings_published === true &&
      resultsArray.length > 0;

    const normalizedResults = resultsArray
      .map((result, index) =>
        normalizeFinalResult(result, `final-result-${index}`),
      )
      .filter(hasMeaningfulFinalResult);
    const longoniFinalStage = eventStages.find(
      (stage) => stage.documentId === LONGONI_U21_2026_FINAL_ROUND_STAGE_ID,
    );
    const shouldBuildLongoniFinalStandings = Boolean(longoniFinalStage);
    const longoniCountryByPlayerKey = new Map<string, string>();
    if (shouldBuildLongoniFinalStandings) {
      eventStages.forEach((stage) => {
        buildStagePlayerCountryMap(stage).forEach((country, key) => {
          if (!longoniCountryByPlayerKey.has(key)) {
            longoniCountryByPlayerKey.set(key, country);
          }
        });
      });
    }
    const longoniFinalStageResults =
      shouldBuildLongoniFinalStandings && longoniFinalStage
        ? applyStageResultCountries(
            longoniFinalStage.results.filter(hasMeaningfulStageResult),
            buildStagePlayerCountryMap(longoniFinalStage),
          ).map((result, index) =>
            stageResultToFinalResult(result, `final-stage-${index}-${result.id}`),
          )
        : [];
    const baseFinalResults =
      shouldBuildLongoniFinalStandings && normalizedResults.length === 0
        ? longoniFinalStageResults
        : applyFinalResultCountries(normalizedResults, longoniCountryByPlayerKey);
    const longoniQualificationStage =
      shouldBuildLongoniFinalStandings
        ? eventStages
            .filter((stage) => stage.documentId !== LONGONI_U21_2026_FINAL_ROUND_STAGE_ID)
            .filter((stage) => !isBracketStage(stage))
            .filter((stage) => stage.results.length > 0)
            .sort((a, b) => {
              if (a.order !== null && b.order !== null) return b.order - a.order;
              if (a.order !== null) return -1;
              if (b.order !== null) return 1;
              return b.id.localeCompare(a.id);
            })[0]
        : undefined;
    const longoniQualificationSourceResults = longoniQualificationStage
      ? applyStageResultCountries(
          longoniQualificationStage.results.filter(hasMeaningfulStageResult),
          buildStagePlayerCountryMap(longoniQualificationStage),
        )
      : [];
    const longoniQualificationResultByPlayerKey = new Map(
      longoniQualificationSourceResults.map((result) => [
        rankingResultMatchKey(result),
        result,
      ]),
    );
    const longoniBaseFinalResultsWithQualificationTotals = baseFinalResults.map(
      (result) => {
        const qualificationResult = longoniQualificationResultByPlayerKey.get(
          rankingFinalResultMatchKey(result),
        );
        return mergeFinalResultTotals(result, qualificationResult);
      },
    );
    const longoniBasePlayerKeys = new Set(
      longoniBaseFinalResultsWithQualificationTotals.map(rankingFinalResultMatchKey),
    );
    const longoniQualificationResults =
      longoniQualificationSourceResults.length > 0
        ? longoniQualificationSourceResults
            .filter((result) => !longoniBasePlayerKeys.has(rankingResultMatchKey(result)))
            .sort(compareStageResults)
            .map((result, index) =>
              stageResultToFinalResult(
                {
                  ...result,
                  finalPosition:
                    longoniBaseFinalResultsWithQualificationTotals.length + index + 1,
                },
                `final-qualification-${index}-${result.id}`,
              ),
            )
        : [];

    if (hasPublishedStoredFinalResults) {
      return applyFinalResultCountries(normalizedResults, longoniCountryByPlayerKey)
        .sort((a, b) => {
          if (a.position !== null && b.position !== null) {
            return a.position - b.position;
          }
          if (a.position !== null) return -1;
          if (b.position !== null) return 1;
          return a.id.localeCompare(b.id);
        });
    }

    const finalResultsForRanking =
      shouldBuildLongoniFinalStandings
        ? [
            ...longoniBaseFinalResultsWithQualificationTotals,
            ...longoniQualificationResults,
          ]
        : normalizedResults;
    if (shouldBuildLongoniFinalStandings) {
      const existingByName = new Map(
        finalResultsForRanking.map((result) => [
          normalizeRankingPlayerName(result.playerName).replace(/['’]/g, ""),
          result,
        ]),
      );
      return LONGONI_U21_2026_FINAL_STANDINGS_ROWS.map((row, index) => {
        const [playerName, country, matchPoints, caroms, innings, highRun, bestAverage] =
          row;
        const existing = existingByName.get(
          normalizeRankingPlayerName(playerName).replace(/['’]/g, ""),
        );
        return {
          id: existing?.id ?? `longoni-final-standing-${index + 1}`,
          documentId:
            existing?.documentId ?? `longoni-final-standing-${index + 1}`,
          position: index + 1,
          playerId: existing?.playerId ?? null,
          playerDocumentId: existing?.playerDocumentId ?? null,
          playerName,
          playerCountry: country,
          matchPoints,
          bestAverage,
          bestGame: null,
          caroms,
          points: caroms,
          innings,
          highRun,
          highRun2: existing?.highRun2 ?? null,
          rankingPoints: null,
          penalty: null,
          finalPoints: null,
        };
      });
    }
    const longoniFinalOrder =
      shouldBuildLongoniFinalStandings
        ? new Map(
            LONGONI_U21_2026_PENDING_FINAL_ORDER.map((name, index) => [
              normalizeRankingPlayerName(name),
              index,
            ]),
          )
        : null;

    if (finalStandingsBracketStatsByPlayerKey.size > 0) {
      return finalResultsForRanking
        .map<BracketRankedResult<NormalizedFinalResult>>((result) => {
          const rankingStats = finalStandingsBracketStatsByPlayerKey.get(
            rankingFinalResultMatchKey(result),
          );
          const matchPoints =
            rankingStats === undefined
              ? result.matchPoints
              : rankingStats.totalMatchPoints;

          return {
            ...result,
            matchPoints,
            bracketPhaseScore:
              rankingStats?.phaseScore ??
              (result.position !== null ? -result.position : null),
            bracketAverage: getFinalResultAverageValue(result),
            bracketBestAverage: result.bestAverage,
            bracketHighRun: result.highRun,
            bracketPoints: result.caroms ?? result.points,
            bracketInnings: result.innings,
            bracketMatchPoints: matchPoints,
            bracketPlayerName: result.playerName,
          };
        })
        .sort((a, b) => {
          const byPhase = compareNullableNumbersDesc(
            a.bracketPhaseScore,
            b.bracketPhaseScore,
          );
          if (byPhase !== 0) return byPhase;

          if (longoniFinalOrder) {
            const aOrder = longoniFinalOrder.get(
              normalizeRankingPlayerName(a.playerName),
            );
            const bOrder = longoniFinalOrder.get(
              normalizeRankingPlayerName(b.playerName),
            );
            if (aOrder !== undefined && bOrder !== undefined && aOrder !== bOrder) {
              return aOrder - bOrder;
            }
            if (aOrder !== undefined) return -1;
            if (bOrder !== undefined) return 1;
          }
          return compareBracketRankedResults(a, b);
        })
        .map((rankedResult, index) => {
          const {
            bracketPhaseScore,
            bracketAverage,
            bracketBestAverage,
            bracketHighRun,
            bracketPoints,
            bracketInnings,
            bracketMatchPoints,
            bracketPlayerName,
            ...result
          } = rankedResult;
          const rankingStats = finalStandingsBracketStatsByPlayerKey.get(
            rankingFinalResultMatchKey(result),
          );
          if (!rankingStats) return result;
          if (rankingStats.phaseScore >= 12) {
            return { ...result, position: index + 1 };
          }
          if (rankingStats.phaseScore === 11) {
            return { ...result, position: null };
          }
          if (rankingStats.phaseScore === 10) {
            return { ...result, position: 3 };
          }
          return { ...result, position: index + 1 };
        });
    }

    return finalResultsForRanking
      .sort((a, b) => {
        if (a.position !== null && b.position !== null)
          return a.position - b.position;
        if (a.position !== null) return -1;
        if (b.position !== null) return 1;
        return a.id.localeCompare(b.id);
      });
  }, [eventData, eventStages, finalStandingsBracketStatsByPlayerKey]);
  const hideLongoniFinalStandingsUntilFinal =
    eventStages.some(
      (stage) => stage.documentId === LONGONI_U21_2026_FINAL_ROUND_STAGE_ID,
    ) &&
    !Array.from(finalStandingsBracketStatsByPlayerKey.values()).some(
      (stats) => stats.phaseScore >= 12,
    );
  const showVisiblePublishedFinalResults =
    showPublishedFinalResults &&
    (isBiathlonEvent(eventData)
      ? eventStages.length > 0
      : eventData?.data?.final_standings_published === true &&
        publishedFinalResults.length > 0 &&
        !eventHasIncompleteMatches &&
        !hideLongoniFinalStandingsUntilFinal);
  const eventGameType = useMemo(
    () => normalizeEventGameType(eventData?.data?.game_type ?? null),
    [eventData],
  );
  const isArtisticEvent = eventGameType === "artistic";
  const isFivePinsFinalEvent = isFivePinsEvent(eventData);

  const timetableSlots = useMemo<NormalizedTimetableSlot[]>(() => {
    if (!eventData?.data?.timetable_slots) return [];

    const visibleSlots = toRelationArray(eventData.data.timetable_slots)
      .map((slot, index) => normalizeTimetableSlot(slot, `slot-${index}`))
      .filter((slot) => slot.isVisible);

    const publicSlots = visibleSlots.some((slot) => slot.isPublished)
      ? visibleSlots.filter((slot) => slot.isPublished)
      : visibleSlots;

    return publicSlots
      .sort((a, b) => {
        const bySlot = compareOptionalNumbers(a.slotOrder, b.slotOrder);
        if (bySlot !== 0) return bySlot;

        const aDateTime = a.dateTime ? Date.parse(a.dateTime) : Number.NaN;
        const bDateTime = b.dateTime ? Date.parse(b.dateTime) : Number.NaN;
        if (
          !Number.isNaN(aDateTime) &&
          !Number.isNaN(bDateTime) &&
          aDateTime !== bDateTime
        ) {
          return aDateTime - bDateTime;
        }
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.time !== b.time) return a.time.localeCompare(b.time);
        if (a.tableOrder !== null && b.tableOrder !== null && a.tableOrder !== b.tableOrder) {
          return a.tableOrder - b.tableOrder;
        }
        if (a.tableOrder !== null) return -1;
        if (b.tableOrder !== null) return 1;
        return a.id.localeCompare(b.id);
      });
  }, [eventData]);

  const groupTimetableSlotsByStageGroup = useMemo(() => {
    const map = new Map<string, NormalizedTimetableSlot[]>();
    timetableSlots.forEach((slot) => {
      if (
        slot.slotType !== "match" ||
        !slot.stageDocumentId ||
        slot.groupNumber === null
      ) {
        return;
      }
      const key = `${slot.stageDocumentId}::${slot.groupNumber}`;
      const current = map.get(key) ?? [];
      current.push(slot);
      map.set(key, current);
    });
    map.forEach((value, key) => {
      map.set(
        key,
        [...value].sort((a, b) => {
          const bySlot = compareOptionalNumbers(a.slotOrder, b.slotOrder);
          if (bySlot !== 0) return bySlot;
          const byMatch = compareOptionalNumbers(a.matchNumber, b.matchNumber);
          if (byMatch !== 0) return byMatch;
          if (a.dateTime && b.dateTime && a.dateTime !== b.dateTime) {
            return a.dateTime.localeCompare(b.dateTime);
          }
          return a.documentId.localeCompare(b.documentId);
        }),
      );
    });
    return map;
  }, [timetableSlots]);

  const getEffectiveFinalPoints = useCallback(
    (result: NormalizedFinalResult) => {
      if (result.finalPoints === null) return null;
      const hasScoringSignal =
        result.rankingPoints !== null || result.penalty !== null;
      if (
        !hasScoringSignal &&
        result.caroms !== null &&
        result.finalPoints === result.caroms
      ) {
        return null;
      }
      return result.finalPoints;
    },
    [],
  );

  const showRankPointsColumn = useMemo(
    () => publishedFinalResults.some((result) => result.rankingPoints !== null),
    [publishedFinalResults],
  );
  const showPenaltyColumn = useMemo(
    () => publishedFinalResults.some((result) => result.penalty !== null),
    [publishedFinalResults],
  );
  const showFinalPointsColumn = useMemo(
    () =>
      publishedFinalResults.some(
        (result) => getEffectiveFinalPoints(result) !== null,
      ),
    [getEffectiveFinalPoints, publishedFinalResults],
  );
  const showFinalHighRun2Column = useMemo(
    () =>
      publishedFinalResults.some(
        (result) =>
          typeof result.highRun2 === "number" &&
          Number.isFinite(result.highRun2) &&
          result.highRun2 > 0,
      ),
    [publishedFinalResults],
  );
  const finalGeneralAverage = useMemo(() => {
    const totals = publishedFinalResults.reduce(
      (acc, result) => {
        const points = result.caroms ?? result.points;
        if (
          typeof points !== "number" ||
          !Number.isFinite(points) ||
          typeof result.innings !== "number" ||
          !Number.isFinite(result.innings) ||
          result.innings <= 0
        ) {
          return acc;
        }

        return {
          points: acc.points + points,
          innings: acc.innings + result.innings,
        };
      },
      { points: 0, innings: 0 },
    );

    return totals.innings > 0 ? totals.points / totals.innings : null;
  }, [publishedFinalResults]);
  const finalStandingsHighlights = useMemo(
    () => ({
      average: getBestPositiveValue(
        publishedFinalResults.map((result) => getFinalResultAverageValue(result)),
      ),
      bestAverage: getBestPositiveValue(
        publishedFinalResults.map((result) => result.bestAverage),
      ),
      highRun: getBestPositiveValue(
        publishedFinalResults.map((result) => result.highRun),
      ),
    }),
    [publishedFinalResults],
  );
  const finalMetricTooltipByResultId = useMemo(() => {
    const map = new Map<
      string,
      {
        highRun: RankingMetricTooltipData | null;
        bestAverage: RankingMetricTooltipData | null;
      }
    >();

    publishedFinalResults.forEach((result) => {
      map.set(result.id, {
        highRun:
          result.highRun !== null &&
          finalStandingsHighlights.highRun !== null &&
          result.highRun === finalStandingsHighlights.highRun
            ? findRankingMetricTooltipData(
                finalMetricMatches,
                {
                  playerId: result.playerId,
                  playerDocumentId: result.playerDocumentId,
                  playerName: result.playerName,
                },
                "highRun",
                result.highRun,
              )
            : null,
        bestAverage:
          result.bestAverage !== null &&
          finalStandingsHighlights.bestAverage !== null &&
          result.bestAverage === finalStandingsHighlights.bestAverage
            ? findRankingMetricTooltipData(
                finalMetricMatches,
                {
                  playerId: result.playerId,
                  playerDocumentId: result.playerDocumentId,
                  playerName: result.playerName,
                },
                "bestAverage",
                result.bestAverage,
              )
            : null,
      });
    });

    return map;
  }, [
    finalMetricMatches,
    finalStandingsHighlights.bestAverage,
    finalStandingsHighlights.highRun,
    publishedFinalResults,
  ]);

  // Keep active stage in sync with external tournament hero selection when present.
  useEffect(() => {
    if (eventStages.length === 0) return;

    if (preferredStageDocumentId) {
      const preferredStage =
        eventStages.find(
          (stage) => stage.documentId === preferredStageDocumentId,
        ) ?? null;
      if (preferredStage && preferredStage.id !== activeStageId) {
        setActiveStageId(preferredStage.id);
        return;
      }
    }

    if (!activeStageId) {
      setActiveStageId(eventStages[0].id);
    }
  }, [eventStages, activeStageId, preferredStageDocumentId]);

  useEffect(() => {
    if (!preferredGroupParam || !activeStageId) return;

    const activeStage =
      eventStages.find((stage) => stage.id === activeStageId) ?? null;
    if (!activeStage) return;

    const targetGroup = (stageMatchGroups[activeStage.id] ?? []).find((group) => {
      if (group.number !== null && String(group.number) === preferredGroupParam) {
        return true;
      }
      return String(group.key) === preferredGroupParam;
    });
    if (!targetGroup) return;

    const targetKey = getGroupKey(activeStage, targetGroup);
    setExpandedGroups((prev) => {
      if (prev.has(targetKey)) return prev;
      const next = new Set(prev);
      next.add(targetKey);
      return next;
    });
  }, [preferredGroupParam, activeStageId, eventStages, stageMatchGroups]);

  useEffect(() => {
    const updatePreviewColumnCount = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setPreviewColumnCount(1);
      } else if (width < 900) {
        setPreviewColumnCount(2);
      } else if (width < 1100) {
        setPreviewColumnCount(4);
      } else {
        setPreviewColumnCount(7);
      }
    };

    updatePreviewColumnCount();
    window.addEventListener("resize", updatePreviewColumnCount);
    return () =>
      window.removeEventListener("resize", updatePreviewColumnCount);
  }, []);

  const activeStage = useMemo(
    () => eventStages.find((stage) => stage.id === activeStageId) ?? null,
    [eventStages, activeStageId],
  );
  const activeBracketStageChain = useMemo<NormalizedEventStage[]>(() => {
    if (!activeStage || !isBracketStage(activeStage)) return [];

    const activeIndex = eventStages.findIndex(
      (stage) => stage.id === activeStage.id,
    );
    if (activeIndex < 0) return [activeStage];

    const chain: NormalizedEventStage[] = [];
    for (let index = activeIndex; index < eventStages.length; index += 1) {
      const stage = eventStages[index];
      if (!isBracketStage(stage)) break;
      chain.push(stage);
    }

    return chain.length > 0 ? chain : [activeStage];
  }, [activeStage, eventStages]);
  const effectiveLiveSessions = liveSessionsOverride ?? liveSessions;
  const normalizeLiveName = useCallback((value: string | null | undefined) => {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }, []);
  const normalizedPlayerSearchQuery = useMemo(
    () => normalizeLiveName(playerSearchQuery),
    [normalizeLiveName, playerSearchQuery],
  );
  const playerSearchTerms = useMemo(
    () =>
      normalizedPlayerSearchQuery
        .split(" ")
        .map((term) => term.trim())
        .filter((term) => term.length > 0),
    [normalizedPlayerSearchQuery],
  );
  const playerMatchesSearch = useCallback(
    (
      player: {
        name?: string | null;
        nativeName?: string | null;
        country?: string | null;
      },
      searchTerms: string[],
    ) => {
      if (searchTerms.length === 0) return false;

      const haystack = [player.name, player.nativeName, player.country]
        .map((value) => normalizeLiveName(value))
        .filter((value): value is string => value.length > 0)
        .join(" ");

      return searchTerms.every((term) => haystack.includes(term));
    },
    [normalizeLiveName],
  );
  const groupMatchesSearch = useCallback(
    (
      group: {
        key?: string | null;
        number?: number | null;
      },
      searchTerms: string[],
    ) => {
      if (searchTerms.length === 0) return false;

      const groupNumber =
        typeof group.number === "number" && Number.isFinite(group.number)
          ? String(group.number)
          : "";
      const haystack = [
        group.key,
        groupNumber,
        groupNumber ? `group ${groupNumber}` : "",
        groupNumber ? `g${groupNumber}` : "",
      ]
        .map((value) => normalizeLiveName(value))
        .filter((value): value is string => value.length > 0)
        .join(" ");

      return searchTerms.every((term) => haystack.includes(term));
    },
    [normalizeLiveName],
  );
  const filteredActiveStageGroups = useMemo(() => {
    if (!activeStage) return [];

    const groups = stageMatchGroups[activeStage.id] ?? [];
    if (!normalizedPlayerSearchQuery) return groups;
    if (playerSearchTerms.length === 0) return groups;

    return groups.filter((group) =>
      groupMatchesSearch(group, playerSearchTerms) ||
      group.matches.some((match) =>
        [match.top.player, match.bottom.player].some((player) => {
          return playerMatchesSearch(player, playerSearchTerms);
        }),
      ),
    );
  }, [
    activeStage,
    groupMatchesSearch,
    normalizedPlayerSearchQuery,
    playerMatchesSearch,
    playerSearchTerms,
    stageMatchGroups,
  ]);

  // Expected group size for the active stage = largest group in the stage.
  // CEB 5-pins: groups with fewer players than this award a walkover win to everyone.
  const expectedFivePinsGroupSize = useMemo(() => {
    const groups = activeStage ? (stageMatchGroups[activeStage.id] ?? []) : [];
    let maxSize = 0;
    for (const group of groups) {
      const players = new Set<string>();
      group.matches.forEach((match) => {
        const addPlayer = (player: NormalizedGroupPlayer) => {
          players.add(player.documentId || `${player.name}-${player.country || "xx"}`);
        };
        addPlayer(match.top.player);
        addPlayer(match.bottom.player);
      });
      if (players.size > maxSize) maxSize = players.size;
    }
    return maxSize;
  }, [activeStage, stageMatchGroups]);
  const timetableSlotMatchesSearch = useCallback(
    (slot: NormalizedTimetableSlot, searchTerms: string[]) => {
      if (searchTerms.length === 0) return true;

      const groupNumber =
        typeof slot.groupNumber === "number" && Number.isFinite(slot.groupNumber)
          ? String(slot.groupNumber)
          : "";
      const matchNumber =
        typeof slot.matchNumber === "number" && Number.isFinite(slot.matchNumber)
          ? String(slot.matchNumber)
          : "";

      const haystack = [
        slot.title,
        slot.subtitle,
        slot.description,
        slot.stageTitle,
        slot.customStageLabel,
        slot.matchLabel,
        slot.trainingPlayerName,
        slot.matchPlayer1Name,
        slot.matchPlayer1Country,
        slot.matchPlayer2Name,
        slot.matchPlayer2Country,
        groupNumber,
        groupNumber ? `group ${groupNumber}` : "",
        matchNumber,
        matchNumber ? `match ${matchNumber}` : "",
        slot.tableLabel,
      ]
        .map((value) => normalizeLiveName(value))
        .filter((value): value is string => value.length > 0)
        .join(" ");

      return searchTerms.every((term) => haystack.includes(term));
    },
    [normalizeLiveName],
  );
  const filteredTimetableSlots = useMemo(() => {
    if (!normalizedPlayerSearchQuery || playerSearchTerms.length === 0) {
      return timetableSlots;
    }
    return timetableSlots.filter((slot) =>
      timetableSlotMatchesSearch(slot, playerSearchTerms),
    );
  }, [
    normalizedPlayerSearchQuery,
    playerSearchTerms,
    timetableSlotMatchesSearch,
    timetableSlots,
  ]);
  const previewGridTemplateColumns = useMemo(() => {
    if (filteredActiveStageGroups.length === 0) return "";

    const maxPlayers = filteredActiveStageGroups.reduce((max, group) => {
      return Math.max(max, getGroupPreviewPlayers(group).length);
    }, 0);

    if (maxPlayers >= 5) {
      // Large groups: use up to previewColumnCount tracks (wraps to extra rows
      // when the group is bigger than the screen allows), but never more
      // columns than there are players, so wide screens don't leave empty
      // tracks at the end of the row.
      const columnCount = Math.max(1, Math.min(maxPlayers, previewColumnCount));
      return `repeat(${columnCount}, minmax(0, 1fr))`;
    }

    // Small groups (2-4 players): spread the player columns across the full
    // available width. Equal tracks (fixed lower bound, not content-based) keep
    // every row and the header perfectly aligned; 1fr distributes leftover
    // space evenly. Long names truncate only when a track gets very narrow.
    if (maxPlayers <= 0) return "";
    return `repeat(${maxPlayers}, minmax(min(100%, 13ch), 1fr))`;
  }, [filteredActiveStageGroups, previewColumnCount]);
  const previewHeaderCount = useMemo(() => {
    if (filteredActiveStageGroups.length === 0) return 0;
    // Header must cover the LARGEST group (same count the grid template uses),
    // otherwise a 6-player group next to 5-player groups loses its "Player 6"
    // header label. Smaller groups simply leave the trailing track empty.
    const maxPlayers = filteredActiveStageGroups.reduce((max, group) => {
      return Math.max(max, getGroupPreviewPlayers(group).length);
    }, 0);
    if (maxPlayers <= 0) return 0;
    return maxPlayers >= 5
      ? Math.min(maxPlayers, previewColumnCount)
      : maxPlayers;
  }, [filteredActiveStageGroups, previewColumnCount]);
  const liveSessionByMatchKey = useMemo(() => {
    const map = new Map<string, EventLiveSession>();
    effectiveLiveSessions.forEach((session) => {
      if (!session.eventStageId || session.groupNumber == null) return;
      const playerIds = [session.player1DocumentId, session.player2DocumentId]
        .filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        )
        .sort();
      if (playerIds.length !== 2) return;
      const key = `${session.eventStageId}::${session.groupNumber}::${playerIds.join("::")}`;
      if (!map.has(key)) {
        map.set(key, session);
      }
    });
    return map;
  }, [effectiveLiveSessions]);
  const liveSessionsByStageId = useMemo(() => {
    const map = new Map<string, EventLiveSession[]>();
    effectiveLiveSessions.forEach((session) => {
      if (!session.eventStageId) return;
      const existing = map.get(session.eventStageId) ?? [];
      existing.push(session);
      map.set(session.eventStageId, existing);
    });
    return map;
  }, [effectiveLiveSessions]);
  const liveSessionByPlayerNames = useMemo(() => {
    const map = new Map<string, EventLiveSession>();
    effectiveLiveSessions.forEach((session) => {
      const playerNames = [session.player1Name, session.player2Name]
        .map((value) => normalizeLiveName(value))
        .filter((value): value is string => value.length > 0)
        .sort();
      if (playerNames.length !== 2) return;
      const key = playerNames.join("::");
      if (!map.has(key)) {
        map.set(key, session);
      }
    });
    return map;
  }, [effectiveLiveSessions, normalizeLiveName]);

  const normalizeBracketPlayer = useCallback(
    (
      player: unknown,
      match?: Record<string, unknown> | null,
      side?: "player1" | "player2",
    ): { name: string; country: string | null } => {
      try {
        const localName =
          match && side
            ? (match[`${side}_local_name`] as unknown)
            : null;
        if (!player && !localName) return { name: "", country: null };
        const src =
          player &&
          typeof player === "object" &&
          "data" in (player as Record<string, unknown>)
            ? ((player as { data?: unknown }).data ?? player)
            : player;
        const attr =
          src &&
          typeof src === "object" &&
          "attributes" in (src as Record<string, unknown>)
            ? ((src as { attributes?: Record<string, unknown> }).attributes ??
              src)
            : src;

        if (!attr || typeof attr !== "object") {
          const fallbackName =
            typeof localName === "string" ? localName.trim() : "";
          const fallbackCountry =
            match && side
              ? (match[`${side}_local_country`] as unknown)
              : null;
          return {
            name: fallbackName,
            country:
              typeof fallbackCountry === "string" ? fallbackCountry : null,
          };
        }
        const fullNameEn = (attr as Record<string, unknown>).full_name_en;
        const fullName = (attr as Record<string, unknown>).full_name;
        const country = (attr as Record<string, unknown>).country;
        const relationName =
          typeof fullNameEn === "string" && fullNameEn.trim()
            ? fullNameEn.trim()
            : typeof fullName === "string"
              ? fullName
              : "";
        return {
          name:
            relationName ||
            (typeof localName === "string" ? localName.trim() : ""),
          country:
            typeof country === "string"
              ? country
              : match && side
                ? ((match[`${side}_local_country`] as string) ?? null)
                : null,
        };
      } catch {
        return { name: "", country: null };
      }
    },
    [],
  );

  const fetchBracketMatches = useCallback(async (
    stageDocumentId: string,
    options?: { silent?: boolean },
  ) => {
    if (!stageDocumentId) return;
    if (!options?.silent) {
      setBrLoadingByStage((prev) => ({ ...prev, [stageDocumentId]: true }));
    }
    try {
      const res = await fetch(
        `/api/event-stages/${encodeURIComponent(stageDocumentId)}/matches`,
        {
          cache: "no-store",
        },
      );
      const text = await res.text();
      if (!res.ok) throw new Error(text || "Failed to load bracket matches");
      const json = JSON.parse(text);
      const arr = Array.isArray(json?.matches)
        ? (json.matches as unknown[])
        : [];
      setBrMatchesByStage((prev) => ({ ...prev, [stageDocumentId]: arr }));
    } catch (e) {
      console.warn("[TournamentEvents] Failed to fetch bracket matches:", e);
      if (!options?.silent) {
        setBrMatchesByStage((prev) => ({ ...prev, [stageDocumentId]: [] }));
      }
    } finally {
      if (!options?.silent) {
        setBrLoadingByStage((prev) => ({ ...prev, [stageDocumentId]: false }));
      }
    }
  }, []);

  useEffect(() => {
    if (!activeStage || !isBracketStage(activeStage)) return;
    activeBracketStageChain.forEach((stage) => {
      if (brMatchesByStage[stage.documentId] || brLoadingByStage[stage.documentId]) {
        return;
      }
      void fetchBracketMatches(stage.documentId);
    });
  }, [
    activeBracketStageChain,
    activeStage,
    brLoadingByStage,
    brMatchesByStage,
    fetchBracketMatches,
  ]);

  useEffect(() => {
    if (!activeStage || !isBracketStage(activeStage)) return;
    const chain =
      activeBracketStageChain.length > 0 ? activeBracketStageChain : [activeStage];
    if (chain.length === 0) return;

    let cancelled = false;
    const refreshActiveBracketMatches = () => {
      if (cancelled || document.visibilityState === "hidden") return;
      chain.forEach((stage) => {
        void fetchBracketMatches(stage.documentId, { silent: true });
      });
    };

    const intervalId = window.setInterval(refreshActiveBracketMatches, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    activeBracketStageChain,
    activeStage,
    fetchBracketMatches,
  ]);

  const activeBracketMatchSource = useMemo(() => {
    if (!activeStage || !isBracketStage(activeStage)) return [];
    const chain =
      activeBracketStageChain.length > 0 ? activeBracketStageChain : [activeStage];
    return chain.flatMap((stage) => {
      const matches = brMatchesByStage[stage.documentId];
      return Array.isArray(matches) ? matches : [];
    });
  }, [activeBracketStageChain, activeStage, brMatchesByStage]);

  const activeStageUsesBracketView = useMemo(() => {
    if (!activeStage || !isBracketStage(activeStage)) {
      return false;
    }
    const chain =
      activeBracketStageChain.length > 0 ? activeBracketStageChain : [activeStage];
    if (
      chain.some(
        (stage) =>
          brLoadingByStage[stage.documentId] ||
          typeof brMatchesByStage[stage.documentId] === "undefined",
      )
    ) {
      return true;
    }

    return canRenderBracketPyramid(activeStage.stageType, activeBracketMatchSource) || isBracketStage(activeStage);
  }, [
    activeBracketMatchSource,
    activeBracketStageChain,
    activeStage,
    brLoadingByStage,
    brMatchesByStage,
  ]);

  useEffect(() => {
    if (!preferredMatchParam || !activeStage || !activeStageUsesBracketView) {
      return;
    }

    const targetMatch = activeBracketMatchSource.find((match) => {
      const record =
        match && typeof match === "object"
          ? (match as Record<string, unknown>)
          : null;
      if (!record) return false;
      if (
        typeof record.globalMatchNumber === "number" &&
        String(record.globalMatchNumber) === preferredMatchParam
      ) {
        return true;
      }
      if (
        typeof record.matchNumber === "number" &&
        String(record.matchNumber) === preferredMatchParam
      ) {
        return true;
      }
      return false;
    });

    if (!targetMatch) return;
    const targetId =
      targetMatch && typeof targetMatch === "object" && "id" in targetMatch
        ? String((targetMatch as { id: string }).id)
        : "";
    if (!targetId || targetId === selectedBracketMatchId) return;
    setSelectedBracketMatchId(targetId);
  }, [
    preferredMatchParam,
    activeStage,
    activeStageUsesBracketView,
    activeBracketMatchSource,
    selectedBracketMatchId,
  ]);

  const activeBracketRounds = useMemo<BracketRoundView[]>(() => {
    if (
      !activeStage ||
      !isBracketStage(activeStage) ||
      !activeStageUsesBracketView
    ) {
      return [];
    }
    const source = activeBracketMatchSource;
    if (source.length === 0) return [];

    const canonicalizeRound = (raw: string): string => {
      const upper = (raw || "").toUpperCase().trim();
      if (!upper) return "";
      if (upper === "WINNERS FINAL" || upper === "FINAL") return "F";
      if (upper === "R32" || upper.includes("ROUND OF 32")) return "R32";
      if (
        upper === "R16" ||
        upper.includes("ROUND OF 16") ||
        upper.includes("LAST 16")
      )
        return "R16";
      if (upper === "R8" || upper.includes("QUARTER")) return "QF";
      if (upper === "R4" || upper.includes("SEMI")) return "SF";
      if (upper === "R2" || upper === "F" || upper.includes("FINAL"))
        return "F";
      const winnersRound = upper.match(/^WINNERS R(\d+)$/);
      if (winnersRound) return `Round ${Number(winnersRound[1])}`;
      const roundNumber = upper.match(/^ROUND\s+(\d+)$/);
      if (roundNumber) return `Round ${Number(roundNumber[1])}`;
      const m = upper.match(/^R(\d+)$/);
      if (m) {
        const n = Number(m[1]);
        if (n === 8) return "QF";
        if (n === 4) return "SF";
        if (n === 2) return "F";
        return `R${n}`;
      }
      return upper;
    };

    const getRoundPriority = (label: string): number => {
      const upper = label.toUpperCase().trim();
      const fixedPriority: Record<string, number> = {
        R128: 0,
        R64: 1,
        R32: 2,
        R16: 3,
        QF: 4,
        SF: 5,
        F: 6,
      };
      if (upper in fixedPriority) return fixedPriority[upper];

      const numberedRound = upper.match(/^ROUND\s+(\d+)$/);
      if (numberedRound) return 100 + Number(numberedRound[1]);

      return 999;
    };

    const byRound = new Map<string, unknown[]>();
    source.forEach((m) => {
      const bracket =
        typeof (m as { bracket_type?: unknown }).bracket_type === "string"
          ? (m as { bracket_type: string }).bracket_type
          : "winners";
      if (bracket !== "winners") return;
      const rawRound =
        typeof (m as { round?: unknown }).round === "string"
          ? (m as { round: string }).round
          : "";
      const label = canonicalizeRound(rawRound);
      if (!label) return;
      const arr = byRound.get(label) ?? [];
      arr.push(m);
      byRound.set(label, arr);
    });

    const orderedLabels = Array.from(byRound.keys()).sort((a, b) => {
      const pa = getRoundPriority(a);
      const pb = getRoundPriority(b);
      if (pa !== pb) return pa - pb;
      return (byRound.get(b)?.length ?? 0) - (byRound.get(a)?.length ?? 0);
    });

    const initialEntry = Array.from(byRound.entries()).sort(
      (a, b) => b[1].length - a[1].length,
    )[0];
    const initialCount = initialEntry ? initialEntry[1].length : 0;
    const expectedByCount: Record<number, string[]> = {
      16: ["R32", "R16", "QF", "SF", "F"],
      8: ["R16", "QF", "SF", "F"],
      4: ["QF", "SF", "F"],
      2: ["SF", "F"],
      1: ["F"],
    };
    const expectedLabels = expectedByCount[initialCount]?.filter((label) =>
      orderedLabels.includes(label),
    );
    const constrainedLabels =
      expectedLabels && expectedLabels.length > 0 ? expectedLabels : orderedLabels;

    const scoreOf = (match: unknown) => {
      const matchRecord =
        match && typeof match === "object"
          ? (match as Record<string, unknown>)
          : {};
      const p1 = normalizeBracketPlayer(
        matchRecord.player1,
        matchRecord,
        "player1",
      );
      const p2 = normalizeBracketPlayer(
        matchRecord.player2,
        matchRecord,
        "player2",
      );
      const s1 =
        toNumber(matchRecord.player1_points) ??
        readStoredBracketMatchPoints(matchRecord, 1);
      const s2 =
        toNumber(matchRecord.player2_points) ??
        readStoredBracketMatchPoints(matchRecord, 2);
      const hasScores = s1 !== null || s2 !== null;
      const hasDate =
        typeof matchRecord.date_time === "string" &&
        matchRecord.date_time.trim().length > 0;
      const source =
        typeof matchRecord.source === "string" ? matchRecord.source : "";
      const hasForfeit =
        source === "ff-1" || source === "ff-2" || source === "double-ff";
      let score = 0;
      if (p1.name && p2.name) score += 4;
      if (hasScores) score += 3;
      if (hasDate) score += 2;
      if (hasForfeit) score += 1;
      return score;
    };

    const dedupeMatchesByNumber = (matches: unknown[]) => {
      if (matches.length <= 1) return matches;
      const byNumber = new Map<number, unknown>();
      matches.forEach((match) => {
        const number =
          toNumber((match as { match_number?: unknown }).match_number) ?? 0;
        const existing = byNumber.get(number);
        if (!existing || scoreOf(match) >= scoreOf(existing)) {
          byNumber.set(number, match);
        }
      });
      return Array.from(byNumber.values()).sort(
        (a, b) =>
          (toNumber((a as { match_number?: unknown }).match_number) ?? 0) -
          (toNumber((b as { match_number?: unknown }).match_number) ?? 0),
      );
    };

    const idByRoundAndNumber = new Map<string, Map<number, string>>();
    constrainedLabels.forEach((label) => {
      const inner = new Map<number, string>();
      let arr = (byRound.get(label) ?? [])
        .slice()
        .sort(
          (a, b) =>
            (toNumber((a as { match_number?: unknown }).match_number) ?? 0) -
            (toNumber((b as { match_number?: unknown }).match_number) ?? 0),
        );

      if ((label || "").toUpperCase().trim() === "F" && arr.length > 1) {
        const onlyPrimaryFinal = arr.filter(
          (m) =>
            (toNumber((m as { match_number?: unknown }).match_number) ?? 0) <= 1,
        );
        arr =
          onlyPrimaryFinal.length > 0
            ? onlyPrimaryFinal.slice(0, 1)
            : arr.slice(0, 1);
      }
      arr = dedupeMatchesByNumber(arr);

      arr.forEach((m) => {
        const num =
          toNumber((m as { match_number?: unknown }).match_number) ?? 0;
        const id = (m as { id?: unknown }).id;
        if (num > 0 && id !== undefined && id !== null)
          inner.set(num, String(id));
      });
      idByRoundAndNumber.set(label, inner);
    });

    return constrainedLabels.map((label, idx) => {
      const nextLabel = constrainedLabels[idx + 1] || null;
      const nextMap = nextLabel ? idByRoundAndNumber.get(nextLabel) : undefined;
      let arr = (byRound.get(label) ?? [])
        .slice()
        .sort(
          (a, b) =>
            (toNumber((a as { match_number?: unknown }).match_number) ?? 0) -
            (toNumber((b as { match_number?: unknown }).match_number) ?? 0),
        );

      if ((label || "").toUpperCase().trim() === "F" && arr.length > 1) {
        const onlyPrimaryFinal = arr.filter(
          (m) =>
            (toNumber((m as { match_number?: unknown }).match_number) ?? 0) <= 1,
        );
        arr =
          onlyPrimaryFinal.length > 0
            ? onlyPrimaryFinal.slice(0, 1)
            : arr.slice(0, 1);
      }
      arr = dedupeMatchesByNumber(arr);

      return {
        label,
        matches: arr
          .map((m, matchIndex) => {
          const matchNumber =
            toNumber((m as { match_number?: unknown }).match_number) ?? 0;
          const sourceTag = (m as { source?: unknown }).source;
          const p1 = normalizeBracketPlayer(
            (m as { player1?: unknown }).player1,
            m as Record<string, unknown>,
            "player1",
          );
          const p2 = normalizeBracketPlayer(
            (m as { player2?: unknown }).player2,
            m as Record<string, unknown>,
            "player2",
          );
          const isFivePinsBracket = isFivePinsEvent(eventData);
          const score1 = isFivePinsBracket
            ? (readBracketSetsWon(m as Record<string, unknown>, 1) ??
              toNumber(
                (
                  m as {
                    player1_points?: unknown;
                  }
                ).player1_points,
              ) ??
              readStoredBracketMatchPoints(m as Record<string, unknown>, 1))
            : (toNumber(
                (
                  m as {
                    player1_points?: unknown;
                  }
                ).player1_points,
              ) ??
              readStoredBracketMatchPoints(m as Record<string, unknown>, 1));
          const score2 = isFivePinsBracket
            ? (readBracketSetsWon(m as Record<string, unknown>, 2) ??
              toNumber(
                (
                  m as {
                    player2_points?: unknown;
                  }
                ).player2_points,
              ) ??
              readStoredBracketMatchPoints(m as Record<string, unknown>, 2))
            : (toNumber(
                (
                  m as {
                    player2_points?: unknown;
                  }
                ).player2_points,
              ) ??
              readStoredBracketMatchPoints(m as Record<string, unknown>, 2));
          const tieBreak1 = toNumber(
            (m as { player1_tie_break?: unknown }).player1_tie_break,
          );
          const tieBreak2 = toNumber(
            (m as { player2_tie_break?: unknown }).player2_tie_break,
          );
          const { winner1, winner2 } = resolveBracketWinners({
            sourceTag: typeof sourceTag === "string" ? sourceTag : "",
            score1,
            score2,
            tieBreak1,
            tieBreak2,
          });
          const { matchPoints1, matchPoints2 } = resolveBracketMatchPoints({
            sourceTag: typeof sourceTag === "string" ? sourceTag : "",
            score1,
            score2,
            tieBreak1,
            tieBreak2,
            storedMatchPoints1: readStoredBracketMatchPoints(
              m as Record<string, unknown>,
              1,
            ),
            storedMatchPoints2: readStoredBracketMatchPoints(
              m as Record<string, unknown>,
              2,
            ),
          });
          const hasScores = score1 !== null || score2 !== null;
          const hasDate =
            typeof (m as { date_time?: unknown }).date_time === "string" &&
            ((m as { date_time?: string }).date_time?.trim().length ?? 0) > 0;
          const hasBothPlayers = Boolean(p1.name && p2.name);
          const hasAnyPlayer = Boolean(p1.name || p2.name);
          const isFirstRound = idx === 0;
          const byeTop = sourceTag === "bye-1";
          const byeBottom = sourceTag === "bye-2";
          const ffTop = sourceTag === "ff-1" || sourceTag === "double-ff";
          const ffBottom = sourceTag === "ff-2" || sourceTag === "double-ff";
          const hasForfeit = ffTop || ffBottom;
          const isPureBye =
            (byeTop && !p1.name) || (byeBottom && !p2.name);
          const shouldDropPlaceholder =
            !isFirstRound &&
            !hasScores &&
            !hasDate &&
            !hasForfeit &&
            !hasBothPlayers &&
            hasAnyPlayer &&
            (byeTop || byeBottom || isPureBye);

          return {
            id: String((m as { id?: unknown }).id ?? ""),
            player1: p1.name || "",
            player2: p2.name || "",
            player1Country: p1.country,
            player2Country: p2.country,
            score1,
            score2,
            innings1: isFivePinsBracket
              ? null
              : toNumber(
                  (m as { player1_innings?: unknown }).player1_innings,
                ),
            innings2: isFivePinsBracket
              ? null
              : toNumber(
                  (m as { player2_innings?: unknown }).player2_innings,
                ),
            highRun1: toNumber(
              (m as { player1_high_run?: unknown }).player1_high_run,
            ),
            highRun2: toNumber(
              (m as { player2_high_run?: unknown }).player2_high_run,
            ),
            highRun1Second: toNumber(
              (m as { player1_high_run_2?: unknown }).player1_high_run_2,
            ),
            highRun2Second: toNumber(
              (m as { player2_high_run_2?: unknown }).player2_high_run_2,
            ),
            matchPoints1,
            matchPoints2,
            tieBreak1,
            tieBreak2,
            sets1: readBracketSetsResult(m as Record<string, unknown>, 1),
            sets2: readBracketSetsResult(m as Record<string, unknown>, 2),
            matchSheetJson: (m as { matchSheetJson?: unknown }).matchSheetJson,
            date:
              typeof (m as { date_time?: unknown }).date_time === "string"
                ? (m as { date_time: string }).date_time
                : null,
            nextMatchId:
              nextMap && matchNumber > 0
                ? nextMap.get(Math.ceil(matchNumber / 2))
                : undefined,
            byeTop,
            byeBottom,
            ffTop,
            ffBottom,
            winner1,
            winner2,
            globalMatchNumber: toNumber(
              (m as { global_match_number?: unknown }).global_match_number,
            ),
            winnerToGlobalMatchNumber: toNumber(
              (m as { winner_to_global_match_number?: unknown })
                .winner_to_global_match_number,
            ),
            _shouldDropPlaceholder: shouldDropPlaceholder,
          };
        })
          .filter(
            (match) =>
              !(
                "_shouldDropPlaceholder" in match &&
                match._shouldDropPlaceholder
              ),
          )
          .map(({ _shouldDropPlaceholder, ...match }) => match),
      };
    });
  }, [
    activeStage,
    activeStageUsesBracketView,
    activeBracketMatchSource,
    normalizeBracketPlayer,
  ]);

  const selectedBracketMatch = useMemo(() => {
    if (!selectedBracketMatchId) return null;
    const firstRoundMatchCount = activeBracketRounds[0]?.matches.length ?? 0;
    for (let roundIndex = 0; roundIndex < activeBracketRounds.length; roundIndex += 1) {
      const round = activeBracketRounds[roundIndex];
      const matchIndex = round.matches.findIndex(
        (match) => match.id === selectedBracketMatchId,
      );
      const found = matchIndex >= 0 ? round.matches[matchIndex] : null;
      if (found) {
        return {
          roundLabel: round.label,
          roundIndex,
          matchIndex,
          firstRoundMatchCount,
          match: found,
        };
      }
    }
    return null;
  }, [activeBracketRounds, selectedBracketMatchId]);

  const selectedBracketShowsTieBreak =
    selectedBracketMatch !== null &&
    (typeof selectedBracketMatch.match.tieBreak1 === "number" ||
      typeof selectedBracketMatch.match.tieBreak2 === "number");
  const selectedBracketDetailsGridClass = selectedBracketShowsTieBreak
    ? "grid min-w-[860px] grid-cols-[minmax(180px,1.6fr)_repeat(8,minmax(56px,0.75fr))] items-center gap-3"
    : "grid min-w-[800px] grid-cols-[minmax(180px,1.6fr)_repeat(7,minmax(56px,0.75fr))] items-center gap-3";

  const activeBracketIncomingMatchNumbers = useMemo(() => {
    const incoming = new Map<string, number[]>();
    activeBracketRounds.forEach((round, roundIndex) => {
      round.matches.forEach((match, matchIndex) => {
        const nextRound = activeBracketRounds[roundIndex + 1];
        const targetId =
          match.nextMatchId ||
          nextRound?.matches[Math.floor(matchIndex / 2)]?.id ||
          null;
        if (!targetId || typeof match.globalMatchNumber !== "number") return;
        const targetIncoming = incoming.get(targetId) ?? [];
        targetIncoming.push(match.globalMatchNumber);
        incoming.set(targetId, targetIncoming);
      });
    });
    return incoming;
  }, [activeBracketRounds]);

  const activeDoubleEliminationRounds = useMemo(() => {
    if (
      !activeStage ||
      activeStage.stageType !== "double_elimination" ||
      !activeStageUsesBracketView
    ) {
      return [] as Array<{
        label: string;
        matches: Array<{
          id: string;
          matchNumber: number | null;
          displayMatchNumber: number;
          globalMatchNumber: number | null;
          winnerToGlobalMatchNumber: number | null;
          loserToGlobalMatchNumber: number | null;
          player1: string;
          player1Country: string | null;
          player1FlagSrc: string | null;
          player2: string;
          player2Country: string | null;
          player2FlagSrc: string | null;
          score1: number | null;
          score2: number | null;
          dateTime: string | null;
          innings1: number | null;
          innings2: number | null;
          highRun1: number | null;
          highRun2: number | null;
          highRun1Second: number | null;
          highRun2Second: number | null;
          matchPoints1: number | null;
          matchPoints2: number | null;
          tieBreak1: number | null;
          tieBreak2: number | null;
          winner1: boolean;
          winner2: boolean;
        }>;
      }>;
    }
    const sourceRaw = brMatchesByStage[activeStage.documentId];
    const source = Array.isArray(sourceRaw) ? sourceRaw : [];
    const byRound = new Map<string, typeof source>();
    source
      .filter((m) => {
        const bracket =
          typeof (m as { bracket_type?: unknown }).bracket_type === "string"
            ? ((m as { bracket_type: string }).bracket_type as
                | "winners"
                | "losers")
            : "winners";
        return bracket === deBracketType;
      })
      .forEach((m) => {
        const label =
          typeof (m as { round?: unknown }).round === "string" &&
          (m as { round: string }).round.trim()
            ? (m as { round: string }).round.trim()
            : "Round";
        const arr = byRound.get(label) ?? [];
        arr.push(m);
        byRound.set(label, arr);
      });

    const getPriority = (label: string): number => {
      const upper = label.toUpperCase().trim();
      if (upper.startsWith("WINNERS R")) {
        return Number(upper.replace("WINNERS R", "")) || 500;
      }
      if (upper === "WINNERS FINAL") return 900;
      if (upper.startsWith("LOSERS R")) {
        return Number(upper.replace("LOSERS R", "")) || 500;
      }
      if (upper === "LOSERS FINAL") return 900;
      if (upper === "GRAND FINAL") return 1000;
      if (upper === "GRAND FINAL RESET") return 1001;
      return 9999;
    };

    let deDisplayCounter = 0;

    return Array.from(byRound.entries())
      .sort((a, b) => {
        const diff = getPriority(a[0]) - getPriority(b[0]);
        if (diff !== 0) return diff;
        return a[0].localeCompare(b[0]);
      })
      .map(([label, matches]) => ({
        label,
        matches: matches
          .slice()
          .sort(
            (a, b) =>
              (toNumber((a as { match_number?: unknown }).match_number) ?? 0) -
              (toNumber((b as { match_number?: unknown }).match_number) ?? 0),
          )
          .map((m) => {
            deDisplayCounter += 1;
            const p1 = normalizeBracketPlayer(
              (m as { player1?: unknown }).player1,
              m as Record<string, unknown>,
              "player1",
            );
            const p2 = normalizeBracketPlayer(
              (m as { player2?: unknown }).player2,
              m as Record<string, unknown>,
              "player2",
            );
            const p1FlagSrc = p1.country
              ? getCountryFlagCdnUrl(p1.country, 40)
              : null;
            const p2FlagSrc = p2.country
              ? getCountryFlagCdnUrl(p2.country, 40)
              : null;
            const isFivePinsBracket = isFivePinsEvent(eventData);
            const score1 = isFivePinsBracket
              ? (readBracketSetsWon(m as Record<string, unknown>, 1) ??
                toNumber((m as { player1_points?: unknown }).player1_points) ??
                readStoredBracketMatchPoints(m as Record<string, unknown>, 1))
              : (toNumber((m as { player1_points?: unknown }).player1_points) ??
                readStoredBracketMatchPoints(m as Record<string, unknown>, 1));
            const score2 = isFivePinsBracket
              ? (readBracketSetsWon(m as Record<string, unknown>, 2) ??
                toNumber((m as { player2_points?: unknown }).player2_points) ??
                readStoredBracketMatchPoints(m as Record<string, unknown>, 2))
              : (toNumber((m as { player2_points?: unknown }).player2_points) ??
                readStoredBracketMatchPoints(m as Record<string, unknown>, 2));
            const tieBreak1 = toNumber(
              (m as { player1_tie_break?: unknown }).player1_tie_break,
            );
            const tieBreak2 = toNumber(
              (m as { player2_tie_break?: unknown }).player2_tie_break,
            );
            const sourceTag =
              typeof (m as { source?: unknown }).source === "string"
                ? ((m as { source: string }).source as string)
                : "";
            const { winner1, winner2 } = resolveBracketWinners({
              sourceTag,
              score1,
              score2,
              tieBreak1,
              tieBreak2,
            });
            return {
              id: String((m as { id?: unknown }).id ?? ""),
              matchNumber:
                toNumber((m as { match_number?: unknown }).match_number) ?? null,
              displayMatchNumber: deDisplayCounter,
              globalMatchNumber:
                toNumber(
                  (m as { global_match_number?: unknown }).global_match_number,
                ) ?? null,
              winnerToGlobalMatchNumber:
                toNumber(
                  (m as { winner_to_global_match_number?: unknown })
                    .winner_to_global_match_number,
                ) ?? null,
              loserToGlobalMatchNumber:
                toNumber(
                  (m as { loser_to_global_match_number?: unknown })
                    .loser_to_global_match_number,
                ) ?? null,
              player1: p1.name || "",
              player2: p2.name || "",
              player1Country: p1.country,
              player2Country: p2.country,
              player1FlagSrc: p1FlagSrc,
              player2FlagSrc: p2FlagSrc,
              score1,
              score2,
              innings1: isFivePinsBracket
                ? null
                : toNumber(
                    (m as { player1_innings?: unknown }).player1_innings,
                  ),
              innings2: isFivePinsBracket
                ? null
                : toNumber(
                    (m as { player2_innings?: unknown }).player2_innings,
                  ),
              highRun1: toNumber(
                (m as { player1_high_run?: unknown }).player1_high_run,
              ),
              highRun2: toNumber(
                (m as { player2_high_run?: unknown }).player2_high_run,
              ),
              highRun1Second: toNumber(
                (m as { player1_high_run_2?: unknown }).player1_high_run_2,
              ),
              highRun2Second: toNumber(
                (m as { player2_high_run_2?: unknown }).player2_high_run_2,
              ),
              matchPoints1: readStoredBracketMatchPoints(
                m as Record<string, unknown>,
                1,
              ),
              matchPoints2: readStoredBracketMatchPoints(
                m as Record<string, unknown>,
                2,
              ),
              tieBreak1,
              tieBreak2,
              dateTime:
                typeof (m as { date_time?: unknown }).date_time === "string"
                  ? (m as { date_time: string }).date_time
                  : null,
              winner1,
              winner2,
            };
          }),
      }));
  }, [
    activeStage,
    activeStageUsesBracketView,
    brMatchesByStage,
    deBracketType,
    normalizeBracketPlayer,
  ]);

  const displayedDoubleEliminationRounds = useMemo(() => {
    if (deSelectedRound === "all") return activeDoubleEliminationRounds;
    return activeDoubleEliminationRounds.filter(
      (round) => round.label === deSelectedRound,
    );
  }, [activeDoubleEliminationRounds, deSelectedRound]);

  useEffect(() => {
    setDeBracketType("winners");
    setDeSelectedRound("all");
    setDeExpandedMatchId(null);
    setSelectedBracketMatchId(null);
  }, [activeStage?.documentId]);

  const eventInfo = useMemo(() => {
    if (!eventData?.data) return null;
    const event = eventData.data;
    return {
      title: typeof event.title === "string" ? event.title : "",
      season: typeof event.season === "number" ? event.season : null,
      startDate: typeof event.start_date === "string" ? event.start_date : null,
      endDate: typeof event.end_date === "string" ? event.end_date : null,
    };
  }, [eventData]);
  const suppressDerivedBestAverage = shouldSuppressDerivedBestAverage({
    title: eventInfo?.title,
    startDate: eventInfo?.startDate,
  });

  // Route 5-pins events to the dedicated 5-pins UI (sets-based scoring).
  return (
    <div
      className="mx-auto w-full px-4 py-8"
      style={{ maxWidth: "var(--bt-page-width, 1280px)" }}
    >
      <style>{liveBadgeAnimation}</style>
      <div className="flex flex-col gap-4">
        {showStandaloneTitle ? (
          <h1 className="text-2xl font-semibold">Tournament Events</h1>
        ) : null}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          {isLoading && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          )}
          {error && (
            <div className="text-sm text-red-500 dark:text-red-400">
              {error}
            </div>
          )}
          {!isLoading && !error && !eventId && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {emptyStateMessage}
            </div>
          )}
          {!isLoading &&
            !error &&
            eventId &&
            eventStages.length === 0 &&
            (!showPublishedFinalResults || !showVisiblePublishedFinalResults) && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                No stages found for this event.
              </div>
            )}
          {eventInfo &&
            (eventStages.length > 0 ||
              showVisiblePublishedFinalResults) && (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
                  {showEventHeader ? (
                    <div className="mb-4 flex flex-col gap-1">
                      <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                        {eventInfo.title}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        {eventInfo.season && (
                          <span>Season {eventInfo.season}</span>
                        )}
                        {formatDateRange(
                          eventInfo.startDate,
                          eventInfo.endDate,
                        ) && (
                          <span>
                            {formatDateRange(
                              eventInfo.startDate,
                              eventInfo.endDate,
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : null}
                  {showVisiblePublishedFinalResults && (
                    isBiathlonEvent(eventData) ? (
                      <div className="mb-6 flex flex-col gap-3">
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                          Final standings
                        </div>
                        <BiathlonFinalRankingTable
                          stages={eventStages.map((s) => ({
                            groups: buildStageMatchGroups(s.groups),
                          }))}
                        />
                      </div>
                    ) : (
                      <div className="mb-6 flex flex-col gap-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                            Final standings
                          </div>
                          {finalGeneralAverage !== null && (
                            <div className="inline-flex w-fit items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900">
                              <span className="font-medium text-gray-500 dark:text-gray-400">
                                {isArtisticEvent ? "Tournament General %" : "Tournament General AVG"}
                              </span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {isArtisticEvent
                                  ? `${formatTruncatedAverage(finalGeneralAverage * 100)}%`
                                  : formatTruncatedAverage(finalGeneralAverage)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                          <table className="min-w-full border-collapse text-sm">
                            <thead className="bg-emerald-900 text-white">
                              <tr>
                                <th className="px-4 py-3 text-left font-semibold">
                                  #
                                </th>
                                <th className="px-4 py-3 text-left font-semibold">
                                  Player
                                </th>
                                <th className="px-4 py-3 text-center font-semibold">
                                  Match Pts
                                </th>
                                <th className="px-4 py-3 text-center font-semibold">
                                  {isFivePinsFinalEvent ? "P+" : isArtisticEvent ? "Points" : "Caroms"}
                                </th>
                                <th className="px-4 py-3 text-center font-semibold">
                                  {isFivePinsFinalEvent ? "P-" : isArtisticEvent ? "Possible points" : "Innings"}
                                </th>
                                <th className="px-4 py-3 text-center font-semibold">
                                  {isFivePinsFinalEvent ? "P+/P-" : isArtisticEvent ? "%" : "AVG"}
                                </th>
                                <th className="px-4 py-3 text-center font-semibold">
                                  {isArtisticEvent ? "Best run" : "1st H.R."}
                                </th>
                                {isArtisticEvent && (
                                  <th className="px-4 py-3 text-center font-semibold">
                                    Best game
                                  </th>
                                )}
                                {!isArtisticEvent && showFinalHighRun2Column && (
                                  <th className="px-4 py-3 text-center font-semibold">
                                    2nd H.R.
                                  </th>
                                )}
                                {!isArtisticEvent && (
                                  <th className="px-4 py-3 text-center font-semibold">
                                    Best AVG
                                  </th>
                                )}
                                {showRankPointsColumn && (
                                  <th className="px-4 py-3 text-center font-semibold">
                                    Rank Pts
                                  </th>
                                )}
                                {showPenaltyColumn && (
                                  <th className="px-4 py-3 text-center font-semibold">
                                    Penalty
                                  </th>
                                )}
                                {showFinalPointsColumn && (
                                  <th className="px-4 py-3 text-center font-semibold">
                                    Final Pts
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {publishedFinalResults.map((result) => {
                                const finalAverageValue = getFinalResultAverageValue(result);
                                const highlightAverage =
                                  !isArtisticEvent &&
                                  finalStandingsHighlights.average !== null &&
                                  finalAverageValue !== null &&
                                  finalAverageValue === finalStandingsHighlights.average;
                                const highlightBestAverage =
                                  !isArtisticEvent &&
                                  finalStandingsHighlights.bestAverage !== null &&
                                  result.bestAverage !== null &&
                                  result.bestAverage === finalStandingsHighlights.bestAverage;
                                const highlightHighRun =
                                  !isArtisticEvent &&
                                  finalStandingsHighlights.highRun !== null &&
                                  result.highRun !== null &&
                                  result.highRun === finalStandingsHighlights.highRun;
                                const averageDisplay = isArtisticEvent
                                  ? (() => {
                                      if (
                                        finalAverageValue === null ||
                                        !Number.isFinite(finalAverageValue)
                                      ) {
                                        return "-";
                                      }
                                      return formatTruncatedAverage(
                                        finalAverageValue * 100,
                                      );
                                    })()
                                  : formatAverage(
                                      result.caroms ?? result.points,
                                      result.innings,
                                    );
                                const bestAverageDisplay = isArtisticEvent
                                  ? formatNumberValue(result.highRun)
                                  : result.bestAverage !== null
                                    ? formatTruncatedAverage(
                                        result.bestAverage,
                                      )
                                    : "-";
                                const highRunDisplay = formatNumberValue(
                                  result.highRun,
                                );
                                const metricTooltip =
                                  finalMetricTooltipByResultId.get(result.id);

                                return (
                                <tr
                                  key={result.id}
                                  className="border-t border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                >
                                  <td className="px-4 py-3 font-semibold">
                                    {formatNumberValue(result.position)}
                                  </td>
                                  <td className="px-4 py-3 font-medium">
                                    {result.playerId ? (
                                      <Link
                                        href={playerProfileHref(
                                          result.playerId,
                                          result.playerName || "Unknown",
                                        )}
                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                                      >
                                        <PlayerNameWithFlag
                                          name={result.playerName || "Unknown"}
                                          country={result.playerCountry}
                                        />
                                      </Link>
                                    ) : (
                                      <PlayerNameWithFlag
                                        name={result.playerName || "Unknown"}
                                        country={result.playerCountry}
                                      />
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {formatNumberValue(result.matchPoints)}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {formatNumberValue(
                                      result.caroms ?? result.points,
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {formatNumberValue(result.innings)}
                                  </td>
                                  <td
                                    className="px-4 py-3 text-center"
                                  >
                                    {renderRankingMetricBadge(
                                      averageDisplay,
                                      highlightAverage,
                                    )}
                                  </td>
                                  {isArtisticEvent && (
                                    <td className="px-4 py-3 text-center">
                                      {formatNumberValue(result.highRun)}
                                    </td>
                                  )}
                                  {isArtisticEvent && (
                                    <td className="px-4 py-3 text-center">
                                      {result.bestGame !== null
                                        ? formatTruncatedAverage(
                                            result.bestGame,
                                          )
                                        : "-"}
                                    </td>
                                  )}
                                  {!isArtisticEvent && (
                                    <td className="px-4 py-3 text-center">
                                      {renderRankingMetricBadge(
                                        highRunDisplay,
                                        highlightHighRun,
                                        metricTooltip?.highRun ?? null,
                                        "center",
                                        groupLabelMode,
                                      )}
                                    </td>
                                  )}
                                  {!isArtisticEvent && showFinalHighRun2Column && (
                                    <td className="px-4 py-3 text-center">
                                      {formatNumberValue(result.highRun2)}
                                    </td>
                                  )}
                                  {!isArtisticEvent && (
                                    <td className="px-4 py-3 text-center">
                                      {renderRankingMetricBadge(
                                        bestAverageDisplay,
                                        highlightBestAverage,
                                        metricTooltip?.bestAverage ?? null,
                                        "right",
                                        groupLabelMode,
                                      )}
                                    </td>
                                  )}
                                  {showRankPointsColumn && (
                                    <td className="px-4 py-3 text-center">
                                      {formatNumberValue(result.rankingPoints)}
                                    </td>
                                  )}
                                  {showPenaltyColumn && (
                                    <td className="px-4 py-3 text-center">
                                      {formatNumberValue(result.penalty)}
                                    </td>
                                  )}
                                  {showFinalPointsColumn && (
                                    <td className="px-4 py-3 text-center">
                                      {formatNumberValue(
                                        getEffectiveFinalPoints(result),
                                      )}
                                    </td>
                                  )}
                                </tr>
                              )})}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  )}
                  {showTimetable && timetableSlots.length > 0 && (
                    <div className="mb-6 flex flex-col gap-3">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        Time table
                      </div>
                      <div className="relative max-w-md">
                        <input
                          type="search"
                          value={playerSearchQuery}
                          onChange={(event) =>
                            setPlayerSearchQuery(event.target.value)
                          }
                          placeholder="Search player, group (e.g. g1) or match..."
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/40"
                        />
                        {playerSearchQuery ? (
                          <button
                            type="button"
                            onClick={() => setPlayerSearchQuery("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                            aria-label="Clear search"
                            title="Clear search"
                          >
                            X
                          </button>
                        ) : null}
                      </div>
                      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="overflow-x-auto">
                          <table className="min-w-full border-collapse text-sm">
                            <thead className="bg-slate-800 text-white">
                              <tr>
                                <th className="px-4 py-3 text-center font-semibold">Date</th>
                                <th className="px-4 py-3 text-center font-semibold">Time</th>
                                <th className="px-4 py-3 text-center font-semibold">Table</th>
                                <th className="px-4 py-3 text-center font-semibold">Type</th>
                                <th className="px-4 py-3 text-center font-semibold">Title</th>
                                <th className="px-4 py-3 text-center font-semibold">Stage</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredTimetableSlots.map((slot) => {
                                const parsedDateTime = slot.dateTime ? new Date(slot.dateTime) : null;
                                const shiftedSlotDateTime = formatDateTimeWithOffset(
                                  slot.dateTime,
                                  timezoneOffsetMinutes,
                                  timezoneName,
                                );
                                const dateLabel =
                                  shiftedSlotDateTime
                                    ? shiftedSlotDateTime.date
                                    : slot.dateTime && parsedDateTime && !Number.isNaN(parsedDateTime.getTime())
                                    ? formatDateForTable(slot.dateTime)
                                    : slot.date || "-";
                                const timeLabel =
                                  shiftedSlotDateTime
                                    ? shiftedSlotDateTime.time
                                    : slot.dateTime && parsedDateTime && !Number.isNaN(parsedDateTime.getTime())
                                    ? parsedDateTime.toLocaleTimeString("el-GR", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: false,
                                      })
                                    : slot.time || "-";
                                const timetableDisplayPlayers =
                                  slot.matchDocumentId
                                    ? groupMatchDisplayByDocumentId.get(
                                        slot.matchDocumentId,
                                      ) ?? null
                                    : null;
                                const timetablePlayers = timetableDisplayPlayers
                                  ? [
                                      {
                                        name: timetableDisplayPlayers.top.label,
                                        country:
                                          timetableDisplayPlayers.top.placeholder
                                            ? null
                                            : timetableDisplayPlayers.top.player
                                                ?.country ?? null,
                                        placeholder:
                                          timetableDisplayPlayers.top.placeholder,
                                      },
                                      {
                                        name: timetableDisplayPlayers.bottom.label,
                                        country:
                                          timetableDisplayPlayers.bottom.placeholder
                                            ? null
                                            : timetableDisplayPlayers.bottom.player
                                                ?.country ?? null,
                                        placeholder:
                                          timetableDisplayPlayers.bottom.placeholder,
                                      },
                                    ]
                                  : [
                                      {
                                        name: slot.matchPlayer1Name,
                                        country: slot.matchPlayer1Country,
                                        placeholder: false,
                                      },
                                      {
                                        name: slot.matchPlayer2Name,
                                        country: slot.matchPlayer2Country,
                                        placeholder: false,
                                      },
                                    ];
                                return (
                                  <tr
                                    key={slot.documentId}
                                    className="border-t border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                  >
                                    <td className="px-4 py-3 text-center align-middle">{dateLabel}</td>
                                    <td className="px-4 py-3 text-center align-middle">{timeLabel}</td>
                                    <td className="px-4 py-3 text-center align-middle">{slot.tableLabel || "-"}</td>
                                    <td className="px-4 py-3 text-center align-middle">
                                      <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                        {slot.slotType}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 align-middle">
                                      <div className="flex flex-col items-center gap-1 text-center">
                                        {slot.slotType === "training" && slot.trainingPlayerName ? (
                                          <div className="grid grid-cols-[20px_minmax(0,max-content)] items-center justify-center gap-2">
                                            <div className="flex h-4 w-5 items-center justify-center">
                                              {slot.trainingPlayerCountry ? (
                                                <img
                                                  src={getCountryFlagCdnUrl(slot.trainingPlayerCountry, 40) || ""}
                                                  alt={slot.trainingPlayerCountry || "flag"}
                                                  className="h-3.5 w-5 rounded-[2px] object-cover"
                                                  loading="lazy"
                                                  referrerPolicy="no-referrer"
                                                />
                                              ) : null}
                                            </div>
                                            <span className="text-left text-sm font-semibold leading-tight">
                                              {slot.trainingPlayerName}
                                            </span>
                                          </div>
                                        ) : slot.slotType !== "match" && slot.title ? (
                                          <span className="font-medium">{slot.title}</span>
                                        ) : null}
                                        {slot.slotType !== "training" && slot.slotType !== "match" && slot.subtitle ? (
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {slot.subtitle}
                                          </span>
                                        ) : null}
                                        {slot.slotType !== "training" && timetablePlayers.some((player) => player.name) ? (
                                          <div className="grid gap-1">
                                            {timetablePlayers
                                              .filter((player) => player.name)
                                              .map((player, index) => {
                                                const flagSrc = getCountryFlagCdnUrl(player.country ?? null, 40);
                                                return (
                                                  <div
                                                    key={`${slot.documentId}-player-${index}`}
                                                    className="grid grid-cols-[20px_minmax(0,1fr)] items-center justify-center gap-2"
                                                  >
                                                    <div className="flex h-4 w-5 items-center justify-center">
                                                      {flagSrc && !player.placeholder ? (
                                                        <img
                                                          src={flagSrc}
                                                          alt={player.country || "flag"}
                                                          className="h-3.5 w-5 rounded-[2px] object-cover"
                                                          loading="lazy"
                                                          referrerPolicy="no-referrer"
                                                        />
                                                      ) : null}
                                                    </div>
                                                    <span
                                                      className={clsx(
                                                        "text-sm font-semibold leading-tight",
                                                        player.placeholder &&
                                                          "text-gray-500 dark:text-gray-400",
                                                      )}
                                                    >
                                                      {player.name}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                          </div>
                                        ) : slot.slotType !== "training" && slot.matchLabel ? (
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {slot.matchLabel}
                                          </span>
                                        ) : null}
                                        {slot.slotType !== "training" && slot.description ? (
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {slot.description}
                                          </span>
                                        ) : null}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-center align-middle">{slot.stageTitle || "-"}</td>
                                  </tr>
                                );
                              })}
                              {filteredTimetableSlots.length === 0 && (
                                <tr className="border-t border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                                  <td colSpan={6} className="px-4 py-6 text-center">
                                    No timetable entries match your search.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Tab Content */}
                  {!showPublishedFinalResults && eventStages.length > 0 && (
                    <div className="mt-4">
                      {eventStages.map((stage: NormalizedEventStage) => {
                        if (activeStageId !== stage.id) return null;

                        const stageDateRange = formatDateRange(
                          stage.startDate,
                          stage.endDate,
                        );
                        const stageUsesBracketView = isBracketStage(stage);
                        const stageBracketMatchesState =
                          brMatchesByStage[stage.documentId];
                        const stageBracketLoading =
                          stageUsesBracketView &&
                          (brLoadingByStage[stage.documentId] ||
                            typeof stageBracketMatchesState === "undefined");
                        const isLegacyBracketFallback =
                          isBracketStage(stage) &&
                          !stageUsesBracketView;
                        const showStageSearch =
                          ((!stageUsesBracketView &&
                            (stageMatchGroups[stage.id] ?? []).length > 0) ||
                            stageUsesBracketView);
                        const showStageControls =
                          showStageSearch ||
                          (onTimezoneChange && timezoneOptions.length > 0);
                        const showCompactFilters =
                          showStageSearch &&
                          onTimezoneChange &&
                          timezoneOptions.length > 0;
                        const showKoRoundRankingSelect =
                          stageViewMode === "ranks" &&
                          stage.isFinal &&
                          isBracketStage(stage) &&
                          typeof onKoRankingRoundChange === "function";
                        const openingRoundSize = getOpeningKnockoutRoundSize(stage);
                        const openingRoundFinalLabel = `Round ${openingRoundSize} Final Standing`;
                        const koRoundOptions = KO_ROUND_OPTIONS.filter(
                          (option) => option.size <= openingRoundSize,
                        );
                        const isOpeningRoundFinalSelected =
                          koRankingRound === "opening-final" ||
                          koRankingRound === "r16-final";

                        return (
                          <div key={stage.id} className="flex flex-col gap-4">
                            {stageViewMode === "ranks" ? (
                              <div className="flex flex-col gap-3">
                                {stageDateRange && (
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {stageDateRange}
                                  </div>
                                )}
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                    Ranking - {stage.title || stage.order || ""}
                                  </div>
                                  {showKoRoundRankingSelect ? (
                                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
                                      <button
                                        type="button"
                                        onClick={() => onKoRankingRoundChange("opening-final")}
                                        className={clsx(
                                          "h-9 rounded-lg border px-3 text-xs font-semibold uppercase tracking-[0.12em] transition",
                                          isOpeningRoundFinalSelected
                                            ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                            : "border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-blue-500",
                                        )}
                                      >
                                        {openingRoundFinalLabel}
                                      </button>
                                      {koRoundOptions.length > 0 ? (
                                        <select
                                          value={isOpeningRoundFinalSelected ? "" : koRankingRound}
                                          onChange={(event) =>
                                            onKoRankingRoundChange(
                                              event.target.value as KoRankingRound,
                                            )
                                          }
                                          className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold uppercase tracking-[0.12em] text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/40 sm:w-52"
                                        >
                                          <option value="" disabled>Round</option>
                                          {koRoundOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                              {option.label}
                                            </option>
                                          ))}
                                        </select>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                                {isBiathlonEvent(eventData) ? (
                                  isBracketStage(stage) ? (
                                    <BiathlonFinalRankingTable
                                      stages={eventStages.map((s) => ({
                                        groups: buildStageMatchGroups(s.groups),
                                      }))}
                                    />
                                  ) : (
                                  <BiathlonUnifiedRankingTable
                                    groups={buildStageMatchGroups(stage.groups)}
                                    showGroupColumn={stage.stageType !== "single_elimination" && stage.stageType !== "double_elimination"}
                                  />
                                  )
                                ) : (
                                <StageRankingTable
                                  stage={stage}
                                  allStages={eventStages}
                                  embedded={embedded}
                                  playerProfileHref={playerProfileHref}
                                  artistic={isArtisticEvent}
                                  groupLabelMode={groupLabelMode}
                                  suppressDerivedBestAverage={suppressDerivedBestAverage}
                                  koRankingRound={koRankingRound}
                                  eventRulesetKey={eventRulesetKey}
                                  showNativePlayerNames={showNativePlayerNames}
                                  fivePins={isFivePinsEvent(eventData)}
                                />
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-3">
                                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:gap-3">
                                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                        Matches -{" "}
                                        {stage.title || stage.order || ""}
                                      </div>
                                      {stageDateRange && (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                          {stageDateRange}
                                        </div>
                                      )}
                                    </div>
                                    {showStageControls ? (
                                      <div
                                        className={clsx(
                                          "grid items-center gap-3 lg:min-w-[28rem]",
                                          showCompactFilters
                                            ? "md:grid-cols-[minmax(0,1fr)_8rem]"
                                            : "grid-cols-1",
                                        )}
                                      >
                                        {showStageSearch ? (
                                          <div className="relative">
                                            <input
                                              type="search"
                                              value={playerSearchQuery}
                                              onChange={(event) =>
                                                setPlayerSearchQuery(
                                                  event.target.value,
                                                )
                                              }
                                              placeholder={
                                                stageUsesBracketView
                                                  ? "Search player or match..."
                                                  : "Search player or group (e.g. g1)..."
                                              }
                                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/40"
                                            />
                                            {playerSearchQuery ? (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setPlayerSearchQuery("")
                                                }
                                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                                                aria-label="Clear search"
                                                title="Clear search"
                                              >
                                                X
                                              </button>
                                            ) : null}
                                          </div>
                                        ) : null}
                                        {onTimezoneChange &&
                                        timezoneOptions.length > 0 ? (
                                          <select
                                            value={
                                              timezoneName
                                                ? `zone:${timezoneName}`
                                                : String(
                                                    timezoneOffsetMinutes ??
                                                      180,
                                                  )
                                            }
                                            onChange={(event) =>
                                              onTimezoneChange(
                                                event.target.value,
                                              )
                                            }
                                            className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-xs font-semibold text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/40 md:w-auto"
                                          >
                                            {timezoneOptions.map((group) => (
                                              <optgroup
                                                key={group.label}
                                                label={group.label}
                                              >
                                                {group.options.map(
                                                  (option) => (
                                                    <option
                                                      key={option.value}
                                                      value={option.value}
                                                    >
                                                      {option.label}
                                                    </option>
                                                  ),
                                                )}
                                              </optgroup>
                                            ))}
                                          </select>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="flex flex-col gap-3">
                                    {stageUsesBracketView ? (
                                      stageBracketLoading ? (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                          Loading bracket...
                                        </div>
                                      ) : stage.stageType ===
                                          "double_elimination" ? (
                                        displayedDoubleEliminationRounds.length >
                                        0 ? (
                                          <div className="flex flex-col gap-4">
                                            <div className="grid gap-3 md:grid-cols-[220px_220px_minmax(0,1fr)]">
                                              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                                                Bracket
                                                <select
                                                  value={deBracketType}
                                                  onChange={(event) =>
                                                    setDeBracketType(
                                                      event.target.value as
                                                        | "winners"
                                                        | "losers",
                                                    )
                                                  }
                                                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                                >
                                                  <option value="winners">
                                                    Winners
                                                  </option>
                                                  <option value="losers">
                                                    Losers
                                                  </option>
                                                </select>
                                              </label>
                                              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                                                Round
                                                <select
                                                  value={deSelectedRound}
                                                  onChange={(event) =>
                                                    setDeSelectedRound(
                                                      event.target.value,
                                                    )
                                                  }
                                                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                                >
                                                  <option value="all">
                                                    Show all
                                                  </option>
                                                  {activeDoubleEliminationRounds.map(
                                                    (round) => (
                                                      <option
                                                        key={round.label}
                                                        value={round.label}
                                                      >
                                                        {round.label}
                                                      </option>
                                                    ),
                                                  )}
                                                </select>
                                              </label>
                                              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                                                Premium round view for double
                                                elimination. Use Winners/Losers
                                                and round filters to focus on
                                                the active block.
                                              </div>
                                            </div>
                                            <div className="mx-auto grid w-[95%] max-w-[1600px] min-w-0 gap-4">
                                              {displayedDoubleEliminationRounds.map(
                                                (round, roundIndex) => (
                                                  <section
                                                    key={round.label}
                                                    className={`overflow-hidden rounded-[24px] border shadow-[0_16px_40px_rgba(15,23,42,0.08)] ${
                                                      roundIndex % 2 === 0
                                                        ? "border-blue-200 bg-blue-50/65 dark:border-blue-800 dark:bg-blue-950/35"
                                                        : "border-sky-200 bg-sky-100/55 dark:border-sky-800 dark:bg-sky-950/30"
                                                    }`}
                                                  >
                                                    <div
                                                      className={`px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white ${
                                                        roundIndex % 2 === 0
                                                          ? "border-b border-blue-200 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 dark:border-blue-800"
                                                          : "border-b border-sky-200 bg-gradient-to-r from-sky-900 via-blue-800 to-sky-700 dark:border-sky-800"
                                                      }`}
                                                    >
                                                      {round.label}
                                                    </div>
                                                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                                                      {round.matches.map(
                                                        (match, matchIndex) => {
                                                          const avg1 =
                                                            match.score1 !== null &&
                                                            match.innings1 &&
                                                            match.innings1 > 0
                                                              ? Math.trunc(
                                                                  (match.score1 /
                                                                    match.innings1) *
                                                                    1000,
                                                                ) / 1000
                                                              : null;
                                                          const avg2 =
                                                            match.score2 !== null &&
                                                            match.innings2 &&
                                                            match.innings2 > 0
                                                              ? Math.trunc(
                                                                  (match.score2 /
                                                                    match.innings2) *
                                                                    1000,
                                                                ) / 1000
                                                              : null;
                                                          const isExpanded =
                                                            deExpandedMatchId ===
                                                            match.id;
                                                          const showTieBreak =
                                                            typeof match.tieBreak1 === "number" ||
                                                            typeof match.tieBreak2 === "number";
                                                          const detailsGridClass = showTieBreak
                                                            ? "grid min-w-[860px] grid-cols-[minmax(180px,1.6fr)_repeat(8,minmax(56px,0.75fr))] items-center gap-3"
                                                            : "grid min-w-[800px] grid-cols-[minmax(180px,1.6fr)_repeat(7,minmax(56px,0.75fr))] items-center gap-3";

                                                          return (
                                                            <div key={match.id}>
                                                              <button
                                                                type="button"
                                                                onClick={() =>
                                                                  setDeExpandedMatchId(
                                                                    isExpanded
                                                                      ? null
                                                                      : match.id,
                                                                  )
                                                                }
                                                                className={`mx-auto grid w-[95%] min-w-0 grid-cols-[64px_minmax(280px,1fr)_40px_32px_40px_minmax(280px,1fr)_104px] items-center gap-1.5 px-3 py-3 text-left transition ${
                                                                  matchIndex % 2 === 0
                                                                    ? "bg-white/70 hover:bg-white dark:bg-slate-900/65 dark:hover:bg-slate-900"
                                                                    : "bg-blue-100/55 hover:bg-blue-100 dark:bg-blue-950/45 dark:hover:bg-blue-950/60"
                                                                }`}
                                                              >
                                                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                                  {`M${match.globalMatchNumber ?? match.displayMatchNumber ?? match.matchNumber ?? ""}`}
                                                                </div>
                                                                <div className="min-w-0">
                                                                  <div className="flex items-center justify-end gap-2 text-right">
                                                                    <span className="truncate font-semibold text-slate-900 dark:text-slate-100">
                                                                      {match.player1}
                                                                    </span>
                                                                    {match.player1FlagSrc ? (
                                                                      <img
                                                                        src={match.player1FlagSrc}
                                                                        alt={match.player1Country ?? "flag"}
                                                                        className="h-3.5 w-5 rounded-[2px] object-cover"
                                                                        loading="lazy"
                                                                        referrerPolicy="no-referrer"
                                                                      />
                                                                    ) : null}
                                                                  </div>
                                                                </div>
                                                                <div className="text-center font-semibold text-slate-800 dark:text-slate-100">
                                                                  {match.score1 ?? "-"}
                                                                </div>
                                                                <div className="text-center text-sm font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
                                                                  vs
                                                                </div>
                                                                <div className="text-center font-semibold text-slate-800 dark:text-slate-100">
                                                                  {match.score2 ?? "-"}
                                                                </div>
                                                                <div className="min-w-0">
                                                                  <div className="flex items-center gap-2">
                                                                    {match.player2FlagSrc ? (
                                                                      <img
                                                                        src={match.player2FlagSrc}
                                                                        alt={match.player2Country ?? "flag"}
                                                                        className="h-3.5 w-5 rounded-[2px] object-cover"
                                                                        loading="lazy"
                                                                        referrerPolicy="no-referrer"
                                                                      />
                                                                    ) : null}
                                                                    <span className="truncate font-semibold text-slate-900 dark:text-slate-100">
                                                                      {match.player2}
                                                                    </span>
                                                                  </div>
                                                                </div>
                                                                <div className="whitespace-pre-line text-right text-[11px] text-slate-500 dark:text-slate-400">
                                                                  {match.dateTime
                                                                    ? formatDateTimeForMatchCell(
                                                                        match.dateTime,
                                                                        timezoneOffsetMinutes,
                                                                        timezoneName,
                                                                      )
                                                                    : "Date"}
                                                                </div>
                                                              </button>
                                                              {isExpanded ? (
                                                                <div className="border-t border-slate-200 px-5 pb-5 dark:border-slate-800">
                                                                  <div className="mx-auto mt-4 w-[95%] max-w-[1600px] min-w-0 overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                                                                    <div className={`${detailsGridClass} text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400`}>
                                                                      <div>Player</div>
                                                                      <div className="text-center">Winner</div>
                                                                    <div className="text-center">MP</div>
                                                                    <div className="text-center">Points</div>
                                                                    <div className="text-center">Innings</div>
                                                                    <div className="text-center">Avg</div>
                                                                    <div className="text-center">H.R.1</div>
                                                                    <div className="text-center">H.R.2</div>
                                                                    {showTieBreak ? (
                                                                      <div className="text-center">T.B.</div>
                                                                    ) : null}
                                                                    </div>
                                                                    <div className="mt-3 space-y-2">
                                                                      <div className={`${detailsGridClass} text-sm text-gray-700 dark:text-gray-200`}>
                                                                        <div className="font-medium">
                                                                          {match.player1}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.winner1
                                                                            ? "Yes"
                                                                            : "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.matchPoints1 ??
                                                                            "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.score1 ??
                                                                            "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.innings1 ??
                                                                            "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {avg1 ??
                                                                            "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.highRun1 ??
                                                                            "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.highRun1Second ??
                                                                            "-"}
                                                                        </div>
                                                                        {showTieBreak ? (
                                                                          <div className="text-center">
                                                                            {match.tieBreak1 ??
                                                                              "-"}
                                                                          </div>
                                                                        ) : null}
                                                                      </div>
                                                                      <div className={`${detailsGridClass} text-sm text-gray-700 dark:text-gray-200`}>
                                                                        <div className="font-medium">
                                                                          {match.player2}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.winner2
                                                                            ? "Yes"
                                                                            : "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.matchPoints2 ??
                                                                            "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.score2 ??
                                                                            "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.innings2 ??
                                                                            "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {avg2 ??
                                                                            "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.highRun2 ??
                                                                            "-"}
                                                                        </div>
                                                                        <div className="text-center">
                                                                          {match.highRun2Second ??
                                                                            "-"}
                                                                        </div>
                                                                        {showTieBreak ? (
                                                                          <div className="text-center">
                                                                            {match.tieBreak2 ??
                                                                              "-"}
                                                                          </div>
                                                                        ) : null}
                                                                      </div>
                                                                    </div>
                                                                    <div className="mt-4 grid min-w-[860px] grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                                                                      <div className="text-left">
                                                                        Winner{" "}
                                                                        <span className="font-semibold text-gray-700 dark:text-gray-200">
                                                                          {match.winnerToGlobalMatchNumber
                                                                            ? `M${match.winnerToGlobalMatchNumber}`
                                                                            : round.label ===
                                                                                "Grand Final"
                                                                              ? "Champion"
                                                                              : "-"}
                                                                        </span>
                                                                      </div>
                                                                      <div className="text-right">
                                                                        Loser{" "}
                                                                        <span className="font-semibold text-gray-700 dark:text-gray-200">
                                                                          {match.loserToGlobalMatchNumber
                                                                            ? `M${match.loserToGlobalMatchNumber}`
                                                                            : "Out"}
                                                                        </span>
                                                                      </div>
                                                                    </div>
                                                                  </div>
                                                                </div>
                                                              ) : null}
                                                            </div>
                                                          );
                                                        },
                                                      )}
                                                    </div>
                                                  </section>
                                                ),
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="text-sm text-gray-500 dark:text-gray-400">
                                            No bracket matches
                                          </div>
                                        )
                                      ) : activeBracketRounds.length > 0 ? (
                                        <SingleElimBracket
                                          rounds={activeBracketRounds}
                                          onMatchClick={setSelectedBracketMatchId}
                                          timezoneOffsetMinutes={
                                            timezoneOffsetMinutes
                                          }
                                          timezoneName={timezoneName}
                                          searchQuery={playerSearchQuery}
                                        />
                                      ) : (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                          No bracket matches
                                        </div>
                                      )
                                    ) : (stageMatchGroups[stage.id] ?? [])
                                        .length === 0 ? (
                                      <div className="text-sm text-gray-500 dark:text-gray-400">
                                        No matches
                                      </div>
                                    ) : (
                                      <div className="flex flex-col gap-3">
                                        {filteredActiveStageGroups.length ===
                                        0 ? (
                                          <div className="text-sm text-gray-500 dark:text-gray-400">
                                            No players found.
                                          </div>
                                        ) : (
                                          <>
                                            <div className="hidden md:flex items-center gap-1.5 px-2.5 pb-1 text-gray-400 dark:text-gray-500">
                                              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                                <svg
                                                  className="h-4 w-4 shrink-0 opacity-0"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  viewBox="0 0 24 24"
                                                  aria-hidden="true"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 5l7 7-7 7"
                                                  />
                                                </svg>
                                                <span className="w-[92px] shrink-0 truncate font-semibold">
                                                  Group
                                                </span>
                                                <div
                                                  className="ml-5 grid min-w-0 flex-1 items-center gap-x-7"
                                                  style={{
                                                    gridTemplateColumns:
                                                      previewGridTemplateColumns ||
                                                      `repeat(${Math.max(previewHeaderCount, 1)}, minmax(0, 1fr))`,
                                                  }}
                                                >
                                                  {Array.from({
                                                    length: previewHeaderCount,
                                                  }).map((_, index) => (
                                                    <div
                                                      key={`preview-header-${index + 1}`}
                                                      className="truncate text-[11px] font-semibold uppercase tracking-[0.14em]"
                                                    >
                                                      Player {index + 1}
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            </div>
                                            {filteredActiveStageGroups.map(
                                          (group, groupIndex) => {
                                            const groupKey = getGroupKey(
                                              stage,
                                              group,
                                            );
                                            const previewPlayers =
                                              getGroupPreviewPlayers(
                                                group,
                                                playerSeedByDocumentId,
                                              );
                                            const isLargeGroup =
                                              previewPlayers.length > 4;
                                            const matchingPlayerIds =
                                              normalizedPlayerSearchQuery.length >
                                              0
                                                ? new Set(
                                                    previewPlayers
                                                      .filter((player) =>
                                                        playerMatchesSearch(
                                                          player,
                                                          playerSearchTerms,
                                                        ),
                                                      )
                                                      .map(
                                                        (player) =>
                                                          player.documentId ||
                                                          `${player.name}-${player.country || "xx"}`,
                                                      ),
                                                  )
                                                : new Set<string>();
                                            const hasSearchMatch =
                                              matchingPlayerIds.size > 0;
                                            const isExpanded =
                                              normalizedPlayerSearchQuery.length >
                                                0 && hasSearchMatch
                                                ? true
                                                : expandedGroups.has(groupKey);
                                            const visibleMatches =
                                              normalizedPlayerSearchQuery.length >
                                                0 &&
                                              isLargeGroup &&
                                              hasSearchMatch
                                                ? group.matches.filter((match) =>
                                                    [match.top.player, match.bottom.player].some(
                                                      (player) =>
                                                        matchingPlayerIds.has(
                                                          player.documentId ||
                                                            `${player.name}-${player.country || "xx"}`,
                                                        ),
                                                    ),
                                                  )
                                                : group.matches;
                                            const timetableGroupKey =
                                              stage.documentId &&
                                              group.number !== null
                                                ? `${stage.documentId}::${group.number}`
                                                : null;
                                            const timetableGroupSlots =
                                              timetableGroupKey
                                                ? groupTimetableSlotsByStageGroup.get(
                                                    timetableGroupKey,
                                                  ) ?? []
                                                : [];
                                            const groupMatchByDocumentId =
                                              new Map(
                                                group.matches
                                                  .filter(
                                                    (
                                                      match,
                                                    ): match is typeof match & {
                                                      matchDocumentId: string;
                                                    } =>
                                                      typeof match.matchDocumentId ===
                                                        "string" &&
                                                      match.matchDocumentId
                                                        .trim().length > 0,
                                                  )
                                                  .map((match) => [
                                                    match.matchDocumentId,
                                                    match,
                                                  ]),
                                              );
                                            const groupMatchByNumber = new Map(
                                              group.matches
                                                .filter(
                                                  (match) =>
                                                    match.matchNumber !== null,
                                                )
                                                .map((match) => [
                                                  match.matchNumber as number,
                                                  match,
                                                ]),
                                            );
                                            const buildPlayerPairKey = (
                                              top: {
                                                documentId: string | null;
                                                id: number | null;
                                                name: string;
                                              },
                                              bottom: {
                                                documentId: string | null;
                                                id: number | null;
                                                name: string;
                                              },
                                            ) =>
                                              [top, bottom]
                                                .map((player) =>
                                                  player.documentId
                                                    ? `doc:${player.documentId}`
                                                    : player.id !== null
                                                      ? `id:${player.id}`
                                                      : `name:${player.name.trim().toLowerCase()}`,
                                                )
                                                .sort()
                                                .join("::");
                                            const groupMatchByPlayerPair =
                                              new Map(
                                                group.matches.map((match) => [
                                                  buildPlayerPairKey(
                                                    match.top.player,
                                                    match.bottom.player,
                                                  ),
                                                  match,
                                                ]),
                                              );
                                            const tableRows = (() => {
                                              const buildFallbackPlayer = (
                                                label: string,
                                                country: string | null,
                                                placeholder: boolean,
                                              ) => ({
                                                id: null,
                                                documentId: null,
                                                name: label,
                                                nativeName: null,
                                                country: placeholder
                                                  ? null
                                                  : country,
                                                points: null,
                                                innings: null,
                                                highRun: null,
                                                highRun2: null,
                                                matchPoints: null,
                                              });

                                              const buildSlotDisplayPlayers = (
                                                slot: NormalizedTimetableSlot,
                                              ) => {
                                                const metadata =
                                                  slot.metadata ?? {};
                                                const topPlaceholder =
                                                  buildGroupSlotPlaceholderLabel(
                                                    metadata.placeholderLeftRole,
                                                    metadata.placeholderLeftMatchNumber,
                                                  );
                                                const bottomPlaceholder =
                                                  buildGroupSlotPlaceholderLabel(
                                                    metadata.placeholderRightRole,
                                                    metadata.placeholderRightMatchNumber,
                                                  );
                                                const topLabel =
                                                  slot.matchPlayer1Name ||
                                                  (typeof metadata
                                                    .placeholderLabel ===
                                                    "string" &&
                                                  metadata.placeholderLabel.includes(
                                                    " vs ",
                                                  )
                                                    ? metadata.placeholderLabel
                                                        .split(" vs ")[0]
                                                        ?.trim() || topPlaceholder
                                                    : topPlaceholder);
                                                const bottomLabel =
                                                  slot.matchPlayer2Name ||
                                                  (typeof metadata
                                                    .placeholderLabel ===
                                                    "string" &&
                                                  metadata.placeholderLabel.includes(
                                                    " vs ",
                                                  )
                                                    ? metadata.placeholderLabel
                                                        .split(" vs ")[1]
                                                        ?.trim() ||
                                                      bottomPlaceholder
                                                    : bottomPlaceholder);

                                                return {
                                                  top: {
                                                    label: topLabel,
                                                    player:
                                                      slot.matchPlayer1Name ||
                                                      slot.matchPlayer1Country
                                                        ? buildFallbackPlayer(
                                                            topLabel,
                                                            slot.matchPlayer1Country,
                                                            false,
                                                          )
                                                        : null,
                                                    placeholder:
                                                      !slot.matchPlayer1Name,
                                                  },
                                                  bottom: {
                                                    label: bottomLabel,
                                                    player:
                                                      slot.matchPlayer2Name ||
                                                      slot.matchPlayer2Country
                                                        ? buildFallbackPlayer(
                                                            bottomLabel,
                                                            slot.matchPlayer2Country,
                                                            false,
                                                          )
                                                        : null,
                                                    placeholder:
                                                      !slot.matchPlayer2Name,
                                                  },
                                                };
                                              };

                                              const dedupeRowsByMatch = <
                                                T extends {
                                                  key: string;
                                                  sourceMatch: StageMatchGroup["matches"][number] | null;
                                                  match: StageMatchGroup["matches"][number];
                                                },
                                              >(
                                                rows: T[],
                                              ) => {
                                                const seen = new Set<string>();
                                                return rows.filter((row) => {
                                                  const dedupeKey =
                                                    row.sourceMatch?.matchDocumentId
                                                      ? `doc:${row.sourceMatch.matchDocumentId}`
                                                      : row.sourceMatch?.key
                                                        ? `key:${row.sourceMatch.key}`
                                                        : row.match.matchDocumentId
                                                          ? `doc:${row.match.matchDocumentId}`
                                                          : `row:${row.key}`;
                                                  if (seen.has(dedupeKey)) return false;
                                                  seen.add(dedupeKey);
                                                  return true;
                                                });
                                              };

                                              const rows =
                                                timetableGroupSlots.length > 0
                                                  ? dedupeRowsByMatch(timetableGroupSlots.map(
                                                      (slot) => {
                                                        const metadata =
                                                          slot.metadata ?? {};
                                                        const slotPairKey =
                                                          buildPlayerPairKey(
                                                            {
                                                              documentId:
                                                                typeof metadata.resolvedPlayer1DocumentId ===
                                                                "string"
                                                                  ? metadata.resolvedPlayer1DocumentId
                                                                  : null,
                                                              id:
                                                                typeof metadata.resolvedPlayer1Id ===
                                                                "number"
                                                                  ? metadata.resolvedPlayer1Id
                                                                  : null,
                                                              name:
                                                                slot.matchPlayer1Name ||
                                                                "",
                                                            },
                                                            {
                                                              documentId:
                                                                typeof metadata.resolvedPlayer2DocumentId ===
                                                                "string"
                                                                  ? metadata.resolvedPlayer2DocumentId
                                                                  : null,
                                                              id:
                                                                typeof metadata.resolvedPlayer2Id ===
                                                                "number"
                                                                  ? metadata.resolvedPlayer2Id
                                                                  : null,
                                                              name:
                                                                slot.matchPlayer2Name ||
                                                                "",
                                                            },
                                                          );
                                                        let sourceMatch:
                                                          | StageMatchGroup["matches"][number]
                                                          | null = null;
                                                        if (slot.matchDocumentId) {
                                                          sourceMatch =
                                                            groupMatchByDocumentId.get(
                                                              slot.matchDocumentId,
                                                            ) ?? null;
                                                        }
                                                        if (
                                                          !sourceMatch &&
                                                          slot.matchNumber !== null
                                                        ) {
                                                          sourceMatch =
                                                            groupMatchByNumber.get(
                                                              slot.matchNumber,
                                                            ) ?? null;
                                                        }
                                                        if (
                                                          !sourceMatch &&
                                                          (slot.matchPlayer1Name ||
                                                            slot.matchPlayer2Name)
                                                        ) {
                                                          sourceMatch =
                                                            groupMatchByPlayerPair.get(
                                                              slotPairKey,
                                                            ) ?? null;
                                                        }
                                                        const match =
                                                          sourceMatch
                                                            ? {
                                                                ...sourceMatch,
                                                                dateTime:
                                                                  sourceMatch.dateTime ||
                                                                  slot.dateTime,
                                                              }
                                                            : {
                                                                key: `slot-${slot.documentId}`,
                                                                matchDocumentId:
                                                                  null,
                                                                matchNumber:
                                                                  slot.matchNumber,
                                                                round: null,
                                                                dateTime:
                                                                  slot.dateTime,
                                                                top: {
                                                                  player:
                                                                    buildFallbackPlayer(
                                                                      slot.matchPlayer1Name ||
                                                                        buildGroupSlotPlaceholderLabel(
                                                                          slot
                                                                            .metadata
                                                                            ?.placeholderLeftRole,
                                                                          slot
                                                                            .metadata
                                                                            ?.placeholderLeftMatchNumber,
                                                                        ),
                                                                      slot.matchPlayer1Country,
                                                                      !slot.matchPlayer1Name,
                                                                    ),
                                                                  outcome: null,
                                                                },
                                                                bottom: {
                                                                  player:
                                                                    buildFallbackPlayer(
                                                                      slot.matchPlayer2Name ||
                                                                        buildGroupSlotPlaceholderLabel(
                                                                          slot
                                                                            .metadata
                                                                            ?.placeholderRightRole,
                                                                          slot
                                                                            .metadata
                                                                            ?.placeholderRightMatchNumber,
                                                                        ),
                                                                      slot.matchPlayer2Country,
                                                                      !slot.matchPlayer2Name,
                                                                    ),
                                                                  outcome: null,
                                                                },
                                                              };
                                                        return {
                                                          key:
                                                            sourceMatch?.key ||
                                                            `slot-${slot.documentId}`,
                                                          match,
                                                          sourceMatch,
                                                          displayPlayers:
                                                            sourceMatch
                                                              ? resolveGroupMatchDisplay(
                                                                  group,
                                                                  sourceMatch,
                                                                )
                                                              : buildSlotDisplayPlayers(
                                                                  slot,
                                                                ),
                                                        };
                                                      },
                                                    ))
                                                  : visibleMatches.map(
                                                      (match) => ({
                                                        key: match.key,
                                                        match,
                                                        sourceMatch: match,
                                                        displayPlayers:
                                                          resolveGroupMatchDisplay(
                                                            group,
                                                            match,
                                                          ),
                                                      }),
                                                    );

                                              if (
                                                normalizedPlayerSearchQuery
                                                  .length > 0 &&
                                                isLargeGroup &&
                                                hasSearchMatch
                                              ) {
                                                return rows.filter((row) =>
                                                  [
                                                    row.displayPlayers.top
                                                      .player ?? {
                                                      name: row.displayPlayers
                                                        .top.label,
                                                      nativeName: null,
                                                      country: null,
                                                    },
                                                    row.displayPlayers.bottom
                                                      .player ?? {
                                                      name: row.displayPlayers
                                                        .bottom.label,
                                                      nativeName: null,
                                                      country: null,
                                                    },
                                                  ].some((player) =>
                                                    playerMatchesSearch(
                                                      player,
                                                      playerSearchTerms,
                                                    ),
                                                  ),
                                                );
                                              }

                                              return rows;
                                            })();
                                            const showGroupStandings =
                                              group.matches.some(
                                                hasPlayedStageMatch,
                                              ) &&
                                              !isLegacyBracketFallback &&
                                              !(
                                                normalizedPlayerSearchQuery.length >
                                                  0 &&
                                                isLargeGroup &&
                                                hasSearchMatch
                                              );

                                            return (
                                            <div
                                              key={group.key}
                                              className="flex flex-col gap-1.5"
                                            >
                                              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setExpandedGroups((prev) => {
                                                      const next = new Set(prev);
                                                      if (next.has(groupKey)) {
                                                        next.delete(groupKey);
                                                      } else {
                                                        next.add(groupKey);
                                                      }
                                                      return next;
                                                    });
                                                  }}
                                                  className={clsx(
                                                    "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800",
                                                    !isExpanded &&
                                                      (groupIndex % 2 === 0
                                                        ? "bg-gray-100/90 dark:bg-gray-800/60"
                                                        : "bg-gray-200/85 dark:bg-gray-700/60"),
                                                  )}
                                                >
                                                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                                    <svg
                                                      className={clsx(
                                                        "h-4 w-4 transition-transform",
                                                        isExpanded && "rotate-90",
                                                      )}
                                                      fill="none"
                                                      stroke="currentColor"
                                                      viewBox="0 0 24 24"
                                                    >
                                                      <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M9 5l7 7-7 7"
                                                      />
                                                    </svg>
                                                    <div className="w-[92px] shrink-0 truncate font-semibold text-gray-700 dark:text-gray-200">
                                                      {formatStageMatchLabel(stage, group)}
                                                    </div>
                                                    {!isExpanded ? (
                                                      <div
                                                        className="ml-5 grid min-w-0 flex-1 items-center gap-x-7 gap-y-1.5 text-[11px] font-normal text-gray-500 dark:text-gray-300"
                                                        style={{
                                                          gridTemplateColumns:
                                                            previewGridTemplateColumns ||
                                                            `repeat(${Math.max(Math.min(previewPlayers.length, previewColumnCount), 1)}, minmax(0, 1fr))`,
                                                        }}
                                                      >
                                                        {previewPlayers.map((player) => (
                                                          (() => {
                                                            const playerLabel =
                                                              getPreviewPlayerLabel(
                                                                player,
                                                              );
                                                            const isSearchMatch =
                                                              matchingPlayerIds.has(
                                                                player.documentId ||
                                                                  `${player.name}-${player.country || "xx"}`,
                                                              );

                                                            return (
                                                          <div
                                                            key={
                                                              player.documentId ||
                                                              `${player.name}-${player.country || "xx"}`
                                                            }
                                                            className="flex min-w-0 items-center gap-2"
                                                          >
                                                            {getCountryFlagCdnUrl(
                                                              player.country ?? null,
                                                              40,
                                                            ) ? (
                                                              <img
                                                                src={getCountryFlagCdnUrl(
                                                                  player.country ?? null,
                                                                  40,
                                                                )!}
                                                                alt={player.country || "flag"}
                                                                className="h-4 w-[22px] rounded-[2px] object-cover"
                                                                loading="lazy"
                                                                referrerPolicy="no-referrer"
                                                              />
                                                            ) : null}
                                                            <span
                                                              className={clsx(
                                                                "truncate leading-none font-semibold",
                                                                isSearchMatch &&
                                                                  "text-yellow-600 dark:text-yellow-300",
                                                              )}
                                                            >
                                                              {playerLabel}
                                                            </span>
                                                          </div>
                                                            );
                                                          })()
                                                        ))}
                                                      </div>
                                                    ) : null}
                                                  </div>
                                                </button>
                                              </div>
                                              {isExpanded ? (
                                              isBiathlonEvent(eventData) ? (
                                              <>
                                              <BiathlonGroupMatchesTable
                                                group={group}
                                                highlightPlayerIds={matchingPlayerIds}
                                              />
                                              <BiathlonStandingsTable
                                                standings={buildBiathlonStandings(group)}
                                              />
                                              </>
                                              ) : isFivePinsEvent(eventData) ? (
                                              <>
                                              <FivePinsGroupMatchesTable
                                                group={group}
                                                highlightPlayerIds={matchingPlayerIds}
                                              />
                                              <FivePinsStandingsTable
                                                standings={buildFivePinsStandings(group, {
                                                  expectedGroupSize: expectedFivePinsGroupSize,
                                                })}
                                              />
                                              </>
                                              ) : (
                                              <>
                                              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                                <table className="min-w-full text-xs">
                                                  <thead className="bg-blue-600 text-white">
                                                    <tr>
                                                      <th className="px-4 py-2 font-medium">
                                                        Player
                                                      </th>
                                                      <th className="px-4 py-2 font-medium">
                                                        Date
                                                      </th>
                                                      <th className="px-4 py-2 font-medium">
                                                        Result
                                                      </th>
                                                      <th className="px-4 py-2 font-medium">
                                                        Match Points
                                                      </th>
                                                      <th className="px-4 py-2 font-medium">
                                                        Points
                                                      </th>
                                                      <th className="px-4 py-2 font-medium">
                                                        {isArtisticEvent
                                                          ? "Possible points"
                                                          : "Innings"}
                                                      </th>
                                                      <th className="px-4 py-2 font-medium">
                                                        {isArtisticEvent
                                                          ? "%"
                                                          : "Average"}
                                                      </th>
                                                      <th className="px-4 py-2 font-medium">
                                                        {isArtisticEvent
                                                          ? "Best run"
                                                          : "High Run"}
                                                      </th>
                                                      {!isArtisticEvent && (
                                                        <th className="px-4 py-2 font-medium">
                                                          High Run 2
                                                        </th>
                                                      )}
                                                      <th className="px-4 py-2 font-medium">
                                                        Match sheet
                                                      </th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {tableRows.map((row) => (
                                                        <Fragment
                                                          key={row.key}
                                                        >
                                                          {(() => {
                                                            const match =
                                                              row.match;
                                                            const playerIds = [
                                                              match.top.player
                                                                .documentId,
                                                              match.bottom
                                                                .player
                                                                .documentId,
                                                            ]
                                                              .filter(
                                                                (
                                                                  value,
                                                                ): value is string =>
                                                                  typeof value ===
                                                                    "string" &&
                                                                  value.trim()
                                                                    .length > 0,
                                                              )
                                                              .sort();
                                                            const matchLiveKey =
                                                              playerIds.length ===
                                                                2 &&
                                                              row.sourceMatch &&
                                                              stage.documentId &&
                                                              group.number !=
                                                                null
                                                                ? `${stage.documentId}::${group.number}::${playerIds.join("::")}`
                                                                : null;
                                                            const liveSession =
                                                              (() => {
                                                                if (
                                                                  !row.sourceMatch
                                                                ) {
                                                                  return null;
                                                                }
                                                                if (
                                                                  matchLiveKey
                                                                ) {
                                                                  const directMatch =
                                                                    liveSessionByMatchKey.get(
                                                                      matchLiveKey,
                                                                    ) ?? null;
                                                                  if (
                                                                    directMatch
                                                                  )
                                                                    return directMatch;
                                                                }
                                                                const pairNameKey =
                                                                  [
                                                                    normalizeLiveName(
                                                                      match.top
                                                                        .player
                                                                        .name ||
                                                                        match
                                                                          .top
                                                                          .player
                                                                          .nativeName,
                                                                    ),
                                                                    normalizeLiveName(
                                                                      match
                                                                        .bottom
                                                                        .player
                                                                        .name ||
                                                                        match
                                                                          .bottom
                                                                          .player
                                                                          .nativeName,
                                                                    ),
                                                                  ]
                                                                    .filter(
                                                                      (
                                                                        value,
                                                                      ): value is string =>
                                                                        value.length >
                                                                        0,
                                                                    )
                                                                    .sort()
                                                                    .join("::");

                                                                if (
                                                                  pairNameKey
                                                                ) {
                                                                  const exactNameMatch =
                                                                    liveSessionByPlayerNames.get(
                                                                      pairNameKey,
                                                                    ) ?? null;
                                                                  if (
                                                                    exactNameMatch
                                                                  )
                                                                    return exactNameMatch;

                                                                  const stageScopedSessions =
                                                                    liveSessionsByStageId.get(
                                                                      stage.documentId,
                                                                    ) ?? [];
                                                                  const stageScopedMatch =
                                                                    stageScopedSessions.find(
                                                                      (session) => {
                                                                        const stagePairKey =
                                                                          [
                                                                            normalizeLiveName(
                                                                              session.player1Name,
                                                                            ),
                                                                            normalizeLiveName(
                                                                              session.player2Name,
                                                                            ),
                                                                          ]
                                                                            .filter(
                                                                              (
                                                                                value,
                                                                              ): value is string =>
                                                                                value.length >
                                                                                0,
                                                                            )
                                                                            .sort()
                                                                            .join("::");
                                                                        return (
                                                                          stagePairKey.length >
                                                                            0 &&
                                                                          stagePairKey ===
                                                                            pairNameKey
                                                                        );
                                                                      },
                                                                    ) ?? null;
                                                                  if (
                                                                    stageScopedMatch
                                                                  )
                                                                    return stageScopedMatch;
                                                                }

                                                                const expandedKeys =
                                                                  new Set<string>();
                                                                const topCandidates =
                                                                  [
                                                                    match.top
                                                                      .player
                                                                      .name,
                                                                    match.top
                                                                      .player
                                                                      .nativeName,
                                                                  ]
                                                                    .map(
                                                                      (value) =>
                                                                        normalizeLiveName(
                                                                          value,
                                                                        ),
                                                                    )
                                                                    .filter(
                                                                      (
                                                                        value,
                                                                      ): value is string =>
                                                                        value.length >
                                                                        0,
                                                                    );
                                                                const bottomCandidates =
                                                                  [
                                                                    match.bottom
                                                                      .player
                                                                      .name,
                                                                    match.bottom
                                                                      .player
                                                                      .nativeName,
                                                                  ]
                                                                    .map(
                                                                      (value) =>
                                                                        normalizeLiveName(
                                                                          value,
                                                                        ),
                                                                    )
                                                                    .filter(
                                                                      (
                                                                        value,
                                                                      ): value is string =>
                                                                        value.length >
                                                                        0,
                                                                    );
                                                                topCandidates.forEach(
                                                                  (topName) => {
                                                                    bottomCandidates.forEach(
                                                                      (
                                                                        bottomName,
                                                                      ) => {
                                                                        expandedKeys.add(
                                                                          [
                                                                            topName,
                                                                            bottomName,
                                                                          ]
                                                                            .sort()
                                                                            .join(
                                                                              "::",
                                                                            ),
                                                                        );
                                                                      },
                                                                    );
                                                                  },
                                                                );
                                                                for (const candidateKey of expandedKeys) {
                                                                  const candidate =
                                                                    liveSessionByPlayerNames.get(
                                                                      candidateKey,
                                                                    );
                                                                  if (candidate)
                                                                    return candidate;
                                                                }
                                                                return null;
                                                              })();
                                                            const liveSessionId =
                                                              liveSession?.documentId ||
                                                              liveSession?.id ||
                                                              null;
                                                            const hasActiveLiveSession =
                                                              Boolean(liveSessionId) &&
                                                              liveSession?.sessionStatus ===
                                                                "in_progress";

                                                            const topLiveSide =
                                                              resolveLivePlayerSide({
                                                                playerDocumentId:
                                                                  match.top.player.documentId,
                                                                playerName:
                                                                  match.top.player.name,
                                                                playerNativeName:
                                                                  match.top.player.nativeName,
                                                                session: liveSession,
                                                                normalizeLiveName,
                                                              });
                                                            const bottomLiveSide =
                                                              resolveLivePlayerSide({
                                                                playerDocumentId:
                                                                  match.bottom.player.documentId,
                                                                playerName:
                                                                  match.bottom.player.name,
                                                                playerNativeName:
                                                                  match.bottom.player.nativeName,
                                                                session: liveSession,
                                                                normalizeLiveName,
                                                              });

                                                            const getLiveValue = (
                                                              side: "A" | "B" | null,
                                                              keyA:
                                                                | "scoreA"
                                                                | "inningsA"
                                                                | "bestRunA",
                                                              keyB:
                                                                | "scoreB"
                                                                | "inningsB"
                                                                | "bestRunB",
                                                            ) => {
                                                              if (
                                                                !hasActiveLiveSession ||
                                                                !liveSession?.state ||
                                                                !side
                                                              ) {
                                                                return null;
                                                              }
                                                              return side === "A"
                                                                ? toNumber(
                                                                    liveSession.state[keyA],
                                                                  )
                                                                : toNumber(
                                                                    liveSession.state[keyB],
                                                                  );
                                                            };

                                                            const topLivePoints =
                                                              getLiveValue(
                                                                topLiveSide,
                                                                "scoreA",
                                                                "scoreB",
                                                              );
                                                            const bottomLivePoints =
                                                              getLiveValue(
                                                                bottomLiveSide,
                                                                "scoreA",
                                                                "scoreB",
                                                              );
                                                            const topLiveInnings =
                                                              getLiveValue(
                                                                topLiveSide,
                                                                "inningsA",
                                                                "inningsB",
                                                              );
                                                            const bottomLiveInnings =
                                                              getLiveValue(
                                                                bottomLiveSide,
                                                                "inningsA",
                                                                "inningsB",
                                                              );
                                                            const topLiveHighRun =
                                                              getLiveValue(
                                                                topLiveSide,
                                                                "bestRunA",
                                                                "bestRunB",
                                                              );
                                                            const bottomLiveHighRun =
                                                              getLiveValue(
                                                                bottomLiveSide,
                                                                "bestRunA",
                                                                "bestRunB",
                                                              );

                                                            const matchPlayed =
                                                              [match.top, match.bottom].some(
                                                                (entry) =>
                                                                  entry.outcome !==
                                                                    null ||
                                                                  (entry.player
                                                                    .points ?? 0) >
                                                                    0 ||
                                                                  (entry.player
                                                                    .innings ?? 0) >
                                                                    0 ||
                                                                  (entry.player
                                                                    .highRun ?? 0) >
                                                                    0 ||
                                                                  (entry.player
                                                                    .highRun2 ?? 0) >
                                                                    0 ||
                                                                  (entry.player
                                                                    .matchPoints ??
                                                                    0) > 0,
                                                              );
                                                            const hasMeaningfulLiveStats =
                                                              [
                                                                topLivePoints,
                                                                bottomLivePoints,
                                                                topLiveInnings,
                                                                bottomLiveInnings,
                                                                topLiveHighRun,
                                                                bottomLiveHighRun,
                                                              ].some(
                                                                (value) =>
                                                                  value !== null &&
                                                                  value > 0,
                                                              );
                                                            const shouldUseLiveOverlay =
                                                              hasActiveLiveSession &&
                                                              (!matchPlayed ||
                                                                hasMeaningfulLiveStats);

                                                            const topDisplayPoints =
                                                              shouldUseLiveOverlay &&
                                                              topLivePoints !== null
                                                                ? topLivePoints
                                                                : match.top.player.points;
                                                            const bottomDisplayPoints =
                                                              shouldUseLiveOverlay &&
                                                              bottomLivePoints !== null
                                                                ? bottomLivePoints
                                                                : match.bottom.player.points;
                                                            const topDisplayInnings =
                                                              shouldUseLiveOverlay &&
                                                              topLiveInnings !== null
                                                                ? topLiveInnings
                                                                : match.top.player.innings;
                                                            const bottomDisplayInnings =
                                                              shouldUseLiveOverlay &&
                                                              bottomLiveInnings !== null
                                                                ? bottomLiveInnings
                                                                : match.bottom.player.innings;
                                                            const topDisplayHighRun =
                                                              shouldUseLiveOverlay &&
                                                              topLiveHighRun !== null
                                                                ? topLiveHighRun
                                                                : match.top.player.highRun;
                                                            const bottomDisplayHighRun =
                                                              shouldUseLiveOverlay &&
                                                              bottomLiveHighRun !== null
                                                                ? bottomLiveHighRun
                                                                : match.bottom.player.highRun;

                                                            const displayPlayers =
                                                              row.displayPlayers;
                                                            const matchHasLiveOverlay =
                                                              shouldUseLiveOverlay;
                                                            const displayMatchValue = (
                                                              value: number | null,
                                                            ) =>
                                                              matchPlayed ||
                                                              matchHasLiveOverlay
                                                                ? formatNumberValue(
                                                                    value,
                                                                  )
                                                                : "-";
                                                            const displayMatchAverage =
                                                              (
                                                                points: number | null,
                                                                innings: number | null,
                                                              ) =>
                                                                matchPlayed ||
                                                                matchHasLiveOverlay
                                                                  ? formatAverage(
                                                                      points,
                                                                      innings,
                                                                    )
                                                                  : "-";
                                                            const matchSheetDetail =
                                                              Array.isArray(
                                                                liveSession?.state?.inningsDetail,
                                                              )
                                                                ? liveSession.state.inningsDetail
                                                                : extractMatchSheetInningsDetail(
                                                                    row.sourceMatch?.inningsDetail ??
                                                                      row.sourceMatch?.matchSheetJson,
                                                                  );
                                                            const canOpenMatchSheet =
                                                              matchPlayed &&
                                                              !hasActiveLiveSession &&
                                                              (hasFinishedSessionStatus(
                                                                liveSession?.sessionStatus,
                                                              ) ||
                                                                !liveSession ||
                                                                liveSession?.sessionStatus !==
                                                                  "in_progress") &&
                                                              matchSheetDetail.some(
                                                                (entry) =>
                                                                  Number.isFinite(
                                                                    entry?.inning,
                                                                  ) &&
                                                                  entry.inning > 0,
                                                              );
                                                            const matchSheetSession: EventLiveSession =
                                                              {
                                                                id:
                                                                  liveSession?.id ??
                                                                  `match-${match.key}`,
                                                                documentId:
                                                                  liveSession?.documentId ??
                                                                  `match-${match.key}`,
                                                                eventId:
                                                                  liveSession?.eventId ??
                                                                  eventId ??
                                                                  null,
                                                                eventStageId:
                                                                  liveSession?.eventStageId ??
                                                                  stage.documentId,
                                                                groupNumber:
                                                                  liveSession?.groupNumber ??
                                                                  group.number,
                                                                screenIdentifier:
                                                                  liveSession?.screenIdentifier ??
                                                                  null,
                                                                player1DocumentId:
                                                                  liveSession?.player1DocumentId ??
                                                                  match.top.player.documentId,
                                                                player2DocumentId:
                                                                  liveSession?.player2DocumentId ??
                                                                  match.bottom.player.documentId,
                                                                player1Name:
                                                                  liveSession?.player1Name ??
                                                                  match.top.player.name,
                                                                player2Name:
                                                                  liveSession?.player2Name ??
                                                                  match.bottom.player.name,
                                                                sessionStatus:
                                                                  liveSession?.sessionStatus ??
                                                                  "completed",
                                                                state: {
                                                                  ...(liveSession?.state ?? {}),
                                                                  playerAName:
                                                                    liveSession?.state?.playerAName ??
                                                                    displayPlayers.top.label,
                                                                  playerBName:
                                                                    liveSession?.state?.playerBName ??
                                                                    displayPlayers.bottom.label,
                                                                  playerACountry:
                                                                    liveSession?.state?.playerACountry ??
                                                                    match.top.player.country,
                                                                  playerBCountry:
                                                                    liveSession?.state?.playerBCountry ??
                                                                    match.bottom.player.country,
                                                                  scoreA:
                                                                    liveSession?.state?.scoreA ??
                                                                    topDisplayPoints,
                                                                  scoreB:
                                                                    liveSession?.state?.scoreB ??
                                                                    bottomDisplayPoints,
                                                                  inningsA:
                                                                    liveSession?.state?.inningsA ??
                                                                    topDisplayInnings,
                                                                  inningsB:
                                                                    liveSession?.state?.inningsB ??
                                                                    bottomDisplayInnings,
                                                                  inningsCount:
                                                                    liveSession?.state?.inningsCount ??
                                                                    Math.max(
                                                                      topDisplayInnings ?? 0,
                                                                      bottomDisplayInnings ?? 0,
                                                                    ),
                                                                  bestRunA:
                                                                    liveSession?.state?.bestRunA ??
                                                                    topDisplayHighRun,
                                                                  bestRunB:
                                                                    liveSession?.state?.bestRunB ??
                                                                    bottomDisplayHighRun,
                                                                  bestRun2A:
                                                                    liveSession?.state?.bestRun2A ??
                                                                    match.top.player.highRun2,
                                                                  bestRun2B:
                                                                    liveSession?.state?.bestRun2B ??
                                                                    match.bottom.player.highRun2,
                                                                  inningsDetail:
                                                                    matchSheetDetail,
                                                                },
                                                              };
                                                            const matchSheetTitle = `${
                                                              displayPlayers.top.label ||
                                                              match.top.player.name ||
                                                              "Player A"
                                                            } vs ${
                                                              displayPlayers.bottom.label ||
                                                              match.bottom.player.name ||
                                                              "Player B"
                                                            }`;
                                                            const matchSheetSubtitle = [
                                                              stage.title,
                                                              formatStageMatchLabel(stage, group, row.sourceMatch),
                                                              !isBracketStage(stage) &&
                                                              row.sourceMatch?.matchNumber !== null &&
                                                              row.sourceMatch?.matchNumber !== undefined
                                                                ? `Match ${row.sourceMatch.matchNumber}`
                                                                : null,
                                                            ]
                                                              .filter(Boolean)
                                                              .join(" / ");

                                                            return (
                                                              <>
                                                                <tr
                                                                  className={clsx(
                                                                    "border-t-[3px] border-white dark:border-white text-gray-700 dark:text-gray-200",
                                                                    getMatchRowClass(
                                                                      match.top
                                                                        .outcome,
                                                                    ),
                                                                  )}
                                                                >
                                                                  <td className="px-4 py-2 font-medium">
                                                                    {displayPlayers
                                                                      .top
                                                                      .player
                                                                      ?.id &&
                                                                    !displayPlayers
                                                                      .top
                                                                      .placeholder ? (
                                                                      <Link
                                                                        href={playerProfileHref(
                                                                          displayPlayers
                                                                            .top
                                                                            .player
                                                                            .id,
                                                                          displayPlayers
                                                                            .top
                                                                            .label,
                                                                        )}
                                                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                                                                      >
                                                                        <PlayerNameWithFlag
                                                                          name={
                                                                            displayPlayers
                                                                              .top
                                                                              .label
                                                                          }
                                                                          nativeName={
                                                                            displayPlayers
                                                                              .top
                                                                              .placeholder
                                                                              ? null
                                                                              : displayPlayers
                                                                                  .top
                                                                                  .player
                                                                                  ?.nativeName
                                                                          }
                                                                          showNativeName={showNativePlayerNames}
                                                                          country={
                                                                            displayPlayers
                                                                              .top
                                                                              .placeholder
                                                                              ? null
                                                                              : displayPlayers
                                                                                  .top
                                                                                  .player
                                                                                  ?.country
                                                                          }
                                                                          highlight={playerMatchesSearch(
                                                                            displayPlayers
                                                                              .top
                                                                              .player ?? {
                                                                                name:
                                                                                  displayPlayers
                                                                                    .top
                                                                                    .label,
                                                                                nativeName:
                                                                                  null,
                                                                                country:
                                                                                  null,
                                                                              },
                                                                            playerSearchTerms,
                                                                          )}
                                                                        />
                                                                      </Link>
                                                                    ) : (
                                                                      <PlayerNameWithFlag
                                                                        name={
                                                                          displayPlayers
                                                                            .top
                                                                            .label
                                                                        }
                                                                        nativeName={
                                                                          displayPlayers
                                                                            .top
                                                                            .placeholder
                                                                            ? null
                                                                            : displayPlayers
                                                                                .top
                                                                                .player
                                                                                ?.nativeName
                                                                        }
                                                                        showNativeName={showNativePlayerNames}
                                                                        country={
                                                                          displayPlayers
                                                                            .top
                                                                            .placeholder
                                                                            ? null
                                                                            : displayPlayers
                                                                                .top
                                                                                .player
                                                                                ?.country
                                                                        }
                                                                        highlight={playerMatchesSearch(
                                                                          displayPlayers
                                                                            .top
                                                                            .player ?? {
                                                                              name:
                                                                                displayPlayers
                                                                                  .top
                                                                                  .label,
                                                                              nativeName:
                                                                                null,
                                                                              country:
                                                                                null,
                                                                            },
                                                                          playerSearchTerms,
                                                                        )}
                                                                      />
                                                                    )}
                                                                  </td>
                                                                  <td
                                                                    className={clsx(
                                                                      "px-4 py-2",
                                                                      getDateCellClass(),
                                                                    )}
                                                                    rowSpan={2}
                                                                  >
                                                                    {hasActiveLiveSession ? (
                                                                      <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                          if (liveSessionId) {
                                                                            onLiveMatchOpen?.(liveSessionId);
                                                                          }
                                                                        }}
                                                                        className="flex min-h-[72px] w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-200 px-4 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-amber-950 shadow-sm transition hover:bg-amber-100"
                                                                        style={{ animation: "btLivePulse 1.25s ease-in-out infinite" }}
                                                                      >
                                                                        <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                                                                        <span>Live</span>
                                                                      </button>
                                                                    ) : (
                                                                      <div className="flex min-h-[72px] items-center justify-center">
                                                                        <span className="whitespace-pre-line text-center">
                                                                          {formatDateTimeForMatchCell(
                                                                            match.dateTime,
                                                                            timezoneOffsetMinutes,
                                                                            timezoneName,
                                                                          )}
                                                                        </span>
                                                                      </div>
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center font-semibold">
                                                                    {formatOutcomeLabel(
                                                                      match.top
                                                                        .outcome,
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center">
                                                                    {displayMatchValue(
                                                                      match.top
                                                                        .player
                                                                        .matchPoints,
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center">
                                                                    {displayMatchValue(
                                                                      topDisplayPoints,
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center">
                                                                    {displayMatchValue(
                                                                      topDisplayInnings,
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center">
                                                                    {displayMatchAverage(
                                                                      topDisplayPoints,
                                                                      topDisplayInnings,
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center">
                                                                    {displayMatchValue(
                                                                      topDisplayHighRun,
                                                                    )}
                                                                  </td>
                                                                  {!isArtisticEvent && (
                                                                    <td className="px-4 py-2 text-center">
                                                                      {displayMatchValue(
                                                                        match.top
                                                                          .player
                                                                          .highRun2,
                                                                      )}
                                                                    </td>
                                                                  )}
                                                                  <td
                                                                    className="bg-white px-4 py-2 text-center dark:bg-slate-950"
                                                                    rowSpan={2}
                                                                  >
                                                                    <div className="flex min-h-[72px] items-center justify-center">
                                                                      {canOpenMatchSheet ? (
                                                                        <button
                                                                          type="button"
                                                                          onClick={() =>
                                                                            setSelectedMatchSheet({
                                                                              title: matchSheetTitle,
                                                                              subtitle:
                                                                                matchSheetSubtitle ||
                                                                                null,
                                                                              session:
                                                                                matchSheetSession,
                                                                            })
                                                                          }
                                                                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-500 dark:hover:bg-cyan-950/40"
                                                                          title="Match sheet"
                                                                          aria-label={`Open match sheet for ${matchSheetTitle}`}
                                                                        >
                                                                          <List className="h-5 w-5" />
                                                                        </button>
                                                                      ) : (
                                                                        <span className="text-slate-300 dark:text-slate-600">
                                                                          -
                                                                        </span>
                                                                      )}
                                                                    </div>
                                                                  </td>
                                                                </tr>
                                                                <tr
                                                                  className={clsx(
                                                                    "border-b-[5px] border-white dark:border-white text-gray-700 dark:text-gray-200",
                                                                    getMatchRowClass(
                                                                      match
                                                                        .bottom
                                                                        .outcome,
                                                                    ),
                                                                  )}
                                                                >
                                                                  <td className="px-4 py-2 font-medium">
                                                                    {displayPlayers
                                                                      .bottom
                                                                      .player
                                                                      ?.id &&
                                                                    !displayPlayers
                                                                      .bottom
                                                                      .placeholder ? (
                                                                      <Link
                                                                        href={playerProfileHref(
                                                                          displayPlayers
                                                                            .bottom
                                                                            .player
                                                                            .id,
                                                                          displayPlayers
                                                                            .bottom
                                                                            .label,
                                                                        )}
                                                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                                                                      >
                                                                        <PlayerNameWithFlag
                                                                          name={
                                                                            displayPlayers
                                                                              .bottom
                                                                              .label
                                                                          }
                                                                          nativeName={
                                                                            displayPlayers
                                                                              .bottom
                                                                              .placeholder
                                                                              ? null
                                                                              : displayPlayers
                                                                                  .bottom
                                                                                  .player
                                                                                  ?.nativeName
                                                                          }
                                                                          showNativeName={showNativePlayerNames}
                                                                          country={
                                                                            displayPlayers
                                                                              .bottom
                                                                              .placeholder
                                                                              ? null
                                                                              : displayPlayers
                                                                                  .bottom
                                                                                  .player
                                                                                  ?.country
                                                                          }
                                                                          highlight={playerMatchesSearch(
                                                                            displayPlayers
                                                                              .bottom
                                                                              .player ?? {
                                                                                name:
                                                                                  displayPlayers
                                                                                    .bottom
                                                                                    .label,
                                                                                nativeName:
                                                                                  null,
                                                                                country:
                                                                                  null,
                                                                              },
                                                                            playerSearchTerms,
                                                                          )}
                                                                        />
                                                                      </Link>
                                                                    ) : (
                                                                      <PlayerNameWithFlag
                                                                        name={
                                                                          displayPlayers
                                                                            .bottom
                                                                            .label
                                                                        }
                                                                        nativeName={
                                                                          displayPlayers
                                                                            .bottom
                                                                            .placeholder
                                                                            ? null
                                                                            : displayPlayers
                                                                                .bottom
                                                                                .player
                                                                                ?.nativeName
                                                                        }
                                                                        showNativeName={showNativePlayerNames}
                                                                        country={
                                                                          displayPlayers
                                                                            .bottom
                                                                            .placeholder
                                                                            ? null
                                                                            : displayPlayers
                                                                                .bottom
                                                                                .player
                                                                                ?.country
                                                                        }
                                                                        highlight={playerMatchesSearch(
                                                                          displayPlayers
                                                                            .bottom
                                                                            .player ?? {
                                                                              name:
                                                                                displayPlayers
                                                                                  .bottom
                                                                                  .label,
                                                                              nativeName:
                                                                                null,
                                                                              country:
                                                                                null,
                                                                            },
                                                                          playerSearchTerms,
                                                                        )}
                                                                      />
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center font-semibold">
                                                                    {formatOutcomeLabel(
                                                                      match
                                                                        .bottom
                                                                        .outcome,
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center">
                                                                    {displayMatchValue(
                                                                      match
                                                                        .bottom
                                                                        .player
                                                                        .matchPoints,
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center">
                                                                    {displayMatchValue(
                                                                      bottomDisplayPoints,
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center">
                                                                    {displayMatchValue(
                                                                      bottomDisplayInnings,
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center">
                                                                    {displayMatchAverage(
                                                                      bottomDisplayPoints,
                                                                      bottomDisplayInnings,
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-2 text-center">
                                                                    {displayMatchValue(
                                                                      bottomDisplayHighRun,
                                                                    )}
                                                                  </td>
                                                                  {!isArtisticEvent && (
                                                                    <td className="px-4 py-2 text-center">
                                                                      {displayMatchValue(
                                                                        match
                                                                          .bottom
                                                                          .player
                                                                          .highRun2,
                                                                      )}
                                                                    </td>
                                                                  )}
                                                                </tr>
                                                              </>
                                                            );
                                                          })()}
                                                        </Fragment>
                                                      ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                              {showGroupStandings ? (
                                                <GroupStandingsTable
                                                  standings={buildGroupStandings(
                                                    group.matches,
                                                    {
                                                      artistic: isArtisticEvent,
                                                      suppressBestAverage: suppressDerivedBestAverage,
                                                    },
                                                  )}
                                                  embedded={embedded}
                                                  artistic={isArtisticEvent}
                                                  showNativeNames={showNativePlayerNames}
                                                  tournamentContextSlug={tournamentContextSlug}
                                                />
                                              ) : null}
                                              </>
                                              )
                                              ) : null}
                                            </div>
                                            );
                                          },
                                            )}
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>
      {selectedMatchSheet ? (
        <MatchSheetModal
          data={selectedMatchSheet}
          onClose={() => setSelectedMatchSheet(null)}
        />
      ) : null}
      {selectedBracketMatch ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedBracketMatchId(null)}
        >
          <div
            className="w-full max-w-5xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
              <div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Match Details
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                  {selectedBracketMatch.roundLabel}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBracketMatchId(null)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Close
              </button>
            </div>
            <div className="overflow-x-auto p-5">
              {isBiathlonEvent(eventData) ? (
                <BiathlonBracketModal
                  match={selectedBracketMatch.match}
                  roundLabel={selectedBracketMatch.roundLabel}
                />
              ) : isFivePinsEvent(eventData) ? (
                <FivePinsBracketModal
                  match={selectedBracketMatch.match}
                  roundLabel={selectedBracketMatch.roundLabel}
                />
              ) : (
              <div>
              <div className={`${selectedBracketDetailsGridClass} text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400`}>
                <div>Player</div>
                <div className="text-center">Winner</div>
                <div className="text-center">MP</div>
                <div className="text-center">Points</div>
                <div className="text-center">Innings</div>
                <div className="text-center">Avg</div>
                <div className="text-center">H.R.1</div>
                <div className="text-center">H.R.2</div>
                {selectedBracketShowsTieBreak ? (
                  <div className="text-center">T.B.</div>
                ) : null}
              </div>
              <div className="mt-3 space-y-2">
                {[
                  {
                    name:
                      selectedBracketMatch.match.player1 ||
                      (selectedBracketMatch.match.byeTop
                        ? "BYE"
                        : getBracketModalPlaceholder({
                            roundIndex: selectedBracketMatch.roundIndex,
                            roundMatchIndex: selectedBracketMatch.matchIndex,
                            side: 1,
                            firstRoundMatchCount:
                              selectedBracketMatch.firstRoundMatchCount,
                            globalMatchNumber:
                              selectedBracketMatch.match.globalMatchNumber,
                            sourceMatchNumber:
                              activeBracketIncomingMatchNumbers.get(
                                selectedBracketMatch.match.id,
                              )?.[0] ?? null,
                          })),
                    winner: selectedBracketMatch.match.winner1,
                    score: selectedBracketMatch.match.ffTop
                      ? "F.F."
                      : (selectedBracketMatch.match.score1 ?? "-"),
                    innings: selectedBracketMatch.match.innings1,
                    avg:
                      selectedBracketMatch.match.score1 !== null &&
                      selectedBracketMatch.match.innings1 &&
                      selectedBracketMatch.match.innings1 > 0
                        ? Math.trunc(
                            (selectedBracketMatch.match.score1 /
                              selectedBracketMatch.match.innings1) *
                              1000,
                          ) / 1000
                        : null,
                    hr1: selectedBracketMatch.match.highRun1,
                    hr2: selectedBracketMatch.match.highRun1Second,
                    mp: selectedBracketMatch.match.matchPoints1,
                    tb: selectedBracketMatch.match.tieBreak1,
                    country: selectedBracketMatch.match.player1Country ?? null,
                  },
                  {
                    name:
                      selectedBracketMatch.match.player2 ||
                      (selectedBracketMatch.match.byeBottom
                        ? "BYE"
                        : getBracketModalPlaceholder({
                            roundIndex: selectedBracketMatch.roundIndex,
                            roundMatchIndex: selectedBracketMatch.matchIndex,
                            side: 2,
                            firstRoundMatchCount:
                              selectedBracketMatch.firstRoundMatchCount,
                            globalMatchNumber:
                              selectedBracketMatch.match.globalMatchNumber,
                            sourceMatchNumber:
                              activeBracketIncomingMatchNumbers.get(
                                selectedBracketMatch.match.id,
                              )?.[1] ?? null,
                          })),
                    winner: selectedBracketMatch.match.winner2,
                    score: selectedBracketMatch.match.ffBottom
                      ? "F.F."
                      : (selectedBracketMatch.match.score2 ?? "-"),
                    innings: selectedBracketMatch.match.innings2,
                    avg:
                      selectedBracketMatch.match.score2 !== null &&
                      selectedBracketMatch.match.innings2 &&
                      selectedBracketMatch.match.innings2 > 0
                        ? Math.trunc(
                            (selectedBracketMatch.match.score2 /
                              selectedBracketMatch.match.innings2) *
                              1000,
                          ) / 1000
                        : null,
                    hr1: selectedBracketMatch.match.highRun2,
                    hr2: selectedBracketMatch.match.highRun2Second,
                    mp: selectedBracketMatch.match.matchPoints2,
                    tb: selectedBracketMatch.match.tieBreak2,
                    country: selectedBracketMatch.match.player2Country ?? null,
                  },
                ].map((row) => {
                  const flagSrc = getCountryFlagCdnUrl(row.country, 40);
                  return (
                    <div
                      key={row.name}
                      className={`${selectedBracketDetailsGridClass} rounded-xl border border-gray-100 px-3 py-3 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-200`}
                    >
                      <div className="flex min-w-0 items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
                        <span className="flex h-4 w-5 shrink-0 items-center justify-center">
                          {flagSrc ? (
                            <img
                              src={flagSrc}
                              alt={row.country || "flag"}
                              className="h-3.5 w-5 rounded-[2px] object-cover"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          ) : null}
                        </span>
                        <span className="truncate">{row.name}</span>
                      </div>
                      <div className="text-center">{row.winner ? "Yes" : "-"}</div>
                      <div className="text-center">{row.mp ?? "-"}</div>
                      <div className="text-center">{row.score}</div>
                      <div className="text-center">{row.innings ?? "-"}</div>
                      <div className="text-center">
                        {typeof row.avg === "number"
                          ? formatTruncatedAverage(row.avg)
                          : "-"}
                      </div>
                      <div className="text-center">{row.hr1 ?? "-"}</div>
                      <div className="text-center">{row.hr2 ?? "-"}</div>
                      {selectedBracketShowsTieBreak ? (
                        <div className="text-center">{row.tb ?? "-"}</div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              </div>
              )}
              <div className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
                {selectedBracketMatch.match.date
                  ? (() => {
                      const shifted = formatDateTimeWithOffset(
                        selectedBracketMatch.match.date,
                        timezoneOffsetMinutes,
                        timezoneName,
                      );
                      return `Date: ${shifted ? `${shifted.date}, ${shifted.time}` : new Date(selectedBracketMatch.match.date).toLocaleString("el-GR", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}`;
                    })()
                  : "Date: -"}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function TournamentEventsPage() {
  return (
    <Suspense
      fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}
    >
      <TournamentEventsContent />
    </Suspense>
  );
}
