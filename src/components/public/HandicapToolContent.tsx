"use client";

import { Calculator, Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CountryFlag } from "@/components/public/PresentationBlocks";

type HandicapMode = "starting-points" | "race-to" | "avg-ratio";

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
  mode: HandicapMode;
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
      targetPoints: number;
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
    totalMatches: number;
    winPercentage: number;
    highestRun: number;
    bestAverage: number;
    internalHandy: number;
    calibrationBand: string;
    statsScope: "game-type" | "overall-fallback";
    manualAvg: number | null;
  }>;
};

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 250;

const modeLabels: Record<HandicapMode, string> = {
  "starting-points": "Υπολογισμός με πόντους",
  "race-to": "Korean race-to",
  "avg-ratio": "Αναλογία AVG",
};

const confidenceLabel: Record<string, string> = {
  none: "Χωρίς αξιοπιστία",
  low: "Χαμηλή αξιοπιστία",
  medium: "Μέτρια αξιοπιστία",
  high: "Υψηλή αξιοπιστία",
};

const formatAvg = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(3) : "-";
};

const formatPct = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(1)}%` : "-";
};

const avgPair = (
  playerA: RecommendationPayload["players"][number] | null,
  playerB: RecommendationPayload["players"][number] | null,
  selector: (player: RecommendationPayload["players"][number]) => number,
  formatter: (value: number) => string,
) => {
  if (!playerA || !playerB) return "-";
  return `${formatter(selector(playerA))} / ${formatter(selector(playerB))}`;
};

const readOptionalNumber = (value: string) => {
  const clean = value.trim().replace(",", ".");
  if (!clean) return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const scoreLabel = (score: number) => {
  if (score >= 80) return "Υψηλό";
  if (score >= 55) return "Μέτριο";
  if (score > 0) return "Χαμηλό";
  return "Άγνωστο";
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
          placeholder="Αναζήτηση παίκτη..."
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
                  {player.country || player.city || player.clubName || "Προφίλ παίκτη"}
                </span>
              </span>
            </button>
          ))
        ) : (
          <div className="px-3 py-4 text-sm text-slate-500">Δεν βρέθηκαν παίκτες.</div>
        )}
      </div>
    </div>
  );
}

function PlayerLabCard({
  title,
  player,
  selected,
  officialAvg,
  friendlyAvg,
  onOfficialAvg,
  onFriendlyAvg,
}: {
  title: string;
  player: RecommendationPayload["players"][number] | null;
  selected: PlayerOption | null;
  officialAvg: string;
  friendlyAvg: string;
  onOfficialAvg: (value: string) => void;
  onFriendlyAvg: (value: string) => void;
}) {
  const manualFriendlyAvg = readOptionalNumber(friendlyAvg);
  const officialValue = player?.overallAvg ?? readOptionalNumber(officialAvg);
  const friendlyValue = manualFriendlyAvg;
  const pressureFactor =
    officialValue && friendlyValue ? Math.round((officialValue / friendlyValue) * 100) : null;
  const formDelta =
    player && player.recentAvg > 0 && player.overallAvg > 0
      ? Math.round(((player.recentAvg - player.overallAvg) / player.overallAvg) * 100)
      : null;
  const toughness = player ? Math.min(100, Math.max(0, player.winPercentage)) : 0;
  const runDanger = player
    ? Math.min(100, Math.round((Math.min(player.highestRun, 20) / 20) * 60 + (Math.min(player.bestAverage, 2.5) / 2.5) * 40))
    : 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</div>
      <div className="mt-3 min-h-[42px] text-base font-semibold text-slate-950">
        {player?.name || selected?.fullNameEn || selected?.fullName || "Δεν έχει επιλεγεί παίκτης"}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Επίσημο AVG override</label>
          <input
            value={officialAvg}
            onChange={(event) => onOfficialAvg(event.target.value)}
            inputMode="decimal"
            placeholder="Επίσημο AVG"
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">AVG φιλικών</label>
          <input
            value={friendlyAvg}
            onChange={(event) => onFriendlyAvg(event.target.value)}
            inputMode="decimal"
            placeholder="AVG φιλικών"
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-4">
        <Metric label="Επίσημο" value={formatAvg(officialValue)} />
        <Metric label="Πρόσφατο" value={formatAvg(player?.recentAvg)} />
        <Metric label="Φιλικά" value={formatAvg(friendlyValue)} />
        <Metric label="Πίεση" value={pressureFactor ? `${pressureFactor}%` : "-"} />
        <Metric label="Αγώνες" value={String(player?.totalMatches ?? "-")} />
        <Metric label="Νίκες" value={formatPct(player?.winPercentage)} />
        <Metric label="H.R." value={String(player?.highestRun ?? "-")} />
        <Metric label="Καλύτερο AVG" value={formatAvg(player?.bestAverage)} />
      </div>

      <div className="mt-4 grid gap-2 text-xs">
        <Signal label="Φόρμα" value={formDelta === null ? "Άγνωστο" : `${formDelta >= 0 ? "+" : ""}${formDelta}%`} />
        <Signal label="Σκληρότητα" value={scoreLabel(toughness)} />
        <Signal label="Κίνδυνος σερί" value={scoreLabel(runDanger)} />
        <Signal label="Αξιοπιστία δεδομένων" value={player ? confidenceLabelForMatches(player.totalMatches) : "Άγνωστο"} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div>{label}</div>
      <strong className="mt-1 block text-sm text-slate-950">{value}</strong>
    </div>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-slate-600">
      <span>{label}</span>
      <strong className="text-slate-950">{value}</strong>
    </div>
  );
}

function confidenceLabelForMatches(matches: number) {
  if (matches < 5) return "Χωρίς αξιοπιστία";
  if (matches < 15) return "Χαμηλή";
  if (matches < 30) return "Μέτρια";
  return "Υψηλή";
}

export function HandicapToolContent() {
  const [playerA, setPlayerA] = useState<PlayerOption | null>(null);
  const [playerB, setPlayerB] = useState<PlayerOption | null>(null);
  const [playerAAvg, setPlayerAAvg] = useState("");
  const [playerBAvg, setPlayerBAvg] = useState("");
  const [playerAFriendlyAvg, setPlayerAFriendlyAvg] = useState("");
  const [playerBFriendlyAvg, setPlayerBFriendlyAvg] = useState("");
  const [targetPoints, setTargetPoints] = useState(40);
  const [mode, setMode] = useState<HandicapMode>("starting-points");
  const [result, setResult] = useState<RecommendationPayload | null>(null);
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
      if (!res.ok) throw new Error(payload?.error || "Failed to calculate handicap");
      setResult(payload.data ?? null);
    } catch (err) {
      setResult(null);
      setError("Δεν ήταν δυνατός ο υπολογισμός handicap για αυτούς τους παίκτες.");
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

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-4 py-6 sm:px-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Εσωτερικό handicap lab
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Έρευνα Handicap 3-Cushion
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Ιδιωτικό εργαλείο σύγκρισης για επίσημα στατιστικά, φιλικά, φόρμα, πίεση και πειραματικά handicap modes.
              </p>
            </div>

            <div className="grid w-full grid-cols-2 gap-3 md:grid-cols-[110px_220px_140px] xl:w-auto">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Στόχος</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={targetPoints}
                  onChange={(event) => setTargetPoints(Math.max(1, Number(event.target.value) || 1))}
                  className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Τρόπος</label>
                <select
                  value={mode}
                  onChange={(event) => {
                    const nextMode = event.target.value;
                    setMode(
                      nextMode === "race-to" || nextMode === "avg-ratio"
                        ? nextMode
                        : "starting-points",
                    );
                  }}
                  className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="starting-points">Υπολογισμός με πόντους</option>
                  <option value="race-to">Korean race-to</option>
                  <option value="avg-ratio">Αναλογία AVG</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Πλαίσιο</label>
                <div className="flex h-12 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                  Μόνο για έρευνα
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="grid gap-4 md:grid-cols-2">
              <PlayerSearchBox label="Παίκτης A" value={playerA} onSelect={setPlayerA} />
              <PlayerSearchBox label="Παίκτης B" value={playerB} onSelect={setPlayerB} />
            </div>

            {playerA && playerB && playerA.documentId === playerB.documentId ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Επίλεξε δύο διαφορετικούς παίκτες.
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                disabled={!canCalculate || busy}
                onClick={calculate}
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                Υπολογισμός lab
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            {!result ? (
              <div className="flex min-h-[245px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm leading-6 text-slate-500">
                Επίλεξε δύο παίκτες για σύγκριση επίσημων στοιχείων, φιλικών, φόρμας και handicap modes.
              </div>
            ) : (
              <div>
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    {confidenceLabel[result.recommendation.confidence] ?? result.recommendation.confidence}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    Στόχος {result.targetPoints}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {modeLabels[result.mode]}
                  </span>
                </div>

                <div className="text-3xl font-semibold tracking-tight text-slate-950">
                  {result.recommendation.label || "Δεν υπάρχει πρόταση"}
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-800">{result.recommendation.reason}</p>

                {result.recommendation.calibration ? (
                  <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="grid grid-cols-3 gap-3 text-xs text-slate-500">
                      <Metric label="Βάση" value={String(result.recommendation.calibration.baseHandicap)} />
                      <Metric
                        label="Calibration"
                        value={`${result.recommendation.calibration.adjustment >= 0 ? "+" : ""}${result.recommendation.calibration.adjustment}`}
                      />
                      <Metric label="Τελικό" value={String(result.recommendation.calibration.finalHandicap)} />
                    </div>
                    <div className="mt-4 grid gap-2">
                      {result.recommendation.calibration.adjustments.length > 0 ? (
                        result.recommendation.calibration.adjustments.map((adjustment) => (
                          <div
                            key={`${adjustment.label}-${adjustment.points}`}
                            className="flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-600"
                          >
                            <div>
                              <div className="font-semibold text-slate-950">{adjustment.label}</div>
                              <div className="mt-1">{adjustment.reason}</div>
                            </div>
                            <strong className="shrink-0 text-sm text-slate-950">
                              {adjustment.points >= 0 ? "+" : ""}
                              {adjustment.points}
                            </strong>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-500">
                          Δεν υπάρχει calibration adjustment για αυτή τη σύγκριση.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <PlayerLabCard
            title="Προφίλ Παίκτη A"
            selected={playerA}
            player={resultPlayerA}
            officialAvg={playerAAvg}
            friendlyAvg={playerAFriendlyAvg}
            onOfficialAvg={setPlayerAAvg}
            onFriendlyAvg={setPlayerAFriendlyAvg}
          />
          <PlayerLabCard
            title="Προφίλ Παίκτη B"
            selected={playerB}
            player={resultPlayerB}
            officialAvg={playerBAvg}
            friendlyAvg={playerBFriendlyAvg}
            onOfficialAvg={setPlayerBAvg}
            onFriendlyAvg={setPlayerBFriendlyAvg}
          />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <div className="grid gap-4 md:grid-cols-4">
            <Metric
              label="Δυναμική στα επίσημα"
              value={`AVG ${avgPair(resultPlayerA, resultPlayerB, (player) => player.overallAvg, formatAvg)} | Win ${avgPair(resultPlayerA, resultPlayerB, (player) => player.winPercentage, formatPct)}`}
            />
            <Metric
              label="Δυναμική στα φιλικά"
              value={`AVG ${formatAvg(readOptionalNumber(playerAFriendlyAvg))} / ${formatAvg(readOptionalNumber(playerBFriendlyAvg))}`}
            />
            <Metric label="Παράγοντας πίεσης" value="Επίσημο AVG / AVG φιλικών" />
            <Metric label="Κατάσταση εκμάθησης" value="Δεν συλλέγονται ακόμα δείγματα" />
          </div>
        </section>
      </div>
    </main>
  );
}
