"use client";

/**
 * Μία γραμμή αποτελέσματος μέσα στο box της αγωνιστικής:
 *   ομάδες + σκορ, και με κλικ ανοίγουν τα αναλυτικά
 *   (στατιστικά ομάδων Π/ΣΤ/Σερί/Επιμ./Μ.Ο./Βαθ. + αγώνες ανά αθλητή).
 *
 * Το πλαίσιο της αγωνιστικής (και οι όμιλοι μέσα του) ζουν στο TeamGroupResults.
 */

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  boardPointsOf,
  formatAvg,
  isForfeitBoard,
  type NormalizedTeamMatch,
  type TeamMatchSet,
  type TeamSetPlayer,
  type TeamTournamentSummary,
} from "@/lib/teamTournaments";
import {
  pickPlayerName,
  playerProfileHref,
  type NameVariant,
} from "@/lib/playerNameVariant";

/** Ελληνικό δεκαδικό κόμμα στους μέσους όρους (0,300 αντί για 0.300). */
const comma = (value: string): string => value.replace(".", ",");

const statusLabel = (status: string): string => {
  const key = String(status ?? "").toLowerCase();
  if (key === "completed") return "Ολοκληρωμένη";
  if (key === "scheduled") return "Προγραμματισμένη";
  return status || "—";
};

export const isCompletedMatch = (match: NormalizedTeamMatch): boolean =>
  match.status === "completed" ||
  (match.computed.boardCount > 0 &&
    (match.computed.homeBoardPoints > 0 || match.computed.awayBoardPoints > 0));

/**
 * Το όνομα του αθλητή στη γραμμή του αγώνα: σύνδεσμος προς το προφίλ όταν έχουμε
 * ταυτότητα, αλλιώς σκέτο κείμενο (ποτέ σπασμένος σύνδεσμος).
 */
const SetPlayerName = ({
  player,
  variant,
  className,
}: {
  player: TeamSetPlayer | null;
  variant: NameVariant;
  className?: string;
}) => {
  const name = pickPlayerName(player, variant) || "—";
  const href = playerProfileHref(player, name);
  if (!href) return <span className={className}>{name}</span>;
  return (
    <Link
      href={href}
      className={clsx(
        className,
        "text-sky-800 underline decoration-sky-300 underline-offset-2 hover:text-sky-950",
      )}
    >
      {name}
    </Link>
  );
};

