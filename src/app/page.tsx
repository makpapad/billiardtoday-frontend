import type { Metadata } from "next";
import { CmsPageView } from "@/components/cms/CmsPageView";
import { buildCmsMetadata } from "@/lib/cms/metadata";
import { getCmsAppearance, getCmsPageBySlug, getCmsSiteSettings } from "@/lib/cms/strapi";

const buildFallbackHomePage = () => ({
  id: "cms-home-fallback",
  title: "Billiard Today",
  slug: "home",
  summary: "The Strapi home page is not published yet.",
  pageType: "landing" as const,
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
  const [settings, appearance, page] = await Promise.all([
    getCmsSiteSettings(),
    getCmsAppearance(),
    getCmsPageBySlug("home"),
  ]);

  return (
    <CmsPageView
      page={page || buildFallbackHomePage()}
      settings={settings}
      appearance={appearance}
    />
  );
}
