"use client";

import type { LiveSessionItem } from "@/components/live/types";

const numberFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

const formatAverage = (value?: string | number | null) => {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return numberFormat.format(value);
  return "--";
};

const formatUpdatedAt = (value?: string | null) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleTimeString("el-GR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const playerInitials = (name?: string) => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
};

function PlayerAvatar({ name, photoUrl }: { name?: string; photoUrl?: string | null }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name || "Player"}
        className="h-12 w-12 rounded-2xl border border-white/10 object-cover shadow-sm"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700">
      {playerInitials(name)}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export function LiveScoreBoardCard({ item }: { item: LiveSessionItem }) {
  const { state } = item;
  const playerAActive = state.current === "A";
  const playerBActive = state.current === "B";
  const innings =
    state.inningsCount ??
    Math.max(state.inningsA || 0, state.inningsB || 0, 0);

  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_60px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
            Live scoreboard
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            {state.tournamentName || "Live match"}
          </h2>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            {state.stageName ? <span>{state.stageName}</span> : null}
            {state.groupName ? <span>{state.groupName}</span> : null}
            {state.tableName ? <span>Table {state.tableName}</span> : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
            {state.isRunning ? "Running" : "Waiting"}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
            Updated {formatUpdatedAt(item.updatedAt)}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div className={`rounded-[24px] border p-4 ${playerAActive ? "border-cyan-300 bg-cyan-50/70" : "border-slate-200 bg-slate-50/70"}`}>
          <div className="flex items-center gap-3">
            <PlayerAvatar name={state.playerAName} photoUrl={state.playerAPhotoUrl} />
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold text-slate-950">{state.playerAName || "Player A"}</div>
              <div className="truncate text-sm text-slate-500">{state.playerACountry || "Unknown country"}</div>
            </div>
          </div>
          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Score</div>
              <div className="mt-1 text-5xl font-black leading-none text-slate-950">{state.scoreA ?? 0}</div>
            </div>
            <div className="text-right text-sm text-slate-600">
              <div>Run: {state.liveRunA ?? state.runA ?? 0}</div>
              <div>Best: {state.bestRunA ?? "--"}</div>
            </div>
          </div>
        </div>

        <div className="grid min-w-[140px] gap-2">
          <StatPill label="Innings" value={innings || 0} />
          <StatPill label="AVG A" value={formatAverage(state.avgFormattedA)} />
          <StatPill label="AVG B" value={formatAverage(state.avgFormattedB)} />
        </div>

        <div className={`rounded-[24px] border p-4 ${playerBActive ? "border-amber-300 bg-amber-50/80" : "border-slate-200 bg-slate-50/70"}`}>
          <div className="flex items-center gap-3">
            <PlayerAvatar name={state.playerBName} photoUrl={state.playerBPhotoUrl} />
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold text-slate-950">{state.playerBName || "Player B"}</div>
              <div className="truncate text-sm text-slate-500">{state.playerBCountry || "Unknown country"}</div>
            </div>
          </div>
          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Score</div>
              <div className="mt-1 text-5xl font-black leading-none text-slate-950">{state.scoreB ?? 0}</div>
            </div>
            <div className="text-right text-sm text-slate-600">
              <div>Run: {state.liveRunB ?? state.runB ?? 0}</div>
              <div>Best: {state.bestRunB ?? "--"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatPill label="Club" value={item.clubName || "--"} />
        <StatPill label="City" value={item.clubCity || "--"} />
        <StatPill label="Federation" value={item.clubFederationName || "--"} />
        <StatPill label="Screen" value={item.screenId || item.sessionId} />
      </div>
    </article>
  );
}
