import type { Metadata } from "next";
import Link from "next/link";
import { Users, Trophy } from "lucide-react";
import {
  buildTeamTournamentSlug,
  fetchTeamTournaments,
  type TeamTournamentSummary,
} from "@/lib/teamTournaments";
import { buildPageMetadata } from "@/lib/pageMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Team Tournaments",
  description:
    "Διασυλλογικά πρωταθλήματα — team tournaments with groups, matches, and standings.",
  path: "/tournaments/team",
});

const formatSeason = (season: number | null): string | null => {
  if (season === null || !Number.isFinite(season)) return null;
  return `Season ${season}-${(season + 1) % 100}`;
};

function TournamentCard({ tournament }: { tournament: TeamTournamentSummary }) {
  const slug = buildTeamTournamentSlug(tournament);
  const seasonLabel = formatSeason(tournament.season);

  return (
    <Link
      href={`/tournaments/team/${slug}`}
      className="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-cyan-500/60 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-cyan-400/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-gray-900 group-hover:text-cyan-600 dark:text-gray-100 dark:group-hover:text-cyan-300">
            {tournament.title}
          </h2>
          {tournament.divisionName ? (
            <div className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {tournament.divisionName}
            </div>
          ) : null}
        </div>
        <Trophy className="h-5 w-5 shrink-0 text-amber-500" />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        {seasonLabel ? <span>{seasonLabel}</span> : null}
        {tournament.formatType ? (
          <span className="capitalize">{tournament.formatType}</span>
        ) : null}
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {tournament.teamCount} teams
        </span>
      </div>
    </Link>
  );
}

export default async function TeamTournamentsPage() {
  const tournaments = await fetchTeamTournaments();

  return (
    <div
      className="mx-auto w-full px-4 py-8"
      style={{ maxWidth: "var(--bt-page-width, 1280px)" }}
    >
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Team Tournaments
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Διασυλλογικά πρωταθλήματα — click a tournament to view its groups,
          matches, and standings.
        </p>

        {tournaments.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            No team tournaments found yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((tournament) => (
              <TournamentCard
                key={tournament.documentId || tournament.title}
                tournament={tournament}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
