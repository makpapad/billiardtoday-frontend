import Link from "next/link";

/**
 * Server-rendered πλοήγηση του καταλόγου αθλητών.
 * Ο κατάλογος ήταν client-side αναζήτηση + 150 τυχαίοι ανά ημέρα, οπότε το Google
 * δεν είχε δρόμο προς τις ~3.300 σελίδες αθλητών (τις έβλεπε μόνο από το sitemap και
 * τις άφηνε «Discovered – currently not indexed»). Εδώ δίνουμε σταθερά, crawlable links:
 * ευρετήριο πρώτου γράμματος + αριθμημένη σελιδοποίηση.
 */

const buildHref = (params: { page?: number; letter?: string | null }) => {
  const search = new URLSearchParams();
  if (params.letter) search.set("letter", params.letter);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/players?${query}` : "/players";
};

export function PlayerLetterNav({
  letters,
  activeLetter,
}: {
  letters: string[];
  activeLetter: string | null;
}) {
  if (letters.length === 0) return null;

  return (
    <nav aria-label="Players by first letter" className="mb-6 flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        Browse
      </span>
      <Link
        href={buildHref({})}
        prefetch={false}
        aria-current={!activeLetter ? "page" : undefined}
        className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] transition ${
          !activeLetter
            ? "border-sky-300 bg-sky-50 text-sky-800"
            : "border-slate-200 text-slate-600 hover:border-sky-200 hover:text-sky-700"
        }`}
      >
        All
      </Link>
      {letters.map((letter) => {
        const isActive = activeLetter === letter;
        return (
          <Link
            key={letter}
            href={buildHref({ letter })}
            prefetch={false}
            aria-current={isActive ? "page" : undefined}
            className={`min-w-[2.25rem] rounded-full border px-3 py-1 text-center text-xs font-semibold uppercase tracking-[0.12em] transition ${
              isActive
                ? "border-sky-300 bg-sky-50 text-sky-800"
                : "border-slate-200 text-slate-600 hover:border-sky-200 hover:text-sky-700"
            }`}
          >
            {letter}
          </Link>
        );
      })}
    </nav>
  );
}

/** Αριθμημένη σελιδοποίηση με πραγματικά <a> — το crawler ακολουθεί κάθε σελίδα. */
export function PlayerPagination({
  page,
  pageCount,
  letter,
}: {
  page: number;
  pageCount: number;
  letter: string | null;
}) {
  if (pageCount <= 1) return null;

  const windowSize = 7;
  const start = Math.max(1, Math.min(page - Math.floor(windowSize / 2), pageCount - windowSize + 1));
  const end = Math.min(pageCount, start + windowSize - 1);
  const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index);

  const linkClass =
    "rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-sky-200 hover:text-sky-700";
  const activeClass =
    "rounded-full border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800";

  return (
    <nav aria-label="Players pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={buildHref({ page: page - 1, letter })} prefetch={false} className={linkClass}>
          Previous
        </Link>
      ) : null}
      {start > 1 ? <span className="px-2 text-sm text-slate-400">…</span> : null}
      {pages.map((item) =>
        item === page ? (
          <span key={item} aria-current="page" className={activeClass}>
            {item}
          </span>
        ) : (
          <Link
            key={item}
            href={buildHref({ page: item, letter })}
            prefetch={false}
            className={linkClass}
          >
            {item}
          </Link>
        ),
      )}
      {end < pageCount ? <span className="px-2 text-sm text-slate-400">…</span> : null}
      {page < pageCount ? (
        <Link href={buildHref({ page: page + 1, letter })} prefetch={false} className={linkClass}>
          Next
        </Link>
      ) : null}
    </nav>
  );
}
