"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import type { PresenceEntry } from "@/lib/wsPresence";
import { normalizeWebSocketUrl, useLiveScore } from "@/hooks/useLiveScore";

type PresenceApiResponse = {
  data?: PresenceEntry[];
  error?: string;
  fetchedAt?: string;
};

const PRESENCE_REFRESH_MS = 10000;
const WS_URL = normalizeWebSocketUrl(
  process.env.NEXT_PUBLIC_WS_URL || "wss://ws.billiardtoday.com/ws",
).toString();
const WS_TOKEN = process.env.NEXT_PUBLIC_WS_TOKEN || "BT_WS_RELAY_TOKEN_2025";

function formatAbsoluteTime(value: number | null | undefined) {
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

function formatRelativeTime(value: number | null | undefined) {
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

function formatLocation(entry: PresenceEntry) {
  return [entry.city, entry.region, entry.countryCode || entry.country]
    .filter(Boolean)
    .join(", ");
}

function ScoreboardLane({
  name,
  score,
  active,
  accentClassName,
}: {
  name: string;
  score: number;
  active: boolean;
  accentClassName: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(90deg,#3156da_0%,#4833c7_100%)] px-4 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
      <div className={["absolute left-0 top-0 h-full w-1.5", accentClassName].join(" ")} />
      <div className="flex items-center justify-between gap-3 pl-2">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/95">
            {name}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-3xl font-extrabold tracking-tight text-white">
            {score}
          </div>
          {active ? (
            <div className="flex h-8 min-w-8 items-center justify-center rounded-[10px] bg-[#ffe066] px-2 text-lg font-extrabold leading-none text-slate-950 shadow-[0_4px_14px_rgba(255,224,102,0.45)]">
              0
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ScoreboardMonitorCard({ entry }: { entry: PresenceEntry }) {
  const { isConnected, lastUpdate, players, error, reconnect } = useLiveScore({
    screenId: entry.screenId,
    wsUrl: WS_URL,
    token: WS_TOKEN,
  });

  const location = formatLocation(entry);
  const playerA = players[0];
  const playerB = players[1];
  const displayInning = [playerA?.innings, playerB?.innings]
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .reduce((highest, value) => Math.max(highest, value), 0);

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Screen ID
          </div>
          <div className="mt-1.5 truncate font-mono text-[13px] font-semibold text-slate-950">
            {entry.screenId}
          </div>
          {entry.venue ? (
            <div className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              {entry.venue}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
          <span
            className={
              isConnected
                ? "h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_14px_rgba(34,197,94,0.5)]"
                : "h-2 w-2 rounded-full bg-rose-500"
            }
          />
          {isConnected ? "Live" : "Idle"}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[20px] bg-[#0f1a2d] p-1 shadow-[0_14px_26px_rgba(15,23,42,0.14)]">
        <div className="flex items-center justify-between gap-3 rounded-t-[16px] bg-[#22314b] px-3 py-1.5 text-white">
          <div className="min-w-0 truncate font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-white/90">
            {entry.screenId}
          </div>
          <div className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80">
            Inning {displayInning || 1}
          </div>
        </div>

        <div className="space-y-1 bg-[#0f1a2d] p-1">
          {playerA ? (
            <ScoreboardLane
              name={playerA.name || "Player A"}
              score={Number(playerA.score ?? 0)}
              active={Boolean(playerA.isActive)}
              accentClassName="bg-[#ff5a57]"
            />
          ) : null}
          {playerB ? (
            <ScoreboardLane
              name={playerB.name || "Player B"}
              score={Number(playerB.score ?? 0)}
              active={Boolean(playerB.isActive)}
              accentClassName="bg-[#64f06a]"
            />
          ) : null}

          {players.length === 0 ? (
            <div className="rounded-[16px] bg-[linear-gradient(90deg,#3156da_0%,#4833c7_100%)] px-3 py-4 text-xs text-white/90">
              {isConnected
                ? "Connected to the screen. Waiting for score updates."
                : "No live score payload received yet for this screen."}
            </div>
          ) : null}

          <div className="flex gap-1 px-1 pb-1 pt-1">
            {Array.from({ length: 32 }).map((_, index) => (
              <span
                key={index}
                className="h-1 flex-1 rounded-full bg-white/18"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Location
          </div>
          <div className="mt-1 text-xs font-medium text-slate-800">
            {location || "-"}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Last Seen
          </div>
          <div className="mt-1 text-xs font-medium text-slate-800">
            {formatRelativeTime(entry.lastSeen)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {formatAbsoluteTime(entry.lastSeen)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
        {entry.version ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1">
            Version {entry.version}
          </span>
        ) : null}
        {entry.ip ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono">
            {entry.ip}
          </span>
        ) : null}
        {entry.org ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1">
            {entry.org}
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      {!isConnected ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={reconnect}
            className="inline-flex rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Reconnect
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function ScoreboardsMonitorPage() {
  const [entries, setEntries] = useState<PresenceEntry[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => {
    let cancelled = false;

    const load = async (isRefresh = false) => {
      if (cancelled) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const response = await fetch("/api/presence", { cache: "no-store" });
        const payload = (await response.json()) as PresenceApiResponse;

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load scoreboards");
        }

        if (cancelled) return;

        setEntries(Array.isArray(payload.data) ? payload.data : []);
        setFetchedAt(payload.fetchedAt || null);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load scoreboards",
        );
      } finally {
        if (cancelled) return;
        setLoading(false);
        setRefreshing(false);
      }
    };

    void load(false);
    const timer = window.setInterval(() => void load(true), PRESENCE_REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const filteredEntries = entries.filter((entry) => {
    if (!deferredQuery) return true;

    return [
      entry.screenId,
      entry.venue,
      entry.city,
      entry.region,
      entry.country,
      entry.countryCode,
      entry.org,
      entry.ip,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(deferredQuery));
  });

  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
            Scoreboards
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Live monitor for all active screens
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Simple live view for every connected scoreboard screen, whether it belongs
            to a tournament flow or runs independently.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Active screens
                  </div>
                  <div className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                    {entries.length}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Visible
                  </div>
                  <div className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                    {filteredEntries.length}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Refresh
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-800">
                    {refreshing ? "Refreshing..." : "Every 10s"}
                  </div>
                </div>
              </div>

              <div className="w-full max-w-md">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search screen id, venue, city or IP..."
                  className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-400 focus:bg-white"
                />
              </div>
            </div>
          </div>

          <aside className="rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,#082f49_0%,#0f172a_100%)] p-5 text-white shadow-[0_18px_60px_rgba(15,23,42,0.18)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
              Operator note
            </div>
            <div className="mt-3 text-lg font-semibold tracking-tight">
              This view follows the active WebSocket presence feed.
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-200">
              It does not depend on tournament pages, so standalone scoreboards
              also appear here as long as the screen stays connected.
            </p>
            <div className="mt-5 text-xs text-slate-300">
              Last presence fetch:{" "}
              {fetchedAt ? formatAbsoluteTime(Date.parse(fetchedAt)) : "-"}
            </div>
            <div className="mt-5">
              <Link
                href="/presence"
                className="inline-flex rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Open raw presence list
              </Link>
            </div>
          </aside>
        </div>

        {loading ? (
          <div className="mt-8 rounded-[30px] border border-slate-200 bg-white px-6 py-12 text-sm text-slate-500 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            Loading active scoreboards...
          </div>
        ) : error ? (
          <div className="mt-8 rounded-[30px] border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">
            {error}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="mt-8 rounded-[30px] border border-slate-200 bg-white px-6 py-12 text-sm text-slate-500 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            {entries.length === 0
              ? "No active scoreboards are connected right now."
              : "No screens match the current search."}
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {filteredEntries.map((entry) => (
              <ScoreboardMonitorCard key={entry.screenId} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
