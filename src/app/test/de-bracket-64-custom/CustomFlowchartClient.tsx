"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EventApiResponse, StrapiEventStage } from "@/app/tournaments/events/types";
import { normalizeEntity, toRelationArray } from "@/app/tournaments/events/utils";
import { buildDrawEdges, buildDrawMatches, type DrawMatch } from "@/app/tournaments/events/draw/flowchartModel";
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
.cs-connector-piece { position: absolute; background: #314f98; pointer-events: none; }
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

type ConnectorPiece = {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: string;
};

type PreviewColumn = {
  key: string;
  label: string;
  x: number;
  matches: DrawMatch[];
};

type ConnectorDirection = "left" | "right";

const CARD_WIDTH = 250;
const CARD_HEIGHT = 96;
const HEADER_HEIGHT = 16;
const PLAYER_ROW_HEIGHT = 32;
const COLUMN_GAP = 285;
const LEFT_PADDING = 28;
const TOP_PADDING = 44;
const SOURCE_ROW_GAP = CARD_HEIGHT + 14;
const CONNECTOR_SOURCE_STUB_LEFT = 2;
const CONNECTOR_TARGET_STUB_LEFT = 0;
const CONNECTOR_SOURCE_STUB_RIGHT = 10;
const CONNECTOR_TARGET_STUB_RIGHT = 8;
const CONNECTOR_PAIR_SPAN_LEFT = 20;
const CONNECTOR_PAIR_SPAN_RIGHT = 20;
const CONNECTOR_RADIUS = 8;
const LOSERS_COMPACT_GAP = 260;
const CENTER_PREVIEW_GAP = 360;
const WINNERS_PREVIEW_GAP = 320;

const fetchEvent = async (eventId: string): Promise<EventApiResponse> => {
  const response = await fetch(`/api/events/${eventId}`, { cache: "no-store" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to fetch event");
  }
  return response.json();
};

function buildRoundOnePreviewColumns(matches: DrawMatch[]): PreviewColumn[] {
  const losersR2 = matches
    .filter((match) => match.roundLabel.trim().toUpperCase() === "LOSERS R2")
    .sort((a, b) => (a.globalMatchNumber ?? 9999) - (b.globalMatchNumber ?? 9999));
  const round1Matches = matches
    .filter((match) => match.roundLabel.trim().toUpperCase() === "WINNERS R1")
    .sort((a, b) => (a.globalMatchNumber ?? 9999) - (b.globalMatchNumber ?? 9999));
  const winnersR1Matches = matches
    .filter((match) => match.roundLabel.trim().toUpperCase() === "WINNERS R2")
    .sort((a, b) => (a.globalMatchNumber ?? 9999) - (b.globalMatchNumber ?? 9999));
  const losersR1 = matches
    .filter((match) => match.roundLabel.trim().toUpperCase() === "LOSERS R1")
    .sort((a, b) => (a.globalMatchNumber ?? 9999) - (b.globalMatchNumber ?? 9999));

  const losersR2X = LEFT_PADDING;
  const losersR1X = losersR2X + LOSERS_COMPACT_GAP;
  const round1X = losersR1X + CENTER_PREVIEW_GAP;
  const winnersR1X = round1X + WINNERS_PREVIEW_GAP;

  return [
    {
      key: "losers-r2",
      label: "Losers R2",
      x: losersR2X,
      matches: losersR2,
    },
    {
      key: "losers-r1",
      label: "Losers R1",
      x: losersR1X,
      matches: losersR1,
    },
    {
      key: "round-1",
      label: "Round 1",
      x: round1X,
      matches: round1Matches,
    },
    {
      key: "winners-r1",
      label: "Winners R1",
      x: winnersR1X,
      matches: winnersR1Matches,
    },
  ];
}

function buildRoundOnePreviewYMap(columns: PreviewColumn[]) {
  const yByMatch = new Map<number, number>();

  columns.forEach((column) => {
    if (column.key === "round-1") {
      column.matches.forEach((match, index) => {
        if (match.globalMatchNumber === null) return;
        yByMatch.set(match.globalMatchNumber, TOP_PADDING + index * SOURCE_ROW_GAP);
      });
      return;
    }

    if (column.key === "losers-r1") {
      column.matches.forEach((match, index) => {
        if (match.globalMatchNumber === null) return;
        const slotCenter = index * 2 + 0.5;
        yByMatch.set(match.globalMatchNumber, TOP_PADDING + slotCenter * SOURCE_ROW_GAP);
      });
      return;
    }

    if (column.key === "losers-r2") {
      column.matches.forEach((match, index) => {
        if (match.globalMatchNumber === null) return;
        const slotCenter = index * 2 + 0.5;
        yByMatch.set(match.globalMatchNumber, TOP_PADDING + slotCenter * SOURCE_ROW_GAP);
      });
      return;
    }

    if (column.key === "winners-r1") {
      column.matches.forEach((match, index) => {
        if (match.globalMatchNumber === null) return;
        const slotCenter = index * 2 + 0.5;
        yByMatch.set(match.globalMatchNumber, TOP_PADDING + slotCenter * SOURCE_ROW_GAP);
      });
    }
  });

  return yByMatch;
}

function formatHeaderMeta(value: string | null) {
  if (!value) return "T?";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "T?";
  const weekday = parsed.toLocaleDateString("en-US", { weekday: "short" });
  const time = parsed.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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
  fromTop: PositionedMatch,
  fromBottom: PositionedMatch,
  to: PositionedMatch,
  direction: ConnectorDirection,
) {
  const sourceY1 = fromTop.y + CARD_HEIGHT / 2;
  const sourceY2 = fromBottom.y + CARD_HEIGHT / 2;
  const middleY = (sourceY1 + sourceY2) / 2;
  const targetSlot1Y = to.y + HEADER_HEIGHT + PLAYER_ROW_HEIGHT / 2;
  const targetSlot2Y = to.y + HEADER_HEIGHT + PLAYER_ROW_HEIGHT * 1.5;

  if (direction === "left") {
    const sourceX = fromTop.x;
    const sourceStubX = sourceX - CONNECTOR_SOURCE_STUB_LEFT;
    const targetX = to.x + CARD_WIDTH;
    const targetJoinX = targetX + CONNECTOR_TARGET_STUB_LEFT;
    const trunkX = targetJoinX + CONNECTOR_PAIR_SPAN_LEFT;

    return [
      buildRoundedPolyline(
        [
          { x: sourceX, y: sourceY1 },
          { x: sourceStubX, y: sourceY1 },
          { x: trunkX, y: sourceY1 },
          { x: trunkX, y: middleY },
        ],
        CONNECTOR_RADIUS,
      ),
      buildRoundedPolyline(
        [
          { x: sourceX, y: sourceY2 },
          { x: sourceStubX, y: sourceY2 },
          { x: trunkX, y: sourceY2 },
          { x: trunkX, y: middleY },
        ],
        CONNECTOR_RADIUS,
      ),
      buildRoundedPolyline(
        [
          { x: trunkX, y: middleY },
          { x: targetJoinX, y: middleY },
        ],
        CONNECTOR_RADIUS,
      ),
      buildRoundedPolyline(
        [
          { x: targetJoinX, y: middleY },
          { x: targetJoinX, y: targetSlot1Y },
          { x: targetX, y: targetSlot1Y },
        ],
        CONNECTOR_RADIUS,
      ),
      buildRoundedPolyline(
        [
          { x: targetJoinX, y: middleY },
          { x: targetJoinX, y: targetSlot2Y },
          { x: targetX, y: targetSlot2Y },
        ],
        CONNECTOR_RADIUS,
      ),
    ].join(" ");
  }

  const sourceX = fromTop.x + CARD_WIDTH;
  const sourceStubX = sourceX + CONNECTOR_SOURCE_STUB_RIGHT;
  const targetX = to.x;
  const targetJoinX = targetX - CONNECTOR_TARGET_STUB_RIGHT;
  const trunkX = targetJoinX - CONNECTOR_PAIR_SPAN_RIGHT;

  return [
    buildRoundedPolyline(
      [
        { x: sourceX, y: sourceY1 },
        { x: sourceStubX, y: sourceY1 },
        { x: trunkX, y: sourceY1 },
        { x: trunkX, y: middleY },
      ],
      CONNECTOR_RADIUS,
    ),
    buildRoundedPolyline(
      [
        { x: sourceX, y: sourceY2 },
        { x: sourceStubX, y: sourceY2 },
        { x: trunkX, y: sourceY2 },
        { x: trunkX, y: middleY },
      ],
      CONNECTOR_RADIUS,
    ),
    buildRoundedPolyline(
      [
        { x: trunkX, y: middleY },
        { x: targetJoinX, y: middleY },
      ],
      CONNECTOR_RADIUS,
    ),
    buildRoundedPolyline(
      [
        { x: targetJoinX, y: middleY },
        { x: targetJoinX, y: targetSlot1Y },
        { x: targetX, y: targetSlot1Y },
      ],
      CONNECTOR_RADIUS,
    ),
    buildRoundedPolyline(
      [
        { x: targetJoinX, y: middleY },
        { x: targetJoinX, y: targetSlot2Y },
        { x: targetX, y: targetSlot2Y },
      ],
      CONNECTOR_RADIUS,
    ),
  ].join(" ");
}

function buildRoundedPolyline(
  points: Array<{ x: number; y: number }>,
  radius: number,
) {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let index = 1; index < points.length - 1; index += 1) {
    const prev = points[index - 1];
    const current = points[index];
    const next = points[index + 1];

    const incomingDx = current.x - prev.x;
    const incomingDy = current.y - prev.y;
    const outgoingDx = next.x - current.x;
    const outgoingDy = next.y - current.y;

    const incomingLength = Math.hypot(incomingDx, incomingDy);
    const outgoingLength = Math.hypot(outgoingDx, outgoingDy);

    if (!incomingLength || !outgoingLength) {
      d += ` L ${current.x} ${current.y}`;
      continue;
    }

    const isCorner =
      Math.sign(incomingDx) !== Math.sign(outgoingDx) ||
      Math.sign(incomingDy) !== Math.sign(outgoingDy);

    if (!isCorner) {
      d += ` L ${current.x} ${current.y}`;
      continue;
    }

    const cornerRadius = Math.min(radius, incomingLength / 2, outgoingLength / 2);
    const entryX = current.x - (incomingDx / incomingLength) * cornerRadius;
    const entryY = current.y - (incomingDy / incomingLength) * cornerRadius;
    const exitX = current.x + (outgoingDx / outgoingLength) * cornerRadius;
    const exitY = current.y + (outgoingDy / outgoingLength) * cornerRadius;

    d += ` L ${entryX} ${entryY} Q ${current.x} ${current.y} ${exitX} ${exitY}`;
  }

  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function buildSingleConnectorPath(
  from: PositionedMatch,
  to: PositionedMatch,
  direction: ConnectorDirection,
  slot: number | null,
) {
  const fromY = from.y + CARD_HEIGHT / 2;
  const targetY =
    to.y + HEADER_HEIGHT + PLAYER_ROW_HEIGHT * ((slot ?? 1) - 0.5);

  if (direction === "left") {
    const sourceX = from.x;
    const sourceJoinX = sourceX - CONNECTOR_SOURCE_STUB_LEFT;
    const targetX = to.x + CARD_WIDTH;
    const targetJoinX = targetX + CONNECTOR_TARGET_STUB_LEFT;

    return buildRoundedPolyline(
      [
        { x: sourceX, y: fromY },
        { x: sourceJoinX, y: fromY },
        { x: sourceJoinX, y: targetY },
        { x: targetJoinX, y: targetY },
        { x: targetX, y: targetY },
      ],
      CONNECTOR_RADIUS,
    );
  }

  const sourceX = from.x + CARD_WIDTH;
  const sourceJoinX = sourceX + CONNECTOR_SOURCE_STUB_RIGHT;
  const targetX = to.x;
  const targetJoinX = targetX - CONNECTOR_TARGET_STUB_RIGHT;

  return buildRoundedPolyline(
    [
      { x: sourceX, y: fromY },
      { x: sourceJoinX, y: fromY },
      { x: sourceJoinX, y: targetY },
      { x: targetJoinX, y: targetY },
      { x: targetX, y: targetY },
    ],
    CONNECTOR_RADIUS,
  );
}

function addHorizontalPiece(
  pieces: ConnectorPiece[],
  key: string,
  x1: number,
  x2: number,
  y: number,
) {
  const left = Math.min(x1, x2);
  const width = Math.max(Math.abs(x2 - x1), 2);
  pieces.push({ key, x: left, y: y - 1, width, height: 2, radius: "999px" });
}

function addVerticalPiece(
  pieces: ConnectorPiece[],
  key: string,
  x: number,
  y1: number,
  y2: number,
) {
  const top = Math.min(y1, y2);
  const height = Math.max(Math.abs(y2 - y1), 2);
  pieces.push({ key, x: x - 1, y: top, width: 2, height, radius: "999px" });
}

function buildPairConnectorPieces(
  fromTop: PositionedMatch,
  fromBottom: PositionedMatch,
  to: PositionedMatch,
  direction: ConnectorDirection,
  keyPrefix: string,
) {
  const pieces: ConnectorPiece[] = [];
  const sourceY1 = fromTop.y + CARD_HEIGHT / 2;
  const sourceY2 = fromBottom.y + CARD_HEIGHT / 2;
  const middleY = (sourceY1 + sourceY2) / 2;
  const targetSlot1Y = to.y + HEADER_HEIGHT + PLAYER_ROW_HEIGHT / 2;
  const targetSlot2Y = to.y + HEADER_HEIGHT + PLAYER_ROW_HEIGHT * 1.5;

  if (direction === "left") {
    const sourceX = fromTop.x;
    const sourceStubX = sourceX - CONNECTOR_SOURCE_STUB_LEFT;
    const targetX = to.x + CARD_WIDTH;
    const targetJoinX = targetX + CONNECTOR_TARGET_STUB_LEFT;
    const trunkX = targetJoinX + CONNECTOR_PAIR_SPAN_LEFT;

    addHorizontalPiece(pieces, `${keyPrefix}-h1a`, sourceX, sourceStubX, sourceY1);
    addHorizontalPiece(pieces, `${keyPrefix}-h1b`, sourceStubX, trunkX, sourceY1);
    addHorizontalPiece(pieces, `${keyPrefix}-h2a`, sourceX, sourceStubX, sourceY2);
    addHorizontalPiece(pieces, `${keyPrefix}-h2b`, sourceStubX, trunkX, sourceY2);
    addVerticalPiece(pieces, `${keyPrefix}-vsrc`, trunkX, sourceY1, sourceY2);
    addHorizontalPiece(pieces, `${keyPrefix}-mid`, trunkX, targetJoinX, middleY);
    addVerticalPiece(pieces, `${keyPrefix}-vtgt`, targetJoinX, targetSlot1Y, targetSlot2Y);
    addHorizontalPiece(pieces, `${keyPrefix}-ht1`, targetJoinX, targetX, targetSlot1Y);
    addHorizontalPiece(pieces, `${keyPrefix}-ht2`, targetJoinX, targetX, targetSlot2Y);
    return pieces;
  }

  const sourceX = fromTop.x + CARD_WIDTH;
  const sourceStubX = sourceX + CONNECTOR_SOURCE_STUB_RIGHT;
  const targetX = to.x;
  const targetJoinX = targetX - CONNECTOR_TARGET_STUB_RIGHT;
  const trunkX = targetJoinX - CONNECTOR_PAIR_SPAN_RIGHT;

  addHorizontalPiece(pieces, `${keyPrefix}-h1a`, sourceX, sourceStubX, sourceY1);
  addHorizontalPiece(pieces, `${keyPrefix}-h1b`, sourceStubX, trunkX, sourceY1);
  addHorizontalPiece(pieces, `${keyPrefix}-h2a`, sourceX, sourceStubX, sourceY2);
  addHorizontalPiece(pieces, `${keyPrefix}-h2b`, sourceStubX, trunkX, sourceY2);
  addVerticalPiece(pieces, `${keyPrefix}-vsrc`, trunkX, sourceY1, sourceY2);
  addHorizontalPiece(pieces, `${keyPrefix}-mid`, trunkX, targetJoinX, middleY);
  addVerticalPiece(pieces, `${keyPrefix}-vtgt`, targetJoinX, targetSlot1Y, targetSlot2Y);
  addHorizontalPiece(pieces, `${keyPrefix}-ht1`, targetJoinX, targetX, targetSlot1Y);
  addHorizontalPiece(pieces, `${keyPrefix}-ht2`, targetJoinX, targetX, targetSlot2Y);
  return pieces;
}

function buildSingleConnectorPieces(
  from: PositionedMatch,
  to: PositionedMatch,
  direction: ConnectorDirection,
  slot: number | null,
  keyPrefix: string,
) {
  const pieces: ConnectorPiece[] = [];
  const fromY = from.y + CARD_HEIGHT / 2;
  const targetY = to.y + HEADER_HEIGHT + PLAYER_ROW_HEIGHT * ((slot ?? 1) - 0.5);

  if (direction === "left") {
    const sourceX = from.x;
    const sourceJoinX = sourceX - CONNECTOR_SOURCE_STUB_LEFT;
    const targetX = to.x + CARD_WIDTH;
    const targetJoinX = targetX + CONNECTOR_TARGET_STUB_LEFT;
    addHorizontalPiece(pieces, `${keyPrefix}-h1`, sourceX, sourceJoinX, fromY);
    addVerticalPiece(pieces, `${keyPrefix}-v`, sourceJoinX, fromY, targetY);
    addHorizontalPiece(pieces, `${keyPrefix}-h2`, sourceJoinX, targetJoinX, targetY);
    addHorizontalPiece(pieces, `${keyPrefix}-h3`, targetJoinX, targetX, targetY);
    return pieces;
  }

  const sourceX = from.x + CARD_WIDTH;
  const sourceJoinX = sourceX + CONNECTOR_SOURCE_STUB_RIGHT;
  const targetX = to.x;
  const targetJoinX = targetX - CONNECTOR_TARGET_STUB_RIGHT;
  addHorizontalPiece(pieces, `${keyPrefix}-h1`, sourceX, sourceJoinX, fromY);
  addVerticalPiece(pieces, `${keyPrefix}-v`, sourceJoinX, fromY, targetY);
  addHorizontalPiece(pieces, `${keyPrefix}-h2`, sourceJoinX, targetJoinX, targetY);
  addHorizontalPiece(pieces, `${keyPrefix}-h3`, targetJoinX, targetX, targetY);
  return pieces;
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
    const columns = buildRoundOnePreviewColumns(drawMatches);
    const placed = new Map<number, PositionedMatch>();
    const yByMatch = buildRoundOnePreviewYMap(columns);

    columns.forEach((column) => {
      column.matches.forEach((match) => {
        if (match.globalMatchNumber === null) return;
        placed.set(match.globalMatchNumber, {
          ...match,
          x: column.x,
          y: yByMatch.get(match.globalMatchNumber) ?? TOP_PADDING,
        });
      });
    });

    const allMatches = Array.from(placed.values());
    const maxY = TOP_PADDING + 31 * SOURCE_ROW_GAP;

    return {
      columns: columns.map((column) => ({
        key: column.key,
        label: column.label,
        x: column.x,
      })),
      matches: allMatches,
      width: Math.max(...columns.map((column) => column.x)) + CARD_WIDTH + 180,
      height: maxY + CARD_HEIGHT + 80,
    };
  }, [drawMatches]);

  const connectors = useMemo(() => {
    const byGlobal = new Map<number, PositionedMatch>();
    layout.matches.forEach((match) => {
      if (match.globalMatchNumber) byGlobal.set(match.globalMatchNumber, match);
    });
    const visibleTargets = new Set(layout.matches.map((match) => match.globalMatchNumber));
    const visibleEdges = buildDrawEdges(drawMatches).filter(
      (edge) => visibleTargets.has(edge.from) && visibleTargets.has(edge.to),
    );
    const inboundByTarget = new Map<number, typeof visibleEdges>();

    visibleEdges.forEach((edge) => {
      const current = inboundByTarget.get(edge.to);
      if (current) {
        current.push(edge);
        return;
      }
      inboundByTarget.set(edge.to, [edge]);
    });

    const pieces: ConnectorPiece[] = [];
    inboundByTarget.forEach((edges, target) => {
      const targetMatch = byGlobal.get(target);
      if (!targetMatch) return;
      const targetRound = targetMatch.roundLabel.trim().toUpperCase();

      if (targetRound === "LOSERS R1" || targetRound === "WINNERS R2") {
        if (edges.length < 2) return;
        const orderedSources = edges
          .map((edge) => edge.from)
          .slice()
          .sort((a, b) => a - b);
        const topMatch = byGlobal.get(orderedSources[0]);
        const bottomMatch = byGlobal.get(orderedSources[1]);
        if (!topMatch || !bottomMatch) return;
        const direction: ConnectorDirection =
          targetMatch.x < topMatch.x ? "left" : "right";
        pieces.push(
          ...buildPairConnectorPieces(
            topMatch,
            bottomMatch,
            targetMatch,
            direction,
            `${orderedSources[0]}-${orderedSources[1]}-to-${target}`,
          ),
        );
        return;
      }

      if (targetRound === "LOSERS R2") {
        edges.forEach((edge) => {
          const sourceMatch = byGlobal.get(edge.from);
          if (!sourceMatch) return;
          const direction: ConnectorDirection =
            targetMatch.x < sourceMatch.x ? "left" : "right";
          pieces.push(
            ...buildSingleConnectorPieces(
              sourceMatch,
              targetMatch,
              direction,
              edge.slot,
              `${edge.from}-to-${target}-slot-${edge.slot ?? "x"}`,
            ),
          );
        });
      }
    });
    return pieces;
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

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0, behavior: "auto" });
  }, [activeStageId, layout.width]);

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
              className="cs-flowchart-grid"
              style={{ width: `${layout.width}px`, height: `${layout.height}px` }}
            >
              {connectors.map((piece) => (
                <div
                  key={piece.key}
                  className="cs-connector-piece"
                  style={{
                    left: `${piece.x}px`,
                    top: `${piece.y}px`,
                    width: `${piece.width}px`,
                    height: `${piece.height}px`,
                    borderRadius: piece.radius,
                  }}
                />
              ))}

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
