"use client";

import { Fragment } from "react";
import clsx from "clsx";
import type { StageMatchGroup } from "./types";
import {
  formatTruncatedNumber,
  getMatchOutcome,
  hasPlayedStageMatch,
} from "./utils";

/* ------------------------------------------------------------------ */
/* Biathlon (CEB national teams: 5-pins + 3-cushion per board)         */
/* ------------------------------------------------------------------ */

type EventApiResponse = { data?: Record<string, unknown> | null } | null | undefined;

const isBiathlonRuleset = (value: unknown): boolean =>
  typeof value === "string" && /biathlon/i.test(value.trim());

const isBiathlonGameType = (value: unknown): boolean =>
  typeof value === "string" && /biathlon/i.test(value.trim());

/** Detect biathlon from event payload (ruleset_key or game_type). */
export function isBiathlonEvent(payload: EventApiResponse): boolean {
  const event = payload?.data;
  if (!event) return false;
  if (isBiathlonGameType(event.game_type)) return true;
  if (isBiathlonRuleset(event.ruleset_key)) return true;
  const tournament = event.tournament;
  if (tournament && typeof tournament === "object" && "ruleset_key" in tournament) {
    if (isBiathlonRuleset((tournament as { ruleset_key?: unknown }).ruleset_key)) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Board helpers (read from matchSheetJson.boardResults)               */
/* ------------------------------------------------------------------ */

type BiathlonBoard = {
  boardIndex?: number | null;
  gameType?: string | null;
  player1Points?: number | null;
  player2Points?: number | null;
  player1Innings?: number | null;
  player2Innings?: number | null;
  player1HighRun?: number | null;
  player2HighRun?: number | null;
};

const toRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

type BiathlonBoardSplit = {
  board5p: BiathlonBoard | null; // 5-pins board
  board3c: BiathlonBoard | null; // 3-cushion board
};

export function readBiathlonBoards(matchSheetJson: unknown): BiathlonBoardSplit {
  const sheet = toRecord(matchSheetJson);
  const rawBoards = Array.isArray(sheet.boardResults) ? (sheet.boardResults as unknown[]) : [];
  const boards = rawBoards.map((row) => toRecord(row)).filter((row) => Object.keys(row).length > 0);
  let board5p: BiathlonBoard | null = null;
  let board3c: BiathlonBoard | null = null;
  for (const board of boards) {
    const gameType = typeof board.gameType === "string" ? board.gameType.toLowerCase() : "";
    const normalized: BiathlonBoard = {
      boardIndex: toNumber(board.boardIndex),
      gameType: typeof board.gameType === "string" ? board.gameType : null,
      player1Points: toNumber(board.player1Points),
      player2Points: toNumber(board.player2Points),
      player1Innings: toNumber(board.player1Innings),
      player2Innings: toNumber(board.player2Innings),
      player1HighRun: toNumber(board.player1HighRun),
      player2HighRun: toNumber(board.player2HighRun),
    };
    if (/5[- ]?pins|5pins/i.test(gameType)) board5p = normalized;
    else if (/3c|cushion|carom|3[- ]?c/i.test(gameType)) board3c = normalized;
  }
  // Fallback: boards without gameType — first = 5-pins, second = 3-cushion
  if (!board5p && !board3c && boards.length >= 2) {
    board5p = boards[0];
    board3c = boards[1];
  }
  return { board5p, board3c };
}

/** CEB 3-cushion average: (3C points / 4) / 3C innings. */
const computeBiathlon3cAverage = (board: BiathlonBoard | null): number | null => {
  const points = board?.player1Points ?? null;
  const innings = board?.player1Innings ?? null;
  if (points === null || innings === null || innings === 0) return null;
  const caroms = points / 4;
  return Math.trunc((caroms / innings) * 1000) / 1000;
};

/* ------------------------------------------------------------------ */
/* Biathlon standing (CEB qualification ranking)                       */
/* ------------------------------------------------------------------ */

export type BiathlonStanding = {
  key: string;
  playerId: number | null;
  playerName: string;
  playerNativeName: string | null;
  playerCountry: string | null;
  groupNumber: number | null;
  groupPosition: number | null;
  record: { wins: number; draws: number; losses: number };
  matchPoints: number; // MP
  points5p: number; // 5P points
  points3c: number; // 3C points (x4)
  innings3c: number; // 3C INN
  average3c: number | null; // 3C avg
  highRun3c: number | null; // 3C HR
  pointsFor: number; // TOT+ (5P + 3C)
  pointsAgainst: number; // TOT- (PT)
  teamAverage: number | null; // TOT+ / TOT-
  diff: number; // TOT+ - TOT-
  place: number;
};

/** CEB biathlon qualification sort: MP desc → group position asc → diff desc. */
const compareBiathlonStandings = (
  a: BiathlonStanding,
  b: BiathlonStanding,
): number => {
  if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints;
  const posA = a.groupPosition ?? 9999;
  const posB = b.groupPosition ?? 9999;
  if (posA !== posB) return posA - posB;
  if (b.diff !== a.diff) return b.diff - a.diff;
  return a.playerName.localeCompare(b.playerName);
};

export function buildBiathlonStandings(group: StageMatchGroup): BiathlonStanding[] {
  const byPlayerKey = new Map<string, BiathlonStanding>();

  const seed = (player: StageMatchGroup["matches"][number]["top"]["player"], groupNumber: number | null): BiathlonStanding => {
    const key = player.documentId || `${player.name}-${player.country || "xx"}`;
    const existing = byPlayerKey.get(key);
    if (existing) return existing;
    const standing: BiathlonStanding = {
      key,
      playerId: player.id,
      playerName: player.name,
      playerNativeName: player.nativeName ?? null,
      playerCountry: player.country,
      groupNumber,
      groupPosition: null,
      record: { wins: 0, draws: 0, losses: 0 },
      matchPoints: 0,
      points5p: 0,
      points3c: 0,
      innings3c: 0,
      average3c: null,
      highRun3c: null,
      pointsFor: 0,
      pointsAgainst: 0,
      teamAverage: null,
      diff: 0,
      place: 0,
    };
    byPlayerKey.set(key, standing);
    return standing;
  };

  group.matches.forEach((match) => {
    const { top, bottom } = match;
    const topStanding = seed(top.player, group.number);
    const bottomStanding = seed(bottom.player, group.number);
    if (!hasPlayedStageMatch(match)) return;

    const outcome = getMatchOutcome(top.player, bottom.player);
    if (outcome === "W") topStanding.record.wins += 1;
    else if (outcome === "D") topStanding.record.draws += 1;
    else if (outcome === "L") topStanding.record.losses += 1;
    if (outcome) {
      const bottomOutcome = outcome === "W" ? "L" : outcome === "L" ? "W" : "D";
      if (bottomOutcome === "W") bottomStanding.record.wins += 1;
      else if (bottomOutcome === "D") bottomStanding.record.draws += 1;
      else if (bottomOutcome === "L") bottomStanding.record.losses += 1;
    }

    topStanding.matchPoints += top.player.matchPoints ?? 0;
    bottomStanding.matchPoints += bottom.player.matchPoints ?? 0;

    const topFor = top.player.points ?? 0;
    const bottomFor = bottom.player.points ?? 0;
    topStanding.pointsFor += topFor;
    topStanding.pointsAgainst += bottomFor;
    bottomStanding.pointsFor += bottomFor;
    bottomStanding.pointsAgainst += topFor;

    const { board5p, board3c } = readBiathlonBoards(match.matchSheetJson);
    if (board5p) {
      topStanding.points5p += board5p.player1Points ?? 0;
      bottomStanding.points5p += board5p.player2Points ?? 0;
    }
    if (board3c) {
      topStanding.points3c += board3c.player1Points ?? 0;
      topStanding.innings3c += board3c.player1Innings ?? 0;
      topStanding.highRun3c = Math.max(
        topStanding.highRun3c ?? 0,
        board3c.player1HighRun ?? 0,
      );
      bottomStanding.points3c += board3c.player2Points ?? 0;
      bottomStanding.innings3c += board3c.player2Innings ?? 0;
      bottomStanding.highRun3c = Math.max(
        bottomStanding.highRun3c ?? 0,
        board3c.player2HighRun ?? 0,
      );
    }
  });

  const standings = Array.from(byPlayerKey.values());
  const sortedByGroup = [...standings].sort((a, b) => {
    const posA = a.record.wins * 1000 + a.pointsFor;
    const posB = b.record.wins * 1000 + b.pointsFor;
    return posB - posA;
  });
  // assign group positions (within this group)
  const groupNumber = group.number;
  const groupRows = sortedByGroup.filter((row) => row.groupNumber === groupNumber);
  groupRows.forEach((row, index) => {
    row.groupPosition = index + 1;
  });

  standings.forEach((standing) => {
    standing.average3c =
      standing.innings3c > 0 && standing.points3c > 0
        ? Math.trunc((standing.points3c / 4 / standing.innings3c) * 1000) / 1000
        : null;
    standing.teamAverage =
      standing.pointsAgainst > 0
        ? Math.trunc((standing.pointsFor / standing.pointsAgainst) * 1000) / 1000
        : null;
    standing.diff = standing.pointsFor - standing.pointsAgainst;
  });

  const ranked = [...standings].sort(compareBiathlonStandings);
  ranked.forEach((standing, index) => {
    standing.place = index + 1;
  });
  return ranked;
}

/* ------------------------------------------------------------------ */
/* Biathlon group matches table (CEB format)                           */
/* ------------------------------------------------------------------ */

const formatBiathlonValue = (value: number | null): string => {
  if (value === null || !Number.isFinite(value)) return "-";
  return String(value);
};

export function BiathlonGroupMatchesTable({
  group,
  highlightPlayerIds = new Set(),
}: {
  group: StageMatchGroup;
  highlightPlayerIds?: Set<string>;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full text-xs">
        <thead className="bg-blue-600 text-white">
          <tr>
            <th className="px-4 py-2 font-medium">Team</th>
            <th className="px-4 py-2 font-medium text-center">MP</th>
            <th className="px-4 py-2 font-medium text-center">5P</th>
            <th className="px-4 py-2 font-medium text-center">3C x4</th>
            <th className="px-4 py-2 font-medium text-center">3C INN</th>
            <th className="px-4 py-2 font-medium text-center">3C AVG</th>
            <th className="px-4 py-2 font-medium text-center">3C HR</th>
            <th className="px-4 py-2 font-medium text-center">TOT</th>
            <th className="px-4 py-2 font-medium text-center">Diff.</th>
          </tr>
        </thead>
        <tbody>
          {group.matches.map((match) => {
            const { top, bottom } = match;
            const played = hasPlayedStageMatch(match);
            const topHighlight = top.player.documentId
              ? highlightPlayerIds.has(top.player.documentId)
              : false;
            const bottomHighlight = bottom.player.documentId
              ? highlightPlayerIds.has(bottom.player.documentId)
              : false;
            const { board5p, board3c } = readBiathlonBoards(match.matchSheetJson);
            const top5p = board5p;
            const top3c = board3c;
            const bottom5p = board5p;
            const bottom3c = board3c;

            const topRow = [
              {
                mp: top.player.matchPoints,
                fiveP: top5p?.player1Points ?? null,
                threeC: top3c?.player1Points ?? null,
                inn: top3c?.player1Innings ?? null,
                avg: computeBiathlon3cAverage(top3c),
                hr: top3c?.player1HighRun ?? null,
                tot: top.player.points,
                diff: played ? (top.player.points ?? 0) - (bottom.player.points ?? 0) : null,
              },
              {
                mp: bottom.player.matchPoints,
                fiveP: bottom5p?.player2Points ?? null,
                threeC: bottom3c?.player2Points ?? null,
                inn: bottom3c?.player2Innings ?? null,
                avg: (() => {
                  const points = bottom3c?.player2Points ?? null;
                  const innings = bottom3c?.player2Innings ?? null;
                  if (points === null || innings === null || innings === 0) return null;
                  return Math.trunc((points / 4 / innings) * 1000) / 1000;
                })(),
                hr: bottom3c?.player2HighRun ?? null,
                tot: bottom.player.points,
                diff: played ? (bottom.player.points ?? 0) - (top.player.points ?? 0) : null,
              },
            ];
            const topOutcome = getMatchOutcome(top.player, bottom.player);
            const bottomOutcome = getMatchOutcome(bottom.player, top.player);

            return (
              <Fragment key={match.key}>
                <tr
                  className={clsx(
                    "border-t border-gray-200 dark:border-gray-700",
                    topOutcome === "W" && "bg-emerald-50/60 dark:bg-emerald-900/20",
                    topOutcome === "L" && "bg-rose-50/40 dark:bg-rose-900/10",
                  )}
                >
                  <td className={clsx("px-4 py-2 font-medium", topHighlight && "text-yellow-600 dark:text-yellow-300")}>
                    {top.player.name}
                  </td>
                  <td className="px-4 py-2 text-center">{formatBiathlonValue(topRow[0].mp)}</td>
                  <td className="px-4 py-2 text-center">{formatBiathlonValue(topRow[0].fiveP)}</td>
                  <td className="px-4 py-2 text-center">{formatBiathlonValue(topRow[0].threeC)}</td>
                  <td className="px-4 py-2 text-center">{formatBiathlonValue(topRow[0].inn)}</td>
                  <td className="px-4 py-2 text-center">
                    {topRow[0].avg === null ? "-" : formatTruncatedNumber(topRow[0].avg, 3)}
                  </td>
                  <td className="px-4 py-2 text-center">{formatBiathlonValue(topRow[0].hr)}</td>
                  <td className="px-4 py-2 text-center font-semibold">{formatBiathlonValue(topRow[0].tot)}</td>
                  <td className="px-4 py-2 text-center">{formatBiathlonValue(topRow[0].diff)}</td>
                </tr>
                <tr
                  className={clsx(
                    "border-t border-gray-200 dark:border-gray-700",
                    bottomOutcome === "W" && "bg-emerald-50/60 dark:bg-emerald-900/20",
                    bottomOutcome === "L" && "bg-rose-50/40 dark:bg-rose-900/10",
                  )}
                >
                  <td className={clsx("px-4 py-2 font-medium", bottomHighlight && "text-yellow-600 dark:text-yellow-300")}>
                    {bottom.player.name}
                  </td>
                  <td className="px-4 py-2 text-center">{formatBiathlonValue(topRow[1].mp)}</td>
                  <td className="px-4 py-2 text-center">{formatBiathlonValue(topRow[1].fiveP)}</td>
                  <td className="px-4 py-2 text-center">{formatBiathlonValue(topRow[1].threeC)}</td>
                  <td className="px-4 py-2 text-center">{formatBiathlonValue(topRow[1].inn)}</td>
                  <td className="px-4 py-2 text-center">
                    {topRow[1].avg === null ? "-" : formatTruncatedNumber(topRow[1].avg, 3)}
                  </td>
                  <td className="px-4 py-2 text-center">{formatBiathlonValue(topRow[1].hr)}</td>
                  <td className="px-4 py-2 text-center font-semibold">{formatBiathlonValue(topRow[1].tot)}</td>
                  <td className="px-4 py-2 text-center">{formatBiathlonValue(topRow[1].diff)}</td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Biathlon unified qualification ranking (all groups merged)          */
/* ------------------------------------------------------------------ */

export function buildBiathlonUnifiedStandings(groups: StageMatchGroup[]): BiathlonStanding[] {
  const all: BiathlonStanding[] = [];
  groups.forEach((group) => {
    const groupStandings = buildBiathlonStandings(group);
    groupStandings.forEach((standing) => {
      standing.groupNumber = group.number;
    });
    all.push(...groupStandings);
  });
  return all.sort(compareBiathlonStandings);
}

export function BiathlonUnifiedRankingTable({
  groups,
  showGroupColumn = true,
}: {
  groups: StageMatchGroup[];
  showGroupColumn?: boolean;
}) {
  const standings = buildBiathlonUnifiedStandings(groups);
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead className="bg-blue-600 text-white">
            <tr className="bg-blue-700/95 text-[11px] uppercase tracking-wide text-blue-50">
              <th className="px-4 py-2" />
              <th className="px-4 py-2" />
              {showGroupColumn && <th className="px-4 py-2" />}
              <th className="px-4 py-2 text-center">MP</th>
              <th className="px-4 py-2 text-center">5P</th>
              <th className="px-4 py-2 text-center">3C x4</th>
              <th className="px-4 py-2 text-center">3C INN</th>
              <th className="px-4 py-2 text-center">3C AVG</th>
              <th className="px-4 py-2 text-center">TOT</th>
              <th className="px-4 py-2 text-center">PT</th>
              <th className="px-4 py-2 text-center">AVG</th>
              <th className="px-4 py-2 text-center">DIFF</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((standing, index) => (
              <tr key={standing.key} className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-4 py-2">{index + 1}</td>
                <td className="px-4 py-2 font-medium">{standing.playerName}</td>
                {showGroupColumn && (
                  <td className="px-4 py-2 text-center text-gray-500 dark:text-gray-400">
                    {standing.groupNumber ?? "-"}
                  </td>
                )}
                <td className="px-4 py-2 text-center font-semibold">{standing.matchPoints}</td>
                <td className="px-4 py-2 text-center">{standing.points5p}</td>
                <td className="px-4 py-2 text-center">{standing.points3c}</td>
                <td className="px-4 py-2 text-center">{standing.innings3c}</td>
                <td className="px-4 py-2 text-center">
                  {standing.average3c === null ? "-" : formatTruncatedNumber(standing.average3c, 3)}
                </td>
                <td className="px-4 py-2 text-center font-semibold">{standing.pointsFor}</td>
                <td className="px-4 py-2 text-center">{standing.pointsAgainst}</td>
                <td className="px-4 py-2 text-center">
                  {standing.teamAverage === null ? "-" : formatTruncatedNumber(standing.teamAverage, 3)}
                </td>
                <td className="px-4 py-2 text-center">{standing.diff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Biathlon KO bracket match modal (CEB labels)                        */
/* ------------------------------------------------------------------ */

export function BiathlonBracketModal({
  match,
  roundLabel,
}: {
  match: { player1: string; player2: string; winner1?: boolean; winner2?: boolean; matchPoints1?: number | null; matchPoints2?: number | null; score1?: number | null; score2?: number | null; matchSheetJson?: unknown };
  roundLabel: string;
}) {
  const { board5p, board3c } = readBiathlonBoards(match.matchSheetJson);
  const sideRows = [
    {
      name: match.player1 || "BYE",
      winner: match.winner1,
      mp: match.matchPoints1 ?? null,
      fiveP: board5p?.player1Points ?? null,
      threeC: board3c?.player1Points ?? null,
      inn: board3c?.player1Innings ?? null,
      hr: board3c?.player1HighRun ?? null,
      tot: match.score1 ?? null,
    },
    {
      name: match.player2 || "BYE",
      winner: match.winner2,
      mp: match.matchPoints2 ?? null,
      fiveP: board5p?.player2Points ?? null,
      threeC: board3c?.player2Points ?? null,
      inn: board3c?.player2Innings ?? null,
      hr: board3c?.player2HighRun ?? null,
      tot: match.score2 ?? null,
    },
  ];
  const avgOf = (row: (typeof sideRows)[number]): number | null => {
    const points = row.threeC;
    const innings = row.inn;
    if (points === null || innings === null || innings === 0) return null;
    return Math.trunc((points / 4 / innings) * 1000) / 1000;
  };
  const diffOf = (row: (typeof sideRows)[number]): number | null => {
    const tot = row.tot;
    const opponentTot =
      row === sideRows[0] ? sideRows[1].tot : sideRows[0].tot;
    if (tot === null || opponentTot === null) return null;
    return tot - opponentTot;
  };
  const headers = ["Team", "Winner", "MP", "5P", "3C x4", "3C INN", "3C AVG", "3C HR", "TOT", "Diff."];
  const gridCols = `minmax(160px,1.4fr) repeat(${headers.length - 1},minmax(52px,0.7fr))`;
  const gridClass = "grid items-center gap-3 text-xs";
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
          {sideRows.map((row) => {
            const avg = avgOf(row);
            const diff = diffOf(row);
            return (
              <div
                key={row.name}
                className={`${gridClass} px-3 py-3 text-gray-700 dark:text-gray-200`}
                style={{ gridTemplateColumns: gridCols }}
              >
                <div className="min-w-0 truncate font-semibold text-gray-900 dark:text-gray-100">
                  {row.name}
                </div>
                <div className="text-center">{row.winner ? "Yes" : "-"}</div>
                <div className="text-center">{row.mp ?? "-"}</div>
                <div className="text-center">{row.fiveP ?? "-"}</div>
                <div className="text-center">{row.threeC ?? "-"}</div>
                <div className="text-center">{row.inn ?? "-"}</div>
                <div className="text-center">
                  {avg === null ? "-" : formatTruncatedNumber(avg, 3)}
                </div>
                <div className="text-center">{row.hr ?? "-"}</div>
                <div className="text-center font-semibold">{row.tot ?? "-"}</div>
                <div className="text-center">{diff ?? "-"}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Biathlon standings table (CEB qualification ranking)                */
/* ------------------------------------------------------------------ */

export function BiathlonStandingsTable({
  standings,
}: {
  standings: BiathlonStanding[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full text-xs">
        <thead className="bg-blue-600 text-white">
          <tr>
            <th className="px-4 py-2 font-medium">#</th>
            <th className="px-4 py-2 font-medium">Team</th>
            <th className="px-4 py-2 font-medium text-center">MP</th>
            <th className="px-4 py-2 font-medium text-center">5P</th>
            <th className="px-4 py-2 font-medium text-center">3C x4</th>
            <th className="px-4 py-2 font-medium text-center">3C INN</th>
            <th className="px-4 py-2 font-medium text-center">3C AVG</th>
            <th className="px-4 py-2 font-medium text-center">TOT</th>
            <th className="px-4 py-2 font-medium text-center">PT</th>
            <th className="px-4 py-2 font-medium text-center">AVG</th>
            <th className="px-4 py-2 font-medium text-center">DIFF</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((standing) => (
            <tr
              key={standing.key}
              className="border-t border-gray-200 dark:border-gray-700"
            >
              <td className="px-4 py-2">{standing.place}</td>
              <td className="px-4 py-2 font-medium">{standing.playerName}</td>
              <td className="px-4 py-2 text-center font-semibold">{standing.matchPoints}</td>
              <td className="px-4 py-2 text-center">{standing.points5p}</td>
              <td className="px-4 py-2 text-center">{standing.points3c}</td>
              <td className="px-4 py-2 text-center">{standing.innings3c}</td>
              <td className="px-4 py-2 text-center">
                {standing.average3c === null ? "-" : formatTruncatedNumber(standing.average3c, 3)}
              </td>
              <td className="px-4 py-2 text-center font-semibold">{standing.pointsFor}</td>
              <td className="px-4 py-2 text-center">{standing.pointsAgainst}</td>
              <td className="px-4 py-2 text-center">
                {standing.teamAverage === null ? "-" : formatTruncatedNumber(standing.teamAverage, 3)}
              </td>
              <td className="px-4 py-2 text-center">{standing.diff}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
