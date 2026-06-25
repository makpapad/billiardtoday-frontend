import type { Metadata } from "next";
import { buildLandingPageContent } from "@/components/landing/content";
import { Benefits } from "@/components/landing/Benefits";
import { CTA } from "@/components/landing/CTA";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LatestNews } from "@/components/landing/LatestNews";
import { Screenshots } from "@/components/landing/Screenshots";
import { TrustedClubs } from "@/components/landing/TrustedClubs";
import { listNewsArticles } from "@/lib/cms/news";
import { buildCmsMetadata } from "@/lib/cms/metadata";
import { getCmsPageBySlug, getCmsSiteSettings } from "@/lib/cms/strapi";

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
  const [settings, page, latestNews] = await Promise.all([
    getCmsSiteSettings(),
    getCmsPageBySlug("home"),
    listNewsArticles(3).catch(() => []),
  ]);

  const content = buildLandingPageContent(settings, page);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-white text-slate-950">
      <Header content={content.header} />
      <main className="flex-1">
        <Hero content={content.hero} />
        <TrustedClubs content={content.trustedClubs} />
        <Features content={content.features} />
        <HowItWorks content={content.howItWorks} />
        <Screenshots content={content.screenshots} />
        <LatestNews articles={latestNews} />
        <Benefits content={content.benefits} />
        <CTA content={content.cta} />
      </main>
      <Footer content={content.footer} />
    </div>
  );
}
