import type { Metadata } from "next";
import { ClubsDirectoryClient } from "@/components/clubs/ClubsDirectoryClient";
import { getClubs } from "@/lib/directory";
import { buildPageMetadata } from "@/lib/pageMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Clubs",
  description: "Browse billiard clubs, venues, live scoreboard hubs, and published tournament activity.",
  path: "/clubs",
});

export default async function ClubsPage() {
  const clubs = await getClubs();

  return <ClubsDirectoryClient clubs={clubs} />;
}
