import type { Metadata } from "next";
import type { CmsPage, CmsSeo, CmsSiteSettings } from "@/lib/cms/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://billiardtoday.com";

const toAbsoluteUrl = (value: string | null | undefined) => {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
};

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
  const ogImage = seo?.ogImage?.url || page?.coverImage?.url;

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
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
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
