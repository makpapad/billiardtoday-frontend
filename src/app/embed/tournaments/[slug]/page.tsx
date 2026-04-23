import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { TournamentDetailPage } from "@/components/tournaments/TournamentDetailPage";
import { getCmsPageWidth } from "@/lib/cms/layout";
import { getCmsAppearance } from "@/lib/cms/strapi";
import { getRankingSeriesData } from "@/lib/rankings";
import { buildTournamentSlug, resolveTournamentEventSummary } from "@/lib/tournaments";
import type { EventApiResponse } from "@/app/tournaments/events/types";

type Props = {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = params;
  const summary = await resolveTournamentEventSummary(slug);

  return {
    title: summary ? `${summary.title} Embed` : "Tournament Embed",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function EmbedTournamentPage({ params, searchParams }: Props) {
  const { slug } = params;
  const resolvedSearchParams = searchParams ?? {};
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
    </div>
  );
}
