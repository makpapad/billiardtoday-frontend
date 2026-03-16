"use client";

import React from "react";
import { AccountAccessCard, PrivateAccountShell, usePlayerAccountSession } from "@/components/account/PrivateAccountShell";
import { playerAccountAuth, type PlayerAccountTournamentParticipation } from "@/lib/player-account-auth";

export default function AccountTournamentsPage() {
  const { account, setAccount, isLoading } = usePlayerAccountSession();
  const [tournaments, setTournaments] = React.useState<PlayerAccountTournamentParticipation[]>([]);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState("all");
  const [gameTypeFilter, setGameTypeFilter] = React.useState("all");

  const loadTournaments = React.useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const data = await playerAccountAuth.tournaments();
      setTournaments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tournament history could not be loaded.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    if (!account) return;
    void loadTournaments();
  }, [account, loadTournaments]);

  const yearOptions = React.useMemo(
    () =>
      Array.from(new Set(tournaments.map((row) => String(row.year ?? "")).filter(Boolean))).sort((a, b) =>
        Number(b) - Number(a),
      ),
    [tournaments],
  );

  const gameTypeOptions = React.useMemo(
    () => Array.from(new Set(tournaments.map((row) => row.gameType?.trim()).filter(Boolean) as string[])).sort(),
    [tournaments],
  );

  const filteredTournaments = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return tournaments.filter((row) => {
      if (yearFilter !== "all" && String(row.year ?? "") !== yearFilter) return false;
      if (gameTypeFilter !== "all" && (row.gameType || "") !== gameTypeFilter) return false;
      if (!q) return true;

      const haystack = [
        row.tournament,
        row.gameType,
        row.position,
        ...row.stageResults.map((stage) => stage.stageTitle),
        ...row.matches.map((match) => match.opponent),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [gameTypeFilter, search, tournaments, yearFilter]);

  const emptyStateMessage =
    tournaments.length === 0
      ? account?.player?.documentId
        ? "No tournament participations were found for this player yet."
        : "Tournament history will appear here after your account is linked to a verified player profile."
      : "No tournaments match the current filters.";

  if (isLoading) {
    return <main className="min-h-screen px-4 py-8">Loading account...</main>;
  }

  if (!account) {
    return <AccountAccessCard onAuthenticated={async (next) => setAccount(next)} />;
  }

  return (
    <PrivateAccountShell account={account} setAccount={setAccount} activeHref="/account/tournaments">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Tournament History</h2>
          <p className="mt-1 text-sm text-slate-600">
            Private tournament view for the player currently linked to this account.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadTournaments()}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error ? <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="mt-6 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-[minmax(0,1.4fr)_0.8fr_0.8fr]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tournament, opponent or stage"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
        />
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
        >
          <option value="all">All years</option>
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <select
          value={gameTypeFilter}
          onChange={(e) => setGameTypeFilter(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
        >
          <option value="all">All game types</option>
          {gameTypeOptions.map((gameType) => (
            <option key={gameType} value={gameType}>
              {gameType}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 space-y-4">
        {filteredTournaments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">{emptyStateMessage}</div>
        ) : (
          filteredTournaments.map((participation) => (
            <article key={participation.id} className="rounded-3xl border border-slate-200 bg-white px-5 py-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-slate-950">{participation.tournament || "Tournament"}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {[participation.year, participation.gameType, participation.position].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-full bg-slate-50 px-3 py-1">{participation.totalMatches} matches</span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{participation.wins} wins</span>
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">{participation.losses} losses</span>
                  <span className="rounded-full bg-slate-50 px-3 py-1">AVG {participation.avgPerInning.toFixed(3)}</span>
                  <span className="rounded-full bg-slate-50 px-3 py-1">H.R. {participation.highestRun}</span>
                </div>
              </div>

              {participation.stageResults.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                  {participation.stageResults.map((stage, index) => (
                    <span key={`${participation.id}-stage-${index}`} className="rounded-full bg-cyan-50 px-3 py-1 text-cyan-900">
                      {[
                        stage.stageTitle,
                        stage.finalPosition ? `Final ${stage.finalPosition}` : null,
                        stage.groupPosition ? `Group ${stage.groupPosition}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  ))}
                </div>
              ) : null}

              {participation.matches.length > 0 ? (
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="pb-2 pr-4 font-medium">Date</th>
                        <th className="pb-2 pr-4 font-medium">Opponent</th>
                        <th className="pb-2 pr-4 font-medium">Stage</th>
                        <th className="pb-2 pr-4 font-medium">Score</th>
                        <th className="pb-2 pr-4 font-medium">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participation.matches.map((match) => (
                        <tr key={match.id} className="border-t border-slate-100 text-slate-700">
                          <td className="py-2 pr-4">{match.date ? new Date(match.date).toLocaleDateString("en-GB") : "-"}</td>
                          <td className="py-2 pr-4">{match.opponent || "Unknown"}</td>
                          <td className="py-2 pr-4">{match.stage || "-"}</td>
                          <td className="py-2 pr-4">
                            {match.scoreFor ?? 0} - {match.scoreAgainst ?? 0}
                          </td>
                          <td className="py-2 pr-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs ${
                                match.result === "win"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : match.result === "loss"
                                    ? "bg-rose-50 text-rose-700"
                                    : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {match.result}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </PrivateAccountShell>
  );
}
