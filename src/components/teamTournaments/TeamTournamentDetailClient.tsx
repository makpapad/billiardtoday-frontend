"use client";

import { useMemo, useState } from "react";
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

type Props = {
  detail: TeamTournamentDetail | null;
  title: string;
  canonicalSlug: string;
  slugIsCanonical: boolean;
};

type View = "standings" | "matches";

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

function StandingsTable({
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
              <th className="px-2 py-2 text-center font-medium">P+ / P−</th>
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
              <td className="px-2 py-2.5 text-center text-gray-600 dark:text-gray-300">
                {biathlon
                  ? `${row.pointsFor} / ${row.pointsAgainst}`
                  : `${row.framesFor}–${row.framesAgainst}`}
              </td>
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

export function TeamTournamentDetailClient({
  detail,
  title,
  canonicalSlug,
  slugIsCanonical,
}: Props) {
  const [view, setView] = useState<View>("standings");

  const summary = detail?.summary ?? null;
  const groups = detail?.groups ?? [];
  const matches = detail?.matches ?? [];
  const standingsByGroup = detail?.standingsByGroup ?? {};

  const seasonLabel = formatSeason(summary?.season ?? null);
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
                    {summary?.config?.country ? (
                      <span>{String(summary.config.country).toUpperCase()}</span>
                    ) : null}
                  </div>
                </div>
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

        <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
          {(
            [
              { key: "standings", label: "Standings" },
              { key: "matches", label: "Matches" },
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

        {detail === null ? (
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            <Trophy className="h-4 w-4" /> Tournament data is not available yet.
          </div>
        ) : null}

        {detail !== null && view === "standings" ? (
          <div className="flex flex-col gap-6">
            {sortedGroups.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                No groups have been created for this tournament yet.
              </div>
            ) : (
              sortedGroups.map((group) => (
                <StandingsTable
                  key={group.documentId || group.groupKey}
                  group={group}
                  biathlon={summary?.config?.mode === "biathlon"}
                  rows={resolveStandingRows(
                    group,
                    standingsByGroup[group.groupKey] ?? [],
                  )}
                />
              ))
            )}
          </div>
        ) : null}

        {detail !== null && view === "matches" ? (
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
      </div>
    </div>
  );
}
