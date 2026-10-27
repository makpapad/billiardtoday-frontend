import Link from "next/link";
import type { TournamentSeoData } from "@/lib/tournamentSeoServer";

/**
 * Server-rendered περιεχόμενο διοργάνωσης: συμμετέχοντες (με links στα προφίλ)
 * και τελική κατάταξη. Χωρίς αυτό, το HTML της σελίδας διοργάνωσης είχε ~1.600
 * χαρακτήρες και κανένα εσωτερικό link.
 */
export function TournamentSeoSection({ data }: { data: TournamentSeoData }) {
  const hasStandings = data.standings.length > 0;
  const hasParticipants = data.participants.length > 0;
  if (!hasStandings && !hasParticipants) return null;

  const period = [data.startDate, data.endDate].filter(Boolean).join(" — ");

  return (
    <section className="bg-gradient-to-br from-slate-50 to-blue-50 px-4 pb-10 dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-6xl space-y-6">
        {hasStandings ? (
          <details className="rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-800 sm:p-7">
            <summary className="cursor-pointer list-none text-base font-semibold text-gray-950 dark:text-white">
              Final standings — {data.title}
              {data.season ? ` ${data.season}` : ""}
            </summary>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="py-2 pr-3">Pos</th>
                    <th className="py-2 pr-3">Player</th>
                    <th className="py-2 pr-3">Country</th>
                    <th className="py-2 pr-3">Pts</th>
                    <th className="py-2 pr-3">MP</th>
                    <th className="py-2 pr-3">Inn</th>
                    <th className="py-2 pr-3">Best avg</th>
                    <th className="py-2">HR</th>
                  </tr>
                </thead>
                <tbody>
                  {data.standings.map((standing) => (
                    <tr key={standing.key} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="py-2 pr-3 text-gray-600 dark:text-gray-300">{standing.position ?? "-"}</td>
                      <td className="py-2 pr-3 font-medium text-gray-900 dark:text-white">
                        {standing.player ? (
                          <Link className="underline decoration-dotted hover:text-blue-700" href={standing.player.href}>
                            {standing.player.name}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-2 pr-3 text-gray-600 dark:text-gray-300">
                        {standing.player?.country ?? "-"}
                      </td>
                      <td className="py-2 pr-3 text-gray-600 dark:text-gray-300">{standing.points ?? "-"}</td>
                      <td className="py-2 pr-3 text-gray-600 dark:text-gray-300">{standing.matchPoints ?? "-"}</td>
                      <td className="py-2 pr-3 text-gray-600 dark:text-gray-300">{standing.innings ?? "-"}</td>
                      <td className="py-2 pr-3 text-gray-600 dark:text-gray-300">
                        {standing.bestAverage !== null ? standing.bestAverage.toFixed(3) : "-"}
                      </td>
                      <td className="py-2 text-gray-600 dark:text-gray-300">{standing.highRun ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Showing the first {data.standings.length} places of the final classification.
            </p>
          </details>
        ) : null}

        {hasParticipants ? (
          <details className="rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-800 sm:p-7">
            <summary className="cursor-pointer list-none text-base font-semibold text-gray-950 dark:text-white">
              Participants — {data.title}
              {data.season ? ` ${data.season}` : ""} ({data.participants.length})
            </summary>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              {[
                data.title,
                data.season ? `season ${data.season}` : null,
                data.gameType,
                period || null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <ul className="mt-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {data.participants.map((player) => (
                <li key={player.documentId} className="text-gray-700 dark:text-gray-200">
                  <Link className="underline decoration-dotted hover:text-blue-700" href={player.href}>
                    {player.name}
                  </Link>
                  <span className="text-gray-500 dark:text-gray-400">
                    {[player.country, player.seed ? `seed ${player.seed}` : null, player.ranking ? `rank ${player.ranking}` : null]
                      .filter(Boolean)
                      .length > 0
                      ? ` · ${[player.country, player.seed ? `seed ${player.seed}` : null, player.ranking ? `rank ${player.ranking}` : null]
                          .filter(Boolean)
                          .join(" · ")}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </section>
  );
}
