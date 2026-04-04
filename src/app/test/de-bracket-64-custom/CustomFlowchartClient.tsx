"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { EventApiResponse, StrapiEventStage } from "@/app/tournaments/events/types";
import { normalizeEntity, toRelationArray } from "@/app/tournaments/events/utils";
import {
  buildDrawEdges,
  buildDrawMatches,
  buildFullPyramidColumns,
  type DrawEdge,
  type DrawMatch,
} from "@/app/tournaments/events/draw/flowchartModel";
import { getCountryFlagCdnUrl } from "@/lib/countryFlags";

const FLOWCHART_CSS = `
@import url('https://fonts.googleapis.com/css?family=Open+Sans:400,600,700,800');

html, body { background-color: #FFF; font-family: Open Sans, sans-serif; padding: 0; margin: 0; color: #0E2666; width: max-content; }
#Content { padding-top: 0; max-width: 100vw; overflow-x: scroll; overflow-y: visible; }
a, a:link, a:active, a:visited { color: #467DF7; }
a { outline: none; }
.breadcrumbs { width: fit-content; max-width: 100vw; box-sizing: border-box; position: sticky; left: 0; display: flex; align-items: center; padding: 16px 8px; font-size: 12px; text-transform: none; border: 0; background: #fff; z-index: 10; }
.breadcrumbs a, .breadcrumbs span { font-size: 12px; padding-left: 17px; background: transparent url(https://cuescore.com/img/arrow-right-blue.svg) left 5px center/6px no-repeat; text-decoration: none; }
.breadcrumbs span { color: #0E26668A; }
.breadcrumbs a:first-child { background: transparent; padding-left: 0; }
.cs-flowchart-shell { padding: 0 8px 148px; width: fit-content; transform-origin: top left; transition: transform .2s ease-in-out; }
.cs-flowchart-grid { position: relative; width: fit-content; }
.cs-round-column { position: absolute; top: 0; width: 250px; }
.cs-round-header { color: #52668f; font-size: 12px; line-height: 16px; padding: 0 0 8px; border-top: 1px solid #b9c5de; border-bottom: 1px solid #b9c5de; white-space: nowrap; }
.cs-match { position: absolute; width: 250px; height: 96px; background-color: transparent; }
.cs-match .cs-matchno { margin-left: 8px; border-radius: 4px 4px 0 0; background: #667cac; color: #fff; font-size: 12px; font-weight: 700; line-height: 16px; padding: 0 6px; display: inline-block; }
.cs-match .cs-header { display: flex; justify-content: space-between; align-items: center; background-color: white; color: #808CAC; height: 16px; font-size: 12px; overflow: hidden; }
.cs-match .cs-header-meta { flex: 1; min-width: 0; padding: 0 6px 0 8px; text-align: right; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
.cs-flowchart-participant-line { display: flex; justify-content: space-between; align-items: center; height: 32px; overflow: hidden; border-bottom: 1px solid rgba(255,255,255,0.08); }
.cs-flowchart-participant-line:nth-child(2) { border-radius: 8px 8px 0 0; }
.cs-flowchart-participant-line:nth-child(3) { border-radius: 0 0 8px 8px; border-bottom: 0; }
.cs-match.waiting .cs-flowchart-participant-line { background-color: #F3F3F3; color: #0E2666; }
.cs-match.finished .cs-flowchart-participant-line { background-color: #172266; color: #fff; }
.cs-match.finished .cs-flowchart-participant-line.is-winner { color: #7fe4ff; }
.cs-match.finished .cs-flowchart-participant-line.is-loser { color: rgba(255,255,255,0.6); }
.cs-player-line { display: flex; align-items: center; gap: 6px; min-width: 0; padding-left: 8px; }
.cs-player-flag { width: 14px; height: 10px; border-radius: 2px; object-fit: cover; flex: 0 0 auto; box-shadow: 0 0 0 1px rgba(15,23,42,0.08); }
.cs-player-name { font-size: 12px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
.cs-score { height: 100%; min-width: 24px; display: flex; align-items: center; justify-content: flex-end; padding: 0 8px; font-weight: 700; font-size: 12px; }
.cs-footer { display: flex; justify-content: space-between; align-items: center; background-color: white; color: #808CAC; height: 16px; font-size: 12px; padding: 0 6px 0 8px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
#ButtonBar { z-index: 2147483647; position: fixed; left: 8px; bottom: 8px; }
div.zoom { z-index: 11; display: inline-block; padding: 8px; background-color: #DBDEE4; opacity: 0.9; border-radius: 4px; }
.zoom .input { cursor: pointer; height: 36px; width: 36px; outline: 0; border: 0; background-color: transparent; background-position: center center; background-size: 36px; background-repeat: no-repeat; margin: 0; padding: 0; color: transparent; font-size: 0; line-height: 36px; }
.zoom .in { background-image: url(https://cuescore.com/img/scoreboard/scoreboard-plus.svg); }
.zoom .out { background-image: url(https://cuescore.com/img/scoreboard/scoreboard-minus.svg); }
.zoom .value { text-align: center; color: #475569; font-size: 14px; font-weight: 600; padding: 8px 0; }
.bt-stage-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 0 8px 12px; }
.bt-stage-label { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b; }
.bt-stage-select { min-width: 220px; border: 1px solid #cbd5e1; border-radius: 9999px; padding: 8px 14px; font-size: 12px; font-weight: 600; color: #0f172a; background: #fff; }
.bt-flowchart-empty { padding: 24px 8px; color: #64748b; font-size: 14px; }
@media only screen and (max-width: 960px) {
  .breadcrumbs { font-size: 16px; }
  .breadcrumbs a, .breadcrumbs span { overflow: hidden; max-width: 50%; white-space: nowrap; text-overflow: ellipsis; min-width: 0; }
  .breadcrumbs *:last-child { display: none; }
}
`;

