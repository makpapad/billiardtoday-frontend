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
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white px-4 py-3">
              <Image
                src="https://cdn.billiardtoday.com/uploads/umb_150_905ef4f186.png"
                alt="UMB — Union Mondiale de Billard"
                width={132}
                height={44}
                className="h-7 w-auto object-contain"
                unoptimized
              />
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                UMB / CEB World Cup
              </div>
            </div>
          }
          meta={[
            `Edition ${payload.edition} · last update ${formatCebDate(payload.updatedAt) ?? "—"}`,
            `${counts.players.toLocaleString("en-US")} ranked players · ${counts.federations} federations`,
            `After ${payload.lastEvent ?? "the last counting event"}`,
            `${counts.suspended} players are suspended — they stay listed and marked`,
          ]}
        />

        <CebRankingContent payload={payload} pageSize={CEB_RANKING_PAGE_SIZE} />
      </div>
    </>
  );
}
