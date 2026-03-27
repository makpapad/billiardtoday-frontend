import { redirect } from "next/navigation";
import { TournamentListSection } from "@/components/tournaments/TournamentListSection";
import { getCmsAppearance } from "@/lib/cms/strapi";
import { requireFederationByIdentifier } from "@/lib/directory";
import { FederationDetailContent } from "@/components/public/FederationDetailContent";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function FederationPage({ params }: Props) {
  const { id } = await params;
  const [appearance, federation] = await Promise.all([getCmsAppearance(), requireFederationByIdentifier(id)]);

  if (id !== federation.slug) {
    redirect(`/federations/${federation.slug}`);
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
