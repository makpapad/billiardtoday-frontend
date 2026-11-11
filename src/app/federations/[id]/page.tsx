import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TournamentListSection } from "@/components/tournaments/TournamentListSection";
import { getCmsAppearance } from "@/lib/cms/strapi";
import { getFederations, requireFederationByIdentifier } from "@/lib/directory";
import { CebFederationExperience } from "@/components/public/CebFederationExperience";
import { CEB_MEMBER_SLUGS } from "@/components/public/cebFederationMapData";
import { FederationDetailContent } from "@/components/public/FederationDetailContent";
import { FederationClubsSection } from "@/components/public/FederationClubsSection";
import { FederationRankingsSection } from "@/components/public/FederationRankingsSection";
import { FederationHeroMenu, FederationPanels, type FederationTab } from "@/components/public/FederationPageTabs";
import { FederationSeoSection } from "@/components/public/FederationSeoSection";
import {
  countFederationPublishedEvents,
  fetchFederationEventLinks,
  fetchFederationRankingSeries,
  fetchFederationTeamTournaments,
} from "@/lib/federationPageData";
import { buildDefaultOpenGraphImage, buildOpenGraphImage, SITE_URL } from "@/lib/socialMetadata";

// ISR: το HTML σερβίρεται από cache (πριν: no-store σε κάθε αίτημα).
// Τα live σκορ ανανεώνονται client-side, δεν εξαρτώνται από αυτό το cache.
export const revalidate = 300;

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

  if (federation.slug === "ceb" || federation.slug === "confederation-europeenne-de-billard") {
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

  // UMB ομοσπονδία: ίδιο κουμπί-σύνδεσμος όπως η CEB («CEB rankings» → /rankings/ceb),
  // χωρίς κάρτες κατάταξης/χάρτη — μόνο η κατάταξη.
  const federationActions =
    federation.slug === "umb" || federation.slug === "union-mondiale-de-billard"
      ? [{ label: "UMB rankings", href: "/rankings/umb", variant: "secondary" as const }]
      : [];

  // Κάθε καρτέλα εμφανίζεται μόνο όταν έχει περιεχόμενο — ένα κουμπί που οδηγεί
  // στο «τίποτα» είναι χειρότερο από την απουσία του.
  const [rankingSeries, teamTournaments, individualCount, eventLinks] = await Promise.all([
    fetchFederationRankingSeries(federation.slug),
    fetchFederationTeamTournaments(federation.documentId),
    countFederationPublishedEvents(federation.documentId),
    // Server-rendered σύνδεσμοι: οι καρτέλες φορτώνουν με JS, άρα χωρίς αυτούς το HTML
    // της ομοσπονδίας δεν είχε κανέναν σύνδεσμο προς διοργάνωση ή σύλλογο.
    fetchFederationEventLinks(federation.documentId).catch(() => []),
  ]);

  const clubCount = Array.isArray(federation.clubs) ? federation.clubs.length : 0;
  const tabs: FederationTab[] = [];

  if (federation.level === "national" && clubCount > 0) {
    tabs.push({
      key: "clubs",
      label: "Affiliated Clubs",
      content: (
        <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-1 py-8 sm:px-6">
          <FederationClubsSection federation={federation} />
        </div>
      ),
    });
  }

  if (rankingSeries.length > 0) {
    tabs.push({
      key: "rankings",
      label: "Rankings",
      content: (
        <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-1 py-8 sm:px-6">
          <FederationRankingsSection federationName={federation.name} series={rankingSeries} />
        </div>
      ),
    });
  }

  tabs.push({
    key: "individual",
    label: "Individual",
    content: (
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
        federationId={federation.documentId}
        allowViewToggle
      />
    ),
  });

  if (teamTournaments.length > 0) {
    tabs.push({
      key: "team",
      label: "Team",
      content: (
        <TournamentListSection
          section={{
            __component: "cms.tournament-list-section",
            title: "Team tournaments",
            subtitle: `Club team competitions organized by ${federation.name}.`,
            layout: "table",
            itemsPerPage: 20,
            showSeasonFilter: true,
            showDate: true,
            showStatus: true,
            showResultsLink: true,
            emptyStateText: "No team tournaments found for this federation yet.",
          }}
          appearance={appearance}
          federationId={federation.documentId}
          source="team"
          allowViewToggle
        />
      ),
    });
  }

  // Προεπιλεγμένη η καρτέλα των ατομικών· αν δεν έχει τίποτα, ανοίγει σε ό,τι έχει.
  const defaultKey =
    individualCount > 0 || tabs.length === 1 ? "individual" : tabs[tabs.length - 1]!.key;

  const menuTabs = tabs.map((tab) => ({ key: tab.key, label: tab.label }));

  return (
    <>
      <FederationDetailContent
        federation={federation}
        actions={federationActions}
        showClubs={false}
        heroMenu={
          menuTabs.length > 1 ? (
            <FederationHeroMenu tabs={menuTabs} defaultKey={defaultKey} />
          ) : undefined
        }
      />

      {tabs.length > 1 ? (
        <FederationPanels tabs={tabs} defaultKey={defaultKey} />
      ) : (
        tabs[0]?.content
      )}

      <FederationSeoSection
        federationName={federation.name}
        events={eventLinks}
        teamEvents={teamTournaments.map((item) => ({
          documentId: item.documentId,
          title: item.title,
          href: item.href,
          startDate: item.startDate,
          endDate: item.endDate,
        }))}
        clubs={(federation.clubs ?? []).map((club) => ({
          name: club.name,
          slug: club.slug ?? null,
          documentId: club.documentId,
        }))}
      />
    </>
  );
}
