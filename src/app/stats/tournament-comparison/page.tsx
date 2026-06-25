"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { Activity, CalendarDays, Gauge, LineChart as LineChartIcon, Target, Trophy } from "lucide-react";
import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const stageColors: Record<string, string> = {
  PPPQ: "#2563eb",
  PPQ: "#f97316",
  PQ: "#8a8a8a",
  Q: "#eab308",
  MAIN: "#2f80c0",
  "FINAL 16": "#4f9f3a",
};

type StageRow = { name: string; values: Record<number, number | null> };
type TournamentSummary = {
  seasons: number;
  events: number;
  stages: number;
  totalMatches: number;
  average: number | null;
  bestAverage: number | null;
  highestRun: number | null;
  bestCell: { stage: string; year: number; value: number } | null;
};
type YearSummary = {
  year: number;
  totalMatches: number;
  average: number | null;
  bestAverage: number | null;
  highestRun: number | null;
};

const metricOptions = [
  { value: "stageAverage", label: "Stage Average" },
  { value: "bestAverage", label: "Best Average" },
  { value: "highestRun", label: "Highest Run" },
  { value: "totalMatches", label: "Total Matches" },
];
const metricValues = new Set(metricOptions.map((item) => item.value));

function readMetricParam(value: string | null) {
  return value && metricValues.has(value) ? value : "stageAverage";
}

function readTournamentParam(value: string | null) {
  return String(value || "").trim();
}

function cellTone(stage: StageRow, year: number) {
  const rowValues = Object.values(stage.values).filter((value): value is number => typeof value === "number");
  const value = stage.values[year];
  if (typeof value !== "number") return "bg-white/20 text-zinc-500";
  if (value === Math.max(...rowValues)) return "bg-emerald-100 text-emerald-800";
  if (value === Math.min(...rowValues)) return "bg-red-100 text-red-800";
  return "bg-white/10";
}

function formatValue(value: number | null | undefined, metric: string) {
  if (typeof value !== "number") return "-";
  if (metric === "totalMatches" || metric === "highestRun") return String(Math.round(value));
  return value.toFixed(3);
}

function chartDomain(metric: string, stages: StageRow[]) {
  if (metric === "totalMatches" || metric === "highestRun") return ["auto", "auto"] as const;
  const values = stages.flatMap((stage) => Object.values(stage.values)).filter((value): value is number => typeof value === "number");
  if (values.length === 0) return [0.7, 2.1] as const;
  const min = Math.max(0, Math.floor((Math.min(...values) - 0.1) * 10) / 10);
  const max = Math.ceil((Math.max(...values) + 0.1) * 10) / 10;
  return [min, max] as const;
}

