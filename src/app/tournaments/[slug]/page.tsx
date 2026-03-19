import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { TournamentDetailPage } from "@/components/tournaments/TournamentDetailPage";
import { CmsPageShell } from "@/components/cms/CmsPageShell";
import { getCmsAppearance, getCmsSiteSettings } from "@/lib/cms/strapi";
import { buildTournamentSlug, resolveTournamentEventSummary } from "@/lib/tournaments";

type Props = {
  params: Promise<{ slug: string }>;
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
      canonical: `/tournaments/${buildTournamentSlug(summary.documentId, summary.title)}`,
    },
  };
}

export default async function TournamentPage({ params }: Props) {
  const { slug } = await params;
  const [summary, settings, appearance] = await Promise.all([
    resolveTournamentEventSummary(slug),
    getCmsSiteSettings(),
    getCmsAppearance(),
  ]);

  if (!summary) {
    notFound();
  }

  const canonicalSlug = buildTournamentSlug(summary.documentId, summary.title);
  if (slug !== canonicalSlug) {
    permanentRedirect(`/tournaments/${canonicalSlug}`);
  }

  return (
    <CmsPageShell settings={settings} appearance={appearance}>
      <TournamentDetailPage summary={summary} />
    </CmsPageShell>
  );
}
