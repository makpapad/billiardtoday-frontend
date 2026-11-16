import Link from "next/link";
import type { PlayerTeamHistoryRow } from "@/lib/playerTeamHistoryServer";

/**
 * Server-rendered ομαδικό αρχείο αγώνων του αθλητή.
 *
 * Ίδια λογική με το `PlayerArchiveSection`: το client component με τα φίλτρα
 * φορτώνει τα δεδομένα με JavaScript, άρα ο crawler δεν έβλεπε τίποτα. Εδώ το
 * ίδιο περιεχόμενο (διοργάνωση, ομάδα, αντίπαλος, σκορ, innings, Μ.Ο.) μπαίνει
 * στο HTML — και μαζί εσωτερικοί σύνδεσμοι προς τις σελίδες των ομαδικών.
 */
export function PlayerTeamArchiveSection({
  matches,
  playerLabel,
}: {
  matches: PlayerTeamHistoryRow[];
  playerLabel: string;
}) {
  if (matches.length === 0) return null;

  const bySeason = new Map<string, Map<string, PlayerTeamHistoryRow[]>>();
  for (const row of matches) {
    const seasonKey = row.season || "Season not recorded";
    const tournamentKey = `${row.tournamentTitle ?? "Team competition"}|${row.groupTitle ?? ""}`;
    if (!bySeason.has(seasonKey)) bySeason.set(seasonKey, new Map());
    const tournaments = bySeason.get(seasonKey)!;
    if (!tournaments.has(tournamentKey)) tournaments.set(tournamentKey, []);
    tournaments.get(tournamentKey)!.push(row);
  }

  const seasons = [...bySeason.keys()].sort((left, right) => right.localeCompare(left));

  return (
    <section className="bg-gradient-to-br from-blue-50 to-indigo-50 px-4 pb-10 dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-6xl">
        <details className="rounded-2xl bg-white p-3 shadow-xl dark:bg-gray-800 sm:p-7">
          <summary className="cursor-pointer list-none text-base font-semibold text-gray-950 dark:text-white">
            Team competition record &amp; match results — {playerLabel}
          </summary>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            {matches.length} team {matches.length === 1 ? "match" : "matches"} across{" "}
            {seasons.length} {seasons.length === 1 ? "season" : "seasons"} listed below.
          </p>

          <div className="mt-6 space-y-6">
            {seasons.map((season) => (
              <div key={season}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                  {season}
                </h3>
                <div className="mt-3 space-y-4">
                  {[...bySeason.get(season)!.entries()].map(([tournamentKey, rows]) => {
                    const first = rows[0];
                    const wins = rows.filter((row) => row.result === "win").length;
                    const draws = rows.filter((row) => row.result === "draw").length;
                    const losses = rows.filter((row) => row.result === "loss").length;
                    const points = rows.reduce((sum, row) => sum + row.points, 0);
                    const innings = rows.reduce((sum, row) => sum + row.innings, 0);
                    const avg = innings > 0 ? points / innings : 0;

                    return (
                      <article
                        key={`${season}-${tournamentKey}`}
                        className="rounded-xl border border-gray-100 p-2 dark:border-gray-700 sm:p-4"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h4 className="text-sm font-semibold text-gray-950 dark:text-white">
                            {first.tournamentHref ? (
                              <Link href={first.tournamentHref} className="hover:text-sky-700">
                                {first.tournamentTitle ?? "Team competition"}
                              </Link>
                            ) : (
                              (first.tournamentTitle ?? "Team competition")
                            )}
                          </h4>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {[first.discipline, first.groupTitle].filter(Boolean).join(" · ")}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                          {rows.length} {rows.length === 1 ? "match" : "matches"} · {wins}W-{draws}D-
                          {losses}L · {points} points · {innings} innings · average {avg.toFixed(3)}
                          {first.teamName ? ` · team ${first.teamName}` : ""}
                        </p>

                        <ul className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                          {rows.slice(0, 12).map((row, index) => (
                            <li key={`${row.id}-${index}`}>
                              {[
                                row.date ? row.date.slice(0, 10) : null,
                                row.round ? `Round ${row.round}` : row.stage,
                                row.opponent ? `vs ${row.opponent}` : null,
                                row.result
                                  ? `${row.result} ${row.points}-${row.oppPoints}`
                                  : `${row.points}-${row.oppPoints}`,
                                row.innings ? `${row.innings} innings` : null,
                                row.highRun > 0 ? `run ${row.highRun}` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </li>
                          ))}
                          {rows.length > 12 ? <li>and {rows.length - 12} more matches</li> : null}
                        </ul>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
