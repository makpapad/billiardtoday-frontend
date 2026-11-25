import Link from "next/link";
import { RichDescription } from "@/components/tournaments/RichDescription";
import type { NewsArticleSummary } from "@/lib/cms/news";

/**
 * Server-rendered «άρθρα για αυτή τη διοργάνωση» μέσα στη σελίδα τουρνουά.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ: το άρθρο έδειχνε τη διοργάνωση, η διοργάνωση όμως ποτέ το άρθρο —
 * καμία αμοιβαία διαδρομή για τον crawler ούτε για τον αναγνώστη. Η λίστα έρχεται
 * έτοιμη από τον server (`findNewsArticlesForTournament`) και μπαίνει στο HTML,
 * όχι με fetch στον browser. Αν δεν υπάρχει άρθρο, το τμήμα δεν αποδίδεται καθόλου.
 *
 * ΙΔΙΑ ΚΑΡΤΑ ΜΕ ΤΟ /news: φωτογραφία, ημερομηνία, τίτλος, σύνοψη, «Read article» —
 * ίδιο markup και ίδια κλάση grid, ώστε το ίδιο άρθρο να μη δείχνει σαν άλλο
 * πράγμα ανάλογα με το πού το βλέπεις. Η κάρτα ΔΕΝ έχει δικό της περίγραμμα
 * (χρησιμοποιεί το panel του τουρνουά που την περιβάλλει), γι' αυτό και δεν
 * επαναλαμβάνει `<section>`/`<h2>`.
 */
export function TournamentNewsSection({
  articles,
}: {
  articles: NewsArticleSummary[];
}) {
  if (!articles.length) return null;

  return (
    <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {articles.map((article) => (
        <article key={article.slug} className="border border-slate-300 bg-white">
          {article.coverImage?.url ? (
            <img
              src={article.coverImage.url}
              alt={article.coverImage.alternativeText || article.title}
              loading="lazy"
              className="h-52 w-full object-cover"
            />
          ) : null}
          <div className="p-6">
            {formatArticleDate(article.publishedAt || article.updatedAt) ? (
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {formatArticleDate(article.publishedAt || article.updatedAt)}
              </div>
            ) : null}
            <h3 className="mt-3 text-2xl font-semibold leading-tight text-slate-950">
              <Link href={`/news/${article.slug}`} className="hover:underline">
                {article.title}
              </Link>
            </h3>
            {article.summary ? (
              <p className="mt-4 line-clamp-4 text-sm leading-7 text-slate-600">
                <RichDescription value={article.summary} />
              </p>
            ) : null}
            <Link
              href={`/news/${article.slug}`}
              className="mt-6 inline-flex text-sm font-semibold text-red-700 hover:underline"
            >
              Read article
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

/** Ίδια μορφή ημερομηνίας με τη λίστα του /news (`25 November 2026`). */
const formatArticleDate = (value?: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};
