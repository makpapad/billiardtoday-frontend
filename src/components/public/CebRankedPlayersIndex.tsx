import Link from "next/link";
import {
  buildCebPlayerLinkIndex,
  resolveCebPlayerLink,
} from "@/lib/cebRanking";
import type { CebPlayerLinks, CebRankingPayload } from "@/lib/cebRanking";

/**
 * Server-rendered ευρετήριο ΟΛΩΝ των αθλητών του πίνακα CEB, με link στο προφίλ τους.
 *
 * Ο πίνακας της CEB είναι client-side (σελιδοποίηση/φίλτρα μέσα στο component), οπότε
 * στο HTML έβγαιναν μόνο ~50 σύνδεσμοι από τις 1.468 γραμμές: οι αθλητές κάτω από το
 * top-50 δεν είχαν ΚΑΝΕΝΑ εισερχόμενο link από πουθενά (ούτε από σύλλογο, ούτε από τη
 * σελίδα παίκτη) — γι' αυτό το Google δεν τους ευρετηρίαζε. Εδώ βγαίνουν όλοι, σε
 * συμπτυγμένο <details> ώστε να μη χαλάει η όψη της σελίδας.
 */
export function CebRankedPlayersIndex({
  payload,
  playerLinks,
}: {
  payload: CebRankingPayload;
  playerLinks?: CebPlayerLinks;
}) {
  if (!playerLinks) return null;

  const index = buildCebPlayerLinkIndex(playerLinks);
  const ranked = payload.rows
    .map((row) => ({ row, link: resolveCebPlayerLink(row, playerLinks, index) }))
    .filter((item): item is { row: (typeof payload.rows)[number]; link: NonNullable<typeof item.link> } =>
      Boolean(item.link),
    );

  if (ranked.length === 0) return null;

  return (
    <details className="mt-10 rounded-[26px] border border-black/5 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
      <summary className="cursor-pointer list-none px-6 py-5 text-sm font-semibold text-slate-900 sm:px-8">
        All ranked players ({ranked.length}) — open the profile list
      </summary>
      <div className="px-6 pb-7 sm:px-8">
        <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {ranked.map(({ row, link }) => (
            <li key={`${row.rank}-${link.id}`} className="min-w-0 text-sm text-slate-700">
              <span className="mr-2 inline-block w-10 text-right text-xs tabular-nums text-slate-400">
                {row.rank}
              </span>
              <Link
                href={`/players/${link.id}-${link.slug}`}
                className="transition hover:text-sky-700 hover:underline"
              >
                {row.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
