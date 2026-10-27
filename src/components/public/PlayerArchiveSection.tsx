import type { PlayerHistoryParticipation } from "@/lib/playerHistoryServer";

/**
 * Server-rendered αρχείο αγώνων του αθλητή.
 *
 * Η σελίδα αθλητή έβγαινε με ~1.500 χαρακτήρες ορατού κειμένου: το ιστορικό
 * (διοργανώσεις, αντίπαλοι, σκορ, Μ.Ο.) φόρτωνε ΜΟΝΟ με JavaScript, οπότε ο
 * crawler δεν έβλεπε τίποτα από αυτά — δεν υπήρχε λόγος να καταταγεί η σελίδα
 * πέρα από το ίδιο το όνομα. Εδώ το ίδιο περιεχόμενο μπαίνει στο HTML.
 *
 * Είναι σε συμπτυγμένο <details> ώστε να μη διπλασιάζει οπτικά την client σελίδα
 * που ο χρήστης ξέρει, αλλά το κείμενο παραμένει στο DOM και διαβάζεται.
 */
export function PlayerArchiveSection({
  items,
  totalCount,
  playerLabel,
}: {
  items: PlayerHistoryParticipation[];
  totalCount: number;
  playerLabel: string;
}) {
  if (items.length === 0) return null;

  const byYear = new Map<number | null, PlayerHistoryParticipation[]>();
  for (const item of items) {
    const key = item.year ?? null;
    const bucket = byYear.get(key);
    if (bucket) bucket.push(item);
    else byYear.set(key, [item]);
  }

  const years = [...byYear.keys()].sort((left, right) => (right ?? 0) - (left ?? 0));
  const shownMatches = items.reduce((sum, item) => sum + item.matches.length, 0);

  return (
    <section className="bg-gradient-to-br from-blue-50 to-indigo-50 px-4 pb-10 dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-6xl">
        <details className="rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-800 sm:p-7">
          <summary className="cursor-pointer list-none text-base font-semibold text-gray-950 dark:text-white">
            Tournament archive &amp; match results — {playerLabel}
          </summary>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            {totalCount} recorded {totalCount === 1 ? "tournament" : "tournaments"} across{" "}
            {years.length} {years.length === 1 ? "season" : "seasons"}
            {shownMatches > 0 ? `, with ${shownMatches} matches listed below` : ""}.
          </p>

          <div className="mt-6 space-y-6">
            {years.map((year) => (
              <div key={year ?? "unknown"}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                  {year ?? "Season not recorded"}
                </h3>
                <div className="mt-3 space-y-4">
                  {(byYear.get(year) ?? []).map((item) => (
                    <article
                      key={item.id}
                      className="rounded-xl border border-gray-100 p-4 dark:border-gray-700"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h4 className="text-sm font-semibold text-gray-950 dark:text-white">
                          {item.tournament}
                        </h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {[item.gameType, item.position].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                        {item.totalMatches} {item.totalMatches === 1 ? "match" : "matches"}
                        {item.totalMatches > 0
                          ? ` · ${item.wins}W-${item.losses}L · average ${item.avgPerInning.toFixed(3)}${
                              item.highestRun > 0 ? ` · high run ${item.highestRun}` : ""
                            }`
                          : ""}
                      </p>
                      {item.matches.length > 0 ? (
                        <ul className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                          {item.matches.slice(0, 8).map((match, index) => (
                            <li key={`${item.id}-${match.id}-${index}`}>
                              {[
                                match.stage,
                                match.opponent,
                                match.result
                                  ? `${match.result} ${match.scoreFor}-${match.scoreAgainst}`
                                  : null,
                                match.innings ? `${match.innings} innings` : null,
                                match.highRun ? `run ${match.highRun}` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </li>
                          ))}
                          {item.matches.length > 8 ? (
                            <li>and {item.matches.length - 8} more matches</li>
                          ) : null}
                        </ul>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
