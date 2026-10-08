import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CebPdfRankingContent } from "@/components/public/CebPdfRankingContent";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { readCebPdfCategories, readCebPdfCategory } from "@/lib/cebRankingData";

export const revalidate = 300;

type Props = {
  params: Promise<{ slug: string }>;
};

/**
 * One dynamic route for every CEB category still published in pdf-mode (the official
 * CEB sheet rendered inside our own layout). The category list and every value come
 * from `public/data/ceb-ranking/pdf-sources.json`, so adding a category is a pure
 * data change — an entry in the manifest, no new page and no new code. A slug that is
 * not a pdf-mode category falls through to `notFound()`; the built category
 * (`3c-individual`) keeps its own static route and never reaches this file.
 * All of the markup is rendered by the shared `CebPdfRankingContent`.
 */
export function generateStaticParams() {
  return readCebPdfCategories().map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = readCebPdfCategory(slug);
  if (!category) return {};

  const categoryLabel = category.categoryLabel.toLowerCase();

  return buildPageMetadata({
    title: `CEB ${category.title} Ranking — European Standings (official sheet)`,
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

export default async function CebPdfCategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = readCebPdfCategory(slug);
  if (!category) notFound();

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-4 py-10 sm:px-6">
      <CebPdfRankingContent category={category} campaign={`ceb-ranking-${slug}`} />
    </div>
  );
}
