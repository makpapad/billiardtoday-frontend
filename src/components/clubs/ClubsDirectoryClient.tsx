"use client";

import Link from "next/link";
import { useState } from "react";
import type { Club } from "@/lib/directory";

type Props = {
  clubs: Club[];
  embedded?: boolean;
};

function normalize(value: string | null | undefined) {
  return String(value || "").trim().toLocaleLowerCase("en");
}

export function ClubsDirectoryClient({ clubs, embedded = false }: Props) {
  const [query, setQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");

  const availableCountries = Array.from(
    new Set(clubs.map((club) => String(club.country || "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "en"));

  const filteredClubs = clubs.filter((club) => {
    if (selectedCountry !== "all" && club.country !== selectedCountry) return false;

    if (!query.trim()) return true;

    const haystack = [
      club.name,
      club.city,
      club.country,
      club.federation?.name,
      club.federation?.country,
    ]
      .map((value) => normalize(value))
      .filter(Boolean)
      .join(" ");

    return haystack.includes(normalize(query));
  });

  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Clubs
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            {embedded
              ? "Embedded directory of clubs with access to their related tournaments."
              : "Browse registered billiard clubs and filter them by country."}
          </p>
        </div>

        <div className="mt-8 grid gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_60px_rgba(15,23,42,0.06)] md:grid-cols-[minmax(0,1fr)_240px]">
          <label className="block">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Search
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Club, city, federation, country"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
            />
          </label>
          <label className="block">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Country
            </div>
            <select
              value={selectedCountry}
              onChange={(event) => setSelectedCountry(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
            >
              <option value="all">All countries</option>
              {availableCountries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 text-sm text-slate-500">
          Showing {filteredClubs.length} of {clubs.length} clubs
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredClubs.map((club) => (
            <article
              key={club.documentId}
              className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_60px_rgba(15,23,42,0.06)]"
            >
              <div className="text-xl font-semibold tracking-tight text-slate-950">{club.name}</div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {club.federation?.name ? <div>Federation: {club.federation.name}</div> : null}
                {club.country ? <div>Country: {club.country}</div> : null}
                {club.city ? <div>City: {club.city}</div> : null}
                {club.contactEmail ? <div>Email: {club.contactEmail}</div> : null}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`${embedded ? "/embed" : ""}/clubs/${club.slug}`}
                  className="inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  View club
                </Link>
                {!embedded ? (
                  <Link
                    href={`/live/${club.documentId}`}
                    className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Live
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
