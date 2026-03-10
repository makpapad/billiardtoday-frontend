import type { Metadata } from "next";
import { CmsPageView } from "@/components/cms/CmsPageView";
import { buildCmsMetadata } from "@/lib/cms/metadata";
import { getCmsAppearance, getCmsPageBySlug, getCmsSiteSettings } from "@/lib/cms/strapi";

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
      itemsPerPage: 10,
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

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([
    getCmsSiteSettings().catch(() => null),
    getCmsPageBySlug("tournaments").catch(() => null),
  ]);

  return buildCmsMetadata({
    page,
    settings,
    path: "/tournaments",
  });
}

export default async function TournamentsPage() {
  const [settings, appearance, page] = await Promise.all([
    getCmsSiteSettings(),
    getCmsAppearance(),
    getCmsPageBySlug("tournaments"),
  ]);

  return (
    <CmsPageView
      page={page || buildFallbackTournamentsPage()}
      settings={settings}
      appearance={appearance}
    />
  );
}
