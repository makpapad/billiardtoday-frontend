"use client";

import { Fragment, useMemo } from "react";
import clsx from "clsx";
import type { NormalizedGroupPlayer, StageMatchGroup } from "./types";
import {
  toNumber,
  formatNumberValue,
  formatDateForTable,
  formatTruncatedNumber,
  hasPlayedStageMatch,
  getMatchOutcome,
  getMatchRowClass,
} from "./utils";
import { getCountryFlagCdnUrl } from "@/lib/countryFlags";
import {
  readArtisticSetSummary,
  type ArtisticSetRow,
  type ArtisticSetSummary,
} from "./artisticSets";

/**
 * Public set-protocol tables for CEB Artistic 2026-2027 (best of 5 sets of
 * 7 figures). English labels only — this is the public billiardtoday.com view.
 */

const SET_WIN_CLASS = "font-semibold text-emerald-600 dark:text-emerald-400";

const isSetPlayed = (set: ArtisticSetRow | undefined): boolean =>
  Boolean(
    set &&
      (set.finished ||
        set.player1Points > 0 ||
        set.player2Points > 0 ||
        set.tieBreak ||
        set.winner !== null),
  );

export function ArtisticSetsGroupMatchesTable({
  group,
  highlightPlayerIds,
  showNativePlayerNames,
}: {
  group: StageMatchGroup;
  highlightPlayerIds?: Set<string>;
  showNativePlayerNames?: boolean;
}) {
  const isHighlighted = (player: NormalizedGroupPlayer) =>
    Boolean(
      highlightPlayerIds?.has(
        player.documentId || `${player.name}-${player.country || "xx"}`,
      ),
    );

  const { columnCount, figuresPerSet } = useMemo(() => {
    let maxBestOf = 0;
    let figures = 7;
    for (const match of group.matches) {
      const summary = readArtisticSetSummary(match.matchSheetJson ?? match.inningsDetail);
      maxBestOf = Math.max(maxBestOf, summary.bestOf);
      figures = Math.max(figures, summary.figuresPerSet);
    }
    // CEB Artistic 2026-2027: best of 5 sets of 7 figures.
    const count = Math.max(1, Math.min(5, maxBestOf || 5));
    return { columnCount: count, figuresPerSet: figures };
  }, [group.matches]);

  const renderSetCell = (set: ArtisticSetRow | undefined) => {
    if (!isSetPlayed(set) || !set) {
      return <span className="text-gray-400 dark:text-gray-500">-</span>;
    }
    return (
      <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
        <span className={clsx(set.winner === "player1" && SET_WIN_CLASS)}>
          {formatNumberValue(set.player1Points)}
        </span>
        <span className="text-gray-400 dark:text-gray-500">-</span>
        <span className={clsx(set.winner === "player2" && SET_WIN_CLASS)}>
          {formatNumberValue(set.player2Points)}
        </span>
        {set.tieBreak ? (
          <span
            title="Decided by tie-break"
            className="text-[9px] font-semibold uppercase text-amber-600 dark:text-amber-400"
          >
            tb
          </span>
        ) : null}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full text-xs">
        <thead className="bg-blue-600 text-white">
          <tr>
            <th className="px-3 py-2 text-left font-medium w-44">Player</th>
            <th className="px-2 py-2 text-center font-medium w-20">Date</th>
            {Array.from({ length: columnCount }, (_, i) => (
              <th
                key={`set-${i}`}
                className="px-2 py-2 text-center font-medium w-16"
                title={`Set of ${figuresPerSet} figures`}
              >
                Set {String.fromCharCode(65 + i)}
              </th>
            ))}
            <th className="px-2 py-2 text-center font-medium w-16">Sets Won</th>
            <th className="px-2 py-2 text-center font-medium w-14" title="Match solved points">
              Pts
            </th>
            <th className="px-2 py-2 text-center font-medium w-14" title="Possible points">
              Poss.
            </th>
            <th className="px-2 py-2 text-center font-medium w-14" title="Percentage">
              %
            </th>
            <th className="px-2 py-2 text-center font-medium w-14" title="Match points">
              MP
            </th>
          </tr>
        </thead>
        <tbody>
          {group.matches.map((match) => {
            const summary = readArtisticSetSummary(match.matchSheetJson ?? match.inningsDetail, {
              player1_points: match.top.player.points,
              player2_points: match.bottom.player.points,
              player1_innings: match.top.player.innings,
              player2_innings: match.bottom.player.innings,
            });
            const played = hasPlayedStageMatch(match);
            const outcomeTop = getMatchOutcome(match.top.player, match.bottom.player);
            const outcomeBottom = getMatchOutcome(match.bottom.player, match.top.player);

            const setsWon = summary.setsWon;
            const decided =
              played &&
              summary.hasSetData &&
              setsWon !== null &&
              setsWon.player1 !== setsWon.player2;
            const winnerSide: "player1" | "player2" | null = decided
              ? setsWon!.player1 > setsWon!.player2
                ? "player1"
                : "player2"
              : null;

            const setsWonLabel =
              played && setsWon ? `${setsWon.player1}-${setsWon.player2}` : "-";

            const matchPointsLabel = (side: "player1" | "player2"): string => {
              if (!winnerSide) return "-";
              return side === winnerSide ? "2" : "0";
            };

            const percentage = (points: number, possible: number): string => {
              const safePoints = toNumber(points) ?? 0;
              const safePossible = toNumber(possible) ?? 0;
              if (safePossible <= 0) return "-";
              return formatTruncatedNumber(safePoints / safePossible, 3);
            };

            const renderPlayerCell = (
              player: NormalizedGroupPlayer,
              outcome: "W" | "L" | "D" | null,
            ) => {
              const flagSrc = getCountryFlagCdnUrl(player.country ?? null, 40);
              const highlighted = isHighlighted(player);
              const nativeName = player.nativeName ?? null;
              const showNative =
                Boolean(showNativePlayerNames) &&
                Boolean(nativeName) &&
                nativeName!.trim() !== (player.name || "").trim();
              return (
                <td className={clsx("px-3 py-2 font-medium", getMatchRowClass(outcome))}>
                  <div className="flex items-start gap-2 leading-tight">
                    {flagSrc ? (
                      <img
                        src={flagSrc}
                        alt={player.country || "flag"}
                        className="mt-0.5 h-3.5 w-5 rounded-[2px] object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                    <div className="flex min-w-0 flex-col leading-tight">
                      <span
                        className={clsx(
                          "truncate",
                          highlighted && "font-semibold text-yellow-600 dark:text-yellow-300",
                        )}
                      >
                        {player.name || "-"}
                      </span>
                      {showNative ? (
                        <span
                          className={clsx(
                            "truncate text-[10px] text-gray-500 dark:text-gray-400",
                            highlighted && "text-yellow-600/80 dark:text-yellow-300/80",
                          )}
                        >
                          {nativeName}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </td>
              );
            };

            return (
              <Fragment key={match.key}>
                <tr className="border-t border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
                  {renderPlayerCell(match.top.player, outcomeTop)}
                  <td className="px-2 py-2 text-center">
                    <span className="whitespace-nowrap">{formatDateForTable(match.dateTime)}</span>
                  </td>
                  {Array.from({ length: columnCount }, (_, i) => (
                    <td key={`top-set-${i}`} className="px-2 py-2 text-center">
                      {renderSetCell(summary.sets[i])}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center font-semibold">{setsWonLabel}</td>
                  <td className="px-2 py-2 text-center">
                    {played ? formatNumberValue(summary.totalPoints.player1) : "-"}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {played ? formatNumberValue(summary.totalPossible.player1) : "-"}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {played
                      ? percentage(summary.totalPoints.player1, summary.totalPossible.player1)
                      : "-"}
                  </td>
                  <td className="px-2 py-2 text-center font-semibold">
                    {matchPointsLabel("player1")}
                  </td>
                </tr>
                <tr className="border-b-[5px] border-white bg-gray-50 text-gray-600 dark:border-white dark:bg-gray-950 dark:text-gray-300">
                  {renderPlayerCell(match.bottom.player, outcomeBottom)}
                  <td className="px-2 py-2 text-center" />
                  {Array.from({ length: columnCount }, (_, i) => (
                    <td key={`bottom-set-${i}`} className="px-2 py-2 text-center">
                      {renderSetCell(summary.sets[i])}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center font-semibold">{setsWonLabel}</td>
                  <td className="px-2 py-2 text-center">
                    {played ? formatNumberValue(summary.totalPoints.player2) : "-"}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {played ? formatNumberValue(summary.totalPossible.player2) : "-"}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {played
                      ? percentage(summary.totalPoints.player2, summary.totalPossible.player2)
                      : "-"}
                  </td>
                  <td className="px-2 py-2 text-center font-semibold">
                    {matchPointsLabel("player2")}
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

export function ArtisticSetsSetStrip({
  summary,
  player1Name,
  player2Name,
}: {
  summary: ArtisticSetSummary;
  player1Name?: string;
  player2Name?: string;
}) {
  const p1 = player1Name || "P1";
  const p2 = player2Name || "P2";
  if (summary.sets.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full text-xs">
        <thead className="bg-blue-600 text-white">
          <tr>
            <th
              className="px-2 py-2 text-center font-medium w-16"
              title={`${summary.figuresPerSet} figures`}
            >
              Set
            </th>
            <th className="px-3 py-2 text-left font-medium w-40" title="Player 1 points">
              {p1}
            </th>
            <th className="px-3 py-2 text-left font-medium w-40" title="Player 2 points">
              {p2}
            </th>
            <th className="px-2 py-2 text-center font-medium w-20" title="Possible points">
              Possible
            </th>
            <th className="px-2 py-2 text-center font-medium w-24">Winner</th>
            <th
              className="px-2 py-2 text-center font-medium w-24"
              title="Decided by tie-break"
            >
              Tie-break
            </th>
          </tr>
        </thead>
        <tbody>
          {summary.sets.map((set) => {
            const winnerLabel =
              set.winner === "player1" ? p1 : set.winner === "player2" ? p2 : "-";
            const tieBreakLabel = !set.tieBreak
              ? "-"
              : set.tieBreakWinner === "player1"
                ? p1
                : set.tieBreakWinner === "player2"
                  ? p2
                  : "Yes";
            return (
              <tr
                key={set.setNumber}
                className="border-t border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                <td
                  className="px-2 py-2 text-center font-semibold"
                  title={`${summary.figuresPerSet} figures`}
                >
                  {set.letter ?? String(set.setNumber)}
                </td>
                <td
                  className={clsx(
                    "px-3 py-2 text-left font-medium",
                    set.winner === "player1" && SET_WIN_CLASS,
                  )}
                >
                  {formatNumberValue(set.player1Points)}
                </td>
                <td
                  className={clsx(
                    "px-3 py-2 text-left font-medium",
                    set.winner === "player2" && SET_WIN_CLASS,
                  )}
                >
                  {formatNumberValue(set.player2Points)}
                </td>
                <td className="px-2 py-2 text-center">
                  {formatNumberValue(
                    Math.max(set.player1Possible, set.player2Possible),
                  )}
                </td>
                <td className="px-2 py-2 text-center font-medium">{winnerLabel}</td>
                <td className="px-2 py-2 text-center">{tieBreakLabel}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
