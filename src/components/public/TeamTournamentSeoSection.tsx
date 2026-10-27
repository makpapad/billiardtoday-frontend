import Link from "next/link";
import { pickPlayerName, playerProfileHref } from "@/lib/playerNameVariant";
import type { TeamGroup, TeamTournamentDetail } from "@/lib/teamTournaments";

/**
 * Server-rendered περιεχόμενο ομαδικής διοργάνωσης: ομάδες + ρόστερ με links στα
 * προφίλ των αθλητών.
 *
 * Η σελίδα είναι tabbed client UI: στο HTML έβγαιναν ~1.500 χαρακτήρες και κανένα
 * link, γιατί τα ρόστερ εμφανίζονται μόνο όταν ο χρήστης ανοίξει καρτέλα/modal.
 * Τα δεδομένα υπάρχουν ήδη server-side (`detail`), οπότε δεν χρειάζεται νέο query.
 */
export function TeamTournamentSeoSection({ detail }: { detail: TeamTournamentDetail }) {
  const groups: TeamGroup[] = detail.groups ?? [];
  const rosters = detail.rosters ?? {};
  const variant = detail.summary?.nameVariant ?? "international";

  const teams = new Map<string, { name: string; documentId: string | null }>();
  for (const group of groups) {
    for (const team of group.teams ?? []) {
      const key = team.documentId || `${group.groupKey}-${team.name}`;
      if (!teams.has(key)) teams.set(key, { name: team.name, documentId: team.documentId });
    }
  }

  // Ομάδες που δεν ανήκουν σε όμιλο αλλά έχουν ρόστερ (π.χ. πριν την κλήρωση).
  for (const [documentId, members] of Object.entries(rosters)) {
    if (members.length === 0) continue;
    if (![...teams.values()].some((team) => team.documentId === documentId)) {
      teams.set(documentId, { name: detail.summary?.title ?? "Team", documentId });
    }
  }

  const squads = [...teams.values()]
    .map((team) => ({ team, members: team.documentId ? rosters[team.documentId] ?? [] : [] }))
    .filter((entry) => entry.members.length > 0);

  if (squads.length === 0) return null;

  const playerCount = squads.reduce((sum, entry) => sum + entry.members.length, 0);

  return (
    <section className="bg-gradient-to-br from-slate-50 to-blue-50 px-4 pb-10 dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-6xl">
        <details className="rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-800 sm:p-7">
          <summary className="cursor-pointer list-none text-base font-semibold text-gray-950 dark:text-white">
            Teams &amp; squads — {detail.summary?.title ?? "Team tournament"} ({squads.length} teams,{" "}
            {playerCount} players)
          </summary>

          <div className="mt-5 space-y-6">
            {squads.map(({ team, members }) => (
              <div key={team.documentId ?? team.name}>
                <h3 className="text-sm font-semibold text-gray-950 dark:text-white">{team.name}</h3>
                <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  {members.map((member) => {
                    const name = pickPlayerName(member, variant) || member.international || member.national || "";
                    if (!name) return null;
                    const href = playerProfileHref(member, name);
                    return (
                      <li key={member.documentId ?? name} className="text-gray-700 dark:text-gray-200">
                        {href ? (
                          <Link className="underline decoration-dotted hover:text-blue-700" href={href}>
                            {name}
                          </Link>
                        ) : (
                          name
                        )}
                        {member.isCaptain ? (
                          <span className="text-gray-500 dark:text-gray-400"> · captain</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
