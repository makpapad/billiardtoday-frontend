"use client";

/**
 * Αποτέλεσμα ομαδικού αγώνα σε μπλοκ, πάνω στο πρότυπο του επίσημου φύλλου
 * αγώνα (Β-ΟΜΑΔΙΚΟ … αποτελέσματα.pdf):
 *
 *   κίτρινη μπάρα  →  Αγωνιστική N · ημερομηνία · κατάσταση
 *   σκορ           →  παρτίδες (Επιμ.) + βαθμοί ομάδων
 *   στατιστικά     →  Ομάδα | Π | ΣΤ | Σερί | Επιμ. | Μ.Ο. | Βαθ.
 *   αναλυτικά      →  Σερί | Μ.Ο. | ΣΤ | Όνομα | Πόντοι – Πόντοι | Όνομα | ΣΤ | Μ.Ο. | Σερί
 *
 * Το μπλοκ είναι κλειστό εξ ορισμού· ανοίγει με κλικ οπουδήποτε πάνω του.
 */

import { useState } from "react";
import clsx from "clsx";
import { formatAvg, type NormalizedTeamMatch, type TeamMatchSet, type TeamTournamentSummary } from "@/lib/teamTournaments";

const boardPoints = (set: TeamMatchSet): { home: number; away: number } => {
  const home = set.homePoints ?? 0;
  const away = set.awayPoints ?? 0;
  if (home === 0 && away === 0) return { home: 0, away: 0 };
  if (home > away) return { home: 2, away: 0 };
  if (away > home) return { home: 0, away: 2 };
  return { home: 1, away: 1 };
};

/** Ελληνικό δεκαδικό κόμμα στους μέσους όρους (0,300 αντί για 0.300). */
const comma = (value: string): string => value.replace(".", ",");

