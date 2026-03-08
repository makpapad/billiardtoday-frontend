import { CmsLayoutRenderer, CmsPageShell } from "@/components/cms/CmsPageShell";
import { CmsSectionRenderer } from "@/components/cms/CmsSectionRenderer";
import type { CmsAppearance, CmsPage, CmsSiteSettings } from "@/lib/cms/types";

type Props = {
  page: CmsPage;
  settings: CmsSiteSettings;
  appearance: CmsAppearance;
};

export function CmsPageView({ page, settings, appearance }: Props) {
  const sections =
    page.sections.length > 0
      ? page.sections
      : page.summary
        ? [
            {
              __component: "cms.rich-text-section" as const,
              title: page.title,
              content: page.summary,
            },
          ]
        : [];
  const hasLayoutTree = page.layoutTree.length > 0;

  return (
    <CmsPageShell settings={settings} appearance={appearance}>
      {hasLayoutTree ? (
        <div className="px-4 py-8 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-7xl">
            <CmsLayoutRenderer
              nodes={page.layoutTree}
              settings={settings}
              appearance={appearance}
              region="page"
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
        />
      ))}
    </CmsPageShell>
  );
}