type Props = {
  eventDocumentId: string | null;
  tournamentSlug: string;
  tournamentTitle: string;
  breadcrumbParentLabel?: string;
  breadcrumbParentHref?: string;
  showDebugInfo?: boolean;
};

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

const CARD_WIDTH = 250;
const CARD_HEIGHT = 96;
const HEADER_HEIGHT = 16;
const PLAYER_ROW_HEIGHT = 32;
const FOOTER_HEIGHT = 16;
const COLUMN_GAP = 285;
const MIN_ROW_GAP = 18;
const LEFT_PADDING = 28;
const TOP_PADDING = 44;
const SOURCE_ROW_GAP = CARD_HEIGHT + 14;

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

function buildVerticalPositions(
  matches: DrawMatch[],
  columns: ReturnType<typeof buildFullPyramidColumns>,
  edges: DrawEdge[],
) {
  const yByMatch = new Map<number, number>();
  const inboundByTarget = new Map<number, DrawEdge[]>();

  edges.forEach((edge) => {
    const current = inboundByTarget.get(edge.to);
    if (current) {
      current.push(edge);
      return;
    }
    inboundByTarget.set(edge.to, [edge]);
  });

  const orderedMatches = matches
    .filter((match): match is DrawMatch & { globalMatchNumber: number } =>
      match.globalMatchNumber !== null,
    )
    .sort((a, b) => a.globalMatchNumber - b.globalMatchNumber);

  const sourceMatches = orderedMatches.filter(
    (match) => !inboundByTarget.has(match.globalMatchNumber),
  );

  sourceMatches.forEach((match, index) => {
    yByMatch.set(match.globalMatchNumber, TOP_PADDING + index * SOURCE_ROW_GAP);
  });

  let progress = true;
  while (progress) {
    progress = false;
    orderedMatches.forEach((match) => {
      if (yByMatch.has(match.globalMatchNumber)) return;
      const inbound = inboundByTarget.get(match.globalMatchNumber) ?? [];
      if (!inbound.length) return;
      const sourceYs = inbound
        .map((edge) => yByMatch.get(edge.from))
        .filter((value): value is number => typeof value === "number");
      if (sourceYs.length !== inbound.length) return;
      const average = sourceYs.reduce((sum, value) => sum + value, 0) / sourceYs.length;
      yByMatch.set(match.globalMatchNumber, average);
      progress = true;
    });
  }

  let fallbackY =
    (sourceMatches.length ? TOP_PADDING + sourceMatches.length * SOURCE_ROW_GAP : TOP_PADDING) +
    40;
  orderedMatches.forEach((match) => {
    if (yByMatch.has(match.globalMatchNumber)) return;
    yByMatch.set(match.globalMatchNumber, fallbackY);
    fallbackY += SOURCE_ROW_GAP;
  });

  const normalized = new Map<number, number>();
  columns.forEach((column) => {
    const preliminary = column.matches.map(
      (match) => yByMatch.get(match.globalMatchNumber ?? -1) ?? TOP_PADDING,
    );
    const spaced = normalizeSpacing(preliminary, CARD_HEIGHT + MIN_ROW_GAP);
    column.matches
      .slice()
      .sort((a, b) => {
        const left = yByMatch.get(a.globalMatchNumber ?? -1) ?? TOP_PADDING;
        const right = yByMatch.get(b.globalMatchNumber ?? -1) ?? TOP_PADDING;
        return left - right;
      })
      .forEach((match, index) => {
        if (match.globalMatchNumber !== null) {
          normalized.set(match.globalMatchNumber, spaced[index]);
        }
      });
  });

  return normalized;
}

