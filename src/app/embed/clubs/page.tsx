import { ClubsDirectoryClient } from "@/components/clubs/ClubsDirectoryClient";
import { getClubs } from "@/lib/directory";

export default async function EmbedClubsPage() {
  const clubs = await getClubs();

  return <ClubsDirectoryClient clubs={clubs} embedded />;
}
