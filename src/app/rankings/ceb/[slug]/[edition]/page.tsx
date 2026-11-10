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
  readCebRankingIndex,
  withCebDbPlayerLinks,
} from "@/lib/cebRankingData";
import { SITE_URL } from "@/lib/socialMetadata";

export const revalidate = 300;
/** Ό,τι δεν υπάρχει στο αρχείο του slug δίνει 404 (δεν φτιάχνουμε σελίδες για σκουπίδια). */
export const dynamicParams = true;

type Props = {
  params: Promise<{ slug: string; edition: string }>;
};

/** Όλες οι αρχειοθετημένες εκδόσεις όλων των κατατάξεων CEB. */
export function generateStaticParams() {
  const index = readCebRankingIndex();
  const params: Array<{ slug: string; edition: string }> = [];
  for (const entry of index?.available ?? []) {
    const archive = readCebRankingArchive(entry.slug);
    for (const edition of archive?.editions ?? []) {
      params.push({ slug: entry.slug, edition: edition.key });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, edition } = await params;
  const payload = readCebRankingEdition(slug, edition);
  if (!payload) {
    return { title: "CEB ranking edition not found", robots: { index: false, follow: false } };
  }

  const current = readCebRanking(slug);
  const isCurrent = current?.edition === payload.edition;
  const updated = formatCebDate(payload.updatedAt);
  const base = buildPageMetadata({
    title: `CEB ${payload.title} Ranking — Edition ${payload.edition}${updated ? ` (${updated})` : ""}`,
    description: `The CEB ${payload.title.toLowerCase()} ranking exactly as published in edition ${
      payload.edition
    }${updated ? ` (last update ${updated})` : ""}: ${payload.counts.players.toLocaleString(
      "en-US",
    )} ranked European players with the points of every counting tournament, kept online by BilliardToday.`,
    path: `/rankings/ceb/${slug}/${edition}`,
    keywords: [
      "CEB ranking archive",
      `CEB ${payload.title.toLowerCase()} ranking ${payload.edition}`,
      "European billiard ranking history",
      "billiard standings archive",
    ],
  });

  // Όσο η έκδοση είναι και η τρέχουσα, το αντίγραφο δεν προσθέτει τίποτα στη Google.
  return isCurrent ? { ...base, robots: { index: false, follow: true } } : base;
}

export default async function CebRankingEditionPage({ params }: Props) {
  const { slug, edition } = await params;

  const payload = readCebRankingEdition(slug, edition);
  if (!payload) notFound();

  const current = readCebRanking(slug);
  const archive = readCebRankingArchive(slug);
  // Η αρίθμηση θέσεων αλλάζει μαζί με τη λίστα: τα αρχεία σύνδεσμων προφίλ
  // ακολουθούν το `links` της έκδοσης ("computed" για τη δική μας υπολογισμένη).
  const playerLinks = await withCebDbPlayerLinks(
    payload,
    readCebPlayerLinks(payload.links ?? "official"),
  );

  const isCurrent = current?.edition === payload.edition;
  const updated = formatCebDate(payload.updatedAt);
  const { counts } = payload;

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `CEB ${payload.title} Ranking — edition ${payload.edition}`,
    url: `${SITE_URL}/rankings/ceb/${slug}/${edition}`,
    description: `CEB ${payload.title.toLowerCase()} ranking, edition ${payload.edition}, archived by BilliardToday.`,
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
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-1 py-10 sm:px-6">
        <PresentationHero
          eyebrow={`CEB Official Ranking · ${payload.categoryLabel} · Edition ${payload.edition}`}
          title={`${payload.discipline} ${payload.categoryLabel} — Edition ${payload.edition}`}
          description={
            isCurrent
              ? "This is the edition the CEB publishes right now, kept here unchanged as an archived copy with the point breakdown of every counting tournament."
              : "The list exactly as the CEB published it, with the point breakdown of every counting tournament of that edition. Kept online after the next edition arrived."
          }
          actions={[
            { label: "Current CEB list →", href: cebRankingHref(slug) },
            { label: "All CEB rankings", href: "/rankings/ceb", variant: "secondary" },
            { label: "Official PDF (CEB)", href: payload.sourceUrl, variant: "secondary", newTab: true },
          ]}
          asideHeader={
            <div className="flex min-h-[180px] items-center justify-center rounded-[28px] border border-white/10 bg-slate-950/25 p-2 sm:p-4">
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
              <span className="font-semibold">Archived copy of the current edition.</span> The ranking
              the CEB publishes today is edition {payload.edition}
              {updated ? ` (last update ${updated})` : ""} —{" "}
              <Link href={cebRankingHref(slug)} className="font-semibold underline">
                open the current list
              </Link>
              . When the CEB publishes the next edition, this page keeps today&apos;s numbers.
            </>
          ) : (
            <>
              <span className="font-semibold">Archived edition — {payload.edition}</span>
              {updated ? `, last updated ${updated}` : ""}. This is not the list the CEB publishes today:{" "}
              <Link href={cebRankingHref(slug)} className="font-semibold underline">
                open the current edition{current ? ` (${current.edition})` : ""}
              </Link>
              .
            </>
          )}
        </section>

        <CebEditionStrip
          slug={slug}
          editions={archive?.editions ?? []}
          currentEdition={current?.edition ?? null}
          viewingKey={cebEditionKey(payload.edition)}
        />

        <CebRankingContent
          payload={payload}
          pageSize={CEB_RANKING_PAGE_SIZE}
          playerLinks={playerLinks}
          downloadHref={`/api/rankings/ceb/pdf?slug=${slug}&edition=${cebEditionKey(payload.edition)}`}
        />
      </div>
    </>
  );
}
