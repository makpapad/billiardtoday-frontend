"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LiveScoreBoardCard } from "@/components/live/LiveScoreBoardCard";
import type { LiveSessionItem } from "@/components/live/types";

type ClubSummary = {
  name: string;
  documentId: string;
  slug?: string;
  city?: string | null;
  federation?: {
    name: string;
  } | null;
};

type Props = {
  club: ClubSummary;
  embedded?: boolean;
};

type LiveSessionsResponse = {
  data?: LiveSessionItem[];
  error?: string;
};

const POLL_INTERVAL_MS = 15000;

const buildLiveHref = (documentId: string, embedded?: boolean) =>
  embedded ? `/embed/live/${documentId}` : `/live/${documentId}`;

export function LiveClubView({ club, embedded = false }: Props) {
  const [items, setItems] = useState<LiveSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(
          `/api/clubs/${encodeURIComponent(club.documentId)}/sessions?status=in_progress,pending`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error(`Failed to load live sessions (${response.status})`);
        }

        const payload = (await response.json()) as LiveSessionsResponse;
        if (cancelled) return;

        setItems(Array.isArray(payload.data) ? payload.data : []);
        setError(payload.error || null);
      } catch (requestError) {
        if (cancelled) return;
        setError(requestError instanceof Error ? requestError.message : "Failed to load live sessions");
        setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const timer = window.setInterval(load, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [club.documentId]);

  return (
    <section className={embedded ? "px-4 py-8 sm:px-6 sm:py-10" : "px-4 py-12 sm:px-6 sm:py-16"}>
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Live</div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {club.name}
              </h1>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                {club.city ? <span>City: {club.city}</span> : null}
                {club.federation?.name ? <span>Federation: {club.federation.name}</span> : null}
                <span>Refresh: every 15s</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {!embedded ? (
                <Link
                  href={buildLiveHref(club.documentId, true)}
                  className="inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Open embed
                </Link>
              ) : null}
              <Link
                href={club.slug ? `/clubs/${club.slug}` : "/clubs"}
                className="inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Club page
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-[0_16px_60px_rgba(15,23,42,0.06)]">
              Loading live scoreboards...
            </div>
          ) : error ? (
            <div className="rounded-[28px] border border-red-200 bg-red-50 px-6 py-10 text-center text-sm text-red-700 shadow-[0_16px_60px_rgba(15,23,42,0.06)]">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-[0_16px_60px_rgba(15,23,42,0.06)]">
              No live or pending scoreboard sessions were found for this club.
            </div>
          ) : (
            <div className="grid gap-5">
              {items.map((item) => (
                <LiveScoreBoardCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
