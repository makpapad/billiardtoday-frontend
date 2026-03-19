import { EmbedPageFrame } from "@/components/embed/EmbedPageFrame";
import { LiveClubView } from "@/components/live/LiveClubView";
import { getCmsAppearance } from "@/lib/cms/strapi";
import { requireClubByIdentifier } from "@/lib/directory";

type Props = {
  params: Promise<{ clubId: string }>;
};

export default async function EmbedLiveClubPage({ params }: Props) {
  const { clubId } = await params;
  const [appearance, club] = await Promise.all([
    getCmsAppearance(),
    requireClubByIdentifier(clubId),
  ]);

  return (
    <EmbedPageFrame appearance={appearance}>
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
    </EmbedPageFrame>
  );
}
