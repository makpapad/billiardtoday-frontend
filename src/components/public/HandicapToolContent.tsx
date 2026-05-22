"use client";

import { Calculator, Loader2, Search, ShieldCheck, Target, TrendingUp, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CountryFlag } from "@/components/public/PresentationBlocks";

type PredictionMode = "starting-points" | "avg-ratio";

type PlayerOption = {
  id: number;
  documentId: string;
  fullName: string;
  fullNameEn?: string | null;
  country?: string | null;
  city?: string | null;
  clubName?: string | null;
};

type FormWindow = {
  label: "3M" | "6M" | "12M";
  months: number;
  avg: number;
  matches: number;
  wins: number;
  winPercentage: number;
  highestRun: number;
  confidence: "none" | "low" | "medium" | "high";
};

type PredictionPayload = {
  targetPoints: number;
  gameType: string;
  mode: PredictionMode;
  recommendation: {
    available: boolean;
    label: string | null;
    confidence: "none" | "low" | "medium" | "high";
    reason: string;
    handicapPoints?: number;
    weakerPlayerDocumentId?: string | null;
    calibration?: {
      baseHandicap: number;
      adjustment: number;
      finalHandicap: number;
      adjustments: Array<{ label: string; points: number; reason: string }>;
    };
    raceTo?: { playerA: number; playerB: number };
  };
  players: Array<{
    documentId: string | null;
    name: string | null;
    effectiveScore: number;
    overallAvg: number;
    recentAvg: number;
    recentMatches: number;
    recentWindow: string | null;
    rollingForm: {
      source: "participations-history" | "career-yearly";
      selected: FormWindow | null;
      windows: FormWindow[];
    } | null;
    totalMatches: number;
    winPercentage: number;
    highestRun: number;
    bestAverage: number;
    statsScope: "game-type" | "overall-fallback";
    manualAvg: number | null;
  }>;
};

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 250;

const modeLabels: Record<PredictionMode, string> = {
  "starting-points": "Starting points",
  "avg-ratio": "AVG ratio targets",
};

const confidenceLabel: Record<string, string> = {
  none: "No confidence",
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

const formatAvg = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed.toFixed(3) : "-";
};

