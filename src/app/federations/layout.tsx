import type { ReactNode } from "react";
import { CmsPageShell } from "@/components/cms/CmsPageShell";
import { getCmsAppearance, getCmsSiteSettings } from "@/lib/cms/strapi";

export default async function FederationsLayout({ children }: { children: ReactNode }) {
  const [settings, appearance] = await Promise.all([
    getCmsSiteSettings(),
    getCmsAppearance(),
  ]);

  return (
    <CmsPageShell settings={settings} appearance={appearance}>
      {children}
    </CmsPageShell>
  );
}
