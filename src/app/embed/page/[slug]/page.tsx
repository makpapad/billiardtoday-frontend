import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CmsPageView } from "@/components/cms/CmsPageView";
import { buildCmsMetadata } from "@/lib/cms/metadata";
import { getCmsAppearance, getCmsPageBySlug, getCmsSiteSettings } from "@/lib/cms/strapi";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [settings, page] = await Promise.all([
    getCmsSiteSettings().catch(() => null),
    getCmsPageBySlug(slug).catch(() => null),
  ]);

  return buildCmsMetadata({
    page,
    settings,
    path: `/embed/page/${slug}`,
  });
}

export default async function EmbedCmsPage({ params }: Props) {
  const { slug } = await params;
  const [settings, appearance, page] = await Promise.all([
    getCmsSiteSettings(),
    getCmsAppearance(),
    getCmsPageBySlug(slug),
  ]);

  if (!page) notFound();

  return (
    <CmsPageView
      page={page}
      settings={settings}
      appearance={appearance}
      showChrome={false}
    />
  );
}
