import { CmsLayoutRenderer, CmsPageShell } from "@/components/cms/CmsPageShell";
import { CmsSectionRenderer } from "@/components/cms/CmsSectionRenderer";
import type { CmsAppearance, CmsPage, CmsSiteSettings } from "@/lib/cms/types";
import { getCmsContainerStyle } from "@/lib/cms/layout";

type Props = {
  page: CmsPage;
  settings: CmsSiteSettings;
  appearance: CmsAppearance;
  showChrome?: boolean;
};

export function CmsPageView({ page, settings, appearance, showChrome = true }: Props) {
  const hasLayoutTree = page.layoutTree.length > 0;
  // Οι σελίδες με hero-section παίρνουν ήδη H1 (CmsSectionRenderer). Όσες δεν έχουν — π.χ. το
  // /tournaments (fallback χωρίς καταχώρηση CMS) και τα άρθρα ειδήσεων — έμεναν χωρίς κανένα H1,
  // δηλαδή χωρίς ορατό ή μη ορίζοντα τίτλο για τον crawler. Εδώ μπαίνει αόρατο H1 με τον τίτλο
  // της σελίδας, ώστε να μη διπλασιαστεί το H1 όπου υπάρχει hero ούτε να αλλάξει η εμφάνιση.
  const layoutHasHero = JSON.stringify(page.layoutTree ?? []).includes("cms.hero-section");
  const hasHeroHeading =
    layoutHasHero || page.sections.some((section) => section.__component === "cms.hero-section");
  const sections =
    page.sections.length > 0
      ? page.sections
      : !hasLayoutTree && page.summary
        ? [
            {
              __component: "cms.rich-text-section" as const,
              title: page.title,
              content: page.summary,
            },
          ]
        : [];

  return (
    <CmsPageShell settings={settings} appearance={appearance} showChrome={showChrome}>
      {!hasHeroHeading && page.title ? <h1 className="sr-only">{page.title}</h1> : null}
      {hasLayoutTree ? (
        <div className="px-4 py-8 sm:px-6 sm:py-10">
          <div className="mx-auto" style={getCmsContainerStyle(appearance, "page")}>
            <CmsLayoutRenderer
              nodes={page.layoutTree}
              settings={settings}
              appearance={appearance}
              region="page"
              embedded={!showChrome}
            />
          </div>
        </div>
      ) : null}
      {sections.map((section, index) => (
        <CmsSectionRenderer
          key={`${page.id}-${section.__component}-${index}`}
          section={section}
          appearance={appearance}
          index={index}
          embedded={!showChrome}
        />
      ))}
    </CmsPageShell>
  );
}
