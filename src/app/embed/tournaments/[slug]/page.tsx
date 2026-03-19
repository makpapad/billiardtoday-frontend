import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { TournamentDetailPage } from "@/components/tournaments/TournamentDetailPage";
import { getCmsPageWidth } from "@/lib/cms/layout";
import { getCmsAppearance } from "@/lib/cms/strapi";
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
  const [summary, appearance] = await Promise.all([
    getTournamentEventSummary(documentId),
    getCmsAppearance(),
  ]);

  if (!summary) {
    notFound();
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
      <TournamentDetailPage summary={summary} embedded />
    </div>
  );
}
