import { getCountryFlagPath, getCountryLabel } from "@/lib/countryFlags";
import type { PublicPlayerProfileSummary } from "@/lib/publicSiteData";

type PlayerInstantSummaryProps = {
  summary: PublicPlayerProfileSummary;
};

const formatInteger = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en").format(value)
    : "-";

const formatDecimal = (value: number | null | undefined, digits = 3) =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(digits)
    : "-";

const formatPercent = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(1)}%`
    : "-";

export function PlayerInstantSummary({ summary }: PlayerInstantSummaryProps) {
  const primaryStats = summary.primaryGameStats;
  const countryLabel = getCountryLabel(summary.country);
  const flagPath = getCountryFlagPath(summary.country);
  const profileLine = `${countryLabel ? `${countryLabel} billiard player` : "Billiard player"} with ${
    primaryStats ? `${primaryStats.label} records` : "tournament archive"
  }.`;
  const statCards = primaryStats
    ? [
        { label: "Discipline", value: primaryStats.label },
        { label: "Matches", value: formatInteger(primaryStats.totalMatches) },
        { label: "Wins", value: formatInteger(primaryStats.totalWins) },
        { label: "Win %", value: formatPercent(primaryStats.winPercentage) },
        { label: "Average", value: formatDecimal(primaryStats.avgPerInning) },
        { label: "Best avg", value: formatDecimal(primaryStats.bestAverageFromWins) },
        { label: "High run", value: formatInteger(primaryStats.highestRun) },
      ]
    : [];

  return (
    <section className="bg-gradient-to-br from-blue-50 to-indigo-50 px-4 pt-10 dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-800 sm:p-7 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 sm:h-24 sm:w-24">
                {summary.photoUrl ? (
                  <img
                    src={summary.photoUrl}
                    alt={summary.seoName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-white">
                    {summary.seoName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-950 dark:text-white sm:text-3xl md:text-4xl">
                  {summary.seoName}
                </h1>
                {summary.fullName !== summary.seoName ? (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {summary.fullName}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300 sm:text-base">
                  {flagPath ? (
                    <img
                      src={flagPath}
                      alt={countryLabel || summary.country || ""}
                      width={32}
                      height={24}
                      className="rounded shadow-sm"
                    />
                  ) : null}
                  <span>{profileLine}</span>
                </div>
                {summary.otherGameLabels.length > 0 ? (
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    Other recorded disciplines: {summary.otherGameLabels.join(", ")}.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
              Stats are separated by billiard discipline.
            </div>
          </div>

          {statCards.length > 0 ? (
            <div className="mt-6 grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  className="flex min-h-[96px] flex-col items-center justify-center rounded-xl bg-gray-50 px-3 py-3 text-center dark:bg-gray-700/60"
                >
                  <div className="flex min-h-[30px] items-center justify-center text-[11px] font-medium uppercase leading-tight text-gray-500 dark:text-gray-400">
                    {card.label}
                  </div>
                  <div className="mt-2 flex min-h-[34px] items-center justify-center whitespace-nowrap text-xl font-extrabold leading-none text-gray-950 dark:text-white lg:text-lg xl:text-xl">
                    {card.value}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-xl bg-gray-50 px-4 py-4 text-sm text-gray-600 dark:bg-gray-700/60 dark:text-gray-300">
              Tournament history, match records, averages, high runs, and head-to-head data are available in the archive below.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
