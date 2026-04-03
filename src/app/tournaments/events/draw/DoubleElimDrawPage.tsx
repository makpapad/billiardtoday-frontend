"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import type { EventApiResponse, StrapiEventStage, StrapiGroup } from "../types";
import { normalizeEntity, toNumber, toRelationArray } from "../utils";

type DrawMatch = {
  id: string;
  documentId: string;
  bracketType: "winners" | "losers" | "final";
  roundLabel: string;
  roundIndex: number;
  matchIndex: number;
  globalMatchNumber: number | null;
  winnerToGlobalMatchNumber: number | null;
  winnerToSlot: number | null;
  loserToGlobalMatchNumber: number | null;
  loserToSlot: number | null;
};

type DrawRound = {
  label: string;
  matches: DrawMatch[];
};

type DrawStage = {
  id: string;
  documentId: string;
  title: string;
  stageType: string | null;
  raw: StrapiEventStage & { id: string; documentId: string };
};

const fetchEvent = async (eventId: string): Promise<EventApiResponse> => {
  const response = await fetch(`/api/events/${eventId}`, { cache: "no-store" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to fetch event");
  }
  return response.json();
};

function getRoundIndex(label: string): number {
  const upper = label.toUpperCase().trim();
  if (upper.startsWith("WINNERS R")) {
    return Number(upper.replace("WINNERS R", "")) || 999;
  }
  if (upper === "WINNERS FINAL") return 999;
  if (upper.startsWith("LOSERS R")) {
    return Number(upper.replace("LOSERS R", "")) || 999;
  }
  if (upper === "LOSERS FINAL") return 999;
  if (upper === "GRAND FINAL") return 1000;
  if (upper === "GRAND FINAL RESET") return 1001;
  return 9999;
}

function getBracketType(
  rawBracketType: unknown,
  roundLabel: string,
): "winners" | "losers" | "final" {
  const bracket =
    typeof rawBracketType === "string" ? rawBracketType.toLowerCase().trim() : "";
  if (bracket === "winners" || bracket === "losers") return bracket;
  const upper = roundLabel.toUpperCase();
  if (upper.includes("GRAND FINAL")) return "final";
  if (upper.includes("WINNERS")) return "winners";
  if (upper.includes("LOSERS")) return "losers";
  return "final";
}

function toTargetLabel(matchNumber: number | null, slot: number | null): string {
  if (!matchNumber || matchNumber <= 0) return "Out";
  return `M${matchNumber}${slot ? ` · S${slot}` : ""}`;
}

function DrawMatchCard({ match }: { match: DrawMatch }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-lg font-black tracking-tight text-slate-950">
          M{match.globalMatchNumber ?? "?"}
        </div>
        <div className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {match.roundLabel}
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-3 py-2 text-emerald-900">
          <span className="font-bold uppercase tracking-[0.14em]">Winner</span>
          <span className="font-semibold">
            {toTargetLabel(match.winnerToGlobalMatchNumber, match.winnerToSlot)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-3 py-2 text-rose-900">
          <span className="font-bold uppercase tracking-[0.14em]">Loser</span>
          <span className="font-semibold">
            {toTargetLabel(match.loserToGlobalMatchNumber, match.loserToSlot)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DoubleElimDrawPage() {
  const searchParams = useSearchParams();
  const eventId = searchParams?.get("eventId") ?? null;
  const preferredStageId = searchParams?.get("stage") ?? null;
  const [eventData, setEventData] = useState<EventApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      setEventData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetchEvent(eventId)
      .then((data) => {
        setEventData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to fetch event");
        setLoading(false);
      });
  }, [eventId]);

  const stages = useMemo(() => {
    const event = eventData?.data;
    if (!event) return [] as DrawStage[];
    return toRelationArray(event.event_stages).map((stage, index) => {
      const normalized = normalizeEntity<StrapiEventStage>(stage, `stage-${index}`);
      return {
        id: normalized.id,
        documentId: normalized.documentId,
        title:
          typeof normalized.title === "string" && normalized.title.trim()
            ? normalized.title.trim()
            : `Stage ${index + 1}`,
        stageType:
          typeof normalized.stage_type === "string" ? normalized.stage_type : null,
        raw: normalized,
      } satisfies DrawStage;
    });
  }, [eventData]);

  useEffect(() => {
    if (!stages.length) {
      setActiveStageId(null);
      return;
    }
    const preferred =
      (preferredStageId &&
        stages.find((stage) => stage.documentId === preferredStageId)) ||
      stages.find((stage) => stage.stageType === "double_elimination") ||
      stages[0];
    setActiveStageId(preferred?.documentId ?? null);
  }, [preferredStageId, stages]);

  const activeStage = useMemo(() => {
    if (!activeStageId) return null;
    return stages.find((stage) => stage.documentId === activeStageId) ?? null;
  }, [activeStageId, stages]);

  const drawMatches = useMemo(() => {
    if (!activeStage) return [] as DrawMatch[];
    const groups = toRelationArray((activeStage.raw as StrapiEventStage).groups);
    return groups
      .map((group, index) => {
        const normalized = normalizeEntity<StrapiGroup>(group, `match-${index}`);
        const normalizedRecord = normalized as Record<string, unknown>;
        const roundLabel =
          typeof normalizedRecord.round === "string" &&
          normalizedRecord.round.trim()
            ? normalizedRecord.round.trim()
            : "Round";
        const bracketType = getBracketType(
          normalizedRecord.bracket_type,
          roundLabel,
        );
        return {
          id: normalized.id,
          documentId: normalized.documentId,
          bracketType,
          roundLabel,
          roundIndex: getRoundIndex(roundLabel),
          matchIndex: toNumber((normalized as { match_number?: unknown }).match_number) ?? index + 1,
          globalMatchNumber: toNumber(normalized.global_match_number),
          winnerToGlobalMatchNumber: toNumber(normalized.winner_to_global_match_number),
          winnerToSlot: toNumber(normalized.winner_to_slot),
          loserToGlobalMatchNumber: toNumber(normalized.loser_to_global_match_number),
          loserToSlot: toNumber(normalized.loser_to_slot),
        };
      })
      .sort((a, b) => {
        const globalDiff = (a.globalMatchNumber ?? 9999) - (b.globalMatchNumber ?? 9999);
        if (globalDiff !== 0) return globalDiff;
        return a.matchIndex - b.matchIndex;
      });
  }, [activeStage]);

  const winnersRounds = useMemo(() => {
    const byRound = new Map<string, DrawMatch[]>();
    drawMatches
      .filter((match) => match.bracketType === "winners")
      .forEach((match) => {
        const current = byRound.get(match.roundLabel) ?? [];
        current.push(match);
        byRound.set(match.roundLabel, current);
      });
    return Array.from(byRound.entries())
      .sort((a, b) => getRoundIndex(a[0]) - getRoundIndex(b[0]))
      .map(
        ([label, matches]): DrawRound => ({
          label,
          matches: matches.sort(
            (a, b) => (a.globalMatchNumber ?? 9999) - (b.globalMatchNumber ?? 9999),
          ),
        }),
      );
  }, [drawMatches]);

  const losersRounds = useMemo(() => {
    const byRound = new Map<string, DrawMatch[]>();
    drawMatches
      .filter((match) => match.bracketType === "losers")
      .forEach((match) => {
        const current = byRound.get(match.roundLabel) ?? [];
        current.push(match);
        byRound.set(match.roundLabel, current);
      });
    return Array.from(byRound.entries())
      .sort((a, b) => getRoundIndex(a[0]) - getRoundIndex(b[0]))
      .map(
        ([label, matches]): DrawRound => ({
          label,
          matches: matches.sort(
            (a, b) => (a.globalMatchNumber ?? 9999) - (b.globalMatchNumber ?? 9999),
          ),
        }),
      );
  }, [drawMatches]);

  const finalRounds = useMemo(() => {
    const finals = drawMatches
      .filter((match) => match.bracketType === "final")
      .sort((a, b) => (a.globalMatchNumber ?? 9999) - (b.globalMatchNumber ?? 9999));
    return finals.length ? [{ label: "Finals", matches: finals }] : [];
  }, [drawMatches]);

  return (
    <div className="mx-auto w-full px-4 py-8" style={{ maxWidth: "1600px" }}>
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-sky-700">
              Draw
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Match Flow
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Frontend draw view with match numbers only for checking DE routing.
            </p>
          </div>
          <div className="min-w-[260px]">
            <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              Stage
            </label>
            <select
              value={activeStageId ?? ""}
              onChange={(event) => setActiveStageId(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
            >
              {stages.map((stage) => (
                <option key={stage.documentId} value={stage.documentId}>
                  {stage.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!eventId ? (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Missing <code>eventId</code> query parameter.
          </div>
        ) : null}
        {loading ? (
          <div className="mt-8 text-sm text-slate-500">Loading draw...</div>
        ) : null}
        {error ? (
          <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </div>
        ) : null}
        {!loading && !error && activeStage && !drawMatches.length ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No matches available for this stage.
          </div>
        ) : null}

        {!loading && !error && drawMatches.length ? (
          <div className="mt-8 flex flex-col gap-10">
            {[
              { title: "Winners", rounds: winnersRounds, tone: "sky" as const },
              { title: "Losers", rounds: losersRounds, tone: "indigo" as const },
              { title: "Finals", rounds: finalRounds, tone: "emerald" as const },
            ]
              .filter((section) => section.rounds.length > 0)
              .map((section) => (
                <section key={section.title} className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-black tracking-tight text-slate-950">
                      {section.title}
                    </h2>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {section.rounds.reduce(
                        (sum, round) => sum + round.matches.length,
                        0,
                      )}{" "}
                      matches
                    </div>
                  </div>
                  <div className="overflow-x-auto pb-2">
                    <div className="flex min-w-max gap-4">
                      {section.rounds.map((round) => (
                        <div
                          key={round.label}
                          className={clsx(
                            "w-[220px] rounded-[28px] border p-4",
                            section.tone === "sky" &&
                              "border-sky-200 bg-sky-50/70",
                            section.tone === "indigo" &&
                              "border-indigo-200 bg-indigo-50/70",
                            section.tone === "emerald" &&
                              "border-emerald-200 bg-emerald-50/70",
                          )}
                        >
                          <div className="mb-3 rounded-2xl bg-slate-950 px-3 py-2 text-center text-xs font-black uppercase tracking-[0.22em] text-white">
                            {round.label}
                          </div>
                          <div className="flex flex-col gap-3">
                            {round.matches.map((match) => (
                              <DrawMatchCard key={match.documentId} match={match} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
