import { redirect } from "next/navigation";
import { TournamentListSection } from "@/components/tournaments/TournamentListSection";
import { getCmsAppearance } from "@/lib/cms/strapi";
import { getFederations, requireFederationByIdentifier } from "@/lib/directory";
import { CebFederationExperience } from "@/components/public/CebFederationExperience";
import { CEB_MEMBER_SLUGS } from "@/components/public/cebFederationMapData";
import { FederationDetailContent } from "@/components/public/FederationDetailContent";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EmbedFederationPage({ params }: Props) {
  const { id } = await params;
  const [appearance, federation] = await Promise.all([
    getCmsAppearance(),
    requireFederationByIdentifier(id),
  ]);

  if (id !== federation.slug) {
    redirect(`/embed/federations/${federation.slug}`);
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

    return <CebFederationExperience federation={federation} members={members} embedded />;
  }

  return (
    <>
      <FederationDetailContent federation={federation} embedded />

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
        embedded
        federationId={federation.documentId}
      />
    </>
  );
}
