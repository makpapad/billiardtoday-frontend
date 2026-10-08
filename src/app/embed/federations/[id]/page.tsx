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

  if (federation.slug === "ceb" || federation.slug === "confederation-europeenne-de-billard") {
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

  // UMB ομοσπονδία: ίδιο κουμπί-σύνδεσμος όπως η CEB («CEB rankings» → /rankings/ceb),
  // χωρίς κάρτες κατάταξης/χάρτη — μόνο η κατάταξη.
  const federationActions =
    federation.slug === "umb" || federation.slug === "union-mondiale-de-billard"
      ? [{ label: "UMB rankings", href: "/rankings/umb", variant: "secondary" as const }]
      : [];

  return (
    <>
      <FederationDetailContent federation={federation} embedded actions={federationActions} />

      <TournamentListSection
        section={{
          __component: "cms.tournament-list-section",
          title: "Official tournaments",
          subtitle: `Direct tournament calendar organized by ${federation.name}.`,
          layout: "table",
          itemsPerPage: 20,
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
