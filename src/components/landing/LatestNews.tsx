import Link from "next/link";
import type { NewsArticleSummary } from "@/lib/cms/news";

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export function LatestNews({ articles }: { articles: NewsArticleSummary[] }) {
  if (articles.length === 0) return null;

  return (
    <section id="news" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-red-700">
              BilliardToday News
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Latest billiard news, events and ranking updates.
            </h2>
          </div>
          <Link href="/news" className="text-sm font-semibold text-slate-950 underline-offset-4 hover:underline">
            View all news
          </Link>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {articles.slice(0, 3).map((article) => (
            <article key={article.id} className="border border-slate-200 bg-slate-50">
              {article.coverImage?.url ? (
                <img
                  src={article.coverImage.url}
                  alt={article.coverImage.alternativeText || article.title}
                  className="h-44 w-full object-cover"
                />
              ) : null}
              <div className="p-5">
                {formatDate(article.publishedAt || article.updatedAt) ? (
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {formatDate(article.publishedAt || article.updatedAt)}
                  </div>
                ) : null}
                <h3 className="mt-3 text-xl font-semibold leading-tight text-slate-950">
                  <Link href={`/news/${article.slug}`} className="hover:underline">
                    {article.title}
                  </Link>
                </h3>
                {article.summary ? (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{article.summary}</p>
                ) : null}
                <Link href={`/news/${article.slug}`} className="mt-5 inline-flex text-sm font-semibold text-red-700">
                  Read article
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
