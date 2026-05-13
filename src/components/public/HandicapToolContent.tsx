"use client";

import { Calculator, Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CountryFlag } from "@/components/public/PresentationBlocks";

type PlayerOption = {
  id: number;
  documentId: string;
  fullName: string;
  fullNameEn?: string | null;
  country?: string | null;
  city?: string | null;
  clubName?: string | null;
};

type RecommendationPayload = {
  targetPoints: number;
  gameType: string;
  mode: "starting-points" | "race-to";
  recommendation: {
    available: boolean;
    label: string | null;
    confidence: "none" | "low" | "medium" | "high";
    reason: string;
    reasonEl: string;
    handicapPoints?: number;
    weakerPlayerDocumentId?: string | null;
    calibration?: {
      source: "baseline-calibration-v1" | "match-history";
      baseHandicap: number;
      adjustment: number;
      finalHandicap: number;
      adjustments: Array<{
        label: string;
        points: number;
        reason: string;
      }>;
    };
    raceTo?: {
      playerA: number;
      playerB: number;
    };
  };
  players: Array<{
    documentId: string | null;
    name: string | null;
    effectiveScore: number;
    overallAvg: number;
    recentAvg: number;
    totalMatches: number;
    highestRun: number;
    bestAverage: number;
    internalHandy: number;
    calibrationBand: string;
    statsScope: "game-type" | "overall-fallback";
  }>;
};

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 250;

const confidenceLabel: Record<string, string> = {
  none: "No confidence",
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

const formatAvg = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(3) : "-";
};

