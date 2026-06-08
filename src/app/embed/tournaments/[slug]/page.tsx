import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { TournamentDetailPage } from "@/components/tournaments/TournamentDetailPage";
import { getCmsPageWidth } from "@/lib/cms/layout";
import { getCmsAppearance } from "@/lib/cms/strapi";
import { getRankingSeriesData } from "@/lib/rankings";
import { buildTournamentSlug, resolveTournamentEventSummary } from "@/lib/tournaments";
import { buildTournamentShareMetadata } from "@/lib/tournamentShareMetadata";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const summary = await resolveTournamentEventSummary(slug);

  return buildTournamentShareMetadata(summary, { embedded: true });
}

export default async function EmbedTournamentPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const [summary, appearance] = await Promise.all([
    resolveTournamentEventSummary(slug),
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
    permanentRedirect(`/embed/tournaments/${canonicalSlug}`);
  }

  const initialSeriesData = summary.rankingSeriesSlug
    ? await getRankingSeriesData(summary.rankingSeriesSlug)
    : null;

  return (
    <div
      className="min-h-screen"
      style={
        {
          ["--bt-page-width" as string]: getCmsPageWidth(appearance),
          background: "#ffffff",
          color: appearance.tokens.text,
          fontFamily: appearance.tokens.bodyFont,
        } as CSSProperties
      }
    >
      <TournamentDetailPage
        summary={summary}
        embedded
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
    </div>
  );
}
