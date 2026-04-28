import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  CircleDot,
  Clock3,
  MapPin,
  ShieldCheck,
  Trophy,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Account Mockup",
};

const player = {
  displayName: "Nikolaos Polychronopoulos",
  nickname: "The Professor",
  country: "Greece",
  city: "Athens",
  status: "Official player verified",
  photoUrl: "/img/account/nick_poly.webp",
};

const careerStats = [
  { label: "Friendly Matches", value: "128" },
  { label: "Wins", value: "82" },
  { label: "Win Rate", value: "64%" },
  { label: "Overall AVG", value: "1,423" },
  { label: "Highest Run", value: "19" },
  { label: "Trusted Tables", value: "6" },
];

const seasonStats = [
  { label: "Matches", value: "34" },
  { label: "Points Scored", value: "1,308" },
  { label: "Average", value: "1,506" },
  { label: "High Run", value: "14" },
  { label: "Best Match AVG", value: "2,188" },
  { label: "Current Streak", value: "W3" },
];

const recentForm = ["W", "W", "W", "L", "W", "L", "W", "W"];

const friendlyMatches = [
  {
    id: 1,
    opponent: "Tayfun Tasdemir",
    result: "L",
    score: "36-40",
    avg: "1,565",
    innings: 23,
    highRun: 8,
    venue: "Billiard Today Club",
    table: "Table 2",
    date: "28 Apr 2026",
  },
  {
    id: 2,
    opponent: "Avraam Papadopoulos",
    result: "W",
    score: "40-29",
    avg: "1,739",
    innings: 23,
    highRun: 11,
    venue: "Athens Arena",
    table: "Table 1",
    date: "25 Apr 2026",
  },
  {
    id: 3,
    opponent: "Antonios Zervas",
    result: "W",
    score: "35-22",
    avg: "1,400",
    innings: 25,
    highRun: 7,
    venue: "Billiard Today Club",
    table: "Table 4",
    date: "21 Apr 2026",
  },
  {
    id: 4,
    opponent: "Kostas Kokkoris",
    result: "W",
    score: "40-38",
    avg: "1,290",
    innings: 31,
    highRun: 9,
    venue: "Piraeus Billiards",
    table: "TV Table",
    date: "17 Apr 2026",
  },
];

const comparisonTrend = [
  { label: "Nov", training: 1.18, official: 1.02 },
  { label: "Dec", training: 1.24, official: 1.08 },
  { label: "Jan", training: 1.31, official: 1.14 },
  { label: "Feb", training: 1.38, official: 1.19 },
  { label: "Mar", training: 1.42, official: 1.27 },
  { label: "Apr", training: 1.51, official: 1.36 },
];

const careerHistory = [
  {
    year: "2018",
    description:
      "Starts appearing regularly in Billiard Today records, building a reliable official match sample with a 1,209 season average.",
  },
  {
    year: "2020",
    description:
      "Maintains competitive rhythm in a shortened season, recording 11 official matches with a 1,123 average and a high run of 11.",
  },
  {
    year: "2023",
    description:
      "Produces his strongest recorded official season by volume and output, averaging 1,632 across 53 matches with a high run of 25.",
  },
  {
    year: "2024",
    description:
      "Keeps a high performance baseline through 37 official matches, posting a 1,556 average and several deep scoreboard runs.",
  },
  {
    year: "2025",
    description:
      "Shows steady official form with a 1,507 average, while friendly-match data suggests stronger scoring rhythm in training conditions.",
  },
  {
    year: "2026",
    description:
      "Early-season official sample is still small, so the account compares official results with friendly matches before drawing stronger conclusions.",
  },
];

const chartWidth = 720;
const chartHeight = 260;
const chartPadding = { top: 26, right: 26, bottom: 42, left: 44 };
const chartMin = 0.9;
const chartMax = 1.65;

function chartX(index: number) {
  const innerWidth = chartWidth - chartPadding.left - chartPadding.right;
  return chartPadding.left + (innerWidth / (comparisonTrend.length - 1)) * index;
}

