import type { Metadata } from "next";
import { CebRankingCategoryView } from "@/components/public/CebRankingCategoryView";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { readCebPlayerLinks, readCebRanking, readCebRankingArchive } from "@/lib/cebRankingData";
import { notFound } from "next/navigation";

export const revalidate = 300;

const SLUG = "3c-individual";

export const metadata: Metadata = buildPageMetadata({
  title: "CEB 3-Cushion Ranking — European Individual Standings",
  description:
    "The official CEB 3-cushion individual ranking (Confédération Européenne de Billard), with the points of every counting tournament — European Championship and the World Cups held in Europe — and a link to each event page on BilliardToday.",
  path: `/rankings/ceb/${SLUG}`,
  keywords: [
    "CEB ranking",
    "3 cushion ranking",
    "European billiard ranking",
    "carom billiards standings",
    "three cushion Europe",
    "CEB 3C individual",
  ],
});

export default function CebThreeCushionIndividualPage() {
  const payload = readCebRanking(SLUG);
  if (!payload) notFound();
  // Η τρέχουσα λίστα μπορεί να είναι υπολογισμένη από τα δικά μας αποτελέσματα
  // (`links: "computed"`) — τότε οι σύνδεσμοι προφίλ ακολουθούν τη νέα αρίθμηση.
  const playerLinks = readCebPlayerLinks(payload.links ?? "official");
  const archive = readCebRankingArchive(SLUG);

  // Το ίδιο component με κάθε άλλη data-category (π.χ. /rankings/ceb/[slug]) — ένα render,
  // ίδια σελίδα. Το Individual κρατά το δικό του metadata/JSON-LD description.
  return (
    <CebRankingCategoryView
      payload={payload}
      slug={SLUG}
      playerLinks={playerLinks}
      archive={archive}
      itemListDescription={metadata.description}
    />
  );
}
