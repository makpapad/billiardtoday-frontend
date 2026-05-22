"use client";

import Link from "next/link";
import React from "react";
import { ArrowUpDown, BarChart3, Filter, Trophy } from "lucide-react";

type PlayerRow = {
  rank: number;
  player: string;
  country: string;
  metricValue: number;
  metricText: string;
  year: number | string;
  gameType: string;
  tournamentType: string;
  matches: number;
  documentId?: string | null;
};

const metrics = [
  { value: "highRun", label: "Highest Run" },
  { value: "average", label: "Overall Average" },
  { value: "bestAverage", label: "Best Average" },
  { value: "wins", label: "Wins" },
  { value: "losses", label: "Losses" },
  { value: "winPercentage", label: "Win Percentage" },
  { value: "participations", label: "Participations" },
];

const filterControls = [
  { label: "Metric", valueKey: "metric", options: metrics },
  { label: "Top", valueKey: "limit", options: ["10", "25", "50", "100"].map((value) => ({ value, label: value })) },
  { label: "Year", valueKey: "year", options: ["All", "2026", "2025", "2024", "2023", "2022"].map((value) => ({ value, label: value })) },
  { label: "Game Type", valueKey: "gameType", options: ["", "Three-Cushion", "Libre", "One-Cushion", "Artistic"].map((value) => ({ value, label: value || "Select game" })) },
] as const;

export default function PlayerRankingsPage() {
  const [metric, setMetric] = React.useState("highRun");
  const [limit, setLimit] = React.useState("10");
  const [year, setYear] = React.useState("All");
  const [gameType, setGameType] = React.useState("");
  const [rows, setRows] = React.useState<PlayerRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const clientCache = React.useRef(new Map<string, PlayerRow[]>());
  const filterState = { metric, limit, year, gameType };
  const filterSetters = { metric: setMetric, limit: setLimit, year: setYear, gameType: setGameType };

  React.useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      setIsLoading(true);
      setError(null);
      if (!gameType) {
        setRows([]);
        setIsLoading(false);
        return;
      }
      const cacheKey = `${metric}:${limit}:${year}:${gameType}`;
      const cached = clientCache.current.get(cacheKey);
      if (cached) {
        setRows(cached);
        setIsLoading(false);
        return;
      }
      try {
        const params = new URLSearchParams({ metric, limit, year, gameType });
        const res = await fetch(`/api/stats/player-rankings?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await res.json().catch(() => ({ data: [] }));
        if (!res.ok) throw new Error(payload?.error || "Could not load player stats");
        const nextRows = Array.isArray(payload?.data) ? payload.data : [];
        clientCache.current.set(cacheKey, nextRows);
        setRows(nextRows);
      } catch (err) {
        if ((err as any)?.name !== "AbortError") {
          setRows([]);
          setError(err instanceof Error ? err.message : "Could not load player stats");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    void run();
    return () => controller.abort();
  }, [gameType, limit, metric, year]);

  return (
    <main className="min-h-screen bg-[#f4f0e6] text-zinc-950">
      <section className="border-b border-zinc-300 bg-black text-white">
        <div className="mx-auto max-w-7xl px-5 py-12">
          <div className="text-sm font-semibold uppercase tracking-[0.28em] text-red-500">Stats</div>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-5xl font-black uppercase leading-none tracking-normal">Player Lab</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300">
                Live player leaderboards from recorded career statistics.
              </p>
            </div>
            <Link href="/stats/tournament-comparison" className="w-fit border border-white/20 px-4 py-3 text-sm font-semibold text-zinc-100 hover:border-white/50">
              Tournament Comparison
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="grid gap-3 border border-zinc-400/70 bg-white/30 p-4 shadow-[0_16px_50px_rgba(39,39,42,0.08)] md:grid-cols-5">
          {filterControls.map((control) => (
            <label key={control.label} className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">{control.label}</span>
              <select
                value={filterState[control.valueKey]}
                onChange={(event) => filterSetters[control.valueKey](event.target.value)}
                className="mt-2 w-full border border-zinc-400 bg-[#f4f0e6] px-3 py-3 text-sm font-semibold text-zinc-950 outline-none"
              >
                {control.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <div className="flex items-end">
            <button className="inline-flex w-full items-center justify-center gap-2 bg-zinc-950 px-4 py-3 text-sm font-semibold text-white">
              <Filter className="h-4 w-4" />
              Apply
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 pb-14 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          {[
            { label: "Selected Metric", value: metrics.find((item) => item.value === metric)?.label || metric, icon: Trophy },
            { label: "Visible Rows", value: String(rows.length), icon: BarChart3 },
            { label: "Sort", value: "Descending", icon: ArrowUpDown },
          ].map((item) => (
            <div key={item.label} className="border border-zinc-300 bg-[#ebe5d8] p-5">
              <item.icon className="h-6 w-6 text-red-700" />
              <div className="mt-4 text-sm text-zinc-600">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold">{item.value}</div>
            </div>
          ))}
        </aside>

        <div className="overflow-hidden border border-zinc-300 bg-white/35">
          <div className="grid grid-cols-[58px_1.4fr_110px_110px_150px_140px] border-b border-zinc-300 bg-zinc-950 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-200 max-lg:hidden">
            <div>#</div>
            <div>Player</div>
            <div>Value</div>
            <div>Year</div>
            <div>Game</div>
            <div>Tournament</div>
          </div>
          <div className="divide-y divide-zinc-300">
            {!gameType ? (
              <div className="px-4 py-10 text-sm text-zinc-600">Select a game type before loading player statistics.</div>
            ) : isLoading ? (
              <div className="px-4 py-10 text-sm text-zinc-600">Loading player statistics...</div>
            ) : error ? (
              <div className="px-4 py-10 text-sm text-red-700">{error}</div>
            ) : rows.length === 0 ? (
              <div className="px-4 py-10 text-sm text-zinc-600">No player statistics found for these filters.</div>
            ) : rows.map((row, index) => (
              <div key={`${row.documentId || row.player}-${row.rank || index}-${row.year}-${row.gameType}`} className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[58px_1.4fr_110px_110px_150px_140px] lg:items-center">
                <div className="text-2xl font-black text-red-700">{index + 1}</div>
                <div>
                  <div className="font-semibold text-zinc-950">{row.player}</div>
                  <div className="text-xs text-zinc-500">{row.country} | {row.matches} matches</div>
                </div>
                <div className="text-2xl font-semibold">{row.metricText}</div>
                <div>{row.year}</div>
                <div>{row.gameType}</div>
                <div>{row.tournamentType || "Career"}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
