import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CebPdfRankingContent } from "@/components/public/CebPdfRankingContent";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { readCebPdfCategory } from "@/lib/cebRankingData";

export const revalidate = 300;

const SLUG = "3c-ladies";

export const metadata: Metadata = buildPageMetadata({
  title: "CEB 3-Cushion Ladies Ranking — European Standings (official sheet)",
  description:
    "The official CEB 3-cushion ladies ranking (Confédération Européenne de Billard), shown as the CEB publishes it — the official sheet, edition 13/2026, with the full BilliardToday data version on the way.",
  path: `/rankings/ceb/${SLUG}`,
  keywords: [
    "CEB ladies ranking",
    "3 cushion ladies ranking",
    "European billiard ranking ladies",
    "carom billiards standings women",
    "CEB 3C ladies",
  ],
});

/**
 * Κατηγορία CEB σε pdf-mode: δείχνει το επίσημο φύλλο της CEB μέσα στο δικό μας
 * layout. Όλο το περιεχόμενο το αποδίδει το κοινό `CebPdfRankingContent` — η σελίδα
 * είναι μόνο το binding του slug στα δεδομένα (`pdf-sources.json`), ώστε κάθε επόμενη
 * κατηγορία να προσθέτεται χωρίς νέο κώδικα απόδοσης.
 */
export default function CebThreeCushionLadiesPage() {
  const category = readCebPdfCategory(SLUG);
  if (!category) notFound();

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-4 py-10 sm:px-6">
      <CebPdfRankingContent category={category} campaign={`ceb-ranking-${SLUG}`} />
    </div>
  );
}
