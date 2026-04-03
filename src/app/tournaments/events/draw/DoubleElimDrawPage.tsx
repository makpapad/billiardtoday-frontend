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
};

const CARD_WIDTH = 118;
const CARD_HEIGHT = 46;
const COLUMN_GAP = 140;
const ROW_GAP = 54;
const BASE_MATCH_GAP = 34;
const LEFT_PADDING = 48;
const TOP_PADDING = 46;

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
  return `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`;
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
      className="absolute rounded-xl border px-3 py-2 text-white shadow-[0_8px_18px_rgba(17,35,86,0.18)]"
      style={{
        left: `${match.x}px`,
        top: `${match.y}px`,
        width: `${CARD_WIDTH}px`,
        height: `${CARD_HEIGHT}px`,
        backgroundColor:
          match.bracketType === "final"
            ? "#175c4f"
            : match.bracketType === "losers"
              ? "#1f3777"
              : "#244592",
        borderColor:
          match.bracketType === "final"
            ? "#27826f"
            : match.bracketType === "losers"
              ? "#395392"
              : "#3e63b0",
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

  const layout = useMemo(() => {
    const byGlobal = new Map<number, DrawMatch>();
    const sourceMap = new Map<number, number[]>();
    drawMatches.forEach((match) => {
      const from = match.globalMatchNumber;
      if (!from) return;
      byGlobal.set(from, match);
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

    const depthCache = new Map<number, number>();
    const computeDepth = (globalMatchNumber: number): number => {
      if (depthCache.has(globalMatchNumber)) {
        return depthCache.get(globalMatchNumber)!;
      }
      const match = byGlobal.get(globalMatchNumber);
      if (!match) return 0;
      const targets = [
        match.winnerToGlobalMatchNumber,
        match.loserToGlobalMatchNumber,
      ].filter((value): value is number => typeof value === "number" && value > 0);
      if (!targets.length) {
        depthCache.set(globalMatchNumber, 0);
        return 0;
      }
      const depth = 1 + Math.max(...targets.map((target) => computeDepth(target)));
      depthCache.set(globalMatchNumber, depth);
      return depth;
    };

    drawMatches.forEach((match) => {
      if (match.globalMatchNumber) computeDepth(match.globalMatchNumber);
    });

    const maxDepth = Math.max(...Array.from(depthCache.values()), 0);
    const layerMap = new Map<number, DrawMatch[]>();
    drawMatches.forEach((match) => {
      const global = match.globalMatchNumber;
      if (!global) return;
      const depth = depthCache.get(global) ?? 0;
      const layer = maxDepth - depth;
      const current = layerMap.get(layer) ?? [];
      current.push(match);
      layerMap.set(layer, current);
    });

    const placed = new Map<number, PositionedMatch>();
    const columns = Array.from(layerMap.entries()).sort((a, b) => a[0] - b[0]);

    columns.forEach(([layer, matches]) => {
      const x = LEFT_PADDING + layer * COLUMN_GAP;
      const desiredYs = matches.map((match, index) => {
        const global = match.globalMatchNumber!;
        const incoming = sourceMap.get(global) ?? [];
        if (!incoming.length) {
          return TOP_PADDING + index * BASE_MATCH_GAP;
        }
        const sourceYs = incoming
          .map((number) => placed.get(number)?.y)
          .filter((value): value is number => typeof value === "number");
        if (!sourceYs.length) {
          return TOP_PADDING + index * BASE_MATCH_GAP;
        }
        return sourceYs.reduce((sum, value) => sum + value, 0) / sourceYs.length;
      });
      const orderedMatches = matches
        .slice()
        .sort((a, b) => {
          const aGlobal = a.globalMatchNumber ?? 9999;
          const bGlobal = b.globalMatchNumber ?? 9999;
          return aGlobal - bGlobal;
        });
      const normalizedYs = normalizeSpacing(desiredYs, ROW_GAP);
      orderedMatches.forEach((match, index) => {
        placed.set(match.globalMatchNumber!, {
          ...match,
          x,
          y: normalizedYs[index],
        });
      });
    });

    const allMatches = Array.from(placed.values());
    const labels = columns.map(([layer, matches]) => {
      const x = LEFT_PADDING + layer * COLUMN_GAP;
      const uniqueLabels = Array.from(
        new Set(
          matches
            .slice()
            .sort((a, b) => getRoundIndex(a.roundLabel) - getRoundIndex(b.roundLabel))
            .map((match) => match.roundLabel),
        ),
      );
      return { x, labels: uniqueLabels };
    });
    const maxY = allMatches.reduce((max, match) => Math.max(max, match.y), TOP_PADDING);

    return {
      columns: labels,
      matches: allMatches,
      width: LEFT_PADDING + columns.length * COLUMN_GAP + CARD_WIDTH + 80,
      height: maxY + CARD_HEIGHT + 80,
    };
  }, [drawMatches]);

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
                    stroke="#445e9c"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </svg>

              {layout.columns.map((column, columnIndex) => (
                <div
                  key={`col-${columnIndex}`}
                  className="absolute flex flex-col gap-1"
                  style={{ left: `${column.x}px`, top: "10px", width: `${CARD_WIDTH}px` }}
                >
                  {column.labels.map((label) => (
                    <div
                      key={`${columnIndex}-${label}`}
                      className="rounded-xl bg-[#122864] px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-[0.14em] text-white"
                    >
                      {label}
                    </div>
                  ))}
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
