import type { Metadata } from "next";
import { ClubsPageContent } from "@/components/public/ClubsPageContent";
import { listClubs } from "@/lib/publicSiteData";

export const metadata: Metadata = {
  title: "Clubs",
  description: "Public club pages for venues, players, and tournament activity.",
};

export default async function ClubsPage() {
  const clubs = await listClubs(24);
  return <ClubsPageContent clubs={clubs} />;
}
