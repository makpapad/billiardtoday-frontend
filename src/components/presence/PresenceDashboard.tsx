"use client";

import { useEffect, useMemo, useState } from "react";
import type { PresenceEntry } from "@/lib/wsPresence";

type PresenceApiResponse = {
  data?: PresenceEntry[];
  error?: string;
  source?: string;
  fetchedAt?: string;
};

const REFRESH_INTERVAL_MS = 10000;

function formatDateTime(value: number | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(value);
}

function formatRelative(value: number | null): string {
  if (!value) return "-";

  const diffSeconds = Math.max(0, Math.round((Date.now() - value) / 1000));
  if (diffSeconds < 5) return "just now";
  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatLocation(entry: PresenceEntry): string {
  return [entry.city, entry.region, entry.countryCode || entry.country]
    .filter(Boolean)
    .join(", ") || "-";
}

export function PresenceDashboard() {
  const [entries, setEntries] = useState<PresenceEntry[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async (isRefresh = false) => {
      if (cancelled) return;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await fetch("/api/presence", { cache: "no-store" });
        const payload = (await response.json()) as PresenceApiResponse;

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load presence");
        }

        if (cancelled) return;

        setEntries(Array.isArray(payload.data) ? payload.data : []);
        setSource(payload.source || null);
        setFetchedAt(payload.fetchedAt || null);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load presence");
      } finally {
        if (cancelled) return;
        setLoading(false);
        setRefreshing(false);
      }
    };

    void load(false);
    const timer = window.setInterval(() => void load(true), REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const stats = useMemo(() => {
    const withLocation = entries.filter(
      (entry) => Boolean(entry.city || entry.region || entry.country || entry.countryCode),
    ).length;
    const withVenue = entries.filter((entry) => Boolean(entry.venue)).length;

    return {
      total: entries.length,
      withLocation,
      withVenue,
    };
  }, [entries]);

  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
            Presence
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Active screen IDs
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Live list of screens currently connected to the WebSocket presence service.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_60px_rgba(15,23,42,0.06)]">
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Active screens
            </div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              {stats.total}
            </div>
          </article>
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_60px_rgba(15,23,42,0.06)]">
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              With venue
            </div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              {stats.withVenue}
            </div>
          </article>
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_60px_rgba(15,23,42,0.06)]">
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              With location
            </div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              {stats.withLocation}
            </div>
          </article>
        </div>

        <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_60px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              {source ? <>Source: <span className="font-mono text-xs">{source}</span></> : "Source unavailable"}
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span>{refreshing ? "Refreshing..." : "Auto refresh: 10s"}</span>
              <span>Last fetch: {fetchedAt ? formatDateTime(Date.parse(fetchedAt)) : "-"}</span>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-sm text-slate-500">Loading presence...</div>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-sm text-slate-500">No active screens are connected right now.</div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-4 py-3 font-semibold">Screen ID</th>
                    <th className="px-4 py-3 font-semibold">Venue</th>
                    <th className="px-4 py-3 font-semibold">Location</th>
                    <th className="px-4 py-3 font-semibold">IP</th>
                    <th className="px-4 py-3 font-semibold">Version</th>
                    <th className="px-4 py-3 font-semibold">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.screenId} className="border-b border-slate-100 text-slate-700">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-semibold text-slate-950">
                          {entry.screenId}
                        </div>
                      </td>
                      <td className="px-4 py-3">{entry.venue || "-"}</td>
                      <td className="px-4 py-3">{formatLocation(entry)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{entry.ip || "-"}</td>
                      <td className="px-4 py-3">{entry.version || "-"}</td>
                      <td className="px-4 py-3">
                        <div>{formatRelative(entry.lastSeen)}</div>
                        <div className="text-xs text-slate-400">
                          {formatDateTime(entry.lastSeen)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
