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
    title: federation ? federation.name : "Federation",
    description: federation
      ? `${federation.name} federation page with connected clubs.`
      : "Federation public page.",
  };
}

export default async function FederationPage({ params }: Props) {
  const { slug } = await params;
  const federation = await getFederationBySlug(slug);

  if (!federation) {
    notFound();
  }

  return <FederationDetailContent federation={federation} />;
}
