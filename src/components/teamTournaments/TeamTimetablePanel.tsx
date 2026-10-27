"use client";

/**
 * Καρτέλα «Time Table» της ομαδικής σελίδας.
 *
 * Αντί για μία επίπεδη λίστα 80 γραμμών: μία κάρτα ανά αγωνιστική, με τη σειρά
 * του προγράμματος (η επόμενη αγωνιστική σημασμένη), ημερομηνία, πρόοδο
 * («2/4 αγώνες») και κάθε ζευγάρι με σκορ όταν υπάρχει. Φίλτρο ομίλου.
 */

import { useMemo, useState } from "react";
import clsx from "clsx";
import type { NormalizedTeamMatch, TeamGroup } from "@/lib/teamTournaments";

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

const isPlayed = (match: NormalizedTeamMatch): boolean =>
  match.status === "completed" ||
  (match.computed.boardCount > 0 &&
    (match.computed.homeBoardPoints > 0 || match.computed.awayBoardPoints > 0));

export function TeamTimetablePanel({
  matches,
  groups,
}: {
  matches: NormalizedTeamMatch[];
  groups: TeamGroup[];
}) {
  const [scope, setScope] = useState<string>("all");

  const groupLabel = (key: string): string => {
    const group = groups.find((item) => item.groupKey === key);
    return group?.title || `Όμιλος ${key.replace(/^GROUP-?/i, "")}`;
  };

  const groupKeys = useMemo(
    () => Array.from(new Set(matches.map((match) => match.groupKey))).sort(),
    [matches],
  );

  const filtered = useMemo(
    () => (scope === "all" ? matches : matches.filter((match) => match.groupKey === scope)),
    [matches, scope],
  );

  const rounds = useMemo(() => {
    const byRound = new Map<string, NormalizedTeamMatch[]>();
    filtered.forEach((match) => {
      const key = `${match.stage}|${match.round ?? 0}`;
      const list = byRound.get(key) ?? [];
      list.push(match);
      byRound.set(key, list);
    });

    const entries = Array.from(byRound.entries()).map(([key, list]) => {
      const [stage, roundRaw] = key.split("|");
      const dates = Array.from(
        new Set(list.map((match) => formatDate(match.matchDate)).filter((v): v is string => Boolean(v))),
      );
      const played = list.filter(isPlayed).length;
      return {
        key,
        stage,
        round: Number(roundRaw),
        dateLabel: dates.length === 0 ? null : dates.length === 1 ? dates[0] : dates.join(" · "),
        matches: [...list].sort(
          (a, b) => (a.matchDate ?? "").localeCompare(b.matchDate ?? "") || (a.id ?? 0) - (b.id ?? 0),
        ),
        played,
        total: list.length,
        complete: played === list.length,
      };
    });

    entries.sort((a, b) => {
      const stageRank = (stage: string) => (stage === "ko" ? 1 : 0);
      return stageRank(a.stage) - stageRank(b.stage) || a.round - b.round;
    });

    return entries;
  }, [filtered]);

  const nextKey = rounds.find((entry) => !entry.complete)?.key ?? null;
  const playedTotal = matches.filter(isPlayed).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[26px] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">Πρόγραμμα</h2>
            <p className="mt-1 text-[12.5px] text-slate-500">
              {rounds.length} αγωνιστικές · {playedTotal} από {matches.length} ζευγάρια έχουν
              παιχτεί
              {scope === "all" && groupKeys.length > 1 ? <> · {groupKeys.length} όμιλοι</> : null}
            </p>
          </div>
          {groupKeys.length > 1 ? (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setScope("all")}
                aria-pressed={scope === "all"}
                className={clsx(
                  "rounded-full border px-3 py-1.5 text-[11px] font-bold transition",
                  scope === "all"
                    ? "border-sky-600 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-white text-slate-500 hover:text-slate-800",
                )}
              >
                Όλοι οι όμιλοι
              </button>
              {groupKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setScope(key)}
                  aria-pressed={scope === key}
                  className={clsx(
                    "rounded-full border px-3 py-1.5 text-[11px] font-bold transition",
                    scope === key
                      ? "border-sky-600 bg-sky-50 text-sky-700"
                      : "border-slate-200 bg-white text-slate-500 hover:text-slate-800",
                  )}
                >
                  {groupLabel(key)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {rounds.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-slate-300 bg-white p-4 text-[13px] text-slate-500">
          Το πρόγραμμα θα εμφανιστεί μόλις δημοσιευτούν οι αγώνες.
        </div>
      ) : (
        <div className="grid items-start gap-3.5 xl:grid-cols-2">
          {rounds.map((entry) => (
            <section
              key={entry.key}
              className={clsx(
                "overflow-hidden rounded-[18px] border bg-white",
                entry.key === nextKey ? "border-sky-500/60 shadow-[0_10px_30px_rgba(2,132,199,0.10)]" : "border-slate-200",
              )}
            >
              <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                <span className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-slate-900">
                  {entry.stage === "ko" ? "Final Round" : `Αγωνιστική ${entry.round}`}
                </span>
                {entry.dateLabel ? (
                  <span className="text-[11.5px] font-semibold text-slate-500">{entry.dateLabel}</span>
                ) : (
                  <span className="text-[11.5px] font-semibold text-amber-600">Ημερομηνία: —</span>
                )}
                {entry.key === nextKey ? (
                  <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-white">
                    Επόμενη
                  </span>
                ) : null}
                <span className="ml-auto text-[11px] font-semibold text-slate-500">
                  {entry.played}/{entry.total} αγώνες
                </span>
              </header>
              <ul className="divide-y divide-slate-100">
                {entry.matches.map((match) => {
                  const played = isPlayed(match);
                  const homeWon = played && match.computed.homeBoardPoints > match.computed.awayBoardPoints;
                  const awayWon = played && match.computed.awayBoardPoints > match.computed.homeBoardPoints;
                  return (
                    <li key={match.documentId || String(match.id)} className="flex items-center gap-3 px-4 py-2.5">
                      {scope === "all" && groupKeys.length > 1 ? (
                        <span className="w-[86px] shrink-0 truncate text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400">
                          {match.stage === "ko" ? "KO" : groupLabel(match.groupKey)}
                        </span>
                      ) : null}
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
                          played ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-400",
                        )}
                      >
                        {played
                          ? `${match.computed.homeBoardPoints} – ${match.computed.awayBoardPoints}`
                          : "–"}
                      </span>
                      <span
                        className={clsx(
                          "min-w-0 flex-1 truncate text-left text-[13px]",
                          awayWon ? "font-bold text-slate-950" : "font-semibold text-slate-600",
                        )}
                      >
                        {match.awayTeamName}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
