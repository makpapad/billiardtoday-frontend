"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, Calendar, ChevronDown, Trophy, Users } from "lucide-react";
import {
  formatAvg,
  type ComputedStandingRow,
  type NormalizedTeamMatch,
  type TeamGroup,
  type TeamMatchSet,
  type TeamTournamentDetail,
  type TeamTournamentSummary,
} from "@/lib/teamTournaments";
import type { TournamentEventSummary } from "@/lib/tournaments";

type Props = {
  detail: TeamTournamentDetail | null;
  title: string;
  eventSummary?: TournamentEventSummary | null;
  canonicalSlug: string;
  slugIsCanonical: boolean;
};

type StageKey = "qualifications" | "final";
type ViewKey = "matches" | "ranking";

const formatSeason = (season: number | null): string | null => {
  if (season === null || !Number.isFinite(season)) return null;
  return `${season}-${(season + 1) % 100}`;
};

const formatDate = (value: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/** 3-Cushion board inside a biathlon match: avg = caroms/innings, stored x4. */
const isCaromBoardIndex = (
  summary: TeamTournamentSummary | null,
  boardIndex: number | null,
): boolean => {
  const boardsPerMatch = Number(summary?.config?.boardsPerMatch);
  return boardsPerMatch === 2 && boardIndex === 2;
};

const isCompleted = (match: NormalizedTeamMatch): boolean =>
  match.status === "completed" ||
  (match.computed.boardCount > 0 &&
    (match.computed.homeBoardPoints > 0 || match.computed.awayBoardPoints > 0));

/** Show declared teams (zeros) before any match completes, like a squad list. */
const resolveStandingRows = (
  group: TeamGroup,
  computed: ComputedStandingRow[],
): ComputedStandingRow[] => {
  if (computed.length > 0) return computed;
  return group.teams
    .map((team) => ({
      key: team.documentId || String(team.id ?? "") || team.name,
      teamId: team.id,
      teamName: team.name,
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      leaguePoints: 0,
      framesFor: 0,
      framesAgainst: 0,
      frameDiff: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      inningsFor: 0,
      caromPointsFor: 0,
      caromPointsAgainst: 0,
      avg: 0,
      highestRun: 0,
    }))
    .sort((a, b) => a.teamName.localeCompare(b.teamName, "el"));
};

const fivePinsPoints = (row: ComputedStandingRow): number =>
  Math.max(0, row.pointsFor - row.caromPointsFor);

const threeCushionPoints = (row: ComputedStandingRow): number => row.caromPointsFor;

const pointsRatio = (row: ComputedStandingRow): number =>
  row.pointsAgainst > 0 ? row.pointsFor / row.pointsAgainst : row.pointsFor;

/** CEB qualification ranking (biathlon C/27): MP → pos in group → P+/P− ratio → points diff. */
const compareQualificationRows = (
  a: ComputedStandingRow & { groupPos?: number },
  b: ComputedStandingRow & { groupPos?: number },
): number => {
  if (b.leaguePoints !== a.leaguePoints) return b.leaguePoints - a.leaguePoints;
  const pa = a.groupPos ?? 0;
  const pb = b.groupPos ?? 0;
  if (pa !== pb) return pa - pb;
  const rb = pointsRatio(b);
  const ra = pointsRatio(a);
  if (rb !== ra) return rb - ra;
  return b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst);
};