function chartY(value: number) {
  const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  return chartPadding.top + ((chartMax - value) / (chartMax - chartMin)) * innerHeight;
}

function pathFor(key: "training" | "official") {
  return comparisonTrend
    .map((point, index) => `${index === 0 ? "M" : "L"} ${chartX(index).toFixed(1)} ${chartY(point[key]).toFixed(1)}`)
    .join(" ");
}

function formatAvg(value: number) {
  const truncated = Math.trunc(value * 1000) / 1000;
  return truncated.toFixed(3).replace(".", ",");
}

function InitialsPortrait() {
  return (
    <div className="relative flex h-[340px] min-h-[340px] items-end justify-center overflow-hidden lg:h-[520px]">
      <div className="absolute bottom-0 h-[88%] w-[62%] rounded-t-full bg-gradient-to-b from-zinc-700 via-zinc-950 to-black" />
      <div className="absolute bottom-24 flex h-28 w-28 items-center justify-center rounded-full border border-red-500/25 bg-zinc-900 text-4xl font-semibold text-zinc-100 shadow-[0_0_80px_rgba(225,29,72,0.24)]">
        NP
      </div>
      <div className="absolute bottom-0 h-40 w-72 rounded-t-[80px] bg-zinc-950" />
    </div>
  );
}

function WinRateDial() {
  return (
    <div className="flex items-center gap-6">
      <div
        className="grid h-40 w-40 place-items-center rounded-full"
        style={{
          background:
            "conic-gradient(#be123c 0deg 230deg, #111827 230deg 360deg)",
        }}
      >
        <div className="grid h-28 w-28 place-items-center rounded-full bg-[#f4f0e6] text-center">
          <div>
            <div className="text-3xl font-semibold text-zinc-950">64%</div>
            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-600">Wins</div>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <div className="text-sm text-zinc-600">Wins / Matches</div>
          <div className="text-2xl font-semibold text-zinc-950">82 / 128</div>
        </div>
        <div>
          <div className="text-sm text-zinc-600">Last 8</div>
          <div className="mt-2 flex gap-2">
            {recentForm.map((item, index) => (
              <span
                key={`${item}-${index}`}
                className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold ${
                  item === "W" ? "bg-emerald-600 text-white" : "bg-zinc-900 text-white"
                }`}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrainingVsOfficialChart() {
  return (
    <div className="overflow-hidden border border-zinc-300 bg-[#f4f0e6]">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Training vs official average trend" className="h-auto w-full">
        {[1.6, 1.4, 1.2, 1.0].map((tick) => (
          <g key={tick}>
            <line
              x1={chartPadding.left}
              x2={chartWidth - chartPadding.right}
              y1={chartY(tick)}
              y2={chartY(tick)}
              stroke="#d6d3ca"
              strokeWidth="1"
            />
            <text x="0" y={chartY(tick) + 4} fill="#52525b" fontSize="13">
              {formatAvg(tick)}
            </text>
          </g>
        ))}
        {comparisonTrend.map((point, index) => (
          <text key={point.label} x={chartX(index)} y={chartHeight - 12} textAnchor="middle" fill="#52525b" fontSize="13">
            {point.label}
          </text>
        ))}
        <path d={pathFor("training")} fill="none" stroke="#be123c" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={pathFor("official")} fill="none" stroke="#18181b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        {comparisonTrend.map((point, index) => (
          <g key={`${point.label}-dots`}>
            <circle cx={chartX(index)} cy={chartY(point.training)} r="6" fill="#be123c" />
            <circle cx={chartX(index)} cy={chartY(point.official)} r="6" fill="#18181b" />
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function AccountMockupPage() {
  return (
    <main className="min-h-screen bg-[#f4f0e6] text-zinc-950">
      <section className="relative overflow-hidden bg-black text-white">
        <div className="absolute inset-0 bg-[url('/img/account/dotted_balls_3_fine.webp')] bg-cover bg-center opacity-35" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_30%,rgba(127,29,29,0.28),transparent_34%),linear-gradient(90deg,rgba(0,0,0,0.92),rgba(0,0,0,0.56)_48%,rgba(0,0,0,0.88))]" />

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link href="/account" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300">
            <ArrowLeft className="h-4 w-4" />
            Back to current account
          </Link>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-zinc-400">
            <ShieldCheck className="h-4 w-4 text-red-500" />
            Account mockup
          </div>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-8 px-5 pt-10 lg:grid-cols-[0.78fr_1.22fr] lg:pt-16">
          <div className="flex min-w-0 flex-col justify-end pb-12 lg:pb-20">
            <div className="text-sm font-semibold uppercase tracking-[0.28em] text-red-500">
              {player.nickname}
            </div>
            <h1 className="mt-4 max-w-[690px] text-5xl font-black uppercase leading-[0.96] tracking-normal text-white sm:text-6xl lg:text-[4.35rem] xl:text-[4.9rem]">
              {player.displayName}
            </h1>
            <div className="mt-8 grid gap-3 border border-white/15 bg-white/5 p-4 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <CircleDot className="h-4 w-4 text-red-500" />
                {player.country}
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <MapPin className="h-4 w-4 text-red-500" />
                {player.city}
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <ShieldCheck className="h-4 w-4 text-red-500" />
                {player.status}
              </div>
            </div>
          </div>
          {player.photoUrl ? (
            <div className="relative flex h-[340px] min-h-[340px] items-end justify-center overflow-hidden lg:h-[520px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={player.photoUrl}
                alt={player.displayName}
                className="relative z-10 max-h-[520px] w-auto object-contain object-bottom drop-shadow-[0_40px_90px_rgba(0,0,0,0.72)]"
              />
            </div>
          ) : (
            <InitialsPortrait />
          )}
        </div>
      </section>

      <section className="border-b border-zinc-300">
        <div className="mx-auto grid max-w-7xl gap-px bg-zinc-300 px-5 sm:grid-cols-2 lg:grid-cols-6">
          {careerStats.map((stat) => (
            <div key={stat.label} className="bg-[#f4f0e6] py-8">
              <div className="text-sm text-zinc-600">{stat.label}</div>
              <div className="mt-3 text-4xl font-semibold text-zinc-950">{stat.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-4xl font-black uppercase tracking-normal">Season Stats</h2>
            <select className="border border-zinc-400 bg-transparent px-4 py-3 text-sm font-semibold text-zinc-950">
              <option>2025/2026</option>
              <option>2024/2025</option>
              <option>Career</option>
            </select>
          </div>
          <div className="mt-10">
            <WinRateDial />
          </div>
        </div>

        <div className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {seasonStats.map((stat) => (
            <div key={stat.label} className="border-b border-zinc-300 pb-5">
              <div className="text-sm text-zinc-600">{stat.label}</div>
              <div className="mt-2 text-4xl font-semibold text-zinc-950">{stat.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.28em] text-red-700">Performance comparison</div>
            <h2 className="mt-3 text-4xl font-black uppercase tracking-normal">Training vs Official</h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-600">
              Compare scoreboard friendly matches with official tournament performance to see how practice form carries into pressure matches.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="border border-zinc-300 p-4">
                <div className="text-sm text-zinc-600">Training AVG</div>
                <div className="mt-2 text-3xl font-semibold">1,510</div>
              </div>
              <div className="border border-zinc-300 p-4">
                <div className="text-sm text-zinc-600">Official AVG</div>
                <div className="mt-2 text-3xl font-semibold">1,360</div>
              </div>
              <div className="border border-zinc-300 p-4">
                <div className="text-sm text-zinc-600">Pressure Gap</div>
                <div className="mt-2 text-3xl font-semibold">-10%</div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-8 bg-red-700" />
                Friendly / training
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-8 bg-zinc-950" />
                Official matches
              </span>
            </div>
          </div>

          <div>
            <TrainingVsOfficialChart />
            <div className="mt-4 border border-zinc-300 bg-[#ebe5d8] px-5 py-4 text-sm leading-6 text-zinc-700">
              Official average is still lower than training average, but the gap is shrinking over the last three months.
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-300 bg-[#f4f0e6]">
        <div className="mx-auto max-w-7xl px-5 py-14">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.28em] text-red-700">Automated narrative</div>
              <h2 className="mt-3 text-4xl font-black uppercase tracking-normal">Career History</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-zinc-600">
              These summaries are generated from official seasons, friendly-match trends and reliable milestones.
            </p>
          </div>

          <div className="mt-8 border-y border-zinc-300">
            <div className="grid grid-cols-[110px_1fr] border-b border-zinc-300 py-4 text-sm font-semibold text-zinc-950">
              <div>Year</div>
              <div>Description</div>
            </div>
            {careerHistory.map((item) => (
              <article key={item.year} className="grid grid-cols-[110px_1fr] gap-6 border-b border-zinc-300 py-5 last:border-b-0">
                <div className="text-lg font-semibold text-zinc-950">{item.year}</div>
                <div className="max-w-5xl text-base font-medium leading-6 text-zinc-950">{item.description}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-300 bg-[#ebe5d8]">
        <div className="mx-auto max-w-7xl px-5 py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-4xl font-black uppercase tracking-normal">Friendly Matches</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Private match history recorded from trusted scoreboards.
              </p>
            </div>
            <div className="flex gap-2 text-sm">
              <button className="border border-zinc-950 bg-zinc-950 px-4 py-2 font-semibold text-white">All</button>
              <button className="border border-zinc-400 px-4 py-2 font-semibold text-zinc-800">Wins</button>
              <button className="border border-zinc-400 px-4 py-2 font-semibold text-zinc-800">Losses</button>
            </div>
          </div>

          <div className="mt-8 divide-y divide-zinc-300 border-y border-zinc-300">
            {friendlyMatches.map((match) => (
              <article key={match.id} className="grid gap-5 py-6 lg:grid-cols-[110px_1fr_220px_260px] lg:items-center">
                <div>
                  <span
                    className={`inline-grid h-14 w-14 place-items-center rounded-full text-xl font-black ${
                      match.result === "W" ? "bg-red-700 text-white" : "bg-zinc-950 text-white"
                    }`}
                  >
                    {match.result}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-sm uppercase tracking-[0.2em] text-zinc-500">Opponent</div>
                  <div className="mt-1 text-3xl font-semibold text-zinc-950">{match.opponent}</div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-600">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" />
                      {match.date}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {match.venue}
                    </span>
                    <span>{match.table}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm uppercase tracking-[0.2em] text-zinc-500">Score</div>
                  <div className="mt-1 text-5xl font-black text-zinc-950">{match.score}</div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-zinc-500">AVG</div>
                    <div className="mt-1 text-2xl font-semibold">{match.avg}</div>
                  </div>
                  <div>
                    <div className="text-zinc-500">INN</div>
                    <div className="mt-1 text-2xl font-semibold">{match.innings}</div>
                  </div>
                  <div>
                    <div className="text-zinc-500">H.R.</div>
                    <div className="mt-1 text-2xl font-semibold">{match.highRun}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-14 lg:grid-cols-3">
        <div className="border border-zinc-300 p-6">
          <Trophy className="h-7 w-7 text-red-700" />
          <h3 className="mt-4 text-2xl font-semibold">Tournament Snapshot</h3>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Official tournament history can share the same visual language, with finals, positions, averages and high runs.
          </p>
        </div>
        <div className="border border-zinc-300 p-6">
          <Activity className="h-7 w-7 text-red-700" />
          <h3 className="mt-4 text-2xl font-semibold">Performance Trend</h3>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            The current account API can support trend charts from friendly and official match aggregates.
          </p>
        </div>
        <div className="border border-zinc-300 p-6">
          <Clock3 className="h-7 w-7 text-red-700" />
          <h3 className="mt-4 text-2xl font-semibold">Recent Activity</h3>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Notes, tags, devices and scoreboard sessions should stay available, but secondary to player performance.
          </p>
        </div>
      </section>
    </main>
  );
}
