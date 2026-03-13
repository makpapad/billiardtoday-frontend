"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CountryFlag, PresentationHero, SectionHeading } from "@/components/public/PresentationBlocks";
import type { PublicPlayerCard } from "@/lib/publicSiteData";

type Props = {
  players: PublicPlayerCard[];
};

const normalize = (value: string | null | undefined) => String(value || "").trim().toLowerCase();

export function PlayersDirectoryContent({ players }: Props) {
  const [search, setSearch] = useState("");

  const filteredPlayers = useMemo(() => {
    const query = normalize(search);
    if (!query) return players;

    return players.filter((player) => {
      const haystack = [
        player.fullName,
        player.fullNameEn,
        player.country,
        player.city,
        player.clubName,
      ]
        .map(normalize)
        .join(" ");

      return haystack.includes(query);
    });
  }, [players, search]);

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-4 py-8 sm:px-6">
      <PresentationHero
        eyebrow="Players"
        title="A real public player directory, not an admin lookup screen"
        description="Player pages now sit inside the shared public presentation system. This directory is built for discovery first, with fast local filtering and direct links into full player profiles."
        actions={[
          { label: "Explore tournaments", href: "/tournaments" },
          { label: "Browse clubs", href: "/clubs", variant: "secondary" },
        ]}
        meta={[
          `${players.length} player profiles available`,
          "Built for public cards, profile pages, and future embed variants",
        ]}
      />

      <section>
        <SectionHeading
          eyebrow="Directory"
          title="Find players by name, country, city, or club"
          description="This listing is intentionally simple and fast. Search runs locally on the fetched player dataset."
        />
        <div className="mb-6">
          <div className="relative max-w-3xl">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search players..."
              className="w-full rounded-[22px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-900 shadow-[0_14px_45px_rgba(15,23,42,0.05)] outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
            />
          </div>
        </div>

        {filteredPlayers.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredPlayers.map((player) => (
              <Link
                key={player.documentId}
                href={player.href}
                className="group grid gap-4 rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-sky-200"
              >
                <div className="flex items-start gap-4">
                  {player.photoUrl ? (
                    <img
                      src={player.photoUrl}
                      alt={player.fullNameEn || player.fullName}
                      className="h-16 w-16 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f2f52_0%,#1d4ed8_100%)] text-lg font-semibold text-white">
                      {(player.fullNameEn || player.fullName).charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="break-words text-lg font-semibold tracking-tight text-slate-950 group-hover:text-sky-700">
                      {player.fullNameEn || player.fullName || "Unnamed player"}
                    </div>
                    {player.fullNameEn && player.fullNameEn !== player.fullName ? (
                      <div className="mt-1 break-words text-sm text-slate-500">{player.fullName}</div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <CountryFlag country={player.country} />
                      <span>{player.country || player.city || "Player profile"}</span>
                    </div>
                    {player.clubName ? <div className="mt-1 text-sm text-slate-600">{player.clubName}</div> : null}
                  </div>
                </div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Open player profile
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
            No players match this search.
          </div>
        )}
      </section>
    </div>
  );
}
