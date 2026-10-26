"use client";

/**
 * Ομαδικά αποτελέσματα ανά όμιλο: αριστερά τα μπλοκ αγώνων (νεότερη
 * αγωνιστική πρώτη, μόνο όσοι έχουν αποτέλεσμα), δεξιά η βαθμολογία του
 * ομίλου — ίδια λογική με τις σελίδες ατομικών τουρνουά.
 */

import { useMemo } from "react";
import clsx from "clsx";
import { TeamMatchBlock } from "@/components/teamTournaments/TeamMatchBlock";
import type {
  ComputedStandingRow,
  NormalizedTeamMatch,
  TeamGroup,
  TeamTournamentSummary,
} from "@/lib/teamTournaments";

const hasResult = (match: NormalizedTeamMatch): boolean =>
  match.status === "completed" ||
  (match.computed.boardCount > 0 &&
    (match.computed.homeBoardPoints > 0 || match.computed.awayBoardPoints > 0));

const avgText = (value: number): string => (value > 0 ? value.toFixed(3) : "—");

export function GroupStandingsPanel({
  group,
  rows,
}: {
  group: TeamGroup;
  rows: ComputedStandingRow[];
}) {
  return (
    <div className="lg:flex lg:max-h-[calc(100vh-150px)] lg:flex-col">
      <div className="flex items-baseline justify-between border-b border-slate-200 px-4 pb-2.5 pt-3.5">
        <h3 className="text-[15px] font-semibold tracking-tight text-slate-950">
          {group.title || `Όμιλος ${group.groupKey}`}
        </h3>
        <span className="text-[11px] text-slate-500">Βαθμολογία ομίλου</span>
      </div>
      <div className="min-h-0 overflow-x-auto lg:flex-1 lg:overflow-y-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="bg-slate-50 text-slate-500 [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-slate-50">
              <th className="w-7 px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">#</th>
              <th className="px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-[0.06em]">Ομάδα</th>
              <th title="Αγώνες" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Α</th>
              <th title="Νίκες" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Ν</th>
              <th title="Ισοπαλίες" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Ι</th>
              <th title="Ήττες" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Η</th>
              <th title="Επιμέρους πόντοι παρτίδων" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Επιμ.</th>
              <th title="Διαφορά παρτίδων" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Διαφ.</th>
              <th title="Μέσος όρος" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Μ.Ο.</th>
              <th title="Βαθμοί" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Βαθ.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const diff = row.framesFor - row.framesAgainst;
              return (
                <tr
                  key={row.key}
                  className={clsx(
                    "border-t border-slate-100",
                    index < 2 && "bg-sky-50/40",
                  )}
                >
                  <td
                    className={clsx(
                      "px-2 py-1.5 text-center",
                      index < 2 ? "font-extrabold text-sky-700" : "text-slate-400",
                    )}
                  >
                    {index + 1}
                  </td>
                  <th
                    scope="row"
                    className="max-w-[190px] px-2 py-1.5 text-left text-[12px] font-bold leading-tight text-slate-900"
                  >
                    {row.teamName}
                  </th>
                  <td className="px-1.5 py-1.5 text-center text-slate-600">{row.matchesPlayed}</td>
                  <td className="px-1.5 py-1.5 text-center text-slate-600">{row.wins}</td>
                  <td className="px-1.5 py-1.5 text-center text-slate-600">{row.draws}</td>
                  <td className="px-1.5 py-1.5 text-center text-slate-600">{row.losses}</td>
                  <td className="px-1.5 py-1.5 text-center text-slate-600">
                    {row.framesFor}–{row.framesAgainst}
                  </td>
                  <td className="px-1.5 py-1.5 text-center text-slate-600">
                    {diff > 0 ? `+${diff}` : diff}
                  </td>
                  <td className="px-1.5 py-1.5 text-center text-slate-600">{avgText(row.avg)}</td>
                  <td className="px-1.5 py-1.5 text-center font-extrabold text-slate-900">
                    {row.leaguePoints}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-200 px-4 py-2 text-[11px] text-slate-500">
        Οι δύο πρώτοι προκρίνονται στην επόμενη φάση.
      </div>
    </div>
  );
}

export function TeamGroupResults({
  group,
  groups,
  activeGroupKey,
  onSelectGroup,
  matches,
  standings,
  summary,
}: {
  group: TeamGroup;
  groups: TeamGroup[];
  activeGroupKey: string;
  onSelectGroup: (groupKey: string) => void;
  matches: NormalizedTeamMatch[];
  standings: ComputedStandingRow[];
  summary: TeamTournamentSummary | null;
}) {
  const rounds = useMemo(() => {
    const byRound = new Map<number, NormalizedTeamMatch[]>();
    matches
      .filter(hasResult)
      .forEach((match) => {
        const round = match.round ?? 0;
        const list = byRound.get(round) ?? [];
        list.push(match);
        byRound.set(round, list);
      });
    return Array.from(byRound.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([round, list]) => ({
        round,
        matches: [...list].sort((a, b) => (a.id ?? 0) - (b.id ?? 0)),
      }));
  }, [matches]);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,430px)]">
      <div className="flex min-w-0 flex-col gap-3.5">
        {rounds.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-300 bg-white p-4 text-[13px] text-slate-500">
            Δεν υπάρχουν ακόμη αποτελέσματα σε αυτόν τον όμιλο. Οι αγώνες εμφανίζονται
            μόλις καταχωρηθούν.
          </div>
        ) : (
          rounds.map((entry) =>
            entry.matches.map((match) => (
              <TeamMatchBlock
                key={match.documentId || `${match.id}-${match.round}`}
                match={match}
                summary={summary}
              />
            )),
          )
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-[104px]">
        {groups.length > 1 ? (
          <div className="flex flex-wrap gap-1.5 rounded-[16px] border border-slate-200 bg-white px-2.5 py-2">
            {groups.map((item) => (
              <button
                key={item.documentId || item.groupKey}
                type="button"
                onClick={() => onSelectGroup(item.groupKey)}
                aria-pressed={item.groupKey === activeGroupKey}
                className={
                  item.groupKey === activeGroupKey
                    ? "rounded-full bg-sky-600 px-3 py-1.5 text-[11px] font-bold text-white transition"
                    : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-500 transition hover:text-slate-800"
                }
              >
                {item.title || `Όμιλος ${item.groupKey}`}
              </button>
            ))}
          </div>
        ) : null}
        <GroupStandingsPanel group={group} rows={standings} />
      </div>
    </div>
  );
}
