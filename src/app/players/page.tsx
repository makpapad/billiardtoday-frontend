import type { Metadata } from "next";
import { PlayersDirectoryContent } from "@/components/public/PlayersDirectoryContent";
import { getPlayersTotalCount, listPlayers } from "@/lib/publicSiteData";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { SITE_URL } from "@/lib/socialMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Billiard Players Directory",
  description:
    "Search thousands of billiard player profiles on Billiard Today, with countries, clubs, tournament history, match records, averages, rankings, and performance statistics.",
  path: "/players",
  keywords: [
    "billiard players",
    "billiard player profiles",
    "3 cushion players",
    "carom billiards players",
    "billiard rankings",
    "billiard tournament history",
    "Billiard Today players",
  ],
});

export default async function PlayersPage() {
  const [players, totalPlayers] = await Promise.all([
    listPlayers(500),
    getPlayersTotalCount(),
  ]);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Billiard Players Directory",
    url: `${SITE_URL}/players`,
    description: metadata.description,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: players.length,
      itemListElement: players.slice(0, 150).map((player, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${SITE_URL}${player.href}`,
        name: player.fullNameEn || player.fullName,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemList),
        }}
      />
      <PlayersDirectoryContent players={players} totalPlayers={totalPlayers} />
    </>
  );
}
