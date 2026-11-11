import type { Metadata } from "next";
import { CmsPageView } from "@/components/cms/CmsPageView";
import { TournamentListSeedProvider } from "@/components/tournaments/TournamentListSeed";
import { buildCmsMetadata } from "@/lib/cms/metadata";
import { getCmsAppearance, getCmsPageBySlug, getCmsSiteSettings } from "@/lib/cms/strapi";
import { getTournamentListSeed } from "@/lib/tournamentListSeed";
import { fetchPublishedTournamentLinks, fetchPublishedTeamTournamentLinks } from "@/lib/publicTournamentIndex";
import { TournamentIndexSection } from "@/components/public/TournamentIndexSection";
import type { CmsSection } from "@/lib/cms/types";

export const dynamic = "force-dynamic";

const buildFallbackTournamentsPage = () => ({
  id: "cms-tournaments-fallback",
  title: "Tournaments",
  slug: "tournaments",
  summary: "Tournament archive fallback while the CMS page is being prepared.",
  pageType: "standard" as const,
  layoutTree: [],
  sections: [
    {
      __component: "cms.tournament-list-section" as const,
      title: "Tournaments",
      subtitle: "Browse seasons, dates, and current tournament activity.",
      layout: "table" as const,
      itemsPerPage: 20,
      showSeasonFilter: true,
      showDate: true,
      showStatus: true,
      showResultsLink: true,
      emptyStateText: "No tournaments found.",
    },
  ],
  // Το `title` παραπάνω είναι το ορατό H1 («Tournaments»). Ο <title> της σελίδας
  // βγαίνει από εδώ: χωρίς αυτό έβγαινε «Tournaments | Billiard Today» (28 χαρ.,
  // μηδέν keywords). Το template προσθέτει 17 χαρ., άρα κρατάμε τον τίτλο ≤43.
  seo: { metaTitle: "Billiard Tournaments, Draws & Results" },
  updatedAt: null,
  publishedAt: null,
});

const DEFAULT_PAGE_SIZE = 20;

/**
 * Το πόσα τουρνουά δείχνει η πρώτη σελίδα το ορίζει το CMS section. Παίρνουμε την
 * ίδια ρύθμιση ώστε το server-rendered HTML να έχει ΑΚΡΙΒΩΣ ό,τι θα ζητούσε ο client.
 */
const resolveListPageSize = (sections: readonly CmsSection[]): number => {
  const section = sections.find(
    (entry) => entry.__component === "cms.tournament-list-section",
  ) as { itemsPerPage?: number | null } | undefined;
  const value = Number(section?.itemsPerPage);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_PAGE_SIZE;
};

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([
    getCmsSiteSettings().catch(() => null),
    // Χωρίς καταχώρηση στο CMS η σελίδα σερβίρει το fallback: ο τίτλος πρέπει να βγει από αυτό
    // («Tournaments»), αλλιώς πέφτει στο defaultSeo του site και βγαίνει «Billiard Today | Billiard Today».
    getCmsPageBySlug("tournaments")
      .then((cmsPage) => cmsPage || buildFallbackTournamentsPage())
      .catch(() => buildFallbackTournamentsPage()),
  ]);

  return buildCmsMetadata({
    page,
    settings,
    path: "/tournaments",
  });
}

export default async function TournamentsPage() {
  const [settings, appearance, cmsPage] = await Promise.all([
    getCmsSiteSettings(),
    getCmsAppearance(),
    getCmsPageBySlug("tournaments"),
  ]);

  const page = cmsPage || buildFallbackTournamentsPage();
  /**
   * Η λίστα έρχεται server-side ώστε το HTML να περιέχει τα τουρνουά και τους
   * συνδέσμους τους. Πριν, η σελίδα ήταν κενή για κάθε crawler («No tournaments
   * found») και τα 400+ τουρνουά δεν είχαν κανένα εσωτερικό link.
   */
  const seed = await getTournamentListSeed(resolveListPageSize(page.sections));
  /**
   * Πλήρης κατάλογος: η λίστα αποδίδει server-side μόνο την πρώτη σελίδα (20 από 401),
   * οπότε οι υπόλοιπες δεν είχαν κανέναν εσωτερικό σύνδεσμο. Μπαίνει σε κλειστό
   * `<details>` — οπτικά κρυμμένο, πλήρες στο HTML.
   */
  const [allTournaments, teamTournaments] = await Promise.all([
    fetchPublishedTournamentLinks().catch(() => null),
    fetchPublishedTeamTournamentLinks().catch(() => []),
  ]);

  return (
    <>
      <TournamentListSeedProvider seed={seed}>
        <CmsPageView page={page} settings={settings} appearance={appearance} />
      </TournamentListSeedProvider>

      {allTournaments ? (
        <TournamentIndexSection items={allTournaments} teamItems={teamTournaments} />
      ) : null}
    </>
  );
}
