"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getCountryFlagCdnUrl } from "@/lib/countryFlags";
import { formatCebDate, type CebPlayerLinks, type CebRankingPayload } from "@/lib/cebRanking";

type Props = {
  payload: CebRankingPayload;
  pageSize: number;
  playerLinks?: CebPlayerLinks;
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

export function CebRankingContent({ payload, pageSize, playerLinks }: Props) {
  // Το «πίσω» στη σελίδα τουρνουά δείχνει από πού ήρθες (τίτλος = το H1 αυτής της σελίδας).
  const backLabel = `${payload.title} — European Ranking`;
  const withBack = (href: string) => `${href}${href.includes("?") ? "&" : "?"}back=${encodeURIComponent(backLabel)}`;
  const [query, setQuery] = useState("");
  const [fed, setFed] = useState("");
  const [showSuspended, setShowSuspended] = useState(true);
  const [page, setPage] = useState(1);

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
      if (!showSuspended && row.suspended) return false;
      if (fed && row.fed !== fed) return false;
      if (needle && !row.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [payload, query, fed, showSuspended]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);

  const setFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

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
                <span className="font-semibold text-slate-900">European players only.</span> World Cup
                winners from outside Europe score no points here — the CEB ranking is a European circuit.
              </li>
              <li className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <span className="font-semibold text-slate-900">Six World Cups count — never more.</span>{" "}
                Only the World Cups held in Europe are counted, and each new one takes the place of the
                oldest of the six — so the list always follows the six most recent (columns E–J).
              </li>
              <li className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <span className="font-semibold text-slate-900">One national championship counts, not three.</span> Columns B, C and D are the three seasons of the cycle and no player has points in more than one of them. The points are
                reported by the national federations and directly to CEB. Every total is therefore 8 events: 6 World Cups + 1 national championship
                + the European Championship (column A) — the columns that do not count stay empty.
              </li>
              <li className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <span className="font-semibold text-slate-900">
                  Ties: the most recent World Cup decides first.
                </span>{" "}
                Two or more players on the same total are compared in this order: the most recent of the six World Cups first, then World Cup by World Cup back to the oldest,
                then the national championship, and the European Championship last of all.
              </li>
            </ul>
            <div className="space-y-3 pt-1">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                How players earn points
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-[12px]">
                  <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Finish</th>
                      {["1", "2", "3–4", "5–8", "9–16", "17–32", "**"].map((head) => (
                        <th key={head} className="px-2 py-2 text-center">
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "European Championship (A)", values: [80, 54, 38, 26, 16, 8, 4] },
                      { label: "National championships (B–D)", values: [40, 27, 19, 13, 8, 4, null] },
                      { label: "World Cups (E–J)", values: [40, 27, 19, 13, 8, 4, 2] },
                    ].map((row) => (
                      <tr key={row.label} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium text-slate-900">{row.label}</td>
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
                Points per finishing position, exactly as printed at the top of the official CEB list (the
                ** column is the last one in that list). The European Championship pays double points.
                Rounds are marked in the same list: EC = European Championship and GP = the qualifying rounds (Q) of the UMB World Cups.
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
                        <Link href={withBack(event.href)} className="hover:text-sky-700 hover:underline">
                          {event.name}
                        </Link>
                      ) : (
                        event.name
                      )}
                    </div>
                    <div className="text-[11px] leading-5 text-slate-500">
                      {[formatCebDate(event.date), `points ${formatScale(event.scale)}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  {event.href ? (
                    <span className="ml-auto shrink-0 text-[11px] font-semibold text-sky-700">
                      Results
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="list" className="scroll-mt-24 rounded-[32px] border border-black/5 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-end justify-between gap-3 px-6 pt-6 sm:px-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Standings</h2>
            <p className="mt-1 text-sm text-slate-500">
              {payload.counts.players.toLocaleString("en-US")} players ·{" "}
              {payload.counts.federations} federations · column points per counting tournament
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
          </div>
        </div>

        <div className="px-2 pb-2 pt-5 sm:px-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-right tabular-nums">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="w-10 border-b border-slate-200 px-1.5 py-2 text-right">#</th>
                  <th className="border-b border-slate-200 px-2 py-2 text-left">Player</th>
                  <th className="w-12 border-b border-slate-200 px-1.5 py-2 text-center">Fed</th>
                  <th className="w-12 border-b border-slate-200 px-1.5 py-2 text-right">Pts</th>
                  {payload.events.map((event) => (
                    <th
                      key={event.key}
                      className="min-w-[52px] border-b border-slate-200 px-1 py-2 text-center align-top"
                      title={`${event.name}${event.date ? ` · ${formatCebDate(event.date)}` : ""} · points ${formatScale(event.scale)}`}
                    >
                      <div className="text-[12px] font-bold uppercase leading-tight text-slate-500">{event.key}</div>
                      <div className="text-[9px] font-medium normal-case leading-tight tracking-normal text-slate-400">
                        {event.short}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const flag = getCountryFlagCdnUrl(payload.federations[row.fed] ?? null, 40);
                  const suspendedOn = formatCebDate(row.suspended);
                  const link = playerLinks?.[String(row.rank)];
                  return (
                    <tr
                      key={`${row.rank}-${row.name}`}
                      className={
                        row.suspended
                          ? "bg-slate-200/70 text-slate-600"
                          : "hover:bg-slate-50/80"
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
                      <td className="border-b border-slate-100 px-2 py-1.5 text-[13.5px] font-bold text-slate-900">
                        {row.points}
                      </td>
                      {row.ev.map((value, index) => (
                        <td
                          key={`${row.rank}-${index}`}
                          className={`border-b border-slate-100 px-1 py-1.5 text-center text-[13px] ${
                            value === null ? "text-slate-300" : "text-slate-700"
                          }`}
                        >
                          {value === null ? "–" : value}
                        </td>
                      ))}
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
          Filters and search work instantly in your browser — no reload. The list itself is a mirror of the
          official CEB ranking and is refreshed when the CEB publishes a new edition (or a corrected one).
          Source:{" "}
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