const formatPct = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(1)}%` : "-";
};

const readOptionalNumber = (value: string) => {
  const clean = value.trim().replace(",", ".");
  if (!clean) return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const formWindowValue = (
  player: PredictionPayload["players"][number] | null,
  label: "3M" | "6M" | "12M",
) => {
  const window = player?.rollingForm?.windows.find((item) => item.label === label);
  if (!window || window.matches <= 0) return "No dated matches";
  return `${formatAvg(window.avg)} / ${window.matches} matches`;
};

const selectedWindowLabel = (player: PredictionPayload["players"][number] | null) => {
  if (!player?.recentWindow) return "Career fallback";
  if (player.recentWindow === "3M") return "Last 3 months";
  if (player.recentWindow === "6M") return "Last 6 months";
  if (player.recentWindow === "12M") return "Last 12 months";
  return "Yearly fallback";
};

const scoreLabel = (score: number) => {
  if (score >= 80) return "High";
  if (score >= 55) return "Medium";
  if (score > 0) return "Low";
  return "Unknown";
};

const dataConfidence = (matches: number) => {
  if (matches < 5) return "Not enough";
  if (matches < 15) return "Low";
  if (matches < 30) return "Medium";
  return "High";
};

function PlayerSearchBox({
  label,
  onSelect,
}: {
  label: string;
  value: PlayerOption | null;
  onSelect: (player: PlayerOption | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const clean = query.trim();
    if (clean.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setBusy(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const run = async () => {
        try {
          setBusy(true);
          const res = await fetch(`/api/players/search?q=${encodeURIComponent(clean)}`, {
            cache: "no-store",
            signal: controller.signal,
          });
          const payload = await res.json().catch(() => ({ data: [] }));
          setResults(Array.isArray(payload?.data) ? payload.data.slice(0, 12) : []);
          setOpen(true);
        } catch (error) {
          if ((error as any)?.name !== "AbortError") setResults([]);
        } finally {
          setBusy(false);
        }
      };
      void run();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const selectPlayer = (player: PlayerOption) => {
    onSelect(player);
    setQuery(player.fullNameEn || player.fullName);
    setOpen(false);
  };

  const clear = () => {
    onSelect(null);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="relative">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">{label}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            onSelect(null);
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          placeholder="Search player..."
          className="h-12 w-full border border-zinc-400 bg-[#f4f0e6] pl-10 pr-10 text-sm font-semibold text-zinc-950 outline-none"
        />
        {busy ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-500" />
        ) : query ? (
          <button type="button" onClick={clear} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500" aria-label="Clear player">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className={open ? "absolute left-0 right-0 top-[76px] z-20 max-h-72 overflow-auto border border-zinc-300 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.18)]" : "hidden"}>
        {results.length > 0 ? (
          results.map((player) => (
            <button key={player.documentId} type="button" onClick={() => selectPlayer(player)} className="flex w-full items-start gap-3 border-b border-zinc-200 px-3 py-3 text-left hover:bg-[#f4f0e6]">
              <div className="grid h-9 w-9 shrink-0 place-items-center bg-zinc-950 text-sm font-semibold text-white">
                {(player.fullNameEn || player.fullName).charAt(0).toUpperCase()}
              </div>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-zinc-950">{player.fullNameEn || player.fullName}</span>
                <span className="mt-1 flex items-center gap-2 truncate text-xs text-zinc-500">
                  <CountryFlag country={player.country ?? null} />
                  {player.country || player.city || player.clubName || "Player profile"}
                </span>
              </span>
            </button>
          ))
        ) : (
          <div className="px-3 py-4 text-sm text-zinc-500">No players found.</div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-zinc-300 bg-white/20 px-3 py-2">
      <div className="text-xs text-zinc-600">{label}</div>
      <strong className="mt-1 block text-sm text-zinc-950">{value}</strong>
    </div>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border border-zinc-300 bg-[#ebe5d8] px-3 py-2 text-xs text-zinc-700">
      <span>{label}</span>
      <strong className="text-right text-zinc-950">{value}</strong>
    </div>
  );
}

function PlayerCard({
  title,
  player,
  selected,
  manualAvg,
  onManualAvg,
}: {
  title: string;
  player: PredictionPayload["players"][number] | null;
  selected: PlayerOption | null;
  manualAvg: string;
  onManualAvg: (value: string) => void;
}) {
  const formDelta =
    player && player.recentAvg > 0 && player.overallAvg > 0
      ? Math.round(((player.recentAvg - player.overallAvg) / player.overallAvg) * 100)
      : null;
  const runDanger = player
    ? Math.min(100, Math.round((Math.min(player.highestRun, 20) / 20) * 60 + (Math.min(player.bestAverage, 2.5) / 2.5) * 40))
    : 0;

  return (
    <article className="border border-zinc-300 bg-white/35 p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-red-700">{title}</div>
      <h3 className="mt-3 min-h-8 text-2xl font-semibold text-zinc-950">
        {player?.name || selected?.fullNameEn || selected?.fullName || "No player selected"}
      </h3>

      <label className="mt-5 block">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">Manual AVG override</span>
        <input
          value={manualAvg}
          onChange={(event) => onManualAvg(event.target.value)}
          inputMode="decimal"
          placeholder="Optional, e.g. 0.850"
          className="mt-2 h-11 w-full border border-zinc-400 bg-[#f4f0e6] px-3 text-sm font-semibold text-zinc-950 outline-none"
        />
      </label>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Overall AVG" value={formatAvg(player?.overallAvg ?? readOptionalNumber(manualAvg))} />
        <Metric label="Selected form" value={`${formatAvg(player?.recentAvg)} (${selectedWindowLabel(player)})`} />
        <Metric label="Matches" value={String(player?.totalMatches ?? "-")} />
        <Metric label="Win rate" value={formatPct(player?.winPercentage)} />
        <Metric label="3 months" value={formWindowValue(player, "3M")} />
        <Metric label="6 months" value={formWindowValue(player, "6M")} />
        <Metric label="12 months" value={formWindowValue(player, "12M")} />
        <Metric label="Data confidence" value={player ? dataConfidence(player.totalMatches) : "-"} />
        <Metric label="High run" value={String(player?.highestRun ?? "-")} />
        <Metric label="Best AVG" value={formatAvg(player?.bestAverage)} />
        <Metric label="Momentum" value={formDelta === null ? "-" : `${formDelta >= 0 ? "+" : ""}${formDelta}%`} />
        <Metric label="Run threat" value={scoreLabel(runDanger)} />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Signal label="Form" value={formDelta === null ? "Unknown" : `${formDelta >= 0 ? "+" : ""}${formDelta}%`} />
        <Signal label="Toughness" value={scoreLabel(Math.min(100, Math.max(0, player?.winPercentage ?? 0)))} />
        <Signal label="Run danger" value={scoreLabel(runDanger)} />
        <Signal label="Data confidence" value={player ? dataConfidence(player.totalMatches) : "Unknown"} />
      </div>
    </article>
  );
}

export function HandicapToolContent() {
  const [playerA, setPlayerA] = useState<PlayerOption | null>(null);
  const [playerB, setPlayerB] = useState<PlayerOption | null>(null);
  const [playerAAvg, setPlayerAAvg] = useState("");
  const [playerBAvg, setPlayerBAvg] = useState("");
  const [targetPoints, setTargetPoints] = useState(40);
  const [mode, setMode] = useState<PredictionMode>("starting-points");
  const [result, setResult] = useState<PredictionPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCalculate = useMemo(
    () => Boolean(playerA && playerB && playerA.documentId !== playerB.documentId),
    [playerA, playerB],
  );

  const calculate = useCallback(async () => {
    if (!playerA || !playerB) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/players/handicap-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerA: playerA.documentId,
          playerB: playerB.documentId,
          targetPoints,
          mode,
          playerAAvg,
          playerBAvg,
          gameType: "Three-Cushion",
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Prediction failed");
      setResult(payload.data ?? null);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Prediction could not be calculated for these players.");
    } finally {
      setBusy(false);
    }
  }, [mode, playerA, playerAAvg, playerB, playerBAvg, targetPoints]);

  useEffect(() => {
    if (!canCalculate) {
      setResult(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void calculate();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [calculate, canCalculate]);

  const resultPlayerA = result?.players.find((player) => player.documentId === playerA?.documentId) ?? null;
  const resultPlayerB = result?.players.find((player) => player.documentId === playerB?.documentId) ?? null;
  const raceA = result?.recommendation.raceTo?.playerA;
  const raceB = result?.recommendation.raceTo?.playerB;

  return (
    <main className="min-h-screen bg-[#f4f0e6] text-zinc-950">
      <section className="border-b border-zinc-300 bg-black text-white">
        <div className="mx-auto max-w-7xl px-5 py-12">
          <div className="text-sm font-semibold uppercase tracking-[0.28em] text-red-500">Stats Lab</div>
          <h1 className="mt-4 text-5xl font-black uppercase leading-none tracking-normal">Head 2 Head Predictions</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300">
            Compare two 3-cushion players and generate a match setup from official history, recent form and average ratios.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8">
        <section className="grid items-end gap-3 border border-zinc-400/70 bg-white/30 p-4 shadow-[0_16px_50px_rgba(39,39,42,0.08)] lg:grid-cols-[1fr_1fr_110px_190px_auto]">
          <PlayerSearchBox label="Player A" value={playerA} onSelect={setPlayerA} />
          <PlayerSearchBox label="Player B" value={playerB} onSelect={setPlayerB} />
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">Race to</span>
            <input
              type="number"
              min={1}
              max={100}
              value={targetPoints}
              onChange={(event) => setTargetPoints(Math.max(1, Number(event.target.value) || 1))}
              className="h-12 w-full border border-zinc-400 bg-[#f4f0e6] px-3 text-sm font-semibold outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">Prediction mode</span>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value === "avg-ratio" ? "avg-ratio" : "starting-points")}
              className="h-12 w-full border border-zinc-400 bg-[#f4f0e6] px-3 text-sm font-semibold outline-none"
            >
              <option value="starting-points">Starting points</option>
              <option value="avg-ratio">AVG ratio targets</option>
            </select>
          </label>
          <div>
            <button
              type="button"
              disabled={!canCalculate || busy}
              onClick={calculate}
              className="inline-flex h-12 w-full items-center justify-center gap-2 bg-zinc-950 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              Predict
            </button>
          </div>
        </section>

        {playerA && playerB && playerA.documentId === playerB.documentId ? (
          <div className="border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">Select two different players.</div>
        ) : null}
        {error ? <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="border border-zinc-300 bg-white/35 p-5">
            {!result ? (
              <div className="grid min-h-[260px] place-items-center border border-dashed border-zinc-300 bg-white/20 p-6 text-center text-sm leading-6 text-zinc-600">
                Select two players to generate a head-to-head prediction.
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-red-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                    {confidenceLabel[result.recommendation.confidence] ?? result.recommendation.confidence}
                  </span>
                  <span className="border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700">Race to {result.targetPoints}</span>
                  <span className="border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700">{modeLabels[result.mode]}</span>
                </div>

                <h2 className="mt-6 text-4xl font-black uppercase tracking-normal">{result.recommendation.label || "No prediction available"}</h2>
                <p className="mt-4 text-sm leading-6 text-zinc-700">{result.recommendation.reason}</p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <Metric label="Player A target" value={raceA ? String(raceA) : mode === "starting-points" ? String(result.targetPoints) : "-"} />
                  <Metric label="Player B target" value={raceB ? String(raceB) : mode === "starting-points" ? String(result.targetPoints) : "-"} />
                  <Metric label="Starting edge" value={result.recommendation.handicapPoints ? `+${result.recommendation.handicapPoints}` : "Even"} />
                </div>

                {result.recommendation.calibration ? (
                  <div className="mt-5 border border-zinc-300 bg-[#ebe5d8] p-4">
                    <div className="grid grid-cols-3 gap-3">
                      <Metric label="Base edge" value={String(result.recommendation.calibration.baseHandicap)} />
                      <Metric label="Adjustment" value={`${result.recommendation.calibration.adjustment >= 0 ? "+" : ""}${result.recommendation.calibration.adjustment}`} />
                      <Metric label="Final edge" value={String(result.recommendation.calibration.finalHandicap)} />
                    </div>
                    <div className="mt-4 grid gap-2">
                      {result.recommendation.calibration.adjustments.map((adjustment) => (
                        <div key={`${adjustment.label}-${adjustment.points}`} className="flex items-start justify-between gap-3 border border-zinc-300 bg-white/30 px-3 py-2 text-xs text-zinc-700">
                          <div>
                            <div className="font-semibold text-zinc-950">{adjustment.label}</div>
                            <div className="mt-1">{adjustment.reason}</div>
                          </div>
                          <strong className="shrink-0 text-sm text-zinc-950">{adjustment.points >= 0 ? "+" : ""}{adjustment.points}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Target, label: "Match Setup", value: result?.recommendation.label || "Waiting for players" },
              { icon: TrendingUp, label: "Form Window", value: `${selectedWindowLabel(resultPlayerA)} / ${selectedWindowLabel(resultPlayerB)}` },
              { icon: ShieldCheck, label: "Data Quality", value: result ? confidenceLabel[result.recommendation.confidence] : "No sample" },
            ].map((item) => (
              <div key={item.label} className="border border-zinc-300 bg-[#ebe5d8] p-5">
                <item.icon className="h-6 w-6 text-red-700" />
                <div className="mt-4 text-sm text-zinc-600">{item.label}</div>
                <div className="mt-2 text-xl font-semibold text-zinc-950">{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <PlayerCard title="Player A profile" selected={playerA} player={resultPlayerA} manualAvg={playerAAvg} onManualAvg={setPlayerAAvg} />
          <PlayerCard title="Player B profile" selected={playerB} player={resultPlayerB} manualAvg={playerBAvg} onManualAvg={setPlayerBAvg} />
        </section>

        <section className="border border-zinc-300 bg-white/35 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-red-700">How the form windows work</div>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-700">
            The 3, 6 and 12 month values are calculated from the player's recorded matches when those matches have usable dates. The predictor uses the smallest recent period with enough data: first the last 3 months with at least 5 matches, otherwise 6 or 12 months, otherwise yearly or career numbers. If all three periods look identical, it usually means all dated matches we found are already inside the last 3 months. If they all show no data, the imported match history probably does not include usable match dates, so the prediction falls back to career statistics.
          </p>
        </section>
      </div>
    </main>
  );
}
