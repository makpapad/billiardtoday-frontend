"use client";

import Link from "next/link";
import React from "react";
import { CalendarDays, CircleDot, MapPin, Search, ShieldCheck } from "lucide-react";
import {
  AccountAccessCard,
  officialVerificationLabel,
  PrivateAccountShell,
} from "@/components/account/PrivateAccountShell";
import { useAccountSession } from "@/components/account/AccountSessionProvider";
import {
  playerAccountAuth,
  type PlayerAccountDashboard,
  type PlayerAccountTournamentParticipation,
} from "@/lib/player-account-auth";
import { getGameTypeLabel, normalizeGameTypeOrFallback, type GameType } from "@/lib/gameTypes";

const ACCOUNT_NAV_ITEMS = [
  { href: "/account", label: "Overview" },
  { href: "/account/tournaments", label: "Tournaments" },
  { href: "/account/friendly", label: "Friendly Matches" },
  { href: "/account/security", label: "Security" },
  { href: "/account/devices", label: "Devices" },
];

type HistoryPayload = {
  data?: PlayerAccountTournamentParticipation[];
  totalCount?: number;
  availableYears?: number[];
  availableGameTypes?: string[];
  availableTournamentTypes?: string[];
  error?: string;
};

const getTournamentTypeLabel = (value: string) => {
  const labels: Record<string, string> = {
    "E.C": "European Championship",
    "W.C": "World Championship",
    "W.Cup": "World Cup",
    "N.C": "National Championship",
    "T.C": "Team Competition National",
    "T.C.I": "Team Competition International",
    "O.T": "Open Tournament",
    Invitational: "Invitational",
    Other: "Other",
  };

  return labels[value] || value;
};

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
  return 0;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return value;
  }
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

function AccountDataLoadingModal() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/60 px-5 backdrop-blur-sm">
      <div className="w-full max-w-md border border-white/15 bg-zinc-950 p-6 text-white shadow-2xl">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-red-500">Fetching player data</div>
        <div className="mt-3 text-2xl font-black uppercase tracking-normal">Loading tournaments</div>
        <div className="mt-3 text-sm text-zinc-300">Synchronizing official history, filters and player statistics.</div>
        <div className="mt-6 h-2 overflow-hidden bg-white/10">
          <div className="h-full w-1/2 bg-red-600" style={{ animation: "accountLoading 1.2s ease-in-out infinite" }} />
        </div>
      </div>
    </div>
  );
}

