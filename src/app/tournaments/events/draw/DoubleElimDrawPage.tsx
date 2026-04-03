"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { EventApiResponse, StrapiEventStage, StrapiGroup } from "../types";
import { normalizeEntity, toNumber, toRelationArray } from "../utils";

type DrawStage = {
  id: string;
  documentId: string;
  title: string;
  stageType: string | null;
  raw: StrapiEventStage & { id: string; documentId: string };
};

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

type PositionedMatch = DrawMatch & {
  x: number;
  y: number;
};

type ConnectorPath = {
  key: string;
  d: string;
  tone: "winner" | "loser";
};

const CARD_WIDTH = 118;
const CARD_HEIGHT = 46;
const COLUMN_GAP = 110;
const ROUND_GAP = 62;
const SECTION_GAP = 72;
const BASE_MATCH_GAP = 38;
const LEFT_PADDING = 48;
const TOP_PADDING = 70;

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

function roundTitle(label: string) {
  const upper = label.toUpperCase().trim();
  return upper
    .replace("WINNERS", "W")
    .replace("LOSERS", "L")
    .replace("GRAND FINAL RESET", "GF RESET")
    .replace("GRAND FINAL", "GF");
}

function getRoundBand(roundLabel: string, bracketType: DrawMatch["bracketType"]) {
  const upper = roundLabel.toUpperCase().trim();
  if (bracketType === "winners") {
    if (upper.startsWith("WINNERS R1")) return 0;
    if (upper.startsWith("WINNERS R2")) return 1;
    if (upper.startsWith("WINNERS R3")) return 2;
    if (upper.startsWith("WINNERS R4")) return 3;
    if (upper.startsWith("WINNERS R5")) return 4;
    if (upper === "WINNERS FINAL") return 5;
  }
  if (bracketType === "losers") {
    if (upper.startsWith("LOSERS R1")) return 1;
    if (upper.startsWith("LOSERS R2")) return 2;
    if (upper.startsWith("LOSERS R3")) return 2;
    if (upper.startsWith("LOSERS R4")) return 3;
    if (upper.startsWith("LOSERS R5")) return 3;
    if (upper.startsWith("LOSERS R6")) return 4;
    if (upper.startsWith("LOSERS R7")) return 4;
    if (upper.startsWith("LOSERS R8")) return 5;
    if (upper.startsWith("LOSERS R9")) return 5;
    if (upper.startsWith("LOSERS R10")) return 6;
  }
  return 6;
}

function normalizeSpacing(values: number[], minimumGap: number) {
  if (!values.length) return values;
  const result = [...values].sort((a, b) => a - b);
  for (let i = 1; i < result.length; i += 1) {
    if (result[i] - result[i - 1] < minimumGap) {
      result[i] = result[i - 1] + minimumGap;
    }
  }
  return result;
}

function computeRoundPositions(
  rounds: Array<{ label: string; matches: DrawMatch[] }>,
  xOffset: number,
  yOffset: number,
  sourceMap: Map<number, number[]>,
) {
  const placed = new Map<number, PositionedMatch>();
  const roundColumns: Array<{ label: string; x: number }> = [];

  rounds.forEach((round, roundOrder) => {
    const x = xOffset + roundOrder * COLUMN_GAP;
    roundColumns.push({ label: round.label, x });
    const desiredYs = round.matches.map((match, index) => {
      const key = match.globalMatchNumber ?? -1;
      const incoming = key > 0 ? sourceMap.get(key) ?? [] : [];
      if (!incoming.length) {
        return yOffset + index * BASE_MATCH_GAP;
      }
      const sourceYs = incoming
        .map((number) => placed.get(number)?.y)
        .filter((value): value is number => typeof value === "number");
      if (!sourceYs.length) {
        return yOffset + index * BASE_MATCH_GAP;
      }
      return sourceYs.reduce((sum, value) => sum + value, 0) / sourceYs.length;
    });
    const normalizedYs = normalizeSpacing(desiredYs, ROUND_GAP);
    round.matches.forEach((match, index) => {
      if (!match.globalMatchNumber) return;
      placed.set(match.globalMatchNumber, {
        ...match,
        x,
        y: normalizedYs[index],
      });
    });
  });

  return { placed, roundColumns };
}

function buildConnectorPath(
  from: DOMRect,
  to: DOMRect,
  canvas: DOMRect,
) {
  const startX = from.right - canvas.left;
  const startY = from.top - canvas.top + from.height / 2;
  const endX = to.left - canvas.left;
  const endY = to.top - canvas.top + to.height / 2;
  const midX = startX + (endX - startX) / 2;
  return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
}

