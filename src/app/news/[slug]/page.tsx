import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CmsPageView } from "@/components/cms/CmsPageView";
import { buildCmsMetadata } from "@/lib/cms/metadata";
import { getCmsAppearance, getCmsSiteSettings } from "@/lib/cms/strapi";
import { getNewsArticleBySlug } from "@/lib/cms/news";

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

  const metadata = buildCmsMetadata({
    page,
    settings,
    path: `/news/${page.slug}`,
  });

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: "article",
    },
  };
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

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.summary || undefined,
    datePublished: page.publishedAt || undefined,
    dateModified: page.updatedAt || undefined,
    image: page.coverImage?.url ? [page.coverImage.url] : undefined,
    mainEntityOfPage: `https://billiardtoday.com/news/${page.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <CmsPageView page={page} settings={settings} appearance={appearance} />
    </>
  );
}
