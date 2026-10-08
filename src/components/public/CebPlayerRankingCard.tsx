import Link from "next/link";
import type { CebPlayerRanking } from "@/lib/cebRankingData";
import { formatCebDate, normalizeCebSuspension } from "@/lib/cebRanking";

type Props = {
  ranking: CebPlayerRanking;
  /** Όνομα παίκτη για το «← Back to …» στη σελίδα τουρνουά. */
  playerLabel?: string | null;
};

/**
 * Το CEB ranking του παίκτη, όπως στο προφίλ: θέση, σύνολο πόντων και η ανάλυση
 * ανά διοργάνωση (A–J, όπως ο επίσημος πίνακας). Server component — χωρίς JS.
 */
export function CebPlayerRankingCard({ ranking, playerLabel }: Props) {
  const { row, events, federations } = ranking;
  const withBack = (href: string) =>
    playerLabel
      ? `${href}${href.includes("?") ? "&" : "?"}back=${encodeURIComponent(playerLabel)}`
      : href;
  const suspension = normalizeCebSuspension(row.suspended);
  const suspendedOn = formatCebDate(suspension?.since);
  const federationLabel = federations[row.fed] ?? row.fed;
  const counting = row.ev.filter((value) => value !== null).length;

  return (
    <section className="bg-gradient-to-br from-blue-50 to-indigo-50 px-4 pb-2 pt-6 dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-800 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Official CEB ranking · edition {ranking.edition}
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-gray-100">
                3-Cushion Individual — European Ranking
              </h2>
              <p className="mt-1 text-[12.5px] text-slate-500">
                Position and points of every counting tournament (European Championship + the World Cups held
                in Europe).
              </p>
            </div>
            <div className="flex items-stretch gap-2">
              <div className="min-w-[74px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center dark:border-gray-700 dark:bg-gray-900">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Position
                </span>
                <span className="block text-xl font-black leading-tight text-slate-900 dark:text-gray-100">
                  #{row.rank}
                </span>
              </div>
              <div className="min-w-[74px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center dark:border-gray-700 dark:bg-gray-900">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Points
                </span>
                <span className="block text-xl font-black leading-tight text-slate-900 dark:text-gray-100">
                  {row.points}
                </span>
              </div>
              <div className="min-w-[74px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center dark:border-gray-700 dark:bg-gray-900">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Federation
                </span>
                <span className="block text-xl font-black leading-tight text-slate-900 dark:text-gray-100">
                  {row.fed}
                </span>
              </div>
            </div>
          </div>

          {suspendedOn ? (
            <p
              className={`mt-3 inline-flex rounded-md border px-2 py-[2px] text-[10px] font-bold uppercase tracking-wide ${
                suspension?.mark === "yellow"
                  ? "border-amber-400/60 text-amber-700"
                  : "border-slate-400/50 text-slate-600"
              }`}
            >
              {suspension?.mark === "yellow" ? "suspended for 3 months" : "suspended for 1 year"} from{" "}
              {suspendedOn}
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {events.map((event, index) => {
              const value = row.ev[index] ?? null;
              const caption =
                event.city ?? formatCebDate(event.date) ?? "awarded by each federation";
              const title = `${event.name}${event.city ? ` — ${event.city}` : ""}${
                event.date ? ` · ${formatCebDate(event.date)}` : ""
              } · points ${event.scale.join(" / ")}`;
              const body = (
                <>
                  <span className="block truncate text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
                    {event.short}
                  </span>
                  <span
                    className={`block text-[15px] font-black leading-tight ${
                      value === null ? "text-slate-300" : "text-slate-900 dark:text-gray-100"
                    }`}
                  >
                    {value === null ? "–" : value}
                  </span>
                  <span className="block truncate text-[10px] text-slate-400">{caption}</span>
                </>
              );
              const className =
                "rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-left transition dark:border-gray-700 dark:bg-gray-900";
              return event.href ? (
                <Link
                  key={event.key}
                  href={withBack(event.href)}
                  title={`${title} — event page on BilliardToday`}
                  className={`${className} hover:border-blue-300 hover:bg-blue-50/70 dark:hover:border-blue-700 dark:hover:bg-gray-800`}
                >
                  {body}
                </Link>
              ) : (
                <div key={event.key} title={title} className={className}>
                  {body}
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-slate-500">
            <span>
              Points from {counting} of {events.length} counting events · the national championship columns are
              awarded by each federation.
            </span>
            <span className="text-slate-400">{federationLabel}</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 text-[13px] dark:border-gray-700">
            <Link
              href={`/rankings/ceb/${ranking.rankingSlug}`}
              className="font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-400"
            >
              Full CEB list →
            </Link>
            <a
              href={ranking.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-500 hover:text-slate-700"
            >
              Official CEB PDF ↗
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
