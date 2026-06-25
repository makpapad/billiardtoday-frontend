import type { Metadata } from "next";
import type { CmsPage, CmsSeo, CmsSiteSettings } from "@/lib/cms/types";
import { buildDefaultOpenGraphImage, buildOpenGraphImage, toAbsoluteUrl } from "@/lib/socialMetadata";

const pickSeo = (pageSeo?: CmsSeo | null, fallbackSeo?: CmsSeo | null) =>
  pageSeo || fallbackSeo || null;

export const buildCmsMetadata = ({
  page,
  settings,
  path,
}: {
  page?: CmsPage | null;
  settings?: CmsSiteSettings | null;
  path?: string;
}): Metadata => {
  const seo = pickSeo(page?.seo, settings?.defaultSeo);
  const title = seo?.metaTitle || page?.title || settings?.siteName || "Billiard Today";
  const description =
    seo?.metaDescription ||
    page?.summary ||
    settings?.siteTagline ||
    "Billiard tournaments, results, rankings, clubs, players, and CMS-managed content.";
  const canonicalUrl = toAbsoluteUrl(seo?.canonicalUrl || path || "/");
  const image = seo?.ogImage || page?.coverImage || null;
  const socialImage =
    buildOpenGraphImage({
      url: image?.url,
      width: image?.width,
      height: image?.height,
      alt: image?.alternativeText || title,
    }) || buildDefaultOpenGraphImage(title);

  return {
    title,
    description,
    alternates: canonicalUrl ? { canonical: canonicalUrl } : undefined,
    openGraph: {
      type: "website",
      locale: "el_GR",
      siteName: settings?.siteName || "Billiard Today",
      title,
      description,
      url: canonicalUrl,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [String(socialImage.url)],
    },
    robots: seo?.noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : undefined,
  };
};
