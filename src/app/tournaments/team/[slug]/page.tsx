import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TeamTournamentDetailClient } from "@/components/teamTournaments/TeamTournamentDetailClient";
import {
  buildTeamTournamentSlug,
  fetchTeamTournamentDetail,
  resolveTeamTournamentBySlug,
} from "@/lib/teamTournaments";
import { resolveTournamentEventSummary } from "@/lib/tournaments";
import { buildPageMetadata } from "@/lib/pageMetadata";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const summary = await resolveTeamTournamentBySlug(slug);
  if (!summary) {
    return buildPageMetadata({
      title: "Team Tournament",
      description: "Team tournament details.",
      path: `/tournaments/team/${slug}`,
    });
  }
  return buildPageMetadata({
    title: summary.title,
    description: `Team tournament ${summary.title}${
      summary.divisionName ? ` — ${summary.divisionName}` : ""
    }: groups, matches, and standings.`,
    path: `/tournaments/team/${slug}`,
  });
}

export default async function TeamTournamentPage({ params }: Props) {
  const { slug } = await params;
  const summary = await resolveTeamTournamentBySlug(slug);

  if (!summary) {
    notFound();
  }

  const detail = await fetchTeamTournamentDetail(summary.documentId);
  const eventSummary = await resolveTournamentEventSummary(slug);
  const canonicalSlug = buildTeamTournamentSlug(summary);
  const isCanonical = slug === canonicalSlug;

  return (
    <TeamTournamentDetailClient
      detail={detail}
      title={summary.title}
      eventSummary={eventSummary}
      canonicalSlug={canonicalSlug}
      slugIsCanonical={isCanonical}
    />
  );
}
