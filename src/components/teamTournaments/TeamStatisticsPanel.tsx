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
import { buildTeamTournamentStats, type PlayerStatRow, type TeamStatRow } from "@/lib/teamTournamentStats";
import { playerProfileHref, type NameVariant } from "@/lib/playerNameVariant";

type Props = {
  matches: NormalizedTeamMatch[];
  groupCount: number;
  /** national → εθνικά ονόματα· international (προεπιλογή) → International Name. */
  nameVariant?: NameVariant;
};

const avgText = (value: number): string => (value > 0 ? value.toFixed(3).replace(".", ",") : "—");

const playerHref = (row: PlayerStatRow): string | null =>
  playerProfileHref({ id: row.playerId, documentId: row.documentId }, row.name);

/**
 * Κατάταξη αθλητών μέσα στην ομάδα: Μ.Ο. → νίκες → μεγαλύτερη στεκιά → αγώνες.
 * (Με ίδιο αριθμό αγώνων κερδίζει ο μέσος όρος, όπως στα φύλλα αγώνα.)
 */
const rankTeamPlayers = (rows: PlayerStatRow[]): PlayerStatRow[] =>
  [...rows].sort(
    (a, b) =>
      b.avg - a.avg ||
      b.wins - a.wins ||
      b.series - a.series ||
      b.games - a.games ||
      a.name.localeCompare(b.name, "el"),
  );

/** Modal με τους αθλητές μιας ομάδας, σε κατάταξη, με τα στατιστικά του ομαδικού. */
function TeamPlayersModal({
  team,
  players,
  onClose,
}: {
  team: TeamStatRow;
  players: PlayerStatRow[];
  onClose: () => void;
}) {
  const ranked = useMemo(() => rankTeamPlayers(players), [players]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Αθλητές ${team.teamName}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-2 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-3.5">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold tracking-tight text-slate-950">{team.teamName}</h3>
            <p className="mt-0.5 text-[11.5px] text-slate-500">
              {ranked.length} {ranked.length === 1 ? "αθλητής" : "αθλητές"} · {team.played}{" "}
              {team.played === 1 ? "αγώνας" : "αγώνες"} ·{" "}
              {team.caroms} πόντοι · {avgText(team.avg)} Μ.Ο. · {team.leaguePoints} βαθμοί
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Κλείσιμο"
            className="ml-auto shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-[12px] font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 overflow-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-slate-50">
                <th className="w-8 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">#</th>
                <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-[0.06em]">ΑΘΛΗΤΗΣ</th>
                <th title="Αγώνες" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Αγ</th>
                <th title="Πόντοι (καραμπόλες)" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Π</th>
                <th title="Στεκιές (innings)" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">ΣΤ</th>
                <th title="Μέσος όρος: Π ÷ ΣΤ" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Μ.Ο.</th>
                <th title="Καλύτερος μέσος όρος αγώνα" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Best</th>
                <th title="Νίκες" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Ν</th>
                <th title="Ισοπαλίες" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">ΙΣ</th>
                <th title="Ήττες" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Η</th>
                <th title="Μεγαλύτερη στεκιά" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">ΣΤΕΚΙΑ</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((row, index) => (
                <tr key={row.key} className="border-t border-slate-100">
                  <td className="px-2 py-2 text-center font-bold text-slate-400">{index + 1}</td>
                  <th scope="row" className="max-w-[240px] px-2 py-2 text-left text-[12px] font-bold text-slate-900">
                    {playerHref(row) ? (
                      <Link href={playerHref(row)!} className="text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900">
                        {row.name}
                      </Link>
                    ) : (
                      row.name
                    )}
                  </th>
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
        <div className="border-t border-slate-200 px-5 py-2 text-[11px] text-slate-500">
          Κατάταξη με Μ.Ο. αγώνα (μετά νίκες, μεγαλύτερη στεκιά). Άνοιγμα προφίλ με κλικ στο όνομα.
        </div>
      </div>
    </div>
  );
}

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
}: Props) {
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
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">Στατιστικά</h2>
            <p className="mt-1 text-[12.5px] text-slate-500">
              Από <strong className="text-slate-800">{stats.playedMatches}</strong> καταχωρημένες
              συναντήσεις ({stats.scheduledMatches} στο πρόγραμμα)
              {groupCount > 1 ? <> · {groupCount} όμιλοι</> : null}. Όλα βγαίνουν ζωντανά από τους
              αγώνες.
            </p>
          </div>
          {groupKeys.length > 1 ? (
            <div className="flex flex-wrap gap-1.5">
              <GroupPill active={scope === "all"} onClick={() => setScope("all")}>
                Όλοι οι όμιλοι
              </GroupPill>
              {groupKeys.map((key) => (
                <GroupPill key={key} active={scope === key} onClick={() => setScope(key)}>
                  {key.replace(/^GROUP-?/i, "Όμιλος ")}
                </GroupPill>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {stats.playedMatches === 0 ? (
        <div className="rounded-[18px] border border-dashed border-slate-300 bg-white p-4 text-[13px] text-slate-500">
          Δεν υπάρχει καταχωρημένο αποτέλεσμα ακόμη — τα στατιστικά εμφανίζονται μόλις μπει ο
          πρώτος αγώνας.
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3 text-[13px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Αθλητές
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="w-8 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">#</th>
                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-[0.06em]">ΑΘΛΗΤΗΣ</th>
                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-[0.06em]">ΟΜΑΔΑ</th>
                    <th title="Αγώνες που έπαιξε" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">ΑΓΩΝΕΣ</th>
                    <th title="Πόντοι (καραμπόλες)" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Π</th>
                    <th title="Στεκιές (innings)" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">ΣΤ</th>
                    <th title="Μέσος όρος: Π ÷ ΣΤ" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Μ.Ο.</th>
                    <th title="Καλύτερος μέσος όρος αγώνα" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Best</th>
                    <th title="Νίκες" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Ν</th>
                    <th title="Ισοπαλίες" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">ΙΣ</th>
                    <th title="Ήττες" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Η</th>
                    <th title="Μεγαλύτερη στεκιά" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">ΣΤΕΚΙΑ</th>
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
              Ομαδικά
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="w-8 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">#</th>
                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-[0.06em]">ΟΜΑΔΑ</th>
                    <th title="Αγώνες" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Αγ</th>
                    <th title="Πόντοι (καραμπόλες)" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Π</th>
                    <th title="Στεκιές (innings)" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">ΣΤ</th>
                    <th title="Μέσος όρος: Π ÷ ΣΤ" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Μ.Ο.</th>
                    <th title="Διαφορά επιμέρους: ΕΠ+ − ΕΠ−" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Δ</th>
                    <th title="Μεγαλύτερη στεκιά" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">ΣΤΕΚΙΑ</th>
                    <th title="Βαθμοί" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Βαθ.</th>
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
                          title="Άνοιγμα των αθλητών της ομάδας"
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
          onClose={() => setSelectedTeam(null)}
        />
      ) : null}
    </div>
  );
}
