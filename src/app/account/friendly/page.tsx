"use client";

import Link from "next/link";
import React from "react";
import { CalendarDays, CircleDot, MapPin, Search, ShieldCheck } from "lucide-react";
import {
  AccountAccessCard,
  formatDateTime,
  officialVerificationLabel,
  PrivateAccountShell,
} from "@/components/account/PrivateAccountShell";
import { useAccountSession } from "@/components/account/AccountSessionProvider";
import {
  playerAccountAuth,
  type PlayerAccountDashboard,
  type PlayerAccountFriendlyMatch,
} from "@/lib/player-account-auth";

const ACCOUNT_NAV_ITEMS = [
  { href: "/account", label: "Overview" },
  { href: "/account/tournaments", label: "Tournaments" },
  { href: "/account/friendly", label: "Friendly Matches" },
  { href: "/account/security", label: "Security" },
  { href: "/account/devices", label: "Devices" },
];

function truncateAvg(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const truncated = Math.trunc(safeValue * 1000) / 1000;
  return truncated.toFixed(3).replace(".", ",");
}

function normalizeMatchText(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase();
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
  ]
    .map(normalizeMatchText)
    .filter(Boolean);

  if (names.includes(normalizeMatchText(match.player1Name))) return 1;
  if (names.includes(normalizeMatchText(match.player2Name))) return 2;
  return null;
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

function friendlyAverage(matches: PlayerAccountFriendlyMatch[]) {
  let totalPoints = 0;
  let totalInnings = 0;
  matches.forEach((match) => {
    const innings = Math.max(match.player1_innings || 0, match.player2_innings || 0);
    const points = Math.max(match.player1_points || 0, match.player2_points || 0);
    totalPoints += points;
    totalInnings += innings;
  });
  return totalInnings > 0 ? totalPoints / totalInnings : 0;
}

function highestFriendlyRun(matches: PlayerAccountFriendlyMatch[]) {
  return matches.reduce(
    (max, match) => Math.max(max, match.player1_high_run || 0, match.player2_high_run || 0),
    0,
  );
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

function AccountDataLoadingModal() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/60 px-5 backdrop-blur-sm">
      <div className="w-full max-w-md border border-white/15 bg-zinc-950 p-6 text-white shadow-2xl">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-red-500">Fetching player data</div>
        <div className="mt-3 text-2xl font-black uppercase tracking-normal">Loading friendly matches</div>
        <div className="mt-3 text-sm text-zinc-300">Synchronizing private scoreboard history and match statistics.</div>
        <div className="mt-6 h-2 overflow-hidden bg-white/10">
          <div className="h-full w-1/2 bg-red-600" style={{ animation: "accountLoading 1.2s ease-in-out infinite" }} />
        </div>
      </div>
    </div>
  );
}

