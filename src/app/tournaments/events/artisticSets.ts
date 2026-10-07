"use client";

import type { EventApiResponse } from "./types";

/** Local copy of the shared helper — keeps this module free of import cycles. */
const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

/**
 * CEB Artistic 2026-2027 (ruleset `artistic_ceb_2026_2027_v1`, profile
 * `artistic_ceb_2026`): best of 5 sets of 7 figures, set win = 2 match points,
 * ranking criteria Match points -> sets won -> sets lost -> % -> best run.
 *
 * Match sheet contract (written by the scoreboard and the admin, stored in
 * `bt_group.match_sheet_json`):
 * - `scoring_mode`: "sets"
 * - `sets_config`: { best_of, sets_to_win, figures_per_set }
 * - `sets_result[]`: { set_number, letter, player1_points, player2_points,
 *    player1_innings, player2_innings, winner, tie_break, tie_break_winner,
 *    figures_played }  (player*_innings carries the POSSIBLE points of the set)
 * - `setScore`: { player1, player2 } — sets won, authoritative
 * - `caromsTotal`: { player1, player2 } — solved points of the match
 */

export const ARTISTIC_SETS_DEFAULT_BEST_OF = 5;
export const ARTISTIC_SETS_DEFAULT_SETS_TO_WIN = 3;
export const ARTISTIC_SETS_DEFAULT_FIGURES_PER_SET = 7;

/** `artistic_ceb_2026` (profile) and `artistic_ceb_2026_2027_v1` (key) both match. */
export const isArtisticSetsRuleset = (value: unknown): boolean =>
  typeof value === "string" && /artistic[_-]ceb[_-]20\d\d/i.test(value.trim());

/** Detect the 2026-2027 artistic ruleset from the event payload. */
export function isArtisticSetsEvent(payload: EventApiResponse | null | undefined): boolean {
  const event = payload?.data;
  if (!event) return false;
  if (isArtisticSetsRuleset(event.ruleset_key)) return true;
  if (isArtisticSetsRuleset((event as { base_ruleset_key?: unknown }).base_ruleset_key)) {
    return true;
  }
  const tournament = event.tournament;
  if (tournament && typeof tournament === "object" && "ruleset_key" in tournament) {
    if (isArtisticSetsRuleset((tournament as { ruleset_key?: unknown }).ruleset_key)) {
      return true;
    }
  }
  return false;
}

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const normalizeSide = (value: unknown): "player1" | "player2" | null => {
  if (typeof value === "number") {
    if (value === 1) return "player1";
    if (value === 2) return "player2";
    return null;
  }
  if (typeof value !== "string") return null;
  const text = value.trim().toLowerCase();
  if (text === "player1" || text === "1" || text === "a" || text === "side1") return "player1";
  if (text === "player2" || text === "2" || text === "b" || text === "side2") return "player2";
  return null;
};

const normalizeLetter = (row: Record<string, unknown>, index: number): string | null => {
  const raw = row.letter;
  if (typeof raw === "string" && raw.trim().length > 0) return raw.trim().toUpperCase();
  const setNumber = toNumber(row.set_number);
  const order = setNumber && setNumber > 0 ? setNumber : index + 1;
  if (order >= 1 && order <= 26) return String.fromCharCode(64 + order);
  return null;
};

export type ArtisticSetRow = {
  setNumber: number;
  letter: string | null;
  player1Points: number;
  player2Points: number;
  /** Possible points (sum of the coefficients of the figures played). */
  player1Possible: number;
  player2Possible: number;
  player1HighRun: number | null;
  player2HighRun: number | null;
  winner: "player1" | "player2" | null;
  tieBreak: boolean;
  tieBreakWinner: "player1" | "player2" | null;
  figuresPlayed: number | null;
  finished: boolean;
};

export type ArtisticSetSummary = {
  sets: ArtisticSetRow[];
  bestOf: number;
  setsToWin: number;
  figuresPerSet: number;
  setsWon: { player1: number; player2: number } | null;
  totalPoints: { player1: number; player2: number };
  totalPossible: { player1: number; player2: number };
  highestRun: { player1: number | null; player2: number | null };
  /** true when the sheet actually carries set rows. */
  hasSetData: boolean;
};

