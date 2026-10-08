"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { getCountryFlagCdnUrl } from "@/lib/countryFlags";
import { formatCebDate } from "@/lib/cebRanking";
import type { UmbPlayerLinks, UmbRankingPayload } from "@/lib/umbRanking";

type Props = {
  payload: UmbRankingPayload;
  pageSize: number;
  playerLinks?: UmbPlayerLinks;
  /** Σύνδεσμος προς το PDF export ακριβώς αυτής της έκδοσης (χωρίς τιμή = χωρίς κουμπί). */
  downloadHref?: string | null;
};

/** Compact page list: 1 … 4 5 [6] 7 8 … 42 */
const buildPageList = (page: number, pageCount: number): Array<number | "gap"> => {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);

  const pages = new Set<number>([1, pageCount, page]);
  for (let offset = 1; offset <= 2; offset += 1) {
    if (page - offset > 1) pages.add(page - offset);
    if (page + offset < pageCount) pages.add(page + offset);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: Array<number | "gap"> = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) result.push("gap");
    result.push(value);
  });
  return result;
};

const formatScale = (scale: number[]) => scale.join(" / ");

/** Θέσεις της κλίμακας UMB — 11 ζώνες τερματισμού, ίδιες σε World Cup και Παγκόσμιο. */
const FINISH_HEADERS = ["1", "2", "3–4", "5–8", "9–16", "17–24", "25–32", "33–53", "54–85", "86–117", "118+"];

const POINT_ROWS: Array<{ label: string; values: Array<number | null> }> = [
  { label: "World Cup (B–K)", values: [80, 54, 36, 26, 18, 10, 8, 5, 4, 3, 2] },
  { label: "World Championship (A)", values: [80, 54, 36, 26, 18, 10, 8, null, null, null, null] },
];

/**
 * Μετάλλια δίπλα στους βαθμούς της διοργάνωσης. Κάθε στήλη πληρώνει με τη δική της
 * φθίνουσα κλίμακα (80/54/36/26/…) και μετάλλιο παίρνουν ΜΟΝΟ οι τρεις πρώτες τιμές:
 * 1η θέση → 🏆, 2η → 🥈, 3η → 🥉. Η τέταρτη τιμή (26 — ο δεύτερος χαμένος των
 * ημιτελικών) δεν παίρνει μετάλλιο, όπως ούτε η 5η και κάτω, ούτε οι ποινές απουσίας.
 */
const PLACE_MEDALS: Record<number, { emoji: string; label: string }> = {
  1: { emoji: "🏆", label: "1st place — gold cup" },
  2: { emoji: "🥈", label: "2nd place — silver medal" },
  3: { emoji: "🥉", label: "3rd place — bronze medal" },
};

const medalForPoints = (scale: number[] | undefined, value: number | null) => {
  if (!scale || value === null || value <= 0) return undefined;
  const place = scale.indexOf(value) + 1; // φθίνουσα κλίμακα: index 0 = 1η θέση
  return PLACE_MEDALS[place];
};

