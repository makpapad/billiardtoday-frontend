"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CountryFlag,
  PresentationHero,
  SectionHeading,
} from "@/components/public/PresentationBlocks";
import { getCountryLabel } from "@/lib/countryFlags";
import type { PublicBtrRankingRow } from "@/lib/publicSiteData";

type Props = {
  initialRows: PublicBtrRankingRow[];
  initialTotal: number;
  initialPageCount: number;
  pageSize: number;
  countries: string[];
  initialCountry?: string;
};

const ALL_COUNTRIES = "";
const SEARCH_DEBOUNCE_MS = 300;

const TIERS = [
  { min: 1680, label: "Master", className: "border-amber-200 bg-amber-50 text-amber-800" },
  { min: 1581, label: "Expert", className: "border-violet-200 bg-violet-50 text-violet-800" },
  { min: 1530, label: "Advanced", className: "border-sky-200 bg-sky-50 text-sky-800" },
  { min: 1440, label: "Intermediate", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  {
    min: Number.NEGATIVE_INFINITY,
    label: "Club",
    className: "border-slate-200 bg-slate-50 text-slate-600",
  },
] as const;

const getTier = (btr: number) => TIERS.find((tier) => btr >= tier.min) ?? TIERS[TIERS.length - 1];

const formatBtr = (value: number) =>
  value.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const isProvisional = (rd: number | null) => rd !== null && rd > 90;

/** Compact page list: 1 … 4 5 [6] 7 8 … 42 */
const buildPageList = (page: number, pageCount: number): (number | "gap")[] => {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);

  const pages = new Set<number>([1, pageCount, page]);
  for (let offset = 1; offset <= 2; offset += 1) {
    if (page - offset > 1) pages.add(page - offset);
    if (page + offset < pageCount) pages.add(page + offset);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) result.push("gap");
    result.push(value);
  });
  return result;
};

