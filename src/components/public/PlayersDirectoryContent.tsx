"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CountryFlag, PresentationHero, SectionHeading } from "@/components/public/PresentationBlocks";
import type { PublicPlayerCard } from "@/lib/publicSiteData";

type Props = {
  players: PublicPlayerCard[];
  totalPlayers?: number;
};

const DISPLAY_COUNT = 35; // Show 35 players
const SEARCH_RESULTS_LIMIT = 50;
const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 250;

const pickRandomPlayers = (source: PublicPlayerCard[], count: number) => {
  if (source.length <= count) return source;
  const shuffled = [...source];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
};

export function PlayersDirectoryContent({ players, totalPlayers }: Props) {
  const [search, setSearch] = useState("");
  const [remoteResults, setRemoteResults] = useState<PublicPlayerCard[]>([]);
  const [remoteBusy, setRemoteBusy] = useState(false);
  const [randomPlayers, setRandomPlayers] = useState<PublicPlayerCard[]>(() => players.slice(0, DISPLAY_COUNT));

  useEffect(() => {
    setRandomPlayers(pickRandomPlayers(players, DISPLAY_COUNT));
  }, [players]);

  useEffect(() => {
    const query = search.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      setRemoteResults([]);
      setRemoteBusy(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      const run = async () => {
        try {
          setRemoteBusy(true);
          const res = await fetch(
            `/api/players/search?q=${encodeURIComponent(query)}`,
            { signal: controller.signal, cache: "no-store" },
          );
          const payload = await res.json().catch(() => ({ data: [] }));
          const rows = Array.isArray(payload?.data) ? payload.data : [];
          const mapped: PublicPlayerCard[] = rows
            .map((row: any) => {
              const numericId = row?.id;
              const documentId = String(row?.documentId || row?.document_id || "").trim();
              const fullName = String(row?.fullName || row?.full_name || "").trim();
              const fullNameEnRaw = row?.fullNameEn ?? row?.full_name_en ?? null;
              const fullNameEn = fullNameEnRaw ? String(fullNameEnRaw).trim() : null;
              const countryRaw = row?.country ?? null;
              const cityRaw = row?.city ?? null;
              const clubNameRaw = row?.clubName ?? row?.club_name ?? null;
              const hrefIdentifier =
                typeof numericId === "number" ||
                (typeof numericId === "string" && /^\d+$/.test(numericId))
                  ? String(numericId)
                  : "";

              if (!hrefIdentifier || !documentId || !fullName) return null;
              return {
                id: null,
                documentId,
                fullName,
                fullNameEn,
                country: countryRaw ? String(countryRaw).trim() : null,
                city: cityRaw ? String(cityRaw).trim() : null,
                clubName: clubNameRaw ? String(clubNameRaw).trim() : null,
                photoUrl: null,
                href: `/players/${encodeURIComponent(hrefIdentifier)}-${encodeURIComponent(
                  (fullNameEn || fullName).trim().replace(/\s+/g, "-"),
                )}`,
              };
            })
            .filter((it: PublicPlayerCard | null): it is PublicPlayerCard => Boolean(it));

          setRemoteResults(mapped.slice(0, SEARCH_RESULTS_LIMIT));
        } catch (error) {
          if ((error as any)?.name === "AbortError") return;
          setRemoteResults([]);
        } finally {
          setRemoteBusy(false);
        }
      };
      void run();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  const displayPlayers = useMemo(() => {
    const query = search.trim();
    if (query.length >= MIN_QUERY_LENGTH) {
      return remoteResults;
    }
    return randomPlayers;
  }, [randomPlayers, remoteResults, search]);

  const availablePlayers =
    typeof totalPlayers === "number" && Number.isFinite(totalPlayers) && totalPlayers >= 0
      ? totalPlayers
      : players.length;

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
          `${availablePlayers} ${availablePlayers === 1 ? "player profile" : "player profiles"} available`,
          search.trim().length >= MIN_QUERY_LENGTH
            ? remoteBusy
              ? "Searching..."
              : `Showing ${displayPlayers.length} ${displayPlayers.length === 1 ? "result" : "results"}`
            : `Showing ${DISPLAY_COUNT} players`,
          "Built for public cards, profile pages, and future embed variants",
        ]}
      />

      <section>
        <SectionHeading
          eyebrow="Directory"
          title="Find players by name, country, city, or club"
          description="This listing is intentionally simple and fast. Search runs against the server directory."
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

        {displayPlayers.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {displayPlayers.map((player) => (
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
