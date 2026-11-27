import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { buildLandingPageContent } from "@/components/landing/content";
import { getCmsPageBySlug, getCmsSiteSettings } from "@/lib/cms/strapi";

/**
 * `fitViewport`: η σελίδα «κλειδώνει» στο ύψος της οθόνης σε desktop (lg+).
 *
 * ΓΙΑΤΙ: το header (97px) + footer (273px) του shell έσπρωχναν το περιεχόμενο και
 * πρόσθεταν ~370px κάθετου scroll σε σελίδες που θέλουν να είναι «τοίχος» βίντεο.
 * Με fitViewport το shell γίνεται 100dvh flex κολόνα, το header μένει (πλοήγηση)
 * και ο footer κρύβεται ΜΟΝΟ σε lg+ ώστε η περιοχή βίντεο να παίρνει ό,τι περισσεύει.
 * Στο κινητό τίποτα δεν αλλάζει (φυσική ροή, footer ορατό, scroll επιτρεπτό).
 * Default false → καμία άλλη διαδρομή δεν επηρεάζεται.
 */
export async function AppSiteShell({
  children,
  fitViewport = false,
}: {
  children: React.ReactNode;
  fitViewport?: boolean;
}) {
  const [settings, homePage] = await Promise.all([
    getCmsSiteSettings().catch(() => null),
    getCmsPageBySlug("home").catch(() => null),
  ]);

  if (!settings) {
    return <>{children}</>;
  }

  const content = buildLandingPageContent(settings, homePage);

  return (
    <div
      className={`flex min-h-screen flex-1 flex-col bg-white text-slate-950${
        fitViewport ? " lg:h-[100dvh] lg:min-h-0 lg:overflow-hidden" : ""
      }`}
    >
      {/* Στο fitViewport το header τυλίγεται ώστε να μη συρρικνώνεται· αλλού μένει
          ως έχει (τυλίγμα σε κοντό div θα περιόριζε το sticky του header). */}
      {fitViewport ? (
        <div className="lg:shrink-0">
          <Header content={content.header} />
        </div>
      ) : (
        <Header content={content.header} />
      )}
      <div className={`flex flex-1 flex-col${fitViewport ? " lg:min-h-0" : ""}`}>{children}</div>
      {fitViewport ? (
        <div className="lg:hidden">
          <Footer content={content.footer} />
        </div>
      ) : (
        <Footer content={content.footer} />
      )}
    </div>
  );
}
