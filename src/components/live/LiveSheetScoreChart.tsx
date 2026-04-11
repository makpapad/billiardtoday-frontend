"use client";

import React from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type LiveScoreChartInningDetailEntry = {
  inning: number;
  player1?: { pt: number; tot: number };
  player2?: { pt: number; tot: number };
};

export type LiveScoreChartRow = {
  inn: number;
  innings: number;
  p1Run: number;
  p2Run: number;
  p1Tot: number;
  p2Tot: number;
  p1Acc: number;
  p2Acc: number;
};

type BuildLiveScoreChartRowsInput = {
  inningsDetail?: LiveScoreChartInningDetailEntry[] | null;
  inningsCount?: number | null;
  inningsA?: number | null;
  inningsB?: number | null;
  scoreA?: number | null;
  scoreB?: number | null;
  ended?: boolean;
};

type LiveSheetScoreChartProps = {
  className?: string;
  data: LiveScoreChartRow[];
  height?: number | string;
  noAnim?: boolean;
  playerAName: string;
  playerBName: string;
};

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Number(value.toFixed(2))));
}

function computeAccuracy(points: number, innings: number, isWinner: boolean, isDraw: boolean) {
  if (points < 0 || innings < 0) return 0;
  const adjInnings = !isDraw && isWinner ? Math.max(0, innings - 1) : innings;
  const denom = points + adjInnings;
  if (denom <= 0) return 0;
  return clampPercent((points / denom) * 100);
}

function toPositiveInt(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.max(0, Math.trunc(parsed));
}

