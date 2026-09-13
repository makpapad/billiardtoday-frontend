"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CountryFlag,
  PresentationHero,
  SectionHeading,
} from "@/components/public/PresentationBlocks";
import { getCountryLabel } from "@/lib/countryFlags";
import type { PublicBtrRankingRow } from "@/lib/publicSiteData";

type Props = {
  rows: PublicBtrRankingRow[];
  countries: string[];
  initialCountry?: string;
};

const ALL_COUNTRIES = "";

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

const getTier = (btr: number) =>
  TIERS.find((tier) => btr >= tier.min) ?? TIERS[TIERS.length - 1];

const formatBtr = (value: number) =>
  value.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const isProvisional = (rd: number | null) => rd !== null && rd > 90;

export function BtrRankingContent({ rows, countries, initialCountry }: Props) {
  const [country, setCountry] = useState<string>(
    initialCountry && countries.includes(initialCountry) ? initialCountry : ALL_COUNTRIES,
  );
  const [search, setSearch] = useState("");

  // Rank is the world position in the full list, so it stays stable while filtering.
  const ranked = useMemo(
    () => rows.map((row, index) => ({ ...row, rank: index + 1 })),
    [rows],
  );

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("en");
    return ranked.filter((row) => {
      if (country && row.country !== country) return false;
      if (!query) return true;
      return (
        row.name.toLocaleLowerCase("en").includes(query) ||
        (row.nameEn || "").toLocaleLowerCase("en").includes(query) ||
        (row.city || "").toLocaleLowerCase("en").includes(query) ||
        (row.clubName || "").toLocaleLowerCase("en").includes(query)
      );
    });
  }, [ranked, country, search]);

  const countryOptions = useMemo(
    () =>
      countries
        .map((code) => ({ code, label: getCountryLabel(code) || code }))
        .sort((a, b) => a.label.localeCompare(b.label, "en")),
    [countries],
  );

  const activeCountries = new Set(ranked.map((row) => row.country).filter(Boolean)).size;
  const countryLabel = country ? getCountryLabel(country) || country : null;

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-4 py-8 sm:px-6">
      <PresentationHero
        eyebrow="BTR Rating"
        title="The BilliardToday Rating — 3-cushion player leaderboard"
        description="The BTR is a live strength rating for three-cushion players, calculated from every recorded match. It rewards sustained performance against the quality of the opponents you actually face, and it fades when a player stops competing so the ranking reflects who is playing now."
        actions={[
          { label: "Browse players", href: "/players" },
          { label: "Rankings", href: "/rankings", variant: "secondary" },
        ]}
        meta={[
          `${ranked.length.toLocaleString("en-US")} ranked players`,
          `${activeCountries} countries represented`,
          "Three-cushion matches only · Updated after every event",
        ]}
      />

      <section>
        <SectionHeading
          eyebrow="Leaderboard"
          title="BTR standings"
          description="Filter by country or search by name, city, or club. The rank column shows the worldwide position, so it stays comparable when you narrow the list."
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
          </div>

          <select
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            aria-label="Filter by country"
            className="w-full rounded-[22px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-900 shadow-[0_14px_45px_rgba(15,23,42,0.05)] outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          >
            <option value={ALL_COUNTRIES}>All countries</option>
            {countryOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">
            {visible.length.toLocaleString("en-US")}{" "}
            {visible.length === 1 ? "player" : "players"}
          </span>
          {countryLabel ? <span>from {countryLabel}</span> : null}
          {country || search.trim() ? (
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

        {visible.length > 0 ? (
          <div className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <th className="w-16 px-4 py-4 text-right">#</th>
                    <th className="px-4 py-4">Player</th>
                    <th className="px-4 py-4">Country</th>
                    <th className="px-4 py-4">Club</th>
                    <th className="px-4 py-4 text-right">BTR</th>
                    <th className="px-4 py-4">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => {
                    const tier = getTier(row.btr);
                    const provisional = isProvisional(row.rd);
                    return (
                      <tr
                        key={row.documentId}
                        className="border-b border-slate-50 transition last:border-0 hover:bg-sky-50/40"
                      >
                        <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-slate-400">
                          {row.rank}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={row.href}
                            className="font-semibold text-slate-900 transition hover:text-sky-700"
                          >
                            {row.name}
                          </Link>
                          {row.city ? (
                            <div className="text-xs text-slate-500">{row.city}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <span className="flex items-center gap-2">
                            <CountryFlag country={row.country} />
                            <span>{row.country ? getCountryLabel(row.country) || row.country : "—"}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{row.clubName || "—"}</td>
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
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
            No players match these filters.
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
              Ratings fade toward the baseline while a player is inactive, so the leaderboard reflects
              who is competing now rather than who was strong years ago. A <strong>*</strong> next to a
              rating means the player has few or outdated matches and the number is still provisional.
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Levels</h3>
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
