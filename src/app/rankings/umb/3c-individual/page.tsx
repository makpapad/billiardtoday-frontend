import type { Metadata } from "next";
import Image from "next/image";
import { PresentationHero } from "@/components/public/PresentationBlocks";
import { UmbEditionStrip } from "@/components/public/UmbEditionStrip";
import { UmbRankingContent } from "@/components/public/UmbRankingContent";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { formatCebDate } from "@/lib/cebRanking";
import { UMB_RANKING_PAGE_SIZE } from "@/lib/umbRanking";
import { readUmbPlayerLinks, readUmbRanking, readUmbRankingArchive } from "@/lib/umbRankingData";
import { SITE_URL } from "@/lib/socialMetadata";
import { notFound } from "next/navigation";

export const revalidate = 300;

const SLUG = "3c-individual";

export const metadata: Metadata = buildPageMetadata({
  title: "UMB Events Ranking — 3-Cushion World Individual Standings",
  description:
    "The official UMB Events Ranking for 3-cushion individual (Union Mondiale de Billard): a world ranking over the 11 most recent counting events — the World Championship and ten World Cups — with the points (and the absence penalties) of every tournament.",
  path: `/rankings/umb/${SLUG}`,
  keywords: [
    "UMB ranking",
    "UMB Events Ranking",
    "3 cushion world ranking",
    "carom billiards world standings",
    "three cushion world ranking",
    "UMB 3C individual",
  ],
});

export default function UmbThreeCushionIndividualPage() {
  const payload = readUmbRanking(SLUG);
  if (!payload) notFound();
  // Η λίστα είναι υπολογισμένη από τα δικά μας αποτελέσματα (`links: "computed"`) —
  // οι σύνδεσμοι προφίλ ακολουθούν τη νέα αρίθμηση των θέσεων.
  const playerLinks = readUmbPlayerLinks(payload.links ?? "computed");
  const archive = readUmbRankingArchive(SLUG);

  const { counts } = payload;
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `UMB Events Ranking — 3-Cushion Individual — edition ${payload.edition}`,
    url: `${SITE_URL}/rankings/umb/${SLUG}`,
    description: metadata.description,
    numberOfItems: counts.players,
    itemListElement: payload.rows.slice(0, 100).map((row) => ({
      "@type": "ListItem",
      position: row.rank,
      name: `${row.name} (${row.fed}) — ${row.points} pts`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-4 py-10 sm:px-6">
        <PresentationHero
          eyebrow="UMB Official Ranking · Individual"
          title="3-Cushion Individual — World Events Ranking"
          description="The official UMB Events Ranking with the point breakdown of the 11 counting events — the World Championship and the ten most recent World Cups. Absence penalties (−8 / −16) are shown in the tournament column they belong to."
          actions={[
            { label: "Jump to the list ↓", href: "#list" },
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
            `Edition ${payload.edition} · last update ${formatCebDate(payload.updatedAt) ?? "—"}`,
            `${counts.players.toLocaleString("en-US")} ranked players · ${counts.federations} federations`,
            payload.lastEvent ? `Last counting event: ${payload.lastEvent}` : "",
          ].filter(Boolean)}
        />

        <UmbEditionStrip
          slug={SLUG}
          editions={archive?.editions ?? []}
          currentEdition={payload.edition}
        />

        <UmbRankingContent
          payload={payload}
          pageSize={UMB_RANKING_PAGE_SIZE}
          playerLinks={playerLinks}
          downloadHref={`/api/rankings/umb/pdf?slug=${SLUG}`}
        />
      </div>
    </>
  );
}
