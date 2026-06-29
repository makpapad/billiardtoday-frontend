import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getCountryLabel } from "@/lib/countryFlags";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { getPublicPlayerProfileSummary } from "@/lib/publicSiteData";

type Props = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const player = await getPublicPlayerProfileSummary(id);

  if (!player) {
    return buildPageMetadata({
      title: "Player Profile",
      description: "Public billiard player profile with tournament history and recorded match statistics.",
      path: `/players/${id}`,
    });
  }

  const displayName = player.seoName || player.fullNameEn || player.fullName;
  const countryLabel = getCountryLabel(player.country);
  const location = [player.city, countryLabel || player.country].filter(Boolean).join(", ");
  const area = location ? ` from ${location}` : "";
  const primaryStats = player.primaryGameStats;
  const statFragment = primaryStats
    ? `, including ${primaryStats.label} tournament records, averages, high runs, and match statistics`
    : ", with tournament history, match records, averages, high runs, and performance statistics";
  return buildPageMetadata({
    title: `${displayName} Billiard Player Profile`,
    description: `${displayName} billiard player profile${area}${statFragment} on Billiard Today.`,
    path: player.href as `/${string}`,
    keywords: [
      displayName,
      `${displayName} billiard player`,
      `${displayName} billiard stats`,
      `${displayName} tournament history`,
      "billiard player profile",
      "carom billiards statistics",
      primaryStats?.label,
    ].filter((value): value is string => Boolean(value)),
  });
}

export default function PlayerProfileLayout({ children }: Props) {
  return children;
}