function toNonNegative(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

export function buildLiveScoreChartRows({
  inningsDetail,
  inningsCount,
  inningsA,
  inningsB,
  scoreA,
  scoreB,
  ended,
}: BuildLiveScoreChartRowsInput): LiveScoreChartRow[] {
  const detail = Array.isArray(inningsDetail)
    ? [...inningsDetail]
        .filter((entry) => Number.isFinite(entry?.inning) && entry.inning > 0)
        .sort((a, b) => a.inning - b.inning)
    : [];

  const detailByInning = new Map<number, LiveScoreChartInningDetailEntry>();
  for (const entry of detail) {
    detailByInning.set(Math.max(1, Math.trunc(entry.inning)), entry);
  }

  const lastDetailInning = detail.reduce((max, entry) => Math.max(max, toPositiveInt(entry.inning)), 0);
  const totalInnings = Math.max(
    1,
    toPositiveInt(inningsCount),
    toPositiveInt(inningsA),
    toPositiveInt(inningsB),
    lastDetailInning,
  );

  const rows: LiveScoreChartRow[] = [];
  let p1Tot = 0;
  let p2Tot = 0;

  for (let inning = 1; inning <= totalInnings; inning += 1) {
    const entry = detailByInning.get(inning);
    const p1Run = Math.max(0, toNonNegative(entry?.player1?.pt));
    const p2Run = Math.max(0, toNonNegative(entry?.player2?.pt));
    const entryP1Tot = toNonNegative(entry?.player1?.tot);
    const entryP2Tot = toNonNegative(entry?.player2?.tot);

    p1Tot = entryP1Tot > 0 ? entryP1Tot : p1Tot + p1Run;
    p2Tot = entryP2Tot > 0 ? entryP2Tot : p2Tot + p2Run;

    rows.push({
      inn: inning,
      innings: inning,
      p1Run,
      p2Run,
      p1Tot,
      p2Tot,
      p1Acc: 0,
      p2Acc: 0,
    });
  }

  if (rows.length === 0) return [];

  const finalScoreA = Math.max(rows[rows.length - 1]?.p1Tot ?? 0, toNonNegative(scoreA));
  const finalScoreB = Math.max(rows[rows.length - 1]?.p2Tot ?? 0, toNonNegative(scoreB));
  const lastRow = rows[rows.length - 1];
  if (finalScoreA > lastRow.p1Tot) {
    lastRow.p1Run += finalScoreA - lastRow.p1Tot;
    lastRow.p1Tot = finalScoreA;
  }
  if (finalScoreB > lastRow.p2Tot) {
    lastRow.p2Run += finalScoreB - lastRow.p2Tot;
    lastRow.p2Tot = finalScoreB;
  }

  const matchEnded = Boolean(ended);
  const isDraw = matchEnded && finalScoreA === finalScoreB;
  const winner: 1 | 2 | null =
    !matchEnded || isDraw ? null : finalScoreA > finalScoreB ? 1 : 2;

  rows.forEach((row, index) => {
    const isLast = index === rows.length - 1;
    row.p1Acc = computeAccuracy(row.p1Tot, row.innings, isLast && winner === 1, isDraw);
    row.p2Acc = computeAccuracy(row.p2Tot, row.innings, isLast && winner === 2, isDraw);
  });

  return rows;
}

export function LiveSheetScoreChart({
  className = "",
  data,
  height = 320,
  noAnim = false,
  playerAName,
  playerBName,
}: LiveSheetScoreChartProps) {
  const hasData = data.some(
    (row) => row.p1Run > 0 || row.p2Run > 0 || row.p1Tot > 0 || row.p2Tot > 0,
  );

  if (!hasData) {
    return (
      <div
        className={`flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/90 p-4 text-sm text-slate-500 shadow-xl shadow-black/10 ${className}`}
        style={{ height }}
      >
        No progression yet
      </div>
    );
  }

  return (
    <div
      className={`w-full rounded-2xl border border-black/5 bg-white p-4 shadow-xl shadow-black/15 ${className}`}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 16, right: 24, bottom: 10, left: 8 }}>
          <CartesianGrid stroke="#d1d5db" strokeDasharray="3 3" />
          <ReferenceLine y={10} yAxisId="left" stroke="#9ca3af" strokeDasharray="3 3" />
          <ReferenceLine y={20} yAxisId="left" stroke="#9ca3af" strokeDasharray="3 3" />
          <ReferenceLine y={30} yAxisId="left" stroke="#9ca3af" strokeDasharray="3 3" />
          <XAxis
            dataKey="inn"
            stroke="#64748b"
            tickLine={false}
            label={{ value: "INNINGS", position: "insideBottom", offset: -4 }}
          />
          <YAxis
            yAxisId="left"
            stroke="#64748b"
            tickLine={false}
            label={{ value: "TOTAL POINTS", angle: -90, position: "insideLeft" }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#64748b"
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            label={{ value: "ACCURACY %", angle: 90, position: "insideRight" }}
          />
          <Tooltip
            labelFormatter={(label) => `Inning: ${label}`}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid rgba(148, 163, 184, 0.35)",
              boxShadow: "0 12px 30px rgba(15, 23, 42, 0.18)",
            }}
          />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="p1Run"
            name={`${playerAName} (run)`}
            fill="#d32f2f"
            isAnimationActive={!noAnim}
          />
          <Bar
            yAxisId="left"
            dataKey="p2Run"
            name={`${playerBName} (run)`}
            fill="#03a9f4"
            isAnimationActive={!noAnim}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="p1Tot"
            name={`${playerAName} (total)`}
            stroke="#d32f2f"
            strokeWidth={3}
            dot={false}
            activeDot={false}
            isAnimationActive={!noAnim}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="p2Tot"
            name={`${playerBName} (total)`}
            stroke="#03a9f4"
            strokeWidth={3}
            dot={false}
            activeDot={false}
            isAnimationActive={!noAnim}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="p1Acc"
            name={`${playerAName} (accuracy %)`}
            stroke="#d32f2f"
            strokeWidth={1}
            dot={false}
            activeDot={false}
            isAnimationActive={!noAnim}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="p2Acc"
            name={`${playerBName} (accuracy %)`}
            stroke="#03a9f4"
            strokeWidth={1}
            dot={false}
            activeDot={false}
            isAnimationActive={!noAnim}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
