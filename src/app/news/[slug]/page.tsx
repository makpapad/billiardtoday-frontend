import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CmsPageView } from "@/components/cms/CmsPageView";
import { buildCmsMetadata } from "@/lib/cms/metadata";
import { getCmsAppearance, getCmsSiteSettings } from "@/lib/cms/strapi";
import { getNewsArticleBySlug } from "@/lib/cms/news";
import type { CmsPage } from "@/lib/cms/types";

type Params = {
  slug: string;
};

const LONGONI_RECAP_SLUG = "longoni-next-gen-grand-prix-u21-2026-athens-recap";
const LONGONI_OLD_IMAGE_URL = "https://cdn.billiardtoday.com/uploads/IMG_3872_1a5c8c4818.jpeg";
const LONGONI_NEW_IMAGE_URL = "https://cdn.billiardtoday.com/uploads/IMG_3868_a0015c6d95.jpeg";

const applyArticleContentOverrides = (page: CmsPage): CmsPage => {
  if (page.slug !== LONGONI_RECAP_SLUG) return page;

  return {
    ...page,
    coverImage: page.coverImage
      ? {
          ...page.coverImage,
          url: LONGONI_NEW_IMAGE_URL,
        }
      : page.coverImage,
    sections: page.sections.map((section) => {
      if (
        section.__component === "cms.rich-text-section" &&
        section.content.includes(LONGONI_OLD_IMAGE_URL)
      ) {
        return {
          ...section,
          content: section.content.split(LONGONI_OLD_IMAGE_URL).join(LONGONI_NEW_IMAGE_URL),
        };
      }

      return section;
    }),
  };
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

  const articlePage = applyArticleContentOverrides(page);

  const metadata = buildCmsMetadata({
    page: articlePage,
    settings,
    path: `/news/${articlePage.slug}`,
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
    getNewsArticleBySlug(slug).then((article) => (article ? applyArticleContentOverrides(article) : null)),
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