export function BtrRankingContent({
  initialRows,
  initialTotal,
  initialPageCount,
  pageSize,
  countries,
  initialCountry,
}: Props) {
  const [country, setCountry] = useState<string>(
    initialCountry && countries.includes(initialCountry) ? initialCountry : ALL_COUNTRIES,
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<PublicBtrRankingRow[]>(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [pageCount, setPageCount] = useState(initialPageCount);
  const [busy, setBusy] = useState(false);

  const isFirstRender = useRef(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  // Any filter change starts from page 1, otherwise the offset would point past the end.
  useEffect(() => {
    setPage(1);
  }, [country, debouncedSearch]);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (country) params.set("country", country);
    if (debouncedSearch) params.set("q", debouncedSearch);

    const res = await fetch(`/api/rankings/btr?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("failed");
    const payload = await res.json();
    setRows(Array.isArray(payload?.rows) ? payload.rows : []);
    setTotal(Number(payload?.total) || 0);
    setPageCount(Number(payload?.pageCount) || 0);
  }, [country, debouncedSearch, page, pageSize]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      // The server already rendered page 1 with no filters — skip the duplicate request.
      if (page === 1 && !country && !debouncedSearch) return;
    }

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        setBusy(true);
        await load();
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [load, country, debouncedSearch, page]);

  const effectiveTotal = country || debouncedSearch ? total : initialTotal;
  const showProvisional = effectiveTotal === initialTotal && initialTotal > 0;

  // Rank is the position inside the current selection, so filtering by a country shows that
  // country's own standings (1, 2, 3 …) rather than the worldwide position.
  const offset = (page - 1) * pageSize;
  const countryLabel = country ? getCountryLabel(country) || country : null;
  const scopeLabel = countryLabel
    ? `${countryLabel} standings`
    : debouncedSearch
      ? "Matching players"
      : "World standings";

  const countryOptions = useMemo(
    () =>
      countries
        .map((code) => ({ code, label: getCountryLabel(code) || code }))
        .sort((a, b) => a.label.localeCompare(b.label, "en")),
    [countries],
  );

  const pageList = useMemo(() => buildPageList(page, pageCount), [page, pageCount]);

  const goToPage = (next: number) => {
    setPage(Math.min(Math.max(next, 1), Math.max(pageCount, 1)));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 220, behavior: "smooth" });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-4 py-8 sm:px-6">
      <PresentationHero
        eyebrow="BTR Rating"
        title="The BilliardToday Rating — 3-cushion player leaderboard"
        description="The BTR is a live strength rating for three-cushion players, calculated from every recorded match. Only players who have actually competed are ranked, and the rating fades while a player is inactive so the standings reflect who is playing now."
        actions={[
          { label: "Browse players", href: "/players" },
          { label: "Rankings", href: "/rankings", variant: "secondary" },
        ]}
        meta={[
          `${(showProvisional ? initialTotal : effectiveTotal).toLocaleString("en-US")} ranked players`,
          `${countries.length} countries represented`,
          "Three-cushion matches only · Updated after every event",
        ]}
      />

      <section>
        <SectionHeading
          eyebrow="Leaderboard"
          title={scopeLabel}
          description="Filter by country or search by name, city, or club. Selecting a country switches the ranking to that country's own standings, numbered from 1."
        />

        <div className="mb-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by player, city, or club..."
              className="w-full rounded-[22px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-900 shadow-[0_14px_45px_rgba(15,23,42,0.05)] outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
            />
            {busy ? (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                loading…
              </span>
            ) : null}
          </div>

          <select
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            aria-label="Filter by country"
            className="w-full rounded-[22px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-900 shadow-[0_14px_45px_rgba(15,23,42,0.05)] outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          >
            <option value={ALL_COUNTRIES}>All countries — world standings</option>
            {countryOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">
            {effectiveTotal.toLocaleString("en-US")} {effectiveTotal === 1 ? "player" : "players"}
          </span>
          <span>· {scopeLabel}</span>
          {country || debouncedSearch ? (
            <button
              type="button"
              onClick={() => {
                setCountry(ALL_COUNTRIES);
                setSearch("");
              }}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 transition hover:border-sky-200 hover:text-sky-700"
            >
              Reset filters
            </button>
          ) : null}
        </div>

        {rows.length > 0 ? (
          <div className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <th className="w-16 px-4 py-4 text-right">#</th>
                    <th className="px-4 py-4">Player</th>
                    <th className="px-4 py-4">Country</th>
                    <th className="px-4 py-4">Club</th>
                    <th className="px-4 py-4 text-right">Matches</th>
                    <th className="px-4 py-4 text-right">BTR</th>
                    <th className="px-4 py-4">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const tier = getTier(row.btr);
                    const provisional = isProvisional(row.rd);
                    return (
                      <tr
                        key={row.documentId}
                        className="border-b border-slate-50 transition last:border-0 hover:bg-sky-50/40"
                      >
                        <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-slate-400">
                          {offset + index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={row.href}
                            className="font-semibold text-slate-900 transition hover:text-sky-700"
                          >
                            {row.name}
                          </Link>
                          {row.city ? <div className="text-xs text-slate-500">{row.city}</div> : null}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <span className="flex items-center gap-2">
                            <CountryFlag country={row.country} />
                            <span>
                              {row.country ? getCountryLabel(row.country) || row.country : "—"}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{row.clubName || "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                          {row.matches ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-base font-semibold tabular-nums text-slate-900">
                          {formatBtr(row.btr)}
                          {provisional ? (
                            <span
                              title="Few or outdated matches — this rating is still provisional"
                              className="ml-1 align-super text-xs text-slate-400"
                            >
                              *
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${tier.className}`}
                          >
                            {tier.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pageCount > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-4">
                <span className="text-xs text-slate-500">
                  Page {page} of {pageCount} · showing {offset + 1}–
                  {offset + rows.length} of {effectiveTotal.toLocaleString("en-US")}
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1 || busy}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-sky-200 hover:text-sky-700 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  {pageList.map((item, itemIndex) =>
                    item === "gap" ? (
                      <span key={`gap-${itemIndex}`} className="px-2 text-xs text-slate-400">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => goToPage(item)}
                        disabled={busy}
                        aria-current={item === page ? "page" : undefined}
                        className={`min-w-[34px] rounded-full border px-2.5 py-1.5 text-xs font-semibold transition ${
                          item === page
                            ? "border-sky-300 bg-sky-50 text-sky-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700"
                        } disabled:opacity-40`}
                      >
                        {item}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= pageCount || busy}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-sky-200 hover:text-sky-700 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
            {busy ? "Loading…" : "No players match these filters."}
          </div>
        )}

        <div className="mt-8 grid gap-5 rounded-[28px] border border-black/5 bg-white p-6 text-sm leading-7 text-slate-600 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-8">
          <div>
            <h3 className="text-base font-semibold text-slate-900">How the BTR works</h3>
            <p className="mt-2 max-w-3xl">
              Every three-cushion match updates both players. Beating a strong opponent moves you
              further than beating a weaker one, and your average per inning counts too — winning
              with a high average is worth more than grinding out a win.
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Inactivity and provisional marks</h3>
            <p className="mt-2 max-w-3xl">
              Ratings fade toward the baseline while a player is inactive, so the leaderboard
              reflects who is competing now rather than who was strong years ago. A <strong>*</strong>{" "}
              next to a rating means the player has few or outdated matches and the number is still
              provisional.
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Levels <span className="font-normal text-slate-500">(based on worldwide standings)</span>
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {TIERS.map((tier) => (
                <span
                  key={tier.label}
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tier.className}`}
                >
                  {tier.label}
                  {Number.isFinite(tier.min) ? ` · ${tier.min}+` : " · below 1440"}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
