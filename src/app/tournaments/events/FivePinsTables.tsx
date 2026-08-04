"use client";

import { Fragment, useMemo } from "react";
import clsx from "clsx";
import type {
  EventApiResponse,
  NormalizedGroupPlayer,
  StageMatchGroup,
} from "./types";
import {
  toRelationArray,
  normalizeEntity,
  toNumber,
  formatNumberValue,
  formatRecord,
  hasPlayedStageMatch,
  getMatchOutcome,
  getMatchRowClass,
} from "./utils";
import { getCountryFlagCdnUrl } from "@/lib/countryFlags";

/**
 * 5-Pins (sets-based) tables shared by the tournament event views.
 *
 * Data model (server-side, `setScoringCalculator.ts`):
 * - `matchSheetJson.sets_result`: array of { set_number, player1_points, player2_points, winner, finished }
 * - `matchSheetJson.setScore`: { player1, player2 } — sets won totals (authoritative)
 * - `matchSheetJson.caromsTotal`: { player1, player2 } — total points
 * - CEB `umb_5pins_sets` set points: winner `bestOf - opponentSetsWon`, loser own sets won
 */

export const isFivePinsGameType = (value: unknown): boolean =>
  typeof value === "string" && /five[- ]?pins|5[- ]?pins/i.test(value.trim());

export const isFivePinsRuleset = (value: unknown): boolean =>
  typeof value === "string" && /(^|[-_])5pins([-_]|$)|five[-_ ]?pins/i.test(value.trim());

/** Detect 5-pins from event payload (game_type or ruleset_key on event/tournament). */
export function isFivePinsEvent(payload: EventApiResponse | null | undefined): boolean {
  const event = payload?.data;
  if (!event) return false;
  if (isFivePinsGameType(event.game_type)) return true;
  if (isFivePinsRuleset(event.ruleset_key)) return true;
  const tournament = event.tournament;
  if (tournament && typeof tournament === "object" && "ruleset_key" in tournament) {
    if (isFivePinsRuleset((tournament as { ruleset_key?: unknown }).ruleset_key)) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Set-score helpers (read from matchSheetJson)                        */
/* ------------------------------------------------------------------ */

type SetRow = {
  set_number?: number | null;
  player1_points?: number | null;
  player2_points?: number | null;
  winner?: string | null;
  finished?: boolean | null;
};

type SetScoreSummary = {
  sets: SetRow[];
  setsWon1: number | null;
  setsWon2: number | null;
  totalPoints1: number | null;
  totalPoints2: number | null;
};

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

export function readSetScoreSummary(
  matchSheetJson: unknown,
  fallback?: { player1_points?: unknown; player2_points?: unknown } | null,
): SetScoreSummary {
  const sheet = toRecord(matchSheetJson);
  const rawSets = Array.isArray(sheet?.sets_result) ? (sheet.sets_result as unknown[]) : [];
  const sets: SetRow[] = rawSets
    .map((row) => toRecord(row))
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .map((row) => ({
      set_number: toNumber(row.set_number),
      player1_points: toNumber(row.player1_points),
      player2_points: toNumber(row.player2_points),
      winner:
        typeof row.winner === "string"
          ? row.winner
          : typeof row.winner === "number"
            ? String(row.winner)
            : null,
      finished: row.finished === true || row.finished === "true",
    }))
    .sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0));

  const setScore = toRecord(sheet?.setScore);
  let setsWon1 = toNumber(setScore?.player1);
  let setsWon2 = toNumber(setScore?.player2);
  if (setsWon1 === null && setsWon2 === null && sets.length > 0) {
    setsWon1 = sets.filter((s) => s.winner === "player1" || s.winner === "1").length;
    setsWon2 = sets.filter((s) => s.winner === "player2" || s.winner === "2").length;
  }

  const totals = toRecord(sheet?.caromsTotal);
  let totalPoints1 = toNumber(totals?.player1);
  let totalPoints2 = toNumber(totals?.player2);
  if (totalPoints1 === null || totalPoints2 === null) {
    if (sets.length > 0) {
      totalPoints1 = sets.reduce((acc, s) => acc + (s.player1_points ?? 0), 0);
      totalPoints2 = sets.reduce((acc, s) => acc + (s.player2_points ?? 0), 0);
    } else {
      totalPoints1 = toNumber(fallback?.player1_points) ?? 0;
      totalPoints2 = toNumber(fallback?.player2_points) ?? 0;
    }
  }

  return { sets, setsWon1, setsWon2, totalPoints1, totalPoints2 };
}

const formatSetPoints = (value: number | null): string => {
  if (value === null || !Number.isFinite(value)) return "-";
  return String(value);
};

