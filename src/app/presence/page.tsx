import { CmsPageShell } from "@/components/cms/CmsPageShell";
import { PresenceDashboard } from "@/components/presence/PresenceDashboard";
import { getCmsAppearance, getCmsSiteSettings } from "@/lib/cms/strapi";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Presence | Billiard Today",
  description: "Live list of active scoreboard screen identifiers connected to the platform.",
};

export default async function PresencePage() {
  const [settings, appearance] = await Promise.all([
    getCmsSiteSettings(),
    getCmsAppearance(),
  ]);

  return (
    <CmsPageShell settings={settings} appearance={appearance}>
      <PresenceDashboard />
    </CmsPageShell>
  );
}
