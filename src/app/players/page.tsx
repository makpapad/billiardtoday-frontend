import type { Metadata } from "next";
import { PlayersDirectoryContent } from "@/components/public/PlayersDirectoryContent";
import { getPlayersTotalCount, listFeaturedPlayers } from "@/lib/publicSiteData";

export const metadata: Metadata = {
  title: "Players",
  description: "Public player directory with profile pages and structured search.",
};

export default async function PlayersPage() {
  const [players, totalPlayers] = await Promise.all([
    listFeaturedPlayers(250),
    getPlayersTotalCount(),
  ]);

  return <PlayersDirectoryContent players={players} totalPlayers={totalPlayers} />;
}
