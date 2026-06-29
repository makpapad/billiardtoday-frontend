import type { Metadata } from "next";
import { PlayersDirectoryContent } from "@/components/public/PlayersDirectoryContent";
import { getPlayersTotalCount, listFeaturedPlayers } from "@/lib/publicSiteData";
import { buildPageMetadata } from "@/lib/pageMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Players",
  description: "Public player directory with profile pages and structured search.",
  path: "/players",
});

export default async function PlayersPage() {
  const [players, totalPlayers] = await Promise.all([
    listFeaturedPlayers(250),
    getPlayersTotalCount(),
  ]);

  return <PlayersDirectoryContent players={players} totalPlayers={totalPlayers} />;
}
