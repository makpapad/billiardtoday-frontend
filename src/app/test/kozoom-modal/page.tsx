"use client";

import { Play } from "lucide-react";

type TeamEntry = {
  name: string;
  logo: string;
  colors: string;
};

const leftTeams: TeamEntry[] = [
  { name: "BILLIARD TODAY", logo: "BT", colors: "from-sky-400 to-blue-700" },
  { name: "ATHENS ARENA", logo: "AA", colors: "from-emerald-300 to-teal-700" },
  { name: "PIRAEUS CLUB", logo: "PC", colors: "from-slate-200 to-slate-500" },
  { name: "THESSALONIKI", logo: "TH", colors: "from-lime-300 to-green-700" },
  { name: "PATRAS OPEN", logo: "PO", colors: "from-amber-300 to-orange-700" },
];

const rightTeams: TeamEntry[] = [
  { name: "CRETE MASTERS", logo: "CM", colors: "from-red-300 to-red-800" },
  { name: "LARISSA BC", logo: "LB", colors: "from-indigo-300 to-indigo-800" },
  { name: "VOLOS EIGHT", logo: "V8", colors: "from-fuchsia-300 to-purple-800" },
  { name: "KALAMATA", logo: "KA", colors: "from-cyan-300 to-cyan-800" },
  { name: "RHODES CLUB", logo: "RC", colors: "from-green-300 to-emerald-800" },
];

function TeamRow({
  team,
  side,
}: {
  team: TeamEntry;
  side: "left" | "right";
}) {
  const logo = (
    <span
      className={`grid h-9 w-11 shrink-0 place-items-center rounded bg-gradient-to-br ${team.colors} text-xs font-black text-white shadow`}
    >
      {team.logo}
    </span>
  );

  return (
    <div
      className={`flex h-12 items-center gap-3 bg-white/78 px-2 shadow-[0_8px_28px_rgba(0,0,0,0.22)] backdrop-blur-sm ${
        side === "left" ? "justify-start" : "justify-end"
      }`}
    >
      {side === "left" ? logo : null}
      <span className="min-w-0 flex-1 truncate text-center text-base font-black italic tracking-wide text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.55)] sm:text-lg">
        {team.name}
      </span>
      {side === "right" ? logo : null}
    </div>
  );
}

function PlayerFigure({
  side,
  name,
}: {
  side: "left" | "right";
  name: string;
}) {
  return (
    <div
      className={`absolute bottom-0 top-16 hidden w-[34%] opacity-70 md:block ${
        side === "left" ? "left-4" : "right-4"
      }`}
      aria-hidden="true"
    >
      <div
        className={`absolute bottom-0 h-[78%] w-[54%] rounded-t-full bg-slate-900/65 blur-[1px] ${
          side === "left" ? "left-10" : "right-10"
        }`}
      />
      <div
        className={`absolute top-0 h-20 w-20 rounded-full bg-slate-200/70 shadow-2xl ${
          side === "left" ? "left-[26%]" : "right-[26%]"
        }`}
      />
      <div
        className={`absolute bottom-0 h-[62%] w-[42%] rounded-t-[3rem] ${
          side === "left" ? "left-[16%] bg-blue-200/75" : "right-[16%] bg-sky-200/80"
        }`}
      />
      <span
        className={`absolute bottom-6 rounded bg-black/35 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white ${
          side === "left" ? "left-6" : "right-6"
        }`}
      >
        {name}
      </span>
    </div>
  );
}

function BroadcastCard() {
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[linear-gradient(105deg,#061a63_0%,#061a63_43%,#10162b_43%,#10162b_48%,#8f0014_48%,#8f0014_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_45%,rgba(37,99,235,0.82),transparent_28%),radial-gradient(circle_at_74%_48%,rgba(239,35,60,0.75),transparent_31%)]" />
      <div className="absolute left-[42%] top-0 h-full w-[10%] -skew-x-12 bg-black/28" />
      <div className="absolute left-[30%] top-0 h-full w-[16%] -skew-x-12 bg-blue-500/28" />
      <div className="absolute right-[28%] top-0 h-full w-[18%] -skew-x-12 bg-red-600/28" />

      <PlayerFigure side="left" name="Player A" />
      <PlayerFigure side="right" name="Player B" />

      <div className="absolute left-1/2 top-5 z-10 flex -translate-x-1/2 flex-col items-center text-center">
        <div className="text-xl font-black italic tracking-tight text-white drop-shadow sm:text-3xl">
          BILLIARD TODAY
        </div>
        <div className="mt-1 text-2xl font-black italic tracking-wide text-white drop-shadow sm:text-4xl">
          TOP LEAGUE 1
        </div>
        <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-black text-white shadow-lg sm:text-base">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20">
            <Play className="h-3.5 w-3.5 fill-white text-white" />
          </span>
          LIVE
        </div>
      </div>

      <div className="absolute inset-x-4 top-[33%] z-10 grid grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)] gap-3 sm:inset-x-10 sm:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)] sm:gap-7">
        <div className="space-y-3">
          {leftTeams.map((team) => (
            <TeamRow key={team.name} team={team} side="left" />
          ))}
        </div>

        <div className="flex items-center justify-center">
          <span className="text-5xl font-black italic text-white drop-shadow-[0_8px_8px_rgba(0,0,0,0.65)] sm:text-8xl">
            Vs
          </span>
        </div>

        <div className="space-y-3">
          {rightTeams.map((team) => (
            <TeamRow key={team.name} team={team} side="right" />
          ))}
        </div>
      </div>

      <div className="absolute bottom-5 right-5 z-10 text-xl font-black tracking-tight text-white drop-shadow sm:text-3xl">
        BILLIARD<span className="text-red-500">TODAY</span>
      </div>
    </div>
  );
}

export default function KozoomModalDummyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-1 text-sm font-semibold text-red-100">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Dummy live graphic
            </div>
            <h1 className="text-3xl font-black tracking-normal text-white sm:text-4xl">
              Broadcast page preview
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
              Data-driven dummy card with teams, logos, and a live label,
              rendered directly as a page.
            </p>
          </div>
          <p className="text-sm font-medium text-slate-400">
            Dummy teams are defined in this page component.
          </p>
        </header>

        <div className="overflow-hidden rounded-lg border border-white/15 bg-black shadow-2xl">
          <BroadcastCard />
        </div>
      </section>
    </main>
  );
}
