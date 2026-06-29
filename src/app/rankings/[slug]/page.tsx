import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCountryFlagCdnUrl } from "@/lib/countryFlags";
import { buildPageMetadata } from "@/lib/pageMetadata";
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

const renderStackedHeader = (top: string, middle: string, bottom: string, align: "left" | "center" = "center") => (
  <div className={`flex flex-col gap-1 ${align === "left" ? "items-start text-left" : "items-center text-center"}`}>
    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">{top}</span>
    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/90">{middle}</span>
    <span className="text-base font-bold uppercase tracking-[0.03em] text-white">{bottom}</span>
  </div>
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getRankingSeriesData(slug);

  if (!data) {
    return {
      title: "Ranking not found",
    };
  }

  return buildPageMetadata({
    title: data.title,
    description: data.description,
    path: `/rankings/${data.slug}`,
  });
}

type RankingSeriesContentProps = {
  data: NonNullable<Awaited<ReturnType<typeof getRankingSeriesData>>>;
  embedded?: boolean;
};

export function RankingSeriesContent({ data, embedded = false }: RankingSeriesContentProps) {
  if (!data) {
    notFound();
  }

  const linkedTournaments = data.tournaments.filter((tournament) => tournament.href);
  const useInlineTournamentCards = linkedTournaments.length > 2;
  const leaderboardSectionClassName = useInlineTournamentCards
    ? "space-y-4"
    : "grid gap-4 lg:grid-cols-[2fr_1fr]";

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-8 px-4 py-10 sm:px-6">
      <section className="rounded-[32px] border border-black/5 bg-[linear-gradient(135deg,#0f172a_0%,#082f49_100%)] px-6 py-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.16)] sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
              {(data.federationName || data.federationSlug || "Official").toUpperCase()} Rankings
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{data.title}</h1>
            <p className="max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
              {data.description}
            </p>
          </div>
          <Link
            href={
              data.federationSlug
                ? `${embedded ? "/embed" : ""}/federations/${data.federationSlug}`
                : `${embedded ? "/embed" : ""}/federations`
            }
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Back to federation
          </Link>
        </div>
      </section>

      <section className={leaderboardSectionClassName}>
        {useInlineTournamentCards ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(280px,1fr)]">
            <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                Counted events
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {linkedTournaments.map((tournament) => (
                  <Link
                    key={tournament.key}
                    href={tournament.href!}
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
        ) : null}

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
                    <th className="w-16 px-3 py-4 text-left font-semibold">
                      {renderStackedHeader("Rank", "Series", "#", "left")}
                    </th>
                    <th className="min-w-[280px] px-4 py-4 text-left font-semibold">
                      {renderStackedHeader("Longoni Next Gen", "Player", "Name", "left")}
                    </th>
                    {data.tournaments.map((tournament) => (
                      <th key={tournament.key} className="min-w-[132px] px-4 py-4 text-center font-semibold">
                        {renderStackedHeader("Next Gen", "Ranking Points", tournament.label)}
                      </th>
                    ))}
                    <th className="min-w-[132px] px-4 py-4 text-center font-semibold">
                      {renderStackedHeader("Next Gen", "Total", "Points")}
                    </th>
                    <th className="min-w-[112px] px-4 py-4 text-center font-semibold">
                      {renderStackedHeader("Circuit", "General", "AVG")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.leaderboard.map((row) => (
                    <tr
                      key={`${row.playerDocumentId ?? row.playerName}-${row.rank}`}
                      className="border-t border-slate-200 bg-white text-slate-700"
                    >
                      <td className="px-3 py-4 font-semibold text-slate-950">{row.rank}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {getCountryFlagCdnUrl(row.playerCountry, 40) ? (
                            <img
                              src={getCountryFlagCdnUrl(row.playerCountry, 40) ?? ""}
                              alt={row.playerCountry || "flag"}
                              className="h-5 w-7 rounded-sm border border-slate-200 object-cover"
                            />
                          ) : null}
                          <div className="min-w-0 truncate text-[15px] font-semibold text-slate-950">
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

        {!useInlineTournamentCards ? (
          <div className="space-y-4">
            <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                Counted events
              </div>
              <div className="mt-4 space-y-3">
                {linkedTournaments.map((tournament) => (
                  <Link
                    key={tournament.key}
                    href={tournament.href!}
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
        ) : null}
      </section>
    </div>
  );
}

export default async function RankingSeriesPage({ params }: Props) {
  const { slug } = await params;
  const data = await getRankingSeriesData(slug);

  if (!data) {
    notFound();
  }

  return <RankingSeriesContent data={data} />;
}
