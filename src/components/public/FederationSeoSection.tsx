import Link from "next/link";
import type { FederationEventLink } from "@/lib/federationPageData";

/**
 * Server-rendered σύνοψη ομοσπονδίας: οι διοργανώσεις και οι σύλλογοί της ως πραγματικοί
 * σύνδεσμοι, μέσα σε κλειστό `<details>`.
 *
 * ΓΙΑΤΙ: οι καρτέλες της σελίδας φορτώνουν με JS, άρα το HTML της ομοσπονδίας δεν είχε
 * ΟΥΤΕ ΕΝΑΝ σύνδεσμο προς διοργάνωση ή σύλλογο (μετρήθηκε 10/11/2026: 0 τουρνουά,
 * 0 σύλλογοι, 949-1.054 χαρακτήρες κειμένου σε τέσσερις ομοσπονδίες). Ίδιο μοτίβο με το
 * «Tournament Overview» των σελίδων διοργάνωσης: οπτικά κρυμμένο, ΠΛΗΡΕΣ στο HTML —
 * λειτουργεί και με JavaScript κλειστή, δεν είναι κρυφό κείμενο (έχει ορατό κουμπί).
 */
type ClubLink = {
  name: string;
  slug: string | null;
  documentId: string;
};

const formatDate = (value: string | null): string => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
};

const formatRange = (event: FederationEventLink): string => {
  const start = formatDate(event.startDate);
  const end = formatDate(event.endDate);
  if (start && end && start !== end) return `${start} — ${end}`;
  if (start) return start;
  if (end) return end;
  return event.season ? `Season ${event.season}` : "";
};

export function FederationSeoSection({
  federationName,
  events,
  clubs,
}: {
  federationName: string;
  events: FederationEventLink[];
  clubs: ClubLink[];
}) {
  const usableClubs = clubs.filter((club) => Boolean(club.slug || club.documentId));
  if (events.length === 0 && usableClubs.length === 0) return null;

  // Μόνο ό,τι υπάρχει: «0 tournaments · 3 clubs» διαβάζεται σαν σφάλμα.
  const counts = [
    events.length > 0 ? `${events.length} ${events.length === 1 ? "tournament" : "tournaments"}` : null,
    usableClubs.length > 0
      ? `${usableClubs.length} ${usableClubs.length === 1 ? "club" : "clubs"}`
      : null,
  ].filter(Boolean);

  return (
    <section className="mx-auto w-full max-w-[1320px] px-1 pb-12 sm:px-6">
      <details className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
        <summary className="cursor-pointer list-none text-base font-semibold text-slate-950">
          Federation overview — {federationName}
          <span className="ml-2 text-sm font-normal text-slate-500">{counts.join(" · ")}</span>
        </summary>

        <div className="mt-6 space-y-8">
          {events.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Tournaments ({events.length})
              </h3>
              <ul className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                {events.map((event) => {
                  const range = formatRange(event);
                  return (
                    <li key={event.documentId || event.href} className="text-slate-700">
                      <Link
                        href={event.href}
                        className="font-medium text-slate-900 underline decoration-dotted hover:text-sky-700"
                      >
                        {event.title}
                      </Link>
                      {range ? <span className="text-slate-500"> · {range}</span> : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {usableClubs.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Affiliated clubs ({usableClubs.length})
              </h3>
              <ul className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                {usableClubs.map((club) => (
                  <li key={club.documentId || club.slug || club.name} className="text-slate-700">
                    <Link
                      href={`/clubs/${club.slug || club.documentId}`}
                      className="underline decoration-dotted hover:text-sky-700"
                    >
                      {club.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </details>
    </section>
  );
}
