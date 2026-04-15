import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import CustomFlowchartClient from "@/app/test/de-bracket-64-custom/CustomFlowchartClient";
import { buildTournamentSlug, resolveTournamentEventSummary } from "@/lib/tournaments";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const summary = await resolveTournamentEventSummary(slug);

  if (!summary) {
    return {
      title: "Tournament flowchart not found",
    };
  }

  return {
    title: `${summary.title} Flowchart`,
    description: `${summary.title} flowchart page.`,
    alternates: {
      canonical: `/tournaments/${buildTournamentSlug(
        summary.tournamentSlug || summary.documentId,
        summary.title,
        summary.season,
      )}/flowchart`,
    },
  };
}

export default async function TournamentFlowchartPage({ params }: Props) {
  const { slug } = await params;
  const summary = await resolveTournamentEventSummary(slug);

  if (!summary) {
    notFound();
  }

  const canonicalSlug = buildTournamentSlug(
    summary.tournamentSlug || summary.documentId,
    summary.title,
    summary.season,
  );
  if (slug !== canonicalSlug) {
    permanentRedirect(`/tournaments/${canonicalSlug}/flowchart`);
  }

  return (
    <CustomFlowchartClient
      eventDocumentId={summary.documentId}
      tournamentSlug={canonicalSlug}
      tournamentTitle={summary.title}
      breadcrumbParentLabel="Tournaments"
      breadcrumbParentHref="/tournaments"
    />
  );
}
