import type { Metadata } from "next";
import type { CmsPage, CmsSeo, CmsSiteSettings } from "@/lib/cms/types";
import { buildDefaultOpenGraphImage, buildOpenGraphImage, toAbsoluteUrl } from "@/lib/socialMetadata";
import { toPlainText } from "@/lib/richText";

const pickSeo = (pageSeo?: CmsSeo | null, fallbackSeo?: CmsSeo | null) =>
  pageSeo || fallbackSeo || null;

/**
 * Το `settings.defaultSeo` είναι η «ετικέτα του SITE» (metaTitle «Billiard Today», canonical «/»),
 * όχι τιμές σελίδας. Όποτε υπάρχει `path` (δηλαδή ξέρουμε ποια σελίδα σερβίρουμε) το canonical
 * βγαίνει από το path και ο τίτλος από τη σελίδα — αλλιώς κάθε σελίδα χωρίς δικό της SEO block
 * δήλωνε canonical την ΑΡΧΙΚΗ και τίτλο «Billiard Today | Billiard Today» (μετρημένο 10/2026:
 * έτσι ήταν το /tournaments, που δεν έχει καταχώρηση στο CMS και πέφτει στο fallback).
 */
export const buildCmsMetadata = ({
  page,
  settings,
  path,
}: {
  page?: CmsPage | null;
  settings?: CmsSiteSettings | null;
  path?: string;
}): Metadata => {
  const pageSeo = page?.seo ?? null;
  const fallbackSeo = settings?.defaultSeo ?? null;
  const seo = pickSeo(pageSeo, fallbackSeo);
  const title =
    pageSeo?.metaTitle ||
    page?.title ||
    fallbackSeo?.metaTitle ||
    settings?.siteName ||
    "Billiard Today";
  const description =
    pageSeo?.metaDescription ||
    fallbackSeo?.metaDescription ||
    toPlainText(page?.summary) ||
    settings?.siteTagline ||
    "Billiard tournaments, results, rankings, clubs, players, and CMS-managed content.";
  const canonicalUrl = toAbsoluteUrl(pageSeo?.canonicalUrl || path || fallbackSeo?.canonicalUrl || "/");
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
