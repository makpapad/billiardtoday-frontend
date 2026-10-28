"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { Trophy, Users } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { HeroMenuButton } from "@/components/tournaments/HeroMenuButton";
import {
  type ComputedStandingRow,
  type NormalizedTeamMatch,
  type TeamEntity,
  type TeamGroup,
  type TeamTournamentDetail,
  type TeamTournamentSummary,
} from "@/lib/teamTournaments";
import { TeamGroupResults } from "@/components/teamTournaments/TeamGroupResults";
import { TeamRosterModal } from "@/components/teamTournaments/TeamRosterModal";
import { TeamStatisticsPanel } from "@/components/teamTournaments/TeamStatisticsPanel";
import { TeamTimetablePanel } from "@/components/teamTournaments/TeamTimetablePanel";
import type { TournamentEventSummary } from "@/lib/tournaments";
import { resolveMediaUrl } from "@/lib/mediaUrl";

type Props = {
  detail: TeamTournamentDetail | null;
  title: string;
  eventSummary?: TournamentEventSummary | null;
  canonicalSlug: string;
  slugIsCanonical: boolean;
};

type StageKey = "qualifications" | "final";
type ViewKey = "matches" | "ranking";
/** Τα πλαίσια του hero menu — ίδια λογική με τη σελίδα ατομικού τουρνουά. */
type PanelKey = "tournament" | "timetable" | "stats" | "finals" | "participants" | "info";

const formatSeason = (season: number | null): string | null => {
  if (season === null || !Number.isFinite(season)) return null;
  return `${season}-${(season + 1) % 100}`;
};

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
                  {row.framesFor} – {row.framesAgainst}
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
                    {row.framesFor} – {row.framesAgainst}
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

