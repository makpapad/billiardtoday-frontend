"use client";

/**
 * Modal «Αθλητές ομάδας» με τα στατιστικά του ομαδικού (πόντοι, στεκιές, Μ.Ο., best,
 * νίκες/ισοπαλίες/ήττες, μεγαλύτερο σέρι), σε κατάταξη.
 *
 * Ανοίγει από δύο σημεία, με τα ίδια δεδομένα: την καρτέλα «Στατιστικά»
 * (TeamStatisticsPanel) και τη βαθμολογία ομίλου (GroupStandingsPanel) — κλικ στο όνομα
 * ομάδας. Δείχνει μόνο όσους έχουν παίξει (τα στατιστικά βγαίνουν από τα boards).
 */

import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { playerProfileHref } from "@/lib/playerNameVariant";
import type { PlayerStatRow, TeamStatRow } from "@/lib/teamTournamentStats";

export const avgText = (value: number): string => (value > 0 ? value.toFixed(3).replace(".", ",") : "—");

const playerHref = (row: PlayerStatRow): string | null =>
  playerProfileHref({ id: row.playerId, documentId: row.documentId }, row.name);

/**
 * Κατάταξη αθλητών μέσα στην ομάδα: Μ.Ο. → νίκες → μεγαλύτερο σέρι → αγώνες.
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
export function TeamPlayersModal({
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

  if (typeof document === "undefined") return null;

  return createPortal(
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
                <th title="Στεκιές" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">ΣΤ</th>
                <th title="Μέσος όρος: Π ÷ ΣΤ" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Μ.Ο.</th>
                <th title="Καλύτερος μέσος όρος αγώνα" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Best</th>
                <th title="Νίκες" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Ν</th>
                <th title="Ισοπαλίες" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">ΙΣ</th>
                <th title="Ήττες" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Η</th>
                <th title="Σέρι — η μεγαλύτερη σειρά πόντων" className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.06em]">ΣΕΡΙ</th>
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
          Κατάταξη με Μ.Ο. αγώνα (μετά νίκες, μεγαλύτερο σέρι). Άνοιγμα προφίλ με κλικ στο όνομα.
        </div>
      </div>
    </div>,
    document.body,
  );
}
