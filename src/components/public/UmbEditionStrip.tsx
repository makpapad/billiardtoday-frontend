import Link from "next/link";
import { formatUmbDate, umbEditionHref, type UmbRankingArchiveEdition } from "@/lib/umbRanking";

type Props = {
  slug: string;
  editions: UmbRankingArchiveEdition[];
  /** Η έκδοση που σερβίρει τώρα το ranking (η «τρέχουσα»). */
  currentEdition: string | null;
  /** Το κλειδί της έκδοσης που βλέπει ο επισκέπτης (στην αρχειοθετημένη σελίδα). */
  viewingKey?: string;
};

/**
 * «Editions kept» — η λωρίδα που δείχνει ποιες εκδόσεις κρατάμε και οδηγεί
 * στα αρχειοθετημένα αντίγραφα. Server component, χωρίς JS.
 * Ίδια εμφάνιση/θέση με το CEB (`CebEditionStrip`), με τα δεδομένα της UMB.
 */
export function UmbEditionStrip({ slug, editions, currentEdition, viewingKey }: Props) {
  if (editions.length === 0) return null;

  return (
    <section className="rounded-[24px] border border-black/5 bg-white px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
          Editions kept
        </span>
        {editions.map((entry) => {
          const isViewing = viewingKey === entry.key;
          const isCurrent = currentEdition === entry.edition;
          const label = isViewing
            ? "you are here"
            : isCurrent
              ? "current"
              : (formatUmbDate(entry.updatedAt) ?? "archived");
          const className = [
            "inline-flex items-center rounded-full border px-4 py-2 text-sm transition",
            isViewing
              ? "border-sky-300 bg-sky-50 font-semibold text-sky-900"
              : isCurrent
                ? "border-sky-200 bg-white font-semibold text-sky-800"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-sky-200 hover:text-slate-900",
          ].join(" ");
          const body = (
            <>
              <span>{entry.edition}</span>
              <span className="ml-2 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                {label}
              </span>
            </>
          );

          return isViewing ? (
            <span key={entry.key} className={className}>
              {body}
            </span>
          ) : (
            <Link key={entry.key} href={umbEditionHref(slug, entry.key)} className={className}>
              {body}
            </Link>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-6 text-slate-500">
        Every edition stays online after a new one is published, so old results and points can always be
        traced back to the list they came from.
      </p>
    </section>
  );
}