function GroupStandingsTable({
  group,
  rows,
  biathlon = false,
}: {
  group: TeamGroup;
  rows: ComputedStandingRow[];
  biathlon?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:text-gray-100">
        {group.title || `Group ${group.groupKey}`}
      </div>
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <th className="px-4 py-2 text-left font-medium">#</th>
            <th className="px-2 py-2 text-left font-medium">Team</th>
            <th className="px-2 py-2 text-center font-medium">P</th>
            <th className="px-2 py-2 text-center font-medium">W</th>
            <th className="px-2 py-2 text-center font-medium">D</th>
            <th className="px-2 py-2 text-center font-medium">L</th>
            {biathlon ? (
              <>
                <th className="px-2 py-2 text-center font-medium">P+</th>
                <th className="px-2 py-2 text-center font-medium">P−</th>
                <th className="px-2 py-2 text-center font-medium">P+/P−</th>
              </>
            ) : (
              <th className="px-2 py-2 text-center font-medium">Frames +/−</th>
            )}
            <th className="px-2 py-2 text-center font-medium">Diff</th>
            <th className="px-2 py-2 text-center font-medium">Avg</th>
            <th className="px-2 py-2 text-center font-medium">HR</th>
            <th className="px-4 py-2 text-center font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.key}
              className={clsx(
                "border-b border-gray-100 last:border-0 dark:border-gray-700/60",
                index === 0 && "bg-amber-50/50 dark:bg-amber-400/5",
              )}
            >
              <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">
                {index + 1}
              </td>
              <td className="px-2 py-2.5 font-semibold text-gray-900 dark:text-gray-100">
                {row.teamName}
              </td>
              <td className="px-2 py-2.5 text-center text-gray-600 dark:text-gray-300">
                {row.matchesPlayed}
              </td>
              <td className="px-2 py-2.5 text-center text-gray-600 dark:text-gray-300">
                {row.wins}
              </td>
              <td className="px-2 py-2.5 text-center text-gray-600 dark:text-gray-300">
                {row.draws}
              </td>
              <td className="px-2 py-2.5 text-center text-gray-600 dark:text-gray-300">
                {row.losses}
              </td>
              {biathlon ? (
                <>
                  <td className="px-2 py-2.5 text-center text-gray-600 dark:text-gray-300">
                    {row.pointsFor}
                  </td>
                  <td className="px-2 py-2.5 text-center text-gray-600 dark:text-gray-300">
                    {row.pointsAgainst}
                  </td>
                  <td className="px-2 py-2.5 text-center text-gray-600 dark:text-gray-300">
                    {pointsRatio(row).toFixed(3)}
                  </td>
                </>
              ) : (
                <td className="px-2 py-2.5 text-center text-gray-600 dark:text-gray-300">
                  {row.framesFor}–{row.framesAgainst}
                </td>
              )}
              <td className="px-2 py-2.5 text-center text-gray-600 dark:text-gray-300">
                {biathlon
                  ? (() => {
                      const d = row.pointsFor - row.pointsAgainst;
                      return d > 0 ? `+${d}` : d;
                    })()
                  : row.frameDiff > 0
                    ? `+${row.frameDiff}`
                    : row.frameDiff}
              </td>
              <td className="px-2 py-2.5 text-center text-gray-600 dark:text-gray-300">
                {row.avg > 0 ? row.avg.toFixed(3) : "-"}
              </td>
              <td className="px-2 py-2.5 text-center text-gray-600 dark:text-gray-300">
                {row.highestRun > 0 ? row.highestRun : "-"}
              </td>
              <td className="px-4 py-2.5 text-center font-bold text-gray-900 dark:text-gray-100">
                {row.leaguePoints}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Unified qualification ranking (all groups, CEB order) — like the CEB PDF. */
function QualificationRankingTable({
  rows,
  groups,
  biathlon = false,
}: {
  rows: ComputedStandingRow[];
  groups: TeamGroup[];
  biathlon?: boolean;
}) {
  const groupKeyByTeamId = useMemo(() => {
    const map = new Map<number, string>();
    groups.forEach((group) => {
      group.teams.forEach((team) => {
        if (team.id !== null) map.set(team.id, group.groupKey);
      });
    });
    return map;
  }, [groups]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => compareQualificationRows(a, b)),
    [rows],
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:text-gray-100">
        Qualification Ranking
      </div>
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <th className="px-4 py-2 text-left font-medium">#</th>
            <th className="px-2 py-2 text-left font-medium">Team</th>
            <th className="px-2 py-2 text-center font-medium">Group</th>
            <th className="px-2 py-2 text-center font-medium">MP</th>
            {biathlon ? (
              <>
                <th className="px-2 py-2 text-center font-medium">5P</th>
                <th className="px-2 py-2 text-center font-medium">3C</th>
                <th className="px-2 py-2 text-center font-medium">P+</th>
                <th className="px-2 py-2 text-center font-medium">P−</th>
                <th className="px-2 py-2 text-center font-medium">P+/P−</th>
              </>
            ) : (
              <th className="px-2 py-2 text-center font-medium">Frames +/−</th>
            )}
            <th className="px-2 py-2 text-center font-medium">Diff</th>
            <th className="px-2 py-2 text-center font-medium">Avg</th>
            <th className="px-4 py-2 text-center font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, index) => {
            const groupKey =
              row.teamId !== null
                ? (groupKeyByTeamId.get(row.teamId) ?? "-")
                : "-";
            const qualified = index < 8;
            return (
              <tr
                key={row.key}
                className={clsx(
                  "border-b border-gray-100 last:border-0 dark:border-gray-700/60",
                  qualified && "bg-emerald-50/50 dark:bg-emerald-400/5",
                )}
              >
                <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">
                  {index + 1}
                </td>
                <td className="px-2 py-2.5 font-semibold text-gray-900 dark:text-gray-100">
                  {row.teamName}
                </td>
                <td className="px-2 py-2.5 text-center text-gray-600 dark:text-gray-300">
                  {groupKey}
                </td>
                <td className="px-2 py-2.5 text-center font-bold text-gray-900 dark:text-gray-100">
                  {row.leaguePoints}
                </td>
                {biathlon ? (
                  <>
                    <td className="px-2 py-2.5 text-center text-gray-600 dark:text-gray-300">
                      {fivePinsPoints(row)}
                    </td>
                    <td className="px-2 py-2.5 text-center text-gray-600 dark:text-gray-300">
                      {threeCushionPoints(row)}
                    </td>
                    <td className="px-2 py-2.5 text-center text-gray-600 dark:text-gray-300">
                      {row.pointsFor}
                    </td>
                    <td className="px-2 py-2.5 text-center text-gray-600 dark:text-gray-300">
                      {row.pointsAgainst}
                    </td>
                    <td className="px-2 py-2.5 text-center text-gray-600 dark:text-gray-300">
                      {pointsRatio(row).toFixed(3)}
                    </td>
                  </>
                ) : (
                  <td className="px-2 py-2.5 text-center text-gray-600 dark:text-gray-300">
                    {row.framesFor}–{row.framesAgainst}
                  </td>
                )}
                <td className="px-2 py-2.5 text-center text-gray-600 dark:text-gray-300">
                  {biathlon
                    ? (() => {
                        const d = row.pointsFor - row.pointsAgainst;
                        return d > 0 ? `+${d}` : d;
                      })()
                    : row.frameDiff > 0
                      ? `+${row.frameDiff}`
                      : row.frameDiff}
                </td>
                <td className="px-2 py-2.5 text-center text-gray-600 dark:text-gray-300">
                  {row.avg > 0 ? row.avg.toFixed(3) : "-"}
                </td>
                <td className="px-4 py-2.5 text-center font-bold text-gray-900 dark:text-gray-100">
                  {row.leaguePoints}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="border-t border-gray-200 px-4 py-2 text-[11px] text-gray-400 dark:border-gray-700 dark:text-gray-500">
        Top 8 advance to the Final Round.
      </div>
    </div>
  );
}

function SetRow({
  set,
  summary,
}: {
  set: TeamMatchSet;
  summary: TeamTournamentSummary | null;
}) {
  const home = set.homePoints ?? 0;
  const away = set.awayPoints ?? 0;
  const homeWin = home > away;
  const awayWin = away > home;
  const caromBoard = isCaromBoardIndex(summary, set.boardIndex);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-xs dark:bg-gray-900/60">
      <div className="truncate text-right font-medium text-gray-800 dark:text-gray-200">
        {homeWin ? (
          <span className="font-bold">{set.homePlayerName || "—"}</span>
        ) : (
          set.homePlayerName || "—"
        )}
      </div>
      <div className="shrink-0 px-2 text-center">
        <div className="font-bold text-gray-900 dark:text-gray-100">
          {home}–{away}
        </div>
        <div className="text-[10px] text-gray-400">
          {set.homeInnings ?? "-"}/{set.awayInnings ?? "-"} inn · HR{" "}
          {set.homeHighRun ?? 0}/{set.awayHighRun ?? 0}
        </div>
        <div className="text-[10px] text-gray-400">
          AVG {formatAvg(set.homePoints ?? 0, set.homeInnings ?? 0, caromBoard)}/
          {formatAvg(set.awayPoints ?? 0, set.awayInnings ?? 0, caromBoard)}
        </div>
      </div>
      <div className="truncate text-left font-medium text-gray-800 dark:text-gray-200">
        {awayWin ? (
          <span className="font-bold">{set.awayPlayerName || "—"}</span>
        ) : (
          set.awayPlayerName || "—"
        )}
      </div>
    </div>
  );
}

function MatchCard({
  match,
  summary,
}: {
  match: NormalizedTeamMatch;
  summary: TeamTournamentSummary | null;
}) {
  const completed = isCompleted(match);
  const [expanded, setExpanded] = useState(false);
  const biathlon = summary?.config?.mode === "biathlon";
  // Biathlon (C/27): winner decided by TOT (5P + 3C total points), not boards.
  const homeScore = biathlon
    ? match.computed.homeTotalPoints
    : match.computed.homeBoardPoints;
  const awayScore = biathlon
    ? match.computed.awayTotalPoints
    : match.computed.awayBoardPoints;
  const homeWon = completed && homeScore > awayScore;
  const awayWon = completed && awayScore > homeScore;
  const draw = completed && homeScore === awayScore;
  const dateLabel = formatDate(match.matchDate);

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="capitalize">Stage {match.stage}</span>
        <span>Round {match.round ?? "-"}</span>
        {dateLabel ? (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {dateLabel}
          </span>
        ) : null}
        {!completed ? (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
            {match.status}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-3 px-4 pb-3">
        <div
          className={clsx(
            "min-w-0 flex-1 truncate text-right text-sm font-semibold",
            homeWon
              ? "text-gray-900 dark:text-gray-50"
              : "text-gray-600 dark:text-gray-300",
          )}
        >
          {match.homeTeamName}
        </div>
        <div className="shrink-0 rounded-lg bg-gray-100 px-3 py-1 text-center dark:bg-gray-900/70">
          <div className="text-sm font-black text-gray-900 dark:text-gray-100">
            {completed ? `${homeScore}–${awayScore}` : "–"}
          </div>
          {completed ? (
            <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
              {biathlon
                ? homeWon
                  ? "2–0"
                  : awayWon
                    ? "0–2"
                    : "1–1"
                : draw
                  ? "1–1"
                  : homeWon
                    ? "2–0"
                    : "0–2"}
            </div>
          ) : null}
        </div>
        <div
          className={clsx(
            "min-w-0 flex-1 truncate text-left text-sm font-semibold",
            awayWon
              ? "text-gray-900 dark:text-gray-50"
              : "text-gray-600 dark:text-gray-300",
          )}
        >
          {match.awayTeamName}
        </div>
      </div>

      {match.sets.length > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-center gap-1 border-t border-gray-100 px-4 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-800 dark:border-gray-700/60 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ChevronDown
              className={clsx("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
            />
            Boards ({match.sets.length})
          </button>
          {expanded ? (
            <div className="flex flex-col gap-1.5 border-t border-gray-100 px-4 py-3 dark:border-gray-700/60">
              {match.sets.map((set) => (
                <SetRow
                  key={set.documentId || `${set.boardIndex}-${set.homePoints}-${set.awayPoints}`}
                  set={set}
                  summary={summary}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function MatchesByGroup({
  group,
  matches,
  summary,
}: {
  group: TeamGroup;
  matches: NormalizedTeamMatch[];
  summary: TeamTournamentSummary | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {group.title || `Group ${group.groupKey}`}
      </div>
      {matches.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          No matches yet.
        </div>
      ) : (
        matches.map((match) => (
          <MatchCard
            key={match.documentId || `${match.id}-${match.homeTeamId}-${match.awayTeamId}`}
            match={match}
            summary={summary}
          />
        ))
      )}
    </div>
  );
}

/** Single KO match card — teams + TOT score, winner highlighted. */
function KoMatchCard({
  label,
  match,
  summary,
  highlight = false,
}: {
  label: string;
  match: NormalizedTeamMatch;
  summary: TeamTournamentSummary | null;
  highlight?: boolean;
}) {
  const completed = isCompleted(match);
  const biathlon = summary?.config?.mode === "biathlon";
  const homeScore = biathlon
    ? match.computed.homeTotalPoints
    : match.computed.homeBoardPoints;
  const awayScore = biathlon
    ? match.computed.awayTotalPoints
    : match.computed.awayBoardPoints;
  const homeWon = completed && homeScore > awayScore;
  const awayWon = completed && awayScore > homeScore;

  return (
    <div
      className={clsx(
        "flex flex-col gap-2 rounded-xl border bg-white p-3 dark:bg-gray-800",
        highlight
          ? "border-amber-400/70 bg-gradient-to-br from-amber-50 to-white dark:border-amber-500/50 dark:from-amber-500/10 dark:to-gray-800"
          : "border-gray-200 dark:border-gray-700",
      )}
    >
      <div
        className={clsx(
          "text-[10px] font-bold uppercase tracking-[0.14em]",
          highlight
            ? "text-amber-600 dark:text-amber-400"
            : "text-gray-400 dark:text-gray-500",
        )}
      >
        {label}
      </div>
      <div className="flex items-center gap-2">
        <div
          className={clsx(
            "min-w-0 flex-1 truncate text-xs font-semibold",
            homeWon
              ? "text-gray-900 dark:text-gray-50"
              : "text-gray-500 dark:text-gray-400",
          )}
        >
          {match.homeTeamName}
        </div>
        <div className="shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-black text-gray-900 dark:bg-gray-900/70 dark:text-gray-100">
          {completed ? `${homeScore}–${awayScore}` : "–"}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div
          className={clsx(
            "min-w-0 flex-1 truncate text-xs font-semibold",
            awayWon
              ? "text-gray-900 dark:text-gray-50"
              : "text-gray-500 dark:text-gray-400",
          )}
        >
          {match.awayTeamName}
        </div>
        <div className="w-[46px] shrink-0" />
      </div>
    </div>
  );
}

/** KO bracket: QF → SF → Final columns (like the tournament pages). */
function KnockoutBracket({
  matches,
  summary,
}: {
  matches: NormalizedTeamMatch[];
  summary: TeamTournamentSummary | null;
}) {
  const rounds: { key: string; label: string; matchLabel: (i: number) => string }[] = [
    { key: "QF", label: "Quarter-finals", matchLabel: (i) => `QF${i + 1}` },
    { key: "SF", label: "Semi-finals", matchLabel: (i) => `SF${i + 1}` },
    { key: "F", label: "Final", matchLabel: () => "FINAL" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-center lg:gap-6">
        {rounds.map((round) => {
          const roundMatches = matches
            .filter((m) => m.groupKey === round.key)
            .sort((a, b) => (a.round ?? 0) - (b.round ?? 0));
          if (roundMatches.length === 0) return null;
          const isFinal = round.key === "F";
          return (
            <div key={round.key} className="flex flex-1 flex-col gap-3">
              <div
                className={clsx(
                  "text-center text-xs font-bold uppercase tracking-[0.18em]",
                  isFinal
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-gray-500 dark:text-gray-400",
                )}
              >
                {round.label}
              </div>
              <div className="flex flex-col gap-2">
                {roundMatches.map((match, index) => (
                  <KoMatchCard
                    key={match.documentId || `${match.id}-${index}`}
                    label={round.matchLabel(index)}
                    match={match}
                    summary={summary}
                    highlight={isFinal}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {summary?.config?.mode === "biathlon" ? (
        <div className="text-center text-[11px] text-gray-400 dark:text-gray-500">
          Scores are TOT (5-Pins + 3-Cushion). Winner decided by total points.
        </div>
      ) : null}
    </div>
  );
}

/** Final standings 1..N derived from the KO bracket + qualification ranking. */
function FinalStandingsTable({
  koMatches,
  qualifiedRows,
}: {
  koMatches: NormalizedTeamMatch[];
  qualifiedRows: ComputedStandingRow[];
}) {
  const standings = useMemo(() => {
    type Entry = { position: number; teamName: string; stage: string; tot?: number };
    const entries: Entry[] = [];
    const addLoser = (match: NormalizedTeamMatch, stageLabel: string) => {
      const loser =
        match.winnerTeamName === match.homeTeamName
          ? match.awayTeamName
          : match.homeTeamName;
      if (loser && loser !== "-") entries.push({ position: 0, teamName: loser, stage: stageLabel });
    };

    const byRound = (key: string) =>
      koMatches
        .filter((m) => m.groupKey === key)
        .sort((a, b) => (a.round ?? 0) - (b.round ?? 0));

    const qf = byRound("QF");
    const sf = byRound("SF");
    const fin = byRound("F");

    // QF losers: sorted by TOT scored in their QF match (CEB rule — the
    // round in which they were eliminated decides 5th-8th, highest TOT first).
    const qfLosers: Entry[] = qf
      .map((m) => {
        const homeWon = m.winnerTeamName === m.homeTeamName;
        const loserName = homeWon ? m.awayTeamName : m.homeTeamName;
        const loserTot = homeWon
          ? m.computed.awayTotalPoints
          : m.computed.homeTotalPoints;
        return { position: 0, teamName: loserName, stage: "Quarter-finals", tot: loserTot };
      })
      .filter((e) => e.teamName && e.teamName !== "-")
      .sort((a, b) => (b.tot ?? 0) - (a.tot ?? 0));

    qfLosers.forEach((e) => entries.push(e));
    sf.forEach((m) => addLoser(m, "Semi-finals"));
    const final = fin[0];
    if (final) {
      addLoser(final, "Final");
      const champion =
        final.winnerTeamName === final.homeTeamName
          ? final.homeTeamName
          : final.awayTeamName;
      if (champion && champion !== "-")
        entries.unshift({ position: 1, teamName: champion, stage: "Champion" });
    }
    entries.sort(
      (a, b) =>
        (a.stage === "Champion" ? 0 : a.stage === "Final" ? 1 : a.stage === "Semi-finals" ? 2 : 3) -
        (b.stage === "Champion" ? 0 : b.stage === "Final" ? 1 : b.stage === "Semi-finals" ? 2 : 3),
    );
    // Fill positions: SF losers share 3rd, QF losers get 5th-8th in their
    // TOT order (already sorted above).
    let pos = 1;
    let lastStage = "";
    let lastPos = 0;
    entries.forEach((e) => {
      if (e.stage === "Semi-finals" && lastStage === "Semi-finals") {
        e.position = lastPos;
      } else {
        e.position = pos;
      }
      lastStage = e.stage;
      lastPos = e.position;
      pos += 1;
    });
    // Non-qualified teams (below 8) from qualification ranking (CEB order).
    const nonQualified = [...qualifiedRows]
      .sort((a, b) => compareQualificationRows(a, b))
      .slice(8)
      .map((row, idx) => ({ position: 9 + idx, teamName: row.teamName, stage: "Qualifications" }));
    return [...entries, ...nonQualified];
  }, [koMatches, qualifiedRows]);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:text-gray-100">
        Final Standings
      </div>
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <th className="px-4 py-2 text-left font-medium">Pos</th>
            <th className="px-2 py-2 text-left font-medium">Team</th>
            <th className="px-4 py-2 text-right font-medium">Stage</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, index) => (
            <tr
              key={`${row.teamName}-${index}`}
              className={clsx(
                "border-b border-gray-100 last:border-0 dark:border-gray-700/60",
                row.position === 1 &&
                  "bg-amber-50/70 dark:bg-amber-400/10",
              )}
            >
              <td className="px-4 py-2.5 font-bold text-gray-900 dark:text-gray-100">
                {row.position}
              </td>
              <td className="px-2 py-2.5 font-semibold text-gray-900 dark:text-gray-100">
                {row.teamName}
              </td>
              <td className="px-4 py-2.5 text-right text-xs text-gray-500 dark:text-gray-400">
                {row.stage}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TeamTournamentDetailClient({
  detail,
  title,
  eventSummary = null,
  canonicalSlug,
  slugIsCanonical,
}: Props) {
  const [stage, setStage] = useState<StageKey>("qualifications");
  const [view, setView] = useState<ViewKey>("matches");

  const summary = detail?.summary ?? null;
  const groups = detail?.groups ?? [];
  const matches = detail?.matches ?? [];
  const standingsByGroup = detail?.standingsByGroup ?? {};
  const biathlon = summary?.config?.mode === "biathlon";

  const seasonLabel = formatSeason(summary?.season ?? null);
  const venueMetaParts = useMemo(() => {
    const parts: string[] = [];
    const pushUnique = (value: string | null | undefined) => {
      const normalized = String(value ?? "").trim();
      if (normalized && !parts.some((p) => p === normalized)) parts.push(normalized);
    };
    pushUnique(eventSummary?.venueCountry ?? eventSummary?.clubCountry);
    pushUnique(eventSummary?.venueCity ?? eventSummary?.clubCity);
    pushUnique(eventSummary?.venueName ?? eventSummary?.clubName);
    if (parts.length === 0 && summary?.config?.country) {
      pushUnique(String(summary.config.country));
    }
    return parts;
  }, [eventSummary, summary]);

  const scheduleLabel = useMemo(() => {
    const start = eventSummary?.startDate;
    const end = eventSummary?.endDate;
    if (!start && !end) return null;
    const format = (value: string) =>
      new Date(value).toLocaleDateString("el-GR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    if (start && end) return `${format(start)} - ${format(end)}`;
    return format(start ?? end ?? "");
  }, [eventSummary]);

  const sortedGroups = useMemo(
    () =>
      [...groups].sort((a, b) =>
        String(a.groupKey).localeCompare(String(b.groupKey), undefined, {
          numeric: true,
        }),
      ),
    [groups],
  );

  const matchesByGroupKey = useMemo(() => {
    const map = new Map<string, NormalizedTeamMatch[]>();
    matches.forEach((m) => {
      const key = m.groupKey || "-";
      const list = map.get(key) ?? [];
      list.push(m);
      map.set(key, list);
    });
    map.forEach((list) => list.sort((a, b) => (a.round ?? 0) - (b.round ?? 0)));
    return map;
  }, [matches]);

  // Knockout matches: stage "ko" (team module) or QF/SF/F group keys.
  const koMatches = useMemo(
    () =>
      matches
        .filter((m) => m.stage === "ko" || ["QF", "SF", "F"].includes(m.groupKey))
        .sort(
          (a, b) =>
            ["QF", "SF", "F"].findIndex((r) => r === a.groupKey) -
              ["QF", "SF", "F"].findIndex((r) => r === b.groupKey) ||
            (a.round ?? 0) - (b.round ?? 0),
        ),
    [matches],
  );

  // Unified qualification ranking (all groups merged, CEB sort).
  const allStandingRows = useMemo(() => {
    const rows: (ComputedStandingRow & { groupPos?: number; groupKey?: string })[] = [];
    Object.entries(standingsByGroup).forEach(([groupKey, list]) => {
      // Standings are already sorted per group (CEB order) — groupPos = rank in group.
      list.forEach((r, idx) => {
        rows.push({ ...r, groupPos: idx + 1, groupKey });
      });
    });
    // De-duplicate by team id/name.
    const seen = new Set<string>();
    const unique = rows.filter((r) => {
      const key = r.teamId !== null ? `id:${r.teamId}` : `name:${r.teamName}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return unique;
  }, [standingsByGroup]);

  return (
    <div
      className="mx-auto w-full px-4 py-8"
      style={{ maxWidth: "var(--bt-page-width, 1280px)" }}
    >
      <div className="flex flex-col gap-6">
        <Link
          href="/tournaments/team"
          className="inline-flex w-fit items-center gap-1 text-xs font-medium text-gray-500 transition-colors hover:text-cyan-600 dark:text-gray-400 dark:hover:text-cyan-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All team tournaments
        </Link>

        <section className="overflow-hidden rounded-[32px] border border-black/5 bg-[linear-gradient(135deg,#0f172a_0%,#12263f_45%,#1d4ed8_100%)] text-white shadow-[0_32px_90px_rgba(15,23,42,0.22)]">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1.62fr)_minmax(290px,0.78fr)] lg:px-10 lg:py-10">
            <div className="min-w-0 flex flex-col justify-between gap-8">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                  {seasonLabel ? <span>Season {seasonLabel}</span> : null}
                  {summary?.config?.game_type ? (
                    <span>{String(summary.config.game_type)}</span>
                  ) : null}
                </div>
                <div className="space-y-3">
                  <h1 className="max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                    {title}
                  </h1>
                  {venueMetaParts.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                      {venueMetaParts.map((part, index) => (
                        <span
                          key={`${part}-${index}`}
                          className="inline-flex items-center gap-2"
                        >
                          {index > 0 ? <span className="text-white/55">/</span> : null}
                          <span>{part}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                    {summary?.divisionName ? <span>{summary.divisionName}</span> : null}
                    {summary?.formatType ? (
                      <span className="capitalize">
                        {String(summary.formatType).replace(/_/g, " ")}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {summary?.teamCount ?? 0} teams
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-full overflow-hidden pb-1">
                <div className="flex max-w-full flex-nowrap items-center gap-2">
                  <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
                    <Calendar className="h-3.5 w-3.5" />
                    {scheduleLabel ?? "Schedule"}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                    Schedule
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {scheduleLabel || "To be announced"}
                  </div>
                </div>
                <div className="flex min-h-[132px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950/25 p-3 sm:min-h-[148px]">
                  {eventSummary?.organizerLogoUrl ? (
                    <div className="flex h-full w-full items-center justify-center">
                      <Image
                        src={eventSummary.organizerLogoUrl}
                        alt={
                          eventSummary.organizerLogoName ||
                          eventSummary.tournamentTitle ||
                          "Organizer logo"
                        }
                        width={320}
                        height={320}
                        className="block h-full max-h-[124px] w-full max-w-full object-contain sm:max-h-[140px]"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                        Organizer
                      </div>
                      <div className="mt-2 text-sm font-semibold text-white/80">
                        {eventSummary?.organizerLogoName || "Logo coming soon"}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                  Stage overview
                </div>
                {eventSummary && eventSummary.stages.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {eventSummary.stages.map((stageItem, index) => (
                      <span
                        key={stageItem.documentId || `${stageItem.title}-${index}`}
                        className="inline-flex items-center rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/72"
                      >
                        {stageItem.title?.trim() || `Stage ${index + 1}`}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-white/70">
                    No stages published yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {!slugIsCanonical && canonicalSlug ? (
          <Link
            href={`/tournaments/team/${canonicalSlug}`}
            className="text-xs font-medium text-amber-600 hover:underline dark:text-amber-400"
          >
            View canonical URL
          </Link>
        ) : null}

        {/* Stage chips + view tabs, like the tournament pages */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
            {(
              [
                { key: "qualifications", label: "Qualifications" },
                { key: "final", label: "Final Round" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStage(tab.key)}
                className={clsx(
                  "flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                  stage === tab.key
                    ? "bg-cyan-600 text-white"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
            {(
              [
                { key: "matches", label: "Matches" },
                { key: "ranking", label: "Ranking" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setView(tab.key)}
                className={clsx(
                  "flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                  view === tab.key
                    ? "bg-cyan-600 text-white"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
          {view === "matches" ? "Matches" : "Ranking"} ·{" "}
          {stage === "qualifications" ? "Qualifications" : "Final Round"}
        </div>

        {detail === null ? (
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            <Trophy className="h-4 w-4" /> Tournament data is not available yet.
          </div>
        ) : null}

        {detail !== null && stage === "qualifications" && view === "matches" ? (
          <div className="flex flex-col gap-6">
            {sortedGroups.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                No matches yet.
              </div>
            ) : (
              sortedGroups.map((group) => (
                <MatchesByGroup
                  key={group.documentId || group.groupKey}
                  group={group}
                  matches={matchesByGroupKey.get(group.groupKey) ?? []}
                  summary={summary}
                />
              ))
            )}
          </div>
        ) : null}

        {detail !== null && stage === "qualifications" && view === "ranking" ? (
          <div className="flex flex-col gap-6">
            <QualificationRankingTable
              rows={allStandingRows}
              groups={groups}
              biathlon={biathlon}
            />
            {sortedGroups.map((group) => (
              <GroupStandingsTable
                key={group.documentId || group.groupKey}
                group={group}
                biathlon={biathlon}
                rows={resolveStandingRows(
                  group,
                  standingsByGroup[group.groupKey] ?? [],
                )}
              />
            ))}
          </div>
        ) : null}

        {detail !== null && stage === "final" && view === "matches" ? (
          <div className="flex flex-col gap-6">
            {koMatches.length > 0 ? (
              <KnockoutBracket matches={koMatches} summary={summary} />
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                Final Round matches will appear here once the qualifications are complete.
              </div>
            )}
          </div>
        ) : null}

        {detail !== null && stage === "final" && view === "ranking" ? (
          <div className="flex flex-col gap-6">
            {koMatches.length > 0 ? (
              <FinalStandingsTable
                koMatches={koMatches}
                qualifiedRows={allStandingRows}
              />
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                Final standings will appear here once the Final Round is complete.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
