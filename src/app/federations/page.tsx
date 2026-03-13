import type { Metadata } from "next";
import { FederationsPageContent } from "@/components/public/FederationsPageContent";
import { listFederations } from "@/lib/publicSiteData";

export const metadata: Metadata = {
  title: "Federations",
  description: "Public federation pages with connected club directories.",
};

export default async function FederationsPage() {
  const federations = await listFederations(24);
  return <FederationsPageContent federations={federations} />;
}