export function TeamMatchRow({
  match,
  summary,
}: {
  match: NormalizedTeamMatch;
  summary: TeamTournamentSummary | null;
}) {
  const [open, setOpen] = useState(false);
  const completed = isCompletedMatch(match);
  const biathlon = summary?.config?.mode === "biathlon";
  const nameVariant: NameVariant = summary?.nameVariant ?? "international";
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

  // Όλα τα boards «άνευ αγώνα»: δεν υπάρχουν νούμερα αθλητών — μένουν μόνο
  // οι πόντοι αγώνα (Επιμ. 8-0) και οι βαθμοί ομάδας (Βαθ. 2-0).
  const matchForfeit = match.sets.length > 0 && match.sets.every(isForfeitBoard);

  return (
    <div
      className="border-t border-slate-100 first:border-t-0"
      data-bt-match-key={match.documentId || String(match.id ?? "")}
    >
      {/* Η γραμμή με τις δύο ομάδες + σκορ μένει κολλημένη ΚΑΤΩ από την κεφαλίδα της
          αγωνιστικής (104px + 42px ύψος κεφαλίδας = 146px· 89px + 42px = 131px στο
          κινητό) όσο διαρκούν τα αναλυτικά — τη σπρώχνει έξω ο επόμενος αγώνας.
          Χρειάζεται αδιαφανές φόντο, αλλιώς φαίνονται τα νούμερα από κάτω. */}
      <div
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
        className={clsx(
          "sticky top-[131px] z-10 flex cursor-pointer items-center gap-3 bg-white px-4 py-2.5 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 lg:top-[146px]",
          open && "border-b border-slate-200 shadow-[0_4px_10px_rgba(15,23,42,0.08)]",
        )}
      >
        <span
          className={clsx(
            "min-w-0 flex-1 truncate text-right text-[13px]",
            homeWon ? "font-bold text-slate-950" : "font-semibold text-slate-600",
          )}
        >
          {match.homeTeamName}
        </span>
        <span
          className={clsx(
            "shrink-0 rounded-lg px-2 py-0.5 text-[12px] font-extrabold tabular-nums",
            completed ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-400",
          )}
        >
          {completed ? `${c.homeBoardPoints} – ${c.awayBoardPoints}` : "–"}
        </span>
        <span
          className={clsx(
            "min-w-0 flex-1 truncate text-left text-[13px]",
            awayWon ? "font-bold text-slate-950" : "font-semibold text-slate-600",
          )}
        >
          {match.awayTeamName}
        </span>
        {!completed ? (
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
            {statusLabel(match.status)}
          </span>
        ) : null}
        <span
          className={clsx(
            "shrink-0 text-[11px] text-slate-400 transition-transform",
            open && "rotate-180",
          )}
        >
          ▾
        </span>
      </div>

      {open ? (
        <div className="bg-slate-50/60 pb-2">
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
                  <th title="Επιμέρους πόντοι αγώνων" className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.08em]">Επιμ.</th>
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
                    <td className="px-2 py-1.5 text-center text-slate-700">{completed && !matchForfeit ? team.points : "—"}</td>
                    <td className="px-2 py-1.5 text-center text-slate-700">{completed && !matchForfeit ? team.innings : "—"}</td>
                    <td className="px-2 py-1.5 text-center text-slate-700">{completed && !matchForfeit ? team.highRun : "—"}</td>
                    <td className="px-2 py-1.5 text-center text-slate-700">{completed ? team.boards : "—"}</td>
                    <td className="px-2 py-1.5 text-center text-slate-700">
                      {completed && !matchForfeit
                        ? teamAvg(team.points, caromValues[index], team.innings)
                        : "—"}
                    </td>
                    <td className="px-2 py-1.5 text-center font-extrabold text-slate-900">
                      {completed ? team.leaguePoints : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {match.sets.length > 0 ? (
            <div className="mt-1.5 overflow-x-auto">
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
                    const bp = boardPointsOf(set);
                    const forfeit = isForfeitBoard(set);
                    const home = set.homePoints ?? 0;
                    const away = set.awayPoints ?? 0;
                    // «Άνευ αγώνα»: 2-0 στο κάθε board, χωρίς ονόματα και νούμερα αθλητών.
                    const shownHome = forfeit ? bp.home : home;
                    const shownAway = forfeit ? bp.away : away;
                    const homeInnings = set.homeInnings ?? 0;
                    const awayInnings = set.awayInnings ?? 0;
                    const caromBoard = Boolean(biathlon && set.boardIndex === 2);
                    return (
                      <tr
                        key={set.documentId || `${set.boardIndex}-${index}`}
                        className={index % 2 === 0 ? "bg-[#f7fbff]" : "bg-white"}
                      >
                        <td className="px-1.5 py-1.5 text-center text-slate-600">{forfeit ? "" : set.homeHighRun ?? 0}</td>
                        <td className="px-1.5 py-1.5 text-center text-slate-600">
                          {forfeit ? "" : comma(formatAvg(home, homeInnings, caromBoard))}
                        </td>
                        <td className="px-1.5 py-1.5 text-center text-slate-600">{forfeit ? "" : homeInnings}</td>
                        <td className="px-2.5 py-1.5 text-right">
                          <SetPlayerName
                            player={set.homePlayer}
                            variant={nameVariant}
                            className={bp.home === 2 ? "font-bold text-slate-950" : "text-slate-700"}
                          />
                        </td>
                        <td
                          className={clsx(
                            "px-1.5 py-1.5 text-center font-bold",
                            bp.home === 2 ? "text-teal-700" : "text-slate-800",
                          )}
                        >
                          {shownHome}
                        </td>
                        <td className="text-center text-slate-300">–</td>
                        <td
                          className={clsx(
                            "px-1.5 py-1.5 text-center font-bold",
                            bp.away === 2 ? "text-teal-700" : "text-slate-800",
                          )}
                        >
                          {shownAway}
                        </td>
                        <td className="px-2.5 py-1.5 text-left">
                          <SetPlayerName
                            player={set.awayPlayer}
                            variant={nameVariant}
                            className={bp.away === 2 ? "font-bold text-slate-950" : "text-slate-700"}
                          />
                        </td>
                        <td className="px-1.5 py-1.5 text-center text-slate-600">{forfeit ? "" : awayInnings}</td>
                        <td className="px-1.5 py-1.5 text-center text-slate-600">
                          {forfeit ? "" : comma(formatAvg(away, awayInnings, caromBoard))}
                        </td>
                        <td className="px-1.5 py-1.5 text-center text-slate-600">{forfeit ? "" : set.awayHighRun ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
