import { CmsPageShell } from "@/components/cms/CmsPageShell";
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

  return (
    <CmsPageShell settings={settings} appearance={appearance}>
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
