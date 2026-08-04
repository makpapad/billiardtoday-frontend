import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CmsPageShell } from "@/components/cms/CmsPageShell";
import { TeamTournamentDetailClient } from "@/components/teamTournaments/TeamTournamentDetailClient";
import { getCmsAppearance, getCmsSiteSettings } from "@/lib/cms/strapi";
import {
  buildTeamTournamentSlug,
  fetchTeamTournamentDetail,
  resolveTeamTournamentBySlug,
} from "@/lib/teamTournaments";
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
  const [summary, settings, appearance] = await Promise.all([
    resolveTeamTournamentBySlug(slug),
    getCmsSiteSettings(),
    getCmsAppearance(),
  ]);

  if (!summary) {
    notFound();
  }

  const detail = await fetchTeamTournamentDetail(summary.documentId);
  const canonicalSlug = buildTeamTournamentSlug(summary);
  const isCanonical = slug === canonicalSlug;

  return (
    <CmsPageShell settings={settings} appearance={appearance}>
      <TeamTournamentDetailClient
        detail={detail}
        title={summary.title}
        canonicalSlug={canonicalSlug}
        slugIsCanonical={isCanonical}
      />
    </CmsPageShell>
  );
}
