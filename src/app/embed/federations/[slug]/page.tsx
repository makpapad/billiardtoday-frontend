import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FederationDetailContent } from "@/components/public/FederationDetailContent";
import { getFederationBySlug } from "@/lib/publicSiteData";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const federation = await getFederationBySlug(slug);

  return {
    title: federation ? `${federation.name} Embed` : "Federation Embed",
    robots: { index: false, follow: false },
  };
}

export default async function EmbedFederationPage({ params }: Props) {
  const { slug } = await params;
  const federation = await getFederationBySlug(slug);

  if (!federation) {
    notFound();
  }

  return <FederationDetailContent federation={federation} embedded />;
}
