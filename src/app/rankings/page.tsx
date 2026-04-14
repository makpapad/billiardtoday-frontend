import Link from "next/link";
import { RANKING_SERIES_CONFIGS } from "@/lib/rankings-config";

export default function RankingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-4 py-10 sm:px-6">
      <section className="rounded-[32px] border border-black/5 bg-[linear-gradient(135deg,#0f172a_0%,#082f49_100%)] px-6 py-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.16)] sm:px-8">
        <div className="max-w-3xl space-y-4">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
            Rankings
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Official ranking lists and circuit standings
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
            Public ranking pages built from published tournament results, ranking points, and cumulative
            circuit averages.
          </p>
        </div>
      </section>

      <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="mb-6 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
            Available rankings
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Current public ranking pages
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {RANKING_SERIES_CONFIGS.map((series) => (
            <Link
              key={series.slug}
              href={`/rankings/${series.slug}`}
              className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_14px_40px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_18px_48px_rgba(15,23,42,0.08)]"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                {series.federationSlug.toUpperCase()}
              </div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                {series.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{series.description}</p>
              <div className="mt-5 text-sm font-semibold text-sky-700">
                Open ranking
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