export function readArtisticSetSummary(
  matchSheetJson: unknown,
  fallback?: {
    player1_points?: unknown;
    player2_points?: unknown;
    player1_innings?: unknown;
    player2_innings?: unknown;
    player1_high_run?: unknown;
    player2_high_run?: unknown;
  } | null,
): ArtisticSetSummary {
  const sheet = toRecord(matchSheetJson);
  const rawSets = Array.isArray(sheet?.sets_result) ? (sheet.sets_result as unknown[]) : [];
  const sets: ArtisticSetRow[] = rawSets
    .map((row, index) => {
      const record = toRecord(row);
      if (!record) return null;
      const setNumber = toNumber(record.set_number) ?? index + 1;
      return {
        setNumber,
        letter: normalizeLetter(record, index),
        player1Points: toNumber(record.player1_points) ?? 0,
        player2Points: toNumber(record.player2_points) ?? 0,
        player1Possible: toNumber(record.player1_innings) ?? 0,
        player2Possible: toNumber(record.player2_innings) ?? 0,
        player1HighRun: toNumber(record.player1_high_run),
        player2HighRun: toNumber(record.player2_high_run),
        winner: normalizeSide(record.winner),
        tieBreak: record.tie_break === true || record.tie_break === "true",
        tieBreakWinner: normalizeSide(record.tie_break_winner),
        figuresPlayed: toNumber(record.figures_played),
        finished: record.finished === true || record.finished === "true",
      } satisfies ArtisticSetRow;
    })
    .filter((row): row is ArtisticSetRow => Boolean(row))
    .sort((a, b) => a.setNumber - b.setNumber);

  const config = toRecord(sheet?.sets_config);
  const bestOf = toNumber(config?.best_of) ?? ARTISTIC_SETS_DEFAULT_BEST_OF;
  const setsToWin = toNumber(config?.sets_to_win) ?? ARTISTIC_SETS_DEFAULT_SETS_TO_WIN;
  const figuresPerSet =
    toNumber(config?.figures_per_set) ?? ARTISTIC_SETS_DEFAULT_FIGURES_PER_SET;

  const setScore = toRecord(sheet?.setScore);
  let setsWon: { player1: number; player2: number } | null = null;
  const score1 = toNumber(setScore?.player1);
  const score2 = toNumber(setScore?.player2);
  if (score1 !== null || score2 !== null) {
    setsWon = { player1: score1 ?? 0, player2: score2 ?? 0 };
  } else if (sets.length > 0) {
    setsWon = {
      player1: sets.filter((set) => set.winner === "player1").length,
      player2: sets.filter((set) => set.winner === "player2").length,
    };
  }

  const totals = toRecord(sheet?.caromsTotal);
  const total1 = toNumber(totals?.player1);
  const total2 = toNumber(totals?.player2);
  const totalPoints =
    total1 !== null || total2 !== null
      ? { player1: total1 ?? 0, player2: total2 ?? 0 }
      : sets.length > 0
        ? {
            player1: sets.reduce((acc, set) => acc + set.player1Points, 0),
            player2: sets.reduce((acc, set) => acc + set.player2Points, 0),
          }
        : {
            player1: toNumber(fallback?.player1_points) ?? 0,
            player2: toNumber(fallback?.player2_points) ?? 0,
          };

  const possibleSum = {
    player1: sets.reduce((acc, set) => acc + set.player1Possible, 0),
    player2: sets.reduce((acc, set) => acc + set.player2Possible, 0),
  };
  const totalPossible =
    possibleSum.player1 > 0 || possibleSum.player2 > 0
      ? possibleSum
      : {
          player1: toNumber(fallback?.player1_innings) ?? 0,
          player2: toNumber(fallback?.player2_innings) ?? 0,
        };

  const highRunFromSets = {
    player1: sets.reduce<number | null>(
      (acc, set) => (set.player1HighRun === null ? acc : Math.max(acc ?? 0, set.player1HighRun)),
      null,
    ),
    player2: sets.reduce<number | null>(
      (acc, set) => (set.player2HighRun === null ? acc : Math.max(acc ?? 0, set.player2HighRun)),
      null,
    ),
  };
  const highestRun = {
    player1: highRunFromSets.player1 ?? toNumber(fallback?.player1_high_run),
    player2: highRunFromSets.player2 ?? toNumber(fallback?.player2_high_run),
  };

  return {
    sets,
    bestOf,
    setsToWin,
    figuresPerSet,
    setsWon,
    totalPoints,
    totalPossible,
    highestRun,
    hasSetData: sets.length > 0,
  };
}

/**
 * CEB Artistic 2026-2027 group order: Match points -> sets won -> sets lost ->
 * % -> best run. Coefficients and the direct encounter are applied by the
 * ranking engine; the tables here mirror the published order without inventing
 * coefficients.
 */
export function compareArtisticSetsMetrics(
  a: {
    totalMatchPoints: number;
    setsWon: number;
    setsLost: number;
    points: number;
    possible: number;
    highRun: number | null;
    playerName: string;
  },
  b: typeof a,
  options: { includeHighRun?: boolean } = {},
): number {
  const includeHighRun = options.includeHighRun !== false;
  if (a.totalMatchPoints !== b.totalMatchPoints) return b.totalMatchPoints - a.totalMatchPoints;
  if (a.setsWon !== b.setsWon) return b.setsWon - a.setsWon;
  if (a.setsLost !== b.setsLost) return a.setsLost - b.setsLost;
  const pctA = a.possible > 0 ? a.points / a.possible : -1;
  const pctB = b.possible > 0 ? b.points / b.possible : -1;
  if (pctA !== pctB) return pctB - pctA;
  if (includeHighRun) {
    const hrA = a.highRun ?? -1;
    const hrB = b.highRun ?? -1;
    if (hrA !== hrB) return hrB - hrA;
  }
  return a.playerName.localeCompare(b.playerName);
}
