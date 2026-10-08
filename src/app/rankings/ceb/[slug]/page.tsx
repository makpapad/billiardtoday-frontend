import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cebRankingTitleName } from "@/lib/cebRanking";
import { CebPdfRankingContent } from "@/components/public/CebPdfRankingContent";
import { CebRankingCategoryView } from "@/components/public/CebRankingCategoryView";
import { buildPageMetadata } from "@/lib/pageMetadata";
import {
  readCebPdfCategories,
  readCebPdfCategory,
  readCebPlayerLinks,
  readCebRanking,
  readCebRankingArchive,
  readCebRankingIndex,
  withCebDbPlayerLinks,
} from "@/lib/cebRankingData";

export const revalidate = 300;

type Props = {
  params: Promise<{ slug: string }>;
};

/**
 * Κατηγορίες που έχουν το ΔΙΚΟ ΤΟΥΣ static route (+ subtree, π.χ. αρχείο εκδόσεων) και
 * δεν τις σερβίρει το `[slug]` — το static route υπερισχύει έτσι κι αλλιώς.
 */
const DEDICATED_SLUGS = new Set(["3c-individual"]);

/**
 * Ένα dynamic route για όλες τις κατηγορίες CEB.
 *
 * - Αν υπάρχει αρχείο δεδομένων (`public/data/ceb-ranking/<slug>.json`), η σελίδα
 *   αποδίδεται ΑΚΡΙΒΩΣ όπως η δημοσιευμένη `/rankings/ceb/3c-individual` — ίδιο hero,
 *   ίδιο edition strip, ίδιος πίνακας δεδομένων — μέσω του κοινού `CebRankingCategoryView`.
 * - Αλλιώς, αν η κατηγορία είναι ακόμη σε pdf-mode (`pdf-sources.json`), σερβίρουμε το
 *   επίσημο φύλλο της CEB στο δικό μας layout (`CebPdfRankingContent`). Καθώς κάθε
 *   κατηγορία αποκτά δεδομένα (νέο JSON + εγγραφή στο `index.json`), περνά αυτόματα
 *   στην data εκδοχή — χωρίς νέα σελίδα και χωρίς νέο κώδικα· το pdf-mode μένει fallback.
 * - Σε slug που δεν υπάρχει πουθενά → `notFound()`.
 */
export function generateStaticParams() {
  const dataSlugs = (readCebRankingIndex()?.available ?? []).map((entry) => entry.slug);
  const pdfSlugs = readCebPdfCategories().map((category) => category.slug);
  return Array.from(new Set([...dataSlugs, ...pdfSlugs]))
    .filter((slug) => !DEDICATED_SLUGS.has(slug))
    .map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  // Κατηγορία με δεδομένα: metadata χτισμένο από τα δικά της στοιχεία.
  const payload = readCebRanking(slug);
  if (payload) {
    const categoryLabel = payload.categoryLabel.toLowerCase();
    return buildPageMetadata({
      title: `CEB ${cebRankingTitleName(payload.title)} — European Standings`,
      description: `The official CEB ${payload.discipline.toLowerCase()} ${categoryLabel} ranking (Confédération Européenne de Billard), edition ${payload.edition}, with the points of every counting tournament and a link to each event page on BilliardToday.`,
      path: `/rankings/ceb/${slug}` as `/${string}`,
      keywords: [
        `CEB ${payload.title} ranking`,
        `${payload.discipline} ${payload.categoryLabel} ranking`,
        `European billiard ranking ${categoryLabel}`,
        "carom billiards standings",
        `CEB ${payload.discipline}`,
      ],
    });
  }

  // pdf-mode fallback: τα στοιχεία έρχονται από το `pdf-sources.json`.
  const category = readCebPdfCategory(slug);
  if (!category) return {};

  const categoryLabel = category.categoryLabel.toLowerCase();

  return buildPageMetadata({
    title: `CEB ${cebRankingTitleName(category.title)} — European Standings (official sheet)`,
    description: `The official CEB ${category.discipline.toLowerCase()} ${categoryLabel} ranking (Confédération Européenne de Billard), shown as the CEB publishes it — the official sheet, edition ${category.editionLabel}, with the full BilliardToday data version on the way.`,
    path: `/rankings/ceb/${slug}` as `/${string}`,
    keywords: [
      `CEB ${category.title} ranking`,
      `${category.discipline} ${category.categoryLabel} ranking`,
      `European billiard ranking ${categoryLabel}`,
      "carom billiards standings",
      `CEB ${category.discipline}`,
    ],
  });
}

export default async function CebCategoryPage({ params }: Props) {
  const { slug } = await params;

  // 1) Κατηγορία με δεδομένα → ίδια σελίδα με το 3c-individual (ένα κοινό render).
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
        campaign={`ceb-ranking-${slug}`}
      />
    );
  }

  // 2) pdf-mode fallback: το επίσημο φύλλο της CEB στο δικό μας layout.
  const category = readCebPdfCategory(slug);
  if (!category) notFound();

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-4 py-10 sm:px-6">
      <CebPdfRankingContent category={category} campaign={`ceb-ranking-${slug}`} />
    </div>
  );
}
