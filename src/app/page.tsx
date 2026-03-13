import type { Metadata } from "next";
import { CmsPageShell } from "@/components/cms/CmsPageShell";
import { HomeFallbackPage } from "@/components/public/HomeFallbackPage";
import { CmsPageView } from "@/components/cms/CmsPageView";
import { buildCmsMetadata } from "@/lib/cms/metadata";
import { getCmsAppearance, getCmsPageBySlug, getCmsSiteSettings } from "@/lib/cms/strapi";
import { listClubs, listFeaturedPlayers, listFederations, listTournamentEvents } from "@/lib/publicSiteData";

const buildFallbackHomePage = () => ({
  id: "cms-home-fallback",
  title: "Billiard Today",
  slug: "home",
  summary: "The Strapi home page is not published yet.",
  pageType: "landing" as const,
  layoutTree: [],
  sections: [
    {
      __component: "cms.hero-section" as const,
      eyebrow: "CMS Setup",
      title: "The public frontend is now reading from Strapi.",
      subtitle:
        "Publish the page with slug 'home' in the CMS to replace this placeholder.",
      primaryCtaLabel: "Open Tournaments",
      primaryCtaUrl: "/tournaments",
      secondaryCtaLabel: "Open Admin",
      secondaryCtaUrl: "/admin",
      backgroundImage: null,
    },
  ],
  seo: null,
  updatedAt: null,
  publishedAt: null,
});

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([
    getCmsSiteSettings().catch(() => null),
    getCmsPageBySlug("home").catch(() => null),
  ]);

  return buildCmsMetadata({
    page,
    settings,
    path: "/",
  });
}

export default async function HomePage() {
  const [settings, appearance, page, tournaments, players, clubs, federations] = await Promise.all([
    getCmsSiteSettings(),
    getCmsAppearance(),
    getCmsPageBySlug("home"),
    listTournamentEvents(6),
    listFeaturedPlayers(6),
    listClubs(6),
    listFederations(4),
  ]);

  if (!page) {
    return (
      <CmsPageShell settings={settings} appearance={appearance}>
        <HomeFallbackPage
          tournaments={tournaments}
          players={players}
          clubs={clubs}
          federations={federations}
        />
      </CmsPageShell>
    );
  }

  return <CmsPageView page={page || buildFallbackHomePage()} settings={settings} appearance={appearance} />;
}