export default function AccountTournamentsPage() {
  const { account, setAccount, isLoading } = useAccountSession();
  const [dashboard, setDashboard] = React.useState<PlayerAccountDashboard | null>(null);
  const [tournaments, setTournaments] = React.useState<PlayerAccountTournamentParticipation[]>([]);
  const [availableYears, setAvailableYears] = React.useState<number[]>([]);
  const [availableGameTypes, setAvailableGameTypes] = React.useState<string[]>([]);
  const [availableTournamentTypes, setAvailableTournamentTypes] = React.useState<string[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [hasLoadedData, setHasLoadedData] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedGameType, setSelectedGameType] = React.useState<GameType | "all">("Three-Cushion");
  const [selectedTournamentType, setSelectedTournamentType] = React.useState("all");
  const [selectedYear, setSelectedYear] = React.useState("all");
  const [opponentQuery, setOpponentQuery] = React.useState("");

  const fetchHistory = React.useCallback(
    async (playerId: string) => {
      const params = new URLSearchParams();
      params.set("limit", "1000");
      params.set("includeMatches", "true");
      if (selectedGameType !== "all") params.set("gameType", selectedGameType);
      if (selectedTournamentType !== "all") params.set("tournamentType", selectedTournamentType);
      if (selectedYear !== "all") params.set("year", selectedYear);

      const response = await fetch(`/api/players/${encodeURIComponent(playerId)}/history?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as HistoryPayload | null;
      if (!response.ok || !payload) {
        throw new Error(payload?.error || "Tournament history could not be loaded.");
      }

      setTournaments(Array.isArray(payload.data) ? payload.data : []);
      setTotalCount(Number(payload.totalCount) || 0);
      setAvailableYears(Array.isArray(payload.availableYears) ? payload.availableYears : []);
      setAvailableGameTypes(
        (Array.isArray(payload.availableGameTypes) ? payload.availableGameTypes : [])
          .map((value) => normalizeGameTypeOrFallback(value))
          .filter((value): value is string => Boolean(value)),
      );
      setAvailableTournamentTypes(Array.isArray(payload.availableTournamentTypes) ? payload.availableTournamentTypes : []);
    },
    [selectedGameType, selectedTournamentType, selectedYear],
  );

  const loadData = React.useCallback(async () => {
    if (!account) return;
    setIsRefreshing(true);
    setError(null);
    try {
      const dashboardPromise = playerAccountAuth.dashboard();
      const playerId = account.player?.documentId;
      const historyPromise = playerId ? fetchHistory(playerId) : Promise.resolve();
      const nextDashboard = await dashboardPromise;
      setDashboard(nextDashboard);
      await historyPromise;
      setHasLoadedData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tournament history could not be loaded.");
      setHasLoadedData(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [account, fetchHistory]);

  React.useEffect(() => {
    if (!account) return;
    void loadData();
  }, [account, loadData]);

  const playerName = account ? displayNameFor(account, dashboard) : "Player account";
  const playerCard = dashboard?.playerCard || null;
  const officialStats = dashboard?.stats.official || null;
  const officialMatches = officialStats?.totalMatches || totalCount || tournaments.reduce((sum, item) => sum + item.totalMatches, 0);
  const officialAvg = parseAverage(officialStats?.avgPerInning) || tournamentAverage(tournaments);
  const officialWins = officialStats?.totalWins || tournaments.reduce((sum, item) => sum + item.wins, 0);
  const officialLosses = officialStats?.totalLosses || tournaments.reduce((sum, item) => sum + item.losses, 0);
  const highestRun = Math.max(officialStats?.highestRun || 0, ...tournaments.map((item) => item.highestRun || 0), 0);
  const officialSectionsEnabled = Boolean(account?.isOfficiallyVerified) || account?.status === "active_linked";

  const opponentOptions = React.useMemo(() => {
    const counts = new Map<string, number>();
    tournaments.forEach((tournament) => {
      tournament.matches.forEach((match) => {
        const name = match.opponent?.trim();
        if (!name) return;
        counts.set(name, (counts.get(name) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [tournaments]);

  const visibleTournaments = React.useMemo(() => {
    const query = opponentQuery.trim().toLowerCase();
    if (!query) return tournaments;
    return tournaments
      .map((tournament) => ({
        ...tournament,
        matches: tournament.matches.filter((match) => match.opponent?.toLowerCase().includes(query)),
      }))
      .filter((tournament) => tournament.matches.length > 0);
  }, [opponentQuery, tournaments]);

  const heroStats = [
    { label: "Official Matches", value: String(officialMatches) },
    { label: "Wins", value: String(officialWins) },
    { label: "Losses", value: String(officialLosses) },
    { label: "Official AVG", value: truncateAvg(officialAvg) },
    { label: "Highest Run", value: String(highestRun) },
  ];

  if (isLoading) {
    return <main className="min-h-screen bg-[#f4f0e6] px-5 py-8">Loading account...</main>;
  }

  if (!account) {
    return <AccountAccessCard onAuthenticated={async (next) => setAccount(next)} />;
  }

  return (
    <PrivateAccountShell account={account} setAccount={setAccount} activeHref="/account/tournaments" variant="profile">
      {isRefreshing && !hasLoadedData ? <AccountDataLoadingModal /> : null}
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
        <div className="absolute inset-0 opacity-70">
          <div className="absolute inset-0 bg-[url('/img/account/dotted_balls_3_fine.webp')] bg-cover bg-center opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/35" />
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 pb-0 pt-6 lg:grid-cols-[1fr_0.72fr] lg:items-end lg:pt-10">
          <div className="pb-10 lg:pb-16">
            <Link href="/account" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-200 hover:text-white">
              ← Back to account
            </Link>
            <div className="mt-28 text-xs font-black uppercase tracking-[0.4em] text-red-500 lg:mt-44">Official tournament area</div>
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
                    item.href === "/account/tournaments"
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

      <section className="mx-auto max-w-7xl px-5 py-14">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.28em] text-red-700">Official history</div>
            <h2 className="mt-2 text-4xl font-black uppercase tracking-normal">Tournaments</h2>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="w-fit border border-zinc-400 px-4 py-3 text-sm font-semibold text-zinc-950"
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {!officialSectionsEnabled ? (
          <div className="mt-8 border border-amber-300 bg-amber-50 px-5 py-5 text-sm text-amber-900">
            Tournament history becomes available after an official player profile is verified and linked to this account.
          </div>
        ) : null}

        {error ? <div className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        {officialSectionsEnabled ? (
          <>
            <div className="mt-8 grid gap-3 border border-zinc-300 bg-white/20 p-4 lg:grid-cols-[0.9fr_0.9fr_0.8fr_1.2fr]">
              <select
                value={selectedGameType}
                onChange={(event) => {
                  setSelectedGameType(event.target.value as GameType | "all");
                  setSelectedYear("all");
                  setOpponentQuery("");
                }}
                disabled={isRefreshing}
                className="border border-zinc-400 bg-[#f4f0e6] px-4 py-3 text-sm font-semibold text-zinc-950 outline-none disabled:opacity-60"
              >
                <option value="all">All games</option>
                {availableGameTypes.map((gameType) => (
                  <option key={gameType} value={gameType}>
                    {getGameTypeLabel(gameType as GameType)}
                  </option>
                ))}
              </select>

              <select
                value={selectedTournamentType}
                onChange={(event) => setSelectedTournamentType(event.target.value)}
                disabled={isRefreshing}
                className="border border-zinc-400 bg-[#f4f0e6] px-4 py-3 text-sm font-semibold text-zinc-950 outline-none disabled:opacity-60"
              >
                <option value="all">All tournament types</option>
                {availableTournamentTypes.map((type) => (
                  <option key={type} value={type}>
                    {getTournamentTypeLabel(type)}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                disabled={isRefreshing || selectedGameType === "all"}
                className="border border-zinc-400 bg-[#f4f0e6] px-4 py-3 text-sm font-semibold text-zinc-950 outline-none disabled:opacity-60"
              >
                <option value="all">All seasons</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-3 border border-zinc-400 bg-[#f4f0e6] px-4 py-3 text-sm text-zinc-700">
                <Search className="h-4 w-4 text-zinc-500" />
                <input
                  value={opponentQuery}
                  onChange={(event) => setOpponentQuery(event.target.value)}
                  disabled={isRefreshing || selectedGameType === "all" || opponentOptions.length === 0}
                  placeholder="Head-to-Head: Search opponent"
                  className="min-w-0 flex-1 bg-transparent font-semibold text-zinc-950 outline-none placeholder:text-zinc-500 disabled:opacity-60"
                />
              </label>
            </div>

            {opponentQuery.trim() ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {opponentOptions
                  .filter((opponent) => opponent.name.toLowerCase().includes(opponentQuery.trim().toLowerCase()))
                  .slice(0, 8)
                  .map((opponent) => (
                    <button
                      key={opponent.name}
                      type="button"
                      onClick={() => setOpponentQuery(opponent.name)}
                      className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-zinc-950"
                    >
                      {opponent.name} ({opponent.count})
                    </button>
                  ))}
              </div>
            ) : null}

            <div className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Loaded Events", value: String(visibleTournaments.length) },
                { label: "Matches In View", value: String(visibleTournaments.reduce((sum, item) => sum + item.matches.length, 0)) },
                { label: "Average In View", value: truncateAvg(tournamentAverage(visibleTournaments)) },
                { label: "Latest Event", value: visibleTournaments[0]?.year ? String(visibleTournaments[0].year) : "-" },
              ].map((stat) => (
                <div key={stat.label} className="border-b border-zinc-300 pb-5">
                  <div className="text-sm text-zinc-600">{stat.label}</div>
                  <div className="mt-2 text-3xl font-semibold text-zinc-950">{stat.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-12 space-y-5">
              {visibleTournaments.length === 0 ? (
                <div className="border border-dashed border-zinc-400 px-5 py-8 text-sm text-zinc-600">
                  {hasLoadedData ? "No tournaments match the current filters." : "Tournament history is loading."}
                </div>
              ) : (
                visibleTournaments.map((participation) => (
                  <article key={participation.id} className="border border-zinc-300 bg-white/20 p-5">
                    <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-[0.26em] text-red-700">
                          {[participation.year, participation.gameType ? getGameTypeLabel(participation.gameType as GameType) : null, participation.tournamentType ? getTournamentTypeLabel(participation.tournamentType) : null]
                            .filter(Boolean)
                            .join(" / ")}
                        </div>
                        <h3 className="mt-2 text-2xl font-black text-zinc-950">{participation.tournament || "Tournament"}</h3>
                        <div className="mt-2 text-sm font-semibold text-zinc-600">{participation.position}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5 lg:min-w-[520px]">
                        {[
                          ["Matches", participation.totalMatches],
                          ["Wins", participation.wins],
                          ["Losses", participation.losses],
                          ["AVG", truncateAvg(participation.avgPerInning)],
                          ["H.R.", participation.highestRun],
                        ].map(([label, value]) => (
                          <div key={label} className="border border-zinc-300 bg-[#f4f0e6]/70 px-3 py-2">
                            <div className="text-xs text-zinc-500">{label}</div>
                            <div className="mt-1 text-xl font-black text-zinc-950">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {participation.stageResults.length > 0 ? (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {participation.stageResults.map((stage, index) => (
                          <span key={`${participation.id}-stage-${index}`} className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700">
                            {[stage.stageTitle, stage.finalPosition ? `Final ${stage.finalPosition}` : null, stage.groupPosition ? `Group ${stage.groupPosition}` : null]
                              .filter(Boolean)
                              .join(" / ")}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {participation.matches.length > 0 ? (
                      <div className="mt-6 overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                            <tr>
                              <th className="border-b border-zinc-300 pb-3 pr-5 font-semibold">Date</th>
                              <th className="border-b border-zinc-300 pb-3 pr-5 font-semibold">Opponent</th>
                              <th className="border-b border-zinc-300 pb-3 pr-5 font-semibold">Stage</th>
                              <th className="border-b border-zinc-300 pb-3 pr-5 font-semibold">Score</th>
                              <th className="border-b border-zinc-300 pb-3 pr-5 font-semibold">AVG</th>
                              <th className="border-b border-zinc-300 pb-3 pr-5 font-semibold">H.R.</th>
                              <th className="border-b border-zinc-300 pb-3 pr-5 font-semibold">Result</th>
                            </tr>
                          </thead>
                          <tbody>
                            {participation.matches.map((match) => {
                              const matchAvg = match.innings ? (Number(match.scoreFor) || 0) / match.innings : 0;
                              return (
                                <tr key={match.id} className="border-b border-zinc-300/80 text-zinc-800 last:border-b-0">
                                  <td className="py-3 pr-5 whitespace-nowrap">
                                    <span className="inline-flex items-center gap-2">
                                      <CalendarDays className="h-4 w-4 text-zinc-500" />
                                      {formatDate(match.date)}
                                    </span>
                                  </td>
                                  <td className="py-3 pr-5 font-semibold text-zinc-950">{match.opponent || "Unknown"}</td>
                                  <td className="py-3 pr-5">{match.stage || "-"}</td>
                                  <td className="py-3 pr-5 text-xl font-black text-zinc-950">
                                    {match.scoreFor ?? 0}-{match.scoreAgainst ?? 0}
                                  </td>
                                  <td className="py-3 pr-5">{truncateAvg(matchAvg)}</td>
                                  <td className="py-3 pr-5">{match.highRun ?? 0}</td>
                                  <td className="py-3 pr-5">
                                    <span
                                      className={`inline-flex min-w-14 justify-center rounded-full px-3 py-1 text-xs font-black uppercase ${
                                        match.result === "win"
                                          ? "bg-emerald-600 text-white"
                                          : match.result === "loss"
                                            ? "bg-red-700 text-white"
                                            : "bg-zinc-800 text-white"
                                      }`}
                                    >
                                      {match.result}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </>
        ) : null}
      </section>
    </PrivateAccountShell>
  );
}