function formatHeaderMeta(value: string | null) {
  if (!value) return "T?";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "T?";
  const weekday = parsed.toLocaleDateString("en-US", { weekday: "short" });
  const time = parsed.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${weekday} ${time}`;
}

function getWinnerSlot(match: DrawMatch) {
  const left = match.player1Points;
  const right = match.player2Points;
  if (left === null || right === null) return null;
  if (left > right) return 1;
  if (right > left) return 2;
  return null;
}

function buildConnectorPath(
  from: DOMRect,
  to: DOMRect,
  canvas: DOMRect,
  slot: number | null,
) {
  const startX = from.right - canvas.left;
  const startY = from.top - canvas.top + CARD_HEIGHT / 2;
  const endX = to.left - canvas.left;
  const endY =
    to.top -
    canvas.top +
    HEADER_HEIGHT +
    (slot === 2 ? PLAYER_ROW_HEIGHT * 1.5 : PLAYER_ROW_HEIGHT * 0.5);
  const trunkX = startX + Math.max(18, (endX - startX) / 2);
  return `M ${startX} ${startY} H ${trunkX} V ${endY} H ${endX}`;
}

function MatchCard({
  match,
  assignRef,
}: {
  match: PositionedMatch;
  assignRef: (id: string, element: HTMLDivElement | null) => void;
}) {
  const winnerSlot = getWinnerSlot(match);
  const loserRoute = match.loserToGlobalMatchNumber
    ? `Loser to #${match.loserToGlobalMatchNumber}`
    : "Eliminated";
  const score1 = match.player1Points === null ? "-" : String(match.player1Points);
  const score2 = match.player2Points === null ? "-" : String(match.player2Points);
  const player1Flag = getCountryFlagCdnUrl(match.player1Country ?? null, 40);
  const player2Flag = getCountryFlagCdnUrl(match.player2Country ?? null, 40);

  return (
    <div
      ref={(element) => assignRef(match.documentId, element)}
      className={`cs-match ${match.status}`}
      style={{ left: `${match.x}px`, top: `${match.y}px` }}
    >
      <div className="cs-header">
        <span className="cs-matchno">
          Match {match.globalMatchNumber ?? match.matchNumber ?? match.matchIndex}
        </span>
        <span className="cs-header-meta">{formatHeaderMeta(match.dateTime)}</span>
      </div>

      <div
        className={`cs-flowchart-participant-line ${winnerSlot === 1 ? "is-winner" : winnerSlot === 2 ? "is-loser" : ""}`}
      >
        <div className="cs-player-line">
          {player1Flag ? (
            <img
              src={player1Flag}
              alt={match.player1Country || "flag"}
              className="cs-player-flag"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : null}
          <span className="cs-player-name">{match.player1Name || "TBD"}</span>
        </div>
        <div className="cs-score">{score1}</div>
      </div>

      <div
        className={`cs-flowchart-participant-line ${winnerSlot === 2 ? "is-winner" : winnerSlot === 1 ? "is-loser" : ""}`}
      >
        <div className="cs-player-line">
          {player2Flag ? (
            <img
              src={player2Flag}
              alt={match.player2Country || "flag"}
              className="cs-player-flag"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : null}
          <span className="cs-player-name">{match.player2Name || "TBD"}</span>
        </div>
        <div className="cs-score">{score2}</div>
      </div>

      <div className="cs-footer">{loserRoute}</div>
    </div>
  );
}

export default function CustomFlowchartClient({
  eventDocumentId,
  tournamentSlug,
  tournamentTitle,
  breadcrumbParentLabel = "Tournaments",
  breadcrumbParentHref = "/tournaments",
  showDebugInfo = false,
}: Props) {
  const [zoom, setZoom] = useState(0.5);
  const [eventData, setEventData] = useState<EventApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [connectors, setConnectors] = useState<ConnectorPath[]>([]);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef(new Map<string, HTMLDivElement | null>());

  useEffect(() => {
    if (!eventDocumentId) {
      setEventData(null);
      setError("Event id was not resolved.");
      return;
    }
    setLoading(true);
    setError(null);
    fetchEvent(eventDocumentId)
      .then((data) => {
        setEventData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to fetch event");
        setLoading(false);
      });
  }, [eventDocumentId]);

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
      stages.find((stage) => stage.stageType === "double_elimination") || stages[0];
    setActiveStageId((current) =>
      current && stages.some((stage) => stage.documentId === current)
        ? current
        : preferred.documentId,
    );
  }, [stages]);

  const activeStage = useMemo(() => {
    if (!activeStageId) return null;
    return stages.find((stage) => stage.documentId === activeStageId) ?? null;
  }, [activeStageId, stages]);

  const drawMatches = useMemo(() => buildDrawMatches(activeStage?.raw ?? null), [activeStage]);

  const layout = useMemo(() => {
    const columns = buildFullPyramidColumns(drawMatches);
    const edges = buildDrawEdges(drawMatches);
    const placed = new Map<number, PositionedMatch>();
    const yByMatch = buildVerticalPositions(drawMatches, columns, edges);

    columns.forEach((column, columnIndex) => {
      const x = LEFT_PADDING + columnIndex * COLUMN_GAP;
      column.matches.forEach((match) => {
        if (match.globalMatchNumber === null) return;
        placed.set(match.globalMatchNumber, {
          ...match,
          x,
          y: yByMatch.get(match.globalMatchNumber) ?? TOP_PADDING,
        });
      });
    });

    const allMatches = Array.from(placed.values());
    const maxY = allMatches.reduce((max, match) => Math.max(max, match.y), TOP_PADDING);

    return {
      columns: columns.map((column, columnIndex) => ({
        key: column.key,
        label: column.label,
        x: LEFT_PADDING + columnIndex * COLUMN_GAP,
      })),
      matches: allMatches,
      width: LEFT_PADDING + columns.length * COLUMN_GAP + CARD_WIDTH + 40,
      height: maxY + CARD_HEIGHT + 80,
    };
  }, [drawMatches]);

  useLayoutEffect(() => {
    const rebuild = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      const byGlobal = new Map<number, PositionedMatch>();
      layout.matches.forEach((match) => {
        if (match.globalMatchNumber) byGlobal.set(match.globalMatchNumber, match);
      });

      const paths: ConnectorPath[] = [];
      buildDrawEdges(drawMatches).forEach((edge) => {
        const fromMatch = byGlobal.get(edge.from);
        const toMatch = byGlobal.get(edge.to);
        if (!fromMatch || !toMatch) return;
        const fromNode = nodeRefs.current.get(fromMatch.documentId);
        const toNode = nodeRefs.current.get(toMatch.documentId);
        if (!fromNode || !toNode) return;
        paths.push({
          key: `${edge.from}-${edge.type}-${edge.to}-${edge.slot ?? "x"}`,
          d: buildConnectorPath(
            fromNode.getBoundingClientRect(),
            toNode.getBoundingClientRect(),
            canvasRect,
            edge.slot,
          ),
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

  useEffect(() => {
    let curYPos = 0;
    let curXPos = 0;
    let curDown = false;

    const onMouseMove = (event: MouseEvent) => {
      if (!curDown) return;
      document.documentElement.scrollTop =
        document.documentElement.scrollTop + (curYPos - event.pageY);
      document.documentElement.scrollLeft =
        document.documentElement.scrollLeft + (curXPos - event.pageX);
      curYPos = event.pageY;
      curXPos = event.pageX;
    };

    const onMouseDown = (event: MouseEvent) => {
      curDown = true;
      curYPos = event.pageY;
      curXPos = event.pageX;
      event.preventDefault();
    };

    const onMouseUp = () => {
      curDown = false;
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const assignNodeRef = (id: string, element: HTMLDivElement | null) => {
    nodeRefs.current.set(id, element);
  };

  return (
    <>
      <style jsx global>{FLOWCHART_CSS}</style>

      <div className="breadcrumbs">
        <a href="/">BILLIARD TODAY</a>
        <a href={breadcrumbParentHref}>{breadcrumbParentLabel}</a>
        <a href={`/tournaments/${tournamentSlug}`}>{tournamentTitle}</a>
        <span>Flowchart</span>
      </div>

      {showDebugInfo ? (
        <div className="px-2 pb-2 text-xs text-slate-500">
          Production event documentId: {eventDocumentId ?? "not resolved"}
        </div>
      ) : null}

      {stages.length > 1 ? (
        <div className="bt-stage-bar">
          <span className="bt-stage-label">Stage</span>
          <select
            className="bt-stage-select"
            value={activeStageId ?? ""}
            onChange={(event) => setActiveStageId(event.target.value)}
          >
            {stages.map((stage) => (
              <option key={stage.documentId} value={stage.documentId}>
                {stage.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div id="ButtonBar" className="noPrint">
        <div className="zoom">
          <button
            type="button"
            className="input out"
            onClick={() =>
              setZoom((value) => Math.max(0.3, Number((value - 0.1).toFixed(1))))
            }
          >
            -
          </button>
          <div className="value">{Math.round(zoom * 100)}%</div>
          <button
            type="button"
            className="input in"
            onClick={() =>
              setZoom((value) => Math.min(1.8, Number((value + 0.1).toFixed(1))))
            }
          >
            +
          </button>
        </div>
      </div>

      <div id="Content">
        {loading ? <div className="bt-flowchart-empty">Loading flowchart...</div> : null}
        {error ? <div className="bt-flowchart-empty">{error}</div> : null}
        {!loading && !error && !drawMatches.length ? (
          <div className="bt-flowchart-empty">No double-elimination matches found.</div>
        ) : null}

        {!loading && !error && drawMatches.length ? (
          <div className="cs-flowchart-shell" style={{ transform: `scale(${zoom})` }}>
            <div
              ref={canvasRef}
              className="cs-flowchart-grid"
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
                    stroke="#314f98"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </svg>

              {layout.columns.map((column) => (
                <div
                  key={column.key}
                  className="cs-round-column"
                  style={{ left: `${column.x}px` }}
                >
                  <div className="cs-round-header">{column.label}</div>
                </div>
              ))}

              {layout.matches.map((match) => (
                <MatchCard
                  key={match.documentId}
                  match={match}
                  assignRef={assignNodeRef}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
