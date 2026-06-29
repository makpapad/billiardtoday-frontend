import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TournamentListSection } from "@/components/tournaments/TournamentListSection";
import { getCmsAppearance } from "@/lib/cms/strapi";
import { getFederations, requireFederationByIdentifier } from "@/lib/directory";
import { CebFederationExperience } from "@/components/public/CebFederationExperience";
import { CEB_MEMBER_SLUGS } from "@/components/public/cebFederationMapData";
import { FederationDetailContent } from "@/components/public/FederationDetailContent";
import { buildDefaultOpenGraphImage, buildOpenGraphImage, SITE_URL } from "@/lib/socialMetadata";

type Props = {
  params: Promise<{ id: string }>;
};

const buildFederationDescription = (
  federation: Awaited<ReturnType<typeof requireFederationByIdentifier>>,
) => {
  const location = [federation.city, federation.country].filter(Boolean).join(", ");
  const relationship = federation.parent?.name
    ? ` connected to ${federation.parent.name}`
    : "";
  const area = location ? ` in ${location}` : "";

  return `${federation.name} profile${area}${relationship}, with official billiard tournaments, clubs, and federation information on Billiard Today.`;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const federation = await requireFederationByIdentifier(id);
  const canonicalPath = `/federations/${federation.slug}`;
  const description = buildFederationDescription(federation);
  const title = federation.acronym
    ? `${federation.name} (${federation.acronym})`
    : federation.name;
  const image =
    buildOpenGraphImage({
      url: federation.logo?.url,
      alt: `${federation.name} logo`,
    }) || buildDefaultOpenGraphImage(title);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: "website",
      locale: "el_GR",
      url: `${SITE_URL}${canonicalPath}`,
      siteName: "Billiard Today",
      title,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [String(image.url)],
    },
  };
}

export default async function FederationPage({ params }: Props) {
  const { id } = await params;
  const [appearance, federation] = await Promise.all([getCmsAppearance(), requireFederationByIdentifier(id)]);

  if (id !== federation.slug) {
    redirect(`/federations/${federation.slug}`);
  }

  if (federation.slug === "ceb") {
    const allFederations = await getFederations();
    const memberDirectoryEntries = CEB_MEMBER_SLUGS.flatMap((slug) => {
      const item = allFederations.find((entry) => entry.slug === slug && entry.level === "national");
      return item ? [item] : [];
    });

    const members = await Promise.all(
      memberDirectoryEntries.map((item) => requireFederationByIdentifier(item.slug || item.documentId)),
    );

    return <CebFederationExperience federation={federation} members={members} />;
  }

  return (
    <>
      <FederationDetailContent federation={federation} />

      <TournamentListSection
        section={{
          __component: "cms.tournament-list-section",
          title: "Official tournaments",
          subtitle: `Direct tournament calendar organized by ${federation.name}.`,
          layout: "table",
          itemsPerPage: 10,
          showSeasonFilter: true,
          showDate: true,
          showStatus: true,
          showResultsLink: true,
          emptyStateText: "No tournaments found for this federation yet.",
        }}
        appearance={appearance}
        federationId={federation.documentId}
      />
    </>
  );
}
