import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { buildLandingPageContent } from "@/components/landing/content";
import { getCmsPageBySlug, getCmsSiteSettings } from "@/lib/cms/strapi";

export async function AppSiteShell({ children }: { children: React.ReactNode }) {
  const [settings, homePage] = await Promise.all([
    getCmsSiteSettings().catch(() => null),
    getCmsPageBySlug("home").catch(() => null),
  ]);

  if (!settings) {
    return <>{children}</>;
  }

  const content = buildLandingPageContent(settings, homePage);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-white text-slate-950">
      <Header content={content.header} />
      <div className="flex flex-1 flex-col">{children}</div>
      <Footer content={content.footer} />
    </div>
  );
}
