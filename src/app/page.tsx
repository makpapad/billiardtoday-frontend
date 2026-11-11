import type { Metadata } from "next";
import { buildLandingPageContent } from "@/components/landing/content";
import { Benefits } from "@/components/landing/Benefits";
import { CTA } from "@/components/landing/CTA";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { LiveNow } from "@/components/landing/LiveNow";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LatestNews } from "@/components/landing/LatestNews";
import { Screenshots } from "@/components/landing/Screenshots";
import { TrustedClubs } from "@/components/landing/TrustedClubs";
import { listNewsArticles } from "@/lib/cms/news";
import { buildCmsMetadata } from "@/lib/cms/metadata";
import { getCmsPageBySlug, getCmsSiteSettings } from "@/lib/cms/strapi";
import { listTournamentEvents } from "@/lib/publicSiteData";
import { fetchPublishedTournamentDocumentIds } from "@/lib/publicTournamentIndex";

/**
 * Η αρχική ξαναχτίζεται κάθε 5 λεπτά ώστε το «Τώρα παίζεται» να είναι σωστό χωρίς
 * deploy και χωρίς client polling (βλ. components/landing/LiveNow.tsx).
 */
export const revalidate = 300;

/**
 * Ο τίτλος της αρχικής ερχόταν από το CMS ως σκέτο «Billiard Today» (14 χαρακτήρες,
 * μηδέν keywords — μετρημένο live 11/11/2026). Όταν το CMS δεν δίνει ουσιαστικό τίτλο,
 * επιβάλλουμε τον στοχευμένο· μόλις κάποιος γράψει σωστό τίτλο στο CMS, αυτός κερδίζει.
 */
const HOME_FALLBACK_TITLE = "Live Billiard Scores, Tournaments & Rankings | Billiard Today";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([
    getCmsSiteSettings().catch(() => null),
    getCmsPageBySlug("home").catch(() => null),
  ]);

  const meta = buildCmsMetadata({
    page,
    settings,
    path: "/",
  });

  const cmsTitle = typeof meta.title === "string" ? meta.title : "";
  const meaningful = cmsTitle.replace(/\s*\|\s*Billiard Today\s*$/i, "").trim();
  if (meaningful.length >= 20) return meta;

  return {
    ...meta,
    title: { absolute: HOME_FALLBACK_TITLE },
    openGraph: { ...(meta.openGraph ?? {}), title: HOME_FALLBACK_TITLE },
    twitter: { ...(meta.twitter ?? {}), title: HOME_FALLBACK_TITLE },
  };
}

export default async function HomePage() {
  const [settings, page, latestNews, tournamentEvents, publishedTournamentIds] = await Promise.all([
    getCmsSiteSettings(),
    getCmsPageBySlug("home"),
    listNewsArticles(3).catch(() => []),
    listTournamentEvents(500).catch(() => []),
    // `null` = το self-fetch απέτυχε → δείχνουμε ό,τι ήρθε (ίδιο φίλτρο με το sitemap).
    fetchPublishedTournamentDocumentIds().catch(() => null),
  ]);

  const publicEvents = publishedTournamentIds
    ? tournamentEvents.filter((event) => publishedTournamentIds.has(event.documentId))
    : tournamentEvents;

  const content = buildLandingPageContent(settings, page);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-white text-slate-950">
      <Header content={content.header} />
      <main className="flex-1">
        <Hero content={content.hero} />
        <LiveNow events={publicEvents} />
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
