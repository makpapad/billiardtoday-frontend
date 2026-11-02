import Link from "next/link";
import type { PublicTournamentEventCard } from "@/lib/publicSiteData";

/**
 * «Τώρα παίζεται» στην αρχική.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ: η αρχική είναι η σελίδα με το μεγαλύτερο crawl priority και δεν
 * είχε ούτε έναν σύνδεσμο προς διοργάνωση (μετρήθηκε 02/11/2026). Οι σελίδες των
 * τουρνουά ήταν στο sitemap αλλά «URL is unknown to Google» — ένας σύνδεσμος από την
 * αρχική είναι ο πιο δυνατός δρόμος ανακάλυψης που έχουμε.
 *
 * ΠΩΣ ΑΝΑΝΕΩΝΕΤΑΙ: server-rendered με ISR (`revalidate = 300` στο page.tsx). Καμία
 * χειροκίνητη ενέργεια, κανένα client polling: το «ποιο παίζεται» αλλάζει μία φορά
 * την ημέρα, όχι κάθε λεπτό. Οι σύνδεσμοι βγαίνουν μέσα στο HTML ώστε να τους
 * βλέπει ο crawler.
 */

const dayKey = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const formatRange = (
  startDate: string | null,
  endDate: string | null,
): string => {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (!start || Number.isNaN(start.getTime())) return "";
  const day = new Intl.DateTimeFormat("en", { day: "numeric", timeZone: "UTC" });
  const month = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" });
  const year = new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "UTC" });
  if (!end || Number.isNaN(end.getTime()) || dayKey(startDate) === dayKey(endDate)) {
    return `${day.format(start)} ${month.format(start)} ${year.format(start)}`;
  }
  const sameMonth =
    month.format(start) === month.format(end) && year.format(start) === year.format(end);
  return sameMonth
    ? `${day.format(start)}–${day.format(end)} ${month.format(start)} ${year.format(start)}`
    : `${day.format(start)} ${month.format(start)} – ${day.format(end)} ${month.format(end)} ${year.format(end)}`;
};

export function LiveNow({ events }: { events: PublicTournamentEventCard[] }) {
  const today = dayKey(new Date().toISOString());
  if (!today) return null;

  const withDates = events.filter((event) => dayKey(event.startDate));
  const running = withDates
    .filter((event) => {
      const start = dayKey(event.startDate) as string;
      const end = dayKey(event.endDate) ?? start;
      return start <= today && today <= end;
    })
    .sort((a, b) => (dayKey(b.startDate) ?? "").localeCompare(dayKey(a.startDate) ?? ""));
  const upcoming = withDates
    .filter((event) => (dayKey(event.startDate) as string) > today)
    .sort((a, b) => (dayKey(a.startDate) ?? "").localeCompare(dayKey(b.startDate) ?? ""))
    .slice(0, 2);

  const shown = [...running.slice(0, 3), ...upcoming].slice(0, 4);
  if (shown.length === 0) return null;

  return (
    <section id="live-now" className="border-y border-slate-200 bg-slate-50 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-red-700">
              {running.length > 0 ? "Playing now" : "Starting soon"}
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              {running.length > 0
                ? "Tournaments on the tables right now."
                : "The next tournaments on the calendar."}
            </h2>
          </div>
          <Link
            href="/tournaments/live"
            className="text-sm font-semibold text-slate-950 underline-offset-4 hover:underline"
          >
            Live scores
          </Link>
        </div>

        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {shown.map((event) => {
            const isRunning =
              (dayKey(event.startDate) as string) <= today &&
              today <= (dayKey(event.endDate) ?? (dayKey(event.startDate) as string));
            return (
              <li key={event.documentId} className="border border-slate-200 bg-white">
                <Link href={event.href} className="flex h-full flex-col gap-2 p-5 hover:bg-slate-50">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
                    {isRunning ? (
                      <span className="inline-flex items-center gap-2 text-red-700">
                        <span className="inline-block h-2 w-2 rounded-full bg-red-600" />
                        Live
                      </span>
                    ) : (
                      <span className="text-slate-500">Upcoming</span>
                    )}
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500">{formatRange(event.startDate, event.endDate)}</span>
                  </div>
                  <h3 className="text-lg font-semibold leading-tight text-slate-950">
                    {event.title}
                  </h3>
                  <span className="mt-auto pt-2 text-sm font-semibold text-red-700">
                    View tournament
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-6">
          <Link
            href="/tournaments"
            className="text-sm font-semibold text-slate-950 underline-offset-4 hover:underline"
          >
            All tournaments
          </Link>
        </div>
      </div>
    </section>
  );
}
