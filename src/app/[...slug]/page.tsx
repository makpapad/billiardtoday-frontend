import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CmsPageView } from "@/components/cms/CmsPageView";
import { buildCmsMetadata } from "@/lib/cms/metadata";
import { getCmsAppearance, getCmsPageBySlug, getCmsSiteSettings } from "@/lib/cms/strapi";

type Params = {
  slug: string[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const awaitedParams = await params;
  const slugParts = awaitedParams.slug;
  if (slugParts.length !== 1) return {};

  const [settings, page] = await Promise.all([
    getCmsSiteSettings().catch(() => null),
    getCmsPageBySlug(slugParts[0]).catch(() => null),
  ]);

  if (!page) return {};

  return buildCmsMetadata({
    page,
    settings,
    path: `/${slugParts[0]}`,
  });
}

export default async function CmsCatchAllPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const awaitedParams = await params;
  const slugParts = awaitedParams.slug;

  if (slugParts.length !== 1) {
    notFound();
  }

  const [settings, appearance, page] = await Promise.all([
    getCmsSiteSettings(),
    getCmsAppearance(),
    getCmsPageBySlug(slugParts[0]),
  ]);

  if (!page) {
    notFound();
  }

  return <CmsPageView page={page} settings={settings} appearance={appearance} />;
}