export function UmbRankingContent({ payload, pageSize, playerLinks, downloadHref }: Props) {
  const [query, setQuery] = useState("");
  const [fed, setFed] = useState("");
  const [showSuspended, setShowSuspended] = useState(true);
  const [page, setPage] = useState(1);

  const hasSuspended = payload.counts.suspended > 0;

  const federationOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of payload.rows) counts.set(row.fed, (counts.get(row.fed) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([code, count]) => ({ code, count, label: payload.federations[code] ?? code }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [payload]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return payload.rows.filter((row) => {
      if (hasSuspended && !showSuspended && row.suspended) return false;
      if (fed && row.fed !== fed) return false;
      if (needle && !row.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [payload, query, fed, showSuspended, hasSuspended]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);

  const setFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  // Sticky table header: sticks just below the site header (measured 97px at ≥lg on
  // /rankings/ceb/3c-individual) while the page scrolls. Applied to every <th> so each
  // cell carries its own background + stacking context (rows scroll underneath).
  // The wrapper only drops its scroll container at lg (>=1024px), where the table fits,
  // so horizontal scroll still works on narrow viewports.
  const headCell = "bg-slate-900 lg:sticky lg:top-[97px] lg:z-20";

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              How this list is built
            </div>
            <ul className="space-y-3 text-sm leading-7 text-slate-600">
              <li className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <span className="font-semibold text-slate-900">A world ranking, not a European one.</span>{" "}
                Every federation counts — there is no &ldquo;European players only&rdquo; filter and no
                national-championship column. Column A is the World Championship; columns B–K are the World
                Cups.
              </li>
              <li className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <span className="font-semibold text-slate-900">
                  Ten World Cups plus the World Championship — never more.
                </span>{" "}
                The list keeps a rolling window of the 11 most recent counting events: the World
                Championship (column A) and the ten most recent World Cups (columns B–K). Each new World Cup
                takes the place of the oldest of the ten.
              </li>
              <li className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <span className="font-semibold text-slate-900">Absence penalties count.</span> A player who
                was not entered in a counting tournament is given{" "}
                <span className="font-semibold text-rose-600">−8</span>, and one who was entered but did not
                play <span className="font-semibold text-rose-600">−16</span>. Both appear as a negative cell
                in that tournament&rsquo;s column and are subtracted from the total — so a total can be
                negative.
              </li>
              <li className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <span className="font-semibold text-slate-900">Columns that do not count stay empty.</span>{" "}
                A player only carries points in the events they actually played; every other column shows a
                dash, and the total on the right is the sum of their counting columns (penalties included).
              </li>
            </ul>
            <div className="space-y-3 pt-1">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                How players earn points
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full min-w-[640px] text-[12px]">
                  <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Finish</th>
                      {FINISH_HEADERS.map((head) => (
                        <th key={head} className="px-2 py-2 text-center">
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {POINT_ROWS.map((row) => (
                      <tr key={row.label} className="border-t border-slate-100">
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">{row.label}</td>
                        {row.values.map((points, index) => (
                          <td key={index} className="px-2 py-2 text-center tabular-nums text-slate-600">
                            {points ?? "–"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] leading-5 text-slate-500">
                Points per finishing position, exactly as printed on the official UMB Events Ranking. The
                World Championship (48 players) pays down to the last-16 group (26 points, i.e. 9th–16th);
                the World Cups pay down to the last place. Penalties of{" "}
                <span className="font-semibold text-rose-600">−8</span> /{" "}
                <span className="font-semibold text-rose-600">−16</span> are shown in the same column.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              Counting tournaments
            </div>
            <ol className="space-y-2">
              {payload.events.map((event) => (
                <li
                  key={event.key}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2"
                >
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[11px] font-bold text-white">
                    {event.key}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold leading-5 text-slate-900">
                      {event.href ? (
                        <Link
                          href={event.href}
                          className="hover:text-sky-700 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {event.name}
                          {event.city ? ` — ${event.city}` : ""}
                        </Link>
                      ) : (
                        <>
                          {event.name}
                          {event.city ? ` — ${event.city}` : ""}
                        </>
                      )}
                    </div>
                    <div className="text-[11px] leading-5 text-slate-500">
                      {[formatCebDate(event.date), `points ${formatScale(event.scale)}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section
        id="list"
        className="scroll-mt-24 rounded-[32px] border border-black/5 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 px-6 pt-6 sm:px-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Standings</h2>
            <p className="mt-1 text-sm text-slate-500">
              {payload.counts.players.toLocaleString("en-US")} players · {payload.counts.federations}{" "}
              federations · column points per counting tournament
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={query}
              onChange={(event) => setFilter(() => setQuery(event.target.value))}
              placeholder="Search player name…"
              className="w-56 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300"
              aria-label="Search player"
            />
            <select
              value={fed}
              onChange={(event) => setFilter(() => setFed(event.target.value))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300"
              aria-label="Filter by federation"
            >
              <option value="">All federations ({federationOptions.length})</option>
              {federationOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label} — {option.count}
                </option>
              ))}
            </select>
            {hasSuspended ? (
              <button
                type="button"
                onClick={() => setFilter(() => setShowSuspended((value) => !value))}
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  showSuspended
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                }`}
              >
                Suspended ({payload.counts.suspended}) {showSuspended ? "shown" : "hidden"}
              </button>
            ) : null}
            {downloadHref ? (
              <a
                href={downloadHref}
                download
                className="inline-flex items-center gap-1.5 rounded-full border border-sky-700 bg-sky-700 px-4 py-2 text-xs font-semibold text-white transition hover:border-sky-800 hover:bg-sky-800"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Download PDF
              </a>
            ) : null}
          </div>
        </div>

        <div className="px-2 pb-2 pt-5 sm:px-4">
          <div className="overflow-x-auto lg:overflow-x-clip">
            <table className="w-full min-w-[900px] border-separate border-spacing-0 text-right tabular-nums">
              <thead>
                <tr className="bg-slate-900 text-[11px] font-semibold uppercase tracking-wide text-white">
                  <th className={`${headCell} w-10 rounded-tl-xl px-1.5 py-2.5 text-right`}>#</th>
                  <th className={`${headCell} px-2 py-2.5 text-left`}>Player</th>
                  <th className={`${headCell} w-12 px-1.5 py-2.5 text-center`}>Fed</th>
                  <th className={`${headCell} w-12 px-1.5 py-2.5 text-right`}>Pts</th>
                  {payload.events.map((event) => (
                    <th
                      key={event.key}
                      className={`${headCell} min-w-[52px] px-1 py-2.5 text-center align-top last:rounded-tr-xl`}
                      title={`${event.name}${event.city ? ` — ${event.city}` : ""}${
                        event.date ? ` · ${formatCebDate(event.date)}` : ""
                      } · points ${formatScale(event.scale)}`}
                    >
                      <div className="text-[12px] font-bold uppercase leading-tight text-white/90">
                        {event.key}
                      </div>
                      <div className="text-[9px] font-medium normal-case leading-tight tracking-normal text-white/55">
                        {event.short}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row, rowIndex) => {
                  const flag = getCountryFlagCdnUrl(payload.federations[row.fed] ?? null, 40);
                  const suspendedOn = formatCebDate(row.suspended);
                  const link = playerLinks?.[String(row.rank)];
                  return (
                    <tr
                      key={`${row.rank}-${row.name}`}
                      className={
                        row.suspended
                          ? "bg-slate-200/70 text-slate-600"
                          : `${
                              rowIndex % 2 === 1 ? "bg-blue-100" : "bg-blue-50"
                            } hover:bg-sky-200/60`
                      }
                    >
                      <td className="border-b border-slate-100 px-2 py-1.5 text-[13px] text-slate-400">
                        {row.rank}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1.5 text-left">
                        <span className="flex items-center gap-2">
                          {flag ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={flag}
                              alt=""
                              width={18}
                              height={13}
                              loading="lazy"
                              className="h-[13px] w-[18px] shrink-0 rounded-[2px] object-cover"
                            />
                          ) : null}
                          {link ? (
                            <Link
                              href={`/players/${link.id}-${link.slug}`}
                              title={`${link.db} — player profile`}
                              className="truncate text-[13.5px] font-semibold text-slate-900 underline decoration-slate-300 decoration-dotted underline-offset-2 transition hover:text-blue-700 hover:decoration-blue-400"
                            >
                              {row.name}
                            </Link>
                          ) : (
                            <span className="truncate text-[13.5px] font-semibold text-slate-900">
                              {row.name}
                            </span>
                          )}
                          {suspendedOn ? (
                            <span
                              className="shrink-0 rounded-md border border-slate-400/50 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wide text-slate-600"
                              title={`Suspended for 1 year from ${suspendedOn}`}
                            >
                              suspended · {suspendedOn}
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1.5 text-center text-[12px] font-semibold text-slate-500">
                        {row.fed}
                      </td>
                      <td
                        className={`border-b border-slate-100 px-2 py-1.5 text-[13.5px] font-bold ${
                          row.points < 0 ? "text-rose-600" : "text-slate-900"
                        }`}
                      >
                        {row.points}
                      </td>
                      {row.ev.map((value, index) => {
                        const medal = medalForPoints(payload.events[index]?.scale, value);
                        const cellClass =
                          value === null
                            ? "text-slate-300"
                            : value < 0
                              ? "font-semibold text-rose-600"
                              : "text-slate-700";
                        return (
                          <td
                            key={`${row.rank}-${index}`}
                            className={`border-b border-slate-100 px-1 py-1.5 text-center text-[13px] ${cellClass}`}
                          >
                            <span className="inline-flex items-center justify-center gap-0.5">
                              <span>{value === null ? "–" : value}</span>
                              {medal ? (
                                <span
                                  role="img"
                                  aria-label={medal.label}
                                  title={medal.label}
                                  className="text-[11px] leading-none"
                                >
                                  {medal.emoji}
                                </span>
                              ) : null}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-6 py-4 text-sm text-slate-500 sm:px-8">
          <span>
            <strong className="font-semibold text-slate-900">{visible.length}</strong> shown ·{" "}
            {filtered.length.toLocaleString("en-US")} match the filters ·{" "}
            {payload.counts.players.toLocaleString("en-US")} ranked players
          </span>
          {pageCount > 1 ? (
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
              >
                Prev
              </button>
              {buildPageList(currentPage, pageCount).map((entry, index) =>
                entry === "gap" ? (
                  <span key={`gap-${index}`} className="px-1 text-xs text-slate-400">
                    …
                  </span>
                ) : (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setPage(entry)}
                    aria-current={entry === currentPage ? "page" : undefined}
                    className={`min-w-8 rounded-xl border px-2 py-1.5 text-xs font-semibold transition ${
                      entry === currentPage
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {entry}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
                disabled={currentPage >= pageCount}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>

        <p className="px-6 pb-6 text-[11.5px] leading-5 text-slate-400 sm:px-8">
          Filters and search work instantly in your browser — no reload. The list is a mirror of the
          official UMB Events Ranking and is refreshed when a new World Cup or World Championship is
          played. Source:{" "}
          <a
            href={payload.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="font-semibold text-sky-700 hover:underline"
          >
            {payload.sourceLabel} — edition {payload.edition} (PDF)
          </a>
          .
        </p>
      </section>
    </div>
  );
}
