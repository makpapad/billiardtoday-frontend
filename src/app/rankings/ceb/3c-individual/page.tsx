import type { Metadata } from "next";
import Image from "next/image";
import { PresentationHero } from "@/components/public/PresentationBlocks";
import { CebRankingContent } from "@/components/public/CebRankingContent";
import { buildPageMetadata } from "@/lib/pageMetadata";
import {
  CEB_RANKING_PAGE_SIZE,
  formatCebDate,
} from "@/lib/cebRanking";
import { readCebRanking } from "@/lib/cebRankingData";
import { SITE_URL } from "@/lib/socialMetadata";
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

  const { counts } = payload;
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `CEB 3-Cushion Individual Ranking — edition ${payload.edition}`,
    url: `${SITE_URL}/rankings/ceb/${SLUG}`,
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
          eyebrow="CEB Official Ranking · Individual"
          title="3-Cushion Individual — European Ranking"
          description={`The official CEB ranking list with the point breakdown of every counting tournament. Each tournament column links to the event page on BilliardToday.`}
          actions={[
            { label: "Jump to the list ↓", href: "#list" },
            { label: "All CEB rankings", href: "/rankings/ceb", variant: "secondary" },
            { label: "Official PDF (CEB)", href: payload.sourceUrl, variant: "secondary", newTab: true },
          ]}
          asideHeader={
            <div className="flex min-h-[180px] items-center justify-center rounded-[28px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
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
            `Edition ${payload.edition} · last update ${formatCebDate(payload.updatedAt) ?? "—"}`,
            `${counts.players.toLocaleString("en-US")} ranked players · ${counts.federations} federations`,
          ]}
        />

        <CebRankingContent payload={payload} pageSize={CEB_RANKING_PAGE_SIZE} />
      </div>
    </>
  );
}
