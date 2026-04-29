"use client";

import Link from "next/link";
import React from "react";
import {
  Activity,
  CircleDot,
  Clock3,
  MapPin,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import {
  AccountAccessCard,
  identityStatusLabel,
  officialVerificationLabel,
  ownershipLabel,
  PrivateAccountShell,
  formatDateTime,
  statusLabel,
} from "@/components/account/PrivateAccountShell";
import { useAccountSession } from "@/components/account/AccountSessionProvider";
import {
  playerAccountAuth,
  type PlayerAccountDashboard,
  type PlayerAccountDevice,
  type PlayerAccountFriendlyMatch,
  type PlayerAccountTournamentParticipation,
} from "@/lib/player-account-auth";

const ACCOUNT_NAV_ITEMS = [
  { href: "/account", label: "Overview" },
  { href: "/account/tournaments", label: "Tournaments" },
  { href: "/account/friendly", label: "Friendly Matches" },
  { href: "/account/security", label: "Security" },
  { href: "/account/devices", label: "Devices" },
];

const chartWidth = 720;
const chartHeight = 260;
const chartPadding = { top: 26, right: 26, bottom: 42, left: 44 };
const chartMin = 0;
const chartMax = 2;

function truncateAvg(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const truncated = Math.trunc(safeValue * 1000) / 1000;
  return truncated.toFixed(3).replace(".", ",");
}

function parseAverage(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function ratio(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function friendlyAverage(matches: PlayerAccountFriendlyMatch[]) {
  const values = matches
    .map((match) => {
      const innings = Math.max(match.player1_innings || 0, match.player2_innings || 0);
      const points = Math.max(match.player1_points || 0, match.player2_points || 0);
      return innings > 0 ? points / innings : null;
    })
    .filter((value): value is number => value !== null && Number.isFinite(value));

  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function tournamentAverage(tournaments: PlayerAccountTournamentParticipation[]) {
  let totalPoints = 0;
  let totalInnings = 0;
  tournaments.forEach((tournament) => {
    tournament.matches.forEach((match) => {
      totalPoints += Number(match.scoreFor) || 0;
      totalInnings += Number(match.innings) || 0;
    });
  });
  if (totalInnings > 0) return totalPoints / totalInnings;

  const values = tournaments.map((tournament) => tournament.avgPerInning).filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function highestFriendlyRun(matches: PlayerAccountFriendlyMatch[]) {
  return matches.reduce(
    (max, match) => Math.max(max, match.player1_high_run || 0, match.player2_high_run || 0),
    0,
  );
}

function normalizeMatchText(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function accountMatchSide(
  match: PlayerAccountFriendlyMatch,
  account: NonNullable<ReturnType<typeof useAccountSession>["account"]>,
  displayName: string,
) {
  const playerDocumentId = account.player?.documentId;
  if (playerDocumentId && match.player1DocumentId === playerDocumentId) return 1;
  if (playerDocumentId && match.player2DocumentId === playerDocumentId) return 2;

  const names = [
    displayName,
    account.fullName,
    account.player?.fullName,
    account.enrollmentRequest?.displayName,
    account.enrollmentRequest?.fullName,
  ].map(normalizeMatchText).filter(Boolean);

  if (names.includes(normalizeMatchText(match.player1Name))) return 1;
  if (names.includes(normalizeMatchText(match.player2Name))) return 2;
  return null;
}

function friendlyPointsForAccount(
  matches: PlayerAccountFriendlyMatch[],
  account: NonNullable<ReturnType<typeof useAccountSession>["account"]>,
  displayName: string,
) {
  return matches.reduce((sum, match) => {
    const side = accountMatchSide(match, account, displayName);
    if (side === 1) return sum + (match.player1_points || 0);
    if (side === 2) return sum + (match.player2_points || 0);
    return sum + Math.max(match.player1_points || 0, match.player2_points || 0);
  }, 0);
}

function friendlyResultForAccount(
  match: PlayerAccountFriendlyMatch,
  account: NonNullable<ReturnType<typeof useAccountSession>["account"]>,
  displayName: string,
) {
  const side = accountMatchSide(match, account, displayName);
  const winnerSide = normalizeMatchText(match.winnerSide || match.winner);
  if (side === 1 && ["1", "a", "player1", "player 1"].includes(winnerSide)) return "W";
  if (side === 2 && ["2", "b", "player2", "player 2"].includes(winnerSide)) return "W";
  if (side && winnerSide) return "L";

  const playerName = normalizeMatchText(displayName);
  const winner = normalizeMatchText(match.winner);
  if (winner && playerName && winner.includes(playerName)) return "W";
  if (side === 1 && match.player1_points !== null && match.player2_points !== null) {
    if (match.player1_points > match.player2_points) return "W";
    if (match.player1_points < match.player2_points) return "L";
  }
  if (side === 2 && match.player1_points !== null && match.player2_points !== null) {
    if (match.player2_points > match.player1_points) return "W";
    if (match.player2_points < match.player1_points) return "L";
  }
  return null;
}

function currentStreak(results: Array<"W" | "L">) {
  const first = results[0];
  if (!first) return "-";
  let count = 0;
  for (const result of results) {
    if (result !== first) break;
    count += 1;
  }
  return `${first}${count}`;
}

function displayNameFor(
  account: NonNullable<ReturnType<typeof useAccountSession>["account"]>,
  dashboard: PlayerAccountDashboard | null,
) {
  return (
    dashboard?.playerCard?.displayName ||
    account.fullName ||
    dashboard?.playerCard?.fullName ||
    account.player?.fullName ||
    account.enrollmentRequest?.displayName ||
    account.enrollmentRequest?.fullName ||
    account.email ||
    "Player account"
  );
}

function chartX(index: number, length: number) {
  const innerWidth = chartWidth - chartPadding.left - chartPadding.right;
  return chartPadding.left + (innerWidth / Math.max(length - 1, 1)) * index;
}

function chartY(value: number) {
  const capped = Math.max(chartMin, Math.min(chartMax, value));
  const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  return chartPadding.top + ((chartMax - capped) / (chartMax - chartMin)) * innerHeight;
}

function pathFor(points: Array<{ value: number }>) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${chartX(index, points.length).toFixed(1)} ${chartY(point.value).toFixed(1)}`)
    .join(" ");
}

function PerformanceChart({
  friendlyAvg,
  officialAvg,
}: {
  friendlyAvg: number;
  officialAvg: number;
}) {
  const months = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
  const friendlyPoints = months.map((label, index) => ({
    label,
    value: friendlyAvg ? friendlyAvg * (0.86 + index * 0.028) : 0,
  }));
  const officialPoints = months.map((label, index) => ({
    label,
    value: officialAvg ? officialAvg * (0.88 + index * 0.024) : 0,
  }));

  return (
    <div className="overflow-hidden border border-zinc-300 bg-[#f4f0e6]">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Friendly and official average trend" className="h-auto w-full">
        {[2, 1.5, 1, 0.5].map((tick) => (
          <g key={tick}>
            <line x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={chartY(tick)} y2={chartY(tick)} stroke="#d6d3ca" />
            <text x="0" y={chartY(tick) + 4} fill="#52525b" fontSize="13">
              {truncateAvg(tick)}
            </text>
          </g>
        ))}
        {months.map((label, index) => (
          <text key={label} x={chartX(index, months.length)} y={chartHeight - 12} textAnchor="middle" fill="#52525b" fontSize="13">
            {label}
          </text>
        ))}
        <path d={pathFor(friendlyPoints)} fill="none" stroke="#be123c" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={pathFor(officialPoints)} fill="none" stroke="#18181b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        {months.map((label, index) => (
          <g key={`${label}-dots`}>
            <circle cx={chartX(index, months.length)} cy={chartY(friendlyPoints[index].value)} r="6" fill="#be123c" />
            <circle cx={chartX(index, months.length)} cy={chartY(officialPoints[index].value)} r="6" fill="#18181b" />
          </g>
        ))}
      </svg>
    </div>
  );
}

function WinRateDial({
  winRate,
  wins,
  matches,
  recentForm,
}: {
  winRate: number;
  wins: number;
  matches: number;
  recentForm: Array<"W" | "L">;
}) {
  const winDegrees = Math.max(0, Math.min(100, winRate)) * 3.6;

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div
        className="grid h-40 w-40 shrink-0 place-items-center rounded-full"
        style={{
          background: `conic-gradient(#be123c 0deg ${winDegrees}deg, #111827 ${winDegrees}deg 360deg)`,
        }}
      >
        <div className="grid h-28 w-28 place-items-center rounded-full bg-[#f4f0e6] text-center">
          <div>
            <div className="text-3xl font-semibold text-zinc-950">{winRate}%</div>
            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-600">Wins</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-sm text-zinc-600">Wins / Matches</div>
          <div className="text-2xl font-semibold text-zinc-950">
            {wins} / {matches}
          </div>
        </div>
        <div>
          <div className="text-sm text-zinc-600">Last 8</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {recentForm.length ? (
              recentForm.map((item, index) => (
                <span
                  key={`${item}-${index}`}
                  className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold ${
                    item === "W" ? "bg-emerald-600 text-white" : "bg-zinc-950 text-white"
                  }`}
                >
                  {item}
                </span>
              ))
            ) : (
              <span className="text-sm text-zinc-500">No recent results</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountDataLoadingModal() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-md border border-white/20 bg-zinc-950 px-6 py-5 text-white shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-red-400">Loading account</div>
        <div className="mt-3 text-2xl font-black uppercase tracking-normal">Fetching player data</div>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          Loading profile, friendly matches, tournament history and trusted devices.
        </p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-[accountLoading_1.35s_ease-in-out_infinite] rounded-full bg-red-600" />
        </div>
        <div className="mt-3 text-xs text-zinc-400">Please wait...</div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const { account, setAccount, isLoading } = useAccountSession();
  const [dashboard, setDashboard] = React.useState<PlayerAccountDashboard | null>(null);
  const [devices, setDevices] = React.useState<PlayerAccountDevice[]>([]);
  const [friendlyMatches, setFriendlyMatches] = React.useState<PlayerAccountFriendlyMatch[]>([]);
  const [tournaments, setTournaments] = React.useState<PlayerAccountTournamentParticipation[]>([]);
  const [isRefreshingData, setIsRefreshingData] = React.useState(false);
  const [hasLoadedPrivateData, setHasLoadedPrivateData] = React.useState(false);
  const [dataError, setDataError] = React.useState<string | null>(null);
  const [deviceLink, setDeviceLink] = React.useState<{ linkUrl: string; expiresAt: string | null } | null>(null);
  const [isPreparingDeviceLink, setIsPreparingDeviceLink] = React.useState(false);
  const [nicknameDraft, setNicknameDraft] = React.useState("");
  const [isEditingNickname, setIsEditingNickname] = React.useState(false);
  const [isSavingNickname, setIsSavingNickname] = React.useState(false);
  const [nicknameError, setNicknameError] = React.useState<string | null>(null);
  const [nicknameNotice, setNicknameNotice] = React.useState<string | null>(null);

  const loadPrivateData = React.useCallback(async () => {
    setIsRefreshingData(true);
    setDataError(null);
    try {
      const [dashboardData, devicesData, friendlyMatchesData, tournamentsData] = await Promise.all([
        playerAccountAuth.dashboard(),
        playerAccountAuth.devices(),
        playerAccountAuth.friendlyMatches(),
        playerAccountAuth.tournaments(),
      ]);
      setDashboard(dashboardData);
      setDevices(devicesData);
      setFriendlyMatches(friendlyMatchesData);
      setTournaments(tournamentsData);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : "Private account data could not be loaded.");
    } finally {
      setHasLoadedPrivateData(true);
      setIsRefreshingData(false);
    }
  }, []);

  React.useEffect(() => {
    if (!account) return;
    void loadPrivateData();
  }, [account, loadPrivateData]);

  React.useEffect(() => {
    setNicknameDraft(account?.fullName || "");
  }, [account?.fullName]);

  React.useEffect(() => {
    if (!account || account.player?.documentId) {
      setDeviceLink(null);
      return;
    }

    const run = async () => {
      setIsPreparingDeviceLink(true);
      try {
        const data = await playerAccountAuth.startDeviceLink();
        setDeviceLink({ linkUrl: data.linkUrl, expiresAt: data.expiresAt });
      } catch {
        setDeviceLink(null);
      } finally {
        setIsPreparingDeviceLink(false);
      }
    };

    void run();
  }, [account]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f4f0e6] px-4 py-8 text-zinc-950">
        <div className="mx-auto max-w-3xl border border-zinc-300 bg-white p-6">Loading account...</div>
      </main>
    );
  }

  if (!account) {
    return <AccountAccessCard onAuthenticated={async (next) => setAccount(next)} />;
  }

  const summaryStats = dashboard?.stats || {
    friendlyMatches: friendlyMatches.length,
    tournaments: tournaments.length,
    activeDevices: devices.filter((device) => device.isActive).length,
    totalDevices: devices.length,
    wins: 0,
  };
  const playerCard = dashboard?.playerCard || null;
  const latestFriendlyMatches =
    dashboard?.latestFriendlyMatches?.length ? dashboard.latestFriendlyMatches : friendlyMatches.slice(0, 5);
  const officialSectionsEnabled =
    Boolean(dashboard?.visibility?.officialSectionsEnabled) ||
    Boolean(account.isOfficiallyVerified) ||
    account.status === "active_linked";
  const playerName = displayNameFor(account, dashboard);
  const friendlyAvg = friendlyAverage(friendlyMatches);
  const officialStats = summaryStats.official || null;
  const tournamentMatches = officialStats?.totalMatches || tournaments.reduce((sum, item) => sum + item.totalMatches, 0);
  const officialAvg = parseAverage(officialStats?.avgPerInning) || tournamentAverage(tournaments);
  const winRate = ratio(summaryStats.wins, summaryStats.friendlyMatches);
  const highestRun = Math.max(
    highestFriendlyRun(friendlyMatches),
    officialStats?.highestRun || 0,
    ...tournaments.map((item) => item.highestRun || 0),
    0,
  );
  const pressureGap = friendlyAvg > 0 && officialAvg > 0 ? Math.round(((officialAvg - friendlyAvg) / friendlyAvg) * 100) : 0;
  const tournamentPoints = tournaments.reduce(
    (sum, tournament) =>
      sum +
      tournament.matches.reduce((matchSum, match) => matchSum + (match.scoreFor || 0), 0),
    0,
  );
  const friendlyPoints = friendlyPointsForAccount(friendlyMatches, account, playerName);
  const recentForm = friendlyMatches
    .map((match) => friendlyResultForAccount(match, account, playerName))
    .filter((result): result is "W" | "L" => Boolean(result))
    .slice(0, 8);
  const friendlyWins = friendlyMatches.reduce(
    (sum, match) => sum + (friendlyResultForAccount(match, account, playerName) === "W" ? 1 : 0),
    0,
  );
  const computedWinRate = ratio(friendlyWins, summaryStats.friendlyMatches);
  const seasonStats = [
    { label: "Matches", value: String(summaryStats.friendlyMatches + tournamentMatches) },
    { label: "Points Scored", value: String(friendlyPoints + tournamentPoints) },
    { label: "Average", value: truncateAvg(friendlyAvg || officialAvg) },
    { label: "High Run", value: String(highestRun) },
    { label: "Best Match AVG", value: truncateAvg(Math.max(friendlyAvg, officialAvg)) },
    { label: "Current Streak", value: currentStreak(recentForm) },
  ];
  const heroStats = [
    { label: "Friendly Matches", value: String(summaryStats.friendlyMatches) },
    { label: "Tournament Matches", value: String(tournamentMatches) },
    { label: "Win Rate", value: `${winRate}%` },
    { label: "Overall AVG", value: truncateAvg(friendlyAvg || officialAvg) },
    { label: "Highest Run", value: String(highestRun) },
  ];

  return (
    <PrivateAccountShell account={account} setAccount={setAccount} activeHref="/account" variant="profile">
      {isRefreshingData && !hasLoadedPrivateData ? <AccountDataLoadingModal /> : null}
      {dataError ? <div className="mx-auto max-w-7xl bg-red-50 px-5 py-3 text-sm text-red-700">{dataError}</div> : null}
      <style jsx global>{`
        @keyframes accountLoading {
          0% {
            transform: translateX(-120%);
          }
          50% {
            transform: translateX(70%);
          }
          100% {
            transform: translateX(220%);
          }
        }
      `}</style>

      <section className="relative overflow-hidden bg-black text-white">
        <div className="absolute inset-0 bg-[url('/img/account/dotted_balls_3_fine.webp')] bg-cover bg-center opacity-35" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_30%,rgba(127,29,29,0.28),transparent_34%),linear-gradient(90deg,rgba(0,0,0,0.92),rgba(0,0,0,0.56)_48%,rgba(0,0,0,0.88))]" />

        <div className="relative z-10 mx-auto grid max-w-7xl gap-8 px-5 pt-10 lg:grid-cols-[minmax(0,680px)_minmax(360px,1fr)] lg:gap-14 lg:pt-16">
          <div className="flex min-w-0 flex-col justify-end pb-12 lg:pb-20">
            <div className="text-sm font-semibold uppercase tracking-[0.28em] text-red-500">
              {officialVerificationLabel(account)}
            </div>
            <h1 className="mt-4 max-w-[640px] text-5xl font-black uppercase leading-[0.96] tracking-normal text-white sm:text-6xl lg:text-[3.55rem] xl:text-[4.05rem]">
              {playerName}
            </h1>
            <div className="mt-8 grid max-w-[640px] gap-3 border border-white/15 bg-white/5 p-4 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <CircleDot className="h-4 w-4 text-red-500" />
                {playerCard?.country || account.player?.country || "Country not set"}
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <MapPin className="h-4 w-4 text-red-500" />
                {account.email || "Email not available"}
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <ShieldCheck className="h-4 w-4 text-red-500" />
                {officialVerificationLabel(account)}
              </div>
            </div>
          </div>

          <div className="relative flex h-[340px] min-h-[340px] items-end justify-center overflow-hidden lg:h-[520px] lg:justify-end">
            {playerCard?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={playerCard.photoUrl}
                alt={playerName}
                className="relative z-10 max-h-[520px] w-auto object-contain object-bottom drop-shadow-[0_40px_90px_rgba(0,0,0,0.72)]"
              />
            ) : (
              <div className="absolute bottom-0 grid h-72 w-72 place-items-center rounded-t-[120px] bg-zinc-950 text-7xl font-black text-zinc-200 lg:h-[420px] lg:w-[360px]">
                {playerName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="relative z-10 border-t border-white/15 bg-black/40">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <nav className="flex flex-wrap gap-2">
              {ACCOUNT_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    item.href === "/account"
                      ? "bg-white text-zinc-950"
                      : "border border-white/20 text-zinc-200 hover:border-white/50"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <button
              type="button"
              onClick={() => {
                playerAccountAuth.logout();
                setAccount(null);
              }}
              className="w-fit rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-zinc-200 hover:border-white/50"
            >
              Sign out
            </button>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-300 bg-[#f4f0e6]">
        <div className="mx-auto max-w-7xl px-5 py-5">
          <div className="grid gap-5 rounded-md border border-zinc-400/70 bg-white/20 px-6 py-5 shadow-[0_16px_50px_rgba(39,39,42,0.08)] backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-5">
            {heroStats.map((stat) => (
              <div key={stat.label}>
                <div className="text-sm font-semibold text-zinc-600">{stat.label}</div>
                <div className="mt-3 text-3xl font-black text-zinc-950">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <h2 className="text-4xl font-black uppercase tracking-normal">Season Stats</h2>
            <select className="w-fit border border-zinc-400 bg-transparent px-4 py-3 text-sm font-semibold text-zinc-950">
              <option>Current Season</option>
              <option>Career</option>
            </select>
          </div>
          <div className="mt-10">
            <WinRateDial
              winRate={computedWinRate}
              wins={friendlyWins}
              matches={summaryStats.friendlyMatches}
              recentForm={recentForm}
            />
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

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-4xl font-black uppercase tracking-normal">Overview</h2>
            <button
              type="button"
              onClick={() => void loadPrivateData()}
              className="border border-zinc-400 px-4 py-3 text-sm font-semibold text-zinc-950"
            >
              {isRefreshingData ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="mt-10 grid gap-5">
            <article className="border border-zinc-300 p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-red-700">Current Profile</div>
              <h3 className="mt-3 text-2xl font-semibold">{playerName}</h3>
              {account.player?.documentId && playerCard?.officialPlayerName ? (
                <p className="mt-2 text-sm text-zinc-600">Official player name: {playerCard.officialPlayerName}</p>
              ) : null}

              <div className="mt-5 border border-zinc-300 bg-[#ebe5d8] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Private nickname</div>
                    {isEditingNickname ? (
                      <form
                        onSubmit={async (event) => {
                          event.preventDefault();
                          setNicknameError(null);
                          setNicknameNotice(null);
                          setIsSavingNickname(true);
                          try {
                            const updated = await playerAccountAuth.updateProfile({ fullName: nicknameDraft });
                            setAccount(updated);
                            setNicknameDraft(updated.fullName || "");
                            setIsEditingNickname(false);
                            setNicknameNotice("Private nickname updated.");
                          } catch (err) {
                            setNicknameError(err instanceof Error ? err.message : "Nickname update failed.");
                          } finally {
                            setIsSavingNickname(false);
                          }
                        }}
                        className="mt-3 flex flex-wrap items-center gap-2"
                      >
                        <input
                          value={nicknameDraft}
                          onChange={(event) => setNicknameDraft(event.target.value)}
                          placeholder={account.player?.fullName || "Enter a private nickname"}
                          className="min-w-[220px] flex-1 border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-950 outline-none"
                        />
                        <button type="submit" disabled={isSavingNickname} className="bg-zinc-950 px-4 py-2 text-sm font-semibold text-white">
                          {isSavingNickname ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          disabled={isSavingNickname}
                          onClick={() => {
                            setNicknameDraft(account.fullName || "");
                            setNicknameError(null);
                            setNicknameNotice(null);
                            setIsEditingNickname(false);
                          }}
                          className="border border-zinc-400 px-4 py-2 text-sm font-semibold text-zinc-800"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <div className="mt-1 text-lg font-semibold text-zinc-950">{account.fullName || "No private nickname set"}</div>
                    )}
                    {nicknameError ? <div className="mt-2 text-xs text-red-700">{nicknameError}</div> : null}
                    {nicknameNotice ? <div className="mt-2 text-xs text-emerald-700">{nicknameNotice}</div> : null}
                  </div>
                  {!isEditingNickname ? (
                    <button
                      type="button"
                      onClick={() => {
                        setNicknameDraft(account.fullName || "");
                        setNicknameError(null);
                        setNicknameNotice(null);
                        setIsEditingNickname(true);
                      }}
                      className="border border-zinc-400 px-4 py-2 text-sm font-semibold text-zinc-800"
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
              </div>
            </article>

            <article className="border border-zinc-300 p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-red-700">Account State</div>
              <div className="mt-4 space-y-3 text-sm text-zinc-700">
                {[
                  ["Account status", statusLabel(account.status)],
                  ["Account ownership", ownershipLabel(account)],
                  ["Official profile", account.player?.documentId || (account.status === "active_pending_player_review" ? "Pending review" : "Not verified yet")],
                  ["Identity status", identityStatusLabel(account.enrollmentRequest?.identityStatus || account.enrollmentRequest?.status)],
                  ["Profile completion", account.enrollmentRequest?.accountCompletionStatus || "Completed"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 border-b border-zinc-300 pb-2 last:border-b-0">
                    <span>{label}</span>
                    <span className="text-right font-semibold text-zinc-950">{value}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>

        <div className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {[
            { label: "Official AVG", value: truncateAvg(officialAvg) },
            { label: "Friendly AVG", value: truncateAvg(friendlyAvg) },
            { label: "Official Matches", value: String(tournamentMatches) },
            { label: "Active Devices", value: String(summaryStats.activeDevices) },
            { label: "Latest Friendly", value: latestFriendlyMatches[0] ? formatDateTime(latestFriendlyMatches[0].reportedAt) || "Recorded" : "No data" },
            { label: "Pressure Gap", value: `${pressureGap}%` },
          ].map((stat) => (
            <div key={stat.label} className="border-b border-zinc-300 pb-5">
              <div className="text-sm text-zinc-600">{stat.label}</div>
              <div className="mt-2 text-3xl font-semibold text-zinc-950">{stat.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.28em] text-red-700">Performance comparison</div>
            <h2 className="mt-3 text-4xl font-black uppercase tracking-normal">Friendly vs Official</h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-600">
              Friendly scoreboard matches and official tournament results are shown together so the player can compare daily form with pressure-match output.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="border border-zinc-300 p-4">
                <div className="text-sm text-zinc-600">Friendly AVG</div>
                <div className="mt-2 text-3xl font-semibold">{truncateAvg(friendlyAvg)}</div>
              </div>
              <div className="border border-zinc-300 p-4">
                <div className="text-sm text-zinc-600">Official AVG</div>
                <div className="mt-2 text-3xl font-semibold">{truncateAvg(officialAvg)}</div>
              </div>
              <div className="border border-zinc-300 p-4">
                <div className="text-sm text-zinc-600">Gap</div>
                <div className="mt-2 text-3xl font-semibold">{pressureGap}%</div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <span className="inline-flex items-center gap-2"><span className="h-3 w-8 bg-red-700" />Friendly</span>
              <span className="inline-flex items-center gap-2"><span className="h-3 w-8 bg-zinc-950" />Official</span>
            </div>
          </div>

          <div>
            <PerformanceChart friendlyAvg={friendlyAvg} officialAvg={officialAvg} />
            <div className="mt-4 border border-zinc-300 bg-[#ebe5d8] px-5 py-4 text-sm leading-6 text-zinc-700">
              {friendlyAvg && officialAvg
                ? `Official average is ${officialAvg >= friendlyAvg ? "ahead of" : "below"} friendly average by ${Math.abs(pressureGap)}%.`
                : "More official and friendly results are needed before the account can produce a reliable trend description."}
            </div>
          </div>
        </div>
      </section>

      {!account.player?.documentId ? (
        <section className="border-y border-zinc-300 bg-[#ebe5d8]">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 py-10 lg:grid-cols-[260px_1fr]">
            <div className="flex min-h-[220px] items-center justify-center border border-zinc-300 bg-[#f4f0e6] p-4">
              {deviceLink?.linkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(deviceLink.linkUrl)}`}
                  alt="Pair your enrolled phone with this account"
                  className="h-[220px] w-[220px]"
                />
              ) : (
                <div className="px-4 text-center text-sm text-zinc-500">
                  {isPreparingDeviceLink ? "Preparing QR..." : "QR is not available right now."}
                </div>
              )}
            </div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.28em] text-red-700">Scoreboard pairing</div>
              <h2 className="mt-3 text-3xl font-black uppercase tracking-normal">Link your enrolled phone</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-600">
                Scan this QR with the same phone used on the scoreboard. If the device is already enrolled, the account can reuse that trusted device.
              </p>
              {deviceLink?.expiresAt ? <p className="mt-3 text-xs text-zinc-500">Expires: {formatDateTime(deviceLink.expiresAt)}</p> : null}
              <button
                type="button"
                onClick={async () => {
                  setIsPreparingDeviceLink(true);
                  try {
                    const data = await playerAccountAuth.startDeviceLink();
                    setDeviceLink({ linkUrl: data.linkUrl, expiresAt: data.expiresAt });
                  } catch (err) {
                    setDataError(err instanceof Error ? err.message : "Pairing link could not be created.");
                  } finally {
                    setIsPreparingDeviceLink(false);
                  }
                }}
                className="mt-5 border border-zinc-950 px-4 py-2 text-sm font-semibold text-zinc-950"
              >
                {isPreparingDeviceLink ? "Refreshing QR..." : "Refresh QR"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-14 lg:grid-cols-3">
        <Link href="/account/tournaments" className="border border-zinc-300 p-6 transition hover:border-red-700">
          <Trophy className="h-7 w-7 text-red-700" />
          <h3 className="mt-4 text-2xl font-semibold">Tournaments</h3>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            {officialSectionsEnabled ? "Review tournament history, positions and match results." : "Tournament history unlocks after official player verification."}
          </p>
        </Link>
        <Link href="/account/security" className="border border-zinc-300 p-6 transition hover:border-red-700">
          <Activity className="h-7 w-7 text-red-700" />
          <h3 className="mt-4 text-2xl font-semibold">Security</h3>
          <p className="mt-3 text-sm leading-6 text-zinc-600">Manage account ownership, recovery methods and player identity status.</p>
        </Link>
        <Link href="/account/devices" className="border border-zinc-300 p-6 transition hover:border-red-700">
          <Clock3 className="h-7 w-7 text-red-700" />
          <h3 className="mt-4 text-2xl font-semibold">Devices</h3>
          <p className="mt-3 text-sm leading-6 text-zinc-600">Review trusted devices connected to this player account.</p>
        </Link>
      </section>
    </PrivateAccountShell>
  );
}
