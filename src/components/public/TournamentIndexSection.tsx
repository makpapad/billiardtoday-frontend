import Link from "next/link";
import type { PublicTournamentLink } from "@/lib/publicTournamentIndex";

/**
 * Server-rendered πλήρης κατάλογος διοργανώσεων μέσα σε κλειστό `<details>`.
 *
 * ΓΙΑΤΙ: η λίστα `/tournaments` αποδίδει server-side μόνο την πρώτη σελίδα (20 από 401,
 * μετρημένο 10/11/2026). Οι υπόλοιπες ήταν προσβάσιμες μόνο μέσω pagination που θέλει
 * JavaScript, δηλαδή χωρίς κανέναν εσωτερικό σύνδεσμο για τον crawler. Εδώ κάθε
 * διοργάνωση παίρνει έναν πραγματικό `<a href>` από τη σελίδα με τη μεγαλύτερη βαρύτητα.
 *
 * Οπτικά κρυμμένο, ΠΛΗΡΕΣ στο HTML — ίδιο μοτίβο με το «Tournament Overview» της σελίδας
 * διοργάνωσης. Λειτουργεί και με JavaScript κλειστή.
 */
const formatDate = (value: string | null): string => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
};

const formatRange = (item: { startDate: string | null; endDate: string | null }): string => {
  const start = formatDate(item.startDate);
  const end = formatDate(item.endDate);
  if (start && end && start !== end) return `${start} — ${end}`;
  return start || end;
};

export function TournamentIndexSection({
  items,
  teamItems = [],
}: {
  items: PublicTournamentLink[];
  teamItems?: PublicTournamentLink[];
}) {
  if (items.length === 0 && teamItems.length === 0) return null;

  const groups: Array<{ heading: string; rows: PublicTournamentLink[] }> = [];
  if (items.length > 0) {
    groups.push({ heading: `All tournaments (${items.length})`, rows: items });
  }
  if (teamItems.length > 0) {
    groups.push({ heading: `Team tournaments (${teamItems.length})`, rows: teamItems });
  }

  return (
    <section className="mx-auto w-full max-w-[1320px] px-1 pb-12 sm:px-6">
      <details className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
        <summary className="cursor-pointer list-none text-base font-semibold text-slate-950">
          Tournament archive
          <span className="ml-2 text-sm font-normal text-slate-500">
            {items.length + teamItems.length}{" "}
            {items.length + teamItems.length === 1 ? "tournament" : "tournaments"} — every
            season on one page
          </span>
        </summary>

        <div className="mt-6 space-y-8">
          {groups.map((group) => (
            <div key={group.heading}>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                {group.heading}
              </h3>
              <ul className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                {group.rows.map((item) => {
                  const range = formatRange(item);
                  return (
                    <li key={item.documentId || item.href} className="text-slate-700">
                      <Link
                        href={item.href}
                        className="font-medium text-slate-900 underline decoration-dotted hover:text-sky-700"
                      >
                        {item.title}
                      </Link>
                      {range ? <span className="text-slate-500"> · {range}</span> : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
