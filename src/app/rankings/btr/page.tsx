import type { Metadata } from "next";
import { BtrRankingContent } from "@/components/public/BtrRankingContent";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { listBtrRanking } from "@/lib/publicSiteData";
import { SITE_URL } from "@/lib/socialMetadata";

const BTR_POOL_SIZE = 800;

export const revalidate = 300;

export const metadata: Metadata = buildPageMetadata({
  title: "BTR Rating — 3-Cushion Player Leaderboard",
  description:
    "The BilliardToday Rating (BTR) leaderboard for three-cushion billiards. Live player rankings with a country filter, built from recorded match results, opponent strength, and match averages.",
  path: "/rankings/btr",
  keywords: [
    "billiard rating",
    "3 cushion rankings",
    "carom billiards leaderboard",
    "three cushion player ranking",
    "billiard elo",
    "BTR rating",
  ],
});

export default async function BtrRankingPage({
  searchParams,
}: {
  searchParams?: Promise<{ country?: string }>;
}) {
  const [ranking, params] = await Promise.all([
    listBtrRanking(BTR_POOL_SIZE),
    searchParams ?? Promise.resolve({} as { country?: string }),
  ]);

  const initialCountry =
    typeof params?.country === "string" ? params.country.trim().toUpperCase() : undefined;

  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "BTR Rating — 3-Cushion Player Leaderboard",
    url: `${SITE_URL}/rankings/btr`,
    description: metadata.description,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: ranking.rows.length,
      itemListElement: ranking.rows.slice(0, 100).map((row, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${SITE_URL}${row.href}`,
        name: row.nameEn || row.name,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <BtrRankingContent
        rows={ranking.rows}
        countries={ranking.countries}
        initialCountry={initialCountry}
      />
    </>
  );
}
