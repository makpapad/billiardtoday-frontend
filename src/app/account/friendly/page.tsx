"use client";

import React from "react";
import {
  AccountAccessCard,
  PrivateAccountShell,
  formatDateTime,
  usePlayerAccountSession,
} from "@/components/account/PrivateAccountShell";
import { playerAccountAuth, type PlayerAccountFriendlyMatch } from "@/lib/player-account-auth";

export default function AccountFriendlyPage() {
  const { account, setAccount, isLoading } = usePlayerAccountSession();
  const [friendlyMatches, setFriendlyMatches] = React.useState<PlayerAccountFriendlyMatch[]>([]);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadFriendlyMatches = React.useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const data = await playerAccountAuth.friendlyMatches();
      setFriendlyMatches(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Friendly match history could not be loaded.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    if (!account) return;
    void loadFriendlyMatches();
  }, [account, loadFriendlyMatches]);

  if (isLoading) {
    return <main className="min-h-screen px-4 py-8">Loading account...</main>;
  }

  if (!account) {
    return <AccountAccessCard onAuthenticated={async (next) => setAccount(next)} />;
  }

  return (
    <PrivateAccountShell account={account} setAccount={setAccount} activeHref="/account/friendly">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Friendly Matches</h2>
          <p className="mt-1 text-sm text-slate-600">Private history for completed non-live matches.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadFriendlyMatches()}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error ? <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="mt-6 space-y-4">
        {friendlyMatches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
            No friendly matches have been recorded for this account yet.
          </div>
        ) : (
          friendlyMatches.map((match) => (
            <article key={String(match.id)} className="rounded-3xl border border-slate-200 bg-slate-50/70 px-5 py-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-slate-950">
                    {match.player1Name || "Player 1"} vs {match.player2Name || "Player 2"}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Score: {match.player1_points ?? 0} - {match.player2_points ?? 0}
                  </div>
                </div>
                <div className="text-sm text-slate-500">{formatDateTime(match.reportedAt) || "Date not available"}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="rounded-full bg-white px-3 py-1">Club: {match.clubName || "Unknown"}</span>
                {match.venueName ? <span className="rounded-full bg-white px-3 py-1">Venue: {match.venueName}</span> : null}
                {match.tableLabel ? <span className="rounded-full bg-white px-3 py-1">Table: {match.tableLabel}</span> : null}
                <span className="rounded-full bg-white px-3 py-1">Screen: {match.screenIdentifier || "Unknown"}</span>
                <span className="rounded-full bg-white px-3 py-1">Target {match.targetPoints ?? 0}</span>
                <span className="rounded-full bg-white px-3 py-1">Max innings {match.maxInnings ?? 0}</span>
                <span className="rounded-full bg-white px-3 py-1">P1 innings {match.player1_innings ?? 0}</span>
                <span className="rounded-full bg-white px-3 py-1">P2 innings {match.player2_innings ?? 0}</span>
                <span className="rounded-full bg-white px-3 py-1">P1 HR {match.player1_high_run ?? 0}</span>
                <span className="rounded-full bg-white px-3 py-1">P2 HR {match.player2_high_run ?? 0}</span>
                {match.winner ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Winner: {match.winner}</span>
                ) : null}
                {match.matchDateTime ? (
                  <span className="rounded-full bg-white px-3 py-1">Scheduled: {formatDateTime(match.matchDateTime)}</span>
                ) : null}
                {match.tags.length > 0
                  ? match.tags.map((tag) => (
                      <span key={`${match.id}-${tag}`} className="rounded-full bg-cyan-50 px-3 py-1 text-cyan-900">
                        #{tag}
                      </span>
                    ))
                  : null}
              </div>
              {match.notes ? <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">{match.notes}</div> : null}
            </article>
          ))
        )}
      </div>
    </PrivateAccountShell>
  );
}
