import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TournamentDetailPage } from "@/components/tournaments/TournamentDetailPage";
import { CmsPageShell } from "@/components/cms/CmsPageShell";
import { getCmsAppearance, getCmsSiteSettings } from "@/lib/cms/strapi";
import { extractTournamentDocumentId, getTournamentEventSummary } from "@/lib/tournaments";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const documentId = extractTournamentDocumentId(slug);
  const summary = await getTournamentEventSummary(documentId);

  return {
    title: summary ? `${summary.title} Embed` : "Tournament Embed",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function EmbedTournamentPage({ params }: Props) {
  const { slug } = await params;
  const documentId = extractTournamentDocumentId(slug);
  const [summary, settings, appearance] = await Promise.all([
    getTournamentEventSummary(documentId),
    getCmsSiteSettings(),
    getCmsAppearance(),
  ]);

  if (!summary) {
    notFound();
  }

  return (
    <CmsPageShell settings={settings} appearance={appearance} showChrome={false}>
      <TournamentDetailPage summary={summary} embedded />
    </CmsPageShell>
  );
}
