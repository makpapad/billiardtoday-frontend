import Link from "next/link";
import { TournamentEventsContent } from "@/app/tournaments/events/page";
import type { TournamentEventSummary } from "@/lib/tournaments";
import { buildTournamentHref } from "@/lib/tournaments";

type Props = {
  summary: TournamentEventSummary;
  embedded?: boolean;
};

const formatDate = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("el-GR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatDateRange = (start: string | null, end: string | null) => {
  const startText = formatDate(start);
  const endText = formatDate(end);
  if (startText && endText) {
    return startText === endText ? startText : `${startText} - ${endText}`;
  }
  return startText || endText || null;
};

export function TournamentDetailPage({ summary, embedded = false }: Props) {
  const fullPageHref = buildTournamentHref(summary.documentId, summary.title, false);
  const embedPageHref = buildTournamentHref(summary.documentId, summary.title, true);
  const stageCount = summary.stages.length;
  const scheduleLabel = formatDateRange(summary.startDate, summary.endDate);

  return (
    <div className="mx-auto w-full px-4 py-8 sm:px-6" style={{ maxWidth: "var(--bt-page-width, 1280px)" }}>
      <section className="overflow-hidden rounded-[32px] border border-black/5 bg-[linear-gradient(135deg,#0f172a_0%,#12263f_45%,#1d4ed8_100%)] text-white shadow-[0_32px_90px_rgba(15,23,42,0.22)]">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.5fr_0.85fr] lg:px-10 lg:py-10">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Tournament</span>
              {summary.season ? <span>Season {summary.season}</span> : null}
              {summary.gameType ? <span>{summary.gameType}</span> : null}
            </div>
            <div className="space-y-3">
              {summary.tournamentTitle ? (
                <div className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-200/90">
                  {summary.tournamentTitle}
                </div>
              ) : null}
              <h1 className="max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                {summary.title}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-white/75 sm:text-base">
                Public tournament presentation page backed by Strapi event data, with stage tabs, results tables, and an iframe-safe version.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {!embedded ? (
                <Link
                  href={embedPageHref}
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Open embed version
                </Link>
              ) : (
                <Link
                  href={fullPageHref}
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Open full page
                </Link>
              )}
              <Link
                href={`${embedded ? "/embed" : ""}/tournaments/events?eventId=${encodeURIComponent(summary.documentId)}`}
                className="inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Open results-only view
              </Link>
            </div>
          </div>

          <div className="grid gap-3 rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">Schedule</div>
                <div className="mt-2 text-sm font-semibold text-white">{scheduleLabel || "To be announced"}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">Stages</div>
                <div className="mt-2 text-sm font-semibold text-white">{stageCount || 0}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">Stage overview</div>
              {summary.stages.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {summary.stages.map((stage) => (
                    <span
                      key={stage.documentId}
                      className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90"
                    >
                      {stage.title}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-sm text-white/70">No stages published yet.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8">
        <TournamentEventsContent
          eventIdOverride={summary.documentId}
          embeddedOverride={embedded}
          showStandaloneTitle={false}
          showEventHeader={false}
          emptyStateMessage="This tournament page is missing event data."
        />
      </div>
    </div>
  );
}
