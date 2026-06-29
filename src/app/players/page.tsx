import type { Metadata } from "next";
import { PlayersDirectoryContent } from "@/components/public/PlayersDirectoryContent";
import { getPlayersTotalCount, listPlayers } from "@/lib/publicSiteData";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { SITE_URL } from "@/lib/socialMetadata";

const PLAYER_DIRECTORY_POOL_SIZE = 3000;
const PLAYER_DIRECTORY_VISIBLE_COUNT = 150;

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const getDailyRotationKey = () => new Date().toISOString().slice(0, 10);

const rotatePlayersForDiscovery = (
  players: Awaited<ReturnType<typeof listPlayers>>,
) => {
  const rotationKey = getDailyRotationKey();
  return [...players].sort((left, right) => {
    const leftHash = hashString(`${rotationKey}:${left.documentId}:${left.id || ""}`);
    const rightHash = hashString(`${rotationKey}:${right.documentId}:${right.id || ""}`);
    return leftHash - rightHash;
  });
};

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
  const [allPlayers, totalPlayers] = await Promise.all([
    listPlayers(PLAYER_DIRECTORY_POOL_SIZE),
    getPlayersTotalCount(),
  ]);
  const players = rotatePlayersForDiscovery(allPlayers);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Billiard Players Directory",
    url: `${SITE_URL}/players`,
    description: metadata.description,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: Math.min(PLAYER_DIRECTORY_VISIBLE_COUNT, players.length),
      itemListElement: players.slice(0, PLAYER_DIRECTORY_VISIBLE_COUNT).map((player, index) => ({
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
      <PlayersDirectoryContent
        players={players.slice(0, PLAYER_DIRECTORY_VISIBLE_COUNT)}
        totalPlayers={totalPlayers}
      />
    </>
  );
}
