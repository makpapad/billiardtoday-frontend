import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { TournamentDetailPage } from "@/components/tournaments/TournamentDetailPage";
import { CmsPageShell } from "@/components/cms/CmsPageShell";
import { getCmsAppearance, getCmsSiteSettings } from "@/lib/cms/strapi";
import { getRankingSeriesData } from "@/lib/rankings";
import { buildTournamentSlug, resolveTournamentEventSummary } from "@/lib/tournaments";
import type { EventApiResponse } from "@/app/tournaments/events/types";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const summary = await resolveTournamentEventSummary(slug);

  if (!summary) {
    return {
      title: "Tournament not found",
    };
  }

  const seasonLabel = summary.season ? ` ${summary.season}` : "";

  return {
    title: `${summary.title}${seasonLabel}`,
    description:
      summary.tournamentTitle
        ? `${summary.tournamentTitle} ${seasonLabel} tournament page with stages, standings, and results.`
        : `${summary.title}${seasonLabel} tournament page with stages, standings, and results.`,
    alternates: {
      canonical: `/tournaments/${buildTournamentSlug(
        "",
        summary.title,
        summary.season,
      )}`,
    },
  };
}

export default async function TournamentPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const [summary, settings, appearance] = await Promise.all([
    resolveTournamentEventSummary(slug),
    getCmsSiteSettings(),
    getCmsAppearance(),
  ]);

  if (!summary) {
    notFound();
  }

  const canonicalSlug = buildTournamentSlug(
    "",
    summary.title,
    summary.season,
  );
  if (slug !== canonicalSlug) {
    permanentRedirect(`/tournaments/${canonicalSlug}`);
  }

  let initialEventData: EventApiResponse | null = null;
  const initialSeriesData = summary.rankingSeriesSlug
    ? await getRankingSeriesData(summary.rankingSeriesSlug)
    : null;
  try {
    const eventDataUrl = `http://127.0.0.1:3022/event-data/${encodeURIComponent(summary.documentId)}`;
    const response = await fetch(eventDataUrl, { cache: "no-store" });
    if (response.ok) {
      initialEventData = (await response.json().catch(() => null)) as EventApiResponse | null;
    }
  } catch {
    initialEventData = null;
  }

  return (
    <CmsPageShell settings={settings} appearance={appearance}>
      <TournamentDetailPage
        summary={summary}
        initialEventData={initialEventData}
        initialSeriesData={initialSeriesData}
        preferredStageDocumentId={
          typeof resolvedSearchParams.stage === "string"
            ? resolvedSearchParams.stage
            : null
        }
        preferredGroupParam={
          typeof resolvedSearchParams.group === "string"
            ? resolvedSearchParams.group
            : null
        }
        preferredMatchParam={
          typeof resolvedSearchParams.match === "string"
            ? resolvedSearchParams.match
            : null
        }
      />
    </CmsPageShell>
  );
}
