import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PresentationHero } from "@/components/public/PresentationBlocks";
import { CebEditionStrip } from "@/components/public/CebEditionStrip";
import { CebRankingContent } from "@/components/public/CebRankingContent";
import { buildPageMetadata } from "@/lib/pageMetadata";
import {
  CEB_RANKING_PAGE_SIZE,
  cebEditionKey,
  cebRankingHref,
  formatCebDate,
} from "@/lib/cebRanking";
import {
  readCebPlayerLinks,
  readCebRanking,
  readCebRankingArchive,
  readCebRankingEdition,
} from "@/lib/cebRankingData";
import { SITE_URL } from "@/lib/socialMetadata";

export const revalidate = 300;
/** Μόνο οι εκδόσεις που κρατάμε στο αρχείο — ό,τι άλλο δίνει 404. */
export const dynamicParams = false;

const SLUG = "3c-individual";

type Props = {
  params: Promise<{ edition: string }>;
};

export function generateStaticParams() {
  const archive = readCebRankingArchive(SLUG);
  return (archive?.editions ?? []).map((entry) => ({ edition: entry.key }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { edition } = await params;
  const payload = readCebRankingEdition(SLUG, edition);
  if (!payload) {
    return { title: "CEB ranking edition not found", robots: { index: false, follow: false } };
  }

  const current = readCebRanking(SLUG);
  const isCurrent = current?.edition === payload.edition;
  const updated = formatCebDate(payload.updatedAt);
  const base = buildPageMetadata({
    title: `CEB 3-Cushion Ranking — Edition ${payload.edition}${updated ? ` (${updated})` : ""}`,
    description: `The CEB 3-cushion individual ranking exactly as published in edition ${payload.edition}${
      updated ? ` (last update ${updated})` : ""
    }: ${payload.counts.players.toLocaleString("en-US")} ranked European players with the points of every counting tournament, kept online by BilliardToday.`,
    path: `/rankings/ceb/${SLUG}/${edition}`,
    keywords: [
      "CEB ranking archive",
      `CEB 3-cushion ranking ${payload.edition}`,
      "European billiard ranking history",
      "3 cushion standings archive",
    ],
  });

  // Όσο η έκδοση είναι και η τρέχουσα, το αντίγραφο δεν προσθέτει τίποτα στη Google.
  return isCurrent ? { ...base, robots: { index: false, follow: true } } : base;
}

export default async function CebThreeCushionEditionPage({ params }: Props) {
  const { edition } = await params;

  const payload = readCebRankingEdition(SLUG, edition);
  if (!payload) notFound();

  const current = readCebRanking(SLUG);
  const archive = readCebRankingArchive(SLUG);
  // Η αρίθμηση θέσεων αλλάζει μαζί με τη λίστα: τα αρχεία σύνδεσμων προφίλ
  // ακολουθούν το `links` της έκδοσης ("computed" για τη δική μας υπολογισμένη).
  const playerLinks = readCebPlayerLinks(payload.links ?? "official");

  const isCurrent = current?.edition === payload.edition;
  const updated = formatCebDate(payload.updatedAt);
  const { counts } = payload;

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `CEB 3-Cushion Individual Ranking — edition ${payload.edition}`,
    url: `${SITE_URL}/rankings/ceb/${SLUG}/${edition}`,
    description: `CEB 3-cushion individual ranking, edition ${payload.edition}, archived by BilliardToday.`,
    numberOfItems: counts.players,
    itemListElement: payload.rows.slice(0, 100).map((row) => ({
      "@type": "ListItem",
      position: row.rank,
      name: `${row.name} (${row.fed}) — ${row.points} pts`,
    })),
  };

  return (
    <>
      {isCurrent ? null : (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
        />
      )}
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-4 py-10 sm:px-6">
        <PresentationHero
          eyebrow={`CEB Official Ranking · Individual · Edition ${payload.edition}`}
          title={`3-Cushion Individual — Edition ${payload.edition}`}
          description={
            isCurrent
              ? "This is the edition the CEB publishes right now, kept here unchanged as an archived copy with the point breakdown of every counting tournament."
              : "The list exactly as the CEB published it, with the point breakdown of every counting tournament of that edition. Kept online after the next edition arrived."
          }
          actions={[
            { label: "Current CEB list →", href: cebRankingHref(SLUG) },
            { label: "All CEB rankings", href: "/rankings/ceb", variant: "secondary" },
            { label: "Official PDF (CEB)", href: payload.sourceUrl, variant: "secondary", newTab: true },
          ]}
          asideHeader={
            <div className="flex min-h-[180px] items-center justify-center rounded-[28px] border border-white/10 bg-slate-950/25 p-4">
              <Image
                src="https://cdn.billiardtoday.com/uploads/CEB_150_fa0cdec244.png"
                alt="CEB — Confédération Européenne de Billard"
                width={150}
                height={147}
                className="max-h-36 w-auto object-contain"
                unoptimized
              />
            </div>
          }
          meta={[
            `Edition ${payload.edition} · last update ${updated ?? "—"}`,
            `${counts.players.toLocaleString("en-US")} ranked players · ${counts.federations} federations`,
          ]}
        />

        <section className="rounded-[24px] border border-amber-200 bg-amber-50/70 px-6 py-5 text-sm leading-7 text-amber-900">
          {isCurrent ? (
            <>
              <span className="font-semibold">Archived copy of the current edition.</span> The ranking the
              CEB publishes today is edition {payload.edition}
              {updated ? ` (last update ${updated})` : ""} —{" "}
              <Link href={cebRankingHref(SLUG)} className="font-semibold underline">
                open the current list
              </Link>
              . When the CEB publishes the next edition, this page keeps today&apos;s numbers.
            </>
          ) : (
            <>
              <span className="font-semibold">Archived edition — {payload.edition}</span>
              {updated ? `, last updated ${updated}` : ""}. This is not the list the CEB publishes today:{" "}
              <Link href={cebRankingHref(SLUG)} className="font-semibold underline">
                open the current edition{current ? ` (${current.edition})` : ""}
              </Link>
              .
            </>
          )}
        </section>

        <CebEditionStrip
          slug={SLUG}
          editions={archive?.editions ?? []}
          currentEdition={current?.edition ?? null}
          viewingKey={cebEditionKey(payload.edition)}
        />

        <CebRankingContent
          payload={payload}
          pageSize={CEB_RANKING_PAGE_SIZE}
          playerLinks={playerLinks}
          downloadHref={`/api/rankings/ceb/pdf?slug=${SLUG}&edition=${cebEditionKey(payload.edition)}`}
        />
      </div>
    </>
  );
}
