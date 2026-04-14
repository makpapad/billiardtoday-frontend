import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCountryFlagCdnUrl } from "@/lib/countryFlags";
import { getRankingSeriesConfigBySlug } from "@/lib/rankings-config";
import { getRankingSeriesData } from "@/lib/rankings";

type Props = {
  params: Promise<{ slug: string }>;
};

const formatDate = (value: string | null) => {
  if (!value) return "Date pending";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatAverage = (value: number) => value.toFixed(3);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const config = getRankingSeriesConfigBySlug(slug);

  if (!config) {
    return {
      title: "Ranking not found",
    };
  }

  return {
    title: config.title,
    description: config.description,
    alternates: {
      canonical: `/rankings/${config.slug}`,
    },
  };
}

export default async function RankingSeriesPage({ params }: Props) {
  const { slug } = await params;
  const data = await getRankingSeriesData(slug);

  if (!data) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-8 px-4 py-10 sm:px-6">
      <section className="rounded-[32px] border border-black/5 bg-[linear-gradient(135deg,#0f172a_0%,#082f49_100%)] px-6 py-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.16)] sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
              CEB Rankings
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{data.title}</h1>
            <p className="max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
              {data.description}
            </p>
          </div>
          <Link
            href={`/federations/${data.federationSlug}`}
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Back to federation
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="mb-5 flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              Leaderboard
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Series ranking
            </h2>
          </div>

          {data.leaderboard.length > 0 ? (
            <div className="overflow-x-auto rounded-[24px] border border-slate-200">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-slate-950 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">#</th>
                    <th className="px-4 py-3 text-left font-semibold">Player</th>
                    {data.tournaments.map((tournament) => (
                      <th key={tournament.key} className="px-4 py-3 text-center font-semibold">
                        {tournament.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center font-semibold">Total Points</th>
                    <th className="px-4 py-3 text-center font-semibold">GEN AVG</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leaderboard.map((row) => (
                    <tr
                      key={`${row.playerDocumentId ?? row.playerName}-${row.rank}`}
                      className="border-t border-slate-200 bg-white text-slate-700"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-950">{row.rank}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {getCountryFlagCdnUrl(row.playerCountry, 40) ? (
                            <img
                              src={getCountryFlagCdnUrl(row.playerCountry, 40) ?? ""}
                              alt={row.playerCountry || "flag"}
                              className="h-5 w-7 rounded-sm border border-slate-200 object-cover"
                            />
                          ) : null}
                          <div className="min-w-0 truncate font-medium text-slate-950">
                            {row.playerName}
                          </div>
                        </div>
                      </td>
                      {data.tournaments.map((tournament) => (
                        <td key={tournament.key} className="px-4 py-3 text-center font-semibold">
                          {row.pointsByTournament[tournament.key] ?? 0}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center font-semibold text-slate-950">
                        {row.totalPoints}
                      </td>
                      <td className="px-4 py-3 text-center">{formatAverage(row.genAvg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              No ranking rows are available yet. Publish final results and ranking points for the linked
              tournaments first.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              Counted events
            </div>
            <div className="mt-4 space-y-3">
              {data.tournaments.map((tournament) => (
                <Link
                  key={tournament.key}
                  href={tournament.href}
                  className="block rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 transition hover:border-sky-200 hover:bg-sky-50/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                        {tournament.label}
                      </div>
                      <div className="mt-2 text-base font-semibold text-slate-950">{tournament.title}</div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                        tournament.hasRankingPoints
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {tournament.hasRankingPoints ? "Counted" : "Pending"}
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-slate-600">
                    {formatDate(tournament.startDate)}
                    {tournament.endDate ? ` - ${formatDate(tournament.endDate)}` : ""}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-black/5 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
              Sorting
            </div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-white/75">
              <p>The list is ordered by total ranking points across the counted events.</p>
              <p>When players are tied on points, the cumulative circuit general average is used.</p>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
