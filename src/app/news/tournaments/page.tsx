import type { Metadata } from "next";
import Link from "next/link";
import { CmsPageShell } from "@/components/cms/CmsPageShell";
import { RichDescription } from "@/components/tournaments/RichDescription";
import { getCmsAppearance, getCmsSiteSettings } from "@/lib/cms/strapi";
import { listTournamentNewsArticles, type NewsArticleSummary } from "@/lib/cms/news";

export const metadata: Metadata = {
  title: "Tournament news archive | BilliardToday",
  description:
    "Every BilliardToday article that belongs to a tournament — previews, recaps and reports, grouped by event.",
  alternates: { canonical: "/news/tournaments" },
};

export const revalidate = 5;

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

type TournamentGroup = {
  slug: string;
  title: string;
  articles: NewsArticleSummary[];
  latest: string;
};

/**
 * Ομαδοποίηση ανά διοργάνωση. Η σειρά των ομάδων βγαίνει από το νεότερο άρθρο τους,
 * ώστε η σελίδα να μοιάζει με αρχείο (πρόσφατη διοργάνωση πρώτη) και όχι με αλφαβητικό
 * ευρετήριο. Άρθρα χωρίς σχέση τουρνουά δεν φτάνουν εδώ — αυτά ζουν στο /news.
 */
const groupByTournament = (articles: NewsArticleSummary[]): TournamentGroup[] => {
  const groups = new Map<string, TournamentGroup>();

  for (const article of articles) {
    const tournament = article.tournament;
    if (!tournament) continue;
    const existing = groups.get(tournament.slug);
    const publishedAt = article.publishedAt || article.updatedAt || "";
    if (existing) {
      existing.articles.push(article);
      if (publishedAt > existing.latest) existing.latest = publishedAt;
      continue;
    }
    groups.set(tournament.slug, {
      slug: tournament.slug,
      title: tournament.title,
      articles: [article],
      latest: publishedAt,
    });
  }

  return [...groups.values()].sort((a, b) => b.latest.localeCompare(a.latest));
};

export default async function TournamentNewsArchivePage() {
  const [settings, appearance, articles] = await Promise.all([
    getCmsSiteSettings(),
    getCmsAppearance(),
    listTournamentNewsArticles(200).catch(() => []),
  ]);

  const groups = groupByTournament(articles);

  return (
    <CmsPageShell settings={settings} appearance={appearance}>
      <main className="bg-[#f4efe6] px-4 py-14 sm:px-6 sm:py-18">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-red-700">
              News archive
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Tournament news
            </h1>
            <p className="mt-4 text-base leading-8 text-slate-700">
              Previews, recaps and reports grouped by the event they belong to. For everything
              else, see the <Link href="/news" className="font-semibold text-red-700 hover:underline">latest news</Link>.
            </p>
          </div>

          {groups.length === 0 ? (
            <p className="mt-10 text-sm text-slate-600">
              No tournament articles yet.
            </p>
          ) : (
            <div className="mt-10 space-y-10">
              {groups.map((group) => (
                <section key={group.slug} className="border-t border-slate-300 pt-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                      <Link href={`/tournaments/${group.slug}`} className="hover:underline">
                        {group.title}
                      </Link>
                    </h2>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {group.articles.length} {group.articles.length === 1 ? "article" : "articles"}
                    </div>
                  </div>

                  <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {group.articles.map((article) => (
                      <li key={article.id}>
                        <article className="flex h-full flex-col border border-slate-300 bg-white">
                          {article.coverImage?.url ? (
                            <img
                              src={article.coverImage.url}
                              alt={article.coverImage.alternativeText || article.title}
                              className="h-40 w-full object-cover"
                            />
                          ) : null}
                          <div className="flex flex-1 flex-col p-5">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              {formatDate(article.publishedAt || article.updatedAt)}
                            </div>
                            <h3 className="mt-2 text-lg font-semibold leading-snug text-slate-950">
                              <Link href={`/news/${article.slug}`} className="hover:underline">
                                {article.title}
                              </Link>
                            </h3>
                            {article.summary ? (
                              <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                                <RichDescription value={article.summary} />
                              </p>
                            ) : null}
                            <Link
                              href={`/news/${article.slug}`}
                              className="mt-auto pt-4 text-sm font-semibold text-red-700"
                            >
                              Read article
                            </Link>
                          </div>
                        </article>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </CmsPageShell>
  );
}
