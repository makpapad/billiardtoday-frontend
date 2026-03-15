import { CmsPageShell } from "@/components/cms/CmsPageShell";
import { LiveClubView } from "@/components/live/LiveClubView";
import { getCmsAppearance, getCmsSiteSettings } from "@/lib/cms/strapi";
import { requireClubByIdentifier } from "@/lib/directory";

type Props = {
  params: Promise<{ clubId: string }>;
};

export default async function EmbedLiveClubPage({ params }: Props) {
  const { clubId } = await params;
  const [settings, appearance, club] = await Promise.all([
    getCmsSiteSettings(),
    getCmsAppearance(),
    requireClubByIdentifier(clubId),
  ]);

  return (
    <CmsPageShell settings={settings} appearance={appearance} showChrome={false}>
      <LiveClubView
        embedded
        club={{
          name: club.name,
          documentId: club.documentId,
          slug: club.slug,
          city: club.city,
          federation: club.federation ? { name: club.federation.name } : null,
        }}
      />
    </CmsPageShell>
  );
}
