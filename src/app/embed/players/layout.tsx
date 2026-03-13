import type { ReactNode } from "react";
import { CmsPageShell } from "@/components/cms/CmsPageShell";
import { getCmsAppearance, getCmsSiteSettings } from "@/lib/cms/strapi";

export default async function EmbedPlayersLayout({ children }: { children: ReactNode }) {
  const [settings, appearance] = await Promise.all([
    getCmsSiteSettings(),
    getCmsAppearance(),
  ]);

  return (
    <CmsPageShell settings={settings} appearance={appearance} showChrome={false}>
      {children}
    </CmsPageShell>
  );
}