/** CEB P+/P- ratio, e.g. 173/125 → "1.384" */
const formatPointsRatio = (pointsFor: number | null, pointsAgainst: number | null): string => {
  const p = pointsFor ?? 0;
  const a = pointsAgainst ?? 0;
  if (a === 0) return p > 0 ? p.toFixed(3) : "0.000";
  return (Math.trunc((p / a) * 1000) / 1000).toFixed(3);
};

/* ------------------------------------------------------------------ */
/* CEB qualification-ranking builder (P+, P-, P+/P-, set points)      */
/* ------------------------------------------------------------------ */

export type FivePinsStanding = {
  key: string;
  playerId: number | null;
  playerName: string;
  playerNativeName: string | null;
  playerCountry: string | null;
  groupNumber: number | null;
  record: { wins: number; draws: number; losses: number };
  pointsFor: number; // P+
  pointsAgainst: number; // P-
  pointsRatio: number | null; // P+/P-
  setsWon: number; // total sets won (display "Sets")
  setPoints: number; // CEB umb_5pins_sets: winner bestOf-opponentSetsWon, loser own sets won
  matchPoints: number; // Match Points
  place: number;
};

const computeRatio = (p: number, a: number): number | null => {
  if (a === 0) {
    if (p === 0) return null;
    return p;
  }
  const ratio = p / a;
  return Number.isFinite(ratio) ? Math.trunc(ratio * 1000) / 1000 : null;
};

export function buildFivePinsStandings(
  group: StageMatchGroup,
  options?: { bestOf?: number },
): FivePinsStanding[] {
  const bestOf = options?.bestOf ?? 3; // CEB U21 groups: best-of-3
  const byPlayerKey = new Map<string, FivePinsStanding>();
  const seed = (player: NormalizedGroupPlayer, groupNumber: number | null): FivePinsStanding => {
    const key = player.documentId || `${player.name}-${player.country || "xx"}`;
    const existing = byPlayerKey.get(key);
    if (existing) return existing;
    const standing: FivePinsStanding = {
      key,
      playerId: player.id,
      playerName: player.name,
      playerNativeName: player.nativeName,
      playerCountry: player.country,
      groupNumber,
      record: { wins: 0, draws: 0, losses: 0 },
      pointsFor: 0,
      pointsAgainst: 0,
      pointsRatio: null,
      setsWon: 0,
      setPoints: 0,
      matchPoints: 0,
      place: 1,
    };
    byPlayerKey.set(key, standing);
    return standing;
  };

  // Seed ALL players in the group first (so standings render even with no played matches)
  for (const match of group.matches) {
    seed(match.top.player, group.number);
    seed(match.bottom.player, group.number);
  }

  for (const match of group.matches) {
    if (!hasPlayedStageMatch(match)) continue;
    const summary = readSetScoreSummary(match.matchSheetJson ?? match.inningsDetail, {
      player1_points: match.top.player.points,
      player2_points: match.bottom.player.points,
    });
    const p1 = seed(match.top.player, group.number);
    const p2 = seed(match.bottom.player, group.number);

    const s1 = summary.setsWon1 ?? 0;
    const s2 = summary.setsWon2 ?? 0;
    const p1pts = summary.totalPoints1 ?? 0;
    const p2pts = summary.totalPoints2 ?? 0;

    p1.pointsFor += p1pts;
    p1.pointsAgainst += p2pts;
    p2.pointsFor += p2pts;
    p2.pointsAgainst += p1pts;
    p1.setsWon += s1;
    p2.setsWon += s2;

    const outcome1 = getMatchOutcome(match.top.player, match.bottom.player);
    if (outcome1 === "W") {
      p1.record.wins += 1;
      p1.matchPoints += 1;
      p1.setPoints += Math.max(0, bestOf - s2); // winner: bestOf - opponentSetsWon
      p2.record.losses += 1;
      p2.setPoints += s2; // loser: own sets won
    } else if (outcome1 === "L") {
      p1.record.losses += 1;
      p1.setPoints += s1; // loser: own sets won
      p2.record.wins += 1;
      p2.matchPoints += 1;
      p2.setPoints += Math.max(0, bestOf - s1); // winner: bestOf - opponentSetsWon
    } else if (outcome1 === "D") {
      p1.record.draws += 1;
      p2.record.draws += 1;
      p1.setPoints += s1;
      p2.setPoints += s2;
    }
  }

  const standings = Array.from(byPlayerKey.values());
  for (const standing of standings) {
    standing.pointsRatio = computeRatio(standing.pointsFor, standing.pointsAgainst);
  }

  // CEB 5-pins qualification order: Match Points → Set Points → P+/P- → P+ → name
  standings.sort((a, b) => {
    if (a.matchPoints !== b.matchPoints) return b.matchPoints - a.matchPoints;
    if (a.setPoints !== b.setPoints) return b.setPoints - a.setPoints;
    if (a.pointsRatio !== null && b.pointsRatio !== null && a.pointsRatio !== b.pointsRatio) {
      return b.pointsRatio - a.pointsRatio;
    }
    if (a.pointsFor !== b.pointsFor) return b.pointsFor - a.pointsFor;
    return a.playerName.localeCompare(b.playerName);
  });
  standings.forEach((standing, index) => {
    standing.place = index + 1;
  });
  return standings;
}