export default function TournamentComparisonPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [metric, setMetric] = React.useState(() => readMetricParam(searchParams.get("metric")));
  const [tournament, setTournament] = React.useState(() => readTournamentParam(searchParams.get("tournament")));
  const [tournaments, setTournaments] = React.useState<string[]>([]);
  const [years, setYears] = React.useState<number[]>([]);
  const [stages, setStages] = React.useState<StageRow[]>([]);
  const [summary, setSummary] = React.useState<TournamentSummary | null>(null);
  const [yearSummaries, setYearSummaries] = React.useState<YearSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const clientCache = React.useRef(new Map<string, { tournament: string; tournaments: string[]; years: number[]; stages: StageRow[]; summary: TournamentSummary | null; yearSummaries: YearSummary[] }>());
  const metricLabel = metricOptions.find((item) => item.value === metric)?.label || metric;
  const chartData = years.map((year) => ({
    year,
    ...Object.fromEntries(stages.map((stage) => [stage.name, stage.values[year]])),
  }));
  const domain = chartDomain(metric, stages);

  const updateUrl = React.useCallback(
    (nextTournament: string, nextMetric: string) => {
      const params = new URLSearchParams();
      if (nextTournament) params.set("tournament", nextTournament);
      if (nextMetric && nextMetric !== "stageAverage") params.set("metric", nextMetric);
      const query = params.toString();
      router.replace(query ? `/stats/tournament-comparison?${query}` : "/stats/tournament-comparison", { scroll: false });
    },
    [router],
  );

  React.useEffect(() => {
    const nextMetric = readMetricParam(searchParams.get("metric"));
    const nextTournament = readTournamentParam(searchParams.get("tournament"));
    setMetric((current) => (current === nextMetric ? current : nextMetric));
    setTournament((current) => (current === nextTournament ? current : nextTournament));
  }, [searchParams]);

  React.useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      setIsLoading(true);
      setError(null);
      const cacheKey = `${metric}:${tournament || "auto"}`;
      const cached = clientCache.current.get(cacheKey);
      if (cached) {
        setTournament(cached.tournament);
        setTournaments(cached.tournaments);
        setYears(cached.years);
        setStages(cached.stages);
        setSummary(cached.summary);
        setYearSummaries(cached.yearSummaries);
        setIsLoading(false);
        return;
      }
      try {
        const params = new URLSearchParams({ metric });
        if (tournament) params.set("tournament", tournament);
        const res = await fetch(`/api/stats/tournament-comparison?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await res.json().catch(() => ({ data: null }));
        if (!res.ok) throw new Error(payload?.error || "Could not load tournament stats");
        const data = payload?.data || {};
        const nextData = {
          tournament: data.tournament || "",
          tournaments: Array.isArray(data.tournaments) ? data.tournaments : [],
          years: Array.isArray(data.years) ? data.years : [],
          stages: Array.isArray(data.stages) ? data.stages : [],
          summary: data.summary || null,
          yearSummaries: Array.isArray(data.yearSummaries) ? data.yearSummaries : [],
        };
        clientCache.current.set(cacheKey, nextData);
        setTournament(nextData.tournament);
        setTournaments(nextData.tournaments);
        setYears(nextData.years);
        setStages(nextData.stages);
        setSummary(nextData.summary);
        setYearSummaries(nextData.yearSummaries);
      } catch (err) {
        if ((err as any)?.name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Could not load tournament stats");
          setYears([]);
          setStages([]);
          setSummary(null);
          setYearSummaries([]);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    void run();
    return () => controller.abort();
  }, [metric, tournament]);

  return (
    <main className="min-h-screen bg-[#f4f0e6] text-zinc-950">
      <section className="border-b border-zinc-300 bg-black text-white">
        <div className="mx-auto max-w-7xl px-5 py-12">
          <div className="text-sm font-semibold uppercase tracking-[0.28em] text-red-500">Stats</div>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-5xl font-black uppercase leading-none tracking-normal">Tournament Comparison</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300">
                Compare the same tournament across seasons, stages and performance metrics.
              </p>
            </div>
            <Link href="/stats/player-rankings" className="w-fit border border-white/20 px-4 py-3 text-sm font-semibold text-zinc-100 hover:border-white/50">
              Player Lab
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="grid gap-3 border border-zinc-400/70 bg-white/30 p-4 shadow-[0_16px_50px_rgba(39,39,42,0.08)] md:grid-cols-[1.5fr_1fr_1fr_auto]">
          <label>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">Tournament</span>
            <select
              value={tournament}
              onChange={(event) => {
                const nextTournament = event.target.value;
                setTournament(nextTournament);
                updateUrl(nextTournament, metric);
              }}
              className="mt-2 w-full border border-zinc-400 bg-[#f4f0e6] px-3 py-3 text-sm font-semibold outline-none"
            >
              {tournaments.length === 0 ? <option value="">Loading tournaments</option> : null}
              {tournaments.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">Metric</span>
            <select
              value={metric}
              onChange={(event) => {
                const nextMetric = event.target.value;
                setMetric(nextMetric);
                updateUrl(tournament, nextMetric);
              }}
              className="mt-2 w-full border border-zinc-400 bg-[#f4f0e6] px-3 py-3 text-sm font-semibold outline-none"
            >
              {metricOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">Years</span>
            <select className="mt-2 w-full border border-zinc-400 bg-[#f4f0e6] px-3 py-3 text-sm font-semibold outline-none">
              <option>All years</option>
              <option>Last 5 years</option>
            </select>
          </label>
          <div className="flex items-end">
            <button onClick={() => updateUrl(tournament, metric)} className="bg-zinc-950 px-5 py-3 text-sm font-semibold text-white">Apply</button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 pb-14">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "Seasons", value: summary?.seasons ?? "-", icon: CalendarDays },
            { label: "Events", value: summary?.events ?? "-", icon: Trophy },
            { label: "Stage Rows", value: summary?.stages ?? "-", icon: LineChartIcon },
            { label: "Total Matches", value: summary?.totalMatches ?? "-", icon: Activity },
            { label: "Overall AVG", value: formatValue(summary?.average, "stageAverage"), icon: Gauge },
            { label: "Highest Run", value: formatValue(summary?.highestRun, "highestRun"), icon: Target },
          ].map((item) => (
            <div key={item.label} className="border border-zinc-300 bg-[#ebe5d8] p-5">
              <item.icon className="h-5 w-5 text-red-700" />
              <div className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold text-zinc-950">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto border border-zinc-300 bg-white/35">
          <div className="min-w-[920px]">
            <div className="grid border-b border-zinc-300 bg-zinc-950 text-sm font-semibold text-zinc-100" style={{ gridTemplateColumns: `130px repeat(${Math.max(years.length, 1)}, minmax(86px, 1fr))` }}>
              <div className="px-4 py-3">Stage / Year</div>
              {years.map((year) => <div key={year} className="px-4 py-3 text-center">{year}</div>)}
            </div>
            {isLoading ? (
              <div className="px-4 py-10 text-sm text-zinc-600">Loading tournament statistics...</div>
            ) : error ? (
              <div className="px-4 py-10 text-sm text-red-700">{error}</div>
            ) : stages.length === 0 ? (
              <div className="px-4 py-10 text-sm text-zinc-600">No stage statistics found for this tournament.</div>
            ) : stages.map((stage) => (
              <div key={stage.name} className="grid border-b border-zinc-200 last:border-b-0" style={{ gridTemplateColumns: `130px repeat(${Math.max(years.length, 1)}, minmax(86px, 1fr))` }}>
                <div className="bg-[#9fc4e3] px-4 py-3 font-semibold">{stage.name}</div>
                {years.map((year) => (
                  <div key={`${stage.name}-${year}`} className={`px-4 py-3 text-center font-semibold ${cellTone(stage, year)}`}>
                    {formatValue(stage.values[year], metric)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="border border-zinc-300 bg-white/35 p-5">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">{tournament}</div>
              <h2 className="mt-2 text-3xl font-black uppercase tracking-normal">{metricLabel} Over Time</h2>
            </div>
            <div className="text-sm text-zinc-600">
              {summary?.bestCell ? `Best ${metricLabel}: ${summary.bestCell.stage} ${summary.bestCell.year} (${formatValue(summary.bestCell.value, metric)})` : "Best cells are green, lowest cells are red."}
            </div>
          </div>
          <div className="h-[430px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 16, right: 24, bottom: 16, left: 0 }}>
                <CartesianGrid stroke="#d6d3ca" />
                <XAxis dataKey="year" stroke="#52525b" />
                <YAxis domain={domain} stroke="#52525b" />
                <Tooltip contentStyle={{ border: "1px solid #d4d4d8", background: "#fff" }} />
                <Legend />
                {stages.map((stage, index) => (
                  <Line key={stage.name} type="monotone" dataKey={stage.name} stroke={stageColors[stage.name] || ["#2563eb", "#f97316", "#8a8a8a", "#eab308", "#2f80c0", "#4f9f3a"][index % 6]} strokeWidth={3} connectNulls dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overflow-x-auto border border-zinc-300 bg-white/35">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] border-b border-zinc-300 bg-zinc-950 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-200">
              <div>Year</div>
              <div>Matches</div>
              <div>Overall AVG</div>
              <div>Best AVG</div>
              <div>Highest Run</div>
            </div>
            {yearSummaries.length === 0 ? (
              <div className="px-4 py-10 text-sm text-zinc-600">No yearly summary available.</div>
            ) : yearSummaries.map((item) => (
              <div key={item.year} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] border-b border-zinc-200 px-4 py-3 text-sm last:border-b-0">
                <div className="font-semibold">{item.year}</div>
                <div>{item.totalMatches}</div>
                <div>{formatValue(item.average, "stageAverage")}</div>
                <div>{formatValue(item.bestAverage, "bestAverage")}</div>
                <div>{formatValue(item.highestRun, "highestRun")}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
