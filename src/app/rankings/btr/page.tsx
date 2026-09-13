import type { Metadata } from "next";
import { BtrRankingContent } from "@/components/public/BtrRankingContent";
import { buildPageMetadata } from "@/lib/pageMetadata";
import {
  BTR_RANKING_PAGE_SIZE,
  fetchBtrRankingPage,
  listBtrRankingCountries,
} from "@/lib/publicSiteData";
import { SITE_URL } from "@/lib/socialMetadata";

export const revalidate = 300;

export const metadata: Metadata = buildPageMetadata({
  title: "BTR Rating — 3-Cushion Player Leaderboard",
  description:
    "The BilliardToday Rating (BTR) leaderboard for three-cushion billiards. Live player rankings with a country filter — see each country's own standings — built from recorded match results, opponent strength, and match averages.",
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
  const [firstPage, countries, params] = await Promise.all([
    fetchBtrRankingPage({ page: 1, pageSize: BTR_RANKING_PAGE_SIZE }),
    listBtrRankingCountries(),
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
      numberOfItems: firstPage.total,
      itemListElement: firstPage.rows.map((row, index) => ({
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
        initialRows={firstPage.rows}
        initialTotal={firstPage.total}
        initialPageCount={firstPage.pageCount}
        pageSize={firstPage.pageSize}
        countries={countries}
        initialCountry={initialCountry}
      />
    </>
  );
}
