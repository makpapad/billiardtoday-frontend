"use client";

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

function getEntryDisplayName(entry: PresenceEntry) {
  return entry.screenName || entry.venue || entry.screenId;
}

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

function ScoreboardLane({
  name,
  score,
  run,
  active,
  accentClassName,
}: {
  name: string;
  score: number;
  run?: number;
  active: boolean;
  accentClassName: string;
}) {
  return (
    <div
      className={
        active
          ? "relative overflow-hidden rounded-[16px] bg-[linear-gradient(90deg,#3156da_0%,#4833c7_100%)] px-3 py-1.5 pr-9 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_0_1px_rgba(255,255,255,0.14)]"
          : "relative overflow-hidden rounded-[16px] bg-[linear-gradient(90deg,#3156da_0%,#4833c7_100%)] px-3 py-1.5 pr-9 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
      }
    >
      <div className={["absolute left-0 top-0 h-full w-1.5", accentClassName].join(" ")} />
      <div className="grid grid-cols-[minmax(0,1fr)_34px] items-center gap-2 pl-2">
        <div className="min-w-0">
          <div className="truncate text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/95">
            {name}
          </div>
        </div>
        <div className="text-right text-[1.1rem] font-extrabold leading-none tracking-tight text-white sm:text-[1.35rem]">
          {score}
        </div>
      </div>
      {active ? (
        <div className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[8px] bg-[#ffe066] text-[11px] font-extrabold leading-none text-slate-950 shadow-[0_4px_14px_rgba(255,224,102,0.32)]">
          {typeof run === "number" && Number.isFinite(run) ? run : 0}
        </div>
      ) : null}
    </div>
  );
}

function ScoreboardMonitorCard({ entry }: { entry: PresenceEntry }) {
  const { isConnected, lastUpdate, players, error, reconnect } = useLiveScore({
    screenId: entry.screenId,
    wsUrl: WS_URL,
    token: WS_TOKEN,
  });

  const playerA = players[0];
  const playerB = players[1];
  const displayInning = [playerA?.innings, playerB?.innings]
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .reduce((highest, value) => Math.max(highest, value), 0);
  const displayName = getEntryDisplayName(entry);

  return (
    <article className="rounded-[20px] bg-white p-2 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <div className="overflow-hidden rounded-[18px] bg-[#0f1a2d] p-1 shadow-[0_14px_26px_rgba(15,23,42,0.14)]">
        <div className="flex items-center justify-between gap-2 rounded-t-[14px] bg-[#22314b] px-3 py-1.5 text-white">
          <div className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90">
            {displayName}
          </div>
          <div className="flex min-w-[42px] items-center justify-center rounded-[10px] bg-white/10 px-2 py-1 text-[12px] font-extrabold leading-none text-white/90">
            {displayInning || 1}
          </div>
        </div>

        <div className="space-y-1 bg-[#0f1a2d] p-1">
          {playerA ? (
            <ScoreboardLane
              name={playerA.name || "Player A"}
              score={Number(playerA.score ?? 0)}
              run={typeof playerA.run === "number" ? playerA.run : undefined}
              active={Boolean(playerA.isActive)}
              accentClassName="bg-[#ff5a57]"
            />
          ) : null}
          {playerB ? (
            <ScoreboardLane
              name={playerB.name || "Player B"}
              score={Number(playerB.score ?? 0)}
              run={typeof playerB.run === "number" ? playerB.run : undefined}
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

      {error ? (
        <div className="mt-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      {!isConnected ? (
        <div className="mt-2">
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

  const filteredEntries = entries
    .filter((entry) => {
      if (!deferredQuery) return true;

      return [
        entry.screenId,
        entry.screenName,
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
    })
    .sort((a, b) =>
      getEntryDisplayName(a).localeCompare(getEntryDisplayName(b), undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );

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
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Act
                    </div>
                    <div className="text-3xl font-semibold leading-none tracking-tight text-slate-950">
                      {entries.length}
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Visible
                    </div>
                    <div className="text-3xl font-semibold leading-none tracking-tight text-slate-950">
                      {filteredEntries.length}
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Refresh
                    </div>
                    <div className="text-sm font-medium leading-none text-slate-800">
                      {refreshing ? "Refreshing..." : "Every 10s"}
                    </div>
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
