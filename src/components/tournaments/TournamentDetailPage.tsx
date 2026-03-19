'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LiveScoreDisplay from "@/components/LiveScoreDisplay";
import { TournamentEventsContent } from "@/app/tournaments/events/TournamentEventsContent";
import type { TournamentEventSummary } from "@/lib/tournaments";
import { buildTournamentHref } from "@/lib/tournaments";

type Props = {
  summary: TournamentEventSummary;
  embedded?: boolean;
};

type TournamentLiveScreen = {
  screenId: string;
  screenName: string;
  isActive: boolean;
  tournamentId: string;
  lastUpdate?: string;
};

type TournamentLiveScreensResponse = {
  success: boolean;
  data: Array<{
    tournamentId: string;
    tournamentTitle: string;
    liveScreens: TournamentLiveScreen[];
  }>;
  error?: string;
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
  const fullPageHref = buildTournamentHref(summary.documentId, summary.title, summary.season, false);
  const embedPageHref = buildTournamentHref(summary.documentId, summary.title, summary.season, true);
  const stageCount = summary.stages.length;
  const scheduleLabel = formatDateRange(summary.startDate, summary.endDate);
  const [activeView, setActiveView] = useState<"tournament" | "live">("tournament");
  const [selectedStageDocumentId, setSelectedStageDocumentId] = useState<string | null>(
    summary.stages[0]?.documentId ?? null,
  );
  const [liveScreensData, setLiveScreensData] = useState<TournamentLiveScreensResponse["data"]>([]);
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  useEffect(() => {
    if (activeView !== "live") return;

    let cancelled = false;

    const fetchLiveScreens = async () => {
      try {
        setIsLiveLoading(true);
        setLiveError(null);
        const response = await fetch("/api/admin/tournament/live-screens", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as TournamentLiveScreensResponse | null;

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || "Failed to load live tournament screens.");
        }

        if (!cancelled) {
          setLiveScreensData(Array.isArray(payload.data) ? payload.data : []);
        }
      } catch (error) {
        if (!cancelled) {
          setLiveError(error instanceof Error ? error.message : "Failed to load live tournament screens.");
        }
      } finally {
        if (!cancelled) {
          setIsLiveLoading(false);
        }
      }
    };

    void fetchLiveScreens();
    const interval = window.setInterval(fetchLiveScreens, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeView]);

  const tournamentLiveScreens = useMemo(
    () =>
      liveScreensData
        .filter((item) => item.tournamentId === summary.documentId)
        .flatMap((item) => item.liveScreens ?? []),
    [liveScreensData, summary.documentId],
  );
  const activeLiveScreens = useMemo(
    () => tournamentLiveScreens.filter((screen) => screen.isActive),
    [tournamentLiveScreens],
  );
  const mainContent = activeView === "tournament" ? (
    <TournamentEventsContent
      key={`${summary.documentId}:${selectedStageDocumentId ?? "default"}`}
      eventIdOverride={summary.documentId}
      preferredStageDocumentId={selectedStageDocumentId}
      embeddedOverride={embedded}
      showStandaloneTitle={false}
      showEventHeader={false}
      emptyStateMessage="This tournament page is missing event data."
    />
  ) : (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.08)] sm:p-8">
      <div className="flex flex-col gap-2">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Live</div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Tournament live screens</h2>
        <p className="text-sm leading-7 text-slate-600">
          Available live screens for this tournament without leaving the page.
        </p>
      </div>

      {isLiveLoading ? (
        <div className="mt-6 text-sm text-slate-500">Loading live screens...</div>
      ) : liveError ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {liveError}
        </div>
      ) : tournamentLiveScreens.length === 0 ? (
        <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-600">
          No live screens are currently available for this tournament.
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tournamentLiveScreens.map((screen) => (
              <div
                key={screen.screenId}
                className={
                  screen.isActive
                    ? "rounded-[24px] border border-emerald-200 bg-emerald-50/60 p-5"
                    : "rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-slate-950">{screen.screenName}</div>
                    <div className="mt-1 text-xs text-slate-500">{screen.screenId}</div>
                  </div>
                  <div
                    className={
                      screen.isActive
                        ? "rounded-full bg-emerald-600/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700"
                        : "rounded-full bg-slate-900/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500"
                    }
                  >
                    {screen.isActive ? "Live" : "Offline"}
                  </div>
                </div>
                {screen.lastUpdate ? (
                  <div className="mt-4 text-xs text-slate-500">
                    Last update {new Date(screen.lastUpdate).toLocaleString("el-GR")}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {activeLiveScreens.length > 0 ? (
            <div className="grid gap-6 xl:grid-cols-2">
              {activeLiveScreens.map((screen) => (
                <LiveScoreDisplay
                  key={screen.screenId}
                  screenId={screen.screenId}
                  screenName={screen.screenName}
                  isActive={screen.isActive}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-600">
              Live screens exist for this tournament, but none of them are currently active.
            </div>
          )}
        </div>
      )}
    </section>
  );

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
              <button
                type="button"
                onClick={() => setActiveView("live")}
                className={
                  activeView === "live"
                    ? "inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                    : "inline-flex items-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                }
              >
                Live
              </button>
              <button
                type="button"
                onClick={() => setActiveView("tournament")}
                className={
                  activeView === "tournament"
                    ? "inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                    : "inline-flex items-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                }
              >
                Tournament
              </button>
              {!embedded ? (
                <Link
                  href={embedPageHref}
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/15"
                >
                  Embed
                </Link>
              ) : (
                <Link
                  href={fullPageHref}
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/15"
                >
                  Full page
                </Link>
              )}
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
                    <button
                      key={stage.documentId}
                      type="button"
                      onClick={() => setSelectedStageDocumentId(stage.documentId)}
                      className={
                        selectedStageDocumentId === stage.documentId
                          ? "rounded-full border border-cyan-300/70 bg-cyan-300/20 px-3 py-1.5 text-xs font-medium text-cyan-50 transition hover:bg-cyan-300/30"
                          : "rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:border-white/25 hover:bg-white/15"
                      }
                      aria-pressed={selectedStageDocumentId === stage.documentId}
                    >
                      {stage.title}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-sm text-white/70">No stages published yet.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8">{mainContent}</div>
    </div>
  );
}
