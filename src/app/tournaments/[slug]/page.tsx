import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { TournamentDetailPage } from "@/components/tournaments/TournamentDetailPage";
import { CmsPageShell } from "@/components/cms/CmsPageShell";
import { getCmsAppearance, getCmsSiteSettings } from "@/lib/cms/strapi";
import { getRankingSeriesData } from "@/lib/rankings";
import { buildTournamentSlug, resolveTournamentEventSummary } from "@/lib/tournaments";
import {
  buildTeamTournamentSlug,
  fetchTeamTournamentByDocumentId,
} from "@/lib/teamTournaments";
import { buildTournamentShareMetadata } from "@/lib/tournamentShareMetadata";
import { buildTournamentStructuredData } from "@/lib/tournamentStructuredData";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const summary = await resolveTournamentEventSummary(slug);

  if (!summary) {
    return buildTournamentShareMetadata(null);
  }

  return buildTournamentShareMetadata(summary);
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

  // Team tournaments (e.g. CEB National Teams) render on their own detail
  // page with groups/standings/matches — redirect the generic event route
  // there so federation/club lists point to the right page.
  if (summary.teamTournamentDocumentId) {
    const teamSummary = await fetchTeamTournamentByDocumentId(
      summary.teamTournamentDocumentId,
    );
    if (teamSummary) {
      permanentRedirect(`/tournaments/team/${buildTeamTournamentSlug(teamSummary)}`);
    }
  }

  const canonicalSlug = buildTournamentSlug(
    summary.source === "club_tournament"
      ? summary.canonicalId || summary.tournamentSlug || summary.documentId
      : "",
    summary.title,
    summary.season,
  );
  if (slug !== canonicalSlug) {
    permanentRedirect(`/tournaments/${canonicalSlug}`);
  }

  const initialSeriesData = summary.rankingSeriesSlug
    ? await getRankingSeriesData(summary.rankingSeriesSlug)
    : null;

  return (
    <CmsPageShell settings={settings} appearance={appearance}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildTournamentStructuredData(summary)),
        }}
      />
      <TournamentDetailPage
        summary={summary}
        initialEventData={null}
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
