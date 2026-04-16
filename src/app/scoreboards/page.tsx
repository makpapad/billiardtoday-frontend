import { CmsPageShell } from "@/components/cms/CmsPageShell";
import { ScoreboardsMonitorPage } from "@/components/scoreboards/ScoreboardsMonitorPage";
import { getCmsAppearance, getCmsSiteSettings } from "@/lib/cms/strapi";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Scoreboards | Billiard Today",
  description:
    "Live monitor for every active scoreboard screen connected to Billiard Today.",
};

export default async function ScoreboardsPage() {
  const [settings, appearance] = await Promise.all([
    getCmsSiteSettings(),
    getCmsAppearance(),
  ]);

  return (
    <CmsPageShell settings={settings} appearance={appearance}>
      <ScoreboardsMonitorPage />
    </CmsPageShell>
  );
}
