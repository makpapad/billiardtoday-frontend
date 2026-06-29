import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { getPublicPlayerByIdentifier } from "@/lib/publicSiteData";

type Props = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const player = await getPublicPlayerByIdentifier(id);

  if (!player) {
    return buildPageMetadata({
      title: "Player Profile",
      description: "Public billiard player profile with tournament history and recorded match statistics.",
      path: `/players/${id}`,
    });
  }

  const displayName = player.fullNameEn || player.fullName;
  const location = [player.city, player.country].filter(Boolean).join(", ");
  const club = player.clubName ? `, connected to ${player.clubName}` : "";
  const area = location ? ` from ${location}` : "";

  return buildPageMetadata({
    title: displayName,
    description: `${displayName} billiard player profile${area}${club}, with tournament history, match records, and performance statistics on Billiard Today.`,
    path: player.href as `/${string}`,
  });
}

export default function PlayerProfileLayout({ children }: Props) {
  return children;
}