/* ------------------------------------------------------------------ */
/* UI components                                                       */
/* ------------------------------------------------------------------ */

export function FivePinsGroupMatchesTable({
  group,
  highlightPlayerIds,
}: {
  group: StageMatchGroup;
  highlightPlayerIds?: Set<string>;
}) {
  const isHighlighted = (player: NormalizedGroupPlayer) =>
    Boolean(
      highlightPlayerIds?.has(
        player.documentId || `${player.name}-${player.country || "xx"}`,
      ),
    );
  const setColumnCount = useMemo(() => {
    let max = 0;
    for (const match of group.matches) {
      const summary = readSetScoreSummary(match.matchSheetJson ?? match.inningsDetail);
      max = Math.max(max, summary.sets.length);
    }
    return Math.max(3, max); // CEB template uses 3 sets in groups (best-of-3)
  }, [group.matches]);

  const maxColumns = Math.min(setColumnCount, 7);

  // CEB umb_5pins_sets per match: winner gets bestOf - opponentSetsWon, loser gets own setsWon
  const matchSetPoints = (
    setsWon1: number | null,
    setsWon2: number | null,
  ): { sp1: number; sp2: number } => {
    const s1 = setsWon1 ?? 0;
    const s2 = setsWon2 ?? 0;
    if (s1 > s2) return { sp1: Math.max(0, 3 - s2), sp2: s2 };
    if (s2 > s1) return { sp1: s1, sp2: Math.max(0, 3 - s1) };
    return { sp1: s1, sp2: s2 };
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full text-xs">
        <thead className="bg-blue-600 text-white">
          <tr>
            <th className="px-3 py-2 text-left font-medium w-44">Player</th>
            <th className="px-2 py-2 text-center font-medium w-20">Date</th>
            {Array.from({ length: maxColumns }, (_, i) => (
              <th key={`set-${i}`} className="px-2 py-2 text-center font-medium w-12">
                Set {i + 1}
              </th>
            ))}
            <th className="px-2 py-2 text-center font-medium w-20">P+/P-</th>
            <th className="px-2 py-2 text-center font-medium w-14">Sets Won</th>
            <th className="px-2 py-2 text-center font-medium w-16">Set Points</th>
            <th className="px-2 py-2 text-center font-medium w-16">Match Points</th>
          </tr>
        </thead>
        <tbody>
          {group.matches.map((match) => {
            const summary = readSetScoreSummary(match.matchSheetJson ?? match.inningsDetail, {
              player1_points: match.top.player.points,
              player2_points: match.bottom.player.points,
            });
            const played = hasPlayedStageMatch(match);
            const outcomeTop = getMatchOutcome(match.top.player, match.bottom.player);
            const outcomeBottom = getMatchOutcome(match.bottom.player, match.top.player);
            const dateTime = match.dateTime;
            const dateCell = dateTime ? (
              <span className="whitespace-nowrap">
                {new Date(dateTime).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit" })}
              </span>
            ) : (
              "-"
            );

            const renderPlayerCell = (
              player: NormalizedGroupPlayer,
              outcome: "W" | "L" | "D" | null,
            ) => {
              const flagSrc = getCountryFlagCdnUrl(player.country ?? null, 40);
              const highlighted = isHighlighted(player);
              return (
                <td className={clsx("px-3 py-2 font-medium", getMatchRowClass(outcome))}>
                  <div className="flex items-center gap-2">
                    {flagSrc ? (
                      <img
                        src={flagSrc}
                        alt={player.country || "flag"}
                        className="h-3.5 w-5 rounded-[2px] object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                    <span
                      className={clsx(
                        "truncate",
                        highlighted && "font-semibold text-yellow-600 dark:text-yellow-300",
                      )}
                    >
                      {player.name || "-"}
                    </span>
                  </div>
                </td>
              );
            };

            return (
              <Fragment key={match.key}>
                <tr className="border-t border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
                  {renderPlayerCell(match.top.player, outcomeTop)}
                  <td className="px-2 py-2 text-center">{dateCell}</td>
                  {Array.from({ length: maxColumns }, (_, i) => (
                    <td key={`top-set-${i}`} className="px-2 py-2 text-center">
                      {formatSetPoints(summary.sets[i]?.player1_points ?? null)}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center font-semibold">
                    {played
                      ? formatPointsRatio(summary.totalPoints1, summary.totalPoints2)
                      : "-"}
                  </td>
                  <td className="px-2 py-2 text-center font-semibold">
                    {played ? formatNumberValue(summary.setsWon1) : "-"}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {played ? formatNumberValue(matchSetPoints(summary.setsWon1, summary.setsWon2).sp1) : "-"}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {formatNumberValue(match.top.player.matchPoints)}
                  </td>
                </tr>
                <tr className="border-b-[5px] border-white bg-gray-50 text-gray-600 dark:border-white dark:bg-gray-950 dark:text-gray-300">
                  {renderPlayerCell(match.bottom.player, outcomeBottom)}
                  <td className="px-2 py-2 text-center" />
                  {Array.from({ length: maxColumns }, (_, i) => (
                    <td key={`bottom-set-${i}`} className="px-2 py-2 text-center">
                      {formatSetPoints(summary.sets[i]?.player2_points ?? null)}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center font-semibold">
                    {played
                      ? formatPointsRatio(summary.totalPoints2, summary.totalPoints1)
                      : "-"}
                  </td>
                  <td className="px-2 py-2 text-center font-semibold">
                    {played ? formatNumberValue(summary.setsWon2) : "-"}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {played ? formatNumberValue(matchSetPoints(summary.setsWon1, summary.setsWon2).sp2) : "-"}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {formatNumberValue(match.bottom.player.matchPoints)}
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function FivePinsStandingsTable({ standings }: { standings: FivePinsStanding[] }) {
  if (standings.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full text-xs">
        <thead className="bg-blue-600 text-white">
          <tr>
            <th className="px-3 py-2 text-left font-medium w-10">Pos</th>
            <th className="px-3 py-2 text-left font-medium w-44">Player</th>
            <th className="px-2 py-2 text-center font-medium w-20">Record</th>
            <th className="px-2 py-2 text-center font-medium w-14">P+</th>
            <th className="px-2 py-2 text-center font-medium w-14">P-</th>
            <th className="px-2 py-2 text-center font-medium w-16">P+/P-</th>
            <th className="px-2 py-2 text-center font-medium w-14">Sets</th>
            <th className="px-2 py-2 text-center font-medium w-16">Set Points</th>
            <th className="px-2 py-2 text-center font-medium w-16">Match Points</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((standing) => (
            <tr
              key={standing.key}
              className="border-t border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >
              <td className="px-3 py-2 text-center font-semibold">{standing.place}</td>
              <td className="px-3 py-2 font-medium truncate">
                <div className="flex items-center gap-2">
                  {(() => {
                    const flagSrc = getCountryFlagCdnUrl(standing.playerCountry ?? null, 40);
                    return flagSrc ? (
                      <img
                        src={flagSrc}
                        alt={standing.playerCountry || "flag"}
                        className="h-3.5 w-5 rounded-[2px] object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : null;
                  })()}
                  <span className="truncate">{standing.playerName || "-"}</span>
                </div>
              </td>
              <td className="px-2 py-2 text-center">
                {standing.record.draws > 0
                  ? formatRecord(standing.record)
                  : `${standing.record.wins}-${standing.record.losses}`}
              </td>
              <td className="px-2 py-2 text-center">{formatNumberValue(standing.pointsFor)}</td>
              <td className="px-2 py-2 text-center">{formatNumberValue(standing.pointsAgainst)}</td>
              <td className="px-2 py-2 text-center font-semibold">
                {standing.pointsRatio === null ? "-" : standing.pointsRatio.toFixed(3)}
              </td>
              <td className="px-2 py-2 text-center">{formatNumberValue(standing.setsWon)}</td>
              <td className="px-2 py-2 text-center">{formatNumberValue(standing.setPoints)}</td>
              <td className="px-2 py-2 text-center">{formatNumberValue(standing.matchPoints)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Unique preview players of a group (deduped, seed-ordered when possible). */
export function getGroupPreviewPlayers(
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
            !/^(winner|loser|qualifier|unknown|club player)/i.test(
              (player.name || player.nativeName || "").trim(),
            ),
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
    return String(left.name || left.nativeName || "").localeCompare(
      String(right.name || right.nativeName || ""),
    );
  });
}

export const getPreviewPlayerLabel = (player: {
  name?: string | null;
  nativeName?: string | null;
}) => player.name || player.nativeName || "Unknown";

export const toRelationArrayShared = toRelationArray;
export const normalizeEntityShared = normalizeEntity;
