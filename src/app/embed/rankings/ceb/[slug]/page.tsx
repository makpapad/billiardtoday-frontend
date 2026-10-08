import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CebPdfRankingContent } from "@/components/public/CebPdfRankingContent";
import { CebRankingCategoryView } from "@/components/public/CebRankingCategoryView";
import {
  readCebPdfCategory,
  readCebPlayerLinks,
  readCebRanking,
  readCebRankingArchive,
  withCebDbPlayerLinks,
} from "@/lib/cebRankingData";

export const revalidate = 300;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const payload = readCebRanking(slug);
  const pdfCategory = payload ? null : readCebPdfCategory(slug);
  return {
    title: payload
      ? `${payload.title} — CEB Ranking`
      : pdfCategory
        ? `${pdfCategory.title} — CEB Ranking`
        : "CEB Ranking",
    robots: { index: false, follow: false },
  };
}

/**
 * EMBED: η τρέχουσα κατάταξη CEB (/rankings/ceb/<slug>) χωρίς το chrome του site.
 *
 * - Κατηγορία με δεδομένα (έχει JSON): ΙΔΙΑ σελίδα με το embed του 3c-individual, μέσω του
 *   κοινού `CebRankingCategoryView` (ίδιος πίνακας, ίδιο hero, χωρίς header του site) — το
 *   ίδιο render με τη δημόσια σελίδα, χωρίς γραμμή «Source».
 * - Διαφορετικά, pdf-mode fallback: το επίσημο φύλλο της CEB στο ίδιο layout.
 */
export default async function EmbedCebRankingPage({ params }: Props) {
  const { slug } = await params;

  const payload = readCebRanking(slug);
  if (payload) {
    const playerLinks = await withCebDbPlayerLinks(
      payload,
      readCebPlayerLinks(payload.links ?? "official"),
    );
    const archive = readCebRankingArchive(slug);
    return (
      <CebRankingCategoryView
        payload={payload}
        slug={slug}
        playerLinks={playerLinks}
        archive={archive}
        embedded
        campaign={`ceb-ranking-${slug}`}
      />
    );
  }

  const pdfCategory = readCebPdfCategory(slug);
  if (pdfCategory) {
    return (
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-4 py-10 sm:px-6">
        <CebPdfRankingContent
          category={pdfCategory}
          embedded
          campaign={`ceb-ranking-${slug}`}
        />
      </div>
    );
  }

  notFound();
}
