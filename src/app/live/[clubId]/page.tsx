import { CmsPageShell } from "@/components/cms/CmsPageShell";
import { LiveClubView } from "@/components/live/LiveClubView";
import { getCmsAppearance, getCmsSiteSettings } from "@/lib/cms/strapi";
import { requireClubByIdentifier } from "@/lib/directory";

// Ζωντανά δεδομένα σε κάθε αίτημα — δεν επιτρέπεται στατικό HTML.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ clubId: string }>;
};

export default async function LiveClubPage({ params }: Props) {
  const { clubId } = await params;
  const [settings, appearance, club] = await Promise.all([
    getCmsSiteSettings(),
    getCmsAppearance(),
    requireClubByIdentifier(clubId),
  ]);

  return (
    <CmsPageShell settings={settings} appearance={appearance}>
      <LiveClubView
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
