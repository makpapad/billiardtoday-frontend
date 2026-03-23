import type { Metadata } from "next";
import { PlayersDirectoryContent } from "@/components/public/PlayersDirectoryContent";
import { listPlayers } from "@/lib/publicSiteData";

export const metadata: Metadata = {
  title: "Players",
  description: "Public player directory with profile pages and structured search.",
};

export default async function PlayersPage() {
  const players = await listPlayers(100000);
  return <PlayersDirectoryContent players={players} />;
}