const isCompleted = (match: NormalizedTeamMatch): boolean =>
  match.status === "completed" ||
  (match.computed.boardCount > 0 &&
    (match.computed.homeBoardPoints > 0 || match.computed.awayBoardPoints > 0));

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
          {completed ? `${homeScore} – ${awayScore}` : "–"}
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
  const [panel, setPanel] = useState<PanelKey>("tournament");
  /** Ο επιλεγμένος όμιλος στα αποτελέσματα — προεπιλογή ο 1ος όμιλος. */
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
  /** Η ομάδα της οποίας οι αθλητές δείχνονται στην καρτέλα «Συμμετοχές» (null = κλειστό). */
  const [rosterTeam, setRosterTeam] = useState<TeamEntity | null>(null);

  const summary = detail?.summary ?? null;
  const groups = detail?.groups ?? [];
  const matches = detail?.matches ?? [];
  const standingsByGroup = detail?.standingsByGroup ?? {};
  const rosters = detail?.rosters ?? {};
  const biathlon = summary?.config?.mode === "biathlon";
  const organizerLogoUrl = eventSummary
    ? resolveMediaUrl(eventSummary.organizerLogoUrl)
    : null;

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

  // Οι μάρκες φάσεων: τα στάδια του event όταν υπάρχουν, αλλιώς Qualifications /
  // Final Round (όπως τα έδειχνε πάντα η σελίδα) ώστε να μη χάνεται η εναλλαγή.
  const stageTabs = useMemo(() => {
    const stages = eventSummary?.stages ?? [];
    if (stages.length === 0) {
      return [
        { key: "qualifications" as StageKey, label: "Qualifications" },
        { key: "final" as StageKey, label: "Final Round" },
      ];
    }
    return stages.map((item, index) => ({
      key: (/final/i.test(String(item.title ?? "")) || (stages.length === 2 && index === 1)
        ? "final"
        : "qualifications") as StageKey,
      label: item.title?.trim() || `Stage ${index + 1}`,
    }));
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
    // Νεότερη αγωνιστική πρώτη — τα μπλοκ που βλέπει πρώτα ο επισκέπτης
    // είναι τα πιο πρόσφατα αποτελέσματα.
    map.forEach((list) => list.sort((a, b) => (b.round ?? 0) - (a.round ?? 0)));
    return map;
  }, [matches]);

  /**
   * Ο όμιλος που βλέπει ο επισκέπτης: πάντα ένας όμιλος (δεν υπάρχει πια «Όλοι οι όμιλοι»),
   * με προεπιλογή τον 1ο όμιλο όσο δεν έχει διαλέξει κάποιον άλλον.
   */
  const effectiveGroupKey = useMemo(() => {
    if (activeGroupKey && activeGroupKey !== "all") return activeGroupKey;
    return sortedGroups[0]?.groupKey ?? "all";
  }, [activeGroupKey, sortedGroups]);

  const activeGroup = useMemo(
    () =>
      activeGroupKey && activeGroupKey !== "all"
        ? (sortedGroups.find((group) => group.groupKey === activeGroupKey) ??
          sortedGroups[0] ??
          null)
        : (sortedGroups[0] ?? null),
    [activeGroupKey, sortedGroups],
  );

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

  // Τα στοιχεία που εμφανίζονται ως παστίλιες στο «Team tournament overview»
  // (ίδια λογική με το overview της ατομικής σελίδας).
  const overviewFacts = useMemo(
    () =>
      [
        { label: "Game type", value: summary?.gameType || "Billiards" },
        { label: "Dates", value: scheduleLabel || "To be announced" },
        { label: "Division", value: summary?.divisionName || null },
        {
          label: "Format",
          value: summary?.formatType
            ? String(summary.formatType).replace(/_/g, " ")
            : null,
        },
        {
          label: "Team size",
          value: summary?.teamSize ? `${summary.teamSize} players` : null,
        },
        { label: "Teams", value: summary?.teamCount ? String(summary.teamCount) : null },
        { label: "Organiser", value: eventSummary?.organizerLogoName || null },
      ].filter((item): item is { label: string; value: string } => Boolean(item.value)),
    [eventSummary, scheduleLabel, summary],
  );

  return (
    <div
      className="mx-auto w-full px-4 py-8"
      style={{ maxWidth: "var(--bt-page-width, 1280px)" }}
    >
      <div className="flex flex-col gap-6">
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
                  <HeroMenuButton
                    label="Tournament"
                    iconSrc="/icons%20webp/Tournament1.webp"
                    active={panel === "tournament"}
                    onClick={() => setPanel("tournament")}
                  />
                  <HeroMenuButton
                    label="Time Table"
                    iconSrc="/icons%20webp/schedule1.webp"
                    active={panel === "timetable"}
                    onClick={() => setPanel("timetable")}
                  />
                  <HeroMenuButton
                    label="Statistics"
                    iconSrc="/icons%20webp/stats1.webp"
                    active={panel === "stats"}
                    onClick={() => setPanel("stats")}
                  />
                  <HeroMenuButton
                    label="Final standings"
                    iconSrc="/icons%20webp/finalrank1.webp"
                    active={panel === "finals"}
                    onClick={() => setPanel("finals")}
                  />
                  <HeroMenuButton
                    label="Participants"
                    iconSrc="/icons%20webp/participants1.webp"
                    active={panel === "participants"}
                    onClick={() => setPanel("participants")}
                  />
                  <HeroMenuButton
                    label="Info"
                    iconSrc="/icons%20webp/info.webp"
                    active={panel === "info"}
                    onClick={() => setPanel("info")}
                  />
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
                  {organizerLogoUrl ? (
                    <div className="flex h-full w-full items-center justify-center">
                      <Image
                        src={organizerLogoUrl}
                        alt={
                          eventSummary?.organizerLogoName ||
                          eventSummary?.tournamentTitle ||
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                    Stage overview
                  </div>
                  <div className="inline-flex items-center rounded-full border border-white/10 bg-slate-950/50 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    {(
                      [
                        { key: "matches", label: "Matches" },
                        { key: "ranking", label: "Ranking" },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setView(tab.key);
                          setPanel("tournament");
                        }}
                        aria-pressed={view === tab.key}
                        className={
                          view === tab.key
                            ? "rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-950 transition"
                            : "rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/68 transition hover:text-white"
                        }
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {stageTabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        setStage(tab.key);
                        setPanel("tournament");
                      }}
                      aria-pressed={stage === tab.key}
                      className={
                        stage === tab.key
                          ? "inline-flex items-center rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-950 transition"
                          : "inline-flex items-center rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/72 transition hover:bg-white/15 hover:text-white"
                      }
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <BackButton fallbackHref="/tournaments/team" />

        {!slugIsCanonical && canonicalSlug ? (
          <Link
            href={`/tournaments/team/${canonicalSlug}`}
            className="text-xs font-medium text-amber-600 hover:underline dark:text-amber-400"
          >
            View canonical URL
          </Link>
        ) : null}

        {/* Ίδιο στήσιμο με τη σελίδα ατομικού τουρνουά: το μενού του hero ανοίγει
            τα πλαίσια (Tournament / Time Table / Final standings / Participants /
            Info), και οι δύο παλιές μπάρες καρτελών ζουν πλέον μέσα στο hero. */}

        {panel !== "info" && detail === null ? (
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            <Trophy className="h-4 w-4" /> Tournament data is not available yet.
          </div>
        ) : null}

        {panel === "tournament" && detail !== null && stage === "qualifications" && view === "matches" ? (
          <div className="flex flex-col gap-4">
            {sortedGroups.length === 0 || activeGroup === null ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                No matches yet.
              </div>
            ) : (
              <TeamGroupResults
                groups={sortedGroups}
                activeGroupKey={effectiveGroupKey}
                onSelectGroup={setActiveGroupKey}
                matchesByGroupKey={matchesByGroupKey}
                standingsForGroup={(group) =>
                  resolveStandingRows(group, standingsByGroup[group.groupKey] ?? [])
                }
                summary={summary}
              />
            )}
          </div>
        ) : null}

        {panel === "tournament" && detail !== null && stage === "qualifications" && view === "ranking" ? (
          <div className="flex flex-col gap-6">
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
            {/* Με έναν μόνο όμιλο η «γενική» κατάταξη είναι ο όμιλος — δεν τη
                δείχνουμε δεύτερη φορά. */}
            {sortedGroups.length > 1 ? (
              <QualificationRankingTable
                rows={allStandingRows}
                groups={groups}
                biathlon={biathlon}
              />
            ) : null}
          </div>
        ) : null}

        {panel === "tournament" && detail !== null && stage === "final" && view === "matches" ? (
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

        {panel === "tournament" && detail !== null && stage === "final" && view === "ranking" ? (
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

        {/* Statistics — ομαδικά & αθλητές, από τα καταχωρημένα αποτελέσματα. */}
        {panel === "stats" ? (
          <TeamStatisticsPanel
            matches={matches}
            groupCount={sortedGroups.length}
            nameVariant={summary?.nameVariant ?? "international"}
          />
        ) : null}

        {/* Time Table — μία κάρτα ανά αγωνιστική, με πρόοδο και φίλτρο ομίλου. */}
        {panel === "timetable" ? (
          <TeamTimetablePanel matches={matches} groups={sortedGroups} />
        ) : null}

        {/* Final standings — ίδιος πίνακας με την καρτέλα Ranking του Final Round. */}
        {panel === "finals" ? (
          <div className="flex flex-col gap-6">
            {koMatches.length > 0 ? (
              <FinalStandingsTable koMatches={koMatches} qualifiedRows={allStandingRows} />
            ) : (
              <div className="rounded-[26px] border border-slate-200 bg-white px-6 py-8 text-sm text-slate-500">
                Final standings will appear here once the Final Round is complete.
              </div>
            )}
          </div>
        ) : null}

        {/* Participants — οι ομάδες ανά όμιλο. */}
        {panel === "participants" ? (
          <div className="flex flex-col gap-6">
            {sortedGroups.length === 0 ? (
              <div className="rounded-[26px] border border-slate-200 bg-white px-6 py-8 text-sm text-slate-500">
                The teams will appear here once the draw is published.
              </div>
            ) : (
              sortedGroups.map((group) => (
                <div
                  key={group.documentId || group.groupKey}
                  className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.05)]"
                >
                  <div className="border-b border-slate-100 px-6 py-4 text-lg font-semibold tracking-tight text-slate-950">
                    {group.title || `Group ${group.groupKey}`}
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {group.teams.map((team) => (
                      <li
                        key={team.documentId || String(team.id ?? team.name)}
                        className="px-6 py-3 text-[15px] font-semibold text-slate-950"
                      >
                        <button
                          type="button"
                          onClick={() => setRosterTeam(team)}
                          title="Άνοιγμα των αθλητών της ομάδας"
                          className="text-left text-sky-700 underline decoration-sky-300 underline-offset-2 transition hover:text-sky-900"
                        >
                          {team.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        ) : null}

        {/* Info — τα στοιχεία της διοργάνωσης, όπως το «Tournament overview». */}
        {panel === "info" ? (
          <details
            open
            className="rounded-[28px] border border-slate-200 bg-white shadow-[0_22px_80px_rgba(15,23,42,0.08)]"
          >
            <summary className="flex cursor-pointer list-none flex-col gap-4 p-6 sm:p-8">
              <div className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                Team tournament overview
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h2>
              <div className="flex flex-wrap gap-2">
                {overviewFacts.map((item) => (
                  <span
                    key={item.label}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600"
                  >
                    {item.label}: {item.value}
                  </span>
                ))}
              </div>
            </summary>
            <div className="border-t border-slate-200 px-6 pb-6 pt-5 sm:px-8 sm:pb-8">
              <div className="flex flex-wrap gap-3 text-sm">
                <Link
                  href="/tournaments/team"
                  className="font-semibold text-sky-700 transition hover:text-sky-900 hover:underline"
                >
                  All team tournaments →
                </Link>
                <Link
                  href="/federations"
                  className="font-semibold text-sky-700 transition hover:text-sky-900 hover:underline"
                >
                  Federations directory →
                </Link>
              </div>
            </div>
          </details>
        ) : null}

        {/* Κλικ σε ομάδα της καρτέλας «Συμμετοχές» → οι αθλητές που συμμετέχουν στην ομάδα. */}
        {rosterTeam ? (
          <TeamRosterModal
            teamName={rosterTeam.name}
            members={rosterTeam.documentId ? rosters[rosterTeam.documentId] ?? [] : []}
            nameVariant={summary?.nameVariant ?? "international"}
            onClose={() => setRosterTeam(null)}
          />
        ) : null}
      </div>
    </div>
  );
}
