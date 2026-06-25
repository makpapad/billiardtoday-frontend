import type { Metadata } from "next";
import Link from "next/link";
import { CmsPageShell } from "@/components/cms/CmsPageShell";
import { getCmsAppearance, getCmsSiteSettings } from "@/lib/cms/strapi";
import { listNewsArticles } from "@/lib/cms/news";

export const metadata: Metadata = {
  title: "BilliardToday News",
  description: "Latest billiard news, tournament updates, ranking stories, and event coverage from BilliardToday.",
  alternates: { canonical: "/news" },
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

export default async function NewsIndexPage() {
  const [settings, appearance, articles] = await Promise.all([
    getCmsSiteSettings(),
    getCmsAppearance(),
    listNewsArticles(24).catch(() => []),
  ]);

  return (
    <CmsPageShell settings={settings} appearance={appearance}>
      <main className="bg-[#f4efe6] px-4 py-14 sm:px-6 sm:py-18">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-red-700">
              News
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              BilliardToday News
            </h1>
            <p className="mt-4 text-base leading-8 text-slate-700">
              Tournament updates, ranking stories, event previews, recaps, and billiard platform news.
            </p>
          </div>

          {articles.length > 0 ? (
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {articles.map((article) => (
                <article key={article.id} className="border border-slate-300 bg-white">
                  {article.coverImage?.url ? (
                    <img
                      src={article.coverImage.url}
                      alt={article.coverImage.alternativeText || article.title}
                      className="h-52 w-full object-cover"
                    />
                  ) : null}
                  <div className="p-6">
                    {formatDate(article.publishedAt || article.updatedAt) ? (
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {formatDate(article.publishedAt || article.updatedAt)}
                      </div>
                    ) : null}
                    <h2 className="mt-3 text-2xl font-semibold leading-tight text-slate-950">
                      <Link href={`/news/${article.slug}`} className="hover:underline">
                        {article.title}
                      </Link>
                    </h2>
                    {article.summary ? (
                      <p className="mt-4 line-clamp-4 text-sm leading-7 text-slate-600">
                        {article.summary}
                      </p>
                    ) : null}
                    <Link href={`/news/${article.slug}`} className="mt-6 inline-flex text-sm font-semibold text-red-700">
                      Read article
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-10 border border-slate-300 bg-white p-8 text-slate-700">
              No news articles have been published yet.
            </div>
          )}
        </div>
      </main>
    </CmsPageShell>
  );
}
