import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CmsPageView } from "@/components/cms/CmsPageView";
import { buildCmsMetadata } from "@/lib/cms/metadata";
import { getCmsAppearance, getCmsSiteSettings } from "@/lib/cms/strapi";
import { getNewsArticleBySlug } from "@/lib/cms/news";
import { toPlainText } from "@/lib/richText";
import { SITE_URL } from "@/lib/socialMetadata";

// ISR: το HTML σερβίρεται από cache (πριν: no-store σε κάθε αίτημα).
// Τα live σκορ ανανεώνονται client-side, δεν εξαρτώνται από αυτό το cache.
export const revalidate = 300;

type Params = {
  slug: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [settings, page] = await Promise.all([
    getCmsSiteSettings().catch(() => null),
    getNewsArticleBySlug(slug).catch(() => null),
  ]);

  if (!page) return {};

  const articlePage = page;

  const metadata = buildCmsMetadata({
    page: articlePage,
    settings,
    path: `/news/${articlePage.slug}`,
  });

  // Ο τίτλος του άρθρου ΠΡΕΠΕΙ να είναι ο πραγματικός του τίτλος (και όχι ό,τι έτυχε να γραφτεί
  // στο SEO metaTitle του CMS): αλλιώς η σελίδα δεν περιέχει πουθενά τη φράση με την οποία
  // ψάχνει κάποιος το άρθρο — μετρημένο 10/2026, το «Ankara World Cup 2026: Myung Woo Cho Wins
  // a 50-49 Classic» έβγαινε ως «…Cho Beats Jaspers 50-49» και δεν εμφανιζόταν πουθενά.
  const articleTitle = String(articlePage.title || metadata.title || "");

  const result: Metadata = {
    ...metadata,
    title: articleTitle,
    openGraph: {
      ...metadata.openGraph,
      type: "article",
      title: articleTitle,
    },
    twitter: {
      ...metadata.twitter,
      title: articleTitle,
    },
  };

  return result;
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const [settings, appearance, page] = await Promise.all([
    getCmsSiteSettings(),
    getCmsAppearance(),
    getNewsArticleBySlug(slug),
  ]);

  if (!page) {
    notFound();
  }

  /**
   * Η Google απορρίπτει Article όπου `dateModified` < `datePublished` — και ζωντανά
   * συνέβαινε (…07.077Z πριν το …07.110Z). Κρατάμε τη νωρίτερη ως δημοσίευση.
   */
  const publishedAt = page.publishedAt || page.updatedAt || undefined;
  const modifiedRaw = page.updatedAt || page.publishedAt || undefined;
  const dateModified =
    publishedAt && modifiedRaw && modifiedRaw < publishedAt ? publishedAt : modifiedRaw;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: toPlainText(page.summary) || undefined,
    datePublished: publishedAt,
    dateModified: dateModified,
    image: page.coverImage?.url ? [page.coverImage.url] : undefined,
    mainEntityOfPage: `${SITE_URL}/news/${page.slug}`,
    author: {
      "@type": "Organization",
      name: "Billiard Today",
      url: SITE_URL,
    },
    // Χωρίς publisher η Google δεν δίνει Article rich result.
    publisher: {
      "@type": "Organization",
      name: "Billiard Today",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo-billiardtoday.png`,
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <CmsPageView page={page} settings={settings} appearance={appearance} pageTitle={page.title} />
    </>
  );
}
