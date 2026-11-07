import Link from "next/link";
import type { NewsArticleSummary } from "@/lib/cms/news";

/**
 * Server-rendered «άρθρα για αυτή τη διοργάνωση» μέσα στη σελίδα τουρνουά.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ: το άρθρο έδειχνε τη διοργάνωση, η διοργάνωση όμως ποτέ το άρθρο —
 * καμία αμοιβαία διαδρομή για τον crawler ούτε για τον αναγνώστη. Η λίστα έρχεται
 * έτοιμη από τον server (`findNewsArticlesForTournament`) και μπαίνει στο HTML,
 * όχι με fetch στον browser. Αν δεν υπάρχει άρθρο, το τμήμα δεν αποδίδεται καθόλου.
 */
export function TournamentNewsSection({
  articles,
  title = "Tournament news",
}: {
  articles: NewsArticleSummary[];
  title?: string;
}) {
  if (!articles.length) return null;

  return (
    <section id="tournament-news" className="mt-10 scroll-mt-28">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {articles.map((article) => (
          <li key={article.slug}>
            <Link
              href={`/news/${article.slug}`}
              className="flex h-full flex-col gap-2 rounded-[20px] border border-slate-200 bg-white p-4 transition hover:border-sky-300 hover:shadow-[0_14px_40px_rgba(15,23,42,0.08)]"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                {formatArticleDate(article.publishedAt)}
              </span>
              <span className="text-sm font-semibold leading-6 text-slate-900">
                {article.title}
              </span>
              {article.summary ? (
                <span className="text-sm leading-6 text-slate-600">{article.summary}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const formatArticleDate = (value?: string | null): string => {
  if (!value) return "News";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "News";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Athens",
  }).format(date);
};
