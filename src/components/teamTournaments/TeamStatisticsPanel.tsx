"use client";

/**
 * Καρτέλα «Statistics» της ομαδικής σελίδας — ίδια λογική με τη σελίδα
 * «Στατιστικά» της εφαρμογής της ΕΟΑΑ: δύο πίνακες, ομαδικά και αθλητές,
 * με συντομεύσεις + tooltips (όχι μακριές επικεφαλίδες).
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import type { NormalizedTeamMatch } from "@/lib/teamTournaments";
import { buildTeamTournamentStats, type TeamStatRow } from "@/lib/teamTournamentStats";
import { playerProfileHref, type NameVariant } from "@/lib/playerNameVariant";
import { TeamPlayersModal, avgText } from "@/components/teamTournaments/TeamPlayersModal";
import { teamTournamentLabels, type LabelLocale } from "@/lib/teamTournamentLabels";

type Props = {
  matches: NormalizedTeamMatch[];
  groupCount: number;
  /** national → εθνικά ονόματα· international (προεπιλογή) → International Name. */
  nameVariant?: NameVariant;
  /** Γλώσσα ετικετών της διοργάνωσης (προεπιλογή: ελληνικά). */
  labelLocale?: LabelLocale;
};

const GroupPill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={clsx(
      "rounded-full border px-3 py-1.5 text-[11px] font-bold transition",
      active
        ? "border-sky-600 bg-sky-50 text-sky-700"
        : "border-slate-200 bg-white text-slate-500 hover:text-slate-800",
    )}
  >
    {children}
  </button>
);