export default function AccountFriendlyPage() {
  const { account, setAccount, isLoading } = useAccountSession();
  const [dashboard, setDashboard] = React.useState<PlayerAccountDashboard | null>(null);
  const [friendlyMatches, setFriendlyMatches] = React.useState<PlayerAccountFriendlyMatch[]>([]);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [hasLoadedData, setHasLoadedData] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftNotes, setDraftNotes] = React.useState("");
  const [draftTags, setDraftTags] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [venueFilter, setVenueFilter] = React.useState("all");
  const [resultFilter, setResultFilter] = React.useState("all");

  const loadData = React.useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const [dashboardData, matchesData] = await Promise.all([
        playerAccountAuth.dashboard(),
        playerAccountAuth.friendlyMatches(),
      ]);
      setDashboard(dashboardData);
      setFriendlyMatches(matchesData);
      setHasLoadedData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Friendly match history could not be loaded.");
      setHasLoadedData(true);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    if (!account) return;
    void loadData();
  }, [account, loadData]);

  const startEditing = (match: PlayerAccountFriendlyMatch) => {
    setEditingId(String(match.id));
    setDraftNotes(match.notes || "");
    setDraftTags(match.tags.join(", "));
    setNotice(null);
    setError(null);
  };

  const saveMetadata = async (matchId: number | string) => {
    setError(null);
    setNotice(null);
    try {
      const updated = await playerAccountAuth.updateFriendlyMatch({
        matchId,
        notes: draftNotes,
        tags: draftTags
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      });
      setFriendlyMatches((prev) =>
        prev.map((match) => (String(match.id) === String(updated.id) ? { ...match, ...updated } : match)),
      );
      setEditingId(null);
      setNotice("Friendly match notes updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Friendly match update failed.");
    }
  };

  const playerName = account ? displayNameFor(account, dashboard) : "Player account";
  const playerCard = dashboard?.playerCard || null;

  const visibleMatches = React.useMemo(() => {
    if (!account) return [];
    const query = searchQuery.trim().toLowerCase();
    return friendlyMatches.filter((match) => {
      const result = friendlyResultForAccount(match, account, playerName);
      const venue = match.clubName || match.venueName || "Unknown venue";
      if (venueFilter !== "all" && venue !== venueFilter) return false;
      if (resultFilter !== "all" && result !== resultFilter) return false;
      if (!query) return true;
      const haystack = [
        match.player1Name,
        match.player2Name,
        match.clubName,
        match.venueName,
        match.tableLabel,
        match.screenIdentifier,
        ...(match.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [account, friendlyMatches, playerName, resultFilter, searchQuery, venueFilter]);

  const venueOptions = React.useMemo(
    () =>
      Array.from(new Set(friendlyMatches.map((match) => match.clubName || match.venueName || "Unknown venue"))).sort(),
    [friendlyMatches],
  );

  const friendlyWins = account
    ? friendlyMatches.reduce((sum, match) => sum + (friendlyResultForAccount(match, account, playerName) === "W" ? 1 : 0), 0)
    : 0;
  const friendlyLosses = account
    ? friendlyMatches.reduce((sum, match) => sum + (friendlyResultForAccount(match, account, playerName) === "L" ? 1 : 0), 0)
    : 0;
  const recentForm = account
    ? friendlyMatches
        .map((match) => friendlyResultForAccount(match, account, playerName))
        .filter((result): result is "W" | "L" => Boolean(result))
        .slice(0, 8)
    : [];
  const friendlyAvg = friendlyAverage(friendlyMatches);
  const highestRun = highestFriendlyRun(friendlyMatches);
  const heroStats = [
    { label: "Friendly Matches", value: String(friendlyMatches.length) },
    { label: "Wins", value: String(friendlyWins) },
    { label: "Losses", value: String(friendlyLosses) },
    { label: "Friendly AVG", value: truncateAvg(friendlyAvg) },
    { label: "Highest Run", value: String(highestRun) },
  ];

  if (isLoading) {
    return <main className="min-h-screen bg-[#f4f0e6] px-5 py-8">Loading account...</main>;
  }

  if (!account) {
    return <AccountAccessCard onAuthenticated={async (next) => setAccount(next)} />;
  }

  return (
    <PrivateAccountShell account={account} setAccount={setAccount} activeHref="/account/friendly" variant="profile">
      {isRefreshing ? <AccountDataLoadingModal /> : null}
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
              Back to account
            </Link>
            <div className="mt-28 text-xs font-black uppercase tracking-[0.4em] text-red-500 lg:mt-44">Private scoreboard history</div>
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
                    item.href === "/account/friendly"
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
            <div className="text-sm font-semibold uppercase tracking-[0.28em] text-red-700">Private history</div>
            <h2 className="mt-2 text-4xl font-black uppercase tracking-normal">Friendly Matches</h2>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="w-fit border border-zinc-400 px-4 py-3 text-sm font-semibold text-zinc-950"
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error ? <div className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {notice ? <div className="mt-6 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}

        <div className="mt-8 grid gap-3 border border-zinc-300 bg-white/20 p-4 lg:grid-cols-[1.2fr_0.9fr_0.7fr]">
          <label className="flex items-center gap-3 border border-zinc-400 bg-[#f4f0e6] px-4 py-3 text-sm text-zinc-700">
            <Search className="h-4 w-4 text-zinc-500" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              disabled={isRefreshing}
              placeholder="Search player, venue, table or tag"
              className="min-w-0 flex-1 bg-transparent font-semibold text-zinc-950 outline-none placeholder:text-zinc-500 disabled:opacity-60"
            />
          </label>

          <select
            value={venueFilter}
            onChange={(event) => setVenueFilter(event.target.value)}
            disabled={isRefreshing}
            className="border border-zinc-400 bg-[#f4f0e6] px-4 py-3 text-sm font-semibold text-zinc-950 outline-none disabled:opacity-60"
          >
            <option value="all">All venues</option>
            {venueOptions.map((venue) => (
              <option key={venue} value={venue}>
                {venue}
              </option>
            ))}
          </select>

          <select
            value={resultFilter}
            onChange={(event) => setResultFilter(event.target.value)}
            disabled={isRefreshing}
            className="border border-zinc-400 bg-[#f4f0e6] px-4 py-3 text-sm font-semibold text-zinc-950 outline-none disabled:opacity-60"
          >
            <option value="all">All results</option>
            <option value="W">Wins</option>
            <option value="L">Losses</option>
          </select>
        </div>

        <div className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Matches In View", value: String(visibleMatches.length) },
            { label: "Points In View", value: account ? String(friendlyPointsForAccount(visibleMatches, account, playerName)) : "0" },
            { label: "Average In View", value: truncateAvg(friendlyAverage(visibleMatches)) },
            { label: "Current Streak", value: currentStreak(recentForm) },
          ].map((stat) => (
            <div key={stat.label} className="border-b border-zinc-300 pb-5">
              <div className="text-sm text-zinc-600">{stat.label}</div>
              <div className="mt-2 text-3xl font-semibold text-zinc-950">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 divide-y divide-zinc-300 border-y border-zinc-300">
          {visibleMatches.length === 0 ? (
            <div className="py-8 text-sm text-zinc-500">
              {hasLoadedData ? "No friendly matches match the current filters." : "Friendly matches are loading."}
            </div>
          ) : (
            visibleMatches.map((match) => {
              const result = friendlyResultForAccount(match, account, playerName);
              const innings = Math.max(match.player1_innings || 0, match.player2_innings || 0);
              const matchAvg = innings ? Math.max(match.player1_points || 0, match.player2_points || 0) / innings : 0;
              return (
                <article key={String(match.id)} className="py-6">
                  <div className="grid gap-5 lg:grid-cols-[90px_1fr_180px_300px] lg:items-center">
                    <div>
                      <span
                        className={`inline-grid h-14 w-14 place-items-center rounded-full text-xl font-black ${
                          result === "W" ? "bg-emerald-600 text-white" : result === "L" ? "bg-red-700 text-white" : "bg-zinc-950 text-white"
                        }`}
                      >
                        {result || "-"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm uppercase tracking-[0.2em] text-zinc-500">Match</div>
                      <div className="mt-1 text-2xl font-semibold text-zinc-950">
                        {match.player1Name || "Player 1"} vs {match.player2Name || "Player 2"}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-600">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-4 w-4" />
                          {formatDateTime(match.reportedAt || match.matchDateTime) || "Date not available"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {match.clubName || match.venueName || "Unknown venue"}
                        </span>
                        {match.tableLabel ? <span>{match.tableLabel}</span> : null}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm uppercase tracking-[0.2em] text-zinc-500">Score</div>
                      <div className="mt-1 text-4xl font-black text-zinc-950">{match.player1_points ?? 0}-{match.player2_points ?? 0}</div>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-sm">
                      <div><div className="text-zinc-500">P1 HR</div><div className="mt-1 text-2xl font-semibold">{match.player1_high_run ?? 0}</div></div>
                      <div><div className="text-zinc-500">P2 HR</div><div className="mt-1 text-2xl font-semibold">{match.player2_high_run ?? 0}</div></div>
                      <div><div className="text-zinc-500">INN</div><div className="mt-1 text-2xl font-semibold">{innings}</div></div>
                      <div><div className="text-zinc-500">AVG</div><div className="mt-1 text-2xl font-semibold">{truncateAvg(matchAvg)}</div></div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {(match.tags || []).map((tag) => (
                      <span key={`${match.id}-${tag}`} className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700">
                        #{tag}
                      </span>
                    ))}
                    {match.screenIdentifier ? (
                      <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700">
                        Screen {match.screenIdentifier}
                      </span>
                    ) : null}
                    {match.targetPoints ? (
                      <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700">
                        Target {match.targetPoints}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => (editingId === String(match.id) ? setEditingId(null) : startEditing(match))}
                      className="border border-zinc-400 px-4 py-2 text-sm font-semibold text-zinc-800"
                    >
                      {editingId === String(match.id) ? "Cancel" : "Edit notes"}
                    </button>
                  </div>

                  {editingId === String(match.id) ? (
                    <div className="mt-4 border border-zinc-300 bg-white/20 p-4">
                      <label className="block text-sm font-semibold text-zinc-700">Notes</label>
                      <textarea
                        value={draftNotes}
                        onChange={(event) => setDraftNotes(event.target.value)}
                        rows={4}
                        className="mt-2 w-full border border-zinc-400 bg-[#f4f0e6] px-4 py-3 text-sm text-zinc-950 outline-none"
                        placeholder="Add private notes for this match"
                      />
                      <label className="mt-4 block text-sm font-semibold text-zinc-700">Tags</label>
                      <input
                        value={draftTags}
                        onChange={(event) => setDraftTags(event.target.value)}
                        className="mt-2 w-full border border-zinc-400 bg-[#f4f0e6] px-4 py-3 text-sm text-zinc-950 outline-none"
                        placeholder="practice, warmup, race-to-30"
                      />
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => void saveMetadata(String(match.id ?? ""))}
                          className="bg-zinc-950 px-4 py-2 text-sm font-semibold text-white"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="border border-zinc-400 px-4 py-2 text-sm font-semibold text-zinc-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : match.notes ? (
                    <div className="mt-4 border border-zinc-300 bg-[#ebe5d8] px-4 py-3 text-sm text-zinc-700">{match.notes}</div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </section>
    </PrivateAccountShell>
  );
}
