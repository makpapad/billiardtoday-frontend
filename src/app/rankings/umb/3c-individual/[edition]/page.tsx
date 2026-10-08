import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PresentationHero } from "@/components/public/PresentationBlocks";
import { UmbEditionStrip } from "@/components/public/UmbEditionStrip";
import { UmbRankingContent } from "@/components/public/UmbRankingContent";
import { buildPageMetadata } from "@/lib/pageMetadata";
import {
  UMB_RANKING_PAGE_SIZE,
  formatUmbDate,
  umbEditionKey,
  umbRankingHref,
} from "@/lib/umbRanking";
import {
  readUmbPlayerLinks,
  readUmbRanking,
  readUmbRankingArchive,
  readUmbRankingEdition,
} from "@/lib/umbRankingData";
import { SITE_URL } from "@/lib/socialMetadata";

export const revalidate = 300;
/** Μόνο οι εκδόσεις που κρατάμε στο αρχείο — ό,τι άλλο δίνει 404. */
export const dynamicParams = false;

const SLUG = "3c-individual";

type Props = {
  params: Promise<{ edition: string }>;
};

export function generateStaticParams() {
  const archive = readUmbRankingArchive(SLUG);
  return (archive?.editions ?? []).map((entry) => ({ edition: entry.key }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { edition } = await params;
  const payload = readUmbRankingEdition(SLUG, edition);
  if (!payload) {
    return { title: "UMB ranking edition not found", robots: { index: false, follow: false } };
  }

  const current = readUmbRanking(SLUG);
  const isCurrent = current?.edition === payload.edition;
  const updated = formatUmbDate(payload.updatedAt);
  const base = buildPageMetadata({
    title: `UMB Events Ranking — Edition ${payload.edition}${updated ? ` (${updated})` : ""}`,
    description: `The UMB Events Ranking (3-cushion individual) exactly as published in edition ${payload.edition}${
      updated ? ` (last update ${updated})` : ""
    }: ${payload.counts.players.toLocaleString("en-US")} ranked players with the points of every counting tournament, kept online by BilliardToday.`,
    path: `/rankings/umb/${SLUG}/${edition}`,
    keywords: [
      "UMB ranking archive",
      `UMB Events Ranking ${payload.edition}`,
      "3 cushion world ranking history",
      "carom billiards standings archive",
    ],
  });

  // Όσο η έκδοση είναι και η τρέχουσα, το αντίγραφο δεν προσθέτει τίποτα στη Google.
  return isCurrent ? { ...base, robots: { index: false, follow: true } } : base;
}

export default async function UmbThreeCushionEditionPage({ params }: Props) {
  const { edition } = await params;

  const payload = readUmbRankingEdition(SLUG, edition);
  if (!payload) notFound();

  const current = readUmbRanking(SLUG);
  const archive = readUmbRankingArchive(SLUG);
  const playerLinks = readUmbPlayerLinks(payload.links ?? "computed");

  const isCurrent = current?.edition === payload.edition;
  const updated = formatUmbDate(payload.updatedAt);
  const { counts } = payload;

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `UMB Events Ranking — 3-Cushion Individual — edition ${payload.edition}`,
    url: `${SITE_URL}/rankings/umb/${SLUG}/${edition}`,
    description: `UMB Events Ranking, 3-cushion individual, edition ${payload.edition}, archived by BilliardToday.`,
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
          eyebrow={`UMB Official Ranking · Individual · Edition ${payload.edition}`}
          title={`3-Cushion Individual — Edition ${payload.edition}`}
          description={
            isCurrent
              ? "This is the edition the UMB publishes right now, kept here unchanged as an archived copy with the point breakdown of the 11 counting events."
              : "The list exactly as the UMB published it, with the point breakdown of the 11 counting events of that edition. Kept online after the next edition arrived."
          }
          actions={[
            { label: "Current UMB list →", href: umbRankingHref(SLUG) },
            { label: "All UMB rankings", href: "/rankings/umb", variant: "secondary" },
            { label: "Official PDF (UMB)", href: payload.sourceUrl, variant: "secondary", newTab: true },
          ]}
          asideHeader={
            <div className="flex min-h-[180px] items-center justify-center rounded-[28px] border border-white/10 bg-slate-950/25 p-4">
              <Image
                src="/img/logo/umb.jpg"
                alt="UMB — Union Mondiale de Billard"
                width={150}
                height={150}
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
              UMB publishes today is edition {payload.edition}
              {updated ? ` (last update ${updated})` : ""} —{" "}
              <Link href={umbRankingHref(SLUG)} className="font-semibold underline">
                open the current list
              </Link>
              . When the UMB publishes the next edition, this page keeps today&apos;s numbers.
            </>
          ) : (
            <>
              <span className="font-semibold">Archived edition — {payload.edition}</span>
              {updated ? `, last updated ${updated}` : ""}. This is not the list the UMB publishes today:{" "}
              <Link href={umbRankingHref(SLUG)} className="font-semibold underline">
                open the current edition{current ? ` (${current.edition})` : ""}
              </Link>
              .
            </>
          )}
        </section>

        <UmbEditionStrip
          slug={SLUG}
          editions={archive?.editions ?? []}
          currentEdition={current?.edition ?? null}
          viewingKey={umbEditionKey(payload.edition)}
        />

        <UmbRankingContent
          payload={payload}
          pageSize={UMB_RANKING_PAGE_SIZE}
          playerLinks={playerLinks}
          downloadHref={`/api/rankings/umb/pdf?slug=${SLUG}&edition=${umbEditionKey(payload.edition)}`}
        />
      </div>
    </>
  );
}