function MatchNode({
  match,
  assignRef,
}: {
  match: PositionedMatch;
  assignRef: (id: string, element: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={(element) => assignRef(match.documentId, element)}
      className="absolute rounded-xl border border-[#29448b] bg-[#18357d] px-3 py-2 text-white shadow-[0_8px_18px_rgba(17,35,86,0.22)]"
      style={{
        left: `${match.x}px`,
        top: `${match.y}px`,
        width: `${CARD_WIDTH}px`,
        height: `${CARD_HEIGHT}px`,
      }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-100/80">
        Match
      </div>
      <div className="mt-0.5 text-xl font-black tracking-tight">
        M{match.globalMatchNumber ?? "?"}
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
  const [connectors, setConnectors] = useState<ConnectorPath[]>([]);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef(new Map<string, HTMLDivElement | null>());

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
      };
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
        return {
          id: normalized.id,
          documentId: normalized.documentId,
          bracketType: getBracketType(normalizedRecord.bracket_type, roundLabel),
          roundLabel,
          roundIndex: getRoundIndex(roundLabel),
          matchIndex:
            toNumber((normalized as { match_number?: unknown }).match_number) ??
            index + 1,
          globalMatchNumber: toNumber(normalized.global_match_number),
          winnerToGlobalMatchNumber: toNumber(
            normalized.winner_to_global_match_number,
          ),
          winnerToSlot: toNumber(normalized.winner_to_slot),
          loserToGlobalMatchNumber: toNumber(
            normalized.loser_to_global_match_number,
          ),
          loserToSlot: toNumber(normalized.loser_to_slot),
        } as DrawMatch;
      })
      .filter((match) => match.globalMatchNumber)
      .sort(
        (a, b) =>
          (a.globalMatchNumber ?? 9999) - (b.globalMatchNumber ?? 9999),
      );
  }, [activeStage]);

  const roundsBySection = useMemo(() => {
    const build = (type: DrawMatch["bracketType"]) => {
      const byRound = new Map<string, DrawMatch[]>();
      drawMatches
        .filter((match) => match.bracketType === type)
        .forEach((match) => {
          const current = byRound.get(match.roundLabel) ?? [];
          current.push(match);
          byRound.set(match.roundLabel, current);
        });
      return Array.from(byRound.entries())
        .sort((a, b) => getRoundIndex(a[0]) - getRoundIndex(b[0]))
        .map(([label, matches]) => ({
          label,
          matches: matches.sort(
            (a, b) =>
              (a.globalMatchNumber ?? 9999) - (b.globalMatchNumber ?? 9999),
          ),
        }));
    };
    return {
      winners: build("winners"),
      losers: build("losers"),
      finals: build("final"),
    };
  }, [drawMatches]);

  const layout = useMemo(() => {
    const sourceMap = new Map<number, number[]>();
    drawMatches.forEach((match) => {
      const from = match.globalMatchNumber;
      if (!from) return;
      const winnerTarget = match.winnerToGlobalMatchNumber;
      const loserTarget = match.loserToGlobalMatchNumber;
      if (winnerTarget) {
        const current = sourceMap.get(winnerTarget) ?? [];
        current.push(from);
        sourceMap.set(winnerTarget, current);
      }
      if (loserTarget) {
        const current = sourceMap.get(loserTarget) ?? [];
        current.push(from);
        sourceMap.set(loserTarget, current);
      }
    });

    const winnersLayout = computeRoundPositions(
      roundsBySection.winners,
      LEFT_PADDING,
      TOP_PADDING,
      sourceMap,
    );
    const winnersMatches = Array.from(winnersLayout.placed.values());
    const winnersBottom =
      winnersMatches.reduce((max, match) => Math.max(max, match.y), TOP_PADDING) +
      CARD_HEIGHT;

    const firstLosersBandY =
      TOP_PADDING + (ROUND_GAP + CARD_HEIGHT) * 8 + SECTION_GAP;

    const losersLayout = computeRoundPositions(
      roundsBySection.losers,
      LEFT_PADDING + COLUMN_GAP / 2,
      firstLosersBandY,
      sourceMap,
    );
    const losersMatches = Array.from(losersLayout.placed.values());
    const losersBottom =
      losersMatches.reduce((max, match) => Math.max(max, match.y), winnersBottom + SECTION_GAP) +
      CARD_HEIGHT;

    const finalsStartX =
      LEFT_PADDING +
      Math.max(
        roundsBySection.winners.length * COLUMN_GAP,
        roundsBySection.losers.length * COLUMN_GAP + COLUMN_GAP / 2,
      ) +
      120;

    const finalsLayout = computeRoundPositions(
      roundsBySection.finals,
      finalsStartX,
      TOP_PADDING + (ROUND_GAP + CARD_HEIGHT) * 14,
      sourceMap,
    );

    const allMatches = [
      ...Array.from(winnersLayout.placed.values()),
      ...Array.from(losersLayout.placed.values()),
      ...Array.from(finalsLayout.placed.values()),
    ];

    return {
      winnersColumns: winnersLayout.roundColumns,
      losersColumns: losersLayout.roundColumns,
      finalsColumns: finalsLayout.roundColumns,
      matches: allMatches,
      width:
        finalsStartX +
        Math.max(1, roundsBySection.finals.length) * COLUMN_GAP +
        CARD_WIDTH +
        120,
      height: Math.max(losersBottom + 140, winnersBottom + 140),
    };
  }, [drawMatches, roundsBySection]);

  useLayoutEffect(() => {
    const rebuild = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      const byGlobal = new Map<number, DrawMatch>();
      drawMatches.forEach((match) => {
        if (match.globalMatchNumber) byGlobal.set(match.globalMatchNumber, match);
      });
      const paths: ConnectorPath[] = [];
      drawMatches.forEach((match) => {
        const fromNode = nodeRefs.current.get(match.documentId);
        if (!fromNode) return;
        const fromRect = fromNode.getBoundingClientRect();
        const targets = [
          {
            targetNumber: match.winnerToGlobalMatchNumber,
            tone: "winner" as const,
          },
          {
            targetNumber: match.loserToGlobalMatchNumber,
            tone: "loser" as const,
          },
        ];
        targets.forEach(({ targetNumber, tone }) => {
          if (!targetNumber) return;
          const targetMatch = byGlobal.get(targetNumber);
          if (!targetMatch) return;
          const toNode = nodeRefs.current.get(targetMatch.documentId);
          if (!toNode) return;
          const toRect = toNode.getBoundingClientRect();
          paths.push({
            key: `${match.documentId}-${tone}-${targetMatch.documentId}`,
            tone,
            d: buildConnectorPath(fromRect, toRect, canvasRect),
          });
        });
      });
      setConnectors(paths);
    };

    const raf = requestAnimationFrame(rebuild);
    window.addEventListener("resize", rebuild);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", rebuild);
    };
  }, [drawMatches, layout]);

  const assignNodeRef = (id: string, element: HTMLDivElement | null) => {
    nodeRefs.current.set(id, element);
  };

  return (
    <div className="mx-auto w-full px-4 py-8" style={{ maxWidth: "98vw" }}>
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-sky-700">
              Draw
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Double Elimination Flowchart
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Match-number diagram for checking exact winner/loser destinations.
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
        {loading ? <div className="mt-8 text-sm text-slate-500">Loading draw...</div> : null}
        {error ? (
          <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </div>
        ) : null}
        {!loading && !error && drawMatches.length ? (
          <div className="mt-8 overflow-x-auto rounded-[28px] border border-slate-200 bg-[#eef4ff] p-4">
            <div
              ref={canvasRef}
              className="relative"
              style={{ width: `${layout.width}px`, height: `${layout.height}px` }}
            >
              <svg
                className="pointer-events-none absolute inset-0"
                width={layout.width}
                height={layout.height}
              >
                {connectors.map((path) => (
                  <path
                    key={path.key}
                    d={path.d}
                    fill="none"
                    stroke={path.tone === "winner" ? "#2b7fff" : "#6a7da8"}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />
                ))}
              </svg>

              {layout.winnersColumns.map((column) => (
                <div
                  key={`w-${column.label}`}
                  className="absolute rounded-xl bg-[#122864] px-3 py-2 text-center text-xs font-black uppercase tracking-[0.16em] text-white"
                  style={{ left: `${column.x}px`, top: "12px", width: `${CARD_WIDTH}px` }}
                >
                  {roundTitle(column.label)}
                </div>
              ))}
              {layout.losersColumns.map((column) => (
                <div
                  key={`l-${column.label}`}
                  className="absolute rounded-xl bg-[#2a3f85] px-3 py-2 text-center text-xs font-black uppercase tracking-[0.16em] text-white"
                  style={{
                    left: `${column.x}px`,
                    top: `${TOP_PADDING + 8 * (ROUND_GAP + CARD_HEIGHT) - 52}px`,
                    width: `${CARD_WIDTH}px`,
                  }}
                >
                  {roundTitle(column.label)}
                </div>
              ))}
              {layout.finalsColumns.map((column) => (
                <div
                  key={`f-${column.label}`}
                  className="absolute rounded-xl bg-[#0f6d5f] px-3 py-2 text-center text-xs font-black uppercase tracking-[0.16em] text-white"
                  style={{ left: `${column.x}px`, top: "12px", width: `${CARD_WIDTH}px` }}
                >
                  {roundTitle(column.label)}
                </div>
              ))}

              {layout.matches.map((match) => (
                <MatchNode
                  key={match.documentId}
                  match={match}
                  assignRef={assignNodeRef}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