const formatMatchDate = (value: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const statusLabel = (status: string): string => {
  const key = String(status ?? "").toLowerCase();
  if (key === "completed") return "Ολοκληρωμένη";
  if (key === "scheduled") return "Προγραμματισμένη";
  return status || "—";
};

const isCompletedMatch = (match: NormalizedTeamMatch): boolean =>
  match.status === "completed" ||
  (match.computed.boardCount > 0 &&
    (match.computed.homeBoardPoints > 0 || match.computed.awayBoardPoints > 0));

export function TeamMatchBlock({
  match,
  summary,
}: {
  match: NormalizedTeamMatch;
  summary: TeamTournamentSummary | null;
}) {
  const [open, setOpen] = useState(false);
  const completed = isCompletedMatch(match);
  const biathlon = summary?.config?.mode === "biathlon";
  const c = match.computed;

  const homePoints = c.homeTeamPoints;
  const awayPoints = c.awayTeamPoints;
  const homeWon = completed && homePoints > awayPoints;
  const awayWon = completed && awayPoints > homePoints;

  const teamAvg = (points: number, carom: number, innings: number): string =>
    comma(biathlon ? formatAvg(carom, innings, true) : formatAvg(points, innings));

  const teams: Array<{
    name: string;
    points: number;
    innings: number;
    highRun: number;
    boards: number;
    leaguePoints: number;
    won: boolean;
  }> = [
    {
      name: match.homeTeamName,
      points: c.homeTotalPoints,
      innings: c.homeTotalInnings,
      highRun: c.homeHighRun,
      boards: c.homeBoardPoints,
      leaguePoints: c.homeTeamPoints,
      won: homeWon,
    },
    {
      name: match.awayTeamName,
      points: c.awayTotalPoints,
      innings: c.awayTotalInnings,
      highRun: c.awayHighRun,
      boards: c.awayBoardPoints,
      leaguePoints: c.awayTeamPoints,
      won: awayWon,
    },
  ];

  const caromValues = [c.homeCaromPoints, c.awayCaromPoints];

  return (
    <article
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={() => setOpen((v) => !v)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setOpen((v) => !v);
        }
      }}
      className="cursor-pointer overflow-hidden rounded-[18px] border border-slate-200 bg-white transition hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
    >
      {/* Κίτρινη μπάρα αγωνιστικής — όπως στο φύλλο αγώνα */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-[#ffc000] px-4 py-2 text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-slate-950">
        <span>Αγωνιστική {match.round ?? "—"}</span>
        <span className="font-semibold text-slate-800/80">{formatMatchDate(match.matchDate)}</span>
        <span className="ml-auto rounded-full bg-slate-950 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.08em] text-white">
          {statusLabel(match.status)}
        </span>
        <span className={clsx("text-[12px] transition-transform", open && "rotate-180")}>
          ▾
        </span>
      </header>

      {/* Σκορ */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 pb-2.5 pt-3.5">
        <div
          className={clsx(
            "truncate text-right text-sm font-bold",
            homeWon ? "text-slate-950" : "text-slate-500",
          )}
        >
          {match.homeTeamName}
        </div>
        <div className="rounded-xl bg-slate-950 px-3 py-1 text-center text-white">
          <b className="text-lg tracking-tight">
            {completed ? `${c.homeBoardPoints}–${c.awayBoardPoints}` : "–"}
          </b>
        </div>
        <div
          className={clsx(
            "truncate text-left text-sm font-bold",
            awayWon ? "text-slate-950" : "text-slate-500",
          )}
        >
          {match.awayTeamName}
        </div>
      </div>

      {/* Στατιστικά ομάδων — εμφανίζονται μαζί με τα αναλυτικά */}
      {open ? (
        <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="bg-[#94dcf8] text-slate-950">
              <th className="px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-[0.08em]">
                Ομάδα
              </th>
              <th title="Πόντοι" className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.08em]">Π</th>
              <th title="Στάσεις (innings)" className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.08em]">ΣΤ</th>
              <th title="Μεγαλύτερη σειρά" className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.08em]">Σερί</th>
              <th title="Επιμέρους πόντοι παρτίδων" className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.08em]">Επιμ.</th>
              <th title="Μέσος όρος" className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.08em]">Μ.Ο.</th>
              <th title="Βαθμοί ομάδας" className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.08em]">Βαθ.</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, index) => (
              <tr
                key={`${team.name}-${index}`}
                className={index === 0 ? "bg-[#eaf7fe]" : "bg-[#f5fcff]"}
              >
                <th
                  scope="row"
                  className={clsx(
                    "max-w-[240px] truncate px-2 py-1.5 text-left text-[12px] font-bold",
                    team.won ? "text-sky-800" : "text-slate-800",
                  )}
                >
                  {team.name}
                </th>
                <td className="px-2 py-1.5 text-center text-slate-700">{completed ? team.points : "—"}</td>
                <td className="px-2 py-1.5 text-center text-slate-700">{completed ? team.innings : "—"}</td>
                <td className="px-2 py-1.5 text-center text-slate-700">{completed ? team.highRun : "—"}</td>
                <td className="px-2 py-1.5 text-center text-slate-700">{completed ? team.boards : "—"}</td>
                <td className="px-2 py-1.5 text-center text-slate-700">
                  {completed ? teamAvg(team.points, caromValues[index], team.innings) : "—"}
                </td>
                <td className="px-2 py-1.5 text-center font-extrabold text-slate-900">
                  {completed ? team.leaguePoints : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      ) : null}

      {/* Αναλυτικά ανά αθλητή — κλειστά εξ ορισμού */}
      <div className="flex items-center justify-center gap-1.5 border-t border-slate-200 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
        <span className={clsx("inline-block transition-transform", open && "rotate-180")}>▾</span>
        Αναλυτικά αγώνα
        <span className="font-semibold normal-case tracking-normal text-slate-400">
          ({match.sets.length} παρτίδες)
        </span>
      </div>

      {open ? (
        <div className="overflow-x-auto border-t border-slate-200">
          <table className="w-full border-collapse text-[11.8px]">
            <thead>
              <tr className="bg-[#f7c7ac] text-slate-950">
                <th title="Μεγαλύτερη σειρά" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Σερί</th>
                <th title="Μέσος όρος" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Μ.Ο.</th>
                <th title="Στάσεις" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">ΣΤ</th>
                <th className="px-2.5 py-1.5 text-right text-[10px] font-bold uppercase tracking-[0.06em]">Όνομα</th>
                <th title="Πόντοι" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Πόντοι</th>
                <th className="w-2" />
                <th title="Πόντοι" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Πόντοι</th>
                <th className="px-2.5 py-1.5 text-left text-[10px] font-bold uppercase tracking-[0.06em]">Όνομα</th>
                <th title="Στάσεις" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">ΣΤ</th>
                <th title="Μέσος όρος" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Μ.Ο.</th>
                <th title="Μεγαλύτερη σειρά" className="px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.06em]">Σερί</th>
              </tr>
            </thead>
            <tbody>
              {match.sets.map((set, index) => {
                const bp = boardPoints(set);
                const home = set.homePoints ?? 0;
                const away = set.awayPoints ?? 0;
                const homeInnings = set.homeInnings ?? 0;
                const awayInnings = set.awayInnings ?? 0;
                const caromBoard = Boolean(biathlon && set.boardIndex === 2);
                return (
                  <tr
                    key={set.documentId || `${set.boardIndex}-${index}`}
                    className={index % 2 === 0 ? "bg-[#f7fbff]" : "bg-white"}
                  >
                    <td className="px-1.5 py-1.5 text-center text-slate-600">{set.homeHighRun ?? 0}</td>
                    <td className="px-1.5 py-1.5 text-center text-slate-600">
                      {comma(formatAvg(home, homeInnings, caromBoard))}
                    </td>
                    <td className="px-1.5 py-1.5 text-center text-slate-600">{homeInnings}</td>
                    <td
                      className={clsx(
                        "px-2.5 py-1.5 text-right",
                        bp.home === 2 ? "font-bold text-slate-950" : "text-slate-700",
                      )}
                    >
                      {set.homePlayerName || "—"}
                    </td>
                    <td
                      className={clsx(
                        "px-1.5 py-1.5 text-center font-bold",
                        bp.home === 2 ? "text-teal-700" : "text-slate-800",
                      )}
                    >
                      {home}
                    </td>
                    <td className="text-center text-slate-300">–</td>
                    <td
                      className={clsx(
                        "px-1.5 py-1.5 text-center font-bold",
                        bp.away === 2 ? "text-teal-700" : "text-slate-800",
                      )}
                    >
                      {away}
                    </td>
                    <td
                      className={clsx(
                        "px-2.5 py-1.5 text-left",
                        bp.away === 2 ? "font-bold text-slate-950" : "text-slate-700",
                      )}
                    >
                      {set.awayPlayerName || "—"}
                    </td>
                    <td className="px-1.5 py-1.5 text-center text-slate-600">{awayInnings}</td>
                    <td className="px-1.5 py-1.5 text-center text-slate-600">
                      {comma(formatAvg(away, awayInnings, caromBoard))}
                    </td>
                    <td className="px-1.5 py-1.5 text-center text-slate-600">{set.awayHighRun ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </article>
  );
}
