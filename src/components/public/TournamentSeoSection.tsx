import Link from "next/link";
import type { TournamentSeoData } from "@/lib/tournamentSeoServer";

/**
 * Server-rendered περιεχόμενο διοργάνωσης: συμμετέχοντες (με links στα προφίλ)
 * και τελική κατάταξη. Χωρίς αυτό, το HTML της σελίδας διοργάνωσης είχε ~1.600
 * χαρακτήρες και κανένα εσωτερικό link.
 *
 * ΠΟΥ ΖΕΙ: μέσα στο «Tournament Overview» (TournamentDetailPage), όχι πια σε δικό του
 * κουτί κάτω από τη σελίδα. Δύο ανοιγόμενες κάρτες με τον ίδιο τίτλο διοργάνωσης ήταν
 * διπλή πληροφορία — τώρα υπάρχει ΕΝΑ σημείο που ανοίγει και τα περιέχει όλα.
 * Το περιεχόμενο μένει στο HTML (δεν αποδίδεται υπό όρους), άρα το βλέπει και ο crawler.
 */

const cellClass = "py-2 pr-3 text-slate-600 dark:text-slate-300";

export function TournamentSeoSection({ data }: { data: TournamentSeoData }) {
  const hasStandings = data.standings.length > 0;
  const hasParticipants = data.participants.length > 0;
  if (!hasStandings && !hasParticipants) return null;

  const period = [data.startDate, data.endDate].filter(Boolean).join(" — ");

  return (
    <div className="mt-6 space-y-6">
      {hasStandings ? (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Final standings
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
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
                  <tr key={standing.key} className="border-t border-slate-100">
                    <td className={cellClass}>{standing.position ?? "-"}</td>
                    <td className="py-2 pr-3 font-medium text-slate-900 dark:text-white">
                      {standing.player ? (
                        <Link className="underline decoration-dotted hover:text-blue-700" href={standing.player.href}>
                          {standing.player.name}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className={cellClass}>{standing.player?.country ?? "-"}</td>
                    <td className={cellClass}>{standing.points ?? "-"}</td>
                    <td className={cellClass}>{standing.matchPoints ?? "-"}</td>
                    <td className={cellClass}>{standing.innings ?? "-"}</td>
                    <td className={cellClass}>
                      {standing.bestAverage !== null ? standing.bestAverage.toFixed(3) : "-"}
                    </td>
                    <td className={cellClass}>{standing.highRun ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Showing the first {data.standings.length} places of the final classification.
          </p>
        </div>
      ) : null}

      {hasParticipants ? (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Participants ({data.participants.length})
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {[data.title, data.season ? `season ${data.season}` : null, data.gameType, period || null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <ul className="mt-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {data.participants.map((player) => (
              <li key={player.documentId} className="text-slate-700 dark:text-slate-200">
                <Link className="underline decoration-dotted hover:text-blue-700" href={player.href}>
                  {player.name}
                </Link>
                {[player.country, player.seed ? `seed ${player.seed}` : null, player.ranking ? `rank ${player.ranking}` : null]
                  .filter(Boolean).length > 0 ? (
                  <span className="text-slate-500 dark:text-slate-400">
                    {` · ${[player.country, player.seed ? `seed ${player.seed}` : null, player.ranking ? `rank ${player.ranking}` : null]
                      .filter(Boolean)
                      .join(" · ")}`}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