function PlayerSearchBox({
  label,
  value,
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
          if ((error as any)?.name !== "AbortError") {
            setResults([]);
          }
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
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
          className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />
        {busy ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
        ) : query ? (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Clear player"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div
        className={
          open
            ? "absolute left-0 right-0 top-[76px] z-20 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.14)]"
            : "hidden"
        }
      >
        {results.length > 0 ? (
          results.map((player) => (
            <button
              key={player.documentId}
              type="button"
              onClick={() => selectPlayer(player)}
              className="flex w-full items-start gap-3 border-b border-slate-100 px-3 py-3 text-left transition hover:bg-emerald-50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
                {(player.fullNameEn || player.fullName).charAt(0).toUpperCase()}
              </div>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-950">
                  {player.fullNameEn || player.fullName}
                </span>
                <span className="mt-1 flex items-center gap-2 truncate text-xs text-slate-500">
                  <CountryFlag country={player.country ?? null} />
                  {player.country || player.city || player.clubName || "Player profile"}
                </span>
              </span>
            </button>
          ))
        ) : (
          <div className="px-3 py-4 text-sm text-slate-500">No players found.</div>
        )}
      </div>

      <div
        className={
          value
            ? "mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950"
            : "mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
        }
      >
        {value ? (
          <span className="flex items-center gap-2">
            <CountryFlag country={value.country ?? null} />
            {value.fullNameEn || value.fullName}
          </span>
        ) : (
          "No player selected."
        )}
      </div>
    </div>
  );
}

export function HandicapToolContent() {
  const [playerA, setPlayerA] = useState<PlayerOption | null>(null);
  const [playerB, setPlayerB] = useState<PlayerOption | null>(null);
  const [targetPoints, setTargetPoints] = useState(40);
  const [mode, setMode] = useState<"starting-points" | "race-to">("starting-points");
  const [result, setResult] = useState<RecommendationPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCalculate = useMemo(
    () => Boolean(playerA && playerB && playerA.documentId !== playerB.documentId),
    [playerA, playerB],
  );
  const hasResult = Boolean(result);

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
          gameType: "Three-Cushion",
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to calculate handicap");
      }
      setResult(payload.data ?? null);
    } catch (err) {
      setResult(null);
      setError("Δεν ήταν δυνατός ο υπολογισμός handicap για αυτούς τους παίκτες.");
    } finally {
      setBusy(false);
    }
  }, [mode, playerA, playerB, targetPoints]);

  useEffect(() => {
    if (!hasResult || !canCalculate) return;

    const timer = window.setTimeout(() => {
      void calculate();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [calculate, canCalculate, hasResult, mode, targetPoints]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-4 py-8 sm:px-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Personal tool
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                3-Cushion Handicap
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Επίλεξε δύο παίκτες από τη λίστα και πάρε προτεινόμενο handicap με reason text από τα καταγεγραμμένα στατιστικά τους.
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-3 sm:w-auto lg:grid-cols-[112px_220px_120px]">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Target
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={targetPoints}
                  onChange={(event) => {
                    const nextTarget = Math.max(1, Number(event.target.value) || 1);
                    setTargetPoints(nextTarget);
                  }}
                  className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 sm:w-28"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Mode
                </label>
                <select
                  value={mode}
                  onChange={(event) =>
                    setMode(event.target.value === "race-to" ? "race-to" : "starting-points")
                  }
                  className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="starting-points">European starting points</option>
                  <option value="race-to">Korean race-to</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Game
                </label>
                <div className="flex h-12 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                  3-Cushion
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-6">
            <div className="grid gap-5 md:grid-cols-2">
              <PlayerSearchBox label="Player A" value={playerA} onSelect={setPlayerA} />
              <PlayerSearchBox label="Player B" value={playerB} onSelect={setPlayerB} />
            </div>

            {playerA && playerB && playerA.documentId === playerB.documentId ? (
              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Επίλεξε δύο διαφορετικούς παίκτες.
              </div>
            ) : null}

            {error ? (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={!canCalculate || busy}
                onClick={calculate}
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                Υπολογισμός handicap
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-6">
            {!result ? (
              <div className="flex min-h-[330px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm leading-6 text-slate-500">
                Το αποτέλεσμα θα εμφανιστεί εδώ μόλις επιλέξεις δύο παίκτες.
              </div>
            ) : (
              <div>
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    {confidenceLabel[result.recommendation.confidence] ?? result.recommendation.confidence}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    Target {result.targetPoints}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {result.mode === "race-to" ? "Korean race-to" : "European starting points"}
                  </span>
                </div>

                <div className="text-4xl font-semibold tracking-tight text-slate-950">
                  {result.recommendation.label || "No recommendation"}
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-800">
                  {result.recommendation.reason}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {result.recommendation.reasonEl}
                </p>

                {result.recommendation.calibration ? (
                  <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="grid grid-cols-3 gap-3 text-xs text-slate-500">
                      <div>
                        <div>Base</div>
                        <strong className="text-base text-slate-950">
                          {result.recommendation.calibration.baseHandicap}
                        </strong>
                      </div>
                      <div>
                        <div>Calibration</div>
                        <strong className="text-base text-slate-950">
                          {result.recommendation.calibration.adjustment >= 0 ? "+" : ""}
                          {result.recommendation.calibration.adjustment}
                        </strong>
                      </div>
                      <div>
                        <div>Final</div>
                        <strong className="text-base text-slate-950">
                          {result.recommendation.calibration.finalHandicap}
                        </strong>
                      </div>
                    </div>

                    {result.recommendation.calibration.adjustments.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {result.recommendation.calibration.adjustments.map((adjustment) => (
                          <div
                            key={`${adjustment.label}-${adjustment.points}`}
                            className="flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-600"
                          >
                            <div>
                              <div className="font-semibold text-slate-950">
                                {adjustment.label}
                              </div>
                              <div className="mt-1">{adjustment.reason}</div>
                            </div>
                            <strong className="shrink-0 text-sm text-slate-950">
                              {adjustment.points >= 0 ? "+" : ""}
                              {adjustment.points}
                            </strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-lg bg-white px-3 py-2 text-xs text-slate-500">
                        No calibration adjustment for this comparison.
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="mt-6 grid gap-3">
                  {result.players.map((player) => (
                    <div
                      key={player.documentId ?? player.name}
                      className="rounded-lg border border-slate-200 p-4"
                    >
                      <div className="font-semibold text-slate-950">{player.name || "Player"}</div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-3">
                        <div>
                          <div>Internal handy</div>
                          <strong className="text-sm text-slate-950">{player.internalHandy}</strong>
                        </div>
                        <div>
                          <div>Band</div>
                          <strong className="text-sm text-slate-950">{player.calibrationBand}</strong>
                        </div>
                        <div>
                          <div>Rating</div>
                          <strong className="text-sm text-slate-950">{player.effectiveScore}</strong>
                        </div>
                        <div>
                          <div>Matches</div>
                          <strong className="text-sm text-slate-950">{player.totalMatches}</strong>
                        </div>
                        <div>
                          <div>Overall avg</div>
                          <strong className="text-sm text-slate-950">{formatAvg(player.overallAvg)}</strong>
                        </div>
                        <div>
                          <div>Recent avg</div>
                          <strong className="text-sm text-slate-950">{formatAvg(player.recentAvg)}</strong>
                        </div>
                        <div>
                          <div>High run</div>
                          <strong className="text-sm text-slate-950">{player.highestRun}</strong>
                        </div>
                        <div>
                          <div>Best avg</div>
                          <strong className="text-sm text-slate-950">{formatAvg(player.bestAverage)}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
