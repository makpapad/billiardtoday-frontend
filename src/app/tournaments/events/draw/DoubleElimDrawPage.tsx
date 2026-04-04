"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { EventApiResponse, StrapiEventStage } from "../types";
import { normalizeEntity, toRelationArray } from "../utils";
import {
  buildFullPyramidColumns,
  buildDrawMatches,
  type DrawMatch,
} from "./flowchartModel";

type DrawStage = {
  id: string;
  documentId: string;
  title: string;
  stageType: string | null;
  raw: StrapiEventStage & { id: string; documentId: string };
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
const CARD_HEIGHT = 78;
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
  const winnerLabel = match.winnerToGlobalMatchNumber
    ? `W -> M${match.winnerToGlobalMatchNumber}${match.winnerToSlot ? ` (${match.winnerToSlot})` : ""}`
    : "W -> End";
  const loserLabel = match.loserToGlobalMatchNumber
    ? `L -> M${match.loserToGlobalMatchNumber}${match.loserToSlot ? ` (${match.loserToSlot})` : ""}`
    : "L -> End";

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
      <div className="mt-2 space-y-1 text-[10px] font-semibold leading-tight text-sky-50/90">
        <div>{winnerLabel}</div>
        <div className="text-sky-100/75">{loserLabel}</div>
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
    return buildDrawMatches(activeStage?.raw ?? null);
  }, [activeStage]);

  const layout = useMemo(() => {
    const columns = buildFullPyramidColumns(drawMatches);
    const placed = new Map<number, PositionedMatch>();
    const baseSlot = CARD_HEIGHT + 18;
    const maxMatchesInColumn = Math.max(
      ...columns.map((column) => column.matches.length),
      1,
    );

    columns.forEach((column, columnIndex) => {
      const x = LEFT_PADDING + columnIndex * COLUMN_GAP;
      const slotsPerMatch = Math.max(1, maxMatchesInColumn / column.matches.length);
      const stride = baseSlot * slotsPerMatch;
      const offset = ((slotsPerMatch - 1) * baseSlot) / 2;
      const yValues = column.matches.map(
        (_, index) => TOP_PADDING + index * stride + offset,
      );
      const normalizedYs = normalizeSpacing(yValues, ROW_GAP);
      column.matches.forEach((match, index) => {
        placed.set(match.globalMatchNumber!, {
          ...match,
          x,
          y: normalizedYs[index],
        });
      });
    });

    const allMatches = Array.from(placed.values());
    const labels = columns.map((column, columnIndex) => ({
      x: LEFT_PADDING + columnIndex * COLUMN_GAP,
      labels: [column.label],
    }));
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
