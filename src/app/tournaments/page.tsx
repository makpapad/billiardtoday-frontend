import type { Metadata } from "next";
import { CmsPageView } from "@/components/cms/CmsPageView";
import { TournamentListSeedProvider } from "@/components/tournaments/TournamentListSeed";
import { buildCmsMetadata } from "@/lib/cms/metadata";
import { getCmsAppearance, getCmsPageBySlug, getCmsSiteSettings } from "@/lib/cms/strapi";
import { getTournamentListSeed } from "@/lib/tournamentListSeed";
import type { CmsSection } from "@/lib/cms/types";

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
  seo: null,
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

  return (
    <TournamentListSeedProvider seed={seed}>
      <CmsPageView page={page} settings={settings} appearance={appearance} />
    </TournamentListSeedProvider>
  );
}
