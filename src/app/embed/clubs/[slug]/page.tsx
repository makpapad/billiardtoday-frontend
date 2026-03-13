import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClubDetailContent } from "@/components/public/ClubDetailContent";
import { getClubBySlug } from "@/lib/publicSiteData";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const club = await getClubBySlug(slug);

  return {
    title: club ? `${club.name} Embed` : "Club Embed",
    robots: { index: false, follow: false },
  };
}

export default async function EmbedClubPage({ params }: Props) {
  const { slug } = await params;
  const club = await getClubBySlug(slug);

  if (!club) {
    notFound();
  }

  return <ClubDetailContent club={club} embedded />;
}
