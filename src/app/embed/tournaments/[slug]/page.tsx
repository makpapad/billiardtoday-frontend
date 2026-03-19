import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { TournamentDetailPage } from "@/components/tournaments/TournamentDetailPage";
import { getCmsPageWidth } from "@/lib/cms/layout";
import { getCmsAppearance } from "@/lib/cms/strapi";
import { buildTournamentSlug, resolveTournamentEventSummary } from "@/lib/tournaments";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const summary = await resolveTournamentEventSummary(slug);

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
  const [summary, appearance] = await Promise.all([
    resolveTournamentEventSummary(slug),
    getCmsAppearance(),
  ]);

  if (!summary) {
    notFound();
  }

  const canonicalSlug = buildTournamentSlug(summary.documentId, summary.title, summary.season);
  if (slug !== canonicalSlug) {
    permanentRedirect(`/embed/tournaments/${canonicalSlug}`);
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