export function TeamStatisticsPanel({
  matches,
  groupCount,
  nameVariant = "international",
  labelLocale,
}: Props) {
  const labels = teamTournamentLabels(labelLocale);
  const stats = useMemo(
    () => buildTeamTournamentStats(matches, nameVariant),
    [matches, nameVariant],
  );
  const groupKeys = useMemo(
    () => Array.from(new Set(stats.teams.map((row) => row.groupKey))).sort(),
    [stats.teams],
  );
  const [scope, setScope] = useState<string>("all");
  /** Η ομάδα της οποίας οι αθλητές δείχνονται σε modal (null = κλειστό). */
  const [selectedTeam, setSelectedTeam] = useState<TeamStatRow | null>(null);

  const teams = scope === "all" ? stats.teams : stats.teams.filter((row) => row.groupKey === scope);
  const players =
    scope === "all" ? stats.players : stats.players.filter((row) => row.groupKey === scope);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[26px] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">{labels.statisticsTitle}</h2>
            <p className="mt-1 text-[12.5px] text-slate-500">
              {labels.statisticsRecordsPrefix}{" "}
              <strong className="text-slate-800">{stats.playedMatches}</strong>
              {labels.statisticsRecordsSuffix(stats.scheduledMatches)}
              {groupCount > 1 ? <> {labels.groupCountSuffix(groupCount)}</> : null}.{' '}
              {labels.statisticsLive}
            </p>
          </div>
          {groupKeys.length > 1 ? (
            <div className="flex flex-wrap gap-1.5">
              <GroupPill active={scope === "all"} onClick={() => setScope("all")}>
                {labels.allGroups}
              </GroupPill>
              {groupKeys.map((key) => (
                <GroupPill key={key} active={scope === key} onClick={() => setScope(key)}>
                  {labels.groupPillLabel(key)}
                </GroupPill>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {stats.playedMatches === 0 ? (
        <div className="rounded-[18px] border border-dashed border-slate-300 bg-white p-4 text-[13px] text-slate-500">
          {labels.statsEmpty}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3 text-[13px] font-bold uppercase tracking-[0.14em] text-slate-500">
              {labels.playersSection}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="w-8 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">#</th>
                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-[0.06em]">{labels.colPlayer}</th>
                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-[0.06em]">{labels.colTeam}</th>
                    <th title={labels.tipMatchesPlayed} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">{labels.colGames}</th>
                    <th title={labels.tipPointsCaroms} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">{labels.colPointsShort}</th>
                    <th title={labels.tipInnings} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">{labels.colInningsShort}</th>
                    <th title={labels.tipAvgFormula} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">{labels.colAvgShort}</th>
                    <th title={labels.tipBest} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">{labels.colBest}</th>
                    <th title={labels.tipWins} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">{labels.colWinsShort}</th>
                    <th title={labels.tipDraws} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">{labels.colDraws}</th>
                    <th title={labels.tipLosses} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">{labels.colLossesShort}</th>
                    <th title={labels.tipRun} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">{labels.colRunShort}</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((row, index) => (
                    <tr key={`${row.groupKey}-${row.teamName}-${row.key}`} className="border-t border-slate-100">
                      <td className="px-2 py-2 text-center text-slate-400">{index + 1}</td>
                      <th scope="row" className="max-w-[220px] px-2 py-2 text-left text-[12px] font-bold text-slate-900">
                        {playerProfileHref({ id: row.playerId, documentId: row.documentId }, row.name) ? (
                          <Link
                            href={playerProfileHref({ id: row.playerId, documentId: row.documentId }, row.name)!}
                            className="text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
                          >
                            {row.name}
                          </Link>
                        ) : (
                          row.name
                        )}
                      </th>
                      <td className="max-w-[200px] truncate px-2 py-2 text-left text-[11.5px] text-slate-500">
                        {row.teamName}
                      </td>
                      <td className="px-2 py-2 text-center text-slate-600">{row.games}</td>
                      <td className="px-2 py-2 text-center text-slate-600">{row.caroms}</td>
                      <td className="px-2 py-2 text-center text-slate-600">{row.innings}</td>
                      <td className="px-2 py-2 text-center font-semibold text-slate-800">{avgText(row.avg)}</td>
                      <td className="px-2 py-2 text-center text-slate-600">{avgText(row.best)}</td>
                      <td className="px-2 py-2 text-center text-slate-600">{row.wins}</td>
                      <td className="px-2 py-2 text-center text-slate-600">{row.draws}</td>
                      <td className="px-2 py-2 text-center text-slate-600">{row.losses}</td>
                      <td className="px-2 py-2 text-center text-slate-600">{row.series || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3 text-[13px] font-bold uppercase tracking-[0.14em] text-slate-500">
              {labels.teamsSection}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="w-8 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">#</th>
                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-[0.06em]">{labels.colTeam}</th>
                    <th title={labels.tipMatches} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">{labels.colGamesShort}</th>
                    <th title={labels.tipPointsCaroms} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">{labels.colPointsShort}</th>
                    <th title={labels.tipInnings} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">{labels.colInningsShort}</th>
                    <th title={labels.tipAvgFormula} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">{labels.colAvgShort}</th>
                    <th title={labels.tipDiffBoards} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">{labels.colDiff}</th>
                    <th title={labels.tipRun} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">{labels.colRunShort}</th>
                    <th title={labels.tipPts} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">{labels.colPtsShort}</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((row, index) => (
                    <tr key={`${row.groupKey}-${row.teamName}`} className="border-t border-slate-100">
                      <td className="px-2 py-2 text-center text-slate-400">{index + 1}</td>
                      <th scope="row" className="max-w-[260px] px-2 py-2 text-left text-[12px] font-bold text-slate-900">
                        <button
                          type="button"
                          onClick={() => setSelectedTeam(row)}
                          className="text-left text-sky-700 underline decoration-sky-300 underline-offset-2 transition hover:text-sky-900"
                          title={labels.openTeamPlayers}
                        >
                          {row.teamName}
                        </button>
                      </th>
                      <td className="px-2 py-2 text-center text-slate-600">{row.played}</td>
                      <td className="px-2 py-2 text-center text-slate-600">{row.caroms}</td>
                      <td className="px-2 py-2 text-center text-slate-600">{row.innings}</td>
                      <td className="px-2 py-2 text-center font-semibold text-slate-800">{avgText(row.avg)}</td>
                      <td className="px-2 py-2 text-center text-slate-600">
                        {row.boardDiff > 0 ? `+${row.boardDiff}` : row.boardDiff}
                      </td>
                      <td className="px-2 py-2 text-center text-slate-600">{row.highRun || "—"}</td>
                      <td className="px-2 py-2 text-center font-extrabold text-slate-900">{row.leaguePoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </>
      )}

      {selectedTeam ? (
        <TeamPlayersModal
          team={selectedTeam}
          players={stats.players.filter(
            (row) => row.groupKey === selectedTeam.groupKey && row.teamName === selectedTeam.teamName,
          )}
          labelLocale={labelLocale}
          onClose={() => setSelectedTeam(null)}
        />
      ) : null}
    </div>
  );
}
